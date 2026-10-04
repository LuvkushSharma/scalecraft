Lesson.register({
  id: 'numbers',
  title: 'Yaad rakhne wale numbers',
  minutes: 28,
  summary: `Interview mein koi poochhe "kitne servers chahiye?" to calculator nahi, dimaag chahiye. Bas ~15 numbers aur kuch tricks (zeros gino, din = 10^5 seconds) se tum QPS, storage, latency aur downtime ka andaza seconds mein laga sakte ho. Is lesson mein powers of 10 aur 2 bilkul shuru se, lakh/crore ↔ million/billion, data ke units, latency ladder ("1 ns = 1 second" wala khel), ek machine kitna jhelti hai (calculator), availability ke nines, aur flashcards.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho tumhara dost poochhe: "meri website pe kal 1 crore log aayenge, kitne computers chahiye?" Tum calculator nahi kholte, bas mann mein hisaab lagate ho.<br>Iske liye do cheezein chahiye: bade numbers ko aasaan banane ki trick (zeros gino), aur kuch numbers jo yaad hon: ek din mein kitne seconds, ek photo kitni badi, ek computer kitna kaam kar sakta hai, kaunsi cheez kitni slow.<br>Is lesson mein yahi ~15 numbers aur tricks hain, khel khel mein. Aage ke lessons inhi se "kitne servers?" ka jawab nikaalenge.` },

    { type: 'h2', text: 'Problem: "Kitne servers chahiye?"' },
    { type: 'p', html: `Ab tak xyz.com ke liye humne bahut saare blocks seekhe: Load Balancer, Cache, replicas, sharding, queues, CDN. Lekin har baar ek sawaal bacha: <em>kab</em> lagayein? Ek server kaafi hai ya 500? Ek database ya 50 shards? Cache zaroori hai ya bas fashion?` },
    { type: 'p', html: `Iska jawab feeling se nahi, <strong>numbers</strong> se aata hai. Lekin interview ya design meeting mein Excel nahi khulta. Wahan chahiye <strong>napkin maths</strong>: itna rough hisaab jo ek napkin (tissue paper) pe ho jaaye, aur phir bhi sahi design decision de.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Napkin maths (back-of-the-envelope estimation)', html: `<strong>Ye kya hai:</strong> rough, jaldi ka hisaab, itna chhota ki ek napkin (tissue paper) ya lifafe (envelope) ki peeth pe ho jaaye. Exact answer nahi chahiye. Bas ye pata chalna chahiye ki answer 10 ke aas paas hai, 1,000 ke, ya 10 lakh ke.<br><strong>Kyun chahiye:</strong> design ke bade faisle (cache chahiye? sharding? 5 servers ya 500?) isi rough size se ho jaate hain, wo bhi 2 minute mein.<br><strong>Iske bina:</strong> ya to andaze se design (kabhi bekaar mehenga, kabhi launch ke din site gir gayi), ya har sawaal pe din bhar ka spreadsheet.` },

    { type: 'h2', text: 'Pehle ek chhoti si taiyaari: powers of 10' },
    { type: 'p', html: `Is lesson ke saare numbers bahut bade hain: crore users, billion requests, terabytes data. Inhe sambhalne ka ek hi aasaan tareeka hai: <strong>zeros gino</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Power of 10 (10^n)', html: `<strong>Ye kya hai:</strong> <code>10^n</code> (padho "10 to the power n") matlab 1 ke baad <strong>n zeros</strong>. 10^3 = 1,000 (3 zeros). 10^6 = 10,00,000 (6 zeros). Kabhi kabhi <code>1e6</code> bhi likhte hain, matlab wahi.<br><strong>Kyun chahiye:</strong> bade numbers ka guna-bhaag ab zeros jodne-ghataane ka khel ban jaata hai.<br><strong>Iske bina:</strong> 2,00,00,00,000 ÷ 86,400 jaisa long division, aur galti ka pura chance.` },
    { type: 'p', html: `Do niyam yaad rakho, bas:` },
    { type: 'list', items: [
      `<strong>Guna = zeros jodo.</strong> 10^3 × 10^6 = 10^(3+6) = 10^9. Jaise 1,000 × 10,00,000 = 1,00,00,00,000 (9 zeros).`,
      `<strong>Bhaag = zeros ghataao.</strong> 10^9 ÷ 10^5 = 10^(9−5) = 10^4 = 10,000.`,
      `<strong>Aage ka number alag se.</strong> 2 × 10^9 ÷ 10^5 = 2 × 10^4 = 20,000. Pehle chhote numbers (2) ka hisaab, phir zeros ka.`,
    ]},
    { type: 'p', html: `Ab Indian aur international naam. India mein hum lakh aur crore bolte hain, lekin computer ki duniya (aur saare docs, interviews) thousand, million, billion bolti hai. Dono ka rishta ek baar dekh lo:` },
    { type: 'table', head: ['Zeros', 'Power', 'International', 'Indian', 'Example'], rows: [
      ['3', '10^3', '1 thousand', '1 hazaar', '1,000 users'],
      ['5', '10^5', '100 thousand', '1 lakh', 'ek din ke seconds (lagbhag)'],
      ['6', '10^6', '1 million', '10 lakh', 'ek chhota shehar'],
      ['7', '10^7', '10 million', '1 crore', 'xyz.com ke daily page views'],
      ['9', '10^9', '1 billion', '100 crore', 'India ki aabaadi ~140 crore = 1.4 billion'],
      ['12', '10^12', '1 trillion', '1 lakh crore', 'bytes in 1 TB'],
    ], caption: 'Trick: 1 million = 10 lakh, 1 crore = 10 million, 1 billion = 100 crore. International naam har 3 zeros pe badalte hain; isliye wo bytes (KB, MB, GB) se seedhe match karte hain.' },
    { type: 'callout', tone: 'term', title: 'Naya word: Order of magnitude', html: `<strong>Ye kya hai:</strong> number ka "size class": usme lagbhag kitne zeros hain. 3,000 aur 7,000 dono hazaaron mein hain: same order (10^3). 3,000 aur 3,00,000 mein 100 guna farak hai: do orders alag.<br><strong>Kyun chahiye:</strong> napkin maths ka poora khel yahi hai: <em>order sahi ho</em>. 1,157 aur 1,000 mein design same rehta hai; 1,000 aur 1,00,000 mein bilkul alag.<br><strong>Iske bina:</strong> log decimals mein atak jaate hain aur asli sawaal ("ek server ya sau?") bhool jaate hain.` },
    { type: 'p', html: `Khud chala ke dekho. Koi bhi number daalo aur unit chuno: wo number Indian, international aur power-of-10, teeno tarah dikhega.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Number</label><input class="nmCvN" type="number" value="5" min="0" step="any"></div>
          <div><label>Unit</label><select class="nmCvU">
            <option value="1">(kuch nahi)</option><option value="1e3">thousand / hazaar</option><option value="1e5">lakh</option><option value="1e6" selected>million</option><option value="1e7">crore</option><option value="1e9">billion</option><option value="1e12">trillion</option>
          </select></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Poora number</span><strong class="nmCvF"></strong></div>
          <div class="stat"><span>Power of 10</span><strong class="nmCvP"></strong></div>
          <div class="stat"><span>International</span><strong class="nmCvI"></strong></div>
          <div class="stat"><span>Indian</span><strong class="nmCvH"></strong></div>
        </div>
        <div class="calc-note nmCvT"></div>`;
      const r3 = x => +x.toPrecision(3);
      const intl = n => n >= 1e12 ? r3(n / 1e12) + ' trillion' : n >= 1e9 ? r3(n / 1e9) + ' billion' : n >= 1e6 ? r3(n / 1e6) + ' million' : n >= 1e3 ? r3(n / 1e3) + ' thousand' : String(r3(n));
      const indn = n => n >= 1e7 ? r3(n / 1e7).toLocaleString('en-IN') + ' crore' : n >= 1e5 ? r3(n / 1e5) + ' lakh' : n >= 1e3 ? r3(n / 1e3) + ' hazaar' : String(r3(n));
      const pow = n => { if (n <= 0) return '0'; const e = Math.floor(Math.log10(n) + 1e-9), m = r3(n / Math.pow(10, e)); return (m === 1 ? '' : m + ' × ') + '10^' + e; };
      const upd = () => {
        const n = Math.max(0, Number(el.querySelector('.nmCvN').value) || 0) * Number(el.querySelector('.nmCvU').value);
        el.querySelector('.nmCvF').textContent = Math.round(n).toLocaleString('en-IN');
        el.querySelector('.nmCvP').textContent = pow(n);
        el.querySelector('.nmCvI').textContent = intl(n);
        el.querySelector('.nmCvH').textContent = indn(n);
        el.querySelector('.nmCvT').textContent = n > 0 ? `Isme ${Math.floor(Math.log10(n) + 1e-9)} zeros ka size hai. Per day count ho to per second ke liye 5 zeros hatao (÷ 10^5): ≈ ${r3(n / 1e5).toLocaleString('en-IN')} per second.` : 'Koi number daalo.';
      };
      el.querySelector('.nmCvN').addEventListener('input', upd); el.querySelector('.nmCvU').addEventListener('change', upd); upd();
    }},
    { type: 'h3', text: 'Data ke units: byte se petabyte tak' },
    { type: 'callout', tone: 'term', title: 'Naya word: Byte (B) aur bit (b)', html: `<strong>Ye kya hai:</strong> <strong>bit</strong> computer ki sabse chhoti cheez hai: ek 0 ya 1. <strong>8 bits = 1 byte</strong>. Ek English letter (jaise "a") ko 1 byte lagta hai.<br><strong>Kyun chahiye:</strong> storage hamesha <strong>bytes</strong> mein naapte hain (KB, MB, GB; bada <strong>B</strong>). Network speed aksar <strong>bits</strong> per second mein (Mbps, Gbps; chhota <strong>b</strong>).<br><strong>Iske bina (mix kiya to):</strong> 8 guna galti. 100 Mbps internet = 100 ÷ 8 = ~12.5 MB per second, 100 MB per second nahi.` },
    { type: 'p', html: `Ab bytes ki seedhi. Har step pe <strong>1,000 guna</strong> (3 zeros) bada, bilkul thousand → million → billion ki tarah:` },
    { type: 'table', head: ['Unit', 'Kitne bytes', 'Power', 'Ek feel'], rows: [
      ['1 KB (kilobyte)', '1 thousand', '10^3', 'ek chhota text message ya chat message metadata ke saath'],
      ['1 MB (megabyte)', '1 million (10 lakh)', '10^6', 'ek minute ka gaana, ya ek chhoti photo'],
      ['1 GB (gigabyte)', '1 billion (100 crore)', '10^9', 'ek ghante ki normal quality movie (lagbhag)'],
      ['1 TB (terabyte)', '1 trillion', '10^12', 'ek laptop ki poori disk; ek database ka comfortable size ~1-5 TB'],
      ['1 PB (petabyte)', '1,000 TB', '10^15', 'bade apps ka poora photo/video store'],
    ], caption: 'Isliye "1 million × 1 KB = 1 GB": 10^6 × 10^3 = 10^9 bytes. Units ke zeros bhi jod do.' },
    { type: 'callout', tone: 'term', title: 'Naya word: Powers of 2 (aur 1,024 ka raaz)', html: `<strong>Ye kya hai:</strong> computer andar se 2 ki powers mein sochta hai: 2, 4, 8, 16 ... <code>2^10 = 1,024</code>, jo 1,000 ke bahut paas hai. Isliye purani aadat mein "1 KB = 1,024 bytes" bolte the. Aaj ke standard mein 1,024 wale ko <strong>KiB</strong> (kibibyte) kehte hain, aur KB = 1,000.<br><strong>Kyun chahiye:</strong> kuch limits 2 ki power hi hoti hain: <code>2^32 ≈ 4.3 billion</code> (32-bit number ki max ginti, aur IPv4 addresses ki ginti), <code>2^64 ≈ 1.8 × 10^19</code> (64-bit ID kabhi khatam nahi hoti).<br><strong>Iske bina:</strong> "ID ke liye 32-bit int kaafi hai" jaisi galti: 4.3 billion ke baad IDs khatam, aur bade apps ke posts/messages us se kahin zyada hote hain.` },
    { type: 'table', head: ['Power of 2', 'Exact', 'Lagbhag', 'Kahan dikhta hai'], rows: [
      ['2^10', '1,024', '10^3 (thousand)', 'KiB vs KB'],
      ['2^20', '10,48,576', '10^6 (million)', 'MiB'],
      ['2^30', '1,07,37,41,824', '10^9 (billion)', 'GiB; RAM sizes'],
      ['2^32', '4,29,49,67,296', '4.3 billion', '32-bit int ki ginti, IPv4 addresses'],
      ['2^64', '~1.8 × 10^19', '18 billion billion', '64-bit IDs (Snowflake jaisi)'],
    ], caption: 'Napkin trick: har 10 powers of 2 ≈ 3 zeros. 2^10 ≈ 10^3, 2^20 ≈ 10^6, 2^30 ≈ 10^9, 2^40 ≈ 10^12.' },
    { type: 'callout', tone: 'term', title: 'Naya word: QPS (queries per second)', html: `<strong>Ye kya hai:</strong> ek second mein system pe kitni requests aati hain. Isse <strong>RPS</strong> (requests per second) bhi kehte hain.<br><strong>Kyun chahiye:</strong> system ka traffic isi unit mein naapte hain, aur ek server kitna jhel sakta hai wo bhi. Dono same unit mein hon tabhi bhaag karke "kitne servers" nikal sakta hai.<br><strong>Iske bina:</strong> "din mein 1 crore views" se pata hi nahi chalta ki ek second mein server pe kitna bojh hai.` },
    { type: 'h2', text: 'Sabse bada trick: ek din ≈ 10^5 seconds' },
    { type: 'p', html: `Ek din mein 24 × 60 × 60 = <strong>86,400</strong> seconds hote hain. Is number se mann mein divide karna mushkil hai. To use <strong>100,000 (10^5)</strong> maan lo. Number ~16% bada ho gaya, QPS ~14% kam aayega, aur maths ekdum aasaan: "per day" ko "per second" banana ho to bas <strong>5 zeros hata do</strong>.` },
    { type: 'code', text: `
xyz.com pe din mein 1 crore (10 million = 10^7) page views.

Exact:   10,000,000 / 86,400  = 115.7 per second
Napkin:  10^7 / 10^5          = 10^2 = 100 per second

Farak?  ~14% (napkin thoda kam aata hai).  Design decision pe asar?  Zero. Dono ka matlab: "ek server kaafi hai".` },
    { type: 'p', html: `Yahi trick baaki time ke liye bhi. Ek baar ye chhoti table dekh lo:` },
    { type: 'table', head: ['Time', 'Exact seconds', 'Napkin', 'Kaise yaad karein'], rows: [
      ['1 minute', '60', '60', ''],
      ['1 ghanta', '3,600', '~4 × 10^3', '60 × 60'],
      ['1 din', '86,400', '~10^5 (1 lakh)', '24 ghante × 3,600'],
      ['1 mahina', '25,92,000 (2.6 million)', '~2.5 × 10^6', '30 din × 86,400'],
      ['1 saal', '3,15,36,000 (31.5 million)', '~3 × 10^7', '"π × 10^7" bhi bolte hain'],
    ], caption: 'Sabse zyada kaam ka: din = 10^5. Mahine aur saal ke liye: "per month" count ÷ 2.5 million, "per year" ÷ 30 million.' },
    { type: 'callout', tone: 'why', title: 'Ye rounding chalti kyun hai', html: `86,400 ko 100,000 karne se QPS thoda <em>kam</em> aata hai (~14%). Lekin aage hum peak ke liye ×2 se ×5 karte hain aur servers pe 1.5× headroom rakhte hain. Un bade factors ke saamne 16% kuch nahi. Isi tarah saal ke 365 din ko <strong>400</strong> maante hain: maths aasaan, aur storage ka hisaab thoda zyada aata hai, jo extra jagah (headroom) ka kaam karta hai.` },

    { type: 'h3', text: 'Shortcuts table (ye ratta maar lo)' },
    { type: 'table', head: ['Shortcut', 'Value', 'Kyun kaam ka hai'], rows: [
      ['Seconds in a day', '≈ 10^5', 'Daily count ko 100k se divide karo, average QPS mil jaayega'],
      ['1 million per day', '≈ 12 / s', 'Bahut chhota. Ek server aaram se sambhal le'],
      ['100 million per day', '≈ 1,200 / s', 'Kuch servers'],
      ['1 billion per day', '≈ 12,000 / s', 'Fleet chahiye, caching, shayad sharding bhi'],
      ['Peak vs average', '× 2 se × 5', 'Capacity peak ke liye plan karo; live events pe ×10 ya usse bhi zyada spike'],
      ['Thousand, million, billion, trillion', 'KB, MB, GB, TB', 'Har step 10^3. 1 million × 1 KB = 1 GB'],
      ['Days in a year', '≈ 400', '365 ko upar round karo: maths aasaan, aur thoda headroom'],
    ], caption: '"12/s" kahan se aaya? Asli 86,400 se divide karo: 1,000,000 / 86,400 ≈ 11.6 ≈ 12. 10^5 wale trick se 10 aata. Dono same order.' },
    { type: 'callout', tone: 'term', title: 'Naya word: Peak QPS vs average QPS', html: `<strong>Ye kya hai:</strong> <strong>average QPS</strong> = poore din ka traffic 86,400 seconds mein barabar baant do. Lekin log raat 3 baje kam aate hain aur raat 9 baje zyada. Sabse busy minute ka traffic = <strong>peak QPS</strong>.<br><strong>Kyun chahiye:</strong> servers peak ke liye chahiye, average ke liye nahi. Normal apps mein peak ≈ 2-5× average. Live events (cricket final, sale, result ka din) mein 10× ya usse bhi zyada.<br><strong>Iske bina:</strong> average ke hisaab se servers liye, aur roz raat 9 baje site slow ya down.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: lakh/crore aur million/billion mix karna', html: `"1 crore = 1 million" galat hai: <strong>1 crore = 10 million</strong>. Aur <strong>1 million = 10 lakh</strong>, <strong>1 billion = 100 crore</strong>. Ek hisaab ke beech mein system mat badlo. Design mein million/billion use karo (wo KB/MB/GB se match karte hain), aur end mein chaaho to lakh/crore mein bol do.` },

    { type: 'h3', text: 'Khud karo: per day → per second' },
    { type: 'p', html: `Koi bhi count daalo (jaise "xyz.com pe 50 crore video views per day") aur dekho napkin QPS exact se kitna paas hai, aur design pe kya matlab nikalta hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="nmCnt">Kitne events (number)</label><input id="nmCnt" type="number" value="100" min="0" step="1"></div>
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
      const verdict = q => q <= 1000 ? 'Peak ≤ 1k/s: ek achha server (plus ek backup) kaafi hai. Fancy architecture ki zaroorat nahi.'
        : q <= 10000 ? 'Peak 1k-10k/s: Load Balancer ke peeche kuch servers. Database shayad abhi bhi ek primary + replica se chal jaaye.'
        : q <= 100000 ? 'Peak 10k-100k/s: servers ka fleet, cache zaroori, database pe read replicas. Writes itni hain to sharding socho.'
        : 'Peak 100k/s se upar: bada fleet, heavy caching, sharding, shayad CDN. Ek database is traffic ko akele kabhi nahi sambhal sakta.';
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
        el.querySelector('.nmF').textContent = `Exact : ${f(n)} / ${P[1].toLocaleString('en-US')} s  = ${f(ex)}/s\nNapkin: ${f(n)} / ${P[3]} s  = ${f(np)}/s   (farak ${ex ? Math.round(Math.abs(np - ex) / ex * 100) : 0}%)\nPeak  : ${f(np)} × ${pk}  = ${f(peak)}/s`;
        el.querySelector('.nmV').textContent = verdict(peak);
      };
      el.querySelector('#nmCnt').addEventListener('input', upd);
      el.querySelector('#nmPk').addEventListener('input', upd);
      upd();
    }},
    { type: 'callout', tone: 'tip', html: `Default (100 million per day, peak ×3) se: napkin average 1k/s, peak 3k/s, exact average 1,157/s. Table ka "100 million/day ≈ 1,200/s" wahi exact wala hai. Farak ~14% ka hai, aur design ka verdict dono mein same.` },

    { type: 'h2', text: 'Cheezon ka size' },
    { type: 'p', html: `Storage aur bandwidth ka hisaab lagane ke liye pata hona chahiye ki ek cheez kitni badi hoti hai. Units (B, KB, MB) upar dekh liye. Ab asli cheezein:` },
    { type: 'table', head: ['Cheez', 'Rough size', 'Note'], rows: [
      ['1 English character (ASCII)', '1 B', 'UTF-8 mein Hindi (Devanagari) ka ek akshar 3 B, emoji 4 B'],
      ['int (32-bit number)', '4 B', 'Counts, chhote numbers'],
      ['ID / timestamp (long, 64-bit)', '8 B', 'User ID, post ID, epoch millis'],
      ['UUID', '16 B', 'Binary mein. Text mein likho to 36 characters = 36 B'],
      ['Typical DB row (user, order, message + metadata)', '0.5-1 KB', '280-character post ka text chhota hai, lekin IDs, time, counts, indexes milke ~1 KB'],
      ['Compressed photo', '200 KB - 2 MB', 'Thumbnail ~20-50 KB, full phone photo ~2 MB'],
      ['1 minute of 1080p video (compressed)', '≈ 30-50 MB', '~4-7 Mbps stream'],
      ['1 minute of audio', '≈ 1 MB', '~128 kbps'],
      ['LLM token', '≈ 4 characters of English', 'Hindi/Hinglish mein ek token aksar kam characters cover karta hai'],
    ], caption: 'Roadmap ki table, plus char aur int. Media (photo/video) metadata se ~100-1000× bada hota hai, isliye uska hisaab hamesha alag lagao.' },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: bits vs bytes, aur 1000 vs 1024', html: `Do galtiyan bahut common hain. (1) "1 Gbps link pe 1 GB file 1 second mein" galat: 1 Gbps = 125 MB/s, to ~8 second. (2) 1 KB ko 1,024 maan ke calculation mein atak jaana. Napkin maths mein 10^3 use karo; 1,024 ka farak itna chhota hai ki design nahi badalta.` },

    { type: 'h3', text: 'Khud karo: kitne items × kitna bada' },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="nmItems">Kitne items (millions)</label><input id="nmItems" type="number" value="1" min="0" step="1"></div>
          <div><label for="nmSize">Ek item ka size (KB)</label><input id="nmSize" type="number" value="1" min="0" step="1"></div>
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
        el.querySelector('.nmTn').textContent = bytes >= 5e12 ? 'Ek database ke comfortable size (~1-5 TB) se bada. Sharding, archiving ya object storage socho.' : bytes >= 1e12 ? 'TB range: ek DB node sambhal lega, lekin growth pe nazar rakho.' : 'Chhota data: ek machine aaram se.';
      };
      el.querySelector('#nmItems').addEventListener('input', upd); el.querySelector('#nmSize').addEventListener('input', upd); upd();
    }},

    { type: 'h2', text: 'Latency ladder: kaun kitna slow' },
    { type: 'p', html: `Storage ke baad doosra sawaal: <em>time</em>. Ek request ke raaste mein RAM, SSD, network, database sab aate hain, aur inki speed mein <strong>lakhon guna</strong> farak hai. Google ke Jeff Dean aur Peter Norvig ki ek famous list ("Latency numbers every programmer should know") se ye idea mashhoor hua. Hardware badalta rehta hai, isliye inhe exact values nahi, <strong>orders of magnitude</strong> samjho.` },
    { type: 'callout', tone: 'term', title: 'Naye words: ms, µs, ns (time ke chhote units)', html: `<strong>Ye kya hai:</strong> second ke chhote tukde, har step 1,000 guna chhota.<br><strong>1 ms</strong> (millisecond) = second ka 1,000va hissa. Palak jhapakne mein ~100-400 ms lagte hain.<br><strong>1 µs</strong> (microsecond, "micro") = millisecond ka 1,000va hissa.<br><strong>1 ns</strong> (nanosecond) = microsecond ka 1,000va hissa, yaani second ka 1 billionth (10^-9).<br><strong>Kyun chahiye:</strong> computer ke andar ke kaam ns aur µs mein hote hain, network aur disk ke ms mein. Farak samajhne ke liye units saaf hone chahiye.<br><strong>Iske bina:</strong> "0.1 ms" aur "100 ns" ko same samajh lena (asli mein 1,000 guna farak).` },
    { type: 'image', src: 'assets/img/numbers/hopper-nanosecond.jpg', alt: 'Neele background pe rang-birange patle taaron ka ek gucchha, har taar lagbhag 30 cm lamba', maxWidth: 420, caption: 'Computer scientist Grace Hopper lectures mein aise taar baant-ti thin aur kehti thin: "ye ek nanosecond hai". Har taar ~30 cm ka hai, kyunki 1 ns mein roshni (aur bijli ka signal) bas itna hi chal paati hai. Isi se samajh aata hai ki door ka server kyun slow hai: 1 ms mein bhi signal sirf ~300 km (fibre mein ~200 km) jaata hai.', credit: { text: 'National Museum of American History (Smithsonian), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Grace_Murray_Hopper_visualizing_nanoseconds.png', license: 'Public domain' } },
    { type: 'table', head: ['Kaam', 'Lagbhag time', 'Matlab'], rows: [
      ['Read from RAM', '~100 ns', 'Sabse fast jagah jahan data "rakha" ja sakta hai'],
      ['SSD random read', '~0.1 ms (100 µs)', 'RAM se ~1,000× slow'],
      ['Redis GET, same data centre (network samet)', '~0.5-1 ms', 'Redis khud microseconds leta hai; zyada time network ka'],
      ['Round trip within one region', '~1-2 ms', 'Alag availability zones ke beech'],
      ['Simple indexed DB query', '~1-10 ms', 'Cache se ~10× slow'],
      ['Round trip India ↔ US', '~200-250 ms', 'Roshni ki speed + cables ka lamba raasta; bandwidth se nahi ghatega'],
      ['Human "feels instant"', '< 100-200 ms', 'Isse zyada pe user ko "atka hua" lagta hai'],
    ], caption: 'Roadmap ki table. 1 ms = 1,000 µs (microseconds) = 1,000,000 ns (nanoseconds).' },
    { type: 'callout', tone: 'term', title: 'Naya word: L1 cache', html: `<strong>Ye kya hai:</strong> CPU ke andar hi ek bahut chhoti (kuch KB) aur bahut fast memory. Usse padhna ~1 ns ka kaam hai (lagbhag 0.5-1 ns), RAM se ~100× fast.<br><strong>Kyun yahan:</strong> ye ladder ka sabse neeche wala paayedan hai: isse tez kuch nahi. System design mein hum ise control nahi karte, bas tulna ke liye use karte hain.<br><strong>Iske bina (ye pata na ho to):</strong> RAM ko "sabse fast" maan loge aur bhool jaoge ki CPU ke andar bhi ek level hai.` },
    { type: 'p', html: `Nanoseconds aur milliseconds dimaag mein "feel" nahi hote. To ek trick: maan lo <strong>1 ns = 1 second</strong> (yaani L1 cache read = 1 second). Ab baaki sab ko bhi 1 billion guna bada karo. Bar <strong>log scale</strong> pe hai: har baraabar kadam = 10 guna zyada time, warna chhote numbers dikhte hi nahi. Kisi bhi row pe click karo:` },

    { type: 'custom', render(el) {
      const L = [
        ['L1 cache read', 1, 'CPU ke andar'],
        ['L2 cache read', 7, 'CPU ke andar, thoda bada'],
        ['RAM read', 100, 'App server ki memory'],
        ['SSD random read', 1e5, '~0.1 ms'],
        ['Round trip, same data centre', 5e5, '~0.5 ms'],
        ['Redis GET (same DC, network samet)', 1e6, '~0.5-1 ms'],
        ['Round trip, one region (zones ke beech)', 1.5e6, '~1-2 ms'],
        ['Simple indexed DB query', 5e6, '~1-10 ms'],
        ['Hard disk seek (HDD)', 1e7, '~10 ms'],
        ['Human "instant" limit', 1e8, '~100 ms'],
        ['Round trip California ↔ Netherlands', 1.5e8, '~150 ms'],
        ['Round trip India ↔ US', 2e8, '~200-250 ms'],
      ];
      el.innerHTML = `<div class="nmLad" style="display:grid;gap:6px"></div>
        <div class="stats">
          <div class="stat"><span>Asli time</span><strong class="nmA"></strong></div>
          <div class="stat"><span>Agar 1 ns = 1 second</span><strong class="nmH"></strong></div>
          <div class="stat"><span>RAM se kitna slow</span><strong class="nmR"></strong></div>
        </div>
        <div class="calc-note nmLn"></div>`;
      const real = ns => ns < 1e3 ? ns + ' ns' : ns < 1e6 ? +(ns / 1e3).toPrecision(3) + ' µs' : +(ns / 1e6).toPrecision(3) + ' ms';
      const hum = s => s < 60 ? +s.toPrecision(2) + ' second' : s < 3600 ? +(s / 60).toPrecision(2) + ' minute' : s < 86400 ? +(s / 3600).toPrecision(2) + ' ghante' : s < 86400 * 60 ? +(s / 86400).toPrecision(2) + ' din' : s < 86400 * 365 ? +(s / 86400 / 30).toPrecision(2) + ' mahine' : +(s / 86400 / 365).toPrecision(2) + ' saal';
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
        el.querySelector('.nmR').textContent = ns >= 100 ? '×' + (ns / 100).toLocaleString('en-US') : 'RAM se fast';
        el.querySelector('.nmLn').textContent = `Bar log scale pe hai: har 1/9 hissa = 10× zyada time (1 ns se 1 s tak). ${L[sel][0]}: ${L[sel][2]}. Agar 1 ns = 1 second hota, to ye ${hum(ns)} leta.`;
      };
      draw();
    }},
    { type: 'callout', tone: 'why', title: 'Is ladder se design ke 3 sabak', html: `<strong>1.</strong> RAM aur network/disk ke beech hazaaron guna farak hai. Isliye cache (RAM) itna kaam ka hai.<br><strong>2.</strong> Data centre ke andar ek round trip (~0.5 ms) sasta lagta hai, lekin ek request agar 100 calls sequence mein kare to 50 ms gaye.<br><strong>3.</strong> India se US ka ek round trip (~200 ms) akela hi "instant" ka poora budget kha jaata hai. Doori ko sirf data paas laakar (CDN, regional servers) hara sakte ho.` },

    { type: 'h2', text: 'Ek request ka time budget' },
    { type: 'p', html: `Ab in numbers ko ek asli request pe lagao. xyz.com ka Mumbai region hai. Target: user ko page <strong>200 ms</strong> ke andar mile (human "instant"). Har hop us budget mein se kuch kharch karta hai. Saare scenarios chala ke dekho budget kahan toot-ta hai:` },
    { type: 'flow', height: 310,
      nodes: [
        { id: 'u', label: 'User, Chennai', sub: 'budget 200 ms', x: 90, y: 155, w: 150, kind: 'client', info: 'Ye kya hai: xyz.com kholne wala user, Chennai se. Uska phone/browser. Chennai se Mumbai region tak network round trip ~20-40 ms (alag ISP aur raaste pe depend karta hai).' },
        { id: 'app', label: 'App server', sub: 'Mumbai, behind LB', x: 330, y: 155, w: 160, kind: 'server', info: 'Ye kya hai: wo computer jo page banata hai (Load Balancer ke peeche). Request ka kaam yahan hota hai. Code khud kuch milliseconds leta hai. Asli time network calls (cache, DB) mein jaata hai, aur ye calls ek ke baad ek hon to time jud-ta jaata hai.' },
        { id: 'cache', label: 'Redis cache', sub: 'RAM, ~0.5-1 ms', x: 580, y: 65, w: 180, kind: 'cache', info: 'Ye kya hai: RAM mein data rakhne wala tez store. Kyun yahan: database tak jaane se bachne ke liye. Same data centre mein Redis GET ~0.5-1 ms, aur zyada tar time network ka hai. Data RAM mein hai, isliye fast.' },
        { id: 'db', label: 'Database', sub: 'indexed, ~1-10 ms', x: 580, y: 245, w: 180, kind: 'data', meter: true, load: 30, info: 'Ye kya hai: xyz.com ka asli, pakka data (disk pe). Index wali simple query ~1-10 ms. Lekin agar data RAM (buffer cache) mein na ho aur disk se padhna pade, ya index na ho, to time kai guna badh jaata hai.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }],
      scenarios: [
        { name: 'Cache hit (fast)', steps: [
          { title: 'Request Mumbai pahunchi', text: 'Chennai se Mumbai: aadha round trip, ~15 ms.', go: 'u>app', msg: 'GET /feed            budget used: ~15 ms' },
          { title: 'Cache se data', text: 'Redis ke paas feed hai. ~1 ms.', go: ['app>cache', 'res:cache>app'], set: { db: { state: 'dim' } }, after: { cache: { state: 'hit', sub: 'HIT, ~1 ms' } }, msg: 'GET feed:42  →  hit      budget used: ~16 ms' },
          { title: 'Response wapas', text: 'Wapas ka safar ~15 ms, plus code ~5 ms. Total ~35 ms. Budget ka sirf ~20%.', go: 'res:app>u', after: { u: { state: 'ok', sub: '~35 ms, instant' } }, msg: 'Total ≈ 15 + 1 + 5 + 15 ≈ 35 ms   ✓' },
        ]},
        { name: 'Cache miss', steps: [
          { title: 'Request aayi', text: 'Same ~15 ms.', go: 'u>app' },
          { title: 'Cache miss', text: 'Redis mein nahi mila (~1 ms waste).', go: ['app>cache', 'bad:cache>app'], after: { cache: { state: 'miss', sub: 'MISS' } } },
          { title: 'Index se DB query', text: 'Index wali query ~5 ms. Result cache mein bhi daal diya.', go: ['app>db', 'res:db>app'], msg: 'SELECT ... WHERE user_id = 42 ORDER BY time LIMIT 20   (~5 ms)' },
          { title: 'Response', text: 'Total ~40 ms. Phir bhi budget mein. Index wala DB "slow" nahi hai, bas cache se ~10× slow hai.', go: 'res:app>u', after: { u: { state: 'ok', sub: '~40 ms' } } },
        ]},
        { name: 'Slow disk (failure)', intro: 'Ek nayi query bina index ke ship ho gayi, aur data RAM mein bhi nahi hai.', steps: [
          { title: 'Request aayi', text: '~15 ms.', go: 'u>app' },
          { title: 'Cache miss', text: 'Is query ka result cache nahi hota.', go: ['app>cache', 'bad:cache>app'], after: { cache: { state: 'miss', sub: 'MISS' } } },
          { title: 'DB disk pe bhatak raha hai', text: 'Index nahi hai, to database ko bahut saari rows disk se padhni padti hain. Hard disk pe har random seek ~10 ms. 30 seeks = 300 ms. SSD pe bhi hazaaron random reads milke sau ms tak pahunch jaate hain.', go: 'app>db', after: { db: { state: 'hot', load: 95, sub: 'disk pe ~300 ms' } }, msg: '30 random reads × ~10 ms (HDD seek) ≈ 300 ms' },
          { title: 'Budget toot gaya', text: 'Total ~330 ms. User ko page atka hua lagta hai. Aur ab DB busy hai, to doosri queries bhi line mein lag gayin. Fix: sahi <strong>index</strong>, hot data RAM mein (cache ya DB buffer), SSD.', go: 'res:db>app>u', after: { u: { state: 'down', sub: '~330 ms, slow!' } } },
        ]},
        { name: 'Chatty calls (failure)', intro: 'Har call fast hai, phir bhi page slow. Kaise?', steps: [
          { title: 'Request aayi', text: '~15 ms.', go: 'u>app' },
          { title: '50 calls, ek ke baad ek', text: 'Code har post ke author ka naam alag query se laata hai (isse "N+1 queries" problem kehte hain). Har call ~2 ms, lekin 50 sequence mein = 100 ms.', flood: { paths: ['app>db'], n: 10 }, after: { db: { state: 'warn', sub: '50 × 2 ms = 100 ms' } } },
          { title: 'Budget aadha gaya', text: 'Total ~135 ms. Fix: ek hi query mein saare authors lao (batch), ya calls parallel karo. Ladder ka sabak: round trips ginti mein kam rakho.', go: 'res:app>u', after: { u: { state: 'warn', sub: '~135 ms' } } },
        ]},
        { name: 'Door ka user (failure)', intro: 'Ab user New York mein hai, server abhi bhi sirf Mumbai mein.', steps: [
          { title: 'Request samundar paar', text: 'New York se Mumbai: aadha round trip hi ~100-125 ms.', set: { u: { label: 'User, New York', sub: 'budget 200 ms' } }, go: 'u>app' },
          { title: 'Server fast hai', text: 'Cache hit, ~1 ms. Server ki taraf koi problem nahi.', go: ['app>cache', 'res:cache>app'], after: { cache: { state: 'hit', sub: 'HIT' } } },
          { title: 'Phir bhi slow', text: 'Wapas bhi ~100-125 ms. Total ~230 ms, aur naye HTTPS connection pe TCP + TLS handshake ke extra round trips milke 500 ms+. Bada server ya zyada bandwidth kuch nahi karega. Fix: US mein region ya CDN, yaani data user ke paas.', go: 'res:app>u', after: { u: { state: 'down', sub: '~230-500+ ms' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Ek machine kitna kar sakti hai' },
    { type: 'p', html: `QPS nikaal liya. Ab "kitni machines?" ke liye chahiye ki <em>ek</em> machine kitna jhel sakti hai. Ye interview-grade ballparks hain, benchmarks nahi: asli number hardware, payload size aur query ke shape pe depend karta hai. Lekin order of magnitude ke liye kaafi.` },
    { type: 'table', head: ['Ek machine', 'Ballpark', 'Note'], rows: [
      ['Stateless app server, simple JSON API', '1k-10k req/s', 'Agar har request asli kaam kare (DB calls, logic) to ~1k-2k maano'],
      ['PostgreSQL / MySQL node', '~5k-20k simple writes/s; reads zyada', 'Hardware aur indexes pe bahut depend karta hai'],
      ['Redis node', '~100k+ ops/s', 'Commands single-threaded execute hote hain, sab RAM mein'],
      ['Cassandra node', '~10k-50k writes/s', 'Nodes badhao to capacity lagbhag seedhi line mein badhti hai'],
      ['Kafka broker', '~100s of MB/s', 'Poore cluster mein millions of chhote messages/s'],
      ['WebSocket gateway', '~50k-500k idle connections', 'Estimate mein 100k use karo'],
      ['Single DB comfortable size', '~1-5 TB', 'Isse aage sharding ya archiving socho'],
    ], caption: 'Roadmap ki table. Redis ke official benchmark page pe ek normal Linux box pe bina pipelining ~1.8 lakh SET/s dikhaya gaya hai; pipelining se ~15 lakh+.' },
    { type: 'callout', tone: 'term', title: 'Naya word: Headroom', html: `<strong>Ye kya hai:</strong> jaan-boojh ke chhodi gayi khaali capacity. Estimate mein machines ~1.5× zyada rakhte hain, yaani har machine peak pe bhi ~65% pe chalti hai.<br><strong>Kyun chahiye:</strong> 100% ke paas server ki line (queue) lambi hoti hai aur latency phat jaati hai ("Latency, throughput aur p99" lesson). Aur ek machine gire to uska bojh baaki pe aata hai; khaali jagah hogi tabhi wo sambhaal paayenge.<br><strong>Iske bina:</strong> sab servers 95% pe, ek gira, baaki overload, ek ke baad ek sab gire (cascading failure).` },
    { type: 'callout', tone: 'term', title: 'Naya word: Availability zone (AZ)', html: `<strong>Ye kya hai:</strong> ek region (jaise Mumbai) ke andar alag building/data centre, jiski apni bijli aur network hai. Cloud regions mein aksar 3 zones hote hain.<br><strong>Kyun chahiye:</strong> machines ko 2-3 zones mein baanto, taaki ek building mein aag ya bijli jaaye to site chalti rahe.<br><strong>Iske bina:</strong> saari machines ek jagah: ek building ka problem = poori site down.` },
    { type: 'p', html: `Ab in sab ko jod ke dekho: kitna load hai, ek machine kitna jhelti hai, kitna headroom. Machines ki ginti 3 zones mein barabar baant ke round up hoti hai:` },
    { type: 'custom', render(el) {
      const KIND = [
        ['App server (asli kaam)', 1500, 'req/s'], ['App server (simple JSON)', 5000, 'req/s'], ['SQL DB node (writes)', 10000, 'writes/s'],
        ['Redis node', 100000, 'ops/s'], ['Cassandra node (writes)', 20000, 'writes/s'], ['WebSocket gateway', 100000, 'connections'],
      ];
      el.innerHTML = `<div class="row2">
          <div><label>Machine ka type</label><select class="nmMk">${KIND.map((k, i) => `<option value="${i}">${k[0]} (~${k[1].toLocaleString('en-US')} ${k[2]})</option>`).join('')}</select></div>
          <div><label>Peak load <span class="nmMu"></span></label><input class="nmMl" type="number" value="30000" min="0" step="1000"></div>
          <div><label>Headroom: <strong class="nmMhV"></strong></label><input class="nmMh" type="range" min="1" max="2" step="0.1" value="1.5"></div>
          <div><label>Zones: <strong class="nmMzV"></strong></label><input class="nmMz" type="range" min="1" max="3" step="1" value="3"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Bina headroom</span><strong class="nmM0"></strong></div>
          <div class="stat"><span>Headroom ke saath</span><strong class="nmM1"></strong></div>
          <div class="stat"><span>Zones mein round up</span><strong class="nmM2"></strong></div>
          <div class="stat"><span>Har machine peak pe</span><strong class="nmM3"></strong></div>
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
        const tail = z === 1 ? 'Sirf 1 zone: wo building gayi to poori site down. Kam se kam 2-3 zones rakho.'
          : `Ek zone poora gaya to bache ${fmt(left)} machines pe ${Math.round(load / (left * k[1]) * 100)}% load${load / (left * k[1]) > 1.001 ? ': overload! Zyada headroom chahiye.' : '.'}`;
        el.querySelector('.nmMn').textContent = `${fmt(load)} ÷ ${fmt(k[1])} = ${fmt(+raw.toPrecision(3))} machines kaam ke liye. × ${h.toFixed(1)} headroom = ${fmt(withH)}. ${z} zones mein barabar = ${fmt(fin)}. ${tail}`;
      };
      ['.nmMk', '.nmMl', '.nmMh', '.nmMz'].forEach(c => { el.querySelector(c).addEventListener('input', upd); el.querySelector(c).addEventListener('change', upd); }); upd();
    }},
    { type: 'p', html: `Default: 30,000 req/s, har app server ~1,500 req/s (asli kaam). 30,000 ÷ 1,500 = <strong>20 machines</strong> sirf kaam ke liye. × 1.5 headroom = <strong>30</strong>, 3 zones mein 10-10. Peak pe har machine ~67% pe. Agar ek poora zone gir jaaye, to bache 20 machines pe 100% load: bas kinare pe. Isliye bahut zaroori systems mein headroom aur bhi zyada rakhte hain.` },

    { type: 'h2', text: 'Availability ke nines' },
    { type: 'p', html: `"Availability, nines aur SPOF" lesson mein slider ghumaya tha. Yahan bas table yaad karne ke liye. Ek trick: <strong>99.9% = saal mein ~9 ghante</strong> yaad rakho. Har extra 9 downtime ko 10 guna kam karta hai.` },
    { type: 'table', head: ['Availability', 'Downtime per year', 'Per month'], rows: [
      ['99% (two nines)', '≈ 3.65 days', '≈ 7.3 h'],
      ['99.9%', '≈ 8.8 h', '≈ 44 min'],
      ['99.99%', '≈ 53 min', '≈ 4.4 min'],
      ['99.999%', '≈ 5.3 min', '≈ 26 s'],
    ], caption: 'Hisaab: downtime = (1 - availability) × time. 0.001 × 365 × 24 h = 8.76 h. Per month = per year ÷ 12.' },
    { type: 'callout', tone: 'tip', title: 'Napkin trick: serial chain', html: `Agar request 3 components se guzarti hai aur har ek 99.9% hai, to poora raasta lagbhag 99.9% × 3 ≈ 99.7% (downtime jud jaate hain: 3 × 0.1% = 0.3%). Isliye ek chain mein jitne zyada zaroori boxes, utni kam availability, aur isliye har zaroori box ki copy (redundancy) chahiye.` },

    { type: 'h2', text: 'Flashcards: khud ko test karo' },
    { type: 'p', html: `Yaad karna padhne se nahi, <em>yaad karne ki koshish</em> se hota hai. Card dekho, mann mein answer socho, phir palto. Jo nahi aaya wo card end mein dobara aayega.` },
    { type: 'custom', render(el) {
      const CARDS = [
        ['Ek din mein kitne seconds (napkin)?', '≈ 10^5 (asli 86,400)'],
        ['1 million per day = ? per second', '≈ 12 / s'],
        ['100 million per day = ? per second', '≈ 1,200 / s'],
        ['1 billion per day = ? per second', '≈ 12,000 / s'],
        ['Peak ÷ average (normal app)?', '× 2 se × 5 (live events pe ×10+)'],
        ['1 million × 1 KB = ?', '1 GB'],
        ['1 crore = ? million', '10 million (aur 1 billion = 100 crore)'],
        ['2^10 ≈ ?   2^32 ≈ ?', '≈ 1,000   ≈ 4.3 billion'],
        ['Saal mein kitne din (napkin)?', '≈ 400'],
        ['UUID ka size?', '16 B (text mein 36 characters)'],
        ['Typical DB row?', '0.5-1 KB'],
        ['1 minute 1080p video?', '≈ 30-50 MB'],
        ['Compressed photo?', '200 KB - 2 MB'],
        ['1 LLM token ≈ ?', '≈ 4 English characters'],
        ['RAM read?', '~100 ns'],
        ['SSD random read?', '~0.1 ms'],
        ['Redis GET same DC?', '~0.5-1 ms'],
        ['Simple indexed DB query?', '~1-10 ms'],
        ['Round trip India ↔ US?', '~200-250 ms'],
        ['Ek app server (simple API)?', '1k-10k req/s (real kaam pe ~1k-2k)'],
        ['Ek Redis node?', '~100k+ ops/s'],
        ['Ek WebSocket gateway (estimate)?', '100k connections'],
        ['Single DB comfortable size?', '~1-5 TB'],
        ['99.9% = saal mein kitna downtime?', '≈ 8.8 ghante (mahine mein ~44 min)'],
        ['99.99% = saal mein kitna downtime?', '≈ 53 minute'],
      ];
      el.innerHTML = `<div class="nmCard" style="min-height:120px;border:1px solid var(--line-2);border-radius:var(--r);background:var(--surface-2);padding:18px;display:flex;flex-direction:column;justify-content:center;gap:10px">
          <div class="nmQ" style="font:600 18px/1.35 var(--f-display);color:var(--ink)"></div>
          <div class="nmAns" style="font:600 20px/1.3 var(--f-mono);color:var(--accent-ink)"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
          <button type="button" class="btn small primary nmFlip">Answer dikhao</button>
          <button type="button" class="btn small nmYes">Pata tha</button>
          <button type="button" class="btn small nmNo">Nahi pata tha</button>
          <button type="button" class="btn small ghost nmRe">Shuru se</button>
        </div>
        <div class="stats"><div class="stat"><span>Card</span><strong class="nmPos"></strong></div><div class="stat"><span>Pata tha</span><strong class="nmOk"></strong></div><div class="stat"><span>Dobara aayenge</span><strong class="nmMiss"></strong></div></div>`;
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
        if (!queue.length) { q.textContent = 'Sab cards ho gaye! Saare ' + CARDS.length + ' numbers yaad.'; a.textContent = ''; el.querySelector('.nmPos').textContent = 'done'; return; }
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

    { type: 'h2', text: 'In numbers ko kaise use karein' },
    { type: 'callout', tone: 'why', title: 'Decide', html: `Estimation precision ke liye nahi, <strong>design sawaalon</strong> ke liye hai: cache chahiye? Sharding chahiye? 5 servers ya 500? <strong>Aggressively round karo</strong>, powers of ten mein socho, aur sirf order of magnitude sahi rakho. Jo number design nahi badalta, use nikaalne mein time mat lagao.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "exact number chahiye"', html: `Interview mein 86,400 se long division karna ya 1,157.4 QPS bolna impress nahi karta. Interviewer ye dekhta hai ki tumne number se <em>kya conclusion</em> nikaala. "~1k/s average, peak ~3k/s, to Load Balancer ke peeche 2-3 servers aur ek DB kaafi" > "1,157.407 QPS".` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: per day aur per second mix karna', html: `Sabse common galti: storage per day mein nikaala, bandwidth per second mein, aur phir dono ko jod diya. Har number ke saath uski unit likho (/s, /day, GB, GB/s). Unit galat = answer 10^5 guna galat.` },

    { type: 'diagram', title: 'Numbers ki poori picture: xyz.com ka estimation pipeline', height: 460,
      groups: [
        { label: 'Andaze (inputs)', x: 20, y: 30, w: 180, h: 400 },
        { label: 'Hisaab', x: 260, y: 30, w: 200, h: 400 },
        { label: 'Design faisla', x: 520, y: 30, w: 180, h: 400 },
      ],
      nodes: [
        { id: 'users', label: 'DAU', sub: '1 crore (10M)', x: 110, y: 100, w: 150, kind: 'client', info: 'Ye kya hai: roz kitne alag log xyz.com kholte hain. Yahi poore hisaab ki shuruaat hai. Yahan: 1 crore = 10 million = 10^7.' },
        { id: 'act', label: 'Per user/din', sub: '5 likhe, 100 padhe', x: 110, y: 230, w: 150, kind: 'client', info: 'Ye kya hai: ek user din mein kitni baar likhta (write) aur padhta (read) hai. Yahan 5 comments likhe, 100 padhe: read:write = 20:1.' },
        { id: 'size', label: 'Size table', sub: 'comment ~1 KB', x: 110, y: 360, w: 150, kind: 'data', info: 'Ye kya hai: "cheezon ka size" wali table. Ek comment metadata ke saath ~1 KB, photo ~500 KB. Storage aur bandwidth isi se nikalte hain.' },
        { id: 'qps', label: 'QPS', sub: '÷ 10^5, × 3 peak', x: 360, y: 100, w: 170, kind: 'server', info: 'Ye kya hai: per second traffic. Writes: 5 crore/din ÷ 10^5 = 500/s, peak 1,500/s. Reads: 100 crore/din ÷ 10^5 = 10k/s, peak 30k/s.' },
        { id: 'bw', label: 'Bandwidth', sub: 'QPS × size', x: 360, y: 230, w: 170, kind: 'net', info: 'Ye kya hai: har second kitna data bahar jaata hai. 30k reads/s × 1 KB = 30 MB/s ≈ 240 Mbps. Text ke liye chhota number.' },
        { id: 'stor', label: 'Storage', sub: '× 400 din × 3 copies', x: 360, y: 360, w: 170, kind: 'data', info: 'Ye kya hai: kitni disk chahiye. 5 crore × 1 KB = 50 GB/din. × 400 = 20 TB/saal. × 5 saal × 3 copies = 300 TB.' },
        { id: 'srv', label: 'App servers', sub: '~24, 3 zones', x: 610, y: 90, w: 150, kind: 'server', info: 'Ye kya hai: kitni machines. Peak 31,500 req/s ÷ ~2,000 per server × 1.5 headroom ≈ 24, yaani 3 zones mein 8-8.' },
        { id: 'cache', label: 'Cache: haan', sub: '30k reads/s', x: 610, y: 180, w: 150, kind: 'cache', info: 'Ye kya hai: RAM wala tez store (Redis). Kyun: 30k reads/s aur 20:1 ratio, aur latency ladder kehti hai RAM DB se ~10× tez. Hot data ~20% = ~200 GB.' },
        { id: 'cdn', label: 'CDN: abhi nahi', sub: '240 Mbps text', x: 610, y: 270, w: 150, kind: 'edge', info: 'Ye kya hai: user ke shehar ke paas files rakhne wale servers. Text ke 240 Mbps ke liye zaroori nahi. Har read pe 500 KB photo hoti to 15 GB/s: tab CDN ke bina namumkin.' },
        { id: 'db', label: 'Sharding: haan', sub: '300 TB ≫ 5 TB', x: 610, y: 360, w: 150, kind: 'data', info: 'Ye kya hai: data ko kai database machines mein baantna. Kyun: ek DB ka comfortable size ~1-5 TB hai, yahan 300 TB. Bina sharding ke ek machine pe ye data aa hi nahi sakta.' },
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
        { name: 'Traffic', text: 'DAU × har user ke kaam ÷ 10^5 = average QPS, × 3 = peak. Peak se servers aur cache ka faisla.', go: ['users>qps>srv', 'act>qps>cache'] },
        { name: 'Storage', text: 'Writes/din × size × 400 × saal × 3 copies = 300 TB. Ek DB ke 1-5 TB se bahut zyada: sharding.', go: ['act>stor>db', 'size>stor'] },
        { name: 'Bandwidth', text: 'Read QPS × size = 30 MB/s. Text ke liye chhota: CDN abhi nahi. Photos aate hi CDN.', go: ['qps>bw>cdn', 'size>bw'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Powers of 10: guna = zeros jodo, bhaag = zeros ghataao. 1 million = 10 lakh, 1 crore = 10 million, 1 billion = 100 crore.</li>
      <li>Ek din ≈ 10^5 seconds: per day ko per second banana = 5 zeros hatao. Saal ≈ 400 din.</li>
      <li>KB → MB → GB → TB: har step 1,000×. 1 million × 1 KB = 1 GB. Byte = 8 bits; network bits mein.</li>
      <li>2^10 ≈ 10^3; 2^32 ≈ 4.3 billion (32-bit ki hadd), isliye bade IDs 64-bit.</li>
      <li>Latency ladder: RAM ~100 ns, SSD ~0.1 ms, Redis ~1 ms, DB ~1-10 ms, India ↔ US ~200 ms. Doori sabse mehngi.</li>
      <li>Ek machine: app server ~1k-2k (asli kaam), Redis ~100k ops/s, WebSocket gateway ~100k connections, DB ~1-5 TB.</li>
      <li>Peak = 2-5× average; machines × 1.5 headroom, 2-3 zones mein.</li>
      <li>99.9% ≈ 9 ghante/saal downtime; har extra 9 = 10× kam.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Seconds mein design decision: cache, sharding, CDN, kitne servers', 'Interview aur design review mein confident, clear reasoning', 'Galat direction (over-engineering ya under-engineering) jaldi pakad mein aati hai', 'Mental maths aasaan: 10^5, 400, 10^3 steps'], costs: ['Numbers ballpark hain, real capacity planning ke liye load testing chahiye hi', 'Hardware badalta hai (SSD, network): numbers purane ho sakte hain, isliye orders yaad rakho, decimals nahi', 'Galat assumption (jaise peak factor) se poora estimate hil sakta hai', 'Rounding se chhote systems mein galat feeling ho sakti hai; borderline case pe exact maths karo'] },

    { type: 'think', questions: [
      { q: 'xyz.com ke notification service pe 50 crore (500 million) notifications per day jaati hain. Average aur peak QPS kya hoga, aur kya ek server kaafi hai?', a: '500M / 10^5 = 5,000/s average. Peak ×3 ≈ 15,000/s. Ek app server (~1k-10k) kaafi nahi; LB ke peeche kai servers chahiye, aur 15k writes/s ek SQL node ke liye bhi zyada hai. Notifications aksar queue ke through bheji jaati hain taaki spikes smooth ho jaayein.' },
      { q: 'Tumhara Redis Mumbai mein hai aur app server Singapore region mein. Cache "fast" kyun nahi lagega?', a: 'Redis khud microseconds mein jawab deta hai, lekin har GET pe Mumbai-Singapore ka network round trip (~tens of ms) lagega. Ladder ka sabak: cache ka faayda tabhi hai jab wo app server ke paas (same data centre/region) ho. Network latency RAM ki speed ko kha jaati hai.' },
      { q: 'Ek service 99.99% availability chahti hai, lekin wo 4 alag services pe depend karti hai jo har ek 99.9% hain. Possible hai?', a: 'Nahi, jab tak dependencies redundant ya optional na hon. 4 × 0.1% ≈ 0.4% downtime, yaani ~99.6%. Ya to dependencies ki availability badhao, ya unke bina bhi kaam chalne ka design (fallback, cache, async) banao.' },
    ]},
    { type: 'quiz', questions: [
      { q: '2 billion events per day ≈ kitne per second (average)?', options: ['~2,000/s', '~20,000/s', '~200,000/s'], answer: 1, explain: '2 × 10^9 / 10^5 = 2 × 10^4 = 20,000/s. (Exact ~23k/s, same order.)' },
      { q: '10 million users × 2 KB profile = kitna data?', options: ['20 MB', '20 GB', '20 TB'], answer: 1, explain: '10^7 × 2 × 10^3 B = 2 × 10^10 B = 20 GB. Ek machine ki RAM mein bhi aa sakta hai.' },
      { q: 'Kaunsa sabse slow hai?', options: ['SSD random read', 'Same data centre mein Redis GET', 'India ↔ US round trip'], answer: 2, explain: '~200-250 ms. SSD ~0.1 ms aur Redis ~0.5-1 ms se hazaaron guna slow.' },
      { q: '99.9% availability ka matlab saal mein lagbhag kitna downtime?', options: ['~53 minute', '~8.8 ghante', '~3.65 din'], answer: 1, explain: '0.1% × 8,760 ghante ≈ 8.8 ghante. 53 min 99.99% ka hai, 3.65 din 99% ka.' },
      { q: '1 crore kitne million hai?', options: ['1 million', '10 million', '100 million'], answer: 1, explain: '1 crore = 10^7 = 10 million. Aur 1 million = 10 lakh, 1 billion = 100 crore.' },
      { q: 'Ek 32-bit number (int) se lagbhag kitne alag IDs ban sakte hain?', options: ['~65 thousand', '~4.3 billion', '~18 billion billion'], answer: 1, explain: '2^32 ≈ 4.3 billion. 65k = 2^16, aur 18 billion billion = 2^64. Bade apps isliye 64-bit IDs lete hain.' },
      { q: '30,000 req/s peak, ek server ~1,500 req/s, 1.5× headroom. Kitne servers?', options: ['20', '30', '45'], answer: 1, explain: '30,000 ÷ 1,500 = 20; × 1.5 = 30. 3 zones mein 10-10.' },
      { q: 'Estimation mein 1 KB ko 1,000 B ya 1,024 B maanna chahiye?', options: ['Hamesha 1,024, warna galat', '1,000: farak ~2.4% hai jo design nahi badalta', 'Koi farak nahi padta kyunki KB aur Kb same hain'], answer: 1, explain: 'Napkin maths mein 10^3 use karo. Aur KB (bytes) aur Kb (bits) alag hain: 8× ka farak.' },
    ]},
    { type: 'sources', note: 'Saare tables roadmap ke Phase 4 se hain. Latency aur Redis numbers neeche ke public sources se cross-check kiye.', items: [
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
