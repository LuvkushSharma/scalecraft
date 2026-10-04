Lesson.register({
  id: 'lb-algorithms',
  title: 'Load balancing algorithms, L4 vs L7',
  minutes: 30,
  summary: `How a load balancer decides "which server?": ten algorithms, each with an example, strengths, weaknesses and a lab where you can run it yourself. Also: the real difference between L4 and L7, and how users around the world are sent to the nearest data center (GeoDNS, Anycast, GSLB).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `In the last lesson we added a load balancer (LB). Now, for every request, it has to make a small decision: "which server this time?"<br>The rule used for this decision is called an <strong>algorithm</strong>. Some rules simply take turns, some look at who is free right now, and some always send a user to the same server.<br>Wrong rule = a queue on one server while the others sit idle. Right rule = everyone gets a fair share of work, and users are happy.` },

    { type: 'h2', text: 'Setup: the three servers of xyz.com' },
    { type: 'p', html: `This whole lesson uses one setup, so you can compare every algorithm on the same thing:` },
    { type: 'list', items: [
      `<strong>S1</strong>: a big server, 3 times faster than the other two. It has <strong>weight 3</strong>.`,
      `<strong>S2</strong> and <strong>S3</strong>: normal servers, <strong>weight 1</strong> each.`,
      `Most requests are small (opening the feed, 2 units of work). About 1 in 5 is long (a video export, 8 units of work).`,
    ]},
    { type: 'callout', tone: 'term', title: 'Weight', html: `<strong>What it is:</strong> a number we give the LB: "this much work can this server handle". A server with weight 3 should get 3 times the share of a server with weight 1.<br><strong>Why we need it:</strong> servers are not always the same size (a new big machine, an old small one).<br><strong>Without it:</strong> the small server gets as much work as the big one. The small one drowns, the big one is half idle.` },
    { type: 'callout', tone: 'term', title: 'Active connection (running request)', html: `<strong>What it is:</strong> a request that is running on a server right now, whose answer has not gone back yet. The LB can count these, because every request goes out and comes back through it.<br><strong>Why we need it:</strong> it is the cheapest guess of "how busy is each server right now".<br><strong>Without it:</strong> the LB would never know that 10 long requests are stuck on one server.` },

    { type: 'h2', text: 'All algorithms at a glance' },
    { type: 'table', head: ['Algorithm', 'In one line', 'What the LB must remember'], rows: [
      ['Round robin', 'Take turns: S1, S2, S3, S1...', 'Just one pointer: whose turn is next'],
      ['Weighted round robin', 'Take turns, but the big server gets more turns', 'Weights + pointer (the smooth version keeps a counter per server)'],
      ['Least connections', 'The server with the fewest running requests right now', 'The active count of each server'],
      ['Weighted least connections', 'Lowest active ÷ weight', 'Active counts + weights'],
      ['Least response time', 'Whoever is answering fastest right now', 'The average response time of each server'],
      ['Random', 'Roll a dice', 'Nothing'],
      ['Power of two choices', 'Pick two at random, take the less busy one', 'Active counts (only 2 are looked at)'],
      ['IP hash / source hash', 'The user\'s IP always maps to the same server', 'Nothing (just a hash)'],
      ['Consistent hashing', 'The next server on a hash ring', 'The ring (positions of the servers)'],
      ['Resource / agent based', 'Servers report how busy they are', 'The servers\' reports (CPU, memory)'],
    ]},
    { type: 'h2', text: 'Algorithm lab: look inside the LB\'s head' },
    { type: 'p', html: `This lab shows the LB's "inside math" for every request: the round robin pointer, the weight counters, the running requests on each server (dots), the average response time, and each server's own report. Pick an algorithm, press "Next request", and read the math written below. Each algorithm's section tells you what to look for in the lab.` },
    { type: 'custom', render(el) {
      const MODES = { rr: 'Round robin', wrr: 'Weighted RR (simple)', swrr: 'Smooth weighted RR', lc: 'Least connections', wlc: 'Weighted least conn', lrt: 'Least response time', rnd: 'Random', p2c: 'Power of two', agent: 'Agent based' };
      const DESC = { rr: 'The pointer moves forward one turn at a time. It ignores both weight and how busy a server is.', wrr: 'It walks through the list [S1, S1, S1, S2, S3] in turn. S1 gets 3 in a row.', swrr: 'Each server has a "current" counter: each time, add each server its weight, pick the biggest, and subtract the total weight (5) from it.', lc: 'The server with the fewest dots (running requests) right now.', wlc: 'Running requests ÷ weight. 3 dots on S1 = 1 dot on S2.', lrt: 'Average response time × (running + 1). Whoever will finish it fastest.', rnd: 'A dice roll every time. It remembers nothing.', p2c: 'Pick two random servers, then the one with fewer dots.', agent: 'Servers report their load every 5 requests. The LB picks based on the report (the report can be old).' };
      const W = [3, 1, 1], SP = [3, 1, 1], DT = 0.6;
      let mode = 'rr', L;
      const makeLab = m => {
        let seed = 7, seed2 = 99, t = 0, rr = 0, wi = 0, nreq = 0, rep = [0, 0, 0], lat = 0, fin = 0;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const rd = () => { seed2 = (seed2 * 16807) % 2147483647; return seed2 / 2147483647; };
        const st = W.map(() => ({ jobs: [], cw: 0, ewma: 2, got: 0 }));
        const tot = 5, naive = [0, 0, 0, 1, 2], log = [];
        const argmin = f => { let b = 0; for (let i = 1; i < 3; i++) if (f(i) < f(b) - 1e-9) b = i; return b; };
        const step = () => {
          t = Math.round((t + DT) * 10) / 10;
          st.forEach((s, i) => {
            if (!s.jobs.length) return;
            const share = SP[i] * DT / s.jobs.length;
            s.jobs.forEach(j => { j.left -= share; });
            s.jobs = s.jobs.filter(j => { if (j.left <= 1e-9) { s.ewma = 0.7 * s.ewma + 0.3 * (t - j.t0); lat += t - j.t0; fin++; return false; } return true; });
          });
          nreq++;
          if (nreq % 5 === 1) rep = st.map((s, i) => Math.min(100, Math.round(s.jobs.length / SP[i] * 40)));
          const dur = rd() < 0.2 ? 8 : 2;
          const act = st.map(s => s.jobs.length);
          let k, why;
          if (m === 'rr') { k = rr % 3; rr++; why = `pointer was on S${k + 1} → S${k + 1}. Pointer moves to S${rr % 3 + 1}.`; }
          else if (m === 'wrr') { k = naive[wi % 5]; why = `item #${wi % 5 + 1} of list [S1, S1, S1, S2, S3] → S${k + 1}`; wi++; }
          else if (m === 'swrr') { st.forEach((s, i) => { s.cw += W[i]; }); const b = st.map(s => s.cw); k = argmin(i => -st[i].cw); st[k].cw -= tot; why = `current + weight = [${b.join(', ')}] → biggest is S${k + 1}. Its −${tot} → [${st.map(s => s.cw).join(', ')}]`; }
          else if (m === 'lc') { k = argmin(i => act[i]); why = `active = [${act.join(', ')}] → lowest: S${k + 1}`; }
          else if (m === 'wlc') { k = argmin(i => act[i] / W[i]); why = `active ÷ weight = [${act.map((a, i) => (a / W[i]).toFixed(2)).join(', ')}] → lowest: S${k + 1}`; }
          else if (m === 'lrt') { const sc = st.map((s, i) => s.ewma * (act[i] + 1)); k = argmin(i => sc[i]); why = `avg time × (active+1) = [${sc.map(x => x.toFixed(1)).join(', ')}] → lowest: S${k + 1}`; }
          else if (m === 'rnd') { const r = rnd(); k = Math.floor(r * 3); why = `random number ${r.toFixed(2)} → S${k + 1}`; }
          else if (m === 'p2c') { const a = Math.floor(rnd() * 3); let b = Math.floor(rnd() * 2); if (b >= a) b++; k = act[a] <= act[b] ? a : b; why = `two random: S${a + 1} (${act[a]} active) vs S${b + 1} (${act[b]} active) → S${k + 1}`; }
          else { k = argmin(i => rep[i]); why = `last report from servers: load = [${rep.join('%, ')}%] → lowest: S${k + 1}`; }
          st[k].jobs.push({ left: dur, t0: t, long: dur > 2 }); st[k].got++;
          log.unshift(`#${nreq}${dur > 2 ? ' (long)' : ''}: ${why}`); log.length = Math.min(log.length, 6);
        };
        return { step, st, log, get rr() { return rr % 3; }, get rep() { return rep; }, get avg() { return fin ? (lat / fin).toFixed(1) : '–'; }, get n() { return nreq; } };
      };
      el.innerHTML = `<div class="chips m-chips" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="calc-note m-desc"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0"><button type="button" class="btn small primary b-1">Next request</button><button type="button" class="btn small b-10">+10 requests</button><button type="button" class="btn small ghost b-r">Reset</button></div>
        <div class="cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px"></div>
        <div class="stats"><div class="stat"><span>Requests sent</span><strong class="o-n"></strong></div><div class="stat"><span>Avg response time (finished requests)</span><strong class="o-m"></strong></div></div>
        <div class="m-log" style="font:13px/1.6 var(--f-mono);background:var(--surface-2);border-radius:var(--r-sm);padding:10px 12px;margin-top:8px;overflow-wrap:anywhere"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        q('.m-chips').innerHTML = '';
        Object.entries(MODES).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = v; b.onclick = () => { mode = k; L = makeLab(mode); draw(); }; q('.m-chips').appendChild(b); });
        q('.m-desc').textContent = DESC[mode];
        q('.cards').innerHTML = L.st.map((s, i) => {
          const dots = s.jobs.map(j => `<span title="${j.long ? 'long' : 'short'}" style="display:inline-block;width:12px;height:12px;border-radius:50%;margin:2px;background:${j.long ? 'var(--amber)' : 'var(--accent)'}"></span>`).join('') || '<span style="color:var(--ink-3);font-size:13px">idle</span>';
          const extra = mode === 'rr' && L.rr === i ? '<div style="color:var(--accent);font-weight:600">▶ next turn is this one</div>'
            : mode === 'swrr' ? `<div>current: <strong>${s.cw}</strong></div>`
            : mode === 'agent' ? `<div>report: <strong>${L.rep[i]}%</strong></div>`
            : mode === 'lrt' ? `<div>avg time: <strong>${s.ewma.toFixed(1)}</strong></div>` : '';
          return `<div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)"><strong style="font-family:var(--f-display)">S${i + 1}</strong> <span style="font-size:13px;color:var(--ink-3)">weight ${W[i]}, speed ${SP[i]}x</span>
            <div style="min-height:34px;margin:6px 0">${dots}</div><div style="font-size:13px;color:var(--ink-2)">running: <strong>${s.jobs.length}</strong> · received: <strong>${s.got}</strong>${extra}</div></div>`;
        }).join('');
        q('.o-n').textContent = L.n; q('.o-m').textContent = L.avg;
        q('.m-log').innerHTML = L.log.length ? L.log.map((x, i) => `<div style="opacity:${1 - i * 0.13}">${x}</div>`).join('') : 'Blue dot = short request, yellow = long. Press "Next request".';
      };
      q('.b-1').onclick = () => { L.step(); draw(); };
      q('.b-10').onclick = () => { for (let i = 0; i < 10; i++) L.step(); draw(); };
      q('.b-r').onclick = () => { L = makeLab(mode); draw(); };
      L = makeLab(mode); draw();
    }},
    { type: 'callout', tone: 'tip', html: `The lab uses a simple model (S1 is 3 times faster, every click = one new request, running requests finish over time). Every mode uses the same sequence of requests (which are short and which are long). This lab is not for ranking. It is for seeing the "inside math": in only 40 requests, luck makes a big difference. Which algorithm is really better is shown by the race simulator below, over thousands of requests.` },

    { type: 'h2', text: 'Every algorithm, one by one' },
    { type: 'h3', text: '1. Round robin (take turns)' },
    { type: 'p', html: `<strong>How:</strong> the LB has a pointer (a finger) resting on one server. A request arrives: give it to that server, and move the finger to the next server. After the last one, go back to the first.<br><strong>Example:</strong> 6 requests, 3 servers → S1, S2, S3, S1, S2, S3. Each server gets 2.<br><strong>In the lab:</strong> the "▶ next turn is this one" mark moves forward on every click, even if 5 dots (requests) are piled up on S2.` },
    { type: 'list', items: [
      `<strong>Good:</strong> the simplest one. The LB does not have to count anything. Very fast.`,
      `<strong>Bad:</strong> it ignores both the server's power (weight) and the size of the request. Wherever the long requests land, a queue forms.`,
      `<strong>When:</strong> identical servers, identical small requests (like a simple API).`,
      `<strong>Where you find it:</strong> the NGINX default (with weights), HAProxy <code>roundrobin</code> (the default up to version 3.2), Envoy <code>ROUND_ROBIN</code>, the AWS ALB default.`,
    ]},
    { type: 'h3', text: '2. Weighted round robin (and the "smooth" NGINX version)' },
    { type: 'p', html: `<strong>How:</strong> take turns, but in every round the weight-3 server gets 3 turns and the weight-1 servers get 1.<br><strong>Simple way:</strong> make a list [S1, S1, S1, S2, S3] and walk through it in turn. Problem: S1 gets 3 requests <em>in a row</em>. That is a burst.<br><strong>Smooth way (NGINX):</strong> each server has a "current" counter. For every request: (1) add each server's weight to its counter, (2) pick the server with the biggest counter, (3) subtract the total weight (here 5) from the picked server's counter.` },
    { type: 'table', head: ['Request', 'After adding (S1, S2, S3)', 'Picked', 'After subtracting'], rows: [
      ['1', '3, 1, 1', 'S1', '−2, 1, 1'],
      ['2', '1, 2, 2', 'S2', '1, −3, 2'],
      ['3', '4, −2, 3', 'S1', '−1, −2, 3'],
      ['4', '2, −1, 4', 'S3', '2, −1, −1'],
      ['5', '5, 0, 0', 'S1', '0, 0, 0'],
    ], caption: 'Weights 3:1:1. Result S1, S2, S1, S3, S1: S1 still gets 3 out of 5, but spread out. After 5 the counters are back to 0 and the cycle repeats. NGINX adopted this in 2012; for weights 5:1:1 it gives a a b a c a a.' },
    { type: 'list', items: [
      `<strong>In the lab:</strong> run both "Weighted RR (simple)" and "Smooth weighted RR". The first 5 picks: simple = S1 S1 S1 S2 S3, smooth = S1 S2 S1 S3 S1. The "current" numbers change just like the table above.`,
      `<strong>Good:</strong> servers of different sizes get work that matches their power. Still very cheap.`,
      `<strong>Bad:</strong> it still ignores the size of the request. A wrong weight gives a wrong split.`,
      `<strong>When:</strong> servers of different sizes (a new 8-core, an old 4-core), or giving a new version a little traffic (canary: weight 1 vs 19 = 5%).`,
    ]},
    { type: 'h3', text: '3. Least connections' },
    { type: 'p', html: `<strong>How:</strong> the LB counts the running requests on each server (+1 when a request goes out, −1 when the answer comes back). A new request goes to the server with the lowest count.<br><strong>Example:</strong> running requests S1 = 4, S2 = 1, S3 = 2 → S2. If 2 long video exports were stuck on S2, its count would be higher and it would not get the new request.<br><strong>In the lab:</strong> the log shows <code>active = [..]</code>, and the smallest number always wins. On a tie, the first one (S1) wins.` },
    { type: 'list', items: [
      `<strong>Good:</strong> it takes the size of requests into account by itself: a server with long requests looks busy and gets less.`,
      `<strong>Bad:</strong> the LB must keep counts. With many LB machines, each has its own count and nobody has the full truth. Everyone rushes to a new server (0 connections) at the same time.`,
      `<strong>When:</strong> request times vary a lot (some 20 ms, some 30 s), or long connections (WebSocket, database).`,
      `<strong>Where you find it:</strong> NGINX <code>least_conn</code>, HAProxy <code>leastconn</code>, AWS ALB <code>least_outstanding_requests</code>.`,
    ]},
    { type: 'h3', text: '4. Weighted least connections' },
    { type: 'p', html: `<strong>How:</strong> least connections + weight: divide the count by the weight, and the lowest wins.<br><strong>Example:</strong> S1 (weight 3) has 3 running, S2 (weight 1) has 2, S3 (weight 1) has 1. Math: 3÷3 = 1.0, 2÷1 = 2.0, 1÷1 = 1.0. S1 and S3 are tied, and the first one (S1) wins. Plain least connections would pick S3 (only 1), and the power of the big S1 would be wasted.<br><strong>In the lab:</strong> the log shows <code>active ÷ weight</code>.` },
    { type: 'list', items: [
      `<strong>Good:</strong> both the server's power and its current load. The most reliable general choice for mixed servers and mixed requests.`,
      `<strong>Bad:</strong> weights must be kept correct. It also has all the problems of least connections.`,
      `<strong>Where you find it:</strong> NGINX <code>least_conn</code> and HAProxy <code>leastconn</code> both already take weights into account. Envoy's <code>LEAST_REQUEST</code> uses a formula like <code>weight ÷ (active + 1)</code> when weights differ.`,
    ]},
    { type: 'h3', text: '5. Least response time (latency-aware)' },
    { type: 'p', html: `<strong>How:</strong> the LB keeps measuring the average response time of each server (new answers count more, and old ones are slowly forgotten; this is called an <strong>EWMA</strong>, an "exponentially weighted moving average"). Then it also adds the running requests: <code>score = avg time × (running + 1)</code>. The lowest score wins.<br><strong>Example:</strong> S1: avg 20 ms, 2 running → 20 × 3 = 60. S2: avg 80 ms, 0 running → 80 × 1 = 80. S3: avg 30 ms, 1 running → 30 × 2 = 60. S1 and S3 are tied, and S2 is slow, so it is not picked. If S2's disk is failing and it became slow, this algorithm gives it less traffic by itself, while least connections would not even notice.<br><strong>In the lab:</strong> each card shows "avg time" and the log shows the score.` },
    { type: 'list', items: [
      `<strong>Good:</strong> it catches a server that is "sick but alive" (slow). It measures what the user feels (latency).`,
      `<strong>Bad:</strong> the measurement is noisy (one slow request makes the number jump). If everyone rushes to the one "fastest" server, it becomes slow, and then everyone runs away (a swing). That is why it is often combined with power of two.`,
      `<strong>Where you find it:</strong> NGINX Plus (paid) <code>least_time</code>. Linkerd and Twitter's Finagle used "peak EWMA" (the Linkerd blog post is from 2016, but the idea is still the same).`,
    ]},
    { type: 'h3', text: '6. Random' },
    { type: 'p', html: `<strong>How:</strong> roll a dice for every request: a number between 0 and 1; under 0.33 goes to S1, under 0.66 to S2, otherwise S3.<br><strong>Example:</strong> 3 servers, 9 requests. On average 3-3-3, but sometimes 5-2-2. Random is good when there are many LB machines, because nobody has to remember anything and no count has to be shared.<br><strong>In the lab:</strong> the log shows the random number. Sometimes a pile of dots builds up on one server.` },
    { type: 'list', items: [
      `<strong>Good:</strong> zero state; works across many LBs without any coordination.`,
      `<strong>Bad:</strong> bad luck: some servers get more. It ignores request size.`,
      `<strong>Where you find it:</strong> Envoy <code>RANDOM</code>, NGINX <code>random</code>, AWS ALB <code>weighted_random</code>.`,
    ]},
    { type: 'h3', text: '7. Power of two random choices (P2C)' },
    { type: 'p', html: `<strong>How:</strong> pick two servers at random, and give the request to the one with fewer running requests. That is all.<br><strong>Example:</strong> 100 servers. The dice gave S17 (4 running) and S62 (1 running) → S62. There is no need to look at all 100.<br><strong>Why is it so good?</strong> Looking at just one more option makes the load of the worst server drop a lot. This is a well-known result from research in the 1990s (Michael Mitzenmacher's PhD thesis, 1996): with pure random, the busiest server goes well above the average; with two choices, it stays close to the average. Three choices help a little more, but the real jump is from 1 to 2. See for yourself below.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><label>Servers: <strong class="v-n"></strong><input type="range" class="r-n" min="0" max="2" value="1"></label><div><div style="font-size:14px;margin-bottom:6px">How many random servers to look at per request?</div><div class="d-chips" style="display:flex;gap:6px;flex-wrap:wrap"></div></div></div>
        <svg class="hist" viewBox="0 0 640 170" style="width:100%;height:auto;display:block;margin:12px 0"></svg>
        <div class="stats"><div class="stat"><span>Average load</span><strong>10</strong></div><div class="stat"><span>Busiest server</span><strong class="o-max"></strong></div><div class="stat"><span>Emptiest server</span><strong class="o-min"></strong></div></div>
        <div class="calc-note o-n"></div>`;
      const NS = [10, 100, 1000], NAMES = { 1: '1 (pure random)', 2: '2 (power of two)', 3: '3 choices' };
      let d = 1;
      const q = s => el.querySelector(s);
      const balls = (n, m, dd) => {
        let seed = 42;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const bins = new Array(n).fill(0);
        for (let i = 0; i < m; i++) { let best = Math.floor(rnd() * n); for (let c = 1; c < dd; c++) { const o = Math.floor(rnd() * n); if (bins[o] < bins[best]) best = o; } bins[best]++; }
        return bins;
      };
      const run = () => {
        const n = NS[+q('.r-n').value]; q('.v-n').textContent = n + ' (requests: ' + n * 10 + ')';
        q('.d-chips').innerHTML = '';
        [1, 2, 3].forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === d ? ' on' : ''); b.textContent = NAMES[k]; b.onclick = () => { d = k; run(); }; q('.d-chips').appendChild(b); });
        const bins = balls(n, n * 10, d), mx = Math.max(...bins), mn = Math.min(...bins);
        const hist = new Array(31).fill(0); bins.forEach(v => hist[Math.min(30, v)]++);
        const top = Math.max(...hist);
        let s = '';
        hist.forEach((c, v) => { const h = c / top * 130, x = 20 + v * 20; s += `<rect x="${x}" y="${145 - h}" width="16" height="${h}" rx="2" fill="${v > 12 ? 'var(--red)' : 'var(--accent)'}"/>`; if (v % 5 === 0) s += `<text x="${x + 8}" y="162" text-anchor="middle" font-size="12" fill="var(--ink-3)" font-family="var(--f-mono)">${v}</text>`; });
        q('.hist').innerHTML = s + `<line x1="${20 + 10 * 20 + 8}" y1="10" x2="${20 + 10 * 20 + 8}" y2="147" stroke="var(--ink-3)" stroke-dasharray="4 4"/>`;
        q('.o-max').textContent = mx; q('.o-min').textContent = mn;
        q('.o-n').textContent = `Bar = how many servers got that many requests (x-axis = load). Dashed line = average 10. Red = more than 12 (overloaded). ` + (d === 1 ? `With pure random, the busiest server is at ${mx}, which is ${(mx / 10).toFixed(1)} times the average.` : d === 2 ? `Just one extra choice: the busiest is now ${mx}. All servers are packed close to the average.` : `A third choice helps only a little (${mx}). That is why "two" is the standard.`);
      };
      q('.r-n').addEventListener('input', run);
      run();
    }},
    { type: 'list', items: [
      `<strong>Good:</strong> it spreads load as well as least connections, but only looks at 2 servers. Even with many LB machines and slightly old counts, everyone does not rush to the same "emptiest" server (no herding).`,
      `<strong>Bad:</strong> on a tiny fleet (2-3 servers) it is a bit weaker than least connections. It still needs counts.`,
      `<strong>Where you find it:</strong> Envoy <code>LEAST_REQUEST</code> (2 random choices by default). HAProxy <code>random</code> (2 draws by default, and since HAProxy 3.3 this is the new default algorithm). NGINX <code>random two least_conn</code>.`,
    ]},
    { type: 'h3', text: '8. IP hash / source hash' },
    { type: 'callout', tone: 'term', title: 'Hash', html: `<strong>What it is:</strong> a function that turns any text (like the IP <code>49.36.12.7</code>) into a big number. The same input always gives the same number, and different inputs give numbers that are spread out.<br><strong>Why we need it:</strong> to find "this user's server" without remembering anything: divide the number by the number of servers, and the remainder = the server number.<br><strong>Without it:</strong> the LB would have to remember every user's server in a big table.` },
    { type: 'p', html: `<strong>How:</strong> <code>server = hash(user IP) mod N</code>, where N = the number of servers. The same user always goes to the same server (as long as N does not change).<br><strong>Example:</strong> hash(49.36.12.7) = 1,000,004. N = 3 → 1,000,004 mod 3 = 2 → the third server (counting from 0). Tomorrow too.<br><strong>Why people use it:</strong> the server has something warm for that user (a local cache, or a running game/WebSocket session). This is also called "sticky" routing.` },
    { type: 'p', html: `<strong>The big problem (reshuffle):</strong> when N changes, almost everything changes. Go from 3 to 4 servers, and a user keeps the same server only when <code>hash mod 3</code> and <code>hash mod 4</code> are equal, which happens about 1 time in 4. So ~75% of users changed server, and all their warm cache went cold. See it in the lab below.` },
    { type: 'list', items: [
      `<strong>Good:</strong> no state; every LB machine computes the same answer.`,
      `<strong>Bad:</strong> uneven load: if 500 people in one office are behind one IP (NAT), they all land on one server. NGINX <code>ip_hash</code> uses only the first three parts of an IPv4 address (like 49.36.12), so a whole neighbourhood lands on one server. Adding or removing a server causes a heavy reshuffle. If a mobile user's IP changes, the server changes too.`,
      `<strong>When:</strong> only when stickiness is really needed and servers rarely change. Otherwise stateless servers + another algorithm.`,
      `<strong>Where you find it:</strong> NGINX <code>ip_hash</code> and <code>hash $key</code>, HAProxy <code>source</code>, <code>uri</code>, <code>hdr</code>. AWS NLB spreads connections with a "flow hash" (IP + port + protocol).`,
    ]},
    { type: 'h3', text: '9. Consistent hashing' },
    { type: 'p', html: `<strong>How:</strong> imagine a round ring with numbers from 0 to about 4 billion. Hash each server and place it on the ring in many spots (these spots are called <strong>virtual nodes</strong>). A user's hash is also a point on the ring. From that point, walk clockwise: the first server you meet is that user's server.<br><strong>Why it is better:</strong> when a new server arrives, it only "takes" the users near its own spots on the ring. Everyone else stays put. Going from N to N+1 moves only about 1/(N+1) of users (~25% for 3 → 4, versus ~75% with mod N).<br>The full story is in its own lesson: <a href="#/consistent-hashing">Consistent hashing</a>.` },
    { type: 'p', html: `Lab: 60 users (IPs). Change the number of servers. Colour = server. Thick border = this user's server changed in this step. (60 users is a small sample, so the number comes out a little above or below the theory.)` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><label>Servers: <strong class="v-n"></strong> → <strong class="v-n1"></strong><input type="range" class="r-n" min="2" max="5" value="3"></label><div><div style="font-size:14px;margin-bottom:6px">Method</div><div class="h-chips" style="display:flex;gap:6px;flex-wrap:wrap"></div></div></div>
        <div class="h-grid" style="display:flex;flex-wrap:wrap;gap:5px;margin:12px 0"></div>
        <div class="h-leg" style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--ink-2)"></div>
        <div class="stats"><div class="stat"><span>Server changed</span><strong class="o-m"></strong></div><div class="stat"><span>Theory says</span><strong class="o-t"></strong></div><div class="stat"><span>Moved between old servers</span><strong class="o-b"></strong></div></div>
        <div class="calc-note o-n"></div>`;
      const COL = ['var(--accent)', 'var(--green)', 'var(--amber)', 'var(--violet)', 'var(--red)', 'var(--ink-3)'];
      const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15; return h >>> 0; };
      const USERS = Array.from({ length: 60 }, (_, i) => `49.36.${(i * 37) % 256}.${(i * 91 + 17) % 256}`);
      const ring = n => { const pts = []; for (let s = 0; s < n; s++) for (let v = 0; v < 50; v++) pts.push([fnv(`S${s + 1}#${v}`), s]); return pts.sort((a, b) => a[0] - b[0]); };
      const pick = (mode, r, n, ip) => { const h = fnv(ip); if (mode === 'mod') return h % n; for (const [p, s] of r) if (p >= h) return s; return r[0][1]; };
      let mode = 'mod';
      const q = s => el.querySelector(s);
      const run = () => {
        const n = +q('.r-n').value; q('.v-n').textContent = n; q('.v-n1').textContent = n + 1;
        q('.h-chips').innerHTML = '';
        [['mod', 'hash mod N'], ['ring', 'Consistent hashing']].forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = v; b.onclick = () => { mode = k; run(); }; q('.h-chips').appendChild(b); });
        const r0 = ring(n), r1 = ring(n + 1);
        const a = USERS.map(u => pick(mode, r0, n, u)), b = USERS.map(u => pick(mode, r1, n + 1, u));
        let moved = 0, between = 0;
        q('.h-grid').innerHTML = USERS.map((u, i) => { const mv = a[i] !== b[i]; if (mv) { moved++; if (b[i] !== n) between++; } return `<span title="${u}: S${a[i] + 1} → S${b[i] + 1}" style="width:22px;height:22px;border-radius:6px;background:${COL[b[i]]};box-sizing:border-box;border:${mv ? '3px solid var(--ink)' : '1px solid var(--line)'};opacity:${mv ? 1 : 0.55}"></span>`; }).join('');
        q('.h-leg').innerHTML = Array.from({ length: n + 1 }, (_, s) => `<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${COL[s]};vertical-align:-1px"></span> S${s + 1}${s === n ? ' (new)' : ''}</span>`).join('');
        const pct = Math.round(moved / 60 * 100);
        q('.o-m').textContent = `${moved} / 60 (${pct}%)`;
        q('.o-t').textContent = mode === 'mod' ? `~${Math.round(n / (n + 1) * 100)}%` : `~${Math.round(100 / (n + 1))}%`;
        q('.o-b').textContent = between;
        q('.o-n').textContent = mode === 'mod'
          ? `With mod N, ${moved} users changed server, and ${between} of them just moved between old servers (a totally useless move). All of them lost their warm cache.`
          : `With consistent hashing only ${moved} users moved, and all of them went to the new server S${n + 1} (between old ones: ${between}). Everyone else keeps a warm cache.`;
      };
      q('.r-n').addEventListener('input', run);
      run();
    }},
    { type: 'list', items: [
      `<strong>Good:</strong> stickiness + few moves when servers are added or removed. The standard for cache servers and stateful systems.`,
      `<strong>Bad:</strong> a bit complex. With too few virtual nodes, load is uneven. One "hot" key (a very popular user) still lands on one server.`,
      `<strong>Where you find it:</strong> NGINX <code>hash $key consistent</code> (ketama), Envoy <code>RING_HASH</code> and <code>MAGLEV</code> (Google's method, fast lookup, less memory).`,
    ]},
    { type: 'h3', text: '10. Resource based / agent based' },
    { type: 'p', html: `<strong>How:</strong> a small program (an agent) runs on each server and tells the LB "my CPU is 70%, memory 50%", or simply "give me 30% weight". The LB picks based on this report.<br><strong>Example:</strong> S1 reports 20%, S2 90%, S3 60% → S1. A background job (a backup) is running on S2, and now the LB can see it, which a connection count would never show.<br><strong>Danger:</strong> reports arrive every few seconds. In between, every LB believes "S1 is the emptiest" and they all rush to it, and S1 drowns. <strong>In the lab:</strong> pick "Agent based": the first 5 requests all go to S1, because the report does not change for 5 requests.` },
    { type: 'list', items: [
      `<strong>Good:</strong> it sees real resources (CPU, memory, queue) that a request count can hide.`,
      `<strong>Bad:</strong> you must write and run the agent; herding on old reports; you must trust the report.`,
      `<strong>Where you find it:</strong> HAProxy <code>agent-check</code> (the server's agent can report a weight, "drain" or "down"), Envoy's client-side weighted round robin (weights from the servers' load reports), AWS ALB automatic target weights (it watches errors and reduces traffic to a sick server).`,
    ]},
    { type: 'h2', text: 'The race: who wins over thousands of requests?' },
    { type: 'p', html: `The lab showed the inside math. Now look at the results. Three servers, and Server 3 is twice as powerful as the other two. Requests keep arriving for 360 time units (about 550 requests). Change the algorithm and the type of traffic, and see how much load each server gets and how long users have to wait.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="a-chips" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="x-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px"></div>
        <div class="r-out" style="margin-top:16px"></div>
        <div class="stats"><div class="stat"><span>Average wait</span><strong class="o-avg"></strong></div><div class="stat"><span>Worst 5% (p95)</span><strong class="o-p95"></strong></div></div>
        <div class="calc-note o-n"></div>`;
      const ALGS = { rr: 'Round robin', wrr: 'Weighted RR (1:1:2)', lc: 'Least connections', wlc: 'Weighted least conn', p2c: 'Power of two', rnd: 'Random', hash: 'IP hash' };
      const MIX = { same: 'All requests the same size', mixed: 'Some requests very long (export, upload)' };
      const NOTES = {
        rr: { same: 'It split the count evenly, but Server 3 is twice as powerful and still got the same amount of work. It is half idle, while the other two are above 100% (the queue kept growing).', mixed: 'Round robin does not look at request size. Wherever the long requests landed, a queue formed, while Server 3 was half idle.' },
        wrr: { same: 'Server 3 gets a double share: load matches capacity. For same-size requests this is the best.', mixed: 'It respects capacity, but not long requests. The average is fine, but the p95 is bad: sometimes several long requests land on one server.' },
        lc: { same: 'It does not know the weights, but the fast server becomes free sooner, so it gets more by itself. Quite close to weighted RR.', mixed: 'This is where least connections shines: a busy server gets no new request, the free one does.' },
        wlc: { same: 'Count ÷ weight: as good as weighted RR, without needing a perfect sequence.', mixed: 'The best: both the current load and the server power. A safe default for mixed traffic.' },
        p2c: { same: 'It looked at only 2 servers and is still as good as least connections.', mixed: 'The average is close to least connections. The p95 is a bit higher: sometimes both random servers turned out busy.' },
        rnd: { same: 'Random put too much on some servers and left the twice-as-powerful Server 3 idle. The worst p95.', mixed: 'Random + long requests = sometimes bad luck and a long queue.' },
        hash: { same: 'Some users are very active, and the server they hash to is overloaded. Load is split by users, not by capacity.', mixed: 'Heavy users + long requests are stuck on one server. The price of sticky routing: one of the worst p95 values.' },
      };
      let alg = 'rr', mix = 'same';
      const q = s => el.querySelector(s);
      const btns = (sel, map, get, set) => { const box = q(sel); box.innerHTML = ''; Object.entries(map).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.textContent = v; b.onclick = () => { set(k); run(); }; box.appendChild(b); }); };
      const run = () => {
        btns('.a-chips', ALGS, () => alg, k => { alg = k; });
        btns('.x-chips', MIX, () => mix, k => { mix = k; });
        let seed = 11;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        const cap = [1, 1, 2];
        const srv = cap.map(() => ({ jobs: [], handled: 0, work: 0 }));
        const waits = [];
        let rr = 0, wi = 0; const wrrSeq = [2, 0, 2, 1];
        for (let t = 0; t < 400; t++) {
          const arrivals = rnd() < 0.55 ? 2 : 1;
          if (t < 360) for (let a = 0; a < arrivals; a++) {
            const w = mix === 'same' ? 2.2 : (rnd() < 0.1 ? 13 : 1.0);
            const user = rnd() < 0.5 ? Math.floor(rnd() * 3) : Math.floor(rnd() * 30);
            const pa = Math.floor(rnd() * 3), pb0 = Math.floor(rnd() * 2), pb = pb0 >= pa ? pb0 + 1 : pb0;
            let k;
            if (alg === 'rr') { k = rr % 3; rr++; }
            else if (alg === 'wrr') { k = wrrSeq[wi % 4]; wi++; }
            else if (alg === 'rnd') k = pa;
            else if (alg === 'hash') k = (user * 7 + 1) % 3;
            else if (alg === 'lc') { k = 0; srv.forEach((s, i) => { if (s.jobs.length < srv[k].jobs.length) k = i; }); }
            else if (alg === 'p2c') k = srv[pa].jobs.length / cap[pa] <= srv[pb].jobs.length / cap[pb] ? pa : pb;
            else { k = 0; srv.forEach((s, i) => { if (s.jobs.length / cap[i] < srv[k].jobs.length / cap[k]) k = i; }); }
            srv[k].jobs.push({ left: w, start: t });
            srv[k].handled++; srv[k].work += w;
          }
          srv.forEach((s, i) => {
            if (!s.jobs.length) return;
            const share = cap[i] / s.jobs.length;
            s.jobs.forEach(j => { j.left -= share; });
            s.jobs = s.jobs.filter(j => { if (j.left <= 0) { waits.push(t + 1 - j.start); return false; } return true; });
          });
        }
        waits.sort((a, b) => a - b);
        const avg = waits.reduce((a, b) => a + b, 0) / waits.length;
        const p95 = waits[Math.floor(waits.length * 0.95)];
        const util = srv.map((s, i) => s.work / (360 * cap[i]));
        q('.r-out').innerHTML = srv.map((s, i) => {
          const u = Math.min(1.3, util[i]);
          const col = u > 0.95 ? 'var(--red)' : u > 0.7 ? 'var(--amber)' : 'var(--green)';
          return `<div style="display:grid;grid-template-columns:minmax(96px,150px) 1fr 76px;gap:10px;align-items:center;margin:8px 0">
            <div><strong style="font-family:var(--f-display)">Server ${i + 1}</strong><div style="font-size:13px;color:var(--ink-3)">${cap[i] === 2 ? 'double power' : 'normal'}, ${s.handled} req</div></div>
            <div style="height:14px;background:var(--surface-2);border-radius:7px;overflow:hidden"><div style="height:100%;width:${Math.min(100, u / 1.3 * 100).toFixed(1)}%;background:${col};transition:width .4s"></div></div>
            <div style="font:13px var(--f-mono)">${Math.round(util[i] * 100)}% load</div></div>`;
        }).join('');
        q('.o-avg').textContent = (avg * 10).toFixed(0) + ' ms';
        q('.o-p95').textContent = (p95 * 10).toFixed(0) + ' ms';
        q('.o-n').textContent = NOTES[alg][mix];
      };
      run();
    }},
    { type: 'callout', tone: 'tip', html: `The simulator is a simple model (above 100% means so much work arrived that the queue kept growing). But the pattern is like the real world: with same-size requests <strong>weighted round robin</strong> wins, with mixed long and short requests <strong>(weighted) least connections</strong> wins, and power of two stays very close to them, while round robin, random and IP hash fall behind.` },

    { type: 'h2', text: 'L4 vs L7, in depth' },
    { type: 'callout', tone: 'term', title: 'Layer 4 and Layer 7', html: `<strong>What it is:</strong> internet data is wrapped in several parts (layers), like an envelope inside an envelope. Layer 3 has the IP address (which machine). Layer 4 has TCP/UDP: the port number and the "connection" (which program, in which order). Layer 7 has HTTP: URL, headers, cookies, body (what was actually asked for).<br><strong>Why we need it:</strong> the more inner envelopes the LB opens, the smarter its decision can be, but the more work it does.<br><strong>Without it:</strong> the question "L4 or L7?" would make no sense.` },
    { type: 'table', head: ['', 'L4 load balancer', 'L7 load balancer'], rows: [
      ['What it sees', 'Source/destination IP and port, protocol (TCP/UDP)', 'The full HTTP request: method, URL path, host, headers, cookies'],
      ['Decides per', 'Once per <em>connection</em>. All bytes of a connection go to the same server', 'Every <em>request</em> separately. 10 requests on one connection can go to 10 servers'],
      ['TLS (HTTPS)', 'Usually does not open it (passthrough). Sends the bytes as they are', 'Opens it (termination), only then can it read the URL. The certificate is on the LB'],
      ['Speed / cost', 'Very fast, little CPU. One machine handles hundreds of thousands of connections', 'Parsing every request and opening TLS: more CPU and memory'],
      ['Extra features', 'Very few. Any protocol works (databases, games, MQTT)', 'Path/header routing, retries, timeouts, compression, auth, rate limiting, canary %'],
      ['Examples', 'AWS NLB, Linux LVS/IPVS, Google Maglev, Meta Katran, HAProxy <code>mode tcp</code>', 'AWS ALB, NGINX, Envoy, HAProxy <code>mode http</code>, Traefik'],
    ]},
    { type: 'callout', tone: 'why', title: 'The long-connection trap (HTTP/2, gRPC)', html: `With HTTP/2 and gRPC, an app opens just one connection and keeps sending thousands of requests on it. An L4 LB decides per connection, so all requests of one client stick to one server. With 10 clients and 10 servers, some server gets 3 clients and some get 0. An L7 LB can send each request to a different server, so load is even. That is why gRPC services usually have an L7 LB (like Envoy) in front.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', x: 70, y: 170, w: 110, kind: 'client', info: 'What it is: the browsers and apps of xyz.com. They send requests over HTTPS, so the data is encrypted.' },
        { id: 'l4', label: 'L4 LB', sub: 'IP + port', x: 225, y: 170, w: 120, kind: 'net', info: 'What it is: the very fast outer LB (like AWS NLB or Katran). It only sees IP and port and does not open the encrypted bytes. It spreads connections across several L7 proxies.' },
        { id: 'l7', label: 'L7 proxy', sub: 'reads the URL', x: 395, y: 170, w: 130, kind: 'edge', info: 'What it is: the smart LB (like Envoy or NGINX). It opens TLS, reads the URL path, and gives the request to the pool of the right service. It also health-checks every pool.' },
        { id: 'web', label: 'Web pool', sub: '/feed, /profile', x: 610, y: 60, w: 150, kind: 'server', meter: true, load: 30, info: 'What it is: the servers for normal pages. An algorithm (least connections) runs inside this pool too.' },
        { id: 'pay', label: 'Payments', sub: '/api/payments', x: 610, y: 170, w: 150, kind: 'server', meter: true, load: 20, info: 'What it is: the payment service, on separate servers. Because it is a separate pool, its problems do not take down the rest of the site.' },
        { id: 'img', label: 'Images', sub: '/images/*', x: 610, y: 280, w: 150, kind: 'server', meter: true, load: 25, info: 'What it is: the servers that serve photos (and later a CDN). Heavy files, a separate pool.' },
      ],
      edges: [{ a: 'u', b: 'l4' }, { a: 'l4', b: 'l7' }, { a: 'l7', b: 'web' }, { a: 'l7', b: 'pay' }, { a: 'l7', b: 'img' }],
      scenarios: [
        { name: 'Routing by path', steps: [
          { title: 'Feed', text: 'The L4 LB gave the connection to the L7 proxy. L7 opened TLS and saw the path <code>/feed</code> → Web pool.', go: ['u>l4>l7>web', 'res:web>l7>l4>u'], msg: 'GET /feed  →  web pool' },
          { title: 'Payment', text: 'Same domain, different path. L7 saw <code>/api/payments</code> → Payments pool.', go: ['u>l4>l7>pay', 'res:pay>l7>l4>u'], msg: 'POST /api/payments  →  payments pool' },
          { title: 'Photo', text: '<code>/images/</code> → Images pool. Three different systems behind one address.', go: ['u>l4>l7>img', 'res:img>l7>l4>u'], msg: 'GET /images/riya.jpg  →  images pool' },
        ]},
        { name: 'Through the eyes of L4', intro: 'What does the L4 LB see?', steps: [
          { title: 'Only the outside of the envelope', text: 'L4 only sees the IP and port. Inside are encrypted bytes, and the URL is not visible. So it just hands the connection to some L7 proxy (often by a hash of IP+port).', go: 'u>l4', msg: 'TCP 49.36.12.7:51544 → 203.0.113.10:443\npayload: 17 03 03 00 4a 8f e1 ... (encrypted)' },
          { title: 'The connection moves on', text: 'All bytes of this connection will now go to this L7 proxy. L4 does very little work, which is why it is so fast.', go: 'l4>l7' },
        ]},
        { name: 'Payments pool down', steps: [
          { title: 'All payment servers are sick', text: 'A bug in the new deploy. Health checks fail.', set: { pay: { state: 'down', sub: 'DOWN', load: 0 } }, go: 'lost:l7>pay' },
          { title: 'Errors only for payments', text: 'The L7 proxy immediately returns 503 (or a "pay later" page).', go: ['u>l4>l7', 'bad:l7>l4>u'], msg: 'POST /api/payments  →  503 Service Unavailable' },
          { title: 'The rest of the site works', text: 'Feed and photos are on separate pools, nothing happened to them. Separate pools = a smaller "blast radius" (the area of damage).', go: ['u>l4>l7>web', 'u>l4>l7>img'], parallel: true },
        ]},
      ],
    },
    { type: 'p', html: `Big systems often use both: L4 on the outside (to absorb raw traffic and attacks, very cheap per connection), and L7 proxies behind it (for smart routing). Google's Maglev and Meta's Katran are such outer L4 load balancers, running as software on normal Linux servers.` },
    { type: 'h2', text: 'Global: how do we send a user to the right data center?' },
    { type: 'p', html: `xyz.com now runs in two places: Mumbai and the US (Virginia). Each place is called a <strong>region</strong>: a full setup (LB + servers + a copy of the database). A user in Chennai should go to Mumbai, a user in New York to Virginia. A round trip from Mumbai to Virginia takes ~200 ms; to a nearby region it is ~20-40 ms. This "which region?" decision happens before the LB. There are three ways.` },
    { type: 'callout', tone: 'term', title: 'GeoDNS', html: `<strong>What it is:</strong> a DNS that gives a different answer based on where the asker is. The location is guessed from the IP of the user's DNS resolver.<br><strong>Why we need it:</strong> the user in India gets the Mumbai IP, the user in the US gets the Virginia IP, without the user doing anything.<br><strong>Without it:</strong> everyone goes to one region, and far-away users pay 200 ms extra on every click.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'in', label: 'User, Chennai', x: 100, y: 80, w: 150, kind: 'client', info: 'What it is: a user in India opening xyz.com. Their DNS resolver is also in India, so GeoDNS treats them as an Indian user.' },
        { id: 'us', label: 'User, New York', x: 100, y: 250, w: 150, kind: 'client', info: 'What it is: a user in the US. Same domain xyz.com, but they need the nearby region.' },
        { id: 'dns', label: 'GeoDNS', sub: 'IP by location', x: 340, y: 165, w: 160, kind: 'net', info: 'What it is: a DNS that answers based on location. It also health-checks every region: if a region is down, it leaves it out of the answer.' },
        { id: 'm', label: 'Mumbai region', sub: 'LB + servers', x: 600, y: 80, w: 160, kind: 'edge', info: 'What it is: the full setup near India: an LB pair, servers, a copy of the database.' },
        { id: 'v', label: 'Virginia region', sub: 'LB + servers', x: 600, y: 250, w: 160, kind: 'edge', info: 'What it is: the full setup near the US. It is also the backup if Mumbai falls.' },
      ],
      edges: [{ a: 'in', b: 'dns' }, { a: 'us', b: 'dns' }, { a: 'dns', b: 'm', dashed: true }, { a: 'dns', b: 'v', dashed: true }, { a: 'in', b: 'm' }, { a: 'us', b: 'v' }],
      scenarios: [
        { name: 'The nearby region', steps: [
          { title: 'Both look up xyz.com', parallel: true, go: ['in>dns', 'us>dns'], text: 'Same domain, from different places.' },
          { title: 'GeoDNS gives different answers', parallel: true, go: ['res:dns>in', 'res:dns>us'], text: 'Chennai gets the Mumbai IP, New York gets the Virginia IP.', msg: 'Chennai: xyz.com → 13.x.x.x (Mumbai)\nNew York: xyz.com → 52.x.x.x (Virginia)' },
          { title: 'Each user talks to the nearby region', parallel: true, go: ['in>m', 'us>v', 'res:m>in', 'res:v>us'], text: 'The round trip drops from 200 ms to ~20-40 ms.' },
        ]},
        { name: 'Mumbai region down', steps: [
          { title: 'Mumbai fell', set: { m: { state: 'down', sub: 'DOWN' } }, text: 'The whole region is unavailable (a big power or network problem).', focus: ['m'] },
          { title: 'GeoDNS health check fails', text: 'GeoDNS removes Mumbai from its answers.', go: 'lost:dns>m' },
          { title: 'The Chennai user now goes to Virginia', text: 'Slower (it is far), but it works. Note: for as long as the DNS TTL, some users may still have the old Mumbai IP cached, and for them the site looks down.', go: ['in>dns', 'res:dns>in', 'in>dns>v'], msg: 'xyz.com → 52.x.x.x (Virginia)' },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Anycast', html: `<strong>What it is:</strong> many data centers around the world announce <strong>the same IP address</strong>. Internet routers (which choose paths using a protocol called BGP) carry each packet to the nearest data center in network terms.<br><strong>Why we need it:</strong> no DNS caching trouble. If a data center falls, it stops announcing, and routers send traffic to the next nearest one within seconds.<br><strong>Without it:</strong> failover would be stuck waiting for the DNS TTL.<br><strong>Example:</strong> Cloudflare's 1.1.1.1 and Google's 8.8.8.8 DNS, big CDNs, and Google Cloud's global load balancer (one anycast IP for the whole world).` },
    { type: 'callout', tone: 'term', title: 'GSLB (Global Server Load Balancing)', html: `<strong>What it is:</strong> the system that decides "which region?". It is a brain on top of GeoDNS or anycast that looks at location plus the health, load and latency of each region.<br><strong>Why we need it:</strong> if the nearby region is full or sick, skip it and pick the next best region.<br><strong>Without it:</strong> you send users by location only, even if that region is on fire.<br><strong>Example:</strong> AWS Route 53 (latency, geolocation and failover routing), Cloudflare Load Balancing, F5 BIG-IP DNS.` },
    { type: 'table', head: ['', 'GeoDNS', 'Anycast', 'GSLB'], rows: [
      ['How', 'A different IP based on location', 'One IP; internet routing picks the nearest', 'A brain for DNS/anycast + health + load + latency'],
      ['Failover speed', 'Depends on the TTL (minutes)', 'Seconds', 'As fast as the method underneath'],
      ['Weakness', 'The resolver\'s location can be wrong, caching', 'Hard to run yourself (BGP, your own IP range). If the route changes in the middle, a TCP connection can break', 'Expensive, one more system'],
      ['When', 'A simple multi-region site', 'DNS, CDN, global edge', 'Large multi-region products'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "L7 is always better"', html: `L7 is smart, but opening every request is expensive, and some traffic is not HTTP at all (databases, games, raw TCP). And use sticky routing (IP hash, cookie) only when it is really needed, like a WebSocket or game session running on one server. In normal web apps, keep servers stateless and let the algorithm choose freely.` },
    { type: 'callout', tone: 'why', title: 'How to decide', html: `<strong>Algorithm:</strong><br>• Identical servers, identical small requests → <strong>round robin</strong>.<br>• Servers of different sizes → <strong>weighted round robin</strong> (smooth).<br>• Request times vary a lot (some ms, some seconds) → <strong>(weighted) least connections</strong>.<br>• Many LB machines, a big fleet → <strong>power of two choices</strong>.<br>• Some servers are sometimes slow → <strong>least response time</strong> (with P2C).<br>• A user/key needs the same server (cache, session) → <strong>consistent hashing</strong>, not simple IP hash.<br><strong>Layer:</strong> routing by URL/header/cookie → <strong>L7</strong>. Raw speed or non-HTTP traffic (millions of WebSockets) → <strong>L4</strong>. Often both: L4 outside, L7 inside.<br><strong>Global:</strong> simple → GeoDNS (short TTL). Fast failover → anycast or GSLB.` },
    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'Load balancing: the whole picture', height: 610,
      groups: [
        { label: 'Users', x: 20, y: 8, w: 680, h: 96 },
        { label: 'Mumbai region', x: 20, y: 252, w: 330, h: 344 },
        { label: 'Virginia region', x: 370, y: 252, w: 330, h: 344 },
      ],
      nodes: [
        { id: 'uin', label: 'User, Chennai', x: 185, y: 58, w: 150, kind: 'client', info: 'What it is: a user in India. GeoDNS/GSLB gives them the address of the Mumbai region.' },
        { id: 'uus', label: 'User, New York', x: 535, y: 58, w: 150, kind: 'client', info: 'What it is: a user in the US. They get the Virginia region.' },
        { id: 'gslb', label: 'GeoDNS / GSLB', sub: 'picks the region', x: 360, y: 168, w: 170, kind: 'net', info: 'What it is: the global decision: it looks at location, region health and load, and says "which region". Anycast does the same job at the IP level.' },
        { id: 'm4', label: 'L4 LB', sub: 'IP + port', x: 185, y: 312, kind: 'net', info: 'What it is: the fast outer LB of the region. It only looks at IP/port and spreads connections across L7 proxies (often with a hash).' },
        { id: 'm7', label: 'L7 proxy', sub: 'TLS · URL', x: 185, y: 410, kind: 'edge', info: 'What it is: it opens TLS, reads the URL, and picks a pool for every request. Inside each pool it runs an algorithm: least connections for app servers, consistent hashing for the cache.' },
        { id: 'mapp', label: 'App servers', sub: 'least conn', x: 105, y: 530, w: 130, kind: 'server', info: 'What it is: stateless application servers. Request times vary, so (weighted) least connections or power of two.' },
        { id: 'mc', label: 'Cache nodes', sub: 'consistent hash', x: 265, y: 530, w: 130, kind: 'cache', info: 'What it is: cache servers. The same key must always go to the same node, so consistent hashing. Adding a node moves only ~1/N of the keys.' },
        { id: 'v4', label: 'L4 LB', sub: 'IP + port', x: 535, y: 312, kind: 'net', info: 'What it is: the outer L4 LB of the Virginia region. If Mumbai falls, it also takes the failover traffic.' },
        { id: 'v7', label: 'L7 proxy', sub: 'TLS · URL', x: 535, y: 410, kind: 'edge', info: 'What it is: the Virginia L7 proxy, with the same routing rules.' },
        { id: 'vapp', label: 'App servers', sub: 'least conn', x: 535, y: 530, w: 150, kind: 'server', info: 'What it is: the Virginia application servers. During a failover they carry more load, so they need autoscaling.' },
      ],
      edges: [
        { a: 'uin', b: 'gslb', n: 1, label: 'which region?' },
        { a: 'uus', b: 'gslb', dashed: true },
        { a: 'uin', b: 'm4', n: 2, label: 'HTTPS' },
        { a: 'uus', b: 'v4' },
        { a: 'gslb', b: 'v4', dashed: true, kind: 'bad' },
        { a: 'm4', b: 'm7', n: 3, label: 'connection' },
        { a: 'm7', b: 'mapp', n: 4, label: 'request' },
        { a: 'm7', b: 'mc', label: 'hash(key)' },
        { a: 'v4', b: 'v7' },
        { a: 'v7', b: 'vapp' },
      ],
      paths: [
        { name: 'India request', text: 'GSLB picked Mumbai. L4 gave the connection to an L7 proxy, and L7 read the URL and picked an app server with least connections.', go: ['uin>gslb', 'uin>m4>m7>mapp'] },
        { name: 'Cache lookup', text: 'L7 (or the app) hashes the key and picks a cache node from the consistent hashing ring. Same key, same node.', go: ['m4>m7>mc'] },
        { name: 'US request', text: 'The New York user goes to the Virginia region, and there it is the same L4 → L7 → pool path.', go: ['uus>gslb', 'uus>v4>v7>vapp'] },
        { name: 'Mumbai down', text: 'Mumbai\'s health check failed. GSLB now sends Chennai to Virginia too: slower but working. With GeoDNS, some users stay stuck until the TTL ends.', go: ['uin>gslb>v4>v7>vapp'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Round robin = take turns. Weighted RR = the bigger server gets more turns (the smooth NGINX version avoids bursts).</li>
      <li>Least connections (and weighted) = look at the current load. The best default for a mix of long and short requests.</li>
      <li>Least response time = catch slow servers. Random = zero state. Power of two = the less busy of two random servers: cheap and nearly perfect.</li>
      <li>IP hash = sticky, but when N changes almost everyone moves. Consistent hashing = only ~1/N move.</li>
      <li>Agent based = servers report their own load, but old reports can cause herding.</li>
      <li>L4 = IP/port, per connection, fast. L7 = URL/headers, per request, smart but costly. Often L4 outside, L7 inside.</li>
      <li>Global: GeoDNS (TTL trouble), Anycast (one IP, fast failover), GSLB (a brain for health + load + latency).</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['The right algorithm can cut p95 latency many times (in the race simulator from 290 ms to 40-50 ms)', 'Weights let you fully use servers of different sizes', 'Consistent hashing keeps caches warm and makes scaling cheap', 'L7 puts many services behind one address, with separate pools and a small blast radius', 'GeoDNS/anycast save far-away users 150+ ms'], costs: ['Smart algorithms need state (connections, latency), and with many LBs this state is scattered', 'L7 costs CPU and TLS work, so more machines than L4', 'Sticky/hash routing makes load uneven and loses sessions on failover', 'A global setup = a full copy in every region, and the headache of syncing data', 'DNS-based failover is slow because of the TTL'] },
    { type: 'think', questions: [
      { q: 'On xyz.com 95% of requests take 20 ms and 5% are video exports of 60 seconds. Which algorithm and why? Is there a better design?', a: 'Least connections (or least outstanding requests, or P2C). Round robin can pile long exports on one server. Better design: send exports to a separate async job queue, so such requests never reach the web servers.' },
      { q: 'You have 4 LB machines all running least connections, but each one has its own count. You added a new server, and for 4 seconds it got a heavy crowd. Why, and what is the fix?', a: 'Each LB saw "the new server has 0 connections, it is the emptiest", and all four rushed to it at once (herding). Fix: power of two choices (randomness breaks herding), and slow start (raise the weight of a new server slowly).' },
      { q: 'A region failover with GeoDNS took 5 minutes. Why?', a: 'The DNS TTL. Resolvers and browsers had cached the old IP. For fast failover keep the TTL short (30-60 s), or use anycast/GSLB where the IP does not have to change.' },
      { q: 'A gRPC service has an L4 LB in front. 10 clients, 10 servers, yet 3 servers are at 100% and 4 are idle. Why?', a: 'gRPC keeps one long HTTP/2 connection. L4 decides per connection, so all requests of each client stuck to one server. Fix: an L7 LB (Envoy) that spreads each request separately, or client-side load balancing.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Servers have different capacities, and requests are the same size. Best simple choice?', options: ['Round robin', 'Weighted round robin', 'IP hash'], answer: 1, explain: 'A share that matches capacity. In the race simulator, weighted RR was ahead with same-size requests.' },
      { q: 'With weights 3:1:1, how does NGINX smooth weighted round robin split the first 5 requests?', options: ['S1 S1 S1 S2 S3', 'S1 S2 S1 S3 S1', 'S1 S2 S3 S1 S1'], answer: 1, explain: 'Each time add the weights to the counters, pick the biggest, and subtract the total weight (5) from it. This spreads out S1\'s turns, so there is no burst.' },
      { q: 'What does power of two choices do?', options: ['Sends every request to two servers', 'Picks the less busy of two random servers', 'Uses only two servers'], answer: 1, explain: 'Looking at only two still spreads load almost as evenly as least connections. Envoy LEAST_REQUEST and HAProxy random (2 draws by default) do this.' },
      { q: 'With hash(IP) mod N you go from 3 servers to 4. About how many users change server?', options: ['~25%', '~50%', '~75%'], answer: 2, explain: 'A server stays the same only when hash mod 3 equals hash mod 4, which happens ~1 time in 4. With consistent hashing only ~25% would move, all to the new server.' },
      { q: 'Which LB can route by URL path?', options: ['L4', 'L7', 'GeoDNS'], answer: 1, explain: 'L7 opens TLS and reads the HTTP request. L4 only sees IP and port.' },
      { q: 'You need region failover in seconds, without DNS caching. Which method?', options: ['GeoDNS with a long TTL', 'Anycast', 'IP hash'], answer: 1, explain: 'With anycast every region announces the same IP. If a region falls, internet routing sends traffic to the next nearest one by itself.' },
    ]},
    { type: 'sources', items: [
      { title: 'Module ngx_http_upstream_module', publisher: 'nginx.org', official: true, url: 'https://nginx.org/en/docs/http/ngx_http_upstream_module.html', used: 'Default weighted round robin, least_conn, ip_hash (the first three octets of IPv4), hash ... consistent (ketama), random two least_conn, least_time (commercial).' },
      { title: 'Upstream: smooth weighted round-robin balancing (commit, 2012)', publisher: 'nginx source (Maxim Dounin)', official: true, year: 2012, url: 'https://nginx.googlesource.com/nginx/+/52327e0627f49dbda1e8db695e63a4b0af4448b1', used: 'The current_weight algorithm of smooth WRR and the 5:1:1 example a a b a c a a.' },
      { title: 'Backends: load balancing algorithms', publisher: 'HAProxy Technologies docs', official: true, url: 'https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/backends/', used: 'roundrobin is the default up to 3.2, random (power of two) is the default from 3.3; leastconn, source, uri, hdr.' },
      { title: 'Test Driving "Power of Two Random Choices" Load Balancing (2019)', publisher: 'HAProxy blog', official: true, year: 2019, url: 'https://www.haproxy.com/blog/power-of-two-load-balancing', used: 'The default of 2 draws for the random algorithm (HAProxy 2.0), and test results of P2C vs leastconn vs roundrobin.' },
      { title: 'Supported load balancers', publisher: 'Envoy proxy docs', official: true, url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers', used: 'ROUND_ROBIN, LEAST_REQUEST (default choice_count 2, the weight/(active+1) formula for different weights), RING_HASH, MAGLEV, RANDOM, client-side weighted RR.' },
      { title: 'Edit target group attributes (routing algorithm)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html', used: 'ALB: round robin by default, least outstanding requests, weighted random + automatic target weights.' },
      { title: 'The Power of Two Choices in Randomized Load Balancing (PhD thesis, 1996)', publisher: 'Michael Mitzenmacher, UC Berkeley', year: 1996, url: 'https://www.eecs.harvard.edu/~michaelm/postscripts/mythesis.pdf', used: 'The result that two random choices make the load of the busiest server drop a lot.' },
      { title: 'Beyond Round Robin: Load Balancing for Latency (2016)', publisher: 'Linkerd blog', official: true, year: 2016, url: 'https://linkerd.io/2016/03/16/beyond-round-robin-load-balancing-for-latency/', used: 'Latency-aware balancing and the idea of peak EWMA.' },
      { title: 'Maglev: A Fast and Reliable Software Network Load Balancer (NSDI 2016)', publisher: 'Google (USENIX)', year: 2016, url: 'https://research.google/pubs/maglev-a-fast-and-reliable-software-network-load-balancer/', used: 'A software L4 LB on normal Linux servers, Maglev hashing.' },
      { title: 'What is Anycast?', publisher: 'Cloudflare Learning Center', official: true, url: 'https://www.cloudflare.com/learning/cdn/glossary/anycast-network/', used: 'One IP from many data centers, BGP routing to the nearest one.' },
      { title: 'Cloud Load Balancing overview', publisher: 'Google Cloud documentation', official: true, url: 'https://cloud.google.com/load-balancing/docs/load-balancing-overview', used: 'The single anycast IP of the global external load balancer.' },
    ]},
  ],
});
