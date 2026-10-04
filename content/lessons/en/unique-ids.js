Lesson.register({
  id: 'unique-ids',
  title: 'Unique ID generation',
  minutes: 32,
  summary: `With one database, giving IDs is easy: 1, 2, 3. Once data is spread over many machines, every new post, message and order needs an ID that never collides, is made fast, and is often sorted by time. In this lesson: auto-increment, step offsets, Flickr's ticket server, UUIDv4, UUIDv7/ULID, Twitter Snowflake (build an ID and break it apart yourself), Instagram's variant, and clock skew.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `On xyz.com every post, every message and every like needs a <strong>name-number</strong> (an ID), like every student has a roll number.<br>When only one computer handed out numbers, counting 1, 2, 3 was easy.<br>Now hundreds of computers create posts at the same time. If two computers give out the same number, two different posts get the same name: a mess.<br>In this lesson we see how to make crores of IDs that never collide, without the computers asking each other, and often in time order too.` },
    { type: 'h2', text: 'Problem: 1, 2, 3 no longer works' },
    { type: 'p', html: `At first xyz.com had a single MySQL database. The <code>posts</code> table had <code>id BIGINT AUTO_INCREMENT</code>. The database itself gave 1, 2, 3 ... Nobody had to think.` },
    { type: 'p', html: `Then came the day from the sharding lesson: posts were split across 4 databases (shards). Each shard has its own auto-increment. Shard A's first post: id 1. Shard B's first post: <strong>also id 1</strong>. Now which one is "post 1"? Cache keys collide, URLs collide, and Kafka events carry two different posts with the same ID.` },
    { type: 'p', html: `And it is not only about collisions. To show a feed, posts must be sorted "newest first". If the ID itself grows with time, <code>ORDER BY id DESC</code> is enough, with no separate timestamp index. So we want several things from an ID:` },
    { type: 'table', head: ['Need', 'Why'], rows: [
      ['Unique (never collides)', 'Two posts with the same ID = data corruption'],
      ['Fast and no SPOF', 'Every post, like and message needs an ID: lakhs per second. If one central machine stops, all writes stop'],
      ['Sortable by time (often)', 'Feeds, chats, "newest first" pagination: order straight from the ID'],
      ['Small (64-bit is best)', 'The ID is in every table, every index, every foreign key. 8 bytes vs 16 bytes is a big difference over billions of rows'],
      ['Not guessable (sometimes)', 'Nobody should open order #1040 after seeing #1041, and a competitor should not count your orders'],
    ]},
    { type: 'callout', tone: 'term', title: '64-bit ID', html: `<strong>What it is:</strong> a number that fits in 64 binary digits (bits), which is 8 bytes. Databases call it <code>BIGINT</code>. The biggest (signed) value is about 9.2 × 10<sup>18</sup>.<br><strong>Why we need it:</strong> the ID is written again and again in every table, index and foreign key. An 8-byte ID takes half the space of a 16-byte one, and the CPU compares it in one step.<br><strong>Without it:</strong> over billions of rows the indexes get bigger, less fits in RAM, and queries slow down.` },
    { type: 'callout', tone: 'term', title: 'Roughly sorted (k-sorted)', html: `<strong>What it is:</strong> the IDs are <em>roughly</em> in time order. If two posts were made around the same millisecond, their order may be slightly mixed, but a post made 1 second earlier always has a smaller ID.<br><strong>Why we need it:</strong> to show "newest first" in a feed, just <code>ORDER BY id DESC</code>. No separate timestamp index needed.<br><strong>Without it:</strong> every list needs its own time column and its own index.` },
    { type: 'h2', text: 'Method 1: database auto-increment' },
    { type: 'callout', tone: 'term', title: 'Auto-increment', html: `<strong>What it is:</strong> the database's own counter. For every new row it gives the next number by itself: 1, 2, 3...<br><strong>Why we need it:</strong> you do not have to think about IDs at all. The number is small, unique and growing.<br><strong>Without it:</strong> the app would have to remember "what was the last number", and two requests at the same moment could take the same number.` },
    { type: 'p', html: `One database, one counter. The simplest option, and exactly the right answer for small apps.<br><strong>Worked example:</strong> Riya posts on xyz.com: id 1041. Aman posts: id 1042. The database hands them out one at a time, so a collision is impossible. The weaknesses show up when the scale grows:` },
    { type: 'list', items: [
      `<strong>SPOF and bottleneck:</strong> every insert needs an ID from that one database. If it falls, nobody can write anything.`,
      `<strong>Not unique across shards:</strong> each shard has its own counter, its own 1, 2, 3.`,
      `<strong>It leaks secrets:</strong> seeing <code>/orders/1041</code>, a competitor learns how many orders you have, and someone may try <code>/orders/1040</code> to see another person's order (so an authorization check is always needed).`,
    ]},

    { type: 'h2', text: 'Method 2: multi-master, step offsets' },
    { type: 'callout', tone: 'term', title: 'Multi-master and step offset', html: `<strong>What it is:</strong> <strong>multi-master</strong> = two or more database servers that all accept writes. <strong>Step offset</strong> = give each server its own counting "lane": they all move by the same step, but start from a different number (offset). Like two gates of a stadium: one gate gives odd seat numbers, the other gives even ones.<br><strong>Why we need it:</strong> if one master falls, the other keeps giving IDs, and the two never give the same number.<br><strong>Without it:</strong> both servers count from 1 and collide right away.` },
    { type: 'p', html: `MySQL has two settings: <code>auto_increment_increment = N</code> (how much to add each time) and <code>auto_increment_offset = i</code> (where to start).` },
    { type: 'ascii', text: `
N = 2 servers:   increment = 2

Server 1 (offset 1):  1, 3, 5, 7, 9 ...     (odd)
Server 2 (offset 2):  2, 4, 6, 8, 10 ...    (even)

Never a collision. But...` },
    { type: 'list', items: [
      `<strong>Adding a server is hard:</strong> to go from N = 2 to N = 3, every server's increment and offset must change, and you must make sure there are no collisions with old numbers. <em>Example:</em> Server 1 has reached 9 and Server 2 has reached 10. New plan: increment 3, offsets 1, 2, 3. Server 1's next number would be 10, but Server 2 already gave out 10! So the new counters must start above the old maximum (10): 13, 14, 15...`,
      `<strong>No time order:</strong> Server 1 is busy and has reached 9,001; Server 2 is quiet and is at 52. A post made right now gets ID 54, yesterday's post has 9,001. Sort by ID = a wrong feed.`,
    ]},

    { type: 'h2', text: 'Method 3: ticket server (Flickr, 2010)' },
    { type: 'p', html: `Flickr faced exactly this problem: data in sharded MySQL, and IDs had to be unique across the whole system. According to a 2010 post on their engineering blog, they did not use GUIDs (random IDs like UUIDs) because they are big and do not index well in MySQL (the index had to stay in RAM, so size mattered a lot). The solution: a separate, small MySQL server whose <strong>only job</strong> is handing out IDs. They called it a <strong>ticket server</strong>.` },
    { type: 'code', text: `
-- On the ticket server: one table, only one row
CREATE TABLE Tickets64 (
  id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  stub CHAR(1) NOT NULL DEFAULT '',
  UNIQUE KEY stub (stub)
);

-- Need a new ID:
REPLACE INTO Tickets64 (stub) VALUES ('a');   -- remove the old row, add a new one: id +1
SELECT LAST_INSERT_ID();                        -- this is my new ID` },
    { type: 'callout', tone: 'term', title: 'Ticket server', html: `<strong>What it is:</strong> a small separate server whose only job is running a counter. Whoever needs an ID takes a "ticket" (the next number) from it, like a token machine in a bank.<br><strong>Why we need it:</strong> the data is on many shards, but the numbering comes from one place, so the IDs are unique and small (64-bit) across the whole system.<br><strong>Without it:</strong> every shard gives its own 1, 2, 3 and the IDs collide.` },
    { type: 'p', html: `Because <code>stub</code> is unique, <code>REPLACE</code> deletes the old row and inserts a new one, so the table always has just one row, and the auto-increment keeps growing. To avoid a SPOF, Flickr ran <strong>two</strong> ticket servers with the step offset trick from above: one gave odd numbers, the other even. The load was shared between them.` },
    { type: 'list', items: [
      `<strong>Benefit:</strong> small 64-bit numeric IDs, roughly growing, simple setup.`,
      `<strong>Cost:</strong> a network call for every ID. With very many writes the ticket server itself becomes the bottleneck. With two servers, the odd/even numbers together are not exactly in time order.`,
      `<strong>Common improvement:</strong> do not ask for one ID at a time, ask for a <strong>range</strong> (say 1,000 IDs at once). We did this in the URL shortener lesson. A server crash = some IDs of the range are wasted, which is fine.`,
    ]},
    { type: 'p', html: `<strong>Worked example (range):</strong> App server A asks the ticket server for a range and gets 1001-2000. Server B gets 2001-3000. Now A hands out its 1,000 IDs without any network call. 1,000 IDs, only <strong>1 call</strong>. But look: A's 900th post (id 1900) may have been made <em>after</em> B's first post (id 2001), and still its ID is smaller. That is why the order is only "roughly" right.` },
    { type: 'callout', tone: 'term', title: 'Base62', html: `<strong>What it is:</strong> a way of writing numbers with 62 "digits": 0-9, a-z, A-Z. Just like decimal has 10 digits.<br><strong>Why we need it:</strong> short codes that work in URLs. 1041 in base62 is just <code>gN</code> (16 × 62 + 49 = 1041; g = 16, N = 49). 7 characters hold 62<sup>7</sup> ≈ 3.5 lakh crore codes.<br><strong>Without it:</strong> a long number or a 36-character UUID in the link: hard to remember and share.` },
    { type: 'h2', text: 'Method 4: UUIDv4 (random)' },
    { type: 'p', html: `Think the opposite way: do not ask anyone. Every server makes a very big random number by itself. So big that the chance of getting the same one twice is almost zero.` },
    { type: 'callout', tone: 'term', title: 'UUID', html: `<strong>What it is:</strong> a UUID (Universally Unique Identifier) is a 128-bit number, usually written like this: <code>9f1c2b7e-4a3d-4e8b-b1f2-0c6d5e4a3b21</code> (36 characters). It has several "versions". In <strong>version 4</strong>, 122 of the 128 bits are random (the other 6 bits say "this is v4"). The UUID standard is now RFC 9562 (2024), which replaced the old RFC 4122.<br><strong>Why we need it:</strong> any machine, at any time, can make an ID without asking anyone.<br><strong>Without it:</strong> every ID would need a request to some central place.` },
    { type: 'p', html: `How likely is a collision? With 122 random bits, the chance of even one duplicate reaches 50% only when about <strong>2.7 × 10<sup>18</sup></strong> UUIDs have been made (the birthday problem maths). This is so large that in real systems the worry is a broken random number generator, not the maths. Move the slider and see for yourself:` },
    { type: 'custom', render(el) {
      const PRE = [['1 lakh', 1e5], ['1 crore', 1e7], ['100 crore (10^9)', 1e9], ['10^12', 1e12], ['10^15', 1e15], ['2.7 × 10^18', 2.7e18], ['10^19', 1e19]];
      el.innerHTML = `<label for="uiBd">How many UUIDv4 you create: <strong class="uiBdV"></strong></label>
        <input id="uiBd" type="range" min="0" max="${PRE.length - 1}" step="1" value="2">
        <div class="stats">
          <div class="stat"><span>Chance of at least one duplicate</span><strong class="uiBdP"></strong></div>
          <div class="stat"><span>Roughly</span><strong class="uiBdM"></strong></div>
        </div>
        <div class="calc-note uiBdN"></div>`;
      const q = s => el.querySelector(s);
      // Birthday approximation: p = 1 - e^(-n^2 / (2 * 2^122))
      const draw = () => {
        const [lab, n] = PRE[Number(q('#uiBd').value)];
        const x = (n * n) / (2 * Math.pow(2, 122));
        const p = -Math.expm1(-x);
        q('.uiBdV').textContent = lab;
        q('.uiBdP').textContent = p < 1e-3 ? p.toExponential(1) : (p * 100).toFixed(p > 0.99 ? 3 : 1) + '%';
        q('.uiBdM').textContent = p < 1e-3 ? `1 in ${Number((1 / p).toPrecision(2)).toExponential(1)}` : p > 0.99 ? 'almost certain' : `${Math.round(p * 100)} in 100`;
        q('.uiBdN').textContent = `Formula (birthday problem): p ≈ 1 − e^(−n² / 2·2^122), because v4 has 122 random bits. ` + (p < 1e-6 ? 'So small that a hardware fault is more likely.' : p < 0.4 ? 'Now it is worth paying attention.' : 'Here the risk is real: ~50% once about 2.7 × 10^18 UUIDs exist.');
      };
      q('#uiBd').addEventListener('input', draw);
      draw();
    }},
    { type: 'list', items: [
      `<strong>Benefit:</strong> no coordination, no SPOF. A mobile app can make IDs even when offline.`,
      `<strong>Cost 1, size:</strong> 16 bytes (36 as a string). Double the space in every index and every foreign key.`,
      `<strong>Cost 2, no order:</strong> the ID does not tell you which was made first. Feeds need a separate <code>created_at</code> index.`,
      `<strong>Cost 3, hurts the index:</strong> in a B-tree index (db-internals lesson), new IDs land at random places every time. Different pages of the index keep coming from disk into RAM, and pages split. Growing IDs are always added at the end of the index, which stays hot in RAM.`,
    ]},

    { type: 'h2', text: 'Method 5: UUIDv7 and ULID (time-ordered)' },
    { type: 'p', html: `The biggest problem of UUIDv4 was order. The cure: put the time at the <strong>start</strong> of the ID, and the rest random. Now IDs grow with time, and they are still made without coordination.` },
    { type: 'callout', tone: 'term', title: 'UUIDv7', html: `<strong>What it is:</strong> a new UUID version (RFC 9562, 2024). The first 48 bits = Unix time in milliseconds (since 1 Jan 1970), then the version number 7, then random bits.<br><strong>Why we need it:</strong> the freedom of a UUID (no coordination) + time order + good for database indexes.<br><strong>Without it:</strong> either UUIDv4 (no order) or a Snowflake-like setup (managing machine IDs).` },
    { type: 'callout', tone: 'term', title: 'ULID', html: `<strong>What it is:</strong> Universally Unique Lexicographically Sortable Identifier. The community made it before UUIDv7: 48 bits ms + 80 random bits, written in 26 characters (Crockford base32: 0-9 and A-Z without I, L, O, U, so they are not misread).<br><strong>Why we need it:</strong> the same benefit, plus a shorter string that is easy in URLs, and sorting it as text still gives time order.<br><strong>Without it:</strong> a 36-character UUID string, with no order if it is v4.` },
    { type: 'ascii', text: `
UUIDv7 (RFC 9562, May 2024), 128 bits:

| unix_ts_ms: 48 bits | ver: 4 | rand_a: 12 | var: 2 | rand_b: 62 |
  milliseconds since 1970  "7"   random      "10"     random

ULID (community spec), 128 bits:
| timestamp ms: 48 bits | randomness: 80 bits |
  written in 26 characters (Crockford base32):  01KF0K8Y5V...` },
    { type: 'p', html: `<strong>Worked example:</strong> a post was made on 15 Jan 2026 at 10:30:00.123 UTC. Unix ms = <code>1768473000123</code>. In hex this is <code>019bc13478bb</code> (12 hex digits = 48 bits). So the UUIDv7 starts with <code>019bc134-78bb-7...</code>: first 12 hex digits of time, then the version "7". In a ULID the same time in base32 is <code>01KF0K8Y5V</code> (the first 10 characters), then 16 random characters. A post made 1 ms later has the time part <code>...78bc</code>: bigger, so it comes later when sorted.` },
    { type: 'list', items: [
      `<strong>Sortable:</strong> the first 48 bits are time, so sorting gives time order. RFC 9562 itself says to use v7 instead of v1/v6 where possible, and that time-ordered IDs are much better for database indexes because new values land close together in the index.`,
      `<strong>Many IDs in one millisecond?</strong> RFC 9562 describes methods, such as keeping a counter in the random part, so IDs from the same ms still grow in order. The ULID spec also adds +1 to the random part within the same ms.`,
      `<strong>Still 128 bits:</strong> the size is still 16 bytes. And the creation time can be read from the ID (sometimes a privacy question).`,
      `<strong>UUID vs ULID:</strong> the same idea. UUIDv7 is an official standard and fits straight into UUID columns and libraries. A ULID string is shorter and easier to read.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "A UUID is secret, so put it in the URL"', html: `A UUIDv4 is hard to guess, but it is <strong>not a password</strong>. Once a link is shared (logs, browser history, a screenshot), anyone can open it. And in UUIDv7 / ULID half of it is time, so there is even less randomness. If you want "whoever has the link can see it", keep a separate random secret token; otherwise check authorization on every request.` },
    { type: 'h2', text: 'Method 6: Twitter Snowflake (64-bit, time-ordered)' },
    { type: 'p', html: `In 2010 Twitter was moving from MySQL to Cassandra, and Cassandra has nothing like auto-increment. According to their "Announcing Snowflake" post, they needed: <strong>thousands of IDs per second</strong>, high availability (so no coordination between machines), <strong>roughly sortable</strong> IDs (tweets made close in time get IDs close together; the README promised order within 1 second, and aimed for tens of milliseconds), and all of it in <strong>64 bits</strong>. A UUID was 128 bits, so it did not work. They built Snowflake.` },
    { type: 'callout', tone: 'term', title: 'Snowflake ID', html: `<strong>What it is:</strong> a 64-bit number made by joining three parts: <strong>the current time</strong> + <strong>which machine made it</strong> + <strong>which number within that millisecond</strong>. Like "date + counter number + token number".<br><strong>Why we need it:</strong> every machine can make unique, time-sorted 64-bit IDs on its own, without asking anyone, lakhs per second.<br><strong>Without it:</strong> either a central counter (SPOF, network call) or a 128-bit UUID (double the size).` },
    { type: 'ascii', text: `
Snowflake ID = 64 bits

| 0 |   timestamp: 41 bits    | machine: 10 bits | sequence: 12 bits |
  ^     ms since custom epoch    datacenter 5        within the same ms
  sign bit (always 0)            + worker 5          0, 1, 2 ... 4095

id = (ms_since_epoch << 22) | (machine << 12) | sequence` },
    { type: 'list', items: [
      `<strong>1 sign bit:</strong> always 0, so the number stays positive (Java's <code>long</code> and SQL's <code>BIGINT</code> are signed).`,
      `<strong>41 bits of timestamp:</strong> milliseconds, but not since 1970: since a <strong>custom epoch</strong>. 2<sup>41</sup> ms ≈ <strong>69.7 years</strong>. Twitter's epoch is 1288834974657 ms, which is 4 Nov 2010; these IDs will last until about 2080. Counting from 1970 would have wasted 40 years already.`,
      `<strong>10 bits of machine:</strong> up to 1,024 generators. In Twitter's code: 5 bits datacenter + 5 bits worker. Every machine must have a different number, or two machines can make the same ID.`,
      `<strong>12 bits of sequence:</strong> one machine can make up to 4,096 IDs in one millisecond. That means about 40 lakh IDs per second from one machine. Used all 4,096 in one ms? Wait for the next millisecond.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Epoch', html: `<strong>What it is:</strong> the moment where counting starts, the "zero of time". The Unix epoch is 1 Jan 1970. Snowflake picks its own <strong>custom epoch</strong> (like the day the system launched).<br><strong>Why we need it:</strong> 41 bits hold only ~69.7 years. Counting from 1970 would already have used 56 years by 2026.<br><strong>Without it:</strong> the IDs run out in just a few years.` },
    { type: 'callout', tone: 'term', title: 'Bit shift and OR', html: `<strong>What it is:</strong> <code>&lt;&lt; 22</code> (a bit shift) means moving the number 22 binary places to the left, like adding three zeros after 5 in decimal to get 5000. The right-hand 22 bits become empty. <code>|</code> (OR) fills those empty places with the machine and the sequence.<br><strong>Why we need it:</strong> to pack three small numbers into one 64-bit number, and later take them out again (shift + mask).<br><strong>Without it:</strong> we would need three separate columns.<br><strong>Example:</strong> time = 5, machine = 1, sequence = 2 → (5 &lt;&lt; 22) | (1 &lt;&lt; 12) | 2 = 20,971,520 + 4,096 + 2 = <strong>20,975,618</strong>.` },
    { type: 'p', html: `The biggest point: making an ID needs <strong>no network call</strong>. Inside every app server there is a small generator: read the clock, add your machine number, increase the counter. Microseconds of work. And because the timestamp is in the highest bits, a bigger ID means it was made later. Below, build an ID yourself, look at its bits, and break any ID back apart:` },
    { type: 'custom', render(el) {
      const LAY = { snow: { name: 'Twitter Snowflake (41 / 10 / 12)', t: 41, m: 10, s: 12, ml: 'Machine ID' }, insta: { name: 'Instagram (41 / 13 / 10)', t: 41, m: 13, s: 10, ml: 'Logical shard ID' } };
      const EP = { tw: ['Twitter epoch (4 Nov 2010)', 1288834974657n], ig: ['Instagram epoch (Aug 2011)', 1314220021721n], c24: ['Custom: 1 Jan 2024', 1704067200000n], unix: ['Unix epoch (1970)', 0n] };
      let lay = 'snow';
      el.innerHTML = `<div class="uiLay" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="row2" style="margin-top:12px">
          <div><label for="uiEp">Epoch</label><select id="uiEp">${Object.entries(EP).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></div>
          <div><label for="uiTs">Time (UTC, to the ms)</label><input id="uiTs" type="text" value="2026-01-15T10:30:00.123Z" style="font-family:var(--f-mono)"></div>
          <div><label for="uiM" class="uiML"></label><input id="uiM" type="number" min="0" step="1" value="37"></div>
          <div><label for="uiS">Sequence (which ID in this ms)</label><input id="uiS" type="number" min="0" step="1" value="5"></div>
        </div>
        <button type="button" class="btn small ghost uiNow" style="margin-top:10px">Use the current time</button>
        <div class="uiBits" style="margin-top:14px;font:13px/1.9 var(--f-mono);word-break:break-all;background:var(--surface-2);border-radius:var(--r-sm);padding:10px 12px"></div>
        <div class="uiLeg" style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;margin-top:6px;color:var(--ink-2)"></div>
        <div class="stats">
          <div class="stat"><span>ID (decimal)</span><strong class="uiDec" style="font-size:17px;word-break:break-all"></strong></div>
          <div class="stat"><span>Hex</span><strong class="uiHex" style="font-size:17px;word-break:break-all"></strong></div>
        </div>
        <div class="calc-note uiNote"></div>
        <h4 style="margin:22px 0 6px;font-family:var(--f-display)">Decode: break an ID back apart</h4>
        <label for="uiD">Any ID (decimal)</label><input id="uiD" type="text" inputmode="numeric" style="font-family:var(--f-mono)">
        <button type="button" class="btn small uiCopy" style="margin-top:8px">Put the ID from above here</button>
        <div class="stats">
          <div class="stat"><span>Created at (UTC)</span><strong class="uiDT" style="font-size:16px;word-break:break-all"></strong></div>
          <div class="stat"><span class="uiDML"></span><strong class="uiDM"></strong></div>
          <div class="stat"><span>Sequence</span><strong class="uiDS"></strong></div>
        </div>
        <div class="calc-note uiDN"></div>`;
      const q = s => el.querySelector(s);
      const fmt = b => b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      let lastId = null;
      const build = () => {
        const L = LAY[lay], ep = EP[q('#uiEp').value][1];
        const mMax = (1 << L.m) - 1, sMax = (1 << L.s) - 1;
        q('.uiML').textContent = `${L.ml} (0 - ${mMax})`;
        q('#uiM').max = mMax; q('#uiS').max = sMax;
        const ms = Date.parse(q('#uiTs').value);
        const m = Math.floor(Number(q('#uiM').value)), s = Math.floor(Number(q('#uiS').value));
        const err = isNaN(ms) ? 'Could not read the time. Write it like this: 2026-01-15T10:30:00.123Z'
          : !(m >= 0 && m <= mMax) ? `${L.ml} must be between 0 and ${mMax} (${L.m} bits).`
          : !(s >= 0 && s <= sMax) ? `Sequence must be between 0 and ${sMax} (${L.s} bits). When it reaches ${sMax + 1}, the generator waits for the next millisecond.`
          : BigInt(ms) < ep ? 'This time is before the epoch: the timestamp would be negative. Snowflake cannot make IDs before its epoch.'
          : BigInt(ms) - ep >= (1n << 41n) ? 'Out of 41 bits! A time more than ~69.7 years after the epoch does not fit in 41 bits.' : '';
        if (err) { q('.uiNote').textContent = err; q('.uiDec').textContent = '-'; q('.uiHex').textContent = '-'; q('.uiBits').textContent = '-'; lastId = null; return; }
        const t = BigInt(ms) - ep, sh = BigInt(L.m + L.s);
        const id = (t << sh) | (BigInt(m) << BigInt(L.s)) | BigInt(s);
        lastId = id;
        const bin = id.toString(2).padStart(64, '0');
        const seg = [[0, 1, 'var(--ink-3)'], [1, 1 + L.t, 'var(--accent)'], [1 + L.t, 1 + L.t + L.m, 'var(--violet)'], [64 - L.s, 64, 'var(--amber)']];
        q('.uiBits').innerHTML = seg.map(([a, b, c]) => `<span style="color:${c};font-weight:700">${bin.slice(a, b)}</span>`).join('<span style="color:var(--line-2)">|</span>');
        q('.uiLeg').innerHTML = `<span style="color:var(--ink-3)">■ sign 1</span><span style="color:var(--accent)">■ timestamp ${L.t}</span><span style="color:var(--violet)">■ ${L.ml.toLowerCase()} ${L.m}</span><span style="color:var(--amber)">■ sequence ${L.s}</span>`;
        q('.uiDec').textContent = fmt(id);
        q('.uiHex').textContent = '0x' + id.toString(16);
        const next = ((t + 1n) << sh) | (BigInt(m) << BigInt(L.s));
        const dcw = lay === 'snow' ? ` In Snowflake, machine ${m} = datacenter ${m >> 5}, worker ${m & 31}.` : '';
        q('.uiNote').textContent = `Timestamp part = ${fmt(t)} ms since the epoch. 1 ms later, on any machine, even with sequence 0, the ID will be at least ${fmt(next)}: bigger. So sorting by ID = sorting by time.${dcw}`;
      };
      const decode = () => {
        const L = LAY[lay], ep = EP[q('#uiEp').value][1];
        q('.uiDML').textContent = L.ml;
        const raw = q('#uiD').value.replace(/[^0-9]/g, '');
        if (!raw) { ['.uiDT', '.uiDM', '.uiDS'].forEach(c => q(c).textContent = '-'); q('.uiDN').textContent = 'Enter an ID (digits only).'; return; }
        const id = BigInt(raw);
        if (id >= (1n << 63n)) { ['.uiDT', '.uiDM', '.uiDS'].forEach(c => q(c).textContent = '-'); q('.uiDN').textContent = 'This is bigger than 63 bits: the sign bit would be 1, so it is not a valid Snowflake ID.'; return; }
        const sh = BigInt(L.m + L.s);
        const t = id >> sh, m = (id >> BigInt(L.s)) & ((1n << BigInt(L.m)) - 1n), s = id & ((1n << BigInt(L.s)) - 1n);
        q('.uiDT').textContent = new Date(Number(t + ep)).toISOString();
        q('.uiDM').textContent = m.toString();
        q('.uiDS').textContent = s.toString();
        q('.uiDN').textContent = `Just shift and mask: time = id >> ${L.m + L.s}, then + epoch. No database lookup. Careful: decoding is correct only if the layout and epoch are the same as when the ID was made.`;
      };
      const drawLay = () => {
        const box = q('.uiLay'); box.innerHTML = '';
        Object.keys(LAY).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (k === lay ? ' primary' : ''); b.textContent = LAY[k].name; b.onclick = () => { lay = k; q('#uiEp').value = k === 'insta' ? 'ig' : 'tw'; drawLay(); build(); decode(); }; box.appendChild(b); });
      };
      ['#uiTs', '#uiM', '#uiS'].forEach(s => q(s).addEventListener('input', build));
      q('#uiEp').addEventListener('change', () => { build(); decode(); });
      q('#uiD').addEventListener('input', decode);
      q('.uiNow').onclick = () => { q('#uiTs').value = new Date().toISOString(); build(); };
      q('.uiCopy').onclick = () => { if (lastId !== null) { q('#uiD').value = lastId.toString(); decode(); } };
      drawLay(); build();
      q('#uiD').value = lastId.toString(); decode();
    }},
    { type: 'h2', text: 'Instagram\'s variant: the ID is made inside the database' },
    { type: 'callout', tone: 'term', title: 'Logical shard', html: `<strong>What it is:</strong> thousands of small "virtual" pieces of data, spread over just a few real (physical) database servers. Like 2,000 folders kept in 4 cupboards.<br><strong>Why we need it:</strong> when you add servers, you move only some folders to the new cupboard; you do not have to hash all the data again.<br><strong>Without it:</strong> adding a server moves almost all the data around (sharding lesson).` },
    { type: 'p', html: `Instagram's engineering blog post "Sharding & IDs at Instagram" (2011) used the same idea as Snowflake, but instead of running a separate service, it made the ID <strong>inside Postgres</strong>. Their data was split into thousands of <strong>logical shards</strong>, which the code mapped onto a few physical database servers. Every logical shard was a Postgres <em>schema</em>.` },
    { type: 'ascii', text: `
Instagram ID = 64 bits
| timestamp: 41 bits | logical shard ID: 13 bits | sequence: 10 bits |
  ms since custom epoch  0 - 8191                    table sequence % 1024

Example post: data of user 31341, 2000 logical shards
  shard = 31341 % 2000 = 1341
  each shard: up to 1024 IDs every millisecond` },
    { type: 'list', items: [
      `<strong>How:</strong> each schema has a PL/pgSQL function (code that runs inside Postgres). On insert, it makes the ID from the current time, its own shard number, and the table's auto-increment sequence <code>% 1024</code>.`,
      `<strong>Shard instead of machine:</strong> in Snowflake the middle bits say "which machine made it". Here they say "which shard it lives in". Bonus: from the ID alone you know which shard holds the data, no separate lookup.`,
      `<strong>What it saved:</strong> no new ID service or coordination system to run. The price: the sequence is only 10 bits, so one shard can make up to 1,024 IDs per ms.`,
    ]},
    { type: 'p', html: `In the widget above, pick the "Instagram" layout and see how the bits move. Other systems like Discord also use their own Snowflake variants, with a different epoch and a different bit split. The pattern is the same: <strong>time | who | counter</strong>.` },

    { type: 'h2', text: 'Clock skew: when the clock itself lies' },
    { type: 'p', html: `Snowflake trusts the machine's clock completely. But server clocks are not perfect. They keep drifting a little ahead or behind (<strong>clock drift</strong>), and NTP corrects them. Sometimes correcting means moving the clock <strong>back</strong>.` },
    { type: 'callout', tone: 'term', title: 'NTP', html: `<strong>What it is:</strong> Network Time Protocol. Every machine matches its clock with a reference time server every so often.<br><strong>Why we need it:</strong> a computer's clock (a small crystal) drifts a few milliseconds ahead or behind every day (<strong>clock drift</strong>).<br><strong>Without it:</strong> within weeks, machine clocks are seconds apart, and the order of time-based IDs is useless.` },
    { type: 'callout', tone: 'term', title: 'Clock skew', html: `<strong>What it is:</strong> the difference between two machines' clocks, or between one machine's clock and the true time.<br><strong>Two dangers for Snowflake:</strong> (1) if NTP moves the clock <em>back</em>, the same milliseconds come again, and the same sequence = a <strong>duplicate ID</strong>. (2) If machine A's clock is 50 ms ahead, its IDs look bigger than IDs B makes later: the order is only "roughly" right.<br><strong>Without it (if you ignore it):</strong> silent duplicates or reversed order.` },
    { type: 'image', src: 'assets/img/unique-ids/nist-f1-atomic-clock.jpg', maxWidth: 320, alt: 'The NIST-F1 atomic clock: a tall metal frame above a table of lasers and optics', caption: 'NIST-F1, an atomic clock in the USA (1999). Clocks like this keep the world\'s "correct time". In the end, NTP servers get their time from reference clocks like these, and your servers match their clocks with NTP. Even so, because of network delay every server stays slightly different: that is clock skew.', credit: { text: 'NIST, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Nist-f1.jpg', license: 'Public domain' } },
    { type: 'flow', height: 360,
      nodes: [
        { id: 'a', label: 'App server A', sub: 'generator, m = 7', x: 360, y: 50, w: 160, kind: 'server', info: 'What it is: one of xyz.com\'s app servers. A Snowflake generator runs inside it. It remembers in memory: last_timestamp and sequence.' },
        { id: 'b', label: 'App server B', sub: 'generator, m = 8', x: 360, y: 310, w: 160, kind: 'server', info: 'What it is: a second app server with its own generator. Its machine ID must be different, or both can make the same ID.' },
        { id: 'zk', label: 'etcd / ZooKeeper', sub: 'machine ID lease', x: 110, y: 180, w: 170, kind: 'net', info: 'What it is: a small, very reliable coordination store (key-value). At startup each generator "leases" a machine ID from here (while it is alive, that number is only its own). It is not needed for every ID, only at startup. (Twitter\'s Snowflake README only says the machine ID is "configured"; taking a lease is today\'s general industry approach so that two machines never get the same number by mistake.)' },
        { id: 'ntp', label: 'NTP server', sub: 'correct time', x: 610, y: 180, w: 150, kind: 'net', info: 'What it is: a server that tells the time (a reference). Machines match their clocks with it every so often. The Snowflake README also says to run NTP.' },
        { id: 'db', label: 'Posts DB', sub: 'id PRIMARY KEY', x: 360, y: 180, w: 160, kind: 'data', info: 'What it is: the posts database. The ID is the primary key, so inserting a duplicate ID gives an error. This is the last line of defence, not the first.' },
      ],
      edges: [{ a: 'a', b: 'zk' }, { a: 'b', b: 'zk' }, { a: 'a', b: 'ntp' }, { a: 'b', b: 'ntp' }, { a: 'a', b: 'db' }, { a: 'b', b: 'db' }],
      scenarios: [
        { name: 'Normal', steps: [
          { title: 'Startup: get a machine ID', text: 'Server A took a lease: machine 7. B got 8.', parallel: true, go: ['a>zk', 'res:zk>a', 'b>zk', 'res:zk>b'], msg: 'lease /snowflake/workers/7 → server A' },
          { title: 'Clock sync', text: 'It matched its time with NTP.', go: ['a>ntp', 'res:ntp>a'] },
          { title: 'ID made locally, no network call', text: 'Clock + machine 7 + sequence. In microseconds.', focus: ['a'], after: { a: { sub: 'last_ts = t, seq = 0' } }, msg: 'id = (t - epoch) << 22 | 7 << 12 | 0' },
          { title: 'Insert', text: 'The post goes into the DB with its ID.', go: ['a>db', 'res:db>a'] },
        ]},
        { name: 'Clock went back', steps: [
          { title: 'An ID was just made', text: 'It remembers last_timestamp = 10:30:00.105.', focus: ['a'], set: { a: { sub: 'last_ts = .105' } } },
          { title: 'NTP moved the clock 5 ms back', text: 'Now A\'s clock says 10:30:00.100. If the generator ran blindly, the milliseconds .100 to .105 would come again, with the same sequence numbers: duplicate IDs.', go: ['ntp>a'], after: { a: { state: 'warn', sub: 'now .100 < last .105' } } },
          { title: 'The generator refuses', text: 'Check: now < last_timestamp? Then give no ID. The README of Twitter\'s Snowflake code says exactly this: stop generating IDs until the clock passes the time of the last ID. If the gap is small, just wait; if it is big, error + alert.', go: 'bad:a>db', msg: 'Clock moved backwards. Refusing to generate id for 5 ms' },
          { title: 'All normal after 5 ms', text: 'The clock passed .105, and IDs flow again. A better setup: let NTP adjust the clock slowly (slew), not jump it back (step).', set: { a: { state: 'ok', sub: 'now .106 > last .105' } }, go: ['a>db', 'res:db>a'] },
        ]},
        { name: 'Same machine ID', intro: 'A mistake in the deploy script: B also got machine 7 from config, without taking a lease.', steps: [
          { title: 'Both are machine 7', text: 'Now two generators use the same "name".', set: { b: { state: 'warn', sub: 'generator, m = 7 (!)' } }, focus: ['a', 'b'] },
          { title: 'Same millisecond, same sequence', text: 'Both made their first ID at 10:30:00.200: same time, same machine, same sequence 0. The same ID, bit for bit.', parallel: true, go: ['a>db', 'b>db'], msg: 'A: 2011747689087135744\nB: 2011747689087135744   (same!)' },
          { title: 'The DB caught it (this time)', text: 'The primary key rejected the second insert. But if the ID had already gone into a cache, a queue or another shard, the mistake would spread silently. So always give machine IDs from a lease/registry, never by hand from config.', go: ['res:db>a', 'bad:db>b'], after: { db: { state: 'warn', sub: 'duplicate key!' } }, msg: 'ERROR: duplicate key value violates unique constraint "posts_pkey"' },
        ]},
        { name: 'Sequence ran out', steps: [
          { title: '4,096 in one ms', text: 'A viral moment: A needs more than 4,096 IDs in one millisecond.', flood: { paths: ['a>db'], n: 8 }, after: { a: { state: 'hot', sub: 'seq = 4095' } } },
          { title: 'Wait for the next ms', text: 'The 12-bit sequence is used up. The generator waits until the next millisecond, then the sequence starts at 0. So one machine tops out at about 40 lakh IDs per second. Need more? Add more generators (machine IDs).', set: { a: { state: '', sub: 'next ms, seq = 0' } }, go: ['a>db', 'res:db>a'] },
        ]},
      ],
    },
    { type: 'h2', text: 'ID lab: every method on the same story' },
    { type: 'p', html: `Now <strong>run</strong> each method yourself. Three app servers (A, B, C) are creating posts. Pick a mode above: each mode gives IDs to the same posts in its own way, and the table shows its inner state. Below you get the answer to three questions: were duplicates made? Does sorting by ID give the true time order? How many times did we call a central server?` },
    { type: 'list', items: [
      `<strong>One DB auto-increment:</strong> all correct, but "Central calls" grows with every post. That is the bottleneck and the SPOF.`,
      `<strong>Each shard has its own counter:</strong> look at the red DUPLICATE. This is the problem the lesson started with.`,
      `<strong>Step offsets:</strong> no duplicates, but A is busy so its IDs race ahead: the sort order breaks.`,
      `<strong>Ticket server:</strong> only 4 calls for 11 IDs (thanks to ranges). The order is rough.`,
      `<strong>UUIDv4 / UUIDv7 / ULID:</strong> the v4 sort order is completely mixed up; v7 and ULID are correct. Size 16 bytes.`,
      `<strong>Snowflake:</strong> 8 bytes, zero calls, correct order. Now try clock skew: <em>Reset</em> → "Set A's clock 8 ms back" → "Post: server A". The safe generator refuses (REFUSED). Then tick "naive": the same ID is made again (DUPLICATE). Do the same in UUIDv7 mode: no duplicate (the random part saves it), but the order breaks.`,
    ]},
    { type: 'custom', render(el) {
      const MODES = {
        db: { name: 'One DB auto-increment', bytes: 8, how: 'For every post, the next number from the central DB. Unique and sorted, but every ID is a network call, and if that DB falls, everything stops.' },
        shard: { name: 'Each shard has its own counter', bytes: 8, how: 'A, B and C all count from 1. Duplicates right away.' },
        offset: { name: 'Step offsets (N=3)', bytes: 8, how: 'A: 1, 4, 7...  B: 2, 5, 8...  C: 3, 6, 9...  Unique, but the busy server races ahead: the order breaks.' },
        ticket: { name: 'Ticket server (range 5)', bytes: 8, how: 'Each server takes a range of 5 IDs from the ticket server, then hands them out locally. Few calls, unique IDs, order only roughly right. The base62 short code is shown too.' },
        uuid4: { name: 'UUIDv4', bytes: 16, how: '122 random bits. No coordination, but the ID tells you nothing about time order.' },
        uuid7: { name: 'UUIDv7', bytes: 16, how: 'First 48 bits = milliseconds, the rest random. Within the same ms the random part goes +1 (monotonic). Sort = time order.' },
        ulid: { name: 'ULID', bytes: 16, how: '48 bits ms + 80 random, 26 characters (Crockford base32). Same idea as UUIDv7, written differently.' },
        snow: { name: 'Snowflake', bytes: 8, how: '41 bits time | 10 bits machine (A=1, B=2, C=3) | 12 bits sequence. No network call, 64-bit, sorted.' },
      };
      const T0 = Date.UTC(2026, 0, 15, 10, 30, 0, 0), EPOCH = 1288834974657n, MID = { A: 1n, B: 2n, C: 3n };
      const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ', B62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const b62 = n => { let s = ''; n = BigInt(n); do { s = B62[Number(n % 62n)] + s; n /= 62n; } while (n > 0n); return s; };
      const DEF = [['post', 'A'], ['post', 'B'], ['post', 'A'], ['post', 'A'], ['post', 'C'], ['burst', 'A'], ['post', 'B']];
      let mode = 'snow', script = DEF.slice(), naive = false;
      el.innerHTML = `<div class="uiLabM" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="calc-note uiLabHow" style="margin-top:8px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
          <button type="button" class="btn small primary" data-a="post" data-s="A">Post: server A</button>
          <button type="button" class="btn small primary" data-a="post" data-s="B">Post: server B</button>
          <button type="button" class="btn small primary" data-a="post" data-s="C">Post: server C</button>
          <button type="button" class="btn small" data-a="burst" data-s="A">Viral: 5 posts on A in one ms</button>
          <button type="button" class="btn small" data-a="back" data-s="A">Set A's clock 8 ms back</button>
          <button type="button" class="btn small ghost" data-a="reset">Reset</button>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px"><input type="checkbox" class="uiLabNaive"> Snowflake generator is "naive" (no check for the clock going back)</label>
        <div style="overflow-x:auto;margin-top:10px"><table class="uiLabT" style="width:100%;border-collapse:collapse;font:12px var(--f-mono)"></table></div>
        <div class="stats">
          <div class="stat"><span>IDs made</span><strong class="uiLabN"></strong></div>
          <div class="stat"><span>Duplicates</span><strong class="uiLabD"></strong></div>
          <div class="stat"><span>Sort by ID = time order?</span><strong class="uiLabS"></strong></div>
          <div class="stat"><span>Central calls</span><strong class="uiLabC"></strong></div>
          <div class="stat"><span>Size per ID</span><strong class="uiLabB"></strong></div>
        </div>
        <div class="calc-note uiLabNote"></div>`;
      const q = s => el.querySelector(s);
      const run = () => {
        let seed = 42;
        const rnd32 = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return BigInt(((t ^ (t >>> 14)) >>> 0)); };
        const rbits = n => { let v = 0n; for (let i = 0; i < Math.ceil(n / 32); i++) v = (v << 32n) | rnd32(); return v & ((1n << BigInt(n)) - 1n); };
        let clock = T0; const off = { A: 0, B: 0, C: 0 };
        const st = { ctr: 0, c: { A: 0, B: 0, C: 0 }, nx: { A: 1, B: 2, C: 3 }, T: 0, rg: {}, calls: 0, last: {}, seq: {}, mono: {} };
        const rows = []; let refused = 0;
        const gen = (s, local) => {
          if (mode === 'db') { st.calls++; return { v: BigInt(++st.ctr) }; }
          if (mode === 'shard') return { v: BigInt(++st.c[s]) };
          if (mode === 'offset') { const v = st.nx[s]; st.nx[s] += 3; return { v: BigInt(v) }; }
          if (mode === 'ticket') { let r = st.rg[s]; if (!r || r.n > r.e) { st.calls++; r = st.rg[s] = { n: st.T + 1, e: st.T + 5 }; st.T += 5; } const v = r.n++; return { v: BigInt(v), extra: 'base62: ' + b62(v) }; }
          if (mode === 'uuid4') { let v = rbits(128); v = (v & ~(0xFn << 76n)) | (4n << 76n); v = (v & ~(3n << 62n)) | (2n << 62n); return { v, hex: true }; }
          if (mode === 'uuid7' || mode === 'ulid') {
            const ms = BigInt(local); let r;
            const m = st.mono[s];
            if (m && m.ms === ms) r = m.r + 1n; else r = mode === 'ulid' ? rbits(80) : rbits(74);
            st.mono[s] = { ms, r };
            if (mode === 'ulid') return { v: (ms << 80n) | r, b32: true };
            const ra = r >> 62n, rb = r & ((1n << 62n) - 1n);
            return { v: (ms << 80n) | (7n << 76n) | (ra << 64n) | (2n << 62n) | rb, hex: true };
          }
          // snowflake
          const last = st.last[s];
          if (last !== undefined && local < last && !naive) return null;
          if (local === last) st.seq[s]++; else st.seq[s] = 0;
          st.last[s] = local;
          return { v: ((BigInt(local) - EPOCH) << 22n) | (MID[s] << 12n) | BigInt(st.seq[s]) };
        };
        const fmtId = g => {
          if (g.b32) { let v = g.v, s = ''; for (let i = 0; i < 26; i++) { s = B32[Number(v % 32n)] + s; v /= 32n; } return s; }
          if (g.hex) { const h = g.v.toString(16).padStart(32, '0'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; }
          return g.v.toString();
        };
        script.forEach(([a, s]) => {
          if (a === 'back') { off[s] -= 8; rows.push({ note: `${s}'s clock moved 8 ms back (NTP step)` }); return; }
          const n = a === 'burst' ? 5 : 1;
          clock += 2;
          for (let k = 0; k < n; k++) {
            const local = clock + off[s];
            const g = gen(s, local);
            if (!g) { refused++; rows.push({ s, local, refused: true }); continue; }
            rows.push({ s, local, g, id: fmtId(g), k: rows.filter(r => r.g).length });
          }
        });
        return { rows, refused, calls: st.calls };
      };
      const draw = () => {
        const mb = q('.uiLabM'); mb.innerHTML = '';
        Object.keys(MODES).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = MODES[k].name; b.onclick = () => { mode = k; draw(); }; mb.appendChild(b); });
        q('.uiLabHow').textContent = MODES[mode].how;
        const R = run(), ok = R.rows.filter(r => r.g);
        const cnt = {}; ok.forEach(r => { cnt[r.id] = (cnt[r.id] || 0) + 1; });
        const dups = ok.filter(r => cnt[r.id] > 1).length;
        const sorted = ok.slice().sort((x, y) => (x.g.v < y.g.v ? -1 : x.g.v > y.g.v ? 1 : 0));
        const inOrder = sorted.every((r, i) => i === 0 || r.k > sorted[i - 1].k);
        const th = 'text-align:left;padding:4px 6px;border-bottom:1px solid var(--line-2);color:var(--ink-3);font-family:var(--f-body)';
        q('.uiLabT').innerHTML = `<tr><th style="${th}">#</th><th style="${th}">Server</th><th style="${th}">Clock (ms)</th><th style="${th}">ID</th></tr>` + R.rows.map(r => {
          if (r.note) return `<tr><td colspan="4" style="padding:4px 6px;color:var(--amber)">⏱ ${r.note}</td></tr>`;
          if (r.refused) return `<tr><td style="padding:4px 6px">-</td><td style="padding:4px 6px">${r.s}</td><td style="padding:4px 6px">.${String(r.local - T0).padStart(3, '0')}</td><td style="padding:4px 6px;color:var(--red)">REFUSED: clock is behind the last ID</td></tr>`;
          const d = cnt[r.id] > 1;
          return `<tr><td style="padding:4px 6px">${r.k + 1}</td><td style="padding:4px 6px">${r.s}</td><td style="padding:4px 6px">.${String(r.local - T0).padStart(3, '0')}</td><td style="padding:4px 6px;word-break:break-all;color:${d ? 'var(--red)' : 'var(--ink)'};font-weight:${d ? 700 : 400}">${r.id}${r.g.extra ? ` <span style="color:var(--ink-3)">(${r.g.extra})</span>` : ''}${d ? ' DUPLICATE' : ''}</td></tr>`;
        }).join('');
        q('.uiLabN').textContent = ok.length;
        q('.uiLabD').textContent = dups;
        q('.uiLabD').style.color = dups ? 'var(--red)' : '';
        q('.uiLabS').textContent = inOrder ? 'Yes' : 'No';
        q('.uiLabS').style.color = inOrder ? 'var(--green)' : 'var(--red)';
        q('.uiLabC').textContent = R.calls;
        q('.uiLabB').textContent = MODES[mode].bytes + ' bytes';
        q('.uiLabNote').textContent = `Creation order after sorting by ID: ${sorted.map(r => '#' + (r.k + 1)).join(' ')}.` + (R.refused ? ` ${R.refused} ID(s) refused (safe generator).` : '') + (dups ? ' Duplicate IDs = two different posts with the same name: data corruption.' : '');
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'reset') script = DEF.slice(); else script.push([a, b.dataset.s]); draw(); });
      q('.uiLabNaive').addEventListener('change', e => { naive = e.target.checked; draw(); });
      draw();
    }},
    { type: 'h2', text: 'Everything at a glance' },
    { type: 'table', head: ['Method', 'Size', 'Time sortable', 'Coordination', 'Weakness', 'When'], rows: [
      ['DB auto-increment', '64-bit', 'Yes (in one DB)', 'One DB', 'SPOF, not unique across shards, shows your count', 'Small app, one database'],
      ['Step offsets', '64-bit', 'No (across servers)', 'Config', 'Hard to add a server', 'Two or three masters'],
      ['Ticket server (+ ranges)', '64-bit', 'Roughly', 'A call per ID/range', 'Central bottleneck', 'Short codes (URL shortener)'],
      ['UUIDv4', '128-bit', 'No', 'None', 'Big, bad for indexes', 'Just uniqueness, offline IDs'],
      ['UUIDv7 / ULID', '128-bit', 'Yes', 'None', 'Big, shows the time', 'Time order + no setup'],
      ['Snowflake', '64-bit', 'Yes (k-sorted)', 'Only the machine ID', 'Depends on the clock, machine IDs to manage', 'Tweets, messages, feeds, at big scale'],
      ['Instagram variant', '64-bit', 'Yes', 'Inside the DB', '1,024 IDs/ms per shard', 'Sharded Postgres, the ID also tells the shard'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Need IDs <strong>roughly in time order</strong> (feeds, messages)? <strong>Snowflake</strong> (if you need 64-bit) or <strong>UUIDv7</strong> (if you want no setup). Just need uniqueness? <strong>UUIDv4</strong>. Short codes that people can read (URL shortener)? <strong>A counter or a pre-allocated key range</strong>, in base62. Is one database enough? Then auto-increment is fine; do not add needless complexity.` },
    { type: 'diagram', title: 'Unique IDs: the whole picture in xyz.com', height: 610,
      groups: [
        { label: 'Users', x: 200, y: 14, w: 320, h: 92 },
        { label: 'Data', x: 270, y: 372, w: 400, h: 226 },
      ],
      nodes: [
        { id: 'u', label: 'xyz.com app', sub: 'new post', x: 360, y: 66, kind: 'client', info: 'What it is: the user\'s phone or browser. It sends the post and knows nothing about IDs.' },
        { id: 'lb', label: 'Load balancer', x: 360, y: 168, kind: 'net', info: 'What it is: it spreads requests over the app servers (LB lesson). Whichever server gets the request, the ID will be unique.' },
        { id: 'a1', label: 'App server A', sub: 'Snowflake, m = 7', x: 265, y: 288, w: 150, kind: 'server', info: 'What it is: an xyz.com app server with a Snowflake generator inside. The ID comes from time + machine 7 + sequence, with no network call, in microseconds.' },
        { id: 'a2', label: 'App server B', sub: 'Snowflake, m = 8', x: 455, y: 288, w: 150, kind: 'server', info: 'What it is: a second app server, machine ID 8. Because the machine IDs differ, A and B never make the same ID.' },
        { id: 'zk', label: 'etcd / ZooKeeper', sub: 'machine ID lease', x: 110, y: 168, w: 150, kind: 'net', info: 'What it is: a coordination store. Every app server leases its machine ID from here at startup, so two servers never get the same number. Only at startup, not for every ID.' },
        { id: 'ntp', label: 'NTP server', sub: 'correct time', x: 610, y: 168, w: 150, kind: 'net', info: 'What it is: the time reference. Every app server matches its clock with it. If the clock goes back, the generator gives no ID until the time moves ahead again.' },
        { id: 'tk', label: 'Ticket server', sub: 'ranges + base62', x: 95, y: 430, w: 150, kind: 'data', info: 'What it is: the counter for the URL shortener. The app server takes a range of 1,000 numbers at once, and turns each number into a short base62 code (like gN).' },
        { id: 'db', label: 'Posts DB', sub: 'id BIGINT, sharded', x: 360, y: 430, w: 150, kind: 'data', info: 'What it is: the posts database, in many shards. The ID is the primary key (duplicate = error). A 64-bit ID keeps the index small, and growing IDs are added at the end of the index.' },
        { id: 'kf', label: 'Events (Kafka)', sub: 'key = post id', x: 575, y: 430, w: 150, kind: 'queue', info: 'What it is: a stream of events (Kafka lesson). Every event carries the post ID, so cache, search and notifications all talk using the same ID. A duplicate ID would spread silently from here.' },
        { id: 'fd', label: 'Feed query', sub: 'ORDER BY id DESC', x: 360, y: 545, w: 170, kind: 'server', info: 'What it is: the code that builds the feed. IDs are time-sorted, so "newest first" is just a sort by ID, and pagination uses "id < last_id".' },
      ],
      edges: [
        { a: 'u', b: 'lb', n: 1, label: 'POST /posts' },
        { a: 'lb', b: 'a1', n: 2 },
        { a: 'lb', b: 'a2' },
        { a: 'a1', b: 'zk', label: 'lease m=7', dashed: true },
        { a: 'a2', b: 'ntp', label: 'time sync', dashed: true },
        { a: 'a1', b: 'db', n: 3, label: 'INSERT id' },
        { a: 'a2', b: 'db' },
        { a: 'a1', b: 'tk', label: 'short code', dashed: true },
        { a: 'db', b: 'kf', label: 'events', kind: 'evt' },
        { a: 'fd', b: 'db', label: 'sort by ID' },
      ],
      paths: [
        { name: 'New post', text: 'The request went to any app server. That server makes a Snowflake ID locally (time | machine | sequence) and writes it to the DB. No central call.', go: ['u>lb>a1>db', 'db>kf'] },
        { name: 'Startup', text: 'A server first leases a machine ID and matches its clock with NTP. Only then does it start making IDs.', go: ['a1>zk', 'a2>ntp'] },
        { name: 'Feed', text: 'IDs are time-sorted, so the feed just sorts by ID. No separate created_at index needed.', go: ['fd>db'] },
        { name: 'Short link', text: 'For the URL shortener\'s short codes: a range from the ticket server, then base62.', go: ['a1>tk'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>An ID should be: unique, fast, often time-sorted, small (64-bit), and sometimes not guessable.</li>
      <li>Auto-increment: best while you have one DB. Collisions across shards, and a SPOF.</li>
      <li>Step offsets: unique, but the order breaks and adding a server is hard. Ticket server + ranges: few calls, small numbers (base62 codes).</li>
      <li>UUIDv4: zero coordination, 128-bit, no order, heavy on indexes. A 50% chance of a duplicate at ~2.7 × 10^18 IDs.</li>
      <li>UUIDv7 / ULID: 48-bit ms time at the start, the rest random: sorted and coordination-free, but 16 bytes.</li>
      <li>Snowflake: 1 + 41 time + 10 machine + 12 sequence = 64 bits. ~69.7 years, 4,096 IDs/ms/machine. Instagram: 41 + 13 shard + 10.</li>
      <li>Clock skew: a clock going back risks duplicates, so the generator must refuse. Give machine IDs through a lease.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['IDs without collisions across shards and machines', 'Snowflake/UUIDv7: no network call, made in microseconds', 'Time-sortable IDs make feeds and pagination cheap', '64-bit IDs: smaller indexes, faster joins', 'The ID itself tells you the time (and, at Instagram, the shard)'], costs: ['Snowflake depends on the clock: clock skew must be handled', 'Machine IDs must be kept unique (lease, registry)', 'Order is only rough: IDs from different machines can be slightly mixed', 'UUID size (16 bytes) and the effect of v4 on indexes', 'Time-based IDs reveal creation time; sequential IDs reveal your count'] },
    { type: 'think', questions: [
      { q: 'xyz.com chat app: messages in a conversation must show in the right order. If we sort by Snowflake IDs, can the order ever be wrong?', a: 'Yes, a little. If two servers\' clocks differ by a few ms, messages sent within 1-2 ms of each other can appear reversed. For most chats this is fine. If you need strict order, let all messages of one conversation take a sequence number from one place (one partition/shard), or keep the order in which the server received them.' },
      { q: 'You have 2,000 app servers making Snowflake IDs. What is the problem?', a: '10 bits hold only 1,024 machine IDs. Options: change the bit split (for example 12 bits machine, 10 bits sequence, if 1,024/ms per machine is enough), or make IDs on a few dedicated servers, or lease machine IDs and give them only to active generators.' },
      { q: 'A mobile app is offline (on a flight) and the user writes 5 notes. It syncs once it is online. Who should make the notes\' IDs, and with which scheme?', a: 'The phone itself. Offline there is no DB and no ticket server, and giving phones Snowflake machine IDs is hard (crores of phones, only 1,024 numbers). UUIDv7 (or ULID) is best: no coordination, and time order too. The phone\'s clock may be wrong, so also keep a separate received_at on the server.' },
      { q: 'A payment\'s order ID goes into the customer\'s email and URL. Auto-increment, Snowflake or UUIDv4?', a: 'Auto-increment reveals your count and lets people guess the next order. Snowflake also reveals the time and gives hints. It is safer to keep the ID people see random like UUIDv4, even if inside the database the primary key is a Snowflake/BIGINT. And an authorization check is needed in every case.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'How are the 64 bits of a Snowflake ID split?', options: ['32 time + 32 random', '1 sign + 41 timestamp + 10 machine + 12 sequence', '48 time + 80 random'], answer: 1, explain: 'The timestamp is in the highest bits, so a bigger ID = made later. 48 + 80 is ULID (128 bits).' },
      { q: 'Why does Snowflake use a custom epoch?', options: ['For security', 'So the ~69 years of 41 bits are counted from the system\'s launch, not from 1970', 'So the ID looks shorter in decimal'], answer: 1, explain: 'Counting from 1970 would have already used up about 40 years of the range.' },
      { q: 'The generator sees that the clock is behind the time of the last ID. What is the right step?', options: ['Keep going', 'Stop giving IDs until the clock moves ahead (wait if the gap is small, error/alert if it is big)', 'Reset the sequence to 0'], answer: 1, explain: 'If it keeps going with a clock that went back, the same milliseconds and sequence come again: duplicate IDs. Twitter\'s Snowflake README does exactly this: refuse until the clock moves ahead.' },
      { q: 'Why can inserts get slow in a big table with a random UUIDv4 primary key?', options: ['Making a UUID takes time', 'New keys fall at random places in the B-tree index: more page splits and cache misses', 'UUIDs are not unique'], answer: 1, explain: 'Growing IDs (auto-increment, Snowflake, UUIDv7) are added at the end of the index, which stays in RAM.' },
      { q: 'With step offsets (A: 1, 4, 7... B: 2, 5, 8...), A gets 10 posts, then B gets one. What is B\'s new post ID, and what is the problem?', options: ['31, all fine', '2: it is unique, but smaller than A\'s older posts (like 28), so sorting by ID puts the new post behind them', 'A duplicate is made'], answer: 1, explain: 'Each server grows in its own lane at its own speed. It stays unique, but not in time order. The "Step offsets" mode in the ID lab shows this.' },
      { q: 'What is in the first 48 bits of a UUIDv7?', options: ['The machine\'s MAC address', 'Unix time, in milliseconds', 'Random bits'], answer: 1, explain: 'That is why v7 sorts by time. The other bits hold the version (7), the variant and the random part.' },
      { q: 'You made 100 crore (10^9) UUIDv4s. Roughly what is the chance of at least one duplicate?', options: ['50%', '1%', '~10^-19 (almost zero)'], answer: 2, explain: 'Birthday formula: n² / 2·2^122 ≈ 9.4 × 10^-20. To reach 50% you need about 2.7 × 10^18 UUIDs.' },
      { q: 'How did Flickr stop collisions between its two ticket servers?', options: ['Both gave random numbers', 'One odd, one even: auto-increment-increment 2, offsets 1 and 2', 'A ZooKeeper lock'], answer: 1, explain: 'The step offset trick. Both count in separate lanes, never the same number.' },
    ]},
    { type: 'sources', note: 'Details of the real systems come from these posts and specs. The Twitter, Flickr and Instagram posts are from 2010-2011; their systems may have changed since.', items: [
      { title: 'Announcing Snowflake', publisher: 'Twitter Engineering blog', official: true, year: 2010, url: 'https://blog.x.com/engineering/en_us/a/2010/announcing-snowflake', used: 'Why Twitter needed it (MySQL to Cassandra), uncoordinated, roughly sortable, 64-bit requirement.' },
      { title: 'twitter-archive/snowflake (snowflake-2010 README and code)', publisher: 'Twitter on GitHub', official: true, year: 2010, url: 'https://github.com/twitter-archive/snowflake/tree/snowflake-2010', used: '41-bit time with custom epoch (~69 years), 10-bit configured machine id, 12-bit sequence, k-sorted within ~1 s, refuses to generate when clock moves backwards, use NTP; epoch 1288834974657.' },
      { title: 'Ticket Servers: Distributed Unique Primary Keys on the Cheap', publisher: 'Code.flickr.net', official: true, year: 2010, url: 'https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap/', used: 'Why not GUIDs, Tickets64 table with REPLACE INTO and LAST_INSERT_ID, two servers with odd/even offsets.' },
      { title: 'Sharding & IDs at Instagram', publisher: 'Instagram Engineering blog', official: true, year: 2011, url: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c', used: '41/13/10 bit layout, logical shards as Postgres schemas mapped to fewer physical servers, PL/pgSQL ID function, 31341 % 2000 = 1341 example, 1024 IDs per shard per ms.' },
      { title: 'RFC 9562: Universally Unique IDentifiers (UUIDs)', publisher: 'IETF', official: true, year: 2024, url: 'https://www.rfc-editor.org/rfc/rfc9562.html', used: 'Obsoletes RFC 4122; UUIDv4 has 122 random bits; UUIDv7 layout (48-bit ms timestamp, ver, rand_a, var, rand_b); recommends v7 over v1/v6; index locality; monotonic counter methods.' },
      { title: 'ULID specification', publisher: 'ulid/spec on GitHub', url: 'https://github.com/ulid/spec', used: '48-bit ms timestamp + 80 random bits, 26-char Crockford base32, monotonic within same ms.' },
    ]},
  ],
});
