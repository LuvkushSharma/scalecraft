Lesson.register({
  id: 'design-id-kv',
  title: 'Unique ID generator and KV store',
  minutes: 42,
  summary: `Two classic "build the building block yourself" questions. First: a service that hands out thousands of unique, time-ordered IDs every second (the design of Twitter Snowflake). Second: a key-value store like the one in Amazon's Dynamo paper, which brings together almost everything from phases 2 and 3: consistent hashing, vnodes, N/R/W quorums, vector clocks, gossip, Merkle trees, hinted handoff, read repair, and LSM storage inside each node.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `In this lesson we build two small but very important machines. The first is a "number-giving machine". Every second, thousands of new posts and messages are created on xyz.com, and each one needs its own number (ID). 200 servers create numbers at the same time, yet no two may ever be the same. The second is a huge "key to value" store, like a giant dictionary: give a word, get its meaning. This dictionary is spread over thousands of machines, and some machines break every day, yet a write must never be refused and data must never be lost. Both have one thing in common: <strong>there is no single boss machine</strong> that everything depends on.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Two questions, 10 minutes each: (1) 200 servers need thousands of IDs every second, no two may ever be the same, and the IDs should be roughly sorted by time. (2) A key-value store that never refuses a write, even when some servers die. Think on paper, then read.` },
    { type: 'p', html: `Both questions share one mood: <strong>no central boss</strong>. Twitter built Snowflake in 2010 because it needed IDs that machines could create without talking to each other. In the 2007 Dynamo paper, Amazon described a store where every node is equal and there is no leader. The concepts were covered in earlier lessons (<a href="#/unique-ids">Unique IDs</a>, <a href="#/consistent-hashing">Consistent hashing</a>, <a href="#/consistency">Quorums</a>). Here we join them into a <strong>service</strong>.` },

    { type: 'h2', text: 'Part 1: Unique ID generator service' },
    { type: 'callout', tone: 'term', title: 'Unique ID', html: `<strong>What it is:</strong> a number for each thing (post, message, order) that belongs only to that thing in the whole world, like the separate IMEI number of every phone. The database uses it to find, join and sort things.<br><strong>Why we need it:</strong> when the data was in one database, the database itself gave out 1, 2, 3... (auto-increment). Now the data is on many machines, and many servers create new posts at the same time. Asking one shared counter every time is slow and risky (if it fails, no post can be created).<br><strong>Without it:</strong> two posts could get the same ID: one post's comment would show on the other, or one post would overwrite the other.` },
    { type: 'h3', text: 'Requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• <code>next_id()</code>: a new 64-bit ID (64 bits = a number that goes up to about 1.8 × 10<sup>19</sup>, and fits in Java's <code>long</code> or SQL's <code>BIGINT</code>)<br>• IDs never repeat, on any machine<br>• Roughly in time order (newer tweet = bigger ID)<br>• (Optional) a batch in one call: 100 IDs` },
      right: { title: 'Non-functional', html: `• Twitter's 2010 post: <strong>thousands of IDs per second</strong>, highly available<br>• Snowflake README: at least 10k IDs/second per process, ~2 ms response (not counting the network)<br>• No coordination between machines<br>• Fits in 64 bits (Java long, SQL BIGINT)` },
    },
    { type: 'p', html: `At that time Twitter was moving from MySQL to Cassandra (a distributed database; we will talk about it in Part 2), and Cassandra has nothing like auto-increment. A central counter (ticket server) would be both a SPOF and a bottleneck; a UUID (a random 128-bit ID) is very long and not in time order. So: Snowflake.` },
    { type: 'callout', tone: 'term', title: 'Snowflake ID', html: `<strong>What it is:</strong> a 64-bit number made by joining three pieces: <strong>time</strong> (how many milliseconds now) + <strong>machine number</strong> (which server made it) + <strong>sequence</strong> (which number this server is on within that millisecond). Like a ticket that says "date-time + counter number + serial number for that moment".<br><strong>Why we need it:</strong> each server makes its own IDs without asking anyone. Machine numbers differ, so two servers never clash. Time comes first, so newer IDs are bigger (roughly sorted).<br><strong>Without it:</strong> either a central counter (slow, a SPOF) or a random UUID (128 bits, no time order, bad for a database index).` },
    { type: 'p', html: `The full story of the layout and clock skew is in the <a href="#/unique-ids">Unique IDs</a> lesson. The design question here: <strong>how do we split the bits?</strong>` },
    { type: 'h3', text: 'Bit budget: 63 bits, three parts' },
    { type: 'p', html: `The first bit is the "sign bit" (whether the number is positive or negative); we keep it 0 so the ID is always positive. That leaves 63 bits. Time is counted from a "custom epoch" (epoch = the starting moment from which the clock counts from 0; Twitter picked its own date to save bits). The more bits you give to time, the more years it lasts. The more to the machine, the more machines. The more to the sequence, the more IDs per millisecond. One part's gain = another part's loss. Play:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Timestamp bits (ms): <strong class="idb-tv"></strong></label><input class="idb-t" type="range" min="35" max="45" step="1" value="41"></div>
          <div><label>Machine bits: <strong class="idb-mv"></strong></label><input class="idb-m" type="range" min="4" max="16" step="1" value="10"></div>
          <div><label>Machines needed: <strong class="idb-nv"></strong></label><input class="idb-n" type="range" min="10" max="5000" step="10" value="200"></div>
          <div><label>Peak IDs/second on one machine: <strong class="idb-pv"></strong></label><input class="idb-p" type="range" min="1000" max="10000000" step="1000" value="50000"></div>
        </div>
        <svg class="idb-svg" viewBox="0 0 320 44" style="width:100%;height:auto;margin-top:10px" role="img" aria-label="Bit layout of a 64-bit ID"></svg>
        <div class="stats">
          <div class="stat"><span>Sequence bits (left over)</span><strong class="idb-s"></strong></div>
          <div class="stat"><span>How many years it lasts</span><strong class="idb-y"></strong></div>
          <div class="stat"><span>Max machines</span><strong class="idb-mm"></strong></div>
          <div class="stat"><span>IDs/second per machine (max)</span><strong class="idb-ps"></strong></div>
        </div>
        <div class="calc-note idb-note"></div>`;
      const q = s => el.querySelector(s);
      const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 3).replace(/\.?0+$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(n);
      const upd = () => {
        const t = +q('.idb-t').value, m = +q('.idb-m').value, need = +q('.idb-n').value, peak = +q('.idb-p').value;
        const s = 63 - t - m;
        q('.idb-tv').textContent = t; q('.idb-mv').textContent = m; q('.idb-nv').textContent = need; q('.idb-pv').textContent = fmt(peak);
        const years = Math.pow(2, t) / (365.25 * 24 * 3600 * 1000);
        const maxM = Math.pow(2, m), perSec = s >= 1 ? Math.pow(2, s) * 1000 : 0;
        q('.idb-s').textContent = s >= 1 ? s : 'none!';
        q('.idb-y').textContent = years >= 100 ? years.toFixed(0) : years.toFixed(1);
        q('.idb-mm').textContent = maxM.toLocaleString('en-US');
        q('.idb-ps').textContent = s >= 1 ? fmt(perSec) : '0';
        const W = 300 / 64, x0 = 10; let x = x0;
        const seg = (bits, col, lab) => { const w = bits * W; const r = `<rect x="${x}" y="6" width="${Math.max(w, 0)}" height="22" fill="${col}" stroke="var(--bg)" stroke-width="1"/>` + (() => { const full = lab + ' ' + bits, t = full.length * 5.6 < w - 4 ? full : String(bits).length * 5.6 < w - 4 ? String(bits) : ''; return t && lab ? `<text x="${x + w / 2}" y="21" text-anchor="middle" font-size="9" fill="var(--bg)" font-family="var(--f-mono)">${t}</text>` : ''; })(); x += Math.max(w, 0); return r; };
        q('.idb-svg').innerHTML = seg(1, 'var(--ink-3)', '') + seg(t, 'var(--accent)', 'time') + seg(m, 'var(--violet)', 'machine') + seg(Math.max(s, 0), 'var(--green)', 'seq') +
          `<text x="${x0}" y="40" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">bit 63 (sign)</text><text x="310" y="40" text-anchor="end" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">bit 0</text>`;
        const probs = [];
        if (s < 1) probs.push('not a single bit is left for the sequence: a machine cannot make even one ID per ms');
        if (need > maxM) probs.push(`${need} machines are needed, but ${m} bits give only ${maxM} names`);
        if (s >= 1 && peak > perSec) probs.push(`one machine needs ${fmt(peak)}/s, but the sequence gives only ${fmt(perSec)}/s`);
        if (years < 20) probs.push(`only ${years.toFixed(1)} years: the IDs run out while the system is still alive`);
        q('.idb-note').textContent = probs.length ? 'Problem: ' + probs.join('; ') + '.' : `It fits. ${t}/${m}/${s} layout: ~${years.toFixed(1)} years (from the custom epoch), ${maxM} machines, each machine up to ${fmt(perSec)} IDs/second.` + (t === 41 && m === 10 ? ' This is exactly the Twitter Snowflake layout.' : ' Whatever one part got was taken from the other two.');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With Twitter's layout (41 / 10 / 12): 2<sup>41</sup> ms ≈ <strong>69.7 years</strong>, 2<sup>10</sup> = <strong>1,024 machines</strong>, and 2<sup>12</sup> = 4,096 IDs every millisecond, so one machine can make up to <strong>about 4.1 million IDs/second</strong> (the README target was only 10k/second, so there was lots of room). If you need 5,000 machines, raise the machine bits; the sequence or the years get cut. Instagram picked 41 / 13 / 10, because its "machine" bits were really logical shards (see the <a href="#/unique-ids">Unique IDs</a> lesson).` },
    { type: 'p', html: `You can also go the other way: break any Snowflake ID apart and see when and on which machine it was made. In Twitter's layout, the 10 machine bits were split again into two parts: 5 bits data center + 5 bits worker (server). Pick an ID below or type your own number:` },
    { type: 'custom', render(el) {
      // Snowflake decoder: 41-bit ms since Twitter epoch | 5-bit datacenter | 5-bit worker | 12-bit sequence
      const EPOCH = 1288834974657n;
      const PRESETS = [['ID from the flow', '2106693309475987456'], ['Same ms, next sequence', '2106693309475987457'], ['Same ms, dc 2 worker 1', '2106693309476114432'], ['1 ms later', '2106693309480181760']];
      el.innerHTML = `<div class="sfd-pre" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="margin-top:8px"><label>Snowflake ID: <input class="sfd-in" type="text" inputmode="numeric" value="2106693309475987456" style="width:100%;max-width:300px;font-family:var(--f-mono)"></label></div>
        <div class="sfd-bits" style="font-family:var(--f-mono);font-size:11px;word-break:break-all;margin-top:8px;line-height:1.6"></div>
        <div class="stats">
          <div class="stat"><span>Time (UTC)</span><strong class="sfd-t"></strong></div>
          <div class="stat"><span>Data center</span><strong class="sfd-d"></strong></div>
          <div class="stat"><span>Worker</span><strong class="sfd-w"></strong></div>
          <div class="stat"><span>Sequence</span><strong class="sfd-s"></strong></div>
        </div>
        <div class="calc-note sfd-note"></div>`;
      const q = s => el.querySelector(s);
      const pre = q('.sfd-pre');
      PRESETS.forEach(([n, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = n; b.onclick = () => { q('.sfd-in').value = v; upd(); }; pre.appendChild(b); });
      const upd = () => {
        const raw = q('.sfd-in').value.trim();
        if (!/^[0-9]{1,19}$/.test(raw) || BigInt(raw) >= (1n << 63n)) { q('.sfd-note').textContent = 'Enter a positive number that fits in 63 bits (up to 19 digits).'; return; }
        const id = BigInt(raw);
        const ts = id >> 22n, dc = (id >> 17n) & 31n, wk = (id >> 12n) & 31n, sq = id & 4095n;
        const ms = ts + EPOCH;
        const b = id.toString(2).padStart(64, '0');
        const col = (s, c) => `<span style="color:${c}">${s}</span>`;
        q('.sfd-bits').innerHTML = col(b.slice(0, 1), 'var(--ink-3)') + ' ' + col(b.slice(1, 42), 'var(--accent)') + ' ' + col(b.slice(42, 47), 'var(--violet)') + ' ' + col(b.slice(47, 52), 'var(--violet)') + ' ' + col(b.slice(52), 'var(--green)');
        q('.sfd-t').textContent = new Date(Number(ms)).toISOString().replace('T', ' ').replace('Z', '');
        q('.sfd-d').textContent = String(dc); q('.sfd-w').textContent = String(wk); q('.sfd-s').textContent = String(sq);
        q('.sfd-note').textContent = `Time part = ${ts} ms after the Twitter epoch (4 Nov 2010). Formula: time = ID >> 22, dc = (ID >> 17) & 31, worker = (ID >> 12) & 31, sequence = ID & 4095. Notice: time is on the far left (the biggest bits), so an ID made later is always a bigger number, whatever the machine.`;
      };
      q('.sfd-in').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Compare the presets: "next sequence" is just +1 in the last bits. "dc 2 worker 1" was made in the same millisecond on another machine: same time, different machine bits, so a different ID. The "1 ms later" ID is bigger than all the others. This is what "roughly sorted by time" means.` },
    { type: 'h3', text: 'Service or library?' },
    { type: 'p', html: `Twitter's Snowflake was a separate <strong>service</strong>: a Thrift server written in Scala (Thrift = a way for servers to call each other's functions, like gRPC) that other services called over the network. The other way: run the generator as a <strong>library</strong> inside every app server (Instagram even put it inside the database). Both are valid:` },
    { type: 'table', head: ['', 'Separate ID service (Snowflake 2010)', 'Library in every app server'], rows: [
      ['Latency', 'One network call (~1-2 ms)', 'Microseconds, no network'],
      ['Machine IDs', 'Only ID servers need them (few, stable)', 'Every app server needs one (many, coming and going with autoscaling)'],
      ['Clock problems', 'Watch a few machines', 'Clocks of hundreds of machines'],
      ['Languages', 'One implementation, everyone uses it', 'Write it again in every language'],
      ['Failure', 'Service down = no IDs (so run many copies)', 'If the app is alive, so are IDs'],
    ]},
    { type: 'p', html: `For xyz.com we build a service, in two data centers. Play it and see. (Twitter's post does not explain in detail who gives out machine IDs; the README says "configured machine id". In the industry this is usually given by config, or as a lease from a coordination store like ZooKeeper/etcd, as shown here.)` },
    { type: 'callout', tone: 'term', title: 'Worker registry and lease', html: `<strong>What it is:</strong> <em>ZooKeeper</em> or <em>etcd</em> is a small, very reliable store where servers can write "this is mine" to each other (details in the <a href="#/coordination">Coordination</a> lesson). A <em>lease</em> = something rented: "worker number 2 is mine for the next 30 seconds"; the server keeps renewing it.<br><strong>Why we need it:</strong> two ID servers must never get the same machine number, or they could make the same ID in the same millisecond.<br><strong>Without it:</strong> config would be written by hand; one mistake (the same number on two servers) = duplicate IDs, the most dangerous bug of all.` },
    { type: 'flow', height: 340, title: 'ID service, two data centers',
      nodes: [
        { id: 'svc', label: 'Post service', sub: 'needs IDs', x: 90, y: 170, w: 140, kind: 'server', info: 'What it is: any xyz.com service that needs an ID for a new post/message. Its client library has a list of ID servers, so if one fails it can try another.' },
        { id: 'w1', label: 'ID server', sub: 'dc 1, worker 1', x: 340, y: 60, w: 150, kind: 'server', info: 'What it is: a Snowflake-like server that makes IDs. Machine bits = 5 bits datacenter (1) + 5 bits worker (1). It talks to no other ID server, so it is fast.' },
        { id: 'w2', label: 'ID server', sub: 'dc 1, worker 2', x: 340, y: 170, w: 150, kind: 'server', info: 'What it is: a second ID server in the same data center, but with a different worker number. So even with the same millisecond and the same sequence, the ID is different.' },
        { id: 'w3', label: 'ID server', sub: 'dc 2, worker 1', x: 340, y: 280, w: 150, kind: 'server', info: 'What it is: an ID server in the other data center. Worker number 1 is used again, but the datacenter bits are different (2), so the ID is still unique.' },
        { id: 'cfg', label: 'Worker registry', sub: 'etcd / ZooKeeper', x: 600, y: 170, w: 170, kind: 'net', info: 'What it is: a coordination store like etcd/ZooKeeper. It is only used at startup: each ID server takes its (datacenter, worker) number here as a lease, so two servers never get the same number. There is no need to come here for every ID.' },
      ],
      edges: [{ a: 'svc', b: 'w1' }, { a: 'svc', b: 'w2' }, { a: 'svc', b: 'w3' }, { a: 'w1', b: 'cfg', dashed: true }, { a: 'w2', b: 'cfg', dashed: true }, { a: 'w3', b: 'cfg', dashed: true }],
      scenarios: [
        { name: 'Normal', steps: [
          { title: 'Startup: take a number', parallel: true, go: ['w1>cfg', 'res:cfg>w1', 'w2>cfg', 'res:cfg>w2', 'w3>cfg', 'res:cfg>w3'], text: 'Each ID server took its number as a lease. As long as the server is alive and renews the lease, the number is its own.' },
          { title: 'Ask for an ID', go: ['svc>w2', 'res:w2>svc'], text: 'The post service called any ID server. The server joined its clock, its number and the sequence to make the ID. No other server was involved.', msg: 'next_id() → 2106693309475987456\n= time (from Twitter epoch) | dc 1 | worker 2 | seq 0' },
          { title: 'Batch', go: ['svc>w1', 'res:w1>svc'], text: 'To save network calls, the client can ask for 100 IDs at once and keep them in memory. Price: the time inside these IDs is a little old, so the order becomes even more "roughly".', msg: 'next_ids(100) → [..100 IDs..]' },
        ]},
        { name: 'One server died', steps: [
          { title: 'Worker 2 crash', set: { w2: { state: 'down', sub: 'DOWN' } }, go: ['svc>w2', 'bad:w2>svc'], text: 'The call fails or times out.' },
          { title: 'Get it from another', go: ['svc>w1', 'res:w1>svc'], text: 'The client library tried the next server in the list. Because there is no coordination between servers, any server can do any request. This is the benefit of an "uncoordinated" design.' },
          { title: 'Lease ends', after: { cfg: { sub: 'dc1/w2 free' } }, focus: ['cfg'], text: 'Worker 2\'s lease expired. A new server should take this number only after the time of the old server\'s last ID has passed, or there is a risk of a clash (so wait a little after the lease expires).' },
        ]},
        { name: 'Data center lost', steps: [
          { title: 'dc 1 offline', set: { w1: { state: 'down', sub: 'dc 1 DOWN' }, w2: { state: 'down', sub: 'dc 1 DOWN' } }, focus: ['w1', 'w2'], text: 'All of data center 1 was cut off from the network.' },
          { title: 'dc 2 keeps going', go: ['svc>w3', 'res:w3>svc'], text: 'The dc 2 server kept giving IDs. The datacenter bits are different, so even when dc 1 comes back, no ID will clash. No "global" decision was ever needed.' },
        ]},
        { name: 'Clock goes back', steps: [
          { title: 'NTP moved the clock back 3 ms', set: { w3: { state: 'warn', sub: 'clock < last_ts' } }, focus: ['w3'], text: 'NTP (Network Time Protocol: the service that keeps a server\'s clock in line with the correct clock on the internet) moved the clock back a little. Now the clock is behind the time of the last ID, so a new ID could be smaller than an old one, or a duplicate. The Snowflake README says that in this case the generator stops giving IDs until the clock moves past the time of the last ID.' },
          { title: 'The client moves to another server', go: ['svc>w3', 'bad:w3>svc', 'svc>w1', 'res:w1>svc'], set: { w1: { state: '', sub: 'dc 1, worker 1' } }, text: 'w3 refused (error), so the client got an ID from another server. Monitoring: an alert on "clock went backwards" errors. Details in the clock skew diagram of the <a href="#/unique-ids">Unique IDs</a> lesson.' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "Snowflake IDs are strictly sorted"', html: `No. The clocks of different machines are slightly different, and within the same millisecond the machine bits decide the order, not the time. Twitter itself said "roughly sortable". If you need a strict order (like the messages of one chat), you need one sequence inside one partition; global IDs do not give that guarantee.` },

    { type: 'h2', text: 'Part 2: Dynamo-style key-value store' },
    { type: 'p', html: `Amazon's 2007 Dynamo paper starts from one problem: the <strong>shopping cart</strong>. If a customer presses "add to cart" and gets "this cannot be done right now", Amazon directly loses money and trust. The paper says the Shopping Cart Service handled tens of millions of requests on a busy day. The requirement: the store must <strong>always be writeable</strong>, even when disks fail, the network breaks, or a whole data center goes away.` },
    { type: 'callout', tone: 'term', title: 'Key-value (KV) store', html: `<strong>What it is:</strong> the simplest database: give a <strong>key</strong> (like <code>cart:42</code>), get its <strong>value</strong> (like the items in the cart). Like a giant dictionary. No table joins, no complex queries. The store does not care what is inside the value (for Dynamo, a value is just a pile of bytes, usually under 1 MB).<br><strong>Why we need it:</strong> data like carts, sessions and user settings is always looked up by key only. For such a simple job, the store can be made very big and very fast.<br><strong>Without it:</strong> we would run this on a normal SQL database, which is hard to grow beyond one machine, and when that machine fails, "add to cart" stops.` },
    { type: 'h3', text: 'Requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• <code>get(key)</code><br>• <code>put(key, value)</code><br>• Access only by primary key; work inside one key only<br><br><strong>Out of scope:</strong> joins, range queries, multi-key transactions` },
      right: { title: 'Non-functional (Dynamo paper)', html: `• Always writeable, even when some nodes are dead<br>• Latency is measured at the 99.9th percentile (the paper's example: 99.9% of requests within 300 ms at a peak of 500 requests/s)<br>• <strong>Incremental scalability</strong>: keep adding nodes one by one<br>• <strong>Symmetry</strong> and decentralization: every node is equal, no master` },
    },
    { type: 'callout', tone: 'term', title: '99.9th percentile (p99.9)', html: `<strong>What it is:</strong> line up 1,000 requests by time taken, from fastest to slowest. The time taken by the 999th request is the p99.9.<br><strong>Why we need it:</strong> the average can look good while some users wait a long time. Amazon chose p99.9 instead of the average so that <strong>almost every</strong> customer has a good experience, not just the "typical" one.<br><strong>Without it:</strong> we would be happy seeing "average 20 ms", while one customer in a thousand waits 3 seconds (and often those are the biggest buyers, with the biggest carts).` },
    { type: 'h3', text: 'API' },
    { type: 'code', text: `
get(key)                  →  [ (value, context), ... ]   // more than one version can come back!
put(key, context, value)  →  ok

the key is hashed with MD5 into a 128-bit number → a position on the ring
context = version information (vector clock); the client sends it back` },
    { type: 'p', html: `Two words: a <strong>hash</strong> (like MD5) is a function that turns any text into a big, random-looking number; the same text always gives the same number. This spreads keys evenly across machines. The <strong>context</strong> is a small tag that says "which version you read"; the client sends it back with the next put (we will understand it with vector clocks).` },
    { type: 'p', html: `Notice: <code>get</code> can return <strong>several values</strong>. Normal databases do not do this. It is Dynamo's strangest and most important decision: when two versions clash, the store does not throw one away by itself; it gives both to the client (the application). We will see why.` },
    { type: 'h3', text: 'One tool for each problem' },
    { type: 'p', html: `One table in the Dynamo paper is a map of the whole design. Each row is a problem that comes from "no master, always writeable":` },
    { type: 'table', head: ['Problem', 'Technique', 'Benefit'], rows: [
      ['Splitting data across nodes', 'Consistent hashing (+ virtual nodes)', 'When a node joins or leaves, only a little data moves'],
      ['High availability for writes', 'Vector clocks, reconciliation on read', 'A write is never refused; versions are sorted out later'],
      ['Temporary failures', 'Sloppy quorum + hinted handoff', 'Reads/writes work even when some replicas are down'],
      ['Recovering from permanent failures', 'Anti-entropy with Merkle trees', 'Replicas sync in the background, sending little data'],
      ['Membership and failure detection', 'Gossip protocol', 'No central registry; every node is equal'],
    ]},
    { type: 'p', html: `These names will look strange for now, do not worry. Now one by one. Each comes first as a problem, then its tool, in plain words. Along the way we will see how two of today's open-source Dynamo-style stores, <strong>Cassandra</strong> and <strong>Riak</strong>, do it (from their official docs).` },

    { type: 'h3', text: '1. Where does data live: consistent hashing + vnodes' },
    { type: 'p', html: `Problem: there are TBs of data, which do not fit on one machine. We must split it across many machines (nodes). The simple way is <code>hash(key) % N</code> (N = number of machines), but adding one node changes N and almost every key changes place: a huge data move. Solution: <a href="#/consistent-hashing">consistent hashing</a>.` },
    { type: 'callout', tone: 'term', title: 'Consistent hashing ring and coordinator', html: `<strong>What it is:</strong> think of all possible hash numbers as a round clock (a ring). Each node sits at some place on the ring. A key's hash also gives a place on the ring. From there, walk <strong>clockwise</strong>: the first node you meet owns that key; it is the <strong>coordinator</strong> (the node that handles reads/writes for this key).<br><strong>Why we need it:</strong> when a new node joins, only the keys next to it move; everything else stays.<br><strong>Without it:</strong> with <code>% N</code>, adding one machine would copy almost all data from one machine to another, for weeks.` },
    { type: 'callout', tone: 'term', title: 'Virtual node (vnode)', html: `<strong>What it is:</strong> a physical machine sits not at one place on the ring, but at <strong>many places</strong>. Each place is a "token" or virtual node. 4 machines × 8 vnodes = 32 marks on the ring.<br><strong>Why we need it:</strong> with only one place, one machine gets a big slice of the ring and another a small one. And if a machine fails, all its load falls on just the next node. Many small slices = even load, and the load of a failure is shared by everyone.<br><strong>Without it:</strong> one machine would handle 40% of the data and another 10%, and one failure would drown the next node.` },
    { type: 'p', html: `The Dynamo paper lists three benefits of vnodes: when a node fails, its load is shared evenly by all the others; when a new node joins, it takes a little load from everyone; and a bigger machine can be given more vnodes (machines of different sizes can run together). Today's systems: the <strong>Riak</strong> docs say Riak takes a 160-bit hash of each bucket/key and splits the ring into fixed partitions (default <code>ring_size</code> 64), each owned by one vnode. The <strong>Cassandra</strong> docs say that in 2.x each node had 256 random tokens by default; from 3.x a new allocator splits the ring evenly with far fewer tokens, because too many tokens made jobs like repair slow.` },
    { type: 'callout', tone: 'term', title: 'Preference list', html: `<strong>What it is:</strong> where the <strong>N</strong> copies of a key will live (N = number of copies; usually 3): the coordinator, then the next N-1 nodes clockwise on the ring. This list is called the <strong>preference list</strong>. Because of vnodes, the next two positions may belong to the same physical machine, so Dynamo <strong>skips</strong> such positions while building the list, so that the N copies are on N <em>different</em> machines. The paper says the list is also spread across data centers, so data survives even if a whole data center fails.<br><strong>Why we need it:</strong> a machine's disk can die at any time; with data on three different machines, it survives.<br><strong>Without it:</strong> all three "copies" could sit on three vnodes of one machine, and one machine failure would lose all three.` },
    { type: 'p', html: `Play it yourself: change machines and vnodes, pick a key, and take a machine down. The ring here goes from 0 to 359 (a real ring goes up to 2<sup>128</sup> or 2<sup>160</sup>; the idea is the same):` },
    { type: 'custom', render(el) {
      const COL = ['var(--accent)', 'var(--violet)', 'var(--green)', 'var(--amber)', 'var(--red)', 'var(--ink-2)'];
      const KEYS = ['cart:42', 'cart:7', 'user:riya', 'video:99'];
      const NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
      el.innerHTML = `<div class="row2">
          <div><label>Physical machines: <strong class="rg-mv"></strong></label><input class="rg-m" type="range" min="3" max="6" step="1" value="4"></div>
          <div><label>Vnodes per machine: <strong class="rg-vv"></strong></label><input class="rg-v" type="range" min="0" max="5" step="1" value="0"></div>
        </div>
        <div style="font-size:13px;color:var(--ink-2);margin-top:6px">Key:</div><div class="rg-k" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="font-size:13px;color:var(--ink-2);margin-top:6px">Down machine (click to toggle):</div><div class="rg-d" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <svg class="rg-svg" viewBox="0 0 300 300" style="width:100%;max-width:300px;height:auto;display:block;margin:10px auto" role="img" aria-label="Consistent hashing ring"></svg>
        <div class="stats">
          <div class="stat"><span>Hash of the key</span><strong class="rg-h"></strong></div>
          <div class="stat"><span>Preference list (N=3)</span><strong class="rg-p"></strong></div>
          <div class="stat"><span>Largest / smallest share</span><strong class="rg-l"></strong></div>
        </div>
        <div class="calc-note rg-note"></div>`;
      const q = s => el.querySelector(s);
      let key = KEYS[0]; const down = new Set();
      const fnv = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0); };
      const chips = (box, list, isOn, click) => { box.innerHTML = ''; list.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (isOn(v) ? ' on' : ''); b.textContent = v; b.onclick = () => { click(v); upd(); }; box.appendChild(b); }); };
      const upd = () => {
        const M = +q('.rg-m').value, V = Math.pow(2, +q('.rg-v').value);
        q('.rg-mv').textContent = M; q('.rg-vv').textContent = V;
        [...down].forEach(d => { if (NAMES.indexOf(d) >= M) down.delete(d); });
        chips(q('.rg-k'), KEYS, k => k === key, k => { key = k; });
        chips(q('.rg-d'), NAMES.slice(0, M), n => down.has(n), n => { down.has(n) ? down.delete(n) : down.add(n); });
        const toks = [];
        for (let m = 0; m < M; m++) for (let v = 0; v < V; v++) toks.push({ m, pos: fnv('x' + NAMES[m] + '#' + v) % 3600 / 10 });
        toks.sort((a, b) => a.pos - b.pos || a.m - b.m);
        const share = new Array(M).fill(0);
        toks.forEach((t, i) => { const prev = toks[(i - 1 + toks.length) % toks.length].pos; share[t.m] += ((t.pos - prev + 360) % 360) || (toks.length === 1 ? 360 : 0); });
        const h = fnv(key) % 3600 / 10;
        let start = toks.findIndex(t => t.pos >= h); if (start < 0) start = 0;
        const pref = [], skipped = [], hinted = [];
        for (let i = 0; i < toks.length && pref.length < 3; i++) {
          const t = toks[(start + i) % toks.length];
          if (pref.some(p => p.m === t.m) || hinted.some(p => p.m === t.m)) { skipped.push(t); continue; }
          if (down.has(NAMES[t.m])) { hinted.push(t); continue; }
          pref.push(t);
        }
        const cx = 150, cy = 150, R = 110;
        const pt = (deg, r) => [cx + r * Math.sin(deg * Math.PI / 180), cy - r * Math.cos(deg * Math.PI / 180)];
        let svg = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--line-2)" stroke-width="2"/>`;
        toks.forEach(t => { const [x, y] = pt(t.pos, R); const isP = pref.includes(t); const r0 = V >= 16 ? 3.5 : 6; svg += `<circle cx="${x}" cy="${y}" r="${isP ? 9 : r0}" fill="${down.has(NAMES[t.m]) ? 'var(--surface-2)' : COL[t.m]}" stroke="${isP ? 'var(--ink)' : 'var(--bg)'}" stroke-width="${isP ? 2.5 : 1}"/>`; if (V > 4 && !isP) return; const [lx, ly] = pt(t.pos, R + 18); svg += `<text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="11" fill="var(--ink-2)" font-family="var(--f-mono)">${NAMES[t.m]}</text>`; });
        const [kx, ky] = pt(h, R - 26); const [kx2, ky2] = pt(h, R - 6);
        svg += `<line x1="${kx}" y1="${ky}" x2="${kx2}" y2="${ky2}" stroke="var(--ink)" stroke-width="2"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="12" fill="var(--ink)" font-family="var(--f-mono)">${key}</text><text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="11" fill="var(--ink-2)" font-family="var(--f-mono)">hash = ${h}</text>`;
        q('.rg-svg').innerHTML = svg;
        q('.rg-h').textContent = h;
        q('.rg-p').textContent = pref.map(p => NAMES[p.m]).join(', ') + (pref.length < 3 ? ' (only ' + pref.length + ')' : '');
        const mx = Math.max(...share), mn = Math.min(...share);
        q('.rg-l').textContent = Math.round(mx / 3.6) + '% / ' + Math.round(mn / 3.6) + '%';
        const parts = [];
        if (!pref.length) { q('.rg-note').textContent = 'All machines are down: nobody can keep a copy. In a real cluster this many rarely fail together; that is why copies are kept in different racks and data centers.'; return; }
        parts.push(`Walking clockwise from hash ${h}: the first healthy machine, ${NAMES[pref[0].m]}, is the coordinator.`);
        if (skipped.length) parts.push(`${skipped.length} token(s) were skipped because that machine was already in the list (three copies on three different machines).`);
        if (hinted.length) parts.push(`${hinted.map(t => NAMES[t.m]).join(', ')} is down, so the next healthy machine joined the list: it will keep the copy with a "hint" (sloppy quorum, coming up).`);
        const ideal = Math.round(100 / M);
        parts.push(V === 1 ? `Only 1 token per machine: very uneven shares (${Math.round(mx / 3.6)}% vs ${Math.round(mn / 3.6)}%, while an even split would be ${ideal}%). Add vnodes.` : `${V} vnodes per machine: shares between ${Math.round(mx / 3.6)}% and ${Math.round(mn / 3.6)}% (even = ${ideal}%).` + (V < 32 ? ' Random tokens need to be many before they become even.' : ' Now almost even.'));
        q('.rg-note').textContent = parts.join(' ');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the default (4 machines, 1 vnode each), one machine holds ~58% of the ring and one holds only ~5%. With 4 vnodes it is 34% vs 14%, and with 16 vnodes 27% vs 24% (even = 25%). Places are chosen at random, so even with more vnodes it sometimes moves up and down a little (at 32: 30% vs 20%); evenness needs many tokens. That is why Cassandra 2.x used 256 by default. Take a machine down: the next healthy machine joins the preference list. This is the "sloppy quorum", which comes in the next part.` },
    { type: 'h3', text: '2. Copies and quorum: N, R, W' },
    { type: 'callout', tone: 'term', title: 'N, R, W and quorum', html: `<strong>What it is:</strong> <strong>N</strong> = how many copies (replicas) of each key. <strong>W</strong> = a write counts as "successful" when at least W copies say "written". <strong>R</strong> = a read is done when at least R copies have answered. A <em>quorum</em> = enough votes to make a decision.<br><strong>Why we need it:</strong> waiting for all N copies is slow (you wait for the slowest machine), and if even one copy is down, nothing works. Keeping W and R small gives speed and availability. If <code>R + W &gt; N</code>, the group you read from and the group you wrote to share at least one copy, so a read sees the latest write.<br><strong>Without it:</strong> either wait for all copies every time (slow; one failure = an error), or trust one copy (old data or data loss).` },
    { type: 'p', html: `The full story of quorums and a big lab are in the <a href="#/consistency">Consistency models and quorums</a> lesson. The paper says many Dynamo instances ran <strong>(N, R, W) = (3, 2, 2)</strong>. Latency is set by the slowest of the R (or W) nodes, so R and W are usually kept smaller than N. A small lab here:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>N (copies): <strong class="qm-nv"></strong></label><input class="qm-n" type="range" min="1" max="5" step="1" value="3"></div>
          <div><label>W (yes votes for a write): <strong class="qm-wv"></strong></label><input class="qm-w" type="range" min="1" max="5" step="1" value="2"></div>
          <div><label>R (answers for a read): <strong class="qm-rv"></strong></label><input class="qm-r" type="range" min="1" max="5" step="1" value="2"></div>
          <div><label>Copies down: <strong class="qm-dv"></strong></label><input class="qm-d" type="range" min="0" max="5" step="1" value="0"></div>
        </div>
        <div class="qm-box" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div class="stats">
          <div class="stat"><span>Can it write?</span><strong class="qm-wo"></strong></div>
          <div class="stat"><span>Can it read?</span><strong class="qm-ro"></strong></div>
          <div class="stat"><span>R + W &gt; N? (overlap)</span><strong class="qm-ov"></strong></div>
          <div class="stat"><span>Copies that can fail (write / read)</span><strong class="qm-tol"></strong></div>
        </div>
        <div class="calc-note qm-note"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const N = +q('.qm-n').value;
        ['.qm-w', '.qm-r', '.qm-d'].forEach(c => { const i = q(c); i.max = c === '.qm-d' ? N : N; if (+i.value > N) i.value = N; });
        const W = +q('.qm-w').value, R = +q('.qm-r').value, D = +q('.qm-d').value, up = N - D;
        q('.qm-nv').textContent = N; q('.qm-wv').textContent = W; q('.qm-rv').textContent = R; q('.qm-dv').textContent = D;
        const ov = Math.max(0, R + W - N);
        let box = '';
        for (let i = 0; i < N; i++) {
          const isDown = i >= up, inW = i < W, inR = i >= N - R;
          box += `<div style="min-width:64px;padding:8px;border-radius:var(--r-sm);border:2px solid ${isDown ? 'var(--red)' : 'var(--line-2)'};background:${isDown ? 'var(--surface-2)' : 'var(--surface)'};text-align:center;font:13px var(--f-mono)">copy ${i + 1}<br>${isDown ? '<span style="color:var(--red)">down</span>' : (inW ? '<span style="color:var(--accent)">W</span> ' : '') + (inR ? '<span style="color:var(--green)">R</span>' : '') || '-'}</div>`;
        }
        q('.qm-box').innerHTML = box;
        const wo = up >= W, ro = up >= R;
        const set = (c, ok, t) => { const e = q(c); e.textContent = t; e.style.color = ok ? 'var(--green)' : 'var(--red)'; };
        set('.qm-wo', wo, wo ? 'yes' : 'no (strict quorum)');
        set('.qm-ro', ro, ro ? 'yes' : 'no');
        set('.qm-ov', R + W > N, R + W > N ? 'yes, ' + ov + ' shared' : 'no');
        q('.qm-tol').textContent = (N - W) + ' / ' + (N - R);
        const notes = [];
        notes.push(R + W > N ? `R + W = ${R + W} > ${N}: the ${W} write copies and the ${R} read copies share at least ${ov} (the box marked both W and R). The read will get the latest version (if all are healthy and the quorum is strict).` : `R + W = ${R + W}, not more than N = ${N}: a read may come from copies that the new write has not reached yet. You can get old data.`);
        if (!wo) notes.push(`Only ${up} of ${N} copies alive, W = ${W} needed: with a strict quorum the write is refused. Here Dynamo uses a sloppy quorum and puts the copy on the next healthy node on the ring (in the flow below).`);
        if (W === N) notes.push('W = N: one copy down = writes stop. The opposite of "always writeable".');
        if (W === 1) notes.push('W = 1: fast, but if that one copy dies right after the write, the data is lost.');
        q('.qm-note').textContent = notes.join(' ');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With (3, 2, 2): even with one copy down, both reads and writes work, and R + W = 4 &gt; 3. Set D = 2: with a strict quorum both stop. Today's systems offer the same knobs. <strong>Riak</strong> docs: each request can choose N, R and W, plus an extra <strong>DW</strong> ("durable write": how many copies have safely written it to disk). <strong>Cassandra</strong> docs: a consistency level per query, like <code>ONE</code>, <code>QUORUM</code> (a majority, i.e. N/2 + 1), <code>ALL</code>, and for several data centers <code>LOCAL_QUORUM</code> (a majority of the local data center only, so you do not wait for a far-away data center).` },
    { type: 'p', html: `Three new tools appear in the flow below. First, in plain words:` },
    { type: 'callout', tone: 'term', title: 'Read repair', html: `<strong>What it is:</strong> during a read, the coordinator gets answers from R copies. If one copy turns out to be old, it sends that copy the new version right away. "Fixing while reading."<br><strong>Why we need it:</strong> since W &lt; N, some copies stay a little behind for a while. Keys that people read get fixed by themselves.<br><strong>Without it:</strong> a copy that fell behind would stay behind, until some other background process ran.` },
    { type: 'callout', tone: 'term', title: 'Sloppy quorum', html: `<strong>What it is:</strong> in a "strict" quorum, only the key's own N copies (the preference list) can vote. In a <em>sloppy</em> quorum, the <strong>first N healthy</strong> nodes of the list vote: if one is down, the next living node on the ring takes its place.<br><strong>Why we need it:</strong> Dynamo's promise is "always writeable". Even with two copies down, the cart must still update.<br><strong>Without it:</strong> if W healthy copies cannot be found, the write is refused: the customer sees "this cannot be done right now".` },
    { type: 'callout', tone: 'term', title: 'Hinted handoff', html: `<strong>What it is:</strong> the node that keeps a copy in someone else's place also keeps a "hint" (a note): "this really belongs to C". As soon as C is back, it hands the copy to C and deletes its own.<br><strong>Why we need it:</strong> with a sloppy quorum, copies went to the wrong place. The hint sends them back to their real home.<br><strong>Without it:</strong> when C came back, it would be missing every write from its downtime. <strong>Cassandra</strong> docs: hints are kept for up to <strong>3 hours</strong> of downtime by default (<code>max_hint_window</code>); if it is down longer, you need repair (Merkle trees, coming up).` },
    { type: 'p', html: `Now one key, preference list <strong>A, B, C</strong> (N = 3), and D, the next node on the ring. Play all the scenarios:` },
    { type: 'flow', height: 340, title: 'The life of one key (N=3, R=2, W=2)',
      nodes: [
        { id: 'c', label: 'Client', sub: 'cart service', x: 80, y: 170, w: 120, kind: 'client', info: 'What it is: the application that uses the store (like the xyz.com cart service). In Dynamo, the client library can find the coordinator itself, or a load balancer sends the request to any node, which forwards it.' },
        { id: 'a', label: 'Node A', sub: 'coordinator', x: 280, y: 170, w: 150, kind: 'data', info: 'What it is: this key\'s coordinator, the first node in the preference list. It creates the new version of a write (with a vector clock), saves it itself, and sends it to the other N-1. As soon as W answers arrive, it tells the client: success.' },
        { id: 'b', label: 'Node B', sub: 'replica', x: 530, y: 60, w: 150, kind: 'data', info: 'What it is: a storage node, second in this key\'s preference list. One copy lives here.' },
        { id: 'r', label: 'Node C', sub: 'replica', x: 530, y: 170, w: 150, kind: 'data', info: 'What it is: a storage node, third in the preference list. The third copy lives here. Sometimes slow, sometimes down.' },
        { id: 'd', label: 'Node D', sub: 'next on ring', x: 530, y: 280, w: 150, kind: 'data', info: 'What it is: the next storage node on the ring, not in the top 3 of this key\'s preference list. But when one of the top 3 is down, D keeps the copy in its place, with a "hint" saying who the real owner is.' },
      ],
      edges: [{ a: 'c', b: 'a' }, { a: 'a', b: 'b' }, { a: 'a', b: 'r' }, { a: 'a', b: 'd', id: 'ad', hidden: true }, { a: 'd', b: 'r', id: 'dr', hidden: true, dashed: true }],
      scenarios: [
        { name: 'put (W=2)', steps: [
          { title: 'A write arrives', go: 'c>a', text: 'An item was added to the cart.', msg: 'put("cart:42", ctx, [phone, cover])' },
          { title: 'A saves, sends to B and C', after: { a: { sub: 'v2 saved' } }, parallel: true, go: ['a>b', 'a>r'], text: 'The coordinator created the new version, wrote it locally, and sent it to both replicas.' },
          { title: 'B acks: W = 2 reached', go: 'res:b>a', after: { b: { sub: 'v2' }, r: { state: 'warn', sub: 'still v1 (slow)' } }, text: 'A (itself) + B = 2 acks. C is slow right now, so we do not wait for it. Success for the client.' },
          { title: 'OK to the client', go: 'res:a>c', text: 'With W = 2, the latency was safe from a slow node like C. v2 will reach C a little later.', msg: 'ok' },
        ]},
        { name: 'get (R=2) + read repair', steps: [
          { title: 'A read arrives', go: 'c>a', set: { b: { sub: 'v2' }, r: { state: 'warn', sub: 'v1 (old)' } }, text: 'The cart must be shown.', msg: 'get("cart:42")' },
          { title: 'Asked two replicas', parallel: true, go: ['a>b', 'a>r', 'res:b>a', 'res:r>a'], text: 'B gave v2, C gave v1. Using vector clocks, A sees that v2 came after v1 (v1 is old and can be thrown away).' },
          { title: 'New one to the client, C fixed', parallel: true, go: ['res:a>c', 'a>r'], after: { r: { state: 'ok', sub: 'v2 (repaired)' } }, text: 'The client gets v2. At the same time, A sent v2 to C. This is <strong>read repair</strong>: a replica found behind during a read is fixed right there.', msg: 'C ← v2   (read repair)' },
        ]},
        { name: 'C down: sloppy quorum', steps: [
          { title: 'C goes down', set: { r: { state: 'down', sub: 'DOWN' } }, go: 'c>a', text: 'C is temporarily down (maintenance, or the network). With a strict quorum only A + B are left: W = 2 is still reached. But what if B is down too? Dynamo still does not stop the write.' },
          { title: 'Copy to D, with a hint', show: ['ad'], parallel: true, go: ['a>b', 'a>d'], after: { d: { state: 'warn', sub: 'hint: for C' } }, text: 'Dynamo\'s <strong>sloppy quorum</strong>: the first N <em>healthy</em> nodes of the preference list. D kept the copy in place of C, with a hint in the metadata: "this really belongs to C". D keeps it in a separate local store.' },
          { title: 'Write succeeds', parallel: true, go: ['res:b>a', 'res:d>a', 'res:a>c'], text: 'Three copies were still made (A, B, D). The customer never saw "the cart cannot be updated".' },
        ]},
        { name: 'C back: hinted handoff', steps: [
          { title: 'C is alive again', set: { r: { state: 'ok', sub: 'back, v1' }, d: { state: 'warn', sub: 'hint: for C' } }, show: ['dr'], focus: ['r'], text: 'D keeps scanning its hinted store and checking C\'s health.' },
          { title: 'D hands the copy back', go: 'evt:d>r', after: { r: { sub: 'v2' }, d: { state: '', sub: 'next on ring' } }, text: '<strong>Hinted handoff</strong>: D delivered C\'s copy to C, and after the transfer succeeded it deleted its local copy. Total copies are 3 again, in the right places.' },
          { title: 'When it does not work', focus: ['d'], text: 'The paper itself says: hinted handoff works well when failures are short and membership changes rarely. If D also dies before C comes back, the hint is lost. For that, the next tool: anti-entropy with Merkle trees.' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "even with a sloppy quorum, R + W > N = latest read"', html: `No. Say the network splits in two: on one side a write went to A and D (B and C could not be seen from that side), and on the other side another client's read went to B and C. R + W = 4 &gt; 3, yet the two sets share no node, and the read returned old data. Dynamo paid this price on purpose for availability; that is why it also needed a way to sort out versions: vector clocks.` },
    { type: 'h3', text: '3. Two versions clash: vector clocks' },
    { type: 'p', html: `Problem: the network broke, and two copies of the cart got different changes. Which one is right? "The one with the bigger timestamp wins" (<strong>last write wins</strong>) is easy, but an "add to cart" could silently disappear. Amazon could not accept that. They needed to know whether one of the two versions <strong>came after the other</strong>, or whether they are <strong>separate branches</strong>.` },
    { type: 'callout', tone: 'term', title: 'Vector clock', html: `<strong>What it is:</strong> a small list with each version: <code>[(node, counter), ...]</code>, like "Sx wrote 2 times, Sy wrote 1 time". The node that handles a write adds +1 to its own counter in the list. This is not clock time, just a count of "who changed it how many times". Compare two lists: if all counters of one are ≤ the other's, it is older (you can throw it away). If some counters are bigger in one and some in the other, both are <strong>concurrent</strong>: neither saw the other.<br><strong>Why we need it:</strong> you know for sure whether one version came <em>after</em> the other or whether they are two separate branches. If they are concurrent, the store keeps both and gives both to the client on read, so no change is silently lost.<br><strong>Without it:</strong> we would only look at timestamps (last write wins), and because server clocks differ slightly, an "add to cart" could silently disappear.` },
    { type: 'p', html: `The paper's example, in our own words (Sx, Sy, Sz are three nodes):` },
    { type: 'ascii', text: `
D1 [Sx:1]                 a client wrote it, Sx handled it
 │
D2 [Sx:2]                 the same client updated it, Sx again. D2 > D1
 ├──────────────────────┐
D3 [Sx:2, Sy:1]          D4 [Sx:2, Sz:1]
 (update, written by Sy)  (another client read D2 and updated it, written by Sz)
 │                        │
 └──── D3 and D4: concurrent! keep both ────┘
              │
   the client read both, merged them (cart = items of both), Sx wrote it
              │
D5 [Sx:3, Sy:1, Sz:1]     now D5 is the newest` },
    { type: 'custom', render(el) {
      const P = { D1: [1, 0, 0], D2: [2, 0, 0], D3: [2, 1, 0], D4: [2, 0, 1], D5: [3, 1, 1] };
      const N = ['Sx', 'Sy', 'Sz'];
      const row = (k) => `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0"><strong style="min-width:84px">Version ${k}</strong>` +
        N.map((n, i) => `<label style="display:flex;gap:4px;align-items:center;font:13px var(--f-mono)">${n}<input class="vc-${k}${i}" type="number" min="0" max="9" value="0" style="width:56px"></label>`).join('') + `</div>`;
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-2)">Pick versions from the paper (first click = P, second = Q), or change the numbers yourself:</div>
        <div class="vc-pre" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>${row('P')}${row('Q')}
        <div class="stats"><div class="stat"><span>P</span><strong class="vc-p"></strong></div><div class="stat"><span>Q</span><strong class="vc-q"></strong></div><div class="stat"><span>Relation</span><strong class="vc-rel"></strong></div></div>
        <div class="calc-note vc-note"></div>`;
      const q = s => el.querySelector(s);
      let turn = 0;
      const setV = (k, v) => v.forEach((x, i) => { q(`.vc-${k}${i}`).value = x; });
      const get = k => N.map((_, i) => Math.max(0, Math.min(9, parseInt(q(`.vc-${k}${i}`).value, 10) || 0)));
      const txt = v => '[' + v.map((x, i) => x ? `${N[i]}:${x}` : '').filter(Boolean).join(', ') + ']';
      const pre = q('.vc-pre');
      Object.keys(P).forEach(name => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = name + ' ' + txt(P[name]); b.onclick = () => { setV(turn ? 'Q' : 'P', P[name]); turn = 1 - turn; upd(); }; pre.appendChild(b); });
      const upd = () => {
        const a = get('P'), b = get('Q');
        const le = a.every((x, i) => x <= b[i]), ge = a.every((x, i) => x >= b[i]);
        q('.vc-p').textContent = txt(a); q('.vc-q').textContent = txt(b);
        let rel, note;
        if (le && ge) { rel = 'equal'; note = 'Both are the same version.'; }
        else if (le) { rel = 'Q is newer'; note = 'All of P\'s counters are smaller than or equal to Q\'s: Q was written after "seeing" P. P can be thrown away (the store does this itself: syntactic reconciliation).'; }
        else if (ge) { rel = 'P is newer'; note = 'All of Q\'s counters are smaller than or equal to P\'s: Q is old and can be thrown away.'; }
        else { rel = 'concurrent (conflict)'; note = 'Some counters are bigger in P, some in Q. Neither saw the other. The store keeps both and gives both to the client on read; the client merges them and writes a new version (semantic reconciliation).'; }
        const r = q('.vc-rel'); r.textContent = rel; r.style.color = rel.startsWith('concurrent') ? 'var(--red)' : 'var(--green)';
        q('.vc-note').textContent = note;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      setV('P', P.D3); setV('Q', P.D4); upd();
    }},
    { type: 'p', html: `How often does such a clash happen? The paper measured the shopping cart service for 24 hours: <strong>99.94%</strong> of requests saw exactly one version. Divergent versions were very rare, and the paper says they came less from failures and more from clients writing at the same time (concurrent writers). One more practical point: to stop a vector clock from growing too long, when the list has more pairs than a threshold (the paper's example: 10), the oldest pair is removed.` },
    { type: 'callout', tone: 'warn', title: 'Not every Dynamo-like store keeps vector clocks', html: `Cassandra took the ring, gossip, hinted handoff and Merkle-tree repair from Dynamo, but for versions it kept <strong>last-write-wins timestamps</strong> (Cassandra docs). It is simple, but with concurrent writes one silently loses. The paper also says some Amazon services chose "last write wins" themselves. It is a business decision: merge for a cart, LWW is fine for a profile photo.` },
    { type: 'p', html: `<strong>Riak</strong> followed Dynamo's path more closely. The Riak docs say: if a bucket has <code>allow_mult = true</code>, Riak keeps both values on concurrent writes; these are called <strong>siblings</strong>, and the app must sort them out (the docs recommend this setting). With <code>false</code>, one wins by timestamp. From 2.0, Riak recommends <strong>dotted version vectors</strong> (DVV) instead of vector clocks: each value carries a small mark saying "which update created it", so duplicate siblings can be recognised and removed (otherwise, when many clients write at once, a pile of siblings, a "sibling explosion", can build up).` },
    { type: 'h3', text: '4. Permanent failure: anti-entropy with Merkle trees' },
    { type: 'p', html: `Problem: hinted handoff is for short outages. If the node holding the hint dies itself, or a replica comes back after a week, it will be far behind. Read repair only fixes keys that someone reads. Who fixes the other keys? Replicas must be compared with each other in the background (<strong>anti-entropy</strong>). But comparing crores of keys one by one between two replicas means sending a lot of data.` },
    { type: 'callout', tone: 'term', title: 'Anti-entropy and Merkle tree', html: `<strong>What it is:</strong> <em>anti-entropy</em> = comparing two replicas in the background and fixing the differences. A <em>Merkle tree</em> = a tree of hashes. At the bottom (leaves), the hash of each key range (a hash = a short fingerprint of data). Above them, each node is the hash of its two children's hashes. At the top, one root hash. Same root on two replicas = all data is the same; if even one byte differs, the root changes. If there is a difference, go down only into the branches whose hashes differ.<br><strong>Why we need it:</strong> instead of sending crores of keys one by one, send just a few hashes and find the difference.<br><strong>Without it:</strong> either replicas would stay different forever (keys nobody reads never get read repair), or the whole data would have to be compared over the network.` },
    { type: 'image', src: 'assets/img/design-id-kv/hash-tree.png', alt: 'Diagram of a Merkle tree: four data blocks L1 to L4 at the bottom, the hash of each block above them, then pairs of hashes combined into Hash 0 and Hash 1, and the Top Hash at the very top', caption: 'Merkle (hash) tree: the hash of each data block at the bottom, two hashes combined into the hash above, and one "Top Hash" (root) at the top. If one byte of any block changes, every hash on that path and the root change too.', credit: { text: 'Azaghal (based on an illustration by David Göthberg), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Hash_Tree.svg', license: 'CC0' } },
    { type: 'p', html: `In Dynamo, each node keeps a separate Merkle tree for each of its key ranges (the range of one vnode). Two replicas exchange the roots of the ranges they share, and go down only into the branches that differ. See for yourself: "break" some ranges of replica B and count how many hashes were compared.` },
    { type: 'custom', render(el) {
      const LEAVES = 16;
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-2)">Which ranges of replica B are behind? (click to toggle)</div>
        <div class="mk-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div>
        <svg class="mk-svg" viewBox="0 0 320 136" style="width:100%;max-width:560px;height:auto;margin-top:10px" role="img" aria-label="Merkle tree comparison"></svg>
        <div style="font-size:13px;color:var(--ink-2)"><span style="color:var(--red)">●</span> hash differs (go down) &nbsp; <span style="color:var(--green)">●</span> hash same (stop here) &nbsp; <span style="color:var(--ink-3)">●</span> no need to look at all</div>
        <div class="stats">
          <div class="stat"><span>Hash comparisons</span><strong class="mk-c"></strong></div>
          <div class="stat"><span>Ranges to sync</span><strong class="mk-r"></strong></div>
          <div class="stat"><span>Without a tree: leaf hashes</span><strong class="mk-n"></strong></div>
        </div>
        <div class="calc-note mk-note"></div>`;
      const q = s => el.querySelector(s);
      const h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16).padStart(8, '0'); };
      const bad = new Set([5]);
      const build = side => { const lv = [[]]; for (let i = 0; i < LEAVES; i++) lv[0].push(h(`range${i}:v${side === 'B' && bad.has(i) ? 1 : 2}`)); while (lv[lv.length - 1].length > 1) { const p = lv[lv.length - 1], n = []; for (let i = 0; i < p.length; i += 2) n.push(h(p[i] + p[i + 1])); lv.push(n); } return lv.reverse(); };
      const upd = () => {
        const chips = q('.mk-chips'); chips.innerHTML = '';
        for (let i = 0; i < LEAVES; i++) { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (bad.has(i) ? ' on' : ''); b.textContent = 'r' + i; b.onclick = () => { bad.has(i) ? bad.delete(i) : bad.add(i); upd(); }; chips.appendChild(b); }
        const A = build('A'), B = build('B');
        const state = A.map(l => l.map(() => 'skip'));
        let comps = 0; const ranges = [];
        const walk = (d, i) => { comps++; const same = A[d][i] === B[d][i]; state[d][i] = same ? 'same' : 'diff'; if (same) return; if (d === A.length - 1) { ranges.push(i); return; } walk(d + 1, 2 * i); walk(d + 1, 2 * i + 1); };
        walk(0, 0);
        let svg = '';
        const pos = (d, i) => { const n = Math.pow(2, d), gap = 300 / n; return [10 + gap * (i + 0.5), 14 + d * 30]; };
        for (let d = 1; d < A.length; d++) for (let i = 0; i < A[d].length; i++) { const [x, y] = pos(d, i), [px, py] = pos(d - 1, i >> 1); svg += `<line x1="${px}" y1="${py}" x2="${x}" y2="${y}" stroke="var(--line-2)" stroke-width="1"/>`; }
        const col = s => s === 'same' ? 'var(--green)' : s === 'diff' ? 'var(--red)' : 'var(--surface-2)';
        for (let d = 0; d < A.length; d++) for (let i = 0; i < A[d].length; i++) { const [x, y] = pos(d, i), r = d === A.length - 1 ? 6 : 8; svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col(state[d][i])}" stroke="var(--line-2)"/>`; }
        q('.mk-svg').innerHTML = svg;
        q('.mk-c').textContent = comps;
        q('.mk-r').textContent = ranges.length ? ranges.map(i => 'r' + i).join(', ') : 'none';
        q('.mk-n').textContent = LEAVES;
        q('.mk-note').textContent = !ranges.length ? 'Same root hash: one comparison showed that both replicas are exactly equal. This is the most common case, and the cheapest.' : `${ranges.length} range(s) differ: ${comps} hash comparisons, and only ${ranges.length} range(s) of data must be sent. In a real system each leaf covers thousands of keys, so the saving is many times bigger.` + (comps >= LEAVES ? ' Notice: when many ranges differ, the comparisons come close to the leaf count. The tree saves the most when the difference is small, which is the usual case.' : '');
      };
      upd();
    }},
    { type: 'p', html: `If one range is broken: the root (1) + two children at each level (4 levels × 2) = <strong>9 comparisons</strong>, instead of 16 leaf hashes. If all is fine, just 1. The bigger the trees, the bigger the saving. The paper also names a downside: when a node joins or leaves, many key ranges change and the trees must be rebuilt. So Dynamo later split the ring into <strong>fixed partitions of equal size</strong> (the paper's "strategy 3"), so the ranges stay stable.` },
    { type: 'p', html: `Today's systems: the <strong>Riak</strong> docs say its Active Anti-Entropy (AAE) keeps Merkle trees <strong>on disk</strong> (less memory, and no rebuild after a restart), updates the tree right away on every new write, and by default once a week deletes all trees and rebuilds them from the data, so that hidden disk damage (silent corruption) is also caught. <strong>Cassandra</strong> docs: read repair and hinted handoff are "best-effort"; for guaranteed eventual consistency the operator runs <em>repair</em>, where replicas build and exchange Merkle trees and sync the ranges that differ (for the full data or only some sub-ranges).` },
    { type: 'h3', text: '5. Who is alive, who is on the ring: gossip' },
    { type: 'p', html: `Problem: there is no master to tell everyone which nodes are on the ring and which node owns which range. Still, every node must know this, or it will send requests to the wrong place.` },
    { type: 'callout', tone: 'term', title: 'Gossip protocol', html: `<strong>What it is:</strong> like a rumour: every short while (like every second), each node talks to some <strong>random</strong> other node and both merge what they know (who is on the ring, who is alive, who holds which tokens). Like news reaching a whole class at school in just a few "rounds".<br><strong>Why we need it:</strong> there is no master, yet every node needs a map of the whole cluster, so it sends each request to the right node.<br><strong>Without it:</strong> we would need a central registry, which would itself become a SPOF and a bottleneck.` },
    { type: 'p', html: `How fast does a rumour spread? One node learns "a new node X joined the ring". In each round (say 1 second), everyone who knows tells a few random nodes. Simulator (seeded random, same result every time):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Nodes in the cluster: <strong class="gs-nv"></strong></label><input class="gs-n" type="range" min="10" max="2000" step="10" value="100"></div>
          <div><label>How many each node tells per round (fanout): <strong class="gs-fv"></strong></label><input class="gs-f" type="range" min="1" max="3" step="1" value="1"></div>
        </div>
        <svg class="gs-svg" viewBox="0 0 320 120" style="width:100%;max-width:560px;height:auto;margin-top:10px" role="img" aria-label="How many nodes know after each round"></svg>
        <div class="stats">
          <div class="stat"><span>Rounds until everyone knows</span><strong class="gs-r"></strong></div>
          <div class="stat"><span>Rounds until half know</span><strong class="gs-h"></strong></div>
          <div class="stat"><span>log2(nodes)</span><strong class="gs-l"></strong></div>
          <div class="stat"><span>Total messages</span><strong class="gs-m"></strong></div>
        </div>
        <div class="calc-note gs-note"></div>`;
      const q = s => el.querySelector(s);
      const sim = (n, f) => {
        let seed = 42 + n * 7 + f; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const know = new Uint8Array(n); know[0] = 1; let cnt = 1, rounds = 0, msgs = 0; const hist = [1];
        while (cnt < n && rounds < 200) {
          const now = []; for (let i = 0; i < n; i++) if (know[i]) now.push(i);
          now.forEach(i => { for (let k = 0; k < f; k++) { let j = Math.floor(rnd() * (n - 1)); if (j >= i) j++; msgs++; if (!know[j]) { know[j] = 2; } } });
          cnt = 0; for (let i = 0; i < n; i++) { if (know[i]) { know[i] = 1; cnt++; } }
          rounds++; hist.push(cnt);
        }
        return { rounds, msgs, hist };
      };
      const upd = () => {
        const n = +q('.gs-n').value, f = +q('.gs-f').value;
        q('.gs-nv').textContent = n; q('.gs-fv').textContent = f;
        const r = sim(n, f);
        const half = r.hist.findIndex(c => c >= n / 2);
        q('.gs-r').textContent = r.rounds; q('.gs-h').textContent = half; q('.gs-l').textContent = Math.log2(n).toFixed(1);
        q('.gs-m').textContent = r.msgs.toLocaleString('en-US');
        const bw = 300 / r.hist.length;
        q('.gs-svg').innerHTML = r.hist.map((c, i) => { const hgt = 90 * c / n; return `<rect x="${10 + i * bw}" y="${100 - hgt}" width="${Math.max(bw - 2, 1)}" height="${hgt}" fill="${c === n ? 'var(--green)' : 'var(--accent)'}"/>`; }).join('') + `<line x1="10" y1="100" x2="310" y2="100" stroke="var(--line-2)"/><text x="10" y="114" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">round 0</text><text x="310" y="114" text-anchor="end" font-size="9" fill="var(--ink-2)" font-family="var(--f-mono)">round ${r.rounds}</text>`;
        q('.gs-note').textContent = `${n} nodes, fanout ${f}: everyone knew within ${r.rounds} rounds. Slow at first (1, 2, 4...), very fast in the middle (the count roughly doubles each round), and slow again at the end (randomly reaching the last few nodes is hard). Make the nodes 10 times more: the rounds grow only a little. That is why gossip scales to thousands of nodes.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default (100 nodes, fanout 1): everyone knows within <strong>11 rounds</strong>. 1,000 nodes: 17 rounds; 2,000 nodes: 19. The nodes grew 10 times, the rounds grew only ~6 (it grows like a logarithm). With fanout 2, 1,000 nodes take 10 rounds. The <strong>Cassandra</strong> docs say every node, every second: increases its own "heartbeat" (I am alive) count, gossips with one random node, sometimes also tries an unreachable node, and gossips with a seed node if needed. Each node decides by itself who is "down", using a <strong>Phi Accrual failure detector</strong>: if a node's heartbeat stops increasing, the suspicion that it is down slowly grows, and past a limit it is considered down. <strong>Riak</strong> docs: when a node changes its share of the ring, it tells everyone by gossip, and nodes re-announce what they know from time to time so that a missed update still arrives.` },
    { type: 'steps', items: [
      { t: 'Adding a node: explicit', d: 'The paper says node outages at Amazon are often temporary, so a node going quiet is not taken to mean "it left the ring". An admin tells a node "add X to the ring / remove it" from the command line or a browser. That node writes the change to its persistent store.' },
      { t: 'Spreading by gossip', d: 'Every second, each node picks a random peer and the two merge their membership history. Tokens (which node sits where on the ring) also spread in these talks. So each node itself knows which node to go to for any key.' },
      { t: 'Seeds', d: 'If an admin added A and B separately, at first they do not know each other: the ring could split into two pieces. For this, some nodes are "seeds" that everyone knows (from static config or a config service). Everyone eventually meets a seed, so the pieces join up.' },
      { t: 'Failure detection: local', d: 'If B is not answering node A, A treats B as "down" for itself, uses other nodes in its place, and keeps checking B every so often. This is not a global decision; each node sees it from its own view. Permanent removal happens only with an explicit admin command.' },
    ]},
    { type: 'p', html: `When a new node X joins the ring, it becomes the owner of some ranges, and the nodes that held those ranges transfer the keys to X (in the paper with a confirmation round, so there is no duplicate transfer). Because of vnodes, this load comes a little at a time from many nodes.` },
    { type: 'h3', text: '6. Inside one node: LSM storage' },
    { type: 'p', html: `So far we talked about what happens between nodes. How does one node keep data on its own disk? The paper says each storage node has three parts: request coordination, membership + failure detection, and a local <strong>storage engine</strong> (the part that writes data to and reads it from the disk). In Dynamo it was <strong>pluggable</strong> (it could be swapped): most production instances ran Berkeley DB (BDB) Transactional Data Store, and MySQL was an option for large values. For each request, the coordinator runs a small state machine: send to the nodes, wait for answers, retry, and do read repair after a read if needed.` },
    { type: 'p', html: `In today's Dynamo-style stores, the most common engine is the <strong>LSM tree</strong>. The Cassandra docs say its storage engine is built on LSM and is optimized for "write-heavy" work (lots of writes). For an "always writeable" store, this fits perfectly. (The comparison with B-trees and the inside details are in the <a href="#/db-internals">Database internals</a> lesson.)` },
    { type: 'callout', tone: 'term', title: 'LSM tree (Log-Structured Merge tree)', html: `<strong>What it is:</strong> a way of writing data where old places on disk are never changed; new data is only <em>added at the end</em>. Five parts: (1) <strong>Commit log</strong>: every write is first added to the end of a long diary on disk (a write-ahead log). (2) <strong>Memtable</strong>: a sorted table in RAM that new writes go into. (3) <strong>SSTable</strong> (Sorted String Table): when the memtable is full, it is "flushed" to disk as a sorted file; this file never changes again. (4) <strong>Compaction</strong>: in the background, many small SSTables are joined into one bigger file, dropping old versions and deleted data. (5) <strong>Bloom filter</strong>: a small filter with each SSTable that says "this key is <em>definitely not</em> in this file" or "maybe it is".<br><strong>Why we need it:</strong> writing to disk in order (sequentially) is much faster than changing random places. There is no reading in the write path.<br><strong>Without it (with a B-tree):</strong> each write finds the right place on disk and changes it: random disk access, slower writes.` },
    { type: 'flow', height: 330, title: 'Inside one node: LSM write and read',
      nodes: [
        { id: 'rq', label: 'Request', sub: 'put / get', x: 90, y: 165, w: 130, kind: 'client', info: 'What it is: a read or write that reached this node from the coordinator (like put("cart:42") or get("cart:42")).' },
        { id: 'cl', label: 'Commit log', sub: 'disk, append-only', x: 310, y: 50, w: 160, kind: 'data', info: 'What it is: a long diary on disk. Every write is first added to its end. Why here: RAM is wiped in a crash; reading this diary again rebuilds the memtable. Cassandra docs: in the default "periodic" mode a write is acked right away and the diary is made safe on disk (fsync) every 10 seconds, so up to that much data can be lost in a crash; in "batch" mode the ack comes only after it is safe.' },
        { id: 'mt', label: 'Memtable', sub: 'RAM, sorted', x: 310, y: 280, w: 160, kind: 'cache', info: 'What it is: a sorted table in RAM that new writes go into. Why here: writing to RAM is very fast; and reads of fresh data also come from here, without the disk. At a limit it fills up and is flushed to disk.' },
        { id: 'bf', label: 'Bloom filters', sub: 'one per SSTable', x: 560, y: 50, w: 170, kind: 'cache', info: 'What it is: a small bit-array with each SSTable. Ask "is cart:42 in this file?": the answer is "definitely not" or "maybe yes". Why here: files that definitely lack the key never need to be read from disk. Details in the <a href="#/ds-for-scale">Data structures for scale</a> lesson.' },
        { id: 'ss', label: 'SSTables', sub: 'disk, never changes', x: 560, y: 280, w: 180, kind: 'data', info: 'What it is: sorted files on disk, made by memtable flushes, that never change afterwards. Old and new versions of a key can be in different files; compaction joins them.' },
      ],
      edges: [{ a: 'rq', b: 'cl' }, { a: 'rq', b: 'mt' }, { a: 'mt', b: 'ss' }, { a: 'rq', b: 'bf', id: 'rb', hidden: true }, { a: 'bf', b: 'ss', id: 'bs', hidden: true }, { a: 'cl', b: 'mt', id: 'cm', hidden: true, dashed: true }],
      scenarios: [
        { name: 'Write', steps: [
          { title: 'First into the diary', go: 'rq>cl', after: { cl: { sub: '+ cart:42 v3' } }, text: 'The write is first added to the end of the commit log. Writing forward in order (sequentially) is the fastest thing a disk does.', msg: 'append: cart:42 = [phone, cover, case]' },
          { title: 'Then into the memtable', go: ['rq>mt', 'res:mt>rq'], after: { mt: { sub: 'cart:42 v3 (RAM)' } }, text: 'Then into the sorted table in RAM. That is all. Nothing had to be searched on disk, so the write is very fast. The coordinator hears "written".', msg: 'ack' },
        ]},
        { name: 'Flush', steps: [
          { title: 'The memtable is full', set: { mt: { state: 'hot', sub: 'full (limit)' } }, focus: ['mt'], text: 'The memtable filled up to a set limit (or the commit log got too big).' },
          { title: 'A new SSTable on disk', go: 'evt:mt>ss', after: { mt: { state: '', sub: 'empty, new' }, ss: { state: 'ok', sub: '+1 file (sorted)' }, cl: { sub: 'old part deleted' } }, text: 'The memtable became a new SSTable on disk, in sorted order. That part of the commit log is no longer needed, so it is deleted.' },
        ]},
        { name: 'Read', steps: [
          { title: 'Memtable first', go: ['rq>mt', 'res:mt>rq'], set: { mt: { state: 'miss', sub: 'no cart:42' } }, text: 'The freshest data is in the memtable. Not found here.', msg: 'get("cart:42")' },
          { title: 'Ask the bloom filters', show: ['rb', 'bs'], go: ['rq>bf', 'res:bf>rq'], after: { bf: { sub: '3 of 4: definitely not' } }, text: 'There are 4 SSTables. Their bloom filters said: the key is definitely not in 3 files, maybe in 1. Only 1 file must be read from disk, not 4.' },
          { title: 'Read only one file', go: ['bf>ss', 'res:ss>bf>rq'], after: { ss: { state: 'hit', sub: 'found in file 2' } }, text: 'Found it. This is the price of LSM: a read may have to look in several places (memtable + several files). Bloom filters and compaction keep this price small.' },
        ]},
        { name: 'Crash', steps: [
          { title: 'Node crash', set: { mt: { state: 'down', sub: 'RAM lost' } }, focus: ['mt'], text: 'Power went out, the process died. The memtable was in RAM, so it was wiped. What about writes that were not flushed yet?' },
          { title: 'Back from the diary', show: ['cm'], go: 'evt:cl>mt', after: { mt: { state: 'ok', sub: 'back via replay' } }, text: 'On restart, the node reads the commit log again (replay) and rebuilds the memtable. A write that was acked and safely in the diary survived.' },
        ]},
        { name: 'Compaction', steps: [
          { title: 'Too many files', set: { ss: { state: 'warn', sub: '12 files, old versions' } }, focus: ['ss'], text: 'Every flush makes a new file. Old versions of a key and "tombstones" (delete markers) of deleted keys also sit in the files. Reads have to look at more files.' },
          { title: 'Merge and clean', after: { ss: { state: 'ok', sub: '3 big files' } }, focus: ['ss'], text: 'Background compaction merge-sorts many files into a new file, dropping old versions and deletes, then deletes the old files. The price (Cassandra docs): the same data is written again many times, called <strong>write amplification</strong>, and this adds background disk I/O.' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "in LSM, a delete removes the data right away"', html: `No. SSTables never change, so a delete is also a new write: a <strong>tombstone</strong> (a "this key has been deleted" marker). The real data is removed only during compaction. In a Dynamo-style store this matters even more: if the tombstone is removed before it reaches all replicas, an old replica can bring the deleted data "back to life" and spread it again.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion: "DynamoDB = the Dynamo paper"', html: `The name matches, the design does not. According to AWS's 2022 USENIX paper, in <strong>DynamoDB</strong> (the managed service) the replicas of each partition form a <strong>replication group</strong> that elects a leader using Multi-Paxos (a consensus algorithm in which machines vote to choose a leader; see the <a href="#/consensus">Consensus</a> lesson): writes go through the leader, and strongly consistent reads are possible. So it is not leaderless. The 2007 Dynamo was an internal system. The Dynamo-style leaderless design lives on today in systems like Cassandra and Riak.` },
    { type: 'h2', text: 'What can break' },
    { type: 'table', head: ['Failure', 'What the KV store does', 'Price'], rows: [
      ['A node down for a few minutes', 'Sloppy quorum: the next healthy node keeps the copy with a hint; hinted handoff when it is back', 'For a while copies are in the "wrong" place; a read may be old'],
      ['A node down for a week / disk lost', 'Merkle tree anti-entropy syncs in the background', 'Background network and disk load'],
      ['A whole data center lost', 'The preference list spans data centers, so copies in another DC keep working', 'Cost and latency of cross-DC replication'],
      ['Network partition', 'Writes continue on both sides; vector clocks catch concurrent versions', 'The client must merge (complexity moves into the app)'],
      ['Hot key', 'All reads/writes of one key hit the same N nodes', 'Vnodes do not help here; use an app-level cache or split the key'],
      ['ID server clock goes back', 'The generator stops giving IDs, the client moves to another server', 'A few ms of errors; an alert'],
      ['Two ID servers get the same number', 'Duplicate IDs (the most dangerous)', 'Leases + the DB primary key as the last safety net'],
      ['Node crash (memtable in RAM lost)', 'The memtable is rebuilt by commit log replay', 'With periodic sync, the last few seconds of acked data can be lost; copies survive on other replicas'],
      ['A replica down for long after a delete', 'After the tombstone is removed, a returning replica can spread the deleted data again', 'Keep tombstones for some days and always run repair before then'],
      ['Too many SSTables', 'Slow reads (many files to check)', 'Compaction (at the cost of background disk I/O), bloom filters'],
    ]},

    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>IDs:</strong> need them sorted by time (feeds, messages)? Snowflake or UUIDv7 (a time-ordered UUID). Only need uniqueness? UUIDv4 (a random UUID). With few machines, a service; with very many machines and autoscaling, think carefully before a library (managing machine IDs is hard). <strong>KV store:</strong> simple key lookups at very large scale, and "always writeable" is vital for the business? Dynamo-style leaderless (like Cassandra), (3,2,2). Need strong consistency? Leader-based replication (like DynamoDB's Multi-Paxos per partition). In an interview, name both paths and their prices.` },

    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'ID generator', d: 'Requirements (64-bit, time-sorted, uncoordinated). Snowflake 41/10/12, the bit budget, service vs library, machine ID lease, refuse when the clock goes backwards, batch IDs.' },
      { t: 'KV: API and requirements', d: 'get/put, always writeable or consistent? p99.9 latency. This one question changes the whole design.' },
      { t: 'Partitioning', d: 'Consistent hashing + vnodes, a preference list across different machines and DCs.' },
      { t: 'Replication', d: 'N/R/W, (3,2,2) is common; what R + W > N means and its limit under a sloppy quorum.' },
      { t: 'Conflicts', d: 'Vector clocks + client merge, or LWW if losing data is acceptable.' },
      { t: 'Failures', d: 'Hinted handoff (temporary), read repair (while reading), Merkle trees (background), gossip + seeds (membership).' },
      { t: 'Storage', d: 'LSM on each node: commit log + memtable (fast writes), SSTables + bloom filters (reads), compaction (cleanup), tombstones (deletes).' },
    ]},
    { type: 'diagram', title: 'The whole design at a glance', height: 560,
      groups: [
        { label: 'Apps', x: 150, y: 8, w: 220, h: 92 },
        { label: 'ID generator', x: 10, y: 140, w: 200, h: 250 },
        { label: 'KV store: a ring of equal nodes', x: 290, y: 140, w: 422, h: 395 },
      ],
      nodes: [
        { id: 'svc', label: 'xyz.com services', sub: 'posts, cart', x: 260, y: 55, w: 200, kind: 'client', info: 'What it is: xyz.com services (posts, chat, cart). They ask for an ID for each new post, and keep data like carts in the KV store.' },
        { id: 'idgen', label: 'ID servers', sub: 'Snowflake 41/10/12', x: 110, y: 200, w: 170, kind: 'server', info: 'What it is: Snowflake-like ID generators, many copies, in several data centers. Each ID = time + machine number + sequence. They never talk to each other; if the clock goes back, they stop giving IDs.' },
        { id: 'reg', label: 'Worker registry', sub: 'etcd / ZooKeeper', x: 110, y: 340, w: 170, kind: 'net', info: 'What it is: the coordination store where each ID server takes its machine number as a lease at startup, so two servers never get the same number.' },
        { id: 'co', label: 'Coordinator', sub: 'pref list + vector clock', x: 400, y: 200, w: 190, kind: 'server', info: 'What it is: the first healthy node on the ring for the key\'s hash. On a write it creates a new version (vector clock), sends it to N copies, and says OK after W acks. On a read it takes R answers, returns both versions if there is a conflict, and does read repair.' },
        { id: 'na', label: 'Replica B', sub: 'copy 2', x: 625, y: 170, w: 150, kind: 'data', info: 'What it is: the second node of the preference list (a different physical machine). One copy of the key lives here.' },
        { id: 'nb', label: 'Replica C', sub: 'copy 3, can go down', x: 625, y: 300, w: 150, kind: 'data', info: 'What it is: the third node of the preference list. If it is down, D takes its place in a sloppy quorum; when it returns, hinted handoff, and if it stays down long, Merkle repair.' },
        { id: 'nd', label: 'Node D', sub: 'hint: for C', x: 625, y: 430, w: 150, kind: 'data', info: 'What it is: the next node on the ring. While C was down, C\'s copy was kept here with a hint (sloppy quorum). As soon as C is back, it hands the copy back (hinted handoff).' },
        { id: 'lsm', label: 'LSM storage', sub: 'log, memtable, SSTables', x: 400, y: 340, w: 190, kind: 'data', info: 'What it is: the storage engine inside each node. Write: commit log + memtable (fast). Flush makes SSTables, bloom filters help reads, compaction cleans up, deletes = tombstones.' },
        { id: 'gos', label: 'Gossip + seeds', sub: 'who is alive, where', x: 380, y: 490, w: 170, kind: 'net', info: 'What it is: every second, each node merges cluster information with a random node (membership, tokens, heartbeats). New nodes join through seeds. Each node decides by itself who is down (Cassandra: Phi Accrual detector).' },
      ],
      edges: [
        { a: 'svc', b: 'idgen', n: 1, label: 'next_id()' },
        { a: 'idgen', b: 'reg', dashed: true, label: 'lease' },
        { a: 'svc', b: 'co', n: 2, label: 'put / get' },
        { a: 'co', b: 'na', n: 3 },
        { a: 'co', b: 'nb' },
        { a: 'co', b: 'nd', dashed: true },
        { a: 'co', b: 'lsm', label: 'local write' },
        { a: 'nd', b: 'nb', kind: 'evt', label: 'handoff' },
        { a: 'na', b: 'nb', kind: 'evt', dashed: true, both: true, label: 'Merkle repair' },
        { a: 'gos', b: 'nd', kind: 'evt', both: true, label: 'gossip' },
        { a: 'co', b: 'gos', kind: 'evt', dashed: true, both: true, via: [[290, 250], [290, 490]] },
      ],
      paths: [
        { name: 'Generate ID', text: 'At startup, the ID server takes its machine number from the registry as a lease. Then every next_id() needs nobody else: time + machine + sequence. ~1 ms, including the network call.', go: ['svc>idgen>reg'] },
        { name: 'Write key', text: 'put(cart:42) → coordinator (by hash on the ring) → new vector clock version → its own LSM storage (commit log + memtable) + send to B and C → OK to the client after W = 2 acks.', go: ['svc>co>na', 'co>nb', 'co>lsm'] },
        { name: 'Read with quorum', text: 'get(cart:42) → the coordinator asks R = 2 replicas → drop old versions, give both to the client if concurrent → read repair for the copy that is behind.', go: ['svc>co>na', 'co>nb'] },
        { name: 'Node fails', text: 'C goes down → noticed via gossip/failure detector → sloppy quorum: the copy goes to D with a hint → when C returns, hinted handoff → if it was down long, B and C sync with Merkle trees.', go: ['co>nd>nb', 'na>nb', 'gos>nd'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li><strong>Snowflake ID</strong> = time (41) + machine (10) + sequence (12) bits: each server makes its own IDs, IDs are roughly sorted by time, ~70 years, 1,024 machines.</li>
      <li>The machine number is kept unique with a <strong>lease</strong>; if the clock goes back, the generator stops.</li>
      <li>KV store: split data with <strong>consistent hashing + vnodes</strong>; the preference list holds N <em>different</em> machines.</li>
      <li><strong>N/R/W</strong>: (3, 2, 2) is common; R + W &gt; N = overlap, but a sloppy quorum can break this guarantee.</li>
      <li>Conflicts: <strong>vector clocks</strong> (Dynamo, Riak siblings/DVV) or <strong>last-write-wins</strong> (Cassandra).</li>
      <li>Failures: <strong>hinted handoff</strong> (short), <strong>read repair</strong> (while reading), <strong>Merkle anti-entropy</strong> (background, long).</li>
      <li>Membership by <strong>gossip</strong>, no master; new nodes join through seeds.</li>
      <li><strong>LSM</strong> on each node: commit log + memtable (fast writes), SSTables + bloom filters, compaction, tombstones.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Snowflake: no coordination, each machine makes millions of IDs per second, sorted by time', 'Consistent hashing + vnodes: adding/removing nodes is cheap, load is even', 'Sloppy quorum + hinted handoff: writes never stop', 'Vector clocks: no "add to cart" silently disappears', 'Merkle trees: very little data to compare replicas', 'Gossip: no master, no SPOF', 'LSM storage: very fast writes'], costs: ['IDs only "roughly" sorted; watch out for clock skew', 'Eventual consistency: old reads are possible', 'The client must merge conflicting versions', 'Background load of hinted handoff and anti-entropy', 'Hard to debug: no single place holds "the truth"', 'No multi-key transactions', 'LSM: reads check several files, compaction rewrites data (write amplification)'] },

    { type: 'think', questions: [
      { q: 'The xyz.com "likes count" is in a Dynamo-style store. Two people like at the same time, through different partitions. With vector clocks, how will the client merge? What happens with LWW?', a: 'If the value is just a number (count = 10), the merge cannot tell which likes were different: both versions say 11. With LWW it is also 11, so one like is lost. The right way: keep a set of "which users liked it" in the value (or a separate counter per node, like a CRDT counter), and merge = union/sum. This shows that conflict resolution depends on the structure of the data.' },
      { q: 'N = 3, W = 1, R = 1. What is the gain, what is the loss?', a: 'Gain: the lowest latency and the highest availability (a write works if even one node is alive). Loss: R + W = 2, less than N, so a read can often return old data; and if the write lands on only one node and that node dies, the data is gone. The paper also says most production services kept W above 1 for durability.' },
      { q: 'A user deleted an item from the cart. Replica C was down for 2 weeks at that time, and the other replicas removed the tombstone during compaction. C came back. What can happen, and how will you prevent it?', a: 'C still has the item, and the other replicas have neither the data nor the tombstone. Anti-entropy will think C has "new" data and spread the item back to the other replicas: the deleted item comes back to life. Prevention: keep tombstones for some days (longer than a long outage), and always run repair within that time; do not add back a node that was down very long as it is; clean it first and bootstrap it again.' },
      { q: 'The Snowflake service needs 5 data centers with 50 servers each. With the 41/10/12 layout, are 5 bits for DC + 5 bits for worker enough? What will you change?', a: '5 bits for DC = 32 data centers (5 is enough), 5 bits for worker = 32 servers per DC (50 do not fit). Option: 3 bits DC (8) + 7 bits worker (128). The total is still 10 bits; only the split changed. Or make the machine bits 11 and the sequence 11 bits (2,048/ms, still about 2 million per second per machine).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What is the biggest benefit of vnodes in Dynamo?', options: ['Data gets encrypted', 'When a node fails or joins, the load is shared evenly by many nodes, and bigger machines can get more vnodes', 'Reads become strongly consistent'], answer: 1, explain: 'The paper\'s three benefits: a failure\'s load is shared by all, a new node takes a little from everyone, and machines of different sizes can work together.' },
      { q: 'Which failure is hinted handoff for?', options: ['Permanent disk failure', 'Temporary node/network failure', 'Clock skew'], answer: 1, explain: 'In a short outage, the next healthy node keeps the copy with a hint and hands it to the owner when it returns. For long/permanent failures: Merkle-tree anti-entropy.' },
      { q: 'What is the relation between the vector clocks [Sx:2, Sy:1] and [Sx:2, Sz:1]?', options: ['The first is newer', 'The second is newer', 'Concurrent: keep both, the client merges'], answer: 2, explain: 'Sy\'s counter is bigger in the first, Sz\'s in the second. Neither saw the other.' },
      { q: 'Why do Merkle trees make anti-entropy cheap?', options: ['They compress data', 'If the roots match, the job is done in one comparison; if not, you go down only into the branches that differ', 'They make disks faster'], answer: 1, explain: 'A tree of hashes: to find the difference you exchange a few hashes, not all the data.' },
      { q: 'Why is a write so fast in an LSM store?', options: ['The data is compressed', 'The write is only added to the end of the commit log and goes into the memtable in RAM; nothing on disk has to be found and changed', 'Writes never go to disk'], answer: 1, explain: 'Sequential append + RAM. The price is paid later: reads check several files (bloom filters help) and compaction rewrites data (write amplification).' },
      { q: 'N = 3, W = 2, R = 2. Two copies are down. What happens with a strict quorum?', options: ['Both reads and writes work', 'Both are refused, because only 1 copy is alive and 2 are needed', 'Only reads work'], answer: 1, explain: 'Try D = 2 in the quorum widget. This is exactly where Dynamo keeps writes going with a sloppy quorum, using the next healthy nodes on the ring.' },
      { q: 'What does the generator do when the 12-bit Snowflake sequence runs out within one millisecond?', options: ['Gives a random number', 'Waits until the next millisecond and starts the sequence from 0', 'Changes the machine ID'], answer: 1, explain: 'The ceiling is 4,096 per ms per machine. Need more? More machines, or a different split of the bits.' },
    ]},
    { type: 'sources', note: 'Snowflake (2010) and the Dynamo paper (2007) are old. Twitter\'s original Snowflake repo was archived in 2021; DynamoDB\'s design is different from the Dynamo paper (see the 2022 paper).', items: [
      { title: 'Announcing Snowflake', publisher: 'Twitter Engineering blog', official: true, year: 2010, url: 'https://blog.x.com/engineering/en_us/a/2010/announcing-snowflake', used: 'MySQL to Cassandra motivation, tens of thousands of IDs/second, uncoordinated, roughly sortable, 64-bit requirement.' },
      { title: 'twitter-archive/snowflake (snowflake-2010 README)', publisher: 'Twitter on GitHub', official: true, year: 2010, url: 'https://github.com/twitter-archive/snowflake/tree/snowflake-2010', used: 'Scala Thrift server, 41-bit ms time with custom epoch (69 years), 10-bit configured machine id, 12-bit sequence, 10k IDs/s per process and ~2 ms targets, NTP, refuse IDs when clock runs backwards, archived 2021.' },
      { title: 'Dynamo: Amazon\'s Highly Available Key-value Store', publisher: 'Amazon (SOSP 2007 paper)', official: true, year: 2007, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'Shopping cart always-writeable motivation, p99.9 SLA example, get/put with context, MD5 keys, consistent hashing + virtual nodes and their advantages, preference list skipping, cross-DC placement, vector clocks and example, truncation threshold, (3,2,2), sloppy quorum, hinted handoff, Merkle anti-entropy per key range, gossip every second, seeds, explicit membership, BDB storage engine, 99.94% single-version measurement, strategy 3.' },
      { title: 'Dynamo (architecture overview)', publisher: 'Apache Cassandra documentation', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html', used: 'Cassandra uses token ring with vnodes (256 random tokens per node default in 2.x, smarter allocator from 3.x), gossip every second with a random peer and seeds, Phi Accrual failure detector, hinted handoff, read repair, Merkle-tree repair, consistency levels ONE/QUORUM/ALL/LOCAL_QUORUM, and last-write-wins timestamps instead of vector clocks.' },
      { title: 'Storage Engine', publisher: 'Apache Cassandra documentation', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html', used: 'LSM-based engine for write-heavy workloads, commit log (WAL) then memtable then flush to immutable SSTables, periodic (10 s default) vs batch commitlog_sync, Bloom filter per SSTable, compaction and write amplification.' },
      { title: 'Hints', publisher: 'Apache Cassandra documentation', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/managing/operating/hints.html', used: 'Coordinator stores hints for unavailable replicas, max_hint_window default 3 hours.' },
      { title: 'Clusters (Riak KV concepts)', publisher: 'Riak KV documentation', official: true, url: 'https://docs.riak.com/riak/kv/latest/learn/concepts/clusters/index.html', used: '160-bit hash of bucket/key, ring split into partitions owned by vnodes, any node can coordinate, N/R/W and DW, ring state shared by gossip and re-announced periodically.' },
      { title: 'Causal Context (Riak KV concepts)', publisher: 'Riak KV documentation', official: true, url: 'https://docs.riak.com/riak/kv/latest/learn/concepts/causal-context/index.html', used: 'Vector clocks, siblings with allow_mult (recommended true) vs timestamp resolution, dotted version vectors recommended from 2.0 to avoid sibling explosion.' },
      { title: 'Active Anti-Entropy (Riak KV concepts)', publisher: 'Riak KV documentation', official: true, url: 'https://docs.riak.com/riak/kv/latest/learn/concepts/active-anti-entropy/index.html', used: 'Merkle hash tree exchange, persistent on-disk trees updated on writes, trees regenerated weekly by default to catch silent corruption.' },
      { title: 'Riak KV configuration reference', publisher: 'Riak KV documentation', official: true, url: 'https://docs.riak.com/riak/kv/latest/configuring/reference/index.html', used: 'ring_size default 64, power of 2, between 8 and 1024.' },
      { title: 'Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service', publisher: 'AWS (USENIX ATC 2022 paper)', official: true, year: 2022, url: 'https://www.usenix.org/conference/atc22/presentation/vig', used: 'DynamoDB partitions replicated by Multi-Paxos replication groups with a leader, i.e. different from the 2007 leaderless Dynamo.' },
    ]},
  ],
});
