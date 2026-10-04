Lesson.register({
  id: 'numbers',
  title: 'Numbers worth remembering',
  minutes: 28,
  summary: `If someone asks in an interview "how many servers do we need?", you need your head, not a calculator. With about 15 numbers and a few tricks (count the zeros, a day = 10^5 seconds) you can estimate QPS, storage, latency and downtime in seconds. In this lesson: powers of 10 and 2 from scratch, lakh/crore ↔ million/billion, units of data, the latency ladder (the "1 ns = 1 second" game), how much one machine can handle (calculator), the nines of availability, and flashcards.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine your friend asks: "10 million people will visit my website tomorrow. How many computers do I need?" You do not open a calculator. You work it out in your head.<br>For this you need two things: a trick to make big numbers easy (count the zeros), and a few numbers you remember: how many seconds are in a day, how big a photo is, how much work one computer can do, and how slow each thing is.<br>This lesson has those ~15 numbers and tricks, with games to practise them. Later lessons use them to answer "how many servers?".` },

    { type: 'h2', text: 'The problem: "How many servers do we need?"' },
    { type: 'p', html: `So far we have learned many building blocks for xyz.com: Load Balancer, Cache, replicas, sharding, queues, CDN. But one question was always left: <em>when</em> do we add them? Is one server enough, or do we need 500? One database or 50 shards? Is a cache really needed, or is it just fashion?` },
    { type: 'p', html: `The answer does not come from a feeling. It comes from <strong>numbers</strong>. But in an interview or a design meeting nobody opens a spreadsheet. There you need <strong>napkin maths</strong>: maths so rough that it fits on a paper napkin, and still gives the right design decision.` },
    { type: 'callout', tone: 'term', title: 'New word: Napkin maths (back-of-the-envelope estimation)', html: `<strong>What it is:</strong> rough, quick maths, small enough to fit on a napkin or on the back of an envelope. You do not need the exact answer. You only need to know if the answer is around 10, around 1,000, or around 1 million.<br><strong>Why we need it:</strong> the big design decisions (do we need a cache? sharding? 5 servers or 500?) can be made from this rough size, in 2 minutes.<br><strong>Without it:</strong> either you design by guessing (sometimes far too expensive, sometimes the site falls over on launch day), or you build a spreadsheet for every question.` },

    { type: 'h2', text: 'A small warm-up first: powers of 10' },
    { type: 'p', html: `All the numbers in this lesson are very big: tens of millions of users, billions of requests, terabytes of data. There is one easy way to handle them: <strong>count the zeros</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Power of 10 (10^n)', html: `<strong>What it is:</strong> <code>10^n</code> (read "10 to the power n") means 1 followed by <strong>n zeros</strong>. 10^3 = 1,000 (3 zeros). 10^6 = 1,000,000 (6 zeros). Sometimes it is written as <code>1e6</code>; it means the same thing.<br><strong>Why we need it:</strong> multiplying and dividing big numbers becomes a game of adding and subtracting zeros.<br><strong>Without it:</strong> long division like 2,000,000,000 ÷ 86,400, with lots of chances to make a mistake.` },
    { type: 'p', html: `Just remember two rules:` },
    { type: 'list', items: [
      `<strong>Multiply = add the zeros.</strong> 10^3 × 10^6 = 10^(3+6) = 10^9. For example 1,000 × 1,000,000 = 1,000,000,000 (9 zeros).`,
      `<strong>Divide = subtract the zeros.</strong> 10^9 ÷ 10^5 = 10^(9−5) = 10^4 = 10,000.`,
      `<strong>Handle the front number separately.</strong> 2 × 10^9 ÷ 10^5 = 2 × 10^4 = 20,000. First do the maths with the small numbers (2), then with the zeros.`,
    ]},
    { type: 'p', html: `Now the Indian and international names. In India we say lakh and crore, but the computer world (and all docs and interviews) says thousand, million, billion. Look at how they connect, once:` },
    { type: 'table', head: ['Zeros', 'Power', 'International', 'Indian', 'Example'], rows: [
      ['3', '10^3', '1 thousand', '1 thousand (hazaar)', '1,000 users'],
      ['5', '10^5', '100 thousand', '1 lakh', 'seconds in a day (roughly)'],
      ['6', '10^6', '1 million', '10 lakh', 'a small city'],
      ['7', '10^7', '10 million', '1 crore', 'daily page views of xyz.com'],
      ['9', '10^9', '1 billion', '100 crore', 'India\'s population ~1.4 billion (140 crore)'],
      ['12', '10^12', '1 trillion', '1 lakh crore', 'bytes in 1 TB'],
    ], caption: 'Trick: 1 million = 10 lakh, 1 crore = 10 million, 1 billion = 100 crore. The international names change every 3 zeros; that is why they match bytes (KB, MB, GB) directly.' },
    { type: 'callout', tone: 'term', title: 'New word: Order of magnitude', html: `<strong>What it is:</strong> the "size class" of a number: roughly how many zeros it has. 3,000 and 7,000 are both in the thousands: the same order (10^3). 3,000 and 300,000 differ by 100 times: two orders apart.<br><strong>Why we need it:</strong> this is the whole game of napkin maths: <em>get the order right</em>. With 1,157 or 1,000 the design stays the same; with 1,000 or 100,000 it is completely different.<br><strong>Without it:</strong> people get stuck on decimals and forget the real question ("one server or a hundred?").` },
    { type: 'p', html: `Try it yourself. Type any number and choose a unit: you will see the number in Indian, international and power-of-10 form.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Number</label><input class="nmCvN" type="number" value="5" min="0" step="any"></div>
          <div><label>Unit</label><select class="nmCvU">
            <option value="1">(none)</option><option value="1e3">thousand</option><option value="1e5">lakh</option><option value="1e6" selected>million</option><option value="1e7">crore</option><option value="1e9">billion</option><option value="1e12">trillion</option>
          </select></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Full number</span><strong class="nmCvF"></strong></div>
          <div class="stat"><span>Power of 10</span><strong class="nmCvP"></strong></div>
          <div class="stat"><span>International</span><strong class="nmCvI"></strong></div>
          <div class="stat"><span>Indian</span><strong class="nmCvH"></strong></div>
        </div>
        <div class="calc-note nmCvT"></div>`;
      const r3 = x => +x.toPrecision(3);
      const intl = n => n >= 1e12 ? r3(n / 1e12) + ' trillion' : n >= 1e9 ? r3(n / 1e9) + ' billion' : n >= 1e6 ? r3(n / 1e6) + ' million' : n >= 1e3 ? r3(n / 1e3) + ' thousand' : String(r3(n));
      const indn = n => n >= 1e7 ? r3(n / 1e7).toLocaleString('en-IN') + ' crore' : n >= 1e5 ? r3(n / 1e5) + ' lakh' : n >= 1e3 ? r3(n / 1e3) + ' thousand' : String(r3(n));
      const pow = n => { if (n <= 0) return '0'; const e = Math.floor(Math.log10(n) + 1e-9), m = r3(n / Math.pow(10, e)); return (m === 1 ? '' : m + ' × ') + '10^' + e; };
      const upd = () => {
        const n = Math.max(0, Number(el.querySelector('.nmCvN').value) || 0) * Number(el.querySelector('.nmCvU').value);
        el.querySelector('.nmCvF').textContent = Math.round(n).toLocaleString('en-US');
        el.querySelector('.nmCvP').textContent = pow(n);
        el.querySelector('.nmCvI').textContent = intl(n);
        el.querySelector('.nmCvH').textContent = indn(n);
        el.querySelector('.nmCvT').textContent = n > 0 ? `This number is about ${Math.floor(Math.log10(n) + 1e-9)} zeros big. If it is a count per day, remove 5 zeros (÷ 10^5) to get per second: ≈ ${r3(n / 1e5).toLocaleString('en-US')} per second.` : 'Type a number.';
      };
      el.querySelector('.nmCvN').addEventListener('input', upd); el.querySelector('.nmCvU').addEventListener('change', upd); upd();
    }},
    { type: 'h3', text: 'Units of data: from byte to petabyte' },
    { type: 'callout', tone: 'term', title: 'New word: Byte (B) and bit (b)', html: `<strong>What it is:</strong> a <strong>bit</strong> is the smallest thing in a computer: one 0 or 1. <strong>8 bits = 1 byte</strong>. One English letter (like "a") takes 1 byte.<br><strong>Why we need it:</strong> storage is always measured in <strong>bytes</strong> (KB, MB, GB; capital <strong>B</strong>). Network speed is usually in <strong>bits</strong> per second (Mbps, Gbps; small <strong>b</strong>).<br><strong>Without it (if you mix them up):</strong> you are wrong by 8 times. 100 Mbps internet = 100 ÷ 8 = ~12.5 MB per second, not 100 MB per second.` },
    { type: 'p', html: `Now the ladder of bytes. Each step is <strong>1,000 times</strong> (3 zeros) bigger, just like thousand → million → billion:` },
    { type: 'table', head: ['Unit', 'How many bytes', 'Power', 'A feel for it'], rows: [
      ['1 KB (kilobyte)', '1 thousand', '10^3', 'one short text or chat message with its metadata'],
      ['1 MB (megabyte)', '1 million (10 lakh)', '10^6', 'one minute of a song, or a small photo'],
      ['1 GB (gigabyte)', '1 billion (100 crore)', '10^9', 'roughly one hour of a normal quality movie'],
      ['1 TB (terabyte)', '1 trillion', '10^12', 'a whole laptop disk; a comfortable size for one database is ~1-5 TB'],
      ['1 PB (petabyte)', '1,000 TB', '10^15', 'the full photo/video store of a big app'],
    ], caption: 'That is why "1 million × 1 KB = 1 GB": 10^6 × 10^3 = 10^9 bytes. Add the zeros of the units too.' },
    { type: 'callout', tone: 'term', title: 'New word: Powers of 2 (and the secret of 1,024)', html: `<strong>What it is:</strong> inside, a computer thinks in powers of 2: 2, 4, 8, 16 ... <code>2^10 = 1,024</code>, which is very close to 1,000. That is why people used to say "1 KB = 1,024 bytes". In today's standard the 1,024 one is called <strong>KiB</strong> (kibibyte), and KB = 1,000.<br><strong>Why we need it:</strong> some limits are exact powers of 2: <code>2^32 ≈ 4.3 billion</code> (the largest count a 32-bit number can hold, and the number of IPv4 addresses), <code>2^64 ≈ 1.8 × 10^19</code> (a 64-bit ID never runs out).<br><strong>Without it:</strong> mistakes like "a 32-bit int is enough for IDs": after 4.3 billion the IDs run out, and big apps have far more posts or messages than that.` },
    { type: 'table', head: ['Power of 2', 'Exact', 'Roughly', 'Where you see it'], rows: [
      ['2^10', '1,024', '10^3 (thousand)', 'KiB vs KB'],
      ['2^20', '1,048,576', '10^6 (million)', 'MiB'],
      ['2^30', '1,073,741,824', '10^9 (billion)', 'GiB; RAM sizes'],
      ['2^32', '4,294,967,296', '4.3 billion', 'count of a 32-bit int, IPv4 addresses'],
      ['2^64', '~1.8 × 10^19', '18 billion billion', '64-bit IDs (like Snowflake)'],
    ], caption: 'Napkin trick: every 10 powers of 2 ≈ 3 zeros. 2^10 ≈ 10^3, 2^20 ≈ 10^6, 2^30 ≈ 10^9, 2^40 ≈ 10^12.' },
    { type: 'callout', tone: 'term', title: 'New word: QPS (queries per second)', html: `<strong>What it is:</strong> how many requests reach the system in one second. It is also called <strong>RPS</strong> (requests per second).<br><strong>Why we need it:</strong> we measure the traffic of a system in this unit, and also how much one server can handle. Only when both are in the same unit can we divide and find "how many servers".<br><strong>Without it:</strong> "10 million views a day" does not tell you how much load hits the server in one second.` },
    { type: 'h2', text: 'The biggest trick: one day ≈ 10^5 seconds' },
    { type: 'p', html: `A day has 24 × 60 × 60 = <strong>86,400</strong> seconds. Dividing by this number in your head is hard. So just call it <strong>100,000 (10^5)</strong>. The number became ~16% bigger, so your QPS comes out ~14% lower, and the maths becomes very easy: to turn "per day" into "per second", just <strong>remove 5 zeros</strong>.` },
    { type: 'code', text: `
xyz.com gets 10 million (10^7) page views a day.

Exact:   10,000,000 / 86,400  = 115.7 per second
Napkin:  10^7 / 10^5          = 10^2 = 100 per second

Difference?  ~14% (napkin is a bit lower).  Effect on the design decision?  Zero. Both mean: "one server is enough".` },
    { type: 'p', html: `The same trick works for other times too. Look at this small table once:` },
    { type: 'table', head: ['Time', 'Exact seconds', 'Napkin', 'How to remember'], rows: [
      ['1 minute', '60', '60', ''],
      ['1 hour', '3,600', '~4 × 10^3', '60 × 60'],
      ['1 day', '86,400', '~10^5 (100 thousand)', '24 hours × 3,600'],
      ['1 month', '2,592,000 (2.6 million)', '~2.5 × 10^6', '30 days × 86,400'],
      ['1 year', '31,536,000 (31.5 million)', '~3 × 10^7', 'people also say "π × 10^7"'],
    ], caption: 'The most useful one: a day = 10^5. For months and years: a "per month" count ÷ 2.5 million, a "per year" count ÷ 30 million.' },
    { type: 'callout', tone: 'why', title: 'Why this rounding works', html: `Turning 86,400 into 100,000 makes the QPS a little <em>lower</em> (~14%). But later we multiply by 2 to 5 for the peak, and we keep 1.5× headroom on servers. Next to those big factors, 16% is nothing. In the same way we treat the 365 days of a year as <strong>400</strong>: the maths is easy, and the storage number comes out a bit higher, which acts as extra space (headroom).` },

    { type: 'h3', text: 'Shortcuts table (learn this by heart)' },
    { type: 'table', head: ['Shortcut', 'Value', 'Why it is useful'], rows: [
      ['Seconds in a day', '≈ 10^5', 'Divide a daily count by 100k to get the average QPS'],
      ['1 million per day', '≈ 12 / s', 'Very small. One server handles it easily'],
      ['100 million per day', '≈ 1,200 / s', 'A few servers'],
      ['1 billion per day', '≈ 12,000 / s', 'You need a fleet, caching, maybe sharding too'],
      ['Peak vs average', '× 2 to × 5', 'Plan capacity for the peak; live events can spike ×10 or more'],
      ['Thousand, million, billion, trillion', 'KB, MB, GB, TB', 'Each step is 10^3. 1 million × 1 KB = 1 GB'],
      ['Days in a year', '≈ 400', 'Round 365 up: easy maths, plus a little headroom'],
    ], caption: 'Where does "12/s" come from? Divide by the real 86,400: 1,000,000 / 86,400 ≈ 11.6 ≈ 12. The 10^5 trick gives 10. Both are the same order.' },
    { type: 'callout', tone: 'term', title: 'New word: Peak QPS vs average QPS', html: `<strong>What it is:</strong> <strong>average QPS</strong> = the whole day's traffic shared equally over 86,400 seconds. But fewer people come at 3 am and more come at 9 pm. The traffic in the busiest minute = <strong>peak QPS</strong>.<br><strong>Why we need it:</strong> you need servers for the peak, not for the average. In normal apps the peak ≈ 2-5× the average. During live events (a cricket final, a sale, exam results day) it can be 10× or more.<br><strong>Without it:</strong> you buy servers for the average, and every night at 9 pm the site becomes slow or goes down.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: mixing lakh/crore with million/billion', html: `"1 crore = 1 million" is wrong: <strong>1 crore = 10 million</strong>. Also <strong>1 million = 10 lakh</strong> and <strong>1 billion = 100 crore</strong>. Do not switch systems in the middle of a calculation. Use million/billion in design work (they match KB/MB/GB), and at the end you can say it in lakh/crore if you like.` },

    { type: 'h3', text: 'Try it: per day → per second' },
    { type: 'p', html: `Type any count (for example "500 million video views per day on xyz.com") and see how close the napkin QPS is to the exact one, and what it means for the design:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="nmCnt">How many events (number)</label><input id="nmCnt" type="number" value="100" min="0" step="1"></div>
          <div><label for="nmPk">Peak factor: <strong class="nmPkV">×3</strong></label><input id="nmPk" type="range" min="1" max="10" step="1" value="3"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px" class="nmMul"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px" class="nmPer"></div>
        <div class="stats">
          <div class="stat"><span>Exact average</span><strong class="nmEx"></strong></div>
          <div class="stat"><span>Napkin average</span><strong class="nmNp"></strong></div>
          <div class="stat"><span>Peak (napkin × factor)</span><strong class="nmPeak"></strong></div>
        </div>
        <pre class="ascii nmF" style="margin-top:12px;white-space:pre-wrap"></pre>
        <div class="calc-note nmV"></div>`;
      const MUL = [['thousand', 1e3], ['million', 1e6], ['billion', 1e9]];
      const PER = [['per day', 86400, 1e5, '10^5'], ['per month', 2592000, 2.5e6, '2.5 × 10^6'], ['per hour', 3600, 3600, '3,600']];
      let mi = 1, pi = 0;
      const f = n => n >= 1e9 ? +(n / 1e9).toPrecision(3) + 'B' : n >= 1e6 ? +(n / 1e6).toPrecision(3) + 'M' : n >= 1e3 ? +(n / 1e3).toPrecision(3) + 'k' : n >= 10 ? Math.round(n).toString() : (+n.toPrecision(2)).toString();
      const chips = (sel, arr, get, set) => {
        const box = el.querySelector(sel); box.innerHTML = '';
        arr.forEach((a, k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (get() === k ? ' on' : ''); b.textContent = a[0]; b.onclick = () => { set(k); upd(); }; box.appendChild(b); });
      };
      const verdict = q => q <= 1000 ? 'Peak ≤ 1k/s: one good server (plus one backup) is enough. No fancy architecture needed.'
        : q <= 10000 ? 'Peak 1k-10k/s: a few servers behind a Load Balancer. The database can probably still run as one primary + a replica.'
        : q <= 100000 ? 'Peak 10k-100k/s: a fleet of servers, a cache is a must, read replicas on the database. If this many are writes, think about sharding.'
        : 'Peak above 100k/s: a big fleet, heavy caching, sharding, maybe a CDN. One database can never handle this traffic alone.';
      const upd = () => {
        chips('.nmMul', MUL, () => mi, k => mi = k);
        chips('.nmPer', PER, () => pi, k => pi = k);
        const n = Math.max(0, Number(el.querySelector('#nmCnt').value) || 0) * MUL[mi][1];
        const pk = Number(el.querySelector('#nmPk').value);
        const P = PER[pi], ex = n / P[1], np = n / P[2], peak = np * pk;
        el.querySelector('.nmPkV').textContent = '×' + pk;
        el.querySelector('.nmEx').textContent = f(ex) + '/s';
        el.querySelector('.nmNp').textContent = f(np) + '/s';
        el.querySelector('.nmPeak').textContent = f(peak) + '/s';
        el.querySelector('.nmF').textContent = `Exact : ${f(n)} / ${P[1].toLocaleString('en-US')} s  = ${f(ex)}/s\nNapkin: ${f(n)} / ${P[3]} s  = ${f(np)}/s   (difference ${ex ? Math.round(Math.abs(np - ex) / ex * 100) : 0}%)\nPeak  : ${f(np)} × ${pk}  = ${f(peak)}/s`;
        el.querySelector('.nmV').textContent = verdict(peak);
      };
      el.querySelector('#nmCnt').addEventListener('input', upd);
      el.querySelector('#nmPk').addEventListener('input', upd);
      upd();
    }},
    { type: 'callout', tone: 'tip', html: `With the default (100 million per day, peak ×3): napkin average 1k/s, peak 3k/s, exact average 1,157/s. The table's "100 million/day ≈ 1,200/s" is the exact one. The difference is ~14%, and the design verdict is the same for both.` },

    { type: 'h2', text: 'The size of things' },
    { type: 'p', html: `To work out storage and bandwidth, you need to know how big one thing is. We saw the units (B, KB, MB) above. Now real things:` },
    { type: 'table', head: ['Thing', 'Rough size', 'Note'], rows: [
      ['1 English character (ASCII)', '1 B', 'In UTF-8 one Hindi (Devanagari) letter is 3 B, an emoji 4 B'],
      ['int (32-bit number)', '4 B', 'Counts, small numbers'],
      ['ID / timestamp (long, 64-bit)', '8 B', 'User ID, post ID, epoch millis'],
      ['UUID', '16 B', 'In binary. Written as text it is 36 characters = 36 B'],
      ['Typical DB row (user, order, message + metadata)', '0.5-1 KB', 'The text of a 280-character post is small, but IDs, time, counts and indexes add up to ~1 KB'],
      ['Compressed photo', '200 KB - 2 MB', 'Thumbnail ~20-50 KB, full phone photo ~2 MB'],
      ['1 minute of 1080p video (compressed)', '≈ 30-50 MB', '~4-7 Mbps stream'],
      ['1 minute of audio', '≈ 1 MB', '~128 kbps'],
      ['LLM token', '≈ 4 characters of English', 'In Hindi/Hinglish one token often covers fewer characters'],
    ], caption: 'The roadmap table, plus char and int. Media (photo/video) is ~100-1000× bigger than metadata, so always calculate it separately.' },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: bits vs bytes, and 1000 vs 1024', html: `Two mistakes are very common. (1) "A 1 Gbps link sends a 1 GB file in 1 second" is wrong: 1 Gbps = 125 MB/s, so it takes ~8 seconds. (2) Treating 1 KB as 1,024 and getting stuck in the calculation. In napkin maths use 10^3; the 1,024 difference is so small that it never changes the design.` },

    { type: 'h3', text: 'Try it: how many items × how big' },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="nmItems">How many items (millions)</label><input id="nmItems" type="number" value="1" min="0" step="1"></div>
          <div><label for="nmSize">Size of one item (KB)</label><input id="nmSize" type="number" value="1" min="0" step="1"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px" class="nmPre"></div>
        <div class="stats"><div class="stat"><span>Total</span><strong class="nmTot"></strong></div><div class="stat"><span>Powers of ten</span><strong class="nmPow"></strong></div></div>
        <div class="calc-note nmTn"></div>`;
      const PRE = [['1M rows × 1 KB', 1, 1], ['1M photos × 500 KB', 1, 500], ['1B posts × 1 KB', 1000, 1], ['1M video-minutes × 40 MB', 1, 40000]];
      const human = b => { const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']; let i = 0; while (b >= 1000 && i < u.length - 1) { b /= 1000; i++; } return (+b.toPrecision(3)) + ' ' + u[i]; };
      const box = el.querySelector('.nmPre');
      PRE.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = p[0]; b.onclick = () => { el.querySelector('#nmItems').value = p[1]; el.querySelector('#nmSize').value = p[2]; upd(); }; box.appendChild(b); });
      const upd = () => {
        const items = Math.max(0, Number(el.querySelector('#nmItems').value) || 0) * 1e6, kb = Math.max(0, Number(el.querySelector('#nmSize').value) || 0);
        const bytes = items * kb * 1e3;
        el.querySelector('.nmTot').textContent = human(bytes);
        el.querySelector('.nmPow').textContent = bytes > 0 ? '10^' + Math.floor(Math.log10(bytes) + 1e-9) + ' B' : '0';
        el.querySelector('.nmTn').textContent = bytes >= 5e12 ? 'Bigger than the comfortable size of one database (~1-5 TB). Think about sharding, archiving or object storage.' : bytes >= 1e12 ? 'TB range: one DB node can handle it, but keep an eye on growth.' : 'Small data: one machine handles it easily.';
      };
      el.querySelector('#nmItems').addEventListener('input', upd); el.querySelector('#nmSize').addEventListener('input', upd); upd();
    }},

    { type: 'h2', text: 'The latency ladder: how slow is each thing' },
    { type: 'p', html: `After storage, the second question is <em>time</em>. On the path of one request there is RAM, SSD, network and database, and their speeds differ by <strong>hundreds of thousands of times</strong>. This idea became famous through a list by Google's Jeff Dean and Peter Norvig ("Latency numbers every programmer should know"). Hardware keeps changing, so learn these not as exact values but as <strong>orders of magnitude</strong>.` },
    { type: 'callout', tone: 'term', title: 'New words: ms, µs, ns (small units of time)', html: `<strong>What it is:</strong> small pieces of a second, each step 1,000 times smaller.<br><strong>1 ms</strong> (millisecond) = one thousandth of a second. A blink of an eye takes ~100-400 ms.<br><strong>1 µs</strong> (microsecond, "micro") = one thousandth of a millisecond.<br><strong>1 ns</strong> (nanosecond) = one thousandth of a microsecond, which is one billionth of a second (10^-9).<br><strong>Why we need it:</strong> work inside a computer takes ns and µs; network and disk take ms. To see the difference, the units must be clear.<br><strong>Without it:</strong> you may think "0.1 ms" and "100 ns" are the same (they really differ by 1,000 times).` },
    { type: 'image', src: 'assets/img/numbers/hopper-nanosecond.jpg', alt: 'A bunch of thin, colourful wires on a blue background, each wire about 30 cm long', maxWidth: 420, caption: 'Computer scientist Grace Hopper gave out wires like these in her lectures and said: "this is one nanosecond". Each wire is ~30 cm long, because in 1 ns light (and an electric signal) can travel only that far. This shows why a far-away server is slow: even in 1 ms a signal travels only ~300 km (~200 km in fibre).', credit: { text: 'National Museum of American History (Smithsonian), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Grace_Murray_Hopper_visualizing_nanoseconds.png', license: 'Public domain' } },
    { type: 'table', head: ['Task', 'Rough time', 'Meaning'], rows: [
      ['Read from RAM', '~100 ns', 'The fastest place where data can be "kept"'],
      ['SSD random read', '~0.1 ms (100 µs)', '~1,000× slower than RAM'],
      ['Redis GET, same data centre (including network)', '~0.5-1 ms', 'Redis itself takes microseconds; most of the time is network'],
      ['Round trip within one region', '~1-2 ms', 'Between different availability zones'],
      ['Simple indexed DB query', '~1-10 ms', '~10× slower than a cache'],
      ['Round trip India ↔ US', '~200-250 ms', 'Speed of light + the long cable path; more bandwidth will not reduce it'],
      ['Human "feels instant"', '< 100-200 ms', 'Above this the user feels the page is "stuck"'],
    ], caption: 'The roadmap table. 1 ms = 1,000 µs (microseconds) = 1,000,000 ns (nanoseconds).' },
    { type: 'callout', tone: 'term', title: 'New word: L1 cache', html: `<strong>What it is:</strong> a very small (a few KB) and very fast memory inside the CPU itself. Reading from it takes ~1 ns (about 0.5-1 ns), ~100× faster than RAM.<br><strong>Why it is here:</strong> it is the bottom step of the ladder: nothing is faster. In system design we do not control it; we only use it for comparison.<br><strong>Without it (if you did not know this):</strong> you would think RAM is "the fastest" and forget that there is a level inside the CPU too.` },
    { type: 'p', html: `Our brains cannot "feel" nanoseconds and milliseconds. So here is a trick: imagine <strong>1 ns = 1 second</strong> (so an L1 cache read = 1 second). Now make everything else 1 billion times bigger too. The bars use a <strong>log scale</strong>: each equal step = 10 times more time, otherwise the small numbers would not be visible at all. Click any row:` },

    { type: 'custom', render(el) {
      const L = [
        ['L1 cache read', 1, 'inside the CPU'],
        ['L2 cache read', 7, 'inside the CPU, a bit bigger'],
        ['RAM read', 100, 'memory of the app server'],
        ['SSD random read', 1e5, '~0.1 ms'],
        ['Round trip, same data centre', 5e5, '~0.5 ms'],
        ['Redis GET (same DC, incl. network)', 1e6, '~0.5-1 ms'],
        ['Round trip, one region (between zones)', 1.5e6, '~1-2 ms'],
        ['Simple indexed DB query', 5e6, '~1-10 ms'],
        ['Hard disk seek (HDD)', 1e7, '~10 ms'],
        ['Human "instant" limit', 1e8, '~100 ms'],
        ['Round trip California ↔ Netherlands', 1.5e8, '~150 ms'],
        ['Round trip India ↔ US', 2e8, '~200-250 ms'],
      ];
      el.innerHTML = `<div class="nmLad" style="display:grid;gap:6px"></div>
        <div class="stats">
          <div class="stat"><span>Real time</span><strong class="nmA"></strong></div>
          <div class="stat"><span>If 1 ns = 1 second</span><strong class="nmH"></strong></div>
          <div class="stat"><span>How much slower than RAM</span><strong class="nmR"></strong></div>
        </div>
        <div class="calc-note nmLn"></div>`;
      const real = ns => ns < 1e3 ? ns + ' ns' : ns < 1e6 ? +(ns / 1e3).toPrecision(3) + ' µs' : +(ns / 1e6).toPrecision(3) + ' ms';
      const hum = s => s < 60 ? +s.toPrecision(2) + ' seconds' : s < 3600 ? +(s / 60).toPrecision(2) + ' minutes' : s < 86400 ? +(s / 3600).toPrecision(2) + ' hours' : s < 86400 * 60 ? +(s / 86400).toPrecision(2) + ' days' : s < 86400 * 365 ? +(s / 86400 / 30).toPrecision(2) + ' months' : +(s / 86400 / 365).toPrecision(2) + ' years';
      let sel = L.length - 1;
      const lad = el.querySelector('.nmLad');
      const draw = () => {
        lad.innerHTML = '';
        L.forEach((r, i) => {
          const pct = Math.max(3, Math.log10(r[1]) / 9 * 100);
          const row = document.createElement('button');
          row.type = 'button';
          row.setAttribute('aria-pressed', i === sel ? 'true' : 'false');
          row.style.cssText = `display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:10px;align-items:center;text-align:left;padding:6px 8px;border-radius:var(--r-sm);border:1px solid ${i === sel ? 'var(--accent)' : 'var(--line)'};background:${i === sel ? 'var(--accent-soft)' : 'var(--surface)'};color:var(--ink);font:13px var(--f-body);cursor:pointer`;
          row.innerHTML = `<span>${r[0]}</span><span style="display:flex;align-items:center;gap:6px"><span style="flex:1;height:10px;background:var(--surface-2);border-radius:5px;overflow:hidden"><span style="display:block;height:100%;width:${pct.toFixed(1)}%;background:${r[1] >= 1e8 ? 'var(--red)' : r[1] >= 1e6 ? 'var(--amber)' : 'var(--accent)'}"></span></span><span style="font:12px var(--f-mono);color:var(--ink-2);min-width:52px;text-align:right">${real(r[1])}</span></span>`;
          row.onclick = () => { sel = i; draw(); };
          lad.appendChild(row);
        });
        const ns = L[sel][1];
        el.querySelector('.nmA').textContent = real(ns);
        el.querySelector('.nmH').textContent = hum(ns);
        el.querySelector('.nmR').textContent = ns >= 100 ? '×' + (ns / 100).toLocaleString('en-US') : 'faster than RAM';
        el.querySelector('.nmLn').textContent = `The bars use a log scale: each 1/9 of the bar = 10× more time (from 1 ns to 1 s). ${L[sel][0]}: ${L[sel][2]}. If 1 ns were 1 second, this would take ${hum(ns)}.`;
      };
      draw();
    }},
    { type: 'callout', tone: 'why', title: '3 design lessons from this ladder', html: `<strong>1.</strong> Between RAM and network/disk there is a difference of thousands of times. That is why a cache (RAM) is so useful.<br><strong>2.</strong> One round trip inside a data centre (~0.5 ms) looks cheap, but if one request makes 100 calls one after another, 50 ms are gone.<br><strong>3.</strong> One round trip from India to the US (~200 ms) alone eats the whole "instant" budget. You can beat distance only by bringing the data closer (CDN, regional servers).` },

    { type: 'h2', text: 'The time budget of one request' },
    { type: 'p', html: `Now apply these numbers to a real request. xyz.com runs in the Mumbai region. Goal: the user gets the page within <strong>200 ms</strong> (human "instant"). Every hop spends a part of that budget. Play all the scenarios and see where the budget breaks:` },
    { type: 'flow', height: 310,
      nodes: [
        { id: 'u', label: 'User, Chennai', sub: 'budget 200 ms', x: 90, y: 155, w: 150, kind: 'client', info: 'What it is: a user in Chennai opening xyz.com, on their phone or browser. The network round trip from Chennai to the Mumbai region is ~20-40 ms (it depends on the ISP and the route).' },
        { id: 'app', label: 'App server', sub: 'Mumbai, behind LB', x: 330, y: 155, w: 160, kind: 'server', info: 'What it is: the computer that builds the page (behind the Load Balancer). The work of the request happens here. The code itself takes a few milliseconds. The real time goes into network calls (cache, DB), and if these calls happen one after another, the time keeps adding up.' },
        { id: 'cache', label: 'Redis cache', sub: 'RAM, ~0.5-1 ms', x: 580, y: 65, w: 180, kind: 'cache', info: 'What it is: a fast store that keeps data in RAM. Why it is here: to avoid going to the database. In the same data centre a Redis GET takes ~0.5-1 ms, and most of that is network time. The data is in RAM, so it is fast.' },
        { id: 'db', label: 'Database', sub: 'indexed, ~1-10 ms', x: 580, y: 245, w: 180, kind: 'data', meter: true, load: 30, info: 'What it is: the real, permanent data of xyz.com (on disk). A simple query with an index takes ~1-10 ms. But if the data is not in RAM (buffer cache) and must be read from disk, or there is no index, the time grows many times.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }],
      scenarios: [
        { name: 'Cache hit (fast)', steps: [
          { title: 'Request reaches Mumbai', text: 'Chennai to Mumbai: half a round trip, ~15 ms.', go: 'u>app', msg: 'GET /feed            budget used: ~15 ms' },
          { title: 'Data from the cache', text: 'Redis has the feed. ~1 ms.', go: ['app>cache', 'res:cache>app'], set: { db: { state: 'dim' } }, after: { cache: { state: 'hit', sub: 'HIT, ~1 ms' } }, msg: 'GET feed:42  →  hit      budget used: ~16 ms' },
          { title: 'Response goes back', text: 'The way back is ~15 ms, plus ~5 ms of code. Total ~35 ms. Only ~20% of the budget.', go: 'res:app>u', after: { u: { state: 'ok', sub: '~35 ms, instant' } }, msg: 'Total ≈ 15 + 1 + 5 + 15 ≈ 35 ms   ✓' },
        ]},
        { name: 'Cache miss', steps: [
          { title: 'Request arrives', text: 'Same ~15 ms.', go: 'u>app' },
          { title: 'Cache miss', text: 'Not found in Redis (~1 ms wasted).', go: ['app>cache', 'bad:cache>app'], after: { cache: { state: 'miss', sub: 'MISS' } } },
          { title: 'DB query with an index', text: 'A query with an index takes ~5 ms. The result is also put into the cache.', go: ['app>db', 'res:db>app'], msg: 'SELECT ... WHERE user_id = 42 ORDER BY time LIMIT 20   (~5 ms)' },
          { title: 'Response', text: 'Total ~40 ms. Still within budget. A DB with an index is not "slow"; it is just ~10× slower than a cache.', go: 'res:app>u', after: { u: { state: 'ok', sub: '~40 ms' } } },
        ]},
        { name: 'Slow disk (failure)', intro: 'A new query was shipped without an index, and the data is not in RAM either.', steps: [
          { title: 'Request arrives', text: '~15 ms.', go: 'u>app' },
          { title: 'Cache miss', text: 'The result of this query is not cached.', go: ['app>cache', 'bad:cache>app'], after: { cache: { state: 'miss', sub: 'MISS' } } },
          { title: 'The DB wanders around the disk', text: 'There is no index, so the database must read many rows from disk. On a hard disk each random seek takes ~10 ms. 30 seeks = 300 ms. Even on an SSD, thousands of random reads add up to hundreds of ms.', go: 'app>db', after: { db: { state: 'hot', load: 95, sub: '~300 ms on disk' } }, msg: '30 random reads × ~10 ms (HDD seek) ≈ 300 ms' },
          { title: 'The budget is broken', text: 'Total ~330 ms. The page feels stuck to the user. And now the DB is busy, so other queries are waiting in line too. Fix: the right <strong>index</strong>, hot data in RAM (cache or DB buffer), SSD.', go: 'res:db>app>u', after: { u: { state: 'down', sub: '~330 ms, slow!' } } },
        ]},
        { name: 'Chatty calls (failure)', intro: 'Every call is fast, but the page is still slow. How?', steps: [
          { title: 'Request arrives', text: '~15 ms.', go: 'u>app' },
          { title: '50 calls, one after another', text: 'The code fetches the author name of each post with a separate query (this is called the "N+1 queries" problem). Each call takes ~2 ms, but 50 in a row = 100 ms.', flood: { paths: ['app>db'], n: 10 }, after: { db: { state: 'warn', sub: '50 × 2 ms = 100 ms' } } },
          { title: 'Half the budget is gone', text: 'Total ~135 ms. Fix: fetch all authors in one query (batch), or make the calls in parallel. The lesson of the ladder: keep the number of round trips small.', go: 'res:app>u', after: { u: { state: 'warn', sub: '~135 ms' } } },
        ]},
        { name: 'Far-away user (failure)', intro: 'Now the user is in New York, and the server is still only in Mumbai.', steps: [
          { title: 'Request crosses the ocean', text: 'New York to Mumbai: half a round trip alone is ~100-125 ms.', set: { u: { label: 'User, New York', sub: 'budget 200 ms' } }, go: 'u>app' },
          { title: 'The server is fast', text: 'Cache hit, ~1 ms. No problem on the server side.', go: ['app>cache', 'res:cache>app'], after: { cache: { state: 'hit', sub: 'HIT' } } },
          { title: 'Still slow', text: 'The way back is also ~100-125 ms. Total ~230 ms, and on a new HTTPS connection the extra round trips of the TCP + TLS handshake add up to 500 ms+. A bigger server or more bandwidth will not help. Fix: a region in the US or a CDN, so the data is near the user.', go: 'res:app>u', after: { u: { state: 'down', sub: '~230-500+ ms' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'How much one machine can do' },
    { type: 'p', html: `We have the QPS. Now, to answer "how many machines?", we need to know how much <em>one</em> machine can handle. These are interview-grade ballparks, not benchmarks: the real number depends on the hardware, the payload size and the shape of the query. But they are enough to get the order of magnitude.` },
    { type: 'table', head: ['One machine', 'Ballpark', 'Note'], rows: [
      ['Stateless app server, simple JSON API', '1k-10k req/s', 'If every request does real work (DB calls, logic), assume ~1k-2k'],
      ['PostgreSQL / MySQL node', '~5k-20k simple writes/s; more reads', 'Depends a lot on hardware and indexes'],
      ['Redis node', '~100k+ ops/s', 'Commands run on a single thread, all in RAM'],
      ['Cassandra node', '~10k-50k writes/s', 'Add nodes and capacity grows almost in a straight line'],
      ['Kafka broker', '~100s of MB/s', 'Millions of small messages per second across the whole cluster'],
      ['WebSocket gateway', '~50k-500k idle connections', 'Use 100k in estimates'],
      ['Single DB comfortable size', '~1-5 TB', 'Beyond this, think about sharding or archiving'],
    ], caption: 'The roadmap table. Redis\'s official benchmark page shows ~180 thousand SET/s on a normal Linux box without pipelining, and ~1.5 million+ with pipelining.' },
    { type: 'callout', tone: 'term', title: 'New word: Headroom', html: `<strong>What it is:</strong> spare capacity left empty on purpose. In estimates we keep ~1.5× more machines, so each machine runs at only ~65% even at peak.<br><strong>Why we need it:</strong> near 100% a server's line (queue) gets long and latency explodes (the "Latency, throughput and p99" lesson). And if one machine fails, its load moves to the others; they can carry it only if they have free space.<br><strong>Without it:</strong> all servers at 95%, one fails, the rest overload, and they fall one after another (cascading failure).` },
    { type: 'callout', tone: 'term', title: 'New word: Availability zone (AZ)', html: `<strong>What it is:</strong> a separate building or data centre inside one region (like Mumbai), with its own power and network. Cloud regions usually have 3 zones.<br><strong>Why we need it:</strong> spread machines over 2-3 zones, so the site keeps running if one building has a fire or a power cut.<br><strong>Without it:</strong> all machines in one place: one building's problem = the whole site is down.` },
    { type: 'p', html: `Now put it all together: how much load, how much one machine handles, how much headroom. The machine count is rounded up so it splits equally over 3 zones:` },
    { type: 'custom', render(el) {
      const KIND = [
        ['App server (real work)', 1500, 'req/s'], ['App server (simple JSON)', 5000, 'req/s'], ['SQL DB node (writes)', 10000, 'writes/s'],
        ['Redis node', 100000, 'ops/s'], ['Cassandra node (writes)', 20000, 'writes/s'], ['WebSocket gateway', 100000, 'connections'],
      ];
      el.innerHTML = `<div class="row2">
          <div><label>Machine type</label><select class="nmMk">${KIND.map((k, i) => `<option value="${i}">${k[0]} (~${k[1].toLocaleString('en-US')} ${k[2]})</option>`).join('')}</select></div>
          <div><label>Peak load <span class="nmMu"></span></label><input class="nmMl" type="number" value="30000" min="0" step="1000"></div>
          <div><label>Headroom: <strong class="nmMhV"></strong></label><input class="nmMh" type="range" min="1" max="2" step="0.1" value="1.5"></div>
          <div><label>Zones: <strong class="nmMzV"></strong></label><input class="nmMz" type="range" min="1" max="3" step="1" value="3"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Without headroom</span><strong class="nmM0"></strong></div>
          <div class="stat"><span>With headroom</span><strong class="nmM1"></strong></div>
          <div class="stat"><span>Rounded up for zones</span><strong class="nmM2"></strong></div>
          <div class="stat"><span>Each machine at peak</span><strong class="nmM3"></strong></div>
        </div>
        <div class="calc-note nmMn"></div>`;
      const upd = () => {
        const k = KIND[Number(el.querySelector('.nmMk').value)], load = Math.max(0, Number(el.querySelector('.nmMl').value) || 0);
        const h = Number(el.querySelector('.nmMh').value), z = Number(el.querySelector('.nmMz').value);
        const raw = load / k[1], withH = Math.ceil(raw * h - 1e-9), fin = Math.max(z === 1 ? 1 : z, Math.ceil(withH / z) * z);
        el.querySelector('.nmMu').textContent = '(' + k[2] + ')';
        el.querySelector('.nmMhV').textContent = '×' + h.toFixed(1);
        el.querySelector('.nmMzV').textContent = z;
        el.querySelector('.nmM0').textContent = (+raw.toPrecision(3)).toLocaleString('en-US');
        el.querySelector('.nmM1').textContent = withH.toLocaleString('en-US');
        el.querySelector('.nmM2').textContent = fin.toLocaleString('en-US') + ' (' + (fin / z).toLocaleString('en-US') + ' per zone)';
        el.querySelector('.nmM3').textContent = fin ? Math.round(load / (fin * k[1]) * 100) + '%' : '-';
        const left = fin - fin / z, fmt = x => x.toLocaleString('en-US');
        const tail = z === 1 ? 'Only 1 zone: if that building goes, the whole site is down. Keep at least 2-3 zones.'
          : `If a whole zone goes down, the remaining ${fmt(left)} machines run at ${Math.round(load / (left * k[1]) * 100)}% load${load / (left * k[1]) > 1.001 ? ': overload! You need more headroom.' : '.'}`;
        el.querySelector('.nmMn').textContent = `${fmt(load)} ÷ ${fmt(k[1])} = ${fmt(+raw.toPrecision(3))} machines for the work. × ${h.toFixed(1)} headroom = ${fmt(withH)}. Equal over ${z} zones = ${fmt(fin)}. ${tail}`;
      };
      ['.nmMk', '.nmMl', '.nmMh', '.nmMz'].forEach(c => { el.querySelector(c).addEventListener('input', upd); el.querySelector(c).addEventListener('change', upd); }); upd();
    }},
    { type: 'p', html: `Default: 30,000 req/s, each app server handles ~1,500 req/s (real work). 30,000 ÷ 1,500 = <strong>20 machines</strong> just for the work. × 1.5 headroom = <strong>30</strong>, 10 in each of 3 zones. At peak each machine runs at ~67%. If a whole zone goes down, the remaining 20 machines run at 100% load: right at the edge. That is why very important systems keep even more headroom.` },

    { type: 'h2', text: 'The nines of availability' },
    { type: 'p', html: `In the "Availability, nines and SPOF" lesson you moved a slider. Here is just the table to remember. One trick: remember <strong>99.9% = ~9 hours a year</strong>. Each extra 9 makes the downtime 10 times smaller.` },
    { type: 'table', head: ['Availability', 'Downtime per year', 'Per month'], rows: [
      ['99% (two nines)', '≈ 3.65 days', '≈ 7.3 h'],
      ['99.9%', '≈ 8.8 h', '≈ 44 min'],
      ['99.99%', '≈ 53 min', '≈ 4.4 min'],
      ['99.999%', '≈ 5.3 min', '≈ 26 s'],
    ], caption: 'The maths: downtime = (1 - availability) × time. 0.001 × 365 × 24 h = 8.76 h. Per month = per year ÷ 12.' },
    { type: 'callout', tone: 'tip', title: 'Napkin trick: a serial chain', html: `If a request passes through 3 components and each one is 99.9%, the whole path is about 99.7% (the downtimes add up: 3 × 0.1% = 0.3%). So the more required boxes in a chain, the lower the availability, and that is why every required box needs a copy (redundancy).` },

    { type: 'h2', text: 'Flashcards: test yourself' },
    { type: 'p', html: `You remember things not by reading, but by <em>trying to recall</em> them. Look at the card, think of the answer in your head, then flip it. A card you did not know comes again at the end.` },
    { type: 'custom', render(el) {
      const CARDS = [
        ['Seconds in a day (napkin)?', '≈ 10^5 (really 86,400)'],
        ['1 million per day = ? per second', '≈ 12 / s'],
        ['100 million per day = ? per second', '≈ 1,200 / s'],
        ['1 billion per day = ? per second', '≈ 12,000 / s'],
        ['Peak ÷ average (normal app)?', '× 2 to × 5 (×10+ for live events)'],
        ['1 million × 1 KB = ?', '1 GB'],
        ['1 crore = ? million', '10 million (and 1 billion = 100 crore)'],
        ['2^10 ≈ ?   2^32 ≈ ?', '≈ 1,000   ≈ 4.3 billion'],
        ['Days in a year (napkin)?', '≈ 400'],
        ['Size of a UUID?', '16 B (36 characters as text)'],
        ['Typical DB row?', '0.5-1 KB'],
        ['1 minute 1080p video?', '≈ 30-50 MB'],
        ['Compressed photo?', '200 KB - 2 MB'],
        ['1 LLM token ≈ ?', '≈ 4 English characters'],
        ['RAM read?', '~100 ns'],
        ['SSD random read?', '~0.1 ms'],
        ['Redis GET same DC?', '~0.5-1 ms'],
        ['Simple indexed DB query?', '~1-10 ms'],
        ['Round trip India ↔ US?', '~200-250 ms'],
        ['One app server (simple API)?', '1k-10k req/s (~1k-2k for real work)'],
        ['One Redis node?', '~100k+ ops/s'],
        ['One WebSocket gateway (estimate)?', '100k connections'],
        ['Single DB comfortable size?', '~1-5 TB'],
        ['99.9% = how much downtime a year?', '≈ 8.8 hours (~44 min a month)'],
        ['99.99% = how much downtime a year?', '≈ 53 minutes'],
      ];
      el.innerHTML = `<div class="nmCard" style="min-height:120px;border:1px solid var(--line-2);border-radius:var(--r);background:var(--surface-2);padding:18px;display:flex;flex-direction:column;justify-content:center;gap:10px">
          <div class="nmQ" style="font:600 18px/1.35 var(--f-display);color:var(--ink)"></div>
          <div class="nmAns" style="font:600 20px/1.3 var(--f-mono);color:var(--accent-ink)"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="button" class="btn small primary nmFlip">Show answer</button>
          <button type="button" class="btn small nmYes">I knew it</button>
          <button type="button" class="btn small nmNo">I did not know</button>
          <button type="button" class="btn small ghost nmRe">Start again</button>
        </div>
        <div class="stats"><div class="stat"><span>Card</span><strong class="nmPos"></strong></div><div class="stat"><span>Known</span><strong class="nmOk"></strong></div><div class="stat"><span>Will come again</span><strong class="nmMiss"></strong></div></div>`;
      let queue, ok, shown, missed;
      const start = () => {
        let seed = 42; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        queue = CARDS.map((c, i) => i);
        for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }
        ok = 0; shown = false; missed = new Set(); show();
      };
      const show = () => {
        const q = el.querySelector('.nmQ'), a = el.querySelector('.nmAns');
        el.querySelector('.nmOk').textContent = ok + ' / ' + CARDS.length;
        el.querySelector('.nmMiss').textContent = missed.size;
        if (!queue.length) { q.textContent = 'All cards done! You remember all ' + CARDS.length + ' numbers.'; a.textContent = ''; el.querySelector('.nmPos').textContent = 'done'; return; }
        const c = CARDS[queue[0]];
        q.textContent = c[0]; a.textContent = shown ? c[1] : '?';
        el.querySelector('.nmPos').textContent = (ok + 1) + ' / ' + CARDS.length;
      };
      el.querySelector('.nmFlip').onclick = () => { shown = true; show(); };
      el.querySelector('.nmYes').onclick = () => { if (!queue.length) return; missed.delete(queue.shift()); ok++; shown = false; show(); };
      el.querySelector('.nmNo').onclick = () => { if (!queue.length) return; missed.add(queue[0]); queue.push(queue.shift()); shown = false; show(); };
      el.querySelector('.nmRe').onclick = start;
      start();
    }},

    { type: 'h2', text: 'How to use these numbers' },
    { type: 'callout', tone: 'why', title: 'Decide', html: `Estimation is not for precision; it is for <strong>design questions</strong>: do we need a cache? Do we need sharding? 5 servers or 500? <strong>Round aggressively</strong>, think in powers of ten, and only keep the order of magnitude right. Do not spend time on a number that does not change the design.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "I need the exact number"', html: `In an interview, doing long division by 86,400 or saying 1,157.4 QPS does not impress anyone. The interviewer looks at <em>what conclusion</em> you drew from the number. "~1k/s average, peak ~3k/s, so 2-3 servers behind a Load Balancer and one DB are enough" > "1,157.407 QPS".` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: mixing per day and per second', html: `The most common mistake: storage worked out per day, bandwidth per second, and then the two added together. Write the unit next to every number (/s, /day, GB, GB/s). Wrong unit = an answer that is 10^5 times wrong.` },

    { type: 'diagram', title: 'The full picture: the estimation pipeline for xyz.com', height: 460,
      groups: [
        { label: 'Guesses (inputs)', x: 20, y: 30, w: 180, h: 400 },
        { label: 'Maths', x: 260, y: 30, w: 200, h: 400 },
        { label: 'Design decision', x: 520, y: 30, w: 180, h: 400 },
      ],
      nodes: [
        { id: 'users', label: 'DAU', sub: '10 million', x: 110, y: 100, w: 150, kind: 'client', info: 'What it is: how many different people open xyz.com every day. The whole calculation starts here. Here: 10 million (1 crore) = 10^7.' },
        { id: 'act', label: 'Per user/day', sub: '5 writes, 100 reads', x: 110, y: 230, w: 150, kind: 'client', info: 'What it is: how many times one user writes and reads in a day. Here they write 5 comments and read 100: read:write = 20:1.' },
        { id: 'size', label: 'Size table', sub: 'comment ~1 KB', x: 110, y: 360, w: 150, kind: 'data', info: 'What it is: the "size of things" table. One comment with metadata is ~1 KB, a photo ~500 KB. Storage and bandwidth come from this.' },
        { id: 'qps', label: 'QPS', sub: '÷ 10^5, × 3 peak', x: 360, y: 100, w: 170, kind: 'server', info: 'What it is: traffic per second. Writes: 50 million/day ÷ 10^5 = 500/s, peak 1,500/s. Reads: 1 billion/day ÷ 10^5 = 10k/s, peak 30k/s.' },
        { id: 'bw', label: 'Bandwidth', sub: 'QPS × size', x: 360, y: 230, w: 170, kind: 'net', info: 'What it is: how much data goes out every second. 30k reads/s × 1 KB = 30 MB/s ≈ 240 Mbps. A small number for text.' },
        { id: 'stor', label: 'Storage', sub: '× 400 days × 3 copies', x: 360, y: 360, w: 170, kind: 'data', info: 'What it is: how much disk we need. 50 million × 1 KB = 50 GB/day. × 400 = 20 TB/year. × 5 years × 3 copies = 300 TB.' },
        { id: 'srv', label: 'App servers', sub: '~24, 3 zones', x: 610, y: 90, w: 150, kind: 'server', info: 'What it is: how many machines. Peak 31,500 req/s ÷ ~2,000 per server × 1.5 headroom ≈ 24, so 8 in each of 3 zones.' },
        { id: 'cache', label: 'Cache: yes', sub: '30k reads/s', x: 610, y: 180, w: 150, kind: 'cache', info: 'What it is: a fast store in RAM (Redis). Why: 30k reads/s and a 20:1 ratio, and the latency ladder says RAM is ~10× faster than the DB. Hot data ~20% = ~200 GB.' },
        { id: 'cdn', label: 'CDN: not yet', sub: '240 Mbps text', x: 610, y: 270, w: 150, kind: 'edge', info: 'What it is: servers that keep files close to the user\'s city. Not needed for 240 Mbps of text. If every read had a 500 KB photo it would be 15 GB/s: then it is impossible without a CDN.' },
        { id: 'db', label: 'Sharding: yes', sub: '300 TB ≫ 5 TB', x: 610, y: 360, w: 150, kind: 'data', info: 'What it is: splitting data over many database machines. Why: the comfortable size of one DB is ~1-5 TB, and here it is 300 TB. Without sharding this data cannot fit on one machine at all.' },
      ],
      edges: [
        { a: 'users', b: 'qps', n: 1 },
        { a: 'act', b: 'qps' },
        { a: 'act', b: 'stor' },
        { a: 'size', b: 'stor' },
        { a: 'size', b: 'bw' },
        { a: 'qps', b: 'bw', n: 3 },
        { a: 'qps', b: 'srv', n: 2 },
        { a: 'qps', b: 'cache' },
        { a: 'bw', b: 'cdn', n: 4 },
        { a: 'stor', b: 'db', n: 5 },
      ],
      paths: [
        { name: 'Traffic', text: 'DAU × actions per user ÷ 10^5 = average QPS, × 3 = peak. The peak decides servers and cache.', go: ['users>qps>srv', 'act>qps>cache'] },
        { name: 'Storage', text: 'Writes/day × size × 400 × years × 3 copies = 300 TB. Far more than one DB\'s 1-5 TB: sharding.', go: ['act>stor>db', 'size>stor'] },
        { name: 'Bandwidth', text: 'Read QPS × size = 30 MB/s. Small for text: no CDN yet. As soon as photos come, a CDN.', go: ['qps>bw>cdn', 'size>bw'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Powers of 10: multiply = add zeros, divide = subtract zeros. 1 million = 10 lakh, 1 crore = 10 million, 1 billion = 100 crore.</li>
      <li>One day ≈ 10^5 seconds: to turn per day into per second, remove 5 zeros. A year ≈ 400 days.</li>
      <li>KB → MB → GB → TB: each step is 1,000×. 1 million × 1 KB = 1 GB. Byte = 8 bits; networks count in bits.</li>
      <li>2^10 ≈ 10^3; 2^32 ≈ 4.3 billion (the limit of 32 bits), which is why big IDs are 64-bit.</li>
      <li>Latency ladder: RAM ~100 ns, SSD ~0.1 ms, Redis ~1 ms, DB ~1-10 ms, India ↔ US ~200 ms. Distance is the most expensive.</li>
      <li>One machine: app server ~1k-2k (real work), Redis ~100k ops/s, WebSocket gateway ~100k connections, DB ~1-5 TB.</li>
      <li>Peak = 2-5× average; machines × 1.5 headroom, spread over 2-3 zones.</li>
      <li>99.9% ≈ 9 hours of downtime a year; each extra 9 = 10× less.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Design decisions in seconds: cache, sharding, CDN, how many servers', 'Confident, clear reasoning in interviews and design reviews', 'A wrong direction (over-engineering or under-engineering) is caught early', 'Easy mental maths: 10^5, 400, steps of 10^3'], costs: ['The numbers are ballparks; real capacity planning still needs load testing', 'Hardware changes (SSD, network): numbers can get old, so remember orders, not decimals', 'One wrong assumption (like the peak factor) can shake the whole estimate', 'Rounding can give a wrong feeling for small systems; for a borderline case do the exact maths'] },

    { type: 'think', questions: [
      { q: 'xyz.com\'s notification service sends 500 million notifications per day. What are the average and peak QPS, and is one server enough?', a: '500M / 10^5 = 5,000/s average. Peak ×3 ≈ 15,000/s. One app server (~1k-10k) is not enough; you need many servers behind an LB, and 15k writes/s is too much even for one SQL node. Notifications are usually sent through a queue so that spikes are smoothed out.' },
      { q: 'Your Redis is in Mumbai and your app server is in the Singapore region. Why will the cache not feel "fast"?', a: 'Redis itself answers in microseconds, but every GET pays the Mumbai-Singapore network round trip (~tens of ms). The lesson of the ladder: a cache helps only when it is near the app server (same data centre/region). Network latency eats the speed of RAM.' },
      { q: 'A service wants 99.99% availability, but it depends on 4 other services that are each 99.9%. Is that possible?', a: 'No, unless the dependencies are redundant or optional. 4 × 0.1% ≈ 0.4% downtime, which is ~99.6%. Either raise the availability of the dependencies, or design so the service works without them (fallback, cache, async).' },
    ]},
    { type: 'quiz', questions: [
      { q: '2 billion events per day ≈ how many per second (average)?', options: ['~2,000/s', '~20,000/s', '~200,000/s'], answer: 1, explain: '2 × 10^9 / 10^5 = 2 × 10^4 = 20,000/s. (Exact ~23k/s, the same order.)' },
      { q: '10 million users × a 2 KB profile = how much data?', options: ['20 MB', '20 GB', '20 TB'], answer: 1, explain: '10^7 × 2 × 10^3 B = 2 × 10^10 B = 20 GB. It can even fit in the RAM of one machine.' },
      { q: 'Which is the slowest?', options: ['SSD random read', 'Redis GET in the same data centre', 'India ↔ US round trip'], answer: 2, explain: '~200-250 ms. Thousands of times slower than SSD (~0.1 ms) and Redis (~0.5-1 ms).' },
      { q: 'About how much downtime a year does 99.9% availability mean?', options: ['~53 minutes', '~8.8 hours', '~3.65 days'], answer: 1, explain: '0.1% × 8,760 hours ≈ 8.8 hours. 53 min is for 99.99%, 3.65 days is for 99%.' },
      { q: 'How many million is 1 crore?', options: ['1 million', '10 million', '100 million'], answer: 1, explain: '1 crore = 10^7 = 10 million. Also 1 million = 10 lakh, 1 billion = 100 crore.' },
      { q: 'About how many different IDs can a 32-bit number (int) make?', options: ['~65 thousand', '~4.3 billion', '~18 billion billion'], answer: 1, explain: '2^32 ≈ 4.3 billion. 65k = 2^16, and 18 billion billion = 2^64. That is why big apps use 64-bit IDs.' },
      { q: '30,000 req/s at peak, one server handles ~1,500 req/s, 1.5× headroom. How many servers?', options: ['20', '30', '45'], answer: 1, explain: '30,000 ÷ 1,500 = 20; × 1.5 = 30. 10 in each of 3 zones.' },
      { q: 'In estimation, should 1 KB be 1,000 B or 1,024 B?', options: ['Always 1,024, otherwise it is wrong', '1,000: the ~2.4% difference does not change the design', 'It does not matter because KB and Kb are the same'], answer: 1, explain: 'Use 10^3 in napkin maths. And KB (bytes) and Kb (bits) are different: an 8× difference.' },
    ]},
    { type: 'sources', note: 'All tables come from Phase 4 of the roadmap. Latency and Redis numbers were cross-checked with the public sources below.', items: [
      { title: 'Latency Numbers Every Programmer Should Know', publisher: 'GitHub gist (Jonas Bonér), numbers credited to Jeff Dean and Peter Norvig', url: 'https://gist.github.com/jboner/2841832', used: 'Classic latency ladder: L1 ~0.5 ns, L2 ~7 ns, RAM ~100 ns, SSD random read ~150 µs, same-DC round trip ~0.5 ms, disk seek ~10 ms, CA-Netherlands round trip ~150 ms. Original list is ~2012 era.' },
      { title: 'Numbers Every Programmer Should Know By Year', publisher: 'Colin Scott, UC Berkeley (interactive page)', url: 'https://colin-scott.github.io/personal_website/research/interactive_latency.html', used: 'Shows how these numbers change by year (SSD faster, RAM and speed-of-light limits flat). Reason we say "orders of magnitude".' },
      { title: 'Redis benchmark', publisher: 'Redis official documentation', official: true, url: 'https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/', used: 'Example runs of ~180k SET/s without pipelining and 1.5M+ with pipelining; Redis is mostly single-threaded for command execution.' },
      { title: 'Binary prefix', publisher: 'Wikipedia (summary of IEC 80000-13 and SI prefixes)', url: 'https://en.wikipedia.org/wiki/Binary_prefix', used: 'KB = 1,000 bytes (SI) vs KiB = 1,024 bytes (IEC); 2^10 ≈ 10^3 rule.' },
      { title: 'Regions and Availability Zones', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html', used: 'What an availability zone is: isolated locations inside one region, used for spreading servers.' },
      { title: 'Grace Murray Hopper visualizing nanoseconds (photo)', publisher: 'National Museum of American History via Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Grace_Murray_Hopper_visualizing_nanoseconds.png', used: 'Photo and description of Hopper\'s ~30 cm "nanosecond" wires (distance a signal travels in 1 ns).' },
      { title: 'What are tokens and how to count them?', publisher: 'OpenAI Help Center', official: true, url: 'https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them', used: 'Rule of thumb: one token ≈ 4 characters of English text.' },
    ]},
  ],
});
