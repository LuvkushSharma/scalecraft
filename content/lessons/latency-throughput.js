Lesson.register({
  id: 'latency-throughput',
  title: 'Latency, throughput aur p99',
  minutes: 27,
  summary: `Latency = ek request kitni der mein. Throughput = ek second mein kitni requests. Bandwidth = pipe kitna chauda. Aur "average latency" sabse dhokhebaaz number hai, isliye engineers p50, p95, p99 dekhte hain. Is lesson mein teenon ka farak (calculator ke saath), load badhne pe latency kyun phat'ti hai, Little's law, live histogram se percentiles, tail latency, latency ke numbers, aur SLI/SLO/SLA.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Do sawaal hain jo har website ke baare mein poochhe jaate hain. Pehla: <strong>"maine click kiya, page kitni der mein aaya?"</strong> Doosra: <strong>"ek second mein kitne logon ka kaam ho sakta hai?"</strong><br>Pehle ko latency kehte hain, doosre ko throughput. Dono alag hain: ek site bahut logon ko sambhal sakti hai lekin har ek ko thoda intezaar karwa ke.<br>Aur ek chupa hua sach: "average" sab theek dikha deta hai jabki kuch users bahut der tak ruke hote hain. Is lesson mein unhi badkismat users ko naapna seekhenge.` },

    { type: 'h2', text: 'Problem: dashboard kehta hai sab theek, users kehte hain site slow' },
    { type: 'p', html: `xyz.com ki team ka dashboard dikhata hai: "average response time 75 ms". Bahut tez! Lekin support pe roz shikayat aati hai: "page khulne mein 1-2 second lagte hain". Dono sach kaise ho sakte hain? Iska jawab samajhne ke liye pehle teen words saaf karte hain.` },

    { type: 'h2', text: 'Teen alag cheezein: latency, throughput, bandwidth' },
    { type: 'callout', tone: 'term', title: 'Naya word: Latency', html: `<strong>Ye kya hai:</strong> ek kaam ko shuru se khatam hone mein kitna time laga. Website ke liye: click se le ke jawab aane tak. Unit: milliseconds (ms; 1 second = 1,000 ms).<br><strong>Kyun zaroori:</strong> yahi user ko "fast" ya "slow" mehsoos hota hai. Research aur experience dono kehte hain: ~100-200 ms tak cheez "turant" lagti hai, 1 second ke baad dhyaan bhatakta hai.<br><strong>Example:</strong> xyz.com ka <code>/feed</code> 120 ms mein aaya: latency 120 ms.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Throughput', html: `<strong>Ye kya hai:</strong> system ek second mein kitne kaam <em>poore</em> karta hai. Websites ke liye aksar <strong>QPS</strong> (queries per second) ya <strong>RPS</strong> (requests per second).<br><strong>Kyun zaroori:</strong> ye batata hai kitne users ek saath sambhal sakte ho, aur kitne servers chahiye.<br><strong>Example:</strong> ek server 1 second mein 2,000 requests poori karta hai: throughput 2,000 RPS.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Bandwidth', html: `<strong>Ye kya hai:</strong> network ek second mein <em>maximum</em> kitna data le ja sakta hai. Pipe ki chaudai. Unit: Mbps / Gbps (megabits/gigabits per second; 8 bits = 1 byte).<br><strong>Kyun zaroori:</strong> badi files (video, photos, backups) ka time isi se tay hota hai.<br><strong>Example:</strong> 100 Mbps connection pe 1 GB (8,000 megabits) file = kam se kam 80 second.` },
    { type: 'table', head: ['Word', 'Highway mein', 'xyz.com mein', 'Unit'], rows: [
      ['<strong>Latency</strong>', 'Ek car ko A se B pahunchne mein kitna time', 'Ek request ka response kitni der mein aaya', 'ms'],
      ['<strong>Throughput</strong>', 'Ek ghante mein kitni cars B tak pahunchin', 'Server ek second mein kitni requests poori karta hai', 'requests/sec (QPS)'],
      ['<strong>Bandwidth</strong>', 'Highway mein kitni lanes hain', 'Network max kitna data ek second mein le ja sakta hai', 'Mbps / Gbps'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: RTT (round trip time)', html: `<strong>Ye kya hai:</strong> ek chhota sa message user se server tak jaaye aur jawab wapas aaye, isme kitna time. Jaise <code>ping</code> command dikhata hai.<br><strong>Kyun zaroori:</strong> har naya connection kai round trips leta hai (TCP handshake, TLS handshake, phir request: "TCP, UDP, HTTPS" lesson yaad karo). To door ke server ke saath har round trip ka time kai baar judta hai.<br><strong>Example:</strong> Mumbai se Mumbai ka server: ~1-5 ms RTT. Mumbai se US: ~200-250 ms RTT.` },
    { type: 'p', html: `Ek request ki latency kahan kahan se banti hai? Teen hisse:` },
    { type: 'list', items: [
      `<strong>Network (raasta):</strong> data ko cable mein safar karna padta hai. Isme doori sabse badi cheez hai.`,
      `<strong>Queue (line mein intezaar):</strong> server busy hai to request line mein rukti hai. Load badhne pe ye sabse tez badhta hai (aage dekhenge).`,
      `<strong>Processing (asli kaam):</strong> code chalna, database query, cache lookup.`,
    ]},
    { type: 'image', src: 'assets/img/latency-throughput/fibre-optic.jpg', alt: 'Andhere mein chamakte hue patle optical fibre ke dhaage, har dhaage ke sire pe roshni ka bindu', maxWidth: 320, caption: 'Internet ka data in jaise glass ke patle dhaagon (optical fibre) mein roshni ban ke chalta hai. Glass mein roshni lagbhag 2 lakh km per second chalti hai. Isse tez kuch nahi, aur yahi latency ki ek pakki hadd hai.', credit: { text: 'BigRiz, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Fibreoptic.jpg', license: 'CC BY-SA 3.0' } },
    { type: 'p', html: `Hisaab lagao: Mumbai se US ki east coast lagbhag 13,000 km hai. Fibre mein roshni ~2,00,000 km/s, to ek taraf 65 ms, aana-jaana (RTT) kam se kam <strong>130 ms</strong>. Asli mein 200-250 ms, kyunki cables seedhi nahi jaatin aur raaste mein routers bhi time lete hain. Koi bhi bandwidth ye 130 ms kam nahi kar sakti.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `Zyada bandwidth se latency kam nahi hoti. 10 lane ki highway pe bhi Chennai se Delhi pahunchne mein utna hi time lagega. Isliye latency kam karne ka asli tareeka hai data ko user ke <strong>paas</strong> le jaana (CDN, regional servers), ya round trips kam karna. Bandwidth tab kaam aati hai jab file <em>badi</em> ho.` },
    { type: 'p', html: `Khud dekho kab latency jeetti hai aur kab bandwidth. Simple model: ek file mangwane mein <strong>3 round trips</strong> (connection banana + secure karna + request), phir file ka safar <code>size ÷ bandwidth</code>:` },
    { type: 'custom', render(el) {
      const SIZES = [['Chhota page (20 KB)', 20], ['Photo (2 MB)', 2000], ['Movie (1 GB)', 1000000]];
      const BW = [10, 100, 1000], RTT = [['Same shehar (5 ms)', 5], ['India ke andar (50 ms)', 50], ['India ↔ US (230 ms)', 230]];
      const sel = (cls, arr, f, d) => `<select class="${cls}">${arr.map((x, i) => `<option value="${i}"${i === d ? ' selected' : ''}>${f(x)}</option>`).join('')}</select>`;
      el.innerHTML = `<div class="row2">
          <div><label>File</label>${sel('bwS', SIZES, x => x[0], 0)}</div>
          <div><label>Bandwidth</label>${sel('bwB', BW, x => x + ' Mbps', 1)}</div>
          <div><label>Server kitna door (RTT)</label>${sel('bwR', RTT, x => x[0], 2)}</div>
        </div>
        <div class="bwBar" style="display:flex;height:22px;border-radius:6px;overflow:hidden;margin-top:12px;border:1px solid var(--line)"></div>
        <div style="display:flex;gap:14px;font-size:13px;color:var(--ink-3);margin-top:4px"><span><span style="display:inline-block;width:10px;height:10px;background:var(--amber);border-radius:2px"></span> round trips (latency)</span><span><span style="display:inline-block;width:10px;height:10px;background:var(--accent);border-radius:2px"></span> data ka safar (bandwidth)</span></div>
        <div class="stats"><div class="stat"><span>Round trips</span><strong class="bwL"></strong></div><div class="stat"><span>Transfer</span><strong class="bwT"></strong></div><div class="stat"><span>Kul time</span><strong class="bwA"></strong></div></div>
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
          ? `${Math.round(lp)}% time sirf round trips mein gaya. Bandwidth 10 guna karne se kuch nahi badlega; server ko paas lao (CDN) ya round trips kam karo.`
          : lp < 20
          ? `${Math.round(100 - lp)}% time data ke safar mein. Yahan bandwidth hi raja hai: 10 guna bandwidth = lagbhag 10 guna tez.`
          : 'Dono ka asar hai: paas ka server aur zyada bandwidth, dono madad karenge.';
      };
      el.querySelectorAll('select').forEach(s => s.addEventListener('change', upd));
      upd();
    }},
    { type: 'p', html: `Chhota page, 100 Mbps, US ka server: 690 ms round trips mein aur sirf 1.6 ms data mein. Wahi page Mumbai ke server se: 16.6 ms. Ab 1 GB movie: 80 second data ka safar, round trips ka 0.7 second kuch nahi. <strong>Chhoti cheezon ke liye latency, badi cheezon ke liye bandwidth.</strong> Websites zyada tar chhoti cheezein bhejti hain, isliye CDN itne kaam ke hain.` },

    { type: 'h2', text: 'Load badha to latency kyun phat jaati hai' },
    { type: 'p', html: `Latency aur throughput aapas mein jude hain. Ek server socho jo ek request 10 ms mein poori karta hai, to max 100 requests/second. Requests ek ek ke barabar gap pe nahi aatin; kabhi teen ek saath aa jaati hain. Tab baaki line (queue) mein rukti hain. Server jitna busy, line utni lambi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Utilisation', html: `<strong>Ye kya hai:</strong> server apni capacity ka kitna % use kar raha hai. 80 req/s aa rahe hain aur max 100 hai: utilisation 80%.<br><strong>Kyun zaroori:</strong> line ki lambai utilisation ke saath seedhi nahi, <em>bahut tezi se</em> badhti hai jab tum 100% ke paas jaate ho.<br><strong>Iske bina (dhyaan na diya to):</strong> 90% pe chal rahe server pe thoda sa traffic badha aur latency 10 guna.` },
    { type: 'p', html: `Neeche ek simple, mashhoor queue model (M/M/1) ka hisaab hai: average time = <code>kaam ka time ÷ (1 − utilisation)</code>. Slider badhao:` },
    { type: 'custom', render(el) {
      const S = 10;
      el.innerHTML = `<label>Aane wali requests: <strong class="qL"></strong> req/s (server max 100 req/s, har request 10 ms)</label>
        <input class="qR" type="range" min="10" max="99" step="1" value="50">
        <svg class="qSvg" viewBox="0 0 400 170" style="width:100%;margin-top:8px" role="img" aria-label="Utilisation vs latency curve"></svg>
        <div class="stats"><div class="stat"><span>Utilisation</span><strong class="qU"></strong></div><div class="stat"><span>Average latency</span><strong class="qW"></strong></div><div class="stat"><span>System mein ek waqt pe (L = λ × W)</span><strong class="qN"></strong></div></div>
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
          <text x="34" y="22" font-size="11" fill="var(--ink-3)">latency (500 ms tak)</text>`;
        el.querySelector('.qL').textContent = lam;
        el.querySelector('.qU').textContent = Math.round(u * 100) + '%';
        el.querySelector('.qW').textContent = W.toFixed(0) + ' ms';
        el.querySelector('.qN').textContent = L.toFixed(1) + ' requests';
        el.querySelector('.qT').textContent = u < 0.7
          ? 'Aaraam ka zone: line chhoti, latency kaam ke time ke paas.'
          : u < 0.9
          ? 'Line lambi hone lagi. Isliye servers ko 50-70% pe plan karte hain.'
          : 'Khatarnaak zone: thoda sa extra traffic aur latency aasmaan pe. Throughput ab badh nahi raha, sirf intezaar badh raha hai.';
      };
      el.querySelector('.qR').addEventListener('input', draw);
      draw();
    }},
    { type: 'p', html: `Numbers dekho: 50% pe 20 ms, 80% pe 50 ms, 90% pe 100 ms, 95% pe 200 ms, 99% pe 1,000 ms. Kaam ka time 10 ms hi hai, baaki sab line ka intezaar. Asli servers is model se thode alag hote hain, lekin shape yahi rehti hai: <strong>100% ke paas latency phat jaati hai</strong>. Isliye "server 95% pe hai, abhi jagah hai" galat soch hai.` },
    { type: 'h3', text: "Little's law: ek waqt pe kitni requests andar hain?" },
    { type: 'callout', tone: 'term', title: "Naya word: Little's law", html: `<strong>Ye kya hai:</strong> ek seedha sa niyam jo kisi bhi stable system pe lagta hai: <code>L = λ × W</code>. L = system ke andar ek waqt pe kitne kaam, λ (lambda) = har second kitne aate hain, W = har kaam kitni der andar rehta hai.<br><strong>Kyun chahiye:</strong> isse turant pata chalta hai kitne threads, connections ya workers chahiye.<br><strong>Example:</strong> xyz.com pe 2,000 req/s aate hain, har request 100 ms (0.1 s) leti hai. To ek waqt pe 2,000 × 0.1 = <strong>200 requests</strong> chal rahi hain. Server mein 50 threads hain? 150 line mein rukengi. Aur agar database slow hoke W 500 ms ho gaya, to andar 1,000 requests: threads khatam, sab atak gaya.` },
    { type: 'callout', tone: 'tip', html: `Little's law ka sabse kaam ka sabak: <strong>latency badhi to "andar fanse kaam" bhi utne hi guna badhte hain</strong>, chahe traffic same ho. Ek slow database poore app server ke threads kha jaata hai. Isliye timeouts lagaate hain (concurrency lesson mein thread pools ke saath dekhenge).` },
    { type: 'h2', text: 'Average kyun dhokha deta hai' },
    { type: 'p', html: `Maan lo 100 requests mein se 99 ko 50 ms lage aur 1 ko 5 second. Average = (99 × 50 + 5,000) ÷ 100 ≈ 100 ms. "Sab badhiya!" Lekin wo 1 user 5 second ruka. Aur xyz.com ki 1 crore requests per day mein "1%" matlab 1 lakh pareshan requests. Aur aksar ye sabse active users hote hain (jinke paas sabse zyada data hai, isliye unki queries sabse bhaari).` },
    { type: 'callout', tone: 'term', title: 'Naya word: Percentile (p50, p95, p99)', html: `<strong>Ye kya hai:</strong> saari requests ki latency ko chhote se bade ki line mein lagao. <strong>p50</strong> (median) = beech wali: aadhi requests isse fast. <strong>p95</strong> = 95% requests isse fast, sirf 5% slow. <strong>p99</strong> = 99% isse fast, sirf 1% slow. <strong>p99.9</strong> = 1,000 mein se sirf 1 isse slow.<br><strong>Kyun chahiye:</strong> average kuch slow requests ko chhupa deta hai. p99 = "tumhare sabse badkismat users ka experience".<br><strong>Kaise nikaalte hain:</strong> 1,000 requests sort karo; p99 = 990vi wali ki latency.<br><strong>Example:</strong> p99 = 800 ms ka matlab: 100 mein se 99 requests 800 ms se kam mein aayin, 1 usse zyada.` },
    { type: 'p', html: `Khud dekho. Ye 1,000 requests ka histogram hai (har bar = us latency wali kitni requests). "Live traffic" dabao to requests ek ek jhund mein aati dikhengi. Slider se thodi requests ko slow karo (jaise kabhi kabhi database slow hota hai, ya cache miss hota hai):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Kitne % requests slow hain: <strong class="ltSv">2%</strong></label>
        <input class="ltSlow" type="range" min="0" max="20" step="1" value="2">
        <label style="margin-top:10px">Slow request kitni slow (ms): <strong class="ltMv">1200</strong></label>
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
          ? 'Koi slow request nahi: average, p50, p99 sab paas paas.'
          : slowPct < 5
          ? 'Dekho: p50 lagbhag wahi, average thoda sa hila, lekin p99 seedha slow requests pe chala gaya. Sirf average dekhte to ye problem chhup jaati.'
          : 'Ab 5% ya zyada slow: p95 bhi slow requests pe pahunch gaya. Har 20 mein se 1 user pareshan, phir bhi p50 bilkul "healthy" dikh raha hai.';
      };
      q('.ltGo').onclick = () => {
        clearInterval(timer); shown = 50; draw();
        timer = setInterval(() => { shown = Math.min(1000, shown + 50); draw(); if (shown >= 1000) clearInterval(timer); }, 120);
      };
      q('.ltSlow').oninput = () => { shown = 1000; clearInterval(timer); draw(); };
      q('.ltMs').oninput = q('.ltSlow').oninput;
      draw();
    }},
    { type: 'p', html: `Default pe (2% slow, 1,200 ms): average sirf <strong>75 ms</strong>, p50 <strong>53 ms</strong>, p95 <strong>96 ms</strong>, lekin p99 <strong>~1,210 ms</strong>. Slow requests 0 karo to p99 ~113 ms. Yahi upar wali paheli ka jawab: dashboard average dikha raha tha, users p99 jhel rahe the.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `Percentiles ka <strong>average mat lo</strong>. 10 servers ke p99 ka average "poore system ka p99" nahi hai. Sahi tareeka: saari requests (ya unke histograms) ko jod ke phir p99 nikaalo. Aur sirf p99 nahi, uske saath request count bhi dekho: 10 requests ka p99 kuch nahi batata.` },

    { type: 'h2', text: 'Tail latency: bade systems mein p99 sabka dukh ban jaata hai' },
    { type: 'callout', tone: 'term', title: 'Naya word: Tail latency', html: `<strong>Ye kya hai:</strong> latency graph ki lambi "poonch" (tail): woh 1% ya 0.1% requests jo baaki sab se bahut slow hain. p99, p99.9 isi ko naapte hain.<br><strong>Kyun zaroori:</strong> jab ek page kai services ko call karta hai, to har service ki chhoti si tail milke bahut users ko pakad leti hai.<br><strong>Iske bina (dhyaan na diya to):</strong> har service "99% fast" hai, phir bhi har 10 mein se ek page slow.` },
    { type: 'p', html: `xyz.com ka homepage banane ke liye server 10 alag services ko ek saath call karta hai (profile, feed, notifications, ads...). Page tabhi ready jab <strong>sabse slow</strong> wali aaye. Agar har service 1% baar slow hai, to kam se kam ek service slow hone ka chance <code>1 − 0.99<sup>N</sup></code>. Slider chalao:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Kitni services ek saath call: <strong class="faN"></strong></label><input class="faR" type="range" min="1" max="200" step="1" value="10"></div>
          <div><label>Har service kitni baar slow: <strong class="faP"></strong>%</label><input class="faS" type="range" min="0.1" max="5" step="0.1" value="1"></div>
        </div>
        <div class="faBar" style="height:22px;border-radius:6px;background:var(--surface-2);border:1px solid var(--line);overflow:hidden;margin-top:12px"><div class="faFill" style="height:100%;background:var(--red)"></div></div>
        <div class="stats"><div class="stat"><span>Slow page loads</span><strong class="faA"></strong></div><div class="stat"><span>Har 100 users mein</span><strong class="faU"></strong></div></div>`;
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
    { type: 'p', html: `1 service: 1% slow pages. 10 services: <strong>9.6%</strong>. 100 services: <strong>63%</strong>. Ye idea Google ke engineers Jeffrey Dean aur Luiz André Barroso ke famous paper <em>"The Tail at Scale"</em> (2013) se hai. Isliye bade systems mein p99 (aur p99.9) ko kam karna average kam karne se zyada important hai.` },
    { type: 'p', html: `Tail kaatne ke kuch tareeke (paper se aur industry se):` },
    { type: 'list', items: [
      `<strong>Timeouts:</strong> kisi service ka jawab ek hadd (jaise 200 ms) mein na aaye to uske bina page dikha do (jaise ads ke bina). Slow cheez poore page ko na roke.`,
      `<strong>Hedged requests:</strong> request do copies (replicas) mein se ek ko bhejo; thodi der (jaise p95 jitna time) mein jawab na aaye to doosri ko bhi bhej do, jo pehle aaye wo lo. Paper ke ek Google benchmark mein 10 ms baad doosri request bhejne se p99.9 latency 1,800 ms se 74 ms ho gayi, sirf 2% extra requests ke kharche pe.`,
      `<strong>Kam fan-out:</strong> jo data saath chahiye, use saath rakho, taaki ek page ke liye 100 jagah na jaana pade.`,
      `<strong>Headroom:</strong> servers 100% ke paas honge to line lambi aur tail moti (upar wala queue graph).`,
    ]},
    { type: 'p', html: `Ab ek request ko chala ke dekho: tez raasta, slow raasta, aur jab ek service atak jaaye. Har box pe click karke padho wo kya hai:` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'User', x: 80, y: 150, w: 110, kind: 'client', info: 'Ye kya hai: xyz.com ka user. Usse sirf kul time dikhta hai: click se page tak.' },
        { id: 'lb', label: 'Load Balancer', x: 245, y: 150, w: 150, kind: 'net', info: 'Ye kya hai: requests ko servers mein baantne wala. Yahan sirf ek server dikhaya hai taaki latency ka hisaab saaf dikhe.' },
        { id: 'app', label: 'App server', sub: 'page banata hai', x: 440, y: 150, w: 160, kind: 'server', meter: true, load: 40, info: 'Ye kya hai: xyz.com ka code jo cache, DB aur doosri services se data jod ke page banata hai. Meter = kitna busy.' },
        { id: 'cache', label: 'Cache', sub: '~1 ms', x: 630, y: 60, w: 130, kind: 'cache', info: 'Ye kya hai: RAM mein rakha tez data (Redis). Data mil gaya (hit) to DB tak jaana nahi padta.' },
        { id: 'db', label: 'Database', sub: '~5-10 ms', x: 630, y: 240, w: 130, kind: 'data', info: 'Ye kya hai: asli data, disk pe. Cache mein na mile (miss) to yahan aana padta hai: zyada time.' },
        { id: 'ads', label: 'Ads service', sub: 'normal: 20 ms', x: 440, y: 290, w: 160, kind: 'server', info: 'Ye kya hai: page ke ads dene wali alag service. Page ise bhi call karta hai, to iski slowness poore page ko slow kar sakti hai.' },
      ],
      edges: [{ a: 'u', b: 'lb' }, { a: 'lb', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }, { a: 'app', b: 'ads' }],
      scenarios: [
        { name: 'Tez raasta (cache hit)', steps: [
          { title: 'Request aayi', text: 'User ne feed khola. Mumbai ka user, Mumbai ka server: network ~5 ms.', go: 'u>lb>app', msg: 'GET /feed' },
          { title: 'Cache mein mil gaya', text: 'Feed cache mein tha (hit): ~1 ms.', go: ['app>cache', 'res:cache>app'], after: { cache: { state: 'hit' } } },
          { title: 'Ads bhi aaye, page wapas', text: 'Ads service 20 ms mein. Kul ~30-40 ms. Ye request p50 ke aas paas wali hai.', go: ['app>ads', 'res:ads>app', 'res:app>lb>u'] },
        ]},
        { name: 'Cache miss: DB tak', steps: [
          { title: 'Cache mein nahi', text: 'Is user ki feed cache mein nahi thi (miss).', go: ['u>lb>app>cache', 'res:cache>app'], after: { cache: { state: 'miss' } } },
          { title: 'Database se laao', text: 'DB query 5-10 ms, aur DB busy ho to 100+ ms. Aisi requests p95/p99 banati hain.', go: ['app>db', 'res:db>app'], after: { db: { state: 'warn', sub: 'aaj 120 ms' } } },
          { title: 'Page wapas, lekin der se', text: 'Kul ~150 ms. Agli baar ke liye result cache mein daal diya.', go: 'res:app>lb>u', after: { cache: { state: 'hit' } } },
        ]},
        { name: 'Ads service atak gayi', intro: 'Tail latency ka asli roop: ek chhoti si service poore page ko rok leti hai.', steps: [
          { title: 'Ads service slow', text: 'Ads service ka ek server garbage collection mein atka hai (ek kabhi kabhi hone wala pause). Jawab 3 second mein aayega.', set: { ads: { state: 'hot', sub: 'aaj: 3,000 ms' } }, go: 'u>lb>app>ads' },
          { title: 'Bina timeout: sab intezaar', text: 'Feed tayyar hai, lekin page ads ka intezaar kar raha hai. User 3 second safed screen dekhta hai. Ye request p99 mein jaayegi. Aur Little\'s law: ye thread 3 second fansa raha.', after: { app: { load: 90, state: 'warn' } } },
          { title: 'Fix: 200 ms timeout + fallback', text: '200 ms mein ads nahi aaye to unke bina page bhej do. User ko ~230 ms mein page mila, bas ads ki jagah khaali.', go: 'res:app>lb>u', set: { app: { load: 40, state: '', sub: 'timeout 200 ms' } }, msg: '200 OK (ads skipped)' },
        ]},
        { name: 'Overload: line lambi', steps: [
          { title: 'Traffic badha, server 95%', text: 'Har request ka kaam utna hi hai, lekin server lagbhag full. Requests line mein.', flood: { paths: ['u>lb>app'], n: 16 }, after: { app: { load: 95, state: 'hot', sub: 'queue lambi' } } },
          { title: 'Latency kai guna', text: 'Queue graph yaad karo: 95% pe average latency kaam ke time ka 20 guna. Cache hit wali request bhi ab 200+ ms. Fix: aur servers (headroom wapas), ya load shedding.', go: 'bad:app>lb>u', msg: 'p99: 2,400 ms' },
        ]},
      ],
    },
    { type: 'h2', text: 'Kuch numbers jo yaad rakhne layak hain' },
    { type: 'table', head: ['Kaam', 'Lagbhag time'], rows: [
      ['RAM se padhna', '~100 ns (nanosecond = second ka arabvaan hissa)'],
      ['SSD se random read', '~0.1 ms'],
      ['Same data center mein Redis GET (network ke saath)', '~0.5-1 ms'],
      ['Ek region ke andar round trip', '~1-2 ms'],
      ['Simple indexed database query', '~1-10 ms'],
      ['India ↔ US round trip', '~200-250 ms'],
      ['Insaan ko "instant" lagta hai', '< 100-200 ms'],
    ], caption: 'Exact nahi, order of magnitude (kitne zero). RAM se network tak har seedhi ~10-1,000 guna dheemi. Napkin maths lesson mein inka poora use hoga.' },
    { type: 'callout', tone: 'tip', html: `Is table ka sabak: memory (RAM, cache) se padhna network ya disk se hazaaron guna tez hai, aur doosre mahadweep tak jaana sabse mehenga. Isliye latency ke teen bade hathiyaar: <strong>cache</strong> (RAM mein rakho), <strong>CDN / paas ke servers</strong> (doori kam), aur <strong>kam round trips</strong> (ek request mein zyada kaam, connections dobara use karo).` },

    { type: 'h2', text: 'SLI, SLO, SLA: latency ko wada banana' },
    { type: 'callout', tone: 'term', title: 'Naye words: SLI, SLO, SLA', html: `<strong>SLI</strong> (Service Level Indicator): jo naapte ho. "<code>/feed</code> ka p99 latency" ya "safal requests ka %".<br><strong>SLO</strong> (Objective): team ka andar ka target. "28 din mein 99.9% requests 300 ms se kam".<br><strong>SLA</strong> (Agreement): customer se kiya kaanooni wada; toota to paise/credit wapas. SLA hamesha SLO se dheela rakhte hain, taaki SLO tootne pe bhi wada na toote.<br><strong>Kyun chahiye:</strong> "site fast honi chahiye" se koi decision nahi hota. "p99 &lt; 300 ms" se pata chalta hai kab alarm bajao, kab naya feature roko.<br><strong>Example:</strong> xyz.com ka SLO: p99 &lt; 300 ms. Is hafte p99 450 ms gaya to naye features ruk ke pehle speed theek hogi (error budget khatam).` },

    { type: 'h2', text: 'Latency ghataana vs throughput badhaana' },
    { type: 'p', html: `Dono alag problems hain, aur unke ilaaj bhi alag. Kabhi ek ko badhaane se doosra bigadta hai:` },
    { type: 'table', head: ['Tareeka', 'Latency pe asar', 'Throughput pe asar'], rows: [
      ['Cache (RAM mein jawab)', 'Bahut kam (ms → μs)', 'Badhta hai (DB ka bojh kam)'],
      ['CDN / paas ka region', 'Bahut kam (doori kam)', 'Badhta hai (origin ka bojh kam)'],
      ['Aur servers (horizontal)', 'Line chhoti hui to kam, warna same', 'Badhta hai'],
      ['Batching (100 kaam ek saath)', '<strong>Badhta hai</strong> (pehle wala baaki ka intezaar karta hai)', 'Bahut badhta hai'],
      ['Queue mein daal ke baad mein karna (async)', 'User ke liye kam (turant "ho gaya")', 'Badhta hai, lekin kaam der se poora'],
      ['Index / query sudhaarna', 'Kam', 'Badhta hai'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Average nahi, p95/p99 naapo</strong> aur SLO p99 pe rakho. Latency zyada hai: dekho kahan ja raha hai (network, queue, processing), phir cache, CDN/paas ka region, kam round trips. Throughput kam pad raha hai: horizontal scaling, batching, async. Servers ko 50-70% utilisation pe rakho, kyunki 100% ke paas latency phat jaati hai. Kai services ko call karte ho to har call pe timeout aur fallback lagao.` },
    { type: 'diagram', title: 'Ek request ka safar: latency kahan kharch hoti hai', height: 460,
      nodes: [
        { id: 'user', label: 'User', sub: 'Mumbai', x: 100, y: 80, w: 130, kind: 'client', info: 'Ye kya hai: xyz.com kholne wala user. Usse sirf kul latency dikhti hai: click se page tak.' },
        { id: 'cdn', label: 'CDN edge', sub: 'shehar ke paas', x: 330, y: 80, w: 150, kind: 'edge', info: 'Ye kya hai: user ke shehar mein baitha server jo images, JS jaisi files ki copy rakhta hai. Kyun: doori kam = RTT ~5-20 ms, US ke 230 ms ki jagah.' },
        { id: 'lb', label: 'Load Balancer', x: 560, y: 80, w: 150, kind: 'net', info: 'Ye kya hai: requests ko servers mein baantne wala. Kyun yahan: koi ek server 100% pe na pahunche, warna line lambi aur p99 kharab.' },
        { id: 'app', label: 'App server', sub: 'timeouts', x: 330, y: 230, w: 150, kind: 'server', info: 'Ye kya hai: page banane wala code. Yahan har downstream call pe timeout lagta hai, aur Little\'s law yaad: slow DB = fanse hue threads.' },
        { id: 'svc', label: 'Other services', sub: 'feed, ads, profile', x: 580, y: 230, w: 170, kind: 'server', info: 'Ye kya hai: wo services jinhe page banane ke liye ek saath call kiya jaata hai (fan-out). Inki tail latency milke page ki p99 banati hai.' },
        { id: 'cache', label: 'Cache', sub: 'Redis ~1 ms', x: 190, y: 380, w: 140, kind: 'cache', info: 'Ye kya hai: RAM mein rakha tez data store. Kyun: database ke 5-10 ms ki jagah ~1 ms. Cache hit = tez request.' },
        { id: 'db', label: 'Database', sub: '~5-10 ms', x: 430, y: 380, w: 140, kind: 'data', info: 'Ye kya hai: asli data. Index wali query ~1-10 ms; bina index ya bojh mein kahin zyada. Aksar p99 yahin se aata hai.' },
        { id: 'mon', label: 'Metrics', sub: 'p50 / p95 / p99', x: 620, y: 380, w: 150, kind: 'queue', info: 'Ye kya hai: har request ki latency ka hisaab rakhne wala system (dashboards, alerts). Average nahi, percentiles dikhata hai; SLO toota to alarm.' },
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
        { name: 'Static file', text: 'Image/JS CDN edge se hi mil gayi: sirf ek chhota round trip, data center tak jaana hi nahi pada.', go: ['user>cdn'] },
        { name: 'Cache hit', text: 'Page ka data cache mein tha: ~1 ms. Poora request kuch dozen ms mein.', go: ['user>cdn>lb>app>cache'] },
        { name: 'Cache miss', text: 'Cache mein nahi tha: database tak jaana pada, 5-10 ms ya bojh mein zyada. p95/p99 aksar yahin se.', go: ['user>cdn>lb>app>cache', 'app>db'] },
        { name: 'Fan-out', text: 'Page ke liye kai services ek saath. Sabse slow wali tay karti hai page kab bane: tail latency. Timeout + fallback zaroori.', go: ['user>cdn>lb>app>svc', 'app>mon'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Latency = ek request kitni der (ms). Throughput = per second kitni requests (QPS). Bandwidth = pipe ki max chaudai (Mbps).</li>
      <li>Doori ki latency bandwidth se nahi ghatti. Chhoti cheezon ke liye latency (round trips) raja, badi files ke liye bandwidth.</li>
      <li>Utilisation 100% ke paas jaaye to line lambi aur latency phat jaati hai: 50-70% pe plan karo.</li>
      <li>Little's law: andar ki requests = aane ki speed × har ek ka time (L = λ × W). Slow dependency = fanse hue threads.</li>
      <li>Average dhokha deta hai. p50, p95, p99 dekho; percentiles ka average mat lo.</li>
      <li>Fan-out mein tail jud jaati hai: 100 services × 1% slow ≈ 63% slow pages. Timeouts, hedged requests, kam fan-out.</li>
      <li>SLI = naap, SLO = andar ka target, SLA = customer se wada (SLO se dheela).</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Percentiles se asli user dard dikhta hai, average ka dhokha nahi', 'Latency ke hisse (network, queue, processing) alag naap ke sahi ilaaj', 'SLO se saaf faisla: kab feature, kab speed', 'Headroom + timeouts se tail latency kaabu mein'], costs: ['Percentiles naapna mehenga: har request ka data ya histogram rakhna', 'Headroom = khaali capacity ka paisa', 'Hedged requests = thoda extra load', 'Batching/async se throughput badhta hai lekin har kaam der se'] },
    { type: 'think', questions: [
      { q: 'Team bolti hai "average latency 80 ms hai, sab theek". Tum pehla sawaal kya poochhoge?', a: 'p95 aur p99 kya hai? Aur kis endpoint ka, kitni requests pe? Average ke peeche ek chhota group bahut slow ho sakta hai.' },
      { q: 'Server ka throughput 1,000 req/s pe band ho gaya aur latency 50 ms se 2 s ho gayi. Kya ho raha hai?', a: 'Server apni capacity pe hai. Nayi requests queue mein lag rahi hain, isliye latency badh rahi hai par throughput nahi. Fix: horizontal scaling, cache, ya bottleneck (aksar DB) dhoondhna.' },
      { q: 'xyz.com 500 req/s leta hai aur har request 400 ms leti hai (database slow). Server mein 100 threads hain. Kya hoga?', a: "Little's law: andar = 500 × 0.4 = 200 requests. Threads sirf 100, to baaki line mein, latency aur badhegi, line aur lambi. Fix: DB theek karo (W kam), timeouts, ya threads/servers badhao. DB 100 ms pe aaye to andar sirf 50." },
      { q: 'Indian users ke liye server US mein hai. Team bandwidth 10 guna karna chahti hai. Kya page fast hoga?', a: 'Chhote pages ke liye lagbhag nahi: zyada time round trips (~230 ms har ek) mein jaata hai, bandwidth mein nahi. Fix: India mein region ya CDN, aur round trips kam (connections reuse, kam requests).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'p99 = 800 ms ka matlab?', options: ['Average 800 ms', '99% requests 800 ms se fast', 'Sirf 1% requests fast'], answer: 1, explain: 'Sirf 1% requests 800 ms se zyada leti hain.' },
      { q: 'India-US latency kam karne ka sabse effective tareeka?', options: ['Zyada bandwidth', 'Data users ke paas (CDN/regional servers)', 'Bada server'], answer: 1, explain: 'Doori ki latency bandwidth se nahi ghatti.' },
      { q: 'Throughput kya naapta hai?', options: ['Ek request ka time', 'Per second kitni requests poori hoti hain', 'Network ki chaudai'], answer: 1, explain: 'Requests/sec (QPS).' },
      { q: 'Server ka kaam 10 ms hai. Utilisation 50% se 95% gaya. Simple queue model mein average latency?', options: ['Wahi 10 ms', '20 ms se 200 ms', '10 ms se 19 ms'], answer: 1, explain: 'W = 10 ÷ (1 − u): 50% pe 20 ms, 95% pe 200 ms. 100% ke paas latency phat jaati hai.' },
      { q: '2,000 req/s, har request 50 ms. Ek waqt pe kitni requests andar?', options: ['40', '100', '2,000'], answer: 1, explain: "Little's law: 2,000 × 0.05 s = 100." },
      { q: 'Page 100 services ko call karta hai, har ek 1% baar slow. Kitne page loads slow?', options: ['~1%', '~10%', '~63%'], answer: 2, explain: '1 − 0.99¹⁰⁰ ≈ 0.63. Tail latency fan-out mein jud jaati hai.' },
      { q: 'SLO aur SLA mein farak?', options: ['Dono same', 'SLO andar ka target, SLA customer se wada (toota to credit)', 'SLA andar ka, SLO bahar ka'], answer: 1, explain: 'SLA ko SLO se dheela rakhte hain taaki andar ka target tootne pe bhi customer ka wada bacha rahe.' },
    ]},
    { type: 'sources', note: 'Tail latency ke numbers aur availability/latency ke concepts inhi sources se.', items: [
      { title: 'The Tail at Scale', publisher: 'Communications of the ACM (Google: Jeffrey Dean, Luiz André Barroso)', official: true, year: 2013, url: 'https://research.google/pubs/the-tail-at-scale/', used: 'Fan-out example (100 servers each 1% slow → ~63% of requests slow), hedged requests (Google benchmark: 99.9th percentile from 1,800 ms to 74 ms with 2% more requests after a 10 ms delay), why tail matters at scale. Older paper, ideas still standard.' },
      { title: 'Service Level Objectives (Site Reliability Engineering book, chapter 4)', publisher: 'Google', official: true, year: 2016, url: 'https://sre.google/sre-book/service-level-objectives/', used: 'SLI vs SLO vs SLA, using percentiles instead of averages for latency.' },
      { title: "Little's law", publisher: 'Wikipedia (summary of J. D. C. Little, 1961)', url: "https://en.wikipedia.org/wiki/Little%27s_law", used: 'L = λW for any stable system, independent of arrival distribution.' },
      { title: 'Optical fiber', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Optical_fiber', used: 'Light in fibre travels at about two thirds of its speed in vacuum (~200,000 km/s), used for the minimum Mumbai–US round trip estimate.' },
    ]},
  ],
});
