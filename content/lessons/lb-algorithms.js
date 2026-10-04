Lesson.register({
  id: 'lb-algorithms',
  title: 'LB algorithms, L4 vs L7, GeoDNS',
  minutes: 30,
  summary: `Load Balancer "kaunsa server?" ka faisla kaise karta hai: das algorithms, har ek ka example, khoobi, kamzori aur khud chala ke dekhne wala lab. Saath mein: L4 vs L7 ka asli farak, aur duniya bhar ke users ko sabse paas wale data center tak kaise bhejte hain (GeoDNS, Anycast, GSLB).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Pichhle lesson mein LB aa gaya. Ab har request pe use ek chhota sa faisla lena hai: "is baar kaunsa server?"<br>Ye faisla jis niyam se hota hai, use <strong>algorithm</strong> kehte hain. Kuch niyam bas baari baari dete hain, kuch dekhte hain ki kaun abhi khaali hai, kuch user ko hamesha same server pe bhejte hain.<br>Galat niyam = ek server pe line, baaki khaali baithe. Sahi niyam = sab ka kaam barabar, users khush.` },

    { type: 'h2', text: 'Setup: xyz.com ke teen servers' },
    { type: 'p', html: `Is poore lesson mein ek hi setup rahega, taaki har algorithm ko same cheez pe compare kar sako:` },
    { type: 'list', items: [
      `<strong>S1</strong>: bada server, baaki dono se 3 guna tez. Isko <strong>weight 3</strong> diya hai.`,
      `<strong>S2</strong> aur <strong>S3</strong>: normal servers, <strong>weight 1</strong> each.`,
      `Zyada requests chhoti hain (feed kholna, 2 unit kaam). Har 5 mein se lagbhag 1 lambi hai (video export, 8 unit kaam).`,
    ]},
    { type: 'callout', tone: 'term', title: 'Weight', html: `<strong>Ye kya hai:</strong> ek number jo hum LB ko batate hain: "ye server kitna kaam sambhal sakta hai". Weight 3 wala, weight 1 wale se 3 guna hissa le.<br><strong>Kyun chahiye:</strong> servers hamesha same size ke nahi hote (naya bada machine, purana chhota).<br><strong>Iske bina:</strong> chhote server ko bhi utna hi kaam milega jitna bade ko. Chhota doobega, bada aadha khaali.` },
    { type: 'callout', tone: 'term', title: 'Active connection (chalti request)', html: `<strong>Ye kya hai:</strong> wo request jo server pe abhi chal rahi hai, jiska jawab abhi gaya nahi. LB ise gin sakta hai kyunki har request usi ke through jaati aur aati hai.<br><strong>Kyun chahiye:</strong> ye "abhi kaun kitna busy hai" ka sabse sasta andaza hai.<br><strong>Iske bina:</strong> LB ko pata hi nahi chalega ki kisi server pe 10 lambi requests atki hain.` },

    { type: 'h2', text: 'Saare algorithms, ek nazar mein' },
    { type: 'table', head: ['Algorithm', 'Ek line mein', 'LB ko kya yaad rakhna padta hai'], rows: [
      ['Round robin', 'Baari baari: S1, S2, S3, S1...', 'Bas ek pointer: agli baari kiski'],
      ['Weighted round robin', 'Baari baari, lekin bade server ki zyada baari', 'Weights + pointer (smooth version mein har server ka ek counter)'],
      ['Least connections', 'Jis pe abhi sabse kam chalti requests', 'Har server ki active ginti'],
      ['Weighted least connections', 'Active ÷ weight sabse kam', 'Active ginti + weights'],
      ['Least response time', 'Jo abhi sabse jaldi jawab de raha', 'Har server ka average response time'],
      ['Random', 'Dice phenko', 'Kuch nahi'],
      ['Power of two choices', 'Do random uthao, unme se kam busy', 'Active ginti (sirf 2 dekhni)'],
      ['IP hash / source hash', 'User ke IP se hamesha same server', 'Kuch nahi (bas hash)'],
      ['Consistent hashing', 'Hash ring pe agla server', 'Ring (servers ki positions)'],
      ['Resource / agent based', 'Servers khud bataate hain ki kitne busy', 'Servers ki report (CPU, memory)'],
    ]},
    { type: 'h2', text: 'Algorithm lab: LB ke dimaag ke andar dekho' },
    { type: 'p', html: `Ye lab har request pe LB ka "andar ka hisaab" dikhata hai: round robin ka pointer, weights ke counters, har server ki chalti requests (dots), average response time, aur server ki khud ki report. Ek algorithm chuno, "Agli request" dabao, aur neeche likha hisaab padho. Har algorithm ke section mein bataya hai ki lab mein kya dhoondhna hai.` },
    { type: 'custom', render(el) {
      const MODES = { rr: 'Round robin', wrr: 'Weighted RR (simple)', swrr: 'Smooth weighted RR', lc: 'Least connections', wlc: 'Weighted least conn', lrt: 'Least response time', rnd: 'Random', p2c: 'Power of two', agent: 'Agent based' };
      const DESC = { rr: 'Pointer baari baari aage badhta hai. Weight aur busy-ness dono ignore.', wrr: 'List [S1, S1, S1, S2, S3] ko baari baari chalata hai. S1 ko 3 lagatar.', swrr: 'Har server ka "current" counter: har baar sab mein apna weight jodo, sabse bade ko chuno, usme se kul weight (5) ghatao.', lc: 'Jis server pe abhi sabse kam dots (chalti requests), wahi.', wlc: 'Chalti requests ÷ weight. S1 ke 3 dots = S2 ke 1 dot.', lrt: 'Average response time × (chalti + 1). Jo sabse jaldi nipta de.', rnd: 'Har baar dice. Kuch yaad nahi rakhta.', p2c: 'Do random servers uthao, unme jiske kam dots, wahi.', agent: 'Servers har 5 requests pe apna load report karte hain. LB report dekh ke chunta hai (report purani ho sakti hai).' };
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
          if (m === 'rr') { k = rr % 3; rr++; why = `pointer S${k + 1} pe tha → S${k + 1}. Pointer aage S${rr % 3 + 1} pe.`; }
          else if (m === 'wrr') { k = naive[wi % 5]; why = `list [S1, S1, S1, S2, S3] ka item #${wi % 5 + 1} → S${k + 1}`; wi++; }
          else if (m === 'swrr') { st.forEach((s, i) => { s.cw += W[i]; }); const b = st.map(s => s.cw); k = argmin(i => -st[i].cw); st[k].cw -= tot; why = `current + weight = [${b.join(', ')}] → sabse bada S${k + 1}. Uska −${tot} → [${st.map(s => s.cw).join(', ')}]`; }
          else if (m === 'lc') { k = argmin(i => act[i]); why = `active = [${act.join(', ')}] → sabse kam: S${k + 1}`; }
          else if (m === 'wlc') { k = argmin(i => act[i] / W[i]); why = `active ÷ weight = [${act.map((a, i) => (a / W[i]).toFixed(2)).join(', ')}] → sabse kam: S${k + 1}`; }
          else if (m === 'lrt') { const sc = st.map((s, i) => s.ewma * (act[i] + 1)); k = argmin(i => sc[i]); why = `avg time × (active+1) = [${sc.map(x => x.toFixed(1)).join(', ')}] → sabse kam: S${k + 1}`; }
          else if (m === 'rnd') { const r = rnd(); k = Math.floor(r * 3); why = `random number ${r.toFixed(2)} → S${k + 1}`; }
          else if (m === 'p2c') { const a = Math.floor(rnd() * 3); let b = Math.floor(rnd() * 2); if (b >= a) b++; k = act[a] <= act[b] ? a : b; why = `do random: S${a + 1} (${act[a]} active) vs S${b + 1} (${act[b]} active) → S${k + 1}`; }
          else { k = argmin(i => rep[i]); why = `servers ki aakhri report: load = [${rep.join('%, ')}%] → sabse kam: S${k + 1}`; }
          st[k].jobs.push({ left: dur, t0: t, long: dur > 2 }); st[k].got++;
          log.unshift(`#${nreq}${dur > 2 ? ' (lambi)' : ''}: ${why}`); log.length = Math.min(log.length, 6);
        };
        return { step, st, log, get rr() { return rr % 3; }, get rep() { return rep; }, get avg() { return fin ? (lat / fin).toFixed(1) : '–'; }, get n() { return nreq; } };
      };
      el.innerHTML = `<div class="chips m-chips" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="calc-note m-desc"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0"><button type="button" class="btn small primary b-1">Agli request</button><button type="button" class="btn small b-10">+10 requests</button><button type="button" class="btn small ghost b-r">Reset</button></div>
        <div class="cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px"></div>
        <div class="stats"><div class="stat"><span>Requests bheji</span><strong class="o-n"></strong></div><div class="stat"><span>Avg response time (poori hui requests)</span><strong class="o-m"></strong></div></div>
        <div class="m-log" style="font:13px/1.6 var(--f-mono);background:var(--surface-2);border-radius:var(--r-sm);padding:10px 12px;margin-top:8px;overflow-wrap:anywhere"></div>`;
      const q = s => el.querySelector(s);
      const draw = () => {
        q('.m-chips').innerHTML = '';
        Object.entries(MODES).forEach(([k, v]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === mode ? ' on' : ''); b.textContent = v; b.onclick = () => { mode = k; L = makeLab(mode); draw(); }; q('.m-chips').appendChild(b); });
        q('.m-desc').textContent = DESC[mode];
        q('.cards').innerHTML = L.st.map((s, i) => {
          const dots = s.jobs.map(j => `<span title="${j.long ? 'lambi' : 'chhoti'}" style="display:inline-block;width:12px;height:12px;border-radius:50%;margin:2px;background:${j.long ? 'var(--amber)' : 'var(--accent)'}"></span>`).join('') || '<span style="color:var(--ink-3);font-size:13px">khaali</span>';
          const extra = mode === 'rr' && L.rr === i ? '<div style="color:var(--accent);font-weight:600">▶ agli baari iski</div>'
            : mode === 'swrr' ? `<div>current: <strong>${s.cw}</strong></div>`
            : mode === 'agent' ? `<div>report: <strong>${L.rep[i]}%</strong></div>`
            : mode === 'lrt' ? `<div>avg time: <strong>${s.ewma.toFixed(1)}</strong></div>` : '';
          return `<div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)"><strong style="font-family:var(--f-display)">S${i + 1}</strong> <span style="font-size:13px;color:var(--ink-3)">weight ${W[i]}, speed ${SP[i]}x</span>
            <div style="min-height:34px;margin:6px 0">${dots}</div><div style="font-size:13px;color:var(--ink-2)">chalti: <strong>${s.jobs.length}</strong> · mili: <strong>${s.got}</strong>${extra}</div></div>`;
        }).join('');
        q('.o-n').textContent = L.n; q('.o-m').textContent = L.avg;
        q('.m-log').innerHTML = L.log.length ? L.log.map((x, i) => `<div style="opacity:${1 - i * 0.13}">${x}</div>`).join('') : 'Neela dot = chhoti request, peela = lambi. "Agli request" dabao.';
      };
      q('.b-1').onclick = () => { L.step(); draw(); };
      q('.b-10').onclick = () => { for (let i = 0; i < 10; i++) L.step(); draw(); };
      q('.b-r').onclick = () => { L = makeLab(mode); draw(); };
      L = makeLab(mode); draw();
    }},
    { type: 'callout', tone: 'tip', html: `Lab ka model simple hai (S1 3 guna tez, har click = ek nayi request, chalti requests time ke saath khatam hoti hain). Har mode mein requests ka sequence (kaunsi chhoti, kaunsi lambi) same hai. Ye lab ranking ke liye nahi, "andar ka hisaab" dekhne ke liye hai: 40 requests mein luck bahut farak daalta hai. Kaun sach mein behtar hai, wo neeche wala race simulator hazaron requests pe dikhata hai.` },
    { type: 'h2', text: 'Har algorithm, ek ek karke' },
    { type: 'h3', text: '1. Round robin (baari baari)' },
    { type: 'p', html: `<strong>Kaise:</strong> LB ke paas ek pointer (ungli) hai jo kisi ek server pe rakhi hai. Request aayi: us server ko do, ungli agle server pe. Aakhri ke baad wapas pehle pe.<br><strong>Example:</strong> 6 requests, 3 servers → S1, S2, S3, S1, S2, S3. Har server ko 2.<br><strong>Lab mein:</strong> "▶ agli baari iski" wala nishaan har click pe aage badhta hai, chahe S2 pe 5 dots (requests) jama hon.` },
    { type: 'list', items: [
      `<strong>Achha:</strong> sabse simple, LB ko kuch ginna nahi padta, bahut tez.`,
      `<strong>Bura:</strong> server ki taakat (weight) aur request ka size, dono ignore. Lambi requests jis pe gir gayin, wahan line.`,
      `<strong>Kab:</strong> servers ek jaise, requests ek jaisi chhoti (jaise simple API).`,
      `<strong>Kahan milta hai:</strong> NGINX ka default (weights ke saath), HAProxy <code>roundrobin</code> (3.2 tak default), Envoy <code>ROUND_ROBIN</code>, AWS ALB ka default.`,
    ]},
    { type: 'h3', text: '2. Weighted round robin (aur NGINX ka "smooth" version)' },
    { type: 'p', html: `<strong>Kaise:</strong> baari baari, lekin weight 3 wale ko har round mein 3 baari, weight 1 walon ko 1.<br><strong>Simple tareeka:</strong> list bana lo [S1, S1, S1, S2, S3] aur use baari baari chalao. Dikkat: S1 ko <em>lagatar</em> 3 requests ek saath milti hain. Burst (jhatka) aata hai.<br><strong>Smooth tareeka (NGINX):</strong> har server ka ek "current" counter. Har request pe: (1) har server ke counter mein uska weight jodo, (2) jiska counter sabse bada, use chuno, (3) chune hue ke counter se kul weight (yahan 5) ghata do.` },
    { type: 'table', head: ['Request', 'Jodne ke baad (S1, S2, S3)', 'Chuna', 'Ghatane ke baad'], rows: [
      ['1', '3, 1, 1', 'S1', '−2, 1, 1'],
      ['2', '1, 2, 2', 'S2', '1, −3, 2'],
      ['3', '4, −2, 3', 'S1', '−1, −2, 3'],
      ['4', '2, −1, 4', 'S3', '2, −1, −1'],
      ['5', '5, 0, 0', 'S1', '0, 0, 0'],
    ], caption: 'Weights 3:1:1. Result S1, S2, S1, S3, S1: S1 ko phir bhi 5 mein 3, lekin beech beech mein. 5 ke baad counters wapas 0 pe, cycle repeat. NGINX ne ye 2012 mein apnaya; weights 5:1:1 ke liye ye a a b a c a a deta hai.' },
    { type: 'list', items: [
      `<strong>Lab mein:</strong> "Weighted RR (simple)" aur "Smooth weighted RR" dono chalao. Pehle 5 picks: simple = S1 S1 S1 S2 S3, smooth = S1 S2 S1 S3 S1. "current" numbers upar wali table jaise badlenge.`,
      `<strong>Achha:</strong> alag size ke servers ko unki taakat ke hisaab se kaam. Ab bhi bahut sasta.`,
      `<strong>Bura:</strong> request ka size ab bhi ignore. Weight galat diya to galat baant.`,
      `<strong>Kab:</strong> servers alag size ke (naya 8-core, purana 4-core), ya naye version ko thoda sa traffic dena (canary: weight 1 vs 19 = 5%).`,
    ]},
    { type: 'h3', text: '3. Least connections' },
    { type: 'p', html: `<strong>Kaise:</strong> LB har server ki chalti requests ginta hai (request gayi to +1, jawab aaya to −1). Nayi request us server ko jiski ginti sabse kam.<br><strong>Example:</strong> chalti requests S1 = 4, S2 = 1, S3 = 2 → S2. Agar S2 pe 2 lambi video exports atke hote, to uski ginti badi hoti aur use nayi request nahi milti.<br><strong>Lab mein:</strong> log mein <code>active = [..]</code> dikhega, aur hamesha sabse chhota number jeetega. Barabar hon to pehla (S1).` },
    { type: 'list', items: [
      `<strong>Achha:</strong> request ka size apne aap dhyaan mein: lambi requests wala server busy dikhta hai, use kam milta hai.`,
      `<strong>Bura:</strong> LB ko ginti rakhni padti hai. Kai LB machines hon to har ek ki apni ginti, poori sachchai kisi ke paas nahi. Naya server (0 connections) pe ek saath sab toot padte hain.`,
      `<strong>Kab:</strong> requests ka time bahut alag alag (kuch 20 ms, kuch 30 s), ya lambe connections (WebSocket, database).`,
      `<strong>Kahan milta hai:</strong> NGINX <code>least_conn</code>, HAProxy <code>leastconn</code>, AWS ALB <code>least_outstanding_requests</code>.`,
    ]},
    { type: 'h3', text: '4. Weighted least connections' },
    { type: 'p', html: `<strong>Kaise:</strong> least connections + weight: ginti ko weight se bhaag do, sabse kam wala jeete.<br><strong>Example:</strong> S1 (weight 3) pe 3 chalti, S2 (weight 1) pe 2, S3 (weight 1) pe 1. Hisaab: 3÷3 = 1.0, 2÷1 = 2.0, 1÷1 = 1.0. S1 aur S3 barabar, pehla (S1) jeeta. Simple least connections hota to S3 (sirf 1) chunta, aur bade S1 ki taakat bekaar jaati.<br><strong>Lab mein:</strong> log mein <code>active ÷ weight</code>.` },
    { type: 'list', items: [
      `<strong>Achha:</strong> server ki taakat + abhi ka bojh, dono. Mixed servers aur mixed requests ka sabse bharosemand general choice.`,
      `<strong>Bura:</strong> weights sahi rakhne padte hain. Least connections wali saari dikkatein bhi.`,
      `<strong>Kahan milta hai:</strong> NGINX <code>least_conn</code> aur HAProxy <code>leastconn</code> dono weights ko already dhyaan mein lete hain. Envoy ka <code>LEAST_REQUEST</code> alag weights pe <code>weight ÷ (active + 1)</code> jaisa formula lagata hai.`,
    ]},
    { type: 'h3', text: '5. Least response time (latency-aware)' },
    { type: 'p', html: `<strong>Kaise:</strong> LB har server ka average response time naapta rehta hai (naye jawabon ko zyada wazan, purane dheere bhool jaata hai; isko <strong>EWMA</strong>, yaani "exponentially weighted moving average" kehte hain). Phir chalti requests bhi jodta hai: <code>score = avg time × (chalti + 1)</code>. Sabse kam score jeeta.<br><strong>Example:</strong> S1: avg 20 ms, 2 chalti → 20 × 3 = 60. S2: avg 80 ms, 0 chalti → 80 × 1 = 80. S3: avg 30 ms, 1 chalti → 30 × 2 = 60. S1 aur S3 barabar, S2 slow hai to use nahi. Agar S2 ka disk kharab hai aur wo slow ho gaya, to ye algorithm use apne aap kam traffic dega, jabki least connections ko pata bhi nahi chalega.<br><strong>Lab mein:</strong> har card pe "avg time" aur log mein score.` },
    { type: 'list', items: [
      `<strong>Achha:</strong> "bimaar lekin zinda" (slow) server ko pakad leta hai. User ko jo mehsoos hota hai (latency), wahi naapta hai.`,
      `<strong>Bura:</strong> naap mein shor (ek slow request se number uchhalta hai). Agar sab ek hi "sabse tez" server pe toot pade to wo slow ho jaata hai, phir sab bhaagte hain (jhoola). Isliye ise aksar power of two ke saath milate hain.`,
      `<strong>Kahan milta hai:</strong> NGINX Plus (paid) <code>least_time</code>. Linkerd aur Twitter ka Finagle "peak EWMA" use karte the (Linkerd ka blog post 2016 ka hai, idea aaj bhi wahi).`,
    ]},
    { type: 'h3', text: '6. Random' },
    { type: 'p', html: `<strong>Kaise:</strong> har request pe dice phenko: 0 se 1 ke beech number, 0.33 se kam to S1, 0.66 se kam to S2, warna S3.<br><strong>Example:</strong> 3 servers, 9 requests. Average mein 3-3-3, lekin ek baar 5-2-2 bhi aa sakta hai. Kai LB machines hon to random achha hai, kyunki kisi ko kuch yaad nahi rakhna, koi ginti share nahi karni.<br><strong>Lab mein:</strong> log mein random number. Kisi server pe kabhi kabhi dots ka dher lag jaata hai.` },
    { type: 'list', items: [
      `<strong>Achha:</strong> zero state, kai LBs ke saath bhi bina taal-mel kaam karta hai.`,
      `<strong>Bura:</strong> bad luck: kuch servers pe zyada. Request size ignore.`,
      `<strong>Kahan milta hai:</strong> Envoy <code>RANDOM</code>, NGINX <code>random</code>, AWS ALB <code>weighted_random</code>.`,
    ]},
    { type: 'h3', text: '7. Power of two random choices (P2C)' },
    { type: 'p', html: `<strong>Kaise:</strong> do server random uthao, aur unme se jiske kam chalti requests, use do. Bas.<br><strong>Example:</strong> 100 servers. Dice ne S17 (4 chalti) aur S62 (1 chalti) diye → S62. Saare 100 dekhne ki zaroorat nahi.<br><strong>Kyun itna achha?</strong> Sirf ek aur option dekhne se sabse bure server ka bojh bahut gir jaata hai. Ye 1990s ki research ka jaana-maana result hai (Michael Mitzenmacher ki PhD thesis, 1996): pure random mein sabse bhara server average se kaafi upar jaata hai, do choices se lagbhag average ke paas rehta hai. Teen choices se thoda aur, lekin asli chhalaang 1 se 2 mein hai. Neeche khud dekho.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><label>Servers: <strong class="v-n"></strong><input type="range" class="r-n" min="0" max="2" value="1"></label><div><div style="font-size:14px;margin-bottom:6px">Har request pe kitne random servers dekhein?</div><div class="d-chips" style="display:flex;gap:6px;flex-wrap:wrap"></div></div></div>
        <svg class="hist" viewBox="0 0 640 170" style="width:100%;height:auto;display:block;margin:12px 0"></svg>
        <div class="stats"><div class="stat"><span>Average bojh</span><strong>10</strong></div><div class="stat"><span>Sabse bhara server</span><strong class="o-max"></strong></div><div class="stat"><span>Sabse khaali server</span><strong class="o-min"></strong></div></div>
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
        q('.o-n').textContent = `Bar = kitne servers pe utni requests padi (x-axis = bojh). Dashed line = average 10. Laal = 12 se zyada (overloaded). ` + (d === 1 ? `Pure random mein sabse bhara server ${mx} pe hai, average ka ${(mx / 10).toFixed(1)} guna.` : d === 2 ? `Sirf ek extra choice: sabse bhara ab ${mx}. Saare servers average ke paas simat gaye.` : `Teesri choice se fayda chhota (${mx}). Isliye "two" hi standard hai.`);
      };
      q('.r-n').addEventListener('input', run);
      run();
    }},
    { type: 'list', items: [
      `<strong>Achha:</strong> least connections jitna achha baant, lekin sirf 2 servers dekhne padte hain. Kai LB machines hon, ginti thodi purani ho, tab bhi sab ek hi "sabse khaali" server pe toot nahi padte (herding nahi hota).`,
      `<strong>Bura:</strong> chhoti fleet (2-3 servers) pe least connections se thoda kamzor. Phir bhi ginti chahiye.`,
      `<strong>Kahan milta hai:</strong> Envoy <code>LEAST_REQUEST</code> (default mein 2 random choices). HAProxy <code>random</code> (default 2 draws, aur HAProxy 3.3 se ye naya default algorithm hai). NGINX <code>random two least_conn</code>.`,
    ]},
    { type: 'h3', text: '8. IP hash / source hash' },
    { type: 'callout', tone: 'term', title: 'Hash', html: `<strong>Ye kya hai:</strong> ek function jo kisi bhi text (jaise IP <code>49.36.12.7</code>) ko ek bada number bana deta hai. Same input pe hamesha same number, aur alag inputs ke number bikhre hue.<br><strong>Kyun chahiye:</strong> bina kuch yaad rakhe "is user ka server" nikaalne ke liye: number ko servers ki ginti se bhaag do, bacha hua (remainder) = server number.<br><strong>Iske bina:</strong> LB ko har user ka server ek badi table mein yaad rakhna padta.` },
    { type: 'p', html: `<strong>Kaise:</strong> <code>server = hash(user IP) mod N</code>, jahan N = servers ki ginti. Same user hamesha same server pe (jab tak N na badle).<br><strong>Example:</strong> hash(49.36.12.7) = 1,000,004. N = 3 → 1,000,004 mod 3 = 2 → teesra server (0 se ginti). Kal bhi yahi.<br><strong>Kyun use karte hain:</strong> server pe us user ka kuch garam pada hai (local cache, ya chalti game/WebSocket session). Ise "sticky" routing bhi kehte hain.` },
    { type: 'p', html: `<strong>Badi dikkat (reshuffle):</strong> N badla to lagbhag sab badal jaata hai. 3 se 4 server kiye to ek user ka server tabhi same rahega jab <code>hash mod 3</code> aur <code>hash mod 4</code> barabar aaye, jo lagbhag 4 mein se 1 baar hota hai. Yaani ~75% users ka server badal gaya, aur unka saara garam cache thanda. Neeche lab mein dekho.` },
    { type: 'list', items: [
      `<strong>Achha:</strong> koi state nahi, har LB machine same jawab nikalti hai.`,
      `<strong>Bura:</strong> load tedha: ek office ke 500 log ek hi IP (NAT) ke peeche hon to sab ek server pe. NGINX <code>ip_hash</code> IPv4 ke sirf pehle teen hisse (jaise 49.36.12) use karta hai, to poora mohalla ek server pe. Server add/remove pe bhaari reshuffle. Mobile user ka IP badla to server bhi badla.`,
      `<strong>Kab:</strong> sirf jab stickiness sach mein zaroori ho aur servers kam badalte hon. Warna stateless + koi aur algorithm.`,
      `<strong>Kahan milta hai:</strong> NGINX <code>ip_hash</code> aur <code>hash $key</code>, HAProxy <code>source</code>, <code>uri</code>, <code>hdr</code>. AWS NLB connections ko ek "flow hash" (IP + port + protocol) se baantta hai.`,
    ]},
    { type: 'h3', text: '9. Consistent hashing' },
    { type: 'p', html: `<strong>Kaise:</strong> ek gol ring socho jis pe 0 se 4 arab tak number likhe hain. Har server ko hash karke ring pe kai jagah bitha do (in jagahon ko <strong>virtual nodes</strong> kehte hain). User ka hash bhi ring pe ek point hai. Us point se ghadi ki disha mein chalo: jo pehla server mile, wahi uska server.<br><strong>Kyun better:</strong> naya server aaya to wo ring pe sirf apne aas paas ke users "chheen" leta hai. Baaki sab wahin. N se N+1 karne pe sirf lagbhag 1/(N+1) users hilte hain (3 → 4 pe ~25%, mod N mein ~75%).<br>Poori kahaani apne lesson mein hai: <a href="#/consistent-hashing">Consistent hashing</a>.` },
    { type: 'p', html: `Lab: 60 users (IPs), servers ki ginti badlo. Rang = server. Mota border = is badlav mein jiska server badla. (60 users chhota sample hai, isliye number theory se thoda upar neeche aata hai.)` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><label>Servers: <strong class="v-n"></strong> → <strong class="v-n1"></strong><input type="range" class="r-n" min="2" max="5" value="3"></label><div><div style="font-size:14px;margin-bottom:6px">Tareeka</div><div class="h-chips" style="display:flex;gap:6px;flex-wrap:wrap"></div></div></div>
        <div class="h-grid" style="display:flex;flex-wrap:wrap;gap:5px;margin:12px 0"></div>
        <div class="h-leg" style="display:flex;flex-wrap:wrap;gap:12px;font-size:13px;color:var(--ink-2)"></div>
        <div class="stats"><div class="stat"><span>Server badla</span><strong class="o-m"></strong></div><div class="stat"><span>Theory kehti hai</span><strong class="o-t"></strong></div><div class="stat"><span>Purane servers ke beech hile</span><strong class="o-b"></strong></div></div>
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
        q('.h-leg').innerHTML = Array.from({ length: n + 1 }, (_, s) => `<span><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${COL[s]};vertical-align:-1px"></span> S${s + 1}${s === n ? ' (naya)' : ''}</span>`).join('');
        const pct = Math.round(moved / 60 * 100);
        q('.o-m').textContent = `${moved} / 60 (${pct}%)`;
        q('.o-t').textContent = mode === 'mod' ? `~${Math.round(n / (n + 1) * 100)}%` : `~${Math.round(100 / (n + 1))}%`;
        q('.o-b').textContent = between;
        q('.o-n').textContent = mode === 'mod'
          ? `mod N mein ${moved} users ka server badla, aur unme se ${between} toh purane servers ke beech hi idhar udhar hue (bilkul bekaar hilna). In sab ka garam cache gaya.`
          : `Consistent hashing mein sirf ${moved} users hile, aur saare naye server S${n + 1} pe gaye (purane ke beech ${between}). Baaki sab ka cache garam.`;
      };
      q('.r-n').addEventListener('input', run);
      run();
    }},
    { type: 'list', items: [
      `<strong>Achha:</strong> stickiness + server add/remove pe kam hilna. Cache servers aur stateful systems ke liye standard.`,
      `<strong>Bura:</strong> thoda complex. Virtual nodes kam hon to load tedha. Ek "hot" key (bahut popular user) phir bhi ek server pe.`,
      `<strong>Kahan milta hai:</strong> NGINX <code>hash $key consistent</code> (ketama), Envoy <code>RING_HASH</code> aur <code>MAGLEV</code> (Google ka tareeka, tez lookup, kam memory).`,
    ]},
    { type: 'h3', text: '10. Resource based / agent based' },
    { type: 'p', html: `<strong>Kaise:</strong> har server pe ek chhota program (agent) chalta hai jo LB ko batata hai "mera CPU 70%, memory 50%" ya seedha "mujhe 30% weight do". LB is report se chunta hai.<br><strong>Example:</strong> S1 report: 20%, S2: 90%, S3: 60% → S1. S2 pe koi background job (backup) chal raha hai, LB ko ab ye dikh gaya, jo connection ginti se kabhi nahi dikhta.<br><strong>Khatra:</strong> report har few second aati hai. Beech mein sab LB "S1 sabse khaali" maan ke usi pe toot padte hain, aur S1 doob jaata hai. <strong>Lab mein:</strong> "Agent based" chuno: pehli 5 requests sab S1 pe jaati hain, kyunki report 5 requests tak nahi badalti.` },
    { type: 'list', items: [
      `<strong>Achha:</strong> asli resource (CPU, memory, queue) dekhta hai, jo request ginti se chhupa reh sakta hai.`,
      `<strong>Bura:</strong> agent likhna/chalaana, purani report pe herding, report pe bharosa.`,
      `<strong>Kahan milta hai:</strong> HAProxy <code>agent-check</code> (server ka agent weight, "drain" ya "down" bata sakta hai), Envoy ka client-side weighted round robin (servers ki load report se weights), AWS ALB ka automatic target weights (errors dekh ke bimaar server ka traffic ghatata hai).`,
    ]},
    { type: 'h2', text: 'Race: hazaron requests pe kaun jeeta?' },
    { type: 'p', html: `Lab ne andar ka hisaab dikhaya. Ab nateeja dekho. Teen servers, Server 3 baaki dono se double powerful. 360 time-units tak lagatar requests aati hain (lagbhag 550). Algorithm aur traffic ka type badlo, aur dekho kis server pe kitna bojh padta hai aur users ko kitna wait karna padta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="a-chips" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="x-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px"></div>
        <div class="r-out" style="margin-top:16px"></div>
        <div class="stats"><div class="stat"><span>Average wait</span><strong class="o-avg"></strong></div><div class="stat"><span>Sabse bura 5% (p95)</span><strong class="o-p95"></strong></div></div>
        <div class="calc-note o-n"></div>`;
      const ALGS = { rr: 'Round robin', wrr: 'Weighted RR (1:1:2)', lc: 'Least connections', wlc: 'Weighted least conn', p2c: 'Power of two', rnd: 'Random', hash: 'IP hash' };
      const MIX = { same: 'Saari requests same size', mixed: 'Kuch requests bahut lambi (export, upload)' };
      const NOTES = {
        rr: { same: 'Ginti barabar baant di, lekin Server 3 double powerful hai aur use bhi utna hi kaam mila. Wo aadha khaali, baaki do 100% se upar (line lambi hoti gayi).', mixed: 'Round robin request ka size nahi dekhta. Lambi requests jis server pe gir gayin, wahan line lag gayi, jabki Server 3 aadha khaali tha.' },
        wrr: { same: 'Server 3 ko double hissa: capacity ke hisaab se barabar load. Same-size requests ke liye ye sabse achha.', mixed: 'Capacity ka dhyaan rakha, lambi requests ka nahi. Average theek, lekin p95 bura: kabhi kabhi kai lambi requests ek hi server pe.' },
        lc: { same: 'Weights nahi jaanta, lekin tez server jaldi khaali hota hai, to use apne aap zyada milta hai. Weighted RR ke kaafi paas.', mixed: 'Yahan least connections chamakta hai: busy server ko nayi request nahi, jo khaali hai use.' },
        wlc: { same: 'Ginti ÷ weight: weighted RR jitna achha, bina perfect sequence ke.', mixed: 'Sabse achha: abhi ka bojh bhi, server ki taakat bhi. Mixed traffic ka safe default.' },
        p2c: { same: 'Sirf 2 servers dekhe, phir bhi least connections jitna achha.', mixed: 'Average least connections ke paas. p95 thoda upar: kabhi dono random servers busy nikle.' },
        rnd: { same: 'Random ne kuch servers pe zyada daal diya aur double powerful Server 3 ko khaali chhoda. Sabse bura p95.', mixed: 'Random + lambi requests = kabhi kabhi bura luck aur lambi line.' },
        hash: { same: 'Kuch users bahut active hain, aur jis server pe wo hash hue, wo overloaded. Load capacity ke hisaab se nahi, users ke hisaab se bant raha hai.', mixed: 'Heavy users + lambi requests ek hi server pe atke. Sticky routing ki keemat: p95 sabse kharab mein se.' },
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
    { type: 'callout', tone: 'tip', html: `Simulator ek simple model hai (100% se upar ka matlab: kaam itna aaya ki line lambi hoti gayi). Lekin pattern asli duniya jaisa hai: same-size requests pe <strong>weighted round robin</strong> jeetta hai, lambi-chhoti mixed requests pe <strong>(weighted) least connections</strong>, aur power of two unke bilkul paas rehta hai jabki round robin, random aur IP hash peeche.` },
    { type: 'h2', text: 'L4 vs L7, gehrai mein' },
    { type: 'callout', tone: 'term', title: 'Layer 4 aur Layer 7', html: `<strong>Ye kya hai:</strong> internet ka data kai parton (layers) mein lipta hota hai, jaise lifafe ke andar lifafa. Layer 3 pe IP address (kis machine ko). Layer 4 pe TCP/UDP: port number aur "connection" (kis program ko, kis order mein). Layer 7 pe HTTP: URL, headers, cookies, body (asal mein kya maanga).<br><strong>Kyun chahiye:</strong> LB jitna andar ka lifafa kholta hai, utna smart faisla le sakta hai, lekin utna zyada kaam bhi karta hai.<br><strong>Iske bina:</strong> "L4 ya L7?" ka sawaal samajh hi nahi aayega.` },
    { type: 'table', head: ['', 'L4 load balancer', 'L7 load balancer'], rows: [
      ['Kya dekhta hai', 'Source/destination IP aur port, protocol (TCP/UDP)', 'Poori HTTP request: method, URL path, host, headers, cookies'],
      ['Faisla kis cheez pe', 'Ek baar per <em>connection</em>. Connection ke saare bytes usi server pe', 'Har <em>request</em> pe alag. Ek connection ki 10 requests 10 servers pe ja sakti hain'],
      ['TLS (HTTPS)', 'Aksar kholta nahi (passthrough). Bytes as-it-is aage', 'Kholta hai (termination), tabhi URL padh sakta hai. Certificate LB pe'],
      ['Speed / cost', 'Bahut tez, kam CPU. Ek machine lakhon connections', 'Har request parse karna, TLS kholna: zyada CPU aur memory'],
      ['Extra features', 'Bahut kam. Koi bhi protocol chalega (database, games, MQTT)', 'Path/header routing, retries, timeouts, compression, auth, rate limiting, canary %'],
      ['Examples', 'AWS NLB, Linux LVS/IPVS, Google Maglev, Meta Katran, HAProxy <code>mode tcp</code>', 'AWS ALB, NGINX, Envoy, HAProxy <code>mode http</code>, Traefik'],
    ]},
    { type: 'callout', tone: 'why', title: 'Lambe connections ka jaal (HTTP/2, gRPC)', html: `HTTP/2 aur gRPC mein app ek hi connection kholti hai aur usme hazaron requests bhejti rehti hai. L4 LB connection pe faisla karta hai, to ek client ki saari requests ek hi server pe chipak jaati hain. 10 clients aur 10 servers mein kisi server pe 3 clients, kisi pe 0. L7 LB har request alag server pe bhej sakta hai, to load barabar. Isliye gRPC services ke saamne aksar L7 (jaise Envoy) lagate hain.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', x: 70, y: 170, w: 110, kind: 'client', info: 'Ye kya hai: xyz.com ke browser aur apps. HTTPS se request bhejte hain, yaani data encrypted hai.' },
        { id: 'l4', label: 'L4 LB', sub: 'IP + port', x: 225, y: 170, w: 120, kind: 'net', info: 'Ye kya hai: bahar wala, bahut tez LB (jaise AWS NLB ya Katran). Sirf IP aur port dekhta hai, encrypted bytes nahi kholta. Kai L7 proxies mein connections baantta hai.' },
        { id: 'l7', label: 'L7 proxy', sub: 'URL padhta', x: 395, y: 170, w: 130, kind: 'edge', info: 'Ye kya hai: smart LB (jaise Envoy ya NGINX). TLS kholta hai, URL path padhta hai, aur request sahi service ke pool ko deta hai. Har pool ki health check bhi karta hai.' },
        { id: 'web', label: 'Web pool', sub: '/feed, /profile', x: 610, y: 60, w: 150, kind: 'server', meter: true, load: 30, info: 'Ye kya hai: normal pages wale servers. Inke andar bhi koi algorithm (least connections) chalta hai.' },
        { id: 'pay', label: 'Payments', sub: '/api/payments', x: 610, y: 170, w: 150, kind: 'server', meter: true, load: 20, info: 'Ye kya hai: payment wali service, alag servers pe. Alag pool hone se iski dikkat baaki site ko nahi giraati.' },
        { id: 'img', label: 'Images', sub: '/images/*', x: 610, y: 280, w: 150, kind: 'server', meter: true, load: 25, info: 'Ye kya hai: photos dene wale servers (aur aage chal ke CDN). Bhaari files, alag pool.' },
      ],
      edges: [{ a: 'u', b: 'l4' }, { a: 'l4', b: 'l7' }, { a: 'l7', b: 'web' }, { a: 'l7', b: 'pay' }, { a: 'l7', b: 'img' }],
      scenarios: [
        { name: 'Path se routing', steps: [
          { title: 'Feed', text: 'L4 ne connection L7 proxy ko diya. L7 ne TLS khola, path <code>/feed</code> dekha → Web pool.', go: ['u>l4>l7>web', 'res:web>l7>l4>u'], msg: 'GET /feed  →  web pool' },
          { title: 'Payment', text: 'Same domain, alag path. L7 ne <code>/api/payments</code> dekha → Payments pool.', go: ['u>l4>l7>pay', 'res:pay>l7>l4>u'], msg: 'POST /api/payments  →  payments pool' },
          { title: 'Photo', text: '<code>/images/</code> → Images pool. Ek hi address ke peeche teen alag systems.', go: ['u>l4>l7>img', 'res:img>l7>l4>u'], msg: 'GET /images/riya.jpg  →  images pool' },
        ]},
        { name: 'L4 ki nazar se', intro: 'L4 LB ko kya dikhta hai?', steps: [
          { title: 'Sirf lifafe ka bahar', text: 'L4 ko sirf IP aur port dikhte hain. Andar encrypted bytes hain, URL nahi dikhta. Isliye wo bas connection ko kisi L7 proxy ko de deta hai (aksar IP+port ke hash se).', go: 'u>l4', msg: 'TCP 49.36.12.7:51544 → 203.0.113.10:443\npayload: 17 03 03 00 4a 8f e1 ... (encrypted)' },
          { title: 'Connection aage', text: 'Is connection ke saare bytes ab isi L7 proxy pe jaayenge. L4 kaam bahut kam karta hai, isliye bahut tez hai.', go: 'l4>l7' },
        ]},
        { name: 'Payments pool down', steps: [
          { title: 'Payments ke saare servers bimaar', text: 'Naye deploy mein bug. Health checks fail.', set: { pay: { state: 'down', sub: 'DOWN', load: 0 } }, go: 'lost:l7>pay' },
          { title: 'Sirf payments pe error', text: 'L7 proxy turant 503 lauta deta hai (ya "payment baad mein" page).', go: ['u>l4>l7', 'bad:l7>l4>u'], msg: 'POST /api/payments  →  503 Service Unavailable' },
          { title: 'Baaki site chalu', text: 'Feed aur photos alag pools pe hain, unhe kuch nahi hua. Alag pools = chhota "blast radius" (nuksaan ka daayra).', go: ['u>l4>l7>web', 'u>l4>l7>img'], parallel: true },
        ]},
      ],
    },
    { type: 'p', html: `Bade systems aksar dono use karte hain: bahar L4 (raw traffic aur hamle jhelne ke liye, bahut sasta per connection), uske peeche L7 proxies (smart routing ke liye). Google ka Maglev aur Meta ka Katran aise hi bahar wale L4 load balancers hain jo normal Linux servers pe software ki tarah chalte hain.` },
    { type: 'h2', text: 'Global: user ko sahi data center tak kaise bhejein?' },
    { type: 'p', html: `xyz.com ab do jagah chalta hai: Mumbai aur US (Virginia). Har jagah ko <strong>region</strong> kehte hain: ek poora setup (LB + servers + database copy). Chennai ka user Mumbai jaaye, New York ka Virginia. Mumbai se Virginia ka round trip ~200 ms hai, paas wale region se ~20-40 ms. Ye "kaunsa region?" wala faisla LB se pehle hota hai. Teen tareeke hain.` },
    { type: 'callout', tone: 'term', title: 'GeoDNS', html: `<strong>Ye kya hai:</strong> aisa DNS jo poochne wale ki location dekh ke alag jawab deta hai. Location ka andaza user ke DNS resolver ke IP se lagaya jaata hai.<br><strong>Kyun chahiye:</strong> India wale ko Mumbai ka IP, US wale ko Virginia ka, bina user ke kuch kiye.<br><strong>Iske bina:</strong> sab ek hi region pe, door wale users ko har click pe 200 ms extra.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'in', label: 'User, Chennai', x: 100, y: 80, w: 150, kind: 'client', info: 'Ye kya hai: India ka ek user jo xyz.com khol raha hai. Uska DNS resolver bhi India mein hai, isliye GeoDNS use India ka maanta hai.' },
        { id: 'us', label: 'User, New York', x: 100, y: 250, w: 150, kind: 'client', info: 'Ye kya hai: US ka ek user. Same domain xyz.com, lekin use paas wala region chahiye.' },
        { id: 'dns', label: 'GeoDNS', sub: 'location dekh ke IP', x: 340, y: 165, w: 160, kind: 'net', info: 'Ye kya hai: location dekh ke jawab dene wala DNS. Har region ki health check bhi karta hai: koi region down ho to use jawab mein nahi deta.' },
        { id: 'm', label: 'Mumbai region', sub: 'LB + servers', x: 600, y: 80, w: 160, kind: 'edge', info: 'Ye kya hai: India ke paas wala poora setup: LB jodi, servers, database copy.' },
        { id: 'v', label: 'Virginia region', sub: 'LB + servers', x: 600, y: 250, w: 160, kind: 'edge', info: 'Ye kya hai: US ke paas wala poora setup. Mumbai gire to backup bhi yahi.' },
      ],
      edges: [{ a: 'in', b: 'dns' }, { a: 'us', b: 'dns' }, { a: 'dns', b: 'm', dashed: true }, { a: 'dns', b: 'v', dashed: true }, { a: 'in', b: 'm' }, { a: 'us', b: 'v' }],
      scenarios: [
        { name: 'Paas wala region', steps: [
          { title: 'Dono xyz.com dhoondhte hain', parallel: true, go: ['in>dns', 'us>dns'], text: 'Same domain, alag jagah se.' },
          { title: 'GeoDNS alag alag jawab deta hai', parallel: true, go: ['res:dns>in', 'res:dns>us'], text: 'Chennai ko Mumbai ka IP, New York ko Virginia ka.', msg: 'Chennai: xyz.com → 13.x.x.x (Mumbai)\nNew York: xyz.com → 52.x.x.x (Virginia)' },
          { title: 'Har user paas wale region se baat karta hai', parallel: true, go: ['in>m', 'us>v', 'res:m>in', 'res:v>us'], text: 'Round trip 200 ms se ghat ke ~20-40 ms.' },
        ]},
        { name: 'Mumbai region down', steps: [
          { title: 'Mumbai gir gaya', set: { m: { state: 'down', sub: 'DOWN' } }, text: 'Poora region unavailable (power ya network ki badi dikkat).', focus: ['m'] },
          { title: 'GeoDNS health check fail', text: 'GeoDNS Mumbai ko jawab se hata deta hai.', go: 'lost:dns>m' },
          { title: 'Chennai user ab Virginia', text: 'Slow (door hai), lekin chal raha hai. Dhyaan: DNS TTL jitni der, kuch users ke paas purana Mumbai wala IP cache mein reh sakta hai, unke liye site band dikhegi.', go: ['in>dns', 'res:dns>in', 'in>dns>v'], msg: 'xyz.com → 52.x.x.x (Virginia)' },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Anycast', html: `<strong>Ye kya hai:</strong> duniya bhar ke kai data centers <strong>ek hi IP address</strong> announce karte hain. Internet ke routers (jo BGP naam ke protocol se raaste chunte hain) packet ko network ke hisaab se sabse paas wale data center tak le jaate hain.<br><strong>Kyun chahiye:</strong> DNS caching ka jhanjhat nahi. Ek data center gira, wo announce karna band karta hai, aur routers seconds mein traffic agle paas wale ko bhej dete hain.<br><strong>Iske bina:</strong> failover DNS TTL pe atka rehta.<br><strong>Example:</strong> Cloudflare ka 1.1.1.1 aur Google ka 8.8.8.8 DNS, bade CDNs, aur Google Cloud ka global load balancer (poori duniya ke liye ek anycast IP).` },
    { type: 'callout', tone: 'term', title: 'GSLB (Global Server Load Balancing)', html: `<strong>Ye kya hai:</strong> "kaunsa region?" ka faisla lene wala system. Ye GeoDNS ya anycast ke upar ek dimaag hai jo location ke saath region ki health, load aur latency bhi dekhta hai.<br><strong>Kyun chahiye:</strong> paas wala region bhara hua ya bimaar ho to use chhod ke agla behtar region chunna.<br><strong>Iske bina:</strong> sirf location dekh ke bhejoge, chahe wahan aag lagi ho.<br><strong>Example:</strong> AWS Route 53 (latency, geolocation, failover routing), Cloudflare Load Balancing, F5 BIG-IP DNS.` },
    { type: 'table', head: ['', 'GeoDNS', 'Anycast', 'GSLB'], rows: [
      ['Kaise', 'Location dekh ke alag IP', 'Ek IP, internet routing paas wala chunti hai', 'DNS/anycast + health + load + latency ka dimaag'],
      ['Failover speed', 'TTL pe nirbhar (minute)', 'Seconds', 'Neeche wale tareeke jitna'],
      ['Kamzori', 'Resolver ki location galat ho sakti hai, caching', 'Khud chalana mushkil (BGP, apna IP range). TCP connection beech mein route badle to toot sakta hai', 'Mehenga, ek aur system'],
      ['Kab', 'Simple multi-region site', 'DNS, CDN, global edge', 'Bade multi-region products'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "L7 hamesha better hai"', html: `L7 smart hai, lekin har request kholna mehenga hai aur kuch traffic HTTP hai hi nahi (database, game, raw TCP). Aur sticky routing (IP hash, cookie) tab hi karo jab sach mein zaroori ho, jaise ek server pe chal raha WebSocket ya game session. Normal web apps mein servers stateless rakho aur algorithm ko free chhodo.` },
    { type: 'callout', tone: 'why', title: 'Decide kaise karein', html: `<strong>Algorithm:</strong><br>• Servers ek jaise, requests ek jaisi chhoti → <strong>round robin</strong>.<br>• Servers alag size ke → <strong>weighted round robin</strong> (smooth).<br>• Requests ka time bahut alag alag (kuch ms, kuch second) → <strong>(weighted) least connections</strong>.<br>• Kai LB machines, bada fleet → <strong>power of two choices</strong>.<br>• Kuch servers kabhi kabhi slow → <strong>least response time</strong> (P2C ke saath).<br>• User/key ko same server chahiye (cache, session) → <strong>consistent hashing</strong>, simple IP hash nahi.<br><strong>Layer:</strong> URL/header/cookie se routing → <strong>L7</strong>. Raw speed ya non-HTTP traffic (lakhon WebSockets) → <strong>L4</strong>. Aksar dono: bahar L4, andar L7.<br><strong>Global:</strong> simple → GeoDNS (chhota TTL). Tez failover → anycast ya GSLB.` },
    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'Load balancing: poori picture', height: 610,
      groups: [
        { label: 'Users', x: 20, y: 8, w: 680, h: 96 },
        { label: 'Mumbai region', x: 20, y: 252, w: 330, h: 344 },
        { label: 'Virginia region', x: 370, y: 252, w: 330, h: 344 },
      ],
      nodes: [
        { id: 'uin', label: 'User, Chennai', x: 185, y: 58, w: 150, kind: 'client', info: 'Ye kya hai: India ka user. GeoDNS/GSLB use Mumbai region ka address deta hai.' },
        { id: 'uus', label: 'User, New York', x: 535, y: 58, w: 150, kind: 'client', info: 'Ye kya hai: US ka user. Use Virginia region milta hai.' },
        { id: 'gslb', label: 'GeoDNS / GSLB', sub: 'region chunta', x: 360, y: 168, w: 170, kind: 'net', info: 'Ye kya hai: global faisla: location, region ki health aur load dekh ke "kaunsa region" batata hai. Anycast bhi yahi kaam IP level pe karta hai.' },
        { id: 'm4', label: 'L4 LB', sub: 'IP + port', x: 185, y: 312, kind: 'net', info: 'Ye kya hai: region ka bahar wala tez LB. Sirf IP/port dekh ke connections L7 proxies mein baantta hai (aksar hash se).' },
        { id: 'm7', label: 'L7 proxy', sub: 'TLS · URL', x: 185, y: 410, kind: 'edge', info: 'Ye kya hai: TLS kholta hai, URL padhta hai, aur har request ke liye pool chunta hai. Pool ke andar algorithm chalata hai: app servers ke liye least connections, cache ke liye consistent hashing.' },
        { id: 'mapp', label: 'App servers', sub: 'least conn', x: 105, y: 530, w: 130, kind: 'server', info: 'Ye kya hai: stateless application servers. Requests ka time alag alag hai, isliye (weighted) least connections ya power of two.' },
        { id: 'mc', label: 'Cache nodes', sub: 'consistent hash', x: 265, y: 530, w: 130, kind: 'cache', info: 'Ye kya hai: cache servers. Same key hamesha same node pe chahiye, isliye consistent hashing. Node add karne pe sirf ~1/N keys hilti hain.' },
        { id: 'v4', label: 'L4 LB', sub: 'IP + port', x: 535, y: 312, kind: 'net', info: 'Ye kya hai: Virginia region ka bahar wala L4 LB. Mumbai gire to failover traffic bhi yahi leta hai.' },
        { id: 'v7', label: 'L7 proxy', sub: 'TLS · URL', x: 535, y: 410, kind: 'edge', info: 'Ye kya hai: Virginia ka L7 proxy, same routing rules.' },
        { id: 'vapp', label: 'App servers', sub: 'least conn', x: 535, y: 530, w: 150, kind: 'server', info: 'Ye kya hai: Virginia ke application servers. Failover ke time inpe zyada bojh, isliye autoscaling chahiye.' },
      ],
      edges: [
        { a: 'uin', b: 'gslb', n: 1, label: 'kaunsa region?' },
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
        { name: 'India request', text: 'GSLB ne Mumbai chuna. L4 ne connection L7 proxy ko diya, L7 ne URL padh ke least connections se app server chuna.', go: ['uin>gslb', 'uin>m4>m7>mapp'] },
        { name: 'Cache lookup', text: 'L7 (ya app) key ko hash karke consistent hashing ring se cache node chunta hai. Same key, same node.', go: ['m4>m7>mc'] },
        { name: 'US request', text: 'New York ka user Virginia region pe, wahan bhi wahi L4 → L7 → pool wala raasta.', go: ['uus>gslb', 'uus>v4>v7>vapp'] },
        { name: 'Mumbai down', text: 'Mumbai ki health check fail. GSLB ab Chennai ko bhi Virginia bhejta hai: slow lekin chalu. GeoDNS ho to TTL tak kuch users atke rahenge.', go: ['uin>gslb>v4>v7>vapp'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Round robin = baari baari. Weighted RR = bade server ki zyada baari (NGINX ka smooth version burst nahi aane deta).</li>
      <li>Least connections (aur weighted) = abhi ka bojh dekho. Lambi-chhoti mixed requests ka best default.</li>
      <li>Least response time = slow server pakdo. Random = zero state. Power of two = do random mein se kam busy: sasta aur lagbhag perfect.</li>
      <li>IP hash = sticky, lekin N badla to ~sab hilte hain. Consistent hashing = sirf ~1/N hilte hain.</li>
      <li>Agent based = servers khud load batate hain, lekin purani report pe herding ka khatra.</li>
      <li>L4 = IP/port, per connection, tez. L7 = URL/headers, per request, smart lekin mehenga. Aksar bahar L4, andar L7.</li>
      <li>Global: GeoDNS (TTL ka jhanjhat), Anycast (ek IP, tez failover), GSLB (health + load + latency ka dimaag).</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Sahi algorithm se p95 latency kai guna kam (race simulator mein 290 ms se 40-50 ms)', 'Weights se alag size ke servers ka poora istemaal', 'Consistent hashing se cache garam rehta hai, scale karna sasta', 'L7 se ek address ke peeche kai services, alag pools, chhota blast radius', 'GeoDNS/anycast se door ke users ko 150+ ms ki bachat'], costs: ['Smart algorithms ko state chahiye (connections, latency), kai LBs mein ye bikhra hota hai', 'L7 ka CPU aur TLS ka kharcha, L4 se zyada machines', 'Sticky/hash routing se load tedha aur failover pe session loss', 'Global setup = har region mein poori copy, data sync ka sir-dard', 'DNS-based failover TTL ki wajah se dheema'] },
    { type: 'think', questions: [
      { q: 'xyz.com pe 95% requests 20 ms ki hain aur 5% video export 60 second ke. Kaunsa algorithm aur kyun? Kya koi behtar design hai?', a: 'Least connections (ya least outstanding requests, ya P2C). Round robin lambi exports ko ek hi server pe jama kar sakta hai. Behtar design: exports ko alag async job queue mein bhej do, taaki web servers pe aisi requests aayein hi nahi.' },
      { q: 'Tumhare 4 LB machines hain aur sab least connections chala rahe hain, lekin har ek ki ginti alag hai. Naya server add kiya to 4 seconds tak uspe bhaari bheed lagi. Kyun, aur fix?', a: 'Har LB ne dekha "naye server pe 0 connections, sabse khaali" aur chaaron ek saath usi pe toot pade (herding). Fix: power of two choices (randomness herding todta hai), aur slow start (naye server ka weight dheere dheere badhao).' },
      { q: 'GeoDNS se region failover mein 5 minute lag gaye. Kyun?', a: 'DNS TTL. Resolvers aur browsers ne purana IP cache kar rakha tha. Failover tez chahiye to TTL chhota rakho (30-60 s), ya anycast/GSLB use karo jahan IP badalna hi nahi padta.' },
      { q: 'Ek gRPC service ke saamne L4 LB hai. 10 clients, 10 servers, phir bhi 3 servers 100% aur 4 khaali. Kyun?', a: 'gRPC ek lamba HTTP/2 connection rakhta hai. L4 per connection faisla karta hai, to har client ki saari requests ek server pe chipak gayin. Fix: L7 LB (Envoy) jo har request alag baante, ya client-side load balancing.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Servers alag alag capacity ke hain, requests same size. Best simple choice?', options: ['Round robin', 'Weighted round robin', 'IP hash'], answer: 1, explain: 'Capacity ke hisaab se hissa. Race simulator mein same-size requests pe weighted RR sabse aage tha.' },
      { q: 'Weights 3:1:1 pe NGINX ka smooth weighted round robin pehli 5 requests kaise baantega?', options: ['S1 S1 S1 S2 S3', 'S1 S2 S1 S3 S1', 'S1 S2 S3 S1 S1'], answer: 1, explain: 'Har baar counters mein weight jodo, sabse bada chuno, uska kul weight (5) ghatao. Isse S1 ki baariyan beech beech mein aati hain, burst nahi.' },
      { q: 'Power of two choices kya karta hai?', options: ['Do servers ko har request bhejta hai', 'Do random servers mein se kam busy ko chunta hai', 'Sirf do servers use karta hai'], answer: 1, explain: 'Sirf do dekh ke bhi load lagbhag least connections jitna barabar. Envoy LEAST_REQUEST aur HAProxy random (default 2 draws) yahi karte hain.' },
      { q: 'hash(IP) mod N se 3 servers ko 4 kiya. Lagbhag kitne users ka server badlega?', options: ['~25%', '~50%', '~75%'], answer: 2, explain: 'Server tabhi same rahega jab hash mod 3 aur hash mod 4 barabar ho, jo ~4 mein 1 baar hota hai. Consistent hashing mein sirf ~25% hilte, aur sab naye server pe.' },
      { q: 'URL path se routing kaunsa LB kar sakta hai?', options: ['L4', 'L7', 'GeoDNS'], answer: 1, explain: 'L7 TLS khol ke HTTP request padhta hai. L4 ko sirf IP aur port dikhte hain.' },
      { q: 'Region failover seconds mein chahiye, DNS caching ke bina. Kaunsa tareeka?', options: ['GeoDNS lamba TTL', 'Anycast', 'IP hash'], answer: 1, explain: 'Anycast mein sab regions ek hi IP announce karte hain. Region gira to internet routing apne aap agle paas wale pe bhejti hai.' },
    ]},
    { type: 'sources', items: [
      { title: 'Module ngx_http_upstream_module', publisher: 'nginx.org', official: true, url: 'https://nginx.org/en/docs/http/ngx_http_upstream_module.html', used: 'Default weighted round robin, least_conn, ip_hash (IPv4 ke pehle teen octets), hash ... consistent (ketama), random two least_conn, least_time (commercial).' },
      { title: 'Upstream: smooth weighted round-robin balancing (commit, 2012)', publisher: 'nginx source (Maxim Dounin)', official: true, year: 2012, url: 'https://nginx.googlesource.com/nginx/+/52327e0627f49dbda1e8db695e63a4b0af4448b1', used: 'Smooth WRR ka current_weight algorithm aur 5:1:1 ka a a b a c a a example.' },
      { title: 'Backends: load balancing algorithms', publisher: 'HAProxy Technologies docs', official: true, url: 'https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/backends/', used: 'roundrobin 3.2 tak default, 3.3 se random (power of two) default; leastconn, source, uri, hdr.' },
      { title: 'Test Driving "Power of Two Random Choices" Load Balancing (2019)', publisher: 'HAProxy blog', official: true, year: 2019, url: 'https://www.haproxy.com/blog/power-of-two-load-balancing', used: 'random algorithm ka default 2 draws (HAProxy 2.0), P2C vs leastconn vs roundrobin ke test results.' },
      { title: 'Supported load balancers', publisher: 'Envoy proxy docs', official: true, url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers', used: 'ROUND_ROBIN, LEAST_REQUEST (default choice_count 2, alag weights pe weight/(active+1) formula), RING_HASH, MAGLEV, RANDOM, client-side weighted RR.' },
      { title: 'Edit target group attributes (routing algorithm)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html', used: 'ALB: round robin default, least outstanding requests, weighted random + automatic target weights.' },
      { title: 'The Power of Two Choices in Randomized Load Balancing (PhD thesis, 1996)', publisher: 'Michael Mitzenmacher, UC Berkeley', year: 1996, url: 'https://www.eecs.harvard.edu/~michaelm/postscripts/mythesis.pdf', used: 'Do random choices se sabse bhare server ka bojh bahut girta hai, ye result.' },
      { title: 'Beyond Round Robin: Load Balancing for Latency (2016)', publisher: 'Linkerd blog', official: true, year: 2016, url: 'https://linkerd.io/2016/03/16/beyond-round-robin-load-balancing-for-latency/', used: 'Latency-aware balancing aur peak EWMA ka idea.' },
      { title: 'Maglev: A Fast and Reliable Software Network Load Balancer (NSDI 2016)', publisher: 'Google (USENIX)', year: 2016, url: 'https://research.google/pubs/maglev-a-fast-and-reliable-software-network-load-balancer/', used: 'Software L4 LB normal Linux servers pe, Maglev hashing.' },
      { title: 'What is Anycast?', publisher: 'Cloudflare Learning Center', official: true, url: 'https://www.cloudflare.com/learning/cdn/glossary/anycast-network/', used: 'Ek IP kai data centers se, BGP routing paas wale tak.' },
      { title: 'Cloud Load Balancing overview', publisher: 'Google Cloud documentation', official: true, url: 'https://cloud.google.com/load-balancing/docs/load-balancing-overview', used: 'Global external load balancer ka ek anycast IP.' },
    ]},
  ],
});
