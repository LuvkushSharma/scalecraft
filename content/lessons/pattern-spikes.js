Lesson.register({
  id: 'pattern-spikes',
  title: 'Traffic spikes aur hot keys',
  minutes: 30,
  summary: `Cricket final ka aakhri over, sale ka 12 baje wala second, ya ek viral video: traffic minutes mein 5-10 guna ho jaata hai. Is lesson mein bachaav ki ek seedhi (ladder) chadhenge: pehle se machines badhana, apne aap badhna, kaam ko line mein daalna, har user ki hadd, zyada bheed mein kuch requests mana karna, features halke karna, aur ek hi cheez pe aayi bheed (hot key) ko todna. Simulator mein sab on/off karke khud dekho.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho xyz.com pe roz shaam 1 lakh log aate hain, aur aaj cricket final hai: 9 lakh log ek saath.<br>Servers 1.5 lakh tak sambhal sakte hain. Baaki ka kya?<br>Agar kuch na kiya, to sab ke liye site slow hogi, phir girega, aur log refresh daba daba ke bheed aur badhayenge.<br>Is lesson mein seekhenge: bheed pehle se pata ho to kya karein, achanak aaye to kya karein, aur jab sach mein jagah na ho to <em>sabse zaroori</em> cheez (video chalna) kaise bachayein.` },
    { type: 'h2', text: 'Is pattern ki seedhi (ladder)' },
    { type: 'p', html: `Har rung ek naya hathiyaar hai. Neeche wale saste hain, upar wale zyada kaam ke. Asal systems kai rungs ek saath lagate hain (layers), lekin seekhne ke liye ek ek chadhenge:` },
    { type: 'steps', items: [
      { t: 'Rung 1: Headroom + pre-scaling', d: 'Event pata hai (match, sale)? Pehle se machines, cache, DB taiyaar.' },
      { t: 'Rung 2: Autoscaling', d: 'Achanak bheed? Machines apne aap badhein. Lekin der se aati hain (lag).' },
      { t: 'Rung 3: Queue (shock absorber)', d: 'Jo kaam baad mein ho sakta hai (likes, history), use line mein daalo. Bheed ka jhatka line kha jaaye.' },
      { t: 'Rung 4: Rate limiting', d: 'Har user/bot ki hadd. Retry ki baadh bhi ruke.' },
      { t: 'Rung 5: Load shedding by priority', d: 'Jagah hi nahi? Kam zaroori requests turant mana, zaroori wali bachao.' },
      { t: 'Rung 6: Graceful degradation', d: 'Request lo, lekin halka jawab do (personalised homepage ki jagah ek common page).' },
      { t: 'Rung 7: Hot keys todna', d: 'Sab ek hi cheez padh rahe (score)? Local cache, copies, ya counter ke tukde.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (stop climbing)', html: `Chhota app, spikes 2x tak? Headroom + autoscaling kaafi. Saal mein kuch bade known events? Pre-scaling + load test jodo. Crore users wala live event? Poori seedhi, kyunki ek bhi rung na ho to wahi kamzor kadi banta hai. Har rung ke end mein "kab ruko" likha hai.` },
    { type: 'h2', text: 'Problem: 1 lakh se 9 lakh, 15 minute mein' },
    { type: 'p', html: `xyz.com ab live cricket bhi dikhata hai. Normal shaam ko ~1 lakh requests per second aate hain (isko <strong>rps</strong> likhte hain: har second kitni requests). Aaj final hai. Toss ke baad traffic chadhta hai, aakhri overs mein ~5 lakh, aur jis minute jeet ka run bana aur app ne push notification bheja, <strong>~9 lakh rps</strong>. Servers itne ke liye bane hain ki 1.5 lakh aaraam se jhel lein.` },
    { type: 'p', html: `Ye kalpana nahi hai. Hotstar (ab JioHotstar) ke engineers ne AWS re:Invent 2019 ke talk mein bataya ki 2019 World Cup ke India vs New Zealand match pe <strong>2.53 crore log ek saath</strong> stream kar rahe the, aur unke traffic ka graph "tsunami" jaisa tha: kuch hi minutes mein lakhon naye users. Big Billion Days sale ka pehla second, New Year raat 12 baje ke "Happy New Year" messages: sab same shape.` },
    { type: 'callout', tone: 'term', title: 'Traffic spike', html: `<strong>Ye kya hai:</strong> thodi der ke liye traffic ka achanak kai guna ho jaana. Jaise 1 lakh rps se 15 minute mein 9 lakh rps.<br><strong>Kyun samajhna zaroori:</strong> system average ke liye nahi, sabse bure minute ke liye banana padta hai. Wahi minute sabse zaroori bhi hota hai (match ka aakhri over).<br><strong>Iske bina:</strong> design average pe hoga, aur saal ke sabse bade din site giregi.` },
    { type: 'callout', tone: 'term', title: 'Headroom', html: `<strong>Ye kya hai:</strong> normal load ke upar kitni extra capacity khaali rakhi hai. 1 lakh load, 1.5 lakh capacity = 50% headroom.<br><strong>Kyun chahiye:</strong> chhote spikes (jaise 1.3x) bina kuch kiye jhel jaate hain, aur autoscaling ko machines laane ka time milta hai.<br><strong>Iske bina:</strong> har chhoti lehar pe site slow.<br><strong>Limit:</strong> 9x spike headroom se nahi rukta. 9x headroom hamesha rakhna = saal bhar 8 hisse machines khaali, bahut mehenga.` },
    { type: 'p', html: `Spikes do tarah ke hote hain, aur dono ka ilaaj alag hai:` },
    { type: 'table', head: ['', 'Pata tha (known)', 'Pata nahi tha (unknown)'], rows: [
      ['Example', 'Match, sale, New Year, product launch', 'Viral video, celebrity post, breaking news'],
      ['Kitna time milta hai', 'Din/hafte pehle se', 'Zero. Minutes mein aa gaya'],
      ['Main hathiyaar', 'Pre-scaling + load testing', 'Autoscaling + shedding + degradation'],
      ['Khatra', 'Forecast galat (zyada log aaye)', 'Autoscaling ka lag'],
    ]},

    { type: 'h2', text: 'Rung 1: headroom + pre-scaling (pata hai to pehle se taiyaar)' },
    { type: 'p', html: `<strong>Problem:</strong> final ki date hafton pehle se pata hai. Agar hum match shuru hone ka wait karein aur phir machines badhayein, to der ho chuki hogi. To kyun na pehle se taiyaar rahein?` },
    { type: 'callout', tone: 'term', title: 'Pre-scaling (pre-warming)', html: `<strong>Ye kya hai:</strong> event shuru hone se <em>pehle</em> capacity badha dena, forecast (andaaze) ke hisaab se. Sirf app servers nahi: cache warm karna (popular data pehle se Redis mein), database ke read replicas, connection pools, load balancer aur CDN ki capacity, aur cloud account ki limits (quota) bhi.<br><strong>Kyun chahiye:</strong> nayi machine laane mein minutes lagte hain. Known event mein ye minutes pehle hi kharch kar do.<br><strong>Iske bina:</strong> match ke pehle 5-10 minute purani capacity pe, aur wahi minute sabse bhaari.` },
    { type: 'steps', items: [
      { t: 'Forecast', d: 'Pichhle saal ka final, aaj ki team, din, time. "Peak ~7.5 lakh rps hoga" jaisa number nikaalo, aur us pe safety margin.' },
      { t: 'Load test', d: 'Asli event se pehle nakli users se utna traffic maaro. Hotstar ne apne talk mein "Project HULK" naam ke load-testing setup ka zikr kiya, jo kai regions se tsunami jaisa traffic, push notification ke baad wala jhatka, aur CDN failure tak simulate karta tha.' },
      { t: 'Game day', d: 'Ek nakli "match day" jisme team mil ke cheezein todti hai (chaos engineering): ek zone band, ek cache cluster down. Pata chalta hai kaunsa hissa pehle girta hai.' },
      { t: 'Scale up, phir event', d: 'Match se pehle machines chalu, warm, health-checked. Hotstar ke talk ke summary ke mutabik unhone scaling ko request rate ki jagah concurrent viewers ke hisaab se apni scripts se chalaya.' },
      { t: 'Event ke baad scale down', d: 'Warna khaali machines ka bill. Ye pre-scaling ki keemat hai: ghanton tak capacity jo shayad poori use na ho.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Load test aur game day', html: `<strong>Ye kya hai:</strong> load test = nakli users (scripts) se asli jitna traffic bhej ke dekhna ki system kahan tootta hai. Game day = team mil ke jaan-boojh ke cheezein todti hai (ek zone band, cache down), taaki asli din pe surprise na ho.<br><strong>Kyun chahiye:</strong> forecast ek andaaza hai. Test batata hai ki asli kamzor kadi kaun hai: aksar app nahi, database ya ek hot key.<br><strong>Iske bina:</strong> pehli baar pata asli match mein chalega.` },
    { type: 'callout', tone: 'tip', html: `Push notification khud ek spike banata hai: "India jeet gaya!" 5 crore phones pe ek saath gaya, aur 30 second mein lakhon log app kholte hain. Isliye bade notifications <strong>batches mein</strong> bhejte hain (sabko ek second mein nahi), ya bhejne se pehle capacity check karte hain.` },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 1)', html: `Saal bhar koi bada known event nahi, aur spikes 1.3-1.5x tak? Thoda headroom kaafi, pre-scaling ki mehnat mat karo. Pre-scaling tab jab date pata ho aur ek bhi minute ka girna mehenga ho (final, sale, launch).` },

    { type: 'h2', text: 'Rung 2: autoscaling, aur uska lag' },
    { type: 'p', html: `<strong>Problem:</strong> ek creator ka video achanak viral hua. Koi forecast nahi tha. 10 minute mein traffic 3x. Ab koi insaan raat 2 baje machines nahi badhayega; system ko khud badhna hoga.` },
    { type: 'callout', tone: 'term', title: 'Autoscaling', html: `<strong>Ye kya hai:</strong> ek rule jo ek number (metric: CPU, rps, queue length) dekh ke machines apne aap badhata/ghatata hai. Jaise "average CPU 70% se upar 2 minute tak rahe to 20% machines aur jodo". AWS Auto Scaling groups, Kubernetes HPA, GCP managed instance groups sab yahi karte hain.<br><strong>Kyun chahiye:</strong> unknown spikes ke liye, aur raat ko machines kam karke paisa bachane ke liye.<br><strong>Iske bina:</strong> ya to hamesha peak jitni machines (mehenga), ya har viral video pe site down.` },
    { type: 'p', html: `Problem iska <strong>lag</strong> hai. Ek nayi machine traffic lene tak in steps se guzarti hai:` },
    { type: 'ascii', text: `
 load badha ──> metric window ──> decision ──> machine boot ──> app start ──> health check ──> LB traffic bheje
                (1-3 min avg)     (cooldown)    (~1 min+)       + cache/JIT     (kuch checks)
                                                                  warm-up
 └──────────────────────────── aksar kai minute ─────────────────────────────────────────────┘
 Is poore time tak purani capacity hi naya load jhel rahi hai.` },
    { type: 'p', html: `Hotstar ke talk mein jo dikkatein gin-ai gayi thi: spike ke time cloud provider ke paas us type ki machines hi khatam (insufficient capacity), app start hone mein ~1 minute, jabki traffic har minute 10 lakh+ users badh raha tha, aur failed requests ke retries upar se load badha rahe the. Matlab jab tak nayi machines aati, bheed aage nikal chuki thi.` },
    { type: 'list', items: [
      `<strong>Lag ghatane ke tareeke:</strong> pehle se bani images (sab installed, sirf start karo), containers (VMs se jaldi start), warm pool (machines boot ho chuki, bas LB mein jodni hain), aur metric ko jaldi pakadna (CPU ki jagah request rate ya queue length, jo pehle badhti hai).`,
      `<strong>Scale-in dheere:</strong> spike ke baad machines turant mat hatao. Traffic doosri baar uchhal sakta hai (innings break ke baad). Cooldown (do scaling faislon ke beech ka ruka hua time) lamba rakho.`,
      `<strong>Autoscaling ki chhat:</strong> database aur doosri stateful cheezein minutes mein scale nahi hoti. App servers 10x ho gaye to unke peeche ka DB pe 10x connections. Isliye baaki defences chahiye.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Cloud pe hain, autoscaling on hai, to spike ki chinta kyun?" Kyunki autoscaling <strong>reactive</strong> hai: pehle load badhta hai, phir metric dikhti hai, phir nayi machine boot hoti hai, phir app warm hota hai. Is beech (aksar kai minute) jo traffic aaya, wo purani capacity pe hi gira. Hotstar ke talk mein bhi yahi kaha gaya ki unke tsunami traffic ke liye normal autoscaling kaafi nahi thi. Autoscaling spike ka <em>doosra</em> jawab hai, pehla nahi.` },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 2)', html: `Har stateless service pe autoscaling lagao, ye sasta hai. Agar tumhare spikes dheere aate hain (ghante mein 2x), to autoscaling + headroom hi kaafi hai. Minute mein 5x wale spikes ke liye agle rungs chahiye.` },

    { type: 'h2', text: 'Rung 3: queue-based load levelling (shock absorber)' },
    { type: 'p', html: `Har request ko <em>abhi</em> jawab nahi chahiye. Video play karna abhi chahiye. Lekin "like" ka count, "maine 10 minute dekha" wala watch-history event, comment ka moderation, analytics: ye 30 second baad bhi ho jaayein to user ko farak nahi padta. Inhe request ke andar karne ki jagah <a href="#/queues">queue</a> mein daalo, user ko turant <code>202 Accepted</code> do, aur workers apni fixed speed se karte rahein.` },
    { type: 'callout', tone: 'term', title: 'Queue-based load levelling', html: `<strong>Ye kya hai:</strong> queue ko <strong>shock absorber</strong> ki tarah use karna. Aane wala traffic uchhalta hai, lekin workers use ek barabar speed se uthate hain. Peak pe line (backlog) lambi hoti hai, spike ke baad khaali.<br><strong>Kyun chahiye:</strong> database ek tay speed tak hi likh sakta hai. Queue us speed ki hifaazat karti hai: DB ko kabhi peak nahi dikhta.<br><strong>Iske bina:</strong> spike seedha DB pe, writes fail, aur failed writes ke retries aur load laate hain.<br><strong>Keemat:</strong> <strong>delay</strong> (kaam der se hota hai). Ye sirf un kaamon pe chalta hai jinka jawab user ko turant nahi chahiye.` },
    { type: 'p', html: `<strong>Shock absorber lab.</strong> Normal mein har second 20,000 async writes (likes, watch history). Minute 20 se spike aata hai. Workers ek fixed speed pe DB mein likhte hain (ye speed DB ki safe limit ke barabar rakhi hai). Dekho line kitni lambi hoti hai, kaam kitna der se hota hai, aur kab khaali hoti hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Spike kitna guna: <strong class="psq-vh"></strong></label><input class="psq-h" type="range" min="2" max="10" step="1" value="4"></div>
          <div><label>Spike kitne minute: <strong class="psq-vl"></strong></label><input class="psq-l" type="range" min="5" max="30" step="5" value="10"></div>
          <div><label>Workers ki speed (writes/s): <strong class="psq-vw"></strong></label><input class="psq-w" type="range" min="20000" max="120000" step="10000" value="50000"></div>
        </div>
        <svg class="psq-svg" viewBox="0 0 600 200" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Incoming writes vs DB writes and backlog"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-3)"><span style="color:var(--ink-2)">┄ aane wale writes/s</span><span style="color:var(--green)">━ DB pe writes/s</span><span style="color:var(--amber)">█ line (backlog)</span></div>
        <div class="stats">
          <div class="stat"><span>Line max</span><strong class="psq-max"></strong></div>
          <div class="stat"><span>Kaam ki max der</span><strong class="psq-del"></strong></div>
          <div class="stat"><span>Line khaali kab</span><strong class="psq-dr"></strong></div>
          <div class="stat"><span>Bina queue DB pe peak</span><strong class="psq-pk"></strong></div>
        </div>
        <div class="calc-note psq-note"></div>`;
      const $ = c => el.querySelector(c), B = 20000, T = 60, S0 = 20;
      const sim = (h, len, W) => { let bl = 0, mx = 0, drain = -1; const inc = [], db = [], q = [];
        for (let t = 0; t < T; t++) { const i = t >= S0 && t < S0 + len ? B * h : B; const avail = bl + i * 60, done = Math.min(avail, W * 60); bl = avail - done; mx = Math.max(mx, bl);
          if (t >= S0 + len && bl === 0 && drain < 0 && mx > 0) drain = t + 1; inc.push(i); db.push(done / 60); q.push(bl); }
        return { inc, db, q, mx, drain, peak: B * h }; };
      const f = n => n >= 1e7 ? (n / 1e7).toFixed(2) + ' crore' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' lakh' : Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const h = +$('.psq-h').value, len = +$('.psq-l').value, W = +$('.psq-w').value, r = sim(h, len, W);
        $('.psq-vh').textContent = h + 'x'; $('.psq-vl').textContent = len + ' min'; $('.psq-vw').textContent = W.toLocaleString('en-IN');
        const top = Math.max(B * 10, W) * 1.05, qtop = Math.max(r.mx, 1);
        const X = i => 30 + i * (560 / (T - 1)), Y = v => 170 - v / top * 155, YQ = v => 170 - v / qtop * 120;
        const bars = r.q.map((v, i) => v > 0 ? `<rect x="${(X(i) - 4).toFixed(1)}" y="${YQ(v).toFixed(1)}" width="8" height="${(170 - YQ(v)).toFixed(1)}" fill="var(--amber)" opacity=".45"/>` : '').join('');
        const line = (a, col, dash, w) => `<polyline points="${a.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? 'stroke-dasharray="4 4"' : ''}/>`;
        $('.psq-svg').innerHTML = `<line x1="30" x2="590" y1="170" y2="170" stroke="var(--line)"/>` + bars + line(r.inc, 'var(--ink-2)', 1, 1.5) + line(r.db, 'var(--green)', 0, 2.5) +
          `<text x="310" y="192" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">minute 0 → 60</text>`;
        const over = W < B;
        $('.psq-max').textContent = f(r.mx) + ' msgs'; $('.psq-del').textContent = (Math.round(r.mx / (W * 60) * 10) / 10) + ' min';
        $('.psq-dr').textContent = over ? 'kabhi nahi' : r.mx === 0 ? 'line bani hi nahi' : r.drain > 0 ? 'minute ' + r.drain : '60 ke baad';
        $('.psq-pk').textContent = r.peak.toLocaleString('en-IN') + '/s';
        $('.psq-note').textContent = over ? 'Workers normal traffic (20,000/s) se bhi dheere hain: line hamesha badhegi. Queue spike kha sakti hai, lagataar overload nahi. Workers badhao.' : r.mx === 0 ? 'Workers spike se bhi tez hain: line bani hi nahi. (Itne workers ka matlab DB ko bhi peak jhelna padega.)' : `Bina queue DB ko ${r.peak.toLocaleString('en-IN')}/s jhelna padta. Queue ke saath DB kabhi ${W.toLocaleString('en-IN')}/s se upar nahi gaya. Keemat: kuch likes ${(Math.round(r.mx / (W * 60) * 10) / 10)} minute tak der se dikhe.`;
      };
      el.querySelectorAll('input').forEach(i => i.oninput = upd); upd();
    }},
    { type: 'p', html: `Default (4x spike, 10 minute, workers 50,000/s): line max 1.8 crore messages, kaam max 6 minute der se, line minute 40 tak khaali. DB ne kabhi 50,000/s se zyada nahi dekha, jabki bina queue 80,000/s aata. Workers 20,000/s se kam karo: line kabhi khaali nahi hoti. Yahi rule hai: <strong>queue spike kha sakti hai, lagataar overload nahi</strong>.` },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 3)', html: `Agar tumhare spike mein zyada tar requests "abhi jawab chahiye" wali hain (video play, login), to queue unki madad nahi karegi; agle rungs chahiye. Queue tab lagao jab traffic ka bada hissa background kaam ho (likes, views, analytics, emails) aur kuch minute der chalegi.` },

    { type: 'h2', text: 'Rung 4: rate limiting' },
    { type: 'p', html: `<strong>Problem:</strong> match ke time kuch bots har 100 ms pe score API maarte hain, aur jab site slow hoti hai to apps khud 3-3 baar retry karti hain. Ek chhota hissa clients bahut bada load bana deta hai.` },
    { type: 'callout', tone: 'term', title: 'Rate limiting (yaad dilana)', html: `<strong>Ye kya hai:</strong> har client (user, IP, API key) ki ek hadd, jaise "100 requests per minute". Hadd ke upar <code>429 Too Many Requests</code>.<br><strong>Kyun chahiye:</strong> ek client sab ka hissa na kha jaaye.<br><strong>Iske bina:</strong> ek bot ya ek buggy app poori site gira sakti hai.` },
    { type: 'p', html: `<a href="#/rate-limiting">Rate limiting</a> har client ko uske hisse tak rokta hai. Spike mein ye do kaam karta hai: (1) bots aur scrapers jo match ke time score API ko har 100 ms hit karte hain, unhe <code>429</code>; (2) <strong>retry storm</strong> rokna. Jab server slow hota hai, apps retry karti hain, aur har retry ek nayi request hai. Bina limit ke, failure apne aap load double kar deta hai. Clients pe exponential backoff + jitter (<a href="#/resilience">resilience</a> lesson) aur server pe per-user limit, dono chahiye.` },
    { type: 'callout', tone: 'warn', html: `Rate limiting akela spike nahi rokta. Final ke time 2 crore <em>normal</em> users hain, har ek apni limit ke andar. Total phir bhi capacity se upar. Wahan agla defence chahiye: system ko khud ko bachaana.` },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 4)', html: `Public API ya app hai to rate limiting hamesha lagao (sasta, gateway pe). Lekin agar spike asli users ka hai (sab apni hadd mein), to ye rung kuch nahi karega; agle do rungs chahiye.` },

    { type: 'h2', text: 'Rung 5: load shedding, priority ke saath' },
    { type: 'p', html: `Jab total load capacity se upar ho, do hi raaste hain: sab requests ko andar lo aur sab slow ho jaayein, ya kuch ko turant mana karo aur baaki ko theek se serve karo. Pehla raasta sunne mein "fair" lagta hai, lekin asal mein sabse bura hai:` },
    { type: 'callout', tone: 'term', title: 'Congestion collapse', html: `<strong>Ye kya hai:</strong> overload ka sabse bura haal. Overloaded server pe har request line mein wait karti hai. Client 2 second baad timeout karke chala jaata hai, lekin server us request pe kaam karta rehta hai: <strong>bekaar kaam</strong>. Phir client retry karta hai: aur load. Result: server 100% busy, lekin kaam ka output (jo requests time pe poori huin) girta jaata hai. Ise congestion collapse kehte hain.<br><strong>Kyun samjhna zaroori:</strong> "sabko andar le lo" sunne mein fair hai, lekin isse sab fail hote hain.` },
    { type: 'p', html: `<strong>Load shedding</strong> (<a href="#/rate-limiting">rate limiting</a> lesson mein pehli baar dekha) iska ilaaj hai: server apne bojh (CPU, in-flight requests, queue mein wait time) ko dekhta hai, aur ek hadd ke upar <em>sasti</em> rejection deta hai (<code>503</code> + <code>Retry-After</code>), shuru mein hi, bina koi bhaari kaam kiye. Aur rejection <strong>priority</strong> se:` },
    { type: 'table', head: ['Priority', 'xyz.com pe', 'Overload mein'], rows: [
      ['Critical', 'Video play, login, payment/subscription', 'Sabse aakhir mein chhoda jaaye'],
      ['Normal', 'Comments post, like, search', 'Queue mein daalo ya baad mein'],
      ['Low', 'Recommendations, "aur dekho" prefetch, analytics beacons', 'Sabse pehle chhodo'],
    ], caption: 'Priority request ke path/header se tay hoti hai, aur gateway pe hi check hoti hai, taaki shed ki gayi request sasti pade.' },
    { type: 'callout', tone: 'term', title: 'Load shedding', html: `<strong>Ye kya hai:</strong> server ka khud ko bachane ka tareeka. Wo apna bojh dekhta hai (CPU, kitni requests andar chal rahi hain, line mein wait time). Hadd ke upar wo nayi requests ko turant, sasta "abhi nahi" bolta hai (<code>503</code> + <code>Retry-After</code>), bina koi bhaari kaam kiye.<br><strong>Kyun chahiye:</strong> jo requests andar aayi, wo time pe poori hon. Aur mana karte waqt pehle kam zaroori requests chhodo.<br><strong>Iske bina:</strong> congestion collapse: sab andar, sab late, sab fail.` },
    { type: 'p', html: `<strong>Goodput lab.</strong> Goodput = wo requests jo <em>time pe</em> poori huin (jo kaam ki hain). Capacity 1.5 lakh rps hai. Aane wala load (offered load) badhao aur dekho dono raaston ka goodput. Model simple hai: bina shedding ke, capacity se jitna upar, utna zyada bekaar kaam (timeouts), lekin kam se kam 35% kaam bachta hai. Shedding ke saath server 90% pe tika rehta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Offered load: <strong class="psg-vx"></strong></label><input class="psg-x" type="range" min="0.5" max="3" step="0.1" value="2"></div>
        <svg class="psg-svg" viewBox="0 0 600 210" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Goodput vs offered load, with and without shedding"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-3)"><span style="color:var(--red)">━ bina shedding</span><span style="color:var(--green)">━ shedding by priority</span></div>
        <div class="stats">
          <div class="stat"><span>Goodput bina shedding</span><strong class="psg-a"></strong></div>
          <div class="stat"><span>Goodput shedding ke saath</span><strong class="psg-b"></strong></div>
          <div class="stat"><span>Video play bacha (bina / saath)</span><strong class="psg-c"></strong></div>
          <div class="stat"><span>Latency (bina / saath)</span><strong class="psg-d"></strong></div>
        </div>
        <div class="calc-note psg-note"></div>`;
      const $ = c => el.querySelector(c), CAP = 1.5;
      const no = x => x <= 1 ? x : Math.max(0.35, 1 - 0.5 * (x - 1));
      const sh = x => x <= 1 ? x : 0.9;
      const critNo = x => x <= 1 ? 1 : no(x) / x, critSh = x => x <= 1 ? 1 : Math.min(0.5 * x, 0.9) / (0.5 * x);
      const upd = () => {
        const x = +$('.psg-x').value;
        $('.psg-vx').textContent = x.toFixed(1) + 'x capacity (' + (x * CAP).toFixed(2) + ' lakh rps)';
        const X = v => 40 + (v - 0.5) / 2.5 * 540, Y = v => 180 - v / 1.1 * 160, pts = fn => { const a = []; for (let v = 0.5; v <= 3.001; v += 0.05) a.push(X(v).toFixed(1) + ',' + Y(fn(v)).toFixed(1)); return a.join(' '); };
        $('.psg-svg').innerHTML = `<line x1="40" x2="580" y1="${Y(1)}" y2="${Y(1)}" stroke="var(--line-2)" stroke-dasharray="3 4"/><text x="44" y="${Y(1) - 5}" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">capacity</text>
          <line x1="40" x2="580" y1="180" y2="180" stroke="var(--line)"/><line x1="${X(1)}" x2="${X(1)}" y1="20" y2="180" stroke="var(--line)"/>
          <polyline points="${pts(no)}" fill="none" stroke="var(--red)" stroke-width="2.5"/><polyline points="${pts(sh)}" fill="none" stroke="var(--green)" stroke-width="2.5"/>
          <line x1="${X(x)}" x2="${X(x)}" y1="20" y2="180" stroke="var(--accent)" stroke-width="2"/>
          <text x="310" y="203" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">offered load: 0.5x → 3x capacity</text>`;
        const pc = v => Math.round(v * 100) + '%';
        $('.psg-a').textContent = (no(x) * CAP).toFixed(2) + ' lakh'; $('.psg-b').textContent = (sh(x) * CAP).toFixed(2) + ' lakh';
        $('.psg-c').textContent = pc(critNo(x)) + ' / ' + pc(critSh(x));
        $('.psg-d').textContent = x <= 1 ? 'normal' : 'timeouts / ~280 ms';
        $('.psg-note').textContent = x <= 1 ? 'Capacity ke andar: dono same. Shedding tab hi kuch karta hai jab load hadd se upar ho.' : `Bina shedding goodput ${(no(x) * CAP).toFixed(2)} lakh: capacity se kam, kyunki server timeout ho chuki requests pe kaam karta raha. Shedding ke saath ${(sh(x) * CAP).toFixed(2)} lakh, aur video play (critical, aadha traffic) ka ${pc(critSh(x))} bacha, kyunki pehle recommendations jaisi low-priority requests chhodi gayi.`;
      };
      $('.psg-x').oninput = upd; upd();
    }},
    { type: 'p', html: `2x load pe: bina shedding goodput sirf 0.75 lakh rps (capacity ka aadha!) aur video play ka 25% hi bacha. Shedding ke saath 1.35 lakh rps aur video play ka 90% bacha. Shedding capacity nahi badhata; wo bekaar kaam rokta hai aur zaroori kaam ko aage rakhta hai.` },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 5)', html: `Har service jo overload ho sakti hai, use kam se kam simple shedding chahiye (in-flight requests ki hadd). Priority wali shedding tab jab traffic mein saaf "zaroori" aur "kam zaroori" hisse hon. Chhote internal tools ke liye ye zaroori nahi.` },

    { type: 'h2', text: 'Rung 6: graceful degradation ("panic mode")' },
    { type: 'callout', tone: 'term', title: 'Graceful degradation', html: `<strong>Ye kya hai:</strong> mushkil mein app ka halka version chalana. Request lo, lekin sasta jawab do. Jaise bijli kam ho to sirf zaroori lights jalana.<br><strong>Kyun chahiye:</strong> ek personalised homepage banane mein 5 services lagti hain; ek common cached page mein almost kuch nahi. Wahi machines 3-5 guna zyada users sambhal leti hain.<br><strong>Iske bina:</strong> ya to sab features chalao aur site giro, ya requests mana karo. Beech ka raasta nahi.` },
    { type: 'p', html: `Shedding request <em>chhodta</em> hai. Degradation request ko <em>sasta</em> bana deta hai. Personalised homepage (har user ke liye recommendation service, history, ML model) ki jagah sabke liye ek hi cached homepage. Live score har second ki jagah har 5 second. Comments section band, video chalu. <a href="#/resilience">Resilience</a> lesson mein fallbacks dekhe the; spike mein yahi fallbacks jaan-boojh ke, pehle se on kiye jaate hain.` },
    { type: 'p', html: `Hotstar ke talk ke summary ke mutabik, jab system tootne ke kareeb hota tha to wo recommendations aur personalisation jaise features band kar dete the, taaki video streaming aur payment/subscription jaise core hisse chalte rahein. Ye switch (feature flags / kill switches) pehle se banaye aur test kiye jaate hain, match ke beech mein code nahi likha jaata.` },
    { type: 'callout', tone: 'mistake', title: 'Shedding vs degradation vs rate limiting', html: `Teeno mein confusion hota hai. <strong>Rate limiting</strong>: "tum (ek client) apni hadd se upar ho". <strong>Load shedding</strong>: "main (server) bhara hua hoon, ye request abhi nahi". <strong>Degradation</strong>: "request lunga, lekin sasta, halka jawab dunga". Teeno saath chalte hain.` },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 6)', html: `Degradation ke switches (feature flags) tab banao jab tumhare paas sach mein mehenge "extra" features hon (recommendations, personalisation, live counters) aur core feature (video) alag ho. Har switch ko pehle se test karo; match ke beech pehli baar on karna khatarnaak hai.` },

    { type: 'h2', text: 'Spike simulator: Rung 1-6 ek saath' },
    { type: 'p', html: `60 minute, ek minute ek step. Normal ~1 lakh rps, minute 15 se chadhaav, minute 20-45 ~5 lakh, aur minute 30-35 (jeet + push notification) ~9 lakh. Fleet normal mein 1.5 lakh rps ki hai. Defences on/off karo aur dekho: kitne serve hue, kitne gire, critical requests (video, login) ka kya hua, latency, aur kharcha.` },
    { type: 'custom', render(el) {
      const SIM = (o) => {
        const T = 60, CAP0 = 150, PRE = 750, QC = 200, TO = 3000;
        let seed = 42; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const base = t => t < 15 ? 100 : t < 20 ? 100 + (t - 14) * 70 : t < 30 ? 500 : t < 35 ? 900 : t < 45 ? 500 : t < 50 ? 200 : 120;
        const D = []; for (let t = 0; t < T; t++) D.push(Math.round(base(t) * (1 + 0.08 * (rnd() - 0.5))));
        const want = []; let retry = 0, backlog = 0;
        const out = { dem: [], cap: [], srv: [], drop: [] };
        let tot = 0, served = 0, dropped = 0, critTot = 0, critDrop = 0, worst = 0, maxDelay = 0, cost = 0;
        for (let t = 0; t < T; t++) {
          const dem = D[t] + retry;
          let cap = o.pre && t >= 5 && t < 50 ? PRE : CAP0;
          if (o.auto) { const k = t - o.lag; if (k >= 0) { let m = 0; for (let j = Math.max(0, k - 10); j <= k; j++) m = Math.max(m, want[j] || 0); cap = Math.max(cap, m); } }
          let crit = dem * 0.5, asy = dem * 0.3, low = dem * 0.2;
          if (o.queue) { backlog = Math.max(0, backlog + (asy - QC) * 60); maxDelay = Math.max(maxDelay, backlog / (QC * 60)); served += asy * 60; asy = 0; }
          const syncLoad = crit + asy + low, over = syncLoad > cap, deg = o.degrade && over;
          const cC = deg ? 0.85 : 1, cA = deg ? 0.85 : 1, cL = deg ? 0.2 : 1;
          const work = crit * cC + asy * cA + low * cL;
          let sC = crit, sA = asy, sL = low, lat;
          if (work <= cap) { const u = work / cap; lat = 100 + 20 * u / (1 - Math.min(u, 0.95)); }
          else if (o.shed) {
            let b = cap * 0.9;
            sC = Math.min(crit, b / cC); b -= sC * cC; sA = Math.min(asy, b / cA); b -= sA * cA; sL = Math.min(low, b / cL);
            lat = 100 + 20 * 0.9 / 0.1;
          } else { const e = Math.max(0.35, 1 - 0.5 * (work / cap - 1)), f = cap * e / work; sC = crit * f; sA = asy * f; sL = low * f; lat = TO; }
          const s = sC + sA + sL, d = syncLoad - s;
          retry = d * (o.shed ? 0.1 : 0.5);
          want[t] = Math.ceil(syncLoad / 0.7);
          tot += dem * 60; served += s * 60; dropped += d * 60; critTot += crit * 60; critDrop += (crit - sC) * 60;
          worst = Math.max(worst, lat); cost += cap;
          out.dem.push(dem); out.cap.push(cap); out.srv.push(s + (o.queue ? dem * 0.3 : 0)); out.drop.push(d);
        }
        return { out, tot, served, dropped, critPct: critDrop / critTot * 100, worst, maxDelay, cost, servedPct: served / tot * 100 };
      };
      const DEF = [['pre', 'Pre-scale (7.5 lakh)'], ['auto', 'Autoscale'], ['queue', 'Queue (async 30%)'], ['shed', 'Shed by priority'], ['degrade', 'Degrade features']];
      const PRESETS = [['Kuch nahi', {}], ['Sirf autoscale', { auto: 1 }], ['Sirf pre-scale', { pre: 1 }], ['Autoscale + shed', { auto: 1, shed: 1 }], ['Sab on', { pre: 1, auto: 1, queue: 1, shed: 1, degrade: 1 }]];
      const o = { lag: 5 };
      el.innerHTML = `<div style="font-size:13px;color:var(--ink-3)">Presets:</div><div class="psPre" style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px"></div>
        <div style="font-size:13px;color:var(--ink-3)">Defences (click karke on/off):</div><div class="psDef" style="display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px"></div>
        <div><label>Autoscaling lag: <strong class="psLagV"></strong></label><input class="psLag" type="range" min="1" max="10" step="1" value="5"></div>
        <svg class="psChart" viewBox="0 0 600 230" style="width:100%;height:auto;display:block;margin-top:10px" role="img" aria-label="Traffic, capacity, served and dropped over 60 minutes"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--ink-3)"><span style="color:var(--ink-2)">┄ demand</span><span style="color:var(--accent)">━ capacity</span><span style="color:var(--green)">━ served</span><span style="color:var(--red)">█ dropped</span></div>
        <div class="stats">
          <div class="stat"><span>Served</span><strong class="psS"></strong></div>
          <div class="stat"><span>Dropped (crore req)</span><strong class="psD"></strong></div>
          <div class="stat"><span>Critical fail (video/login)</span><strong class="psC"></strong></div>
          <div class="stat"><span>Worst p99 latency</span><strong class="psL"></strong></div>
          <div class="stat"><span>Async kaam ka max delay</span><strong class="psQ"></strong></div>
          <div class="stat"><span>Kharcha (server-minutes)</span><strong class="psK"></strong></div>
        </div>
        <div class="calc-note psNote"></div>`;
      const $ = c => el.querySelector(c);
      const chips = (box, items, isOn, click) => { box.innerHTML = ''; items.forEach(([k, label]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (isOn(k) ? ' on' : ''); b.textContent = label; b.onclick = () => click(k); box.appendChild(b); }); };
      const upd = () => {
        chips($('.psPre'), PRESETS.map((p, i) => [i, p[0]]), () => false, i => { DEF.forEach(([k]) => o[k] = PRESETS[i][1][k] ? 1 : 0); upd(); });
        chips($('.psDef'), DEF, k => o[k], k => { o[k] = o[k] ? 0 : 1; upd(); });
        o.lag = +$('.psLag').value; $('.psLagV').textContent = o.lag + ' minute';
        const r = SIM(o), O = r.out, top = 1800;
        const X = i => 40 + i * (550 / 59), Y = v => 200 - Math.min(v, top) / top * 185;
        const line = (a, col, dash, w) => `<polyline points="${a.map((v, i) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? 'stroke-dasharray="4 4"' : ''}/>`;
        const bars = O.drop.map((d, i) => d > 0.5 ? `<rect x="${(X(i) - 4).toFixed(1)}" y="${Y(d).toFixed(1)}" width="8" height="${(200 - Y(d)).toFixed(1)}" fill="var(--red)" opacity=".55"/>` : '').join('');
        const grid = [0, 300, 600, 900, 1200, 1500, 1800].map(v => `<line x1="40" x2="590" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="34" y="${Y(v) + 4}" text-anchor="end" font-size="10" fill="var(--ink-3)" font-family="var(--f-mono)">${v / 100}L</text>`).join('');
        $('.psChart').innerHTML = grid + bars + line(O.dem, 'var(--ink-2)', 1, 1.5) + line(O.cap, 'var(--accent)', 0, 2.5) + line(O.srv, 'var(--green)', 0, 2) +
          `<text x="315" y="224" text-anchor="middle" font-size="11" fill="var(--ink-3)" font-family="var(--f-mono)">minute 0 → 60 (rps, L = lakh)</text>`;
        $('.psS').textContent = r.servedPct.toFixed(1) + '%';
        $('.psD').textContent = (r.dropped * 1000 / 1e7).toFixed(1);
        $('.psC').textContent = r.critPct.toFixed(1) + '%';
        $('.psL').textContent = r.worst >= 3000 ? 'timeouts (3 s+)' : Math.round(r.worst) + ' ms';
        $('.psQ').textContent = o.queue ? r.maxDelay.toFixed(1) + ' min' : '-';
        $('.psK').textContent = r.cost.toLocaleString('en-IN');
        const peak = Math.max(...O.dem);
        let n = `Peak demand (retries mila ke) ~${(peak / 100).toFixed(1)} lakh rps. `;
        if (!o.pre && !o.auto) n += 'Capacity 1.5 lakh pe atki rahi. Bina shedding ke server sab andar leta hai, timeouts, phir retries: demand khud badh gayi (retry storm). ';
        if (o.auto && !o.pre) n += `Autoscaling ${o.lag} minute peeche chal raha hai: har uchhaal ke pehle ${o.lag} minute purani capacity pe gire. `;
        if (o.pre && !o.auto && !o.degrade) n += 'Pre-scale 7.5 lakh ka tha, peak ~9 lakh: forecast se upar wala hissa phir bhi gira. ';
        if (o.shed) n += r.dropped > 0 ? 'Shedding ne critical requests bachaayi aur latency kaabu mein rakhi, lekin capacity paida nahi ki. ' : 'Shedding ki zaroorat hi nahi padi: baaki defences ne load capacity ke andar rakha. ';
        if (o.queue) n += `Queue ne 30% async kaam ko sync raaste se hataya; keemat: ${r.maxDelay.toFixed(1)} minute tak ka delay. `;
        n += 'Model simple hai (1 server = 1,000 rps, scale-in 10 minute baad), numbers asli nahi, shape asli hai.';
        $('.psNote').textContent = n;
      };
      $('.psLag').addEventListener('input', upd); upd();
    }},

    { type: 'callout', tone: 'tip', title: 'Simulator se kya seekha', html: `
      • <strong>Kuch nahi:</strong> sirf ~13.5% requests serve. Timeouts ke baad retries ne peak demand ~9.4 lakh se <strong>~17.6 lakh</strong> kar di: failure ne load double kar diya.<br>
      • <strong>Sirf autoscale (5 min lag):</strong> ~83% served, lekin har uchhaal pe 5 minute tak gire, critical bhi (~17% fail). Lag 2 minute karo: ~95%.<br>
      • <strong>Sirf pre-scale:</strong> ~88.5%. Forecast 7.5 lakh tha, asli peak ~9 lakh: upar wala hissa gira.<br>
      • <strong>Autoscale + shed:</strong> total served ~87% hi, lekin critical fail ~17% se ghat ke <strong>~2.4%</strong>, aur latency timeouts se ~280 ms. Shedding quantity nahi, <em>quality</em> bachaata hai.<br>
      • <strong>Sab on:</strong> 100% served (async wala ~1.7 minute der se), ~238 ms. Kharcha ~42,000 server-minutes vs 9,000. Pre-scale hata ke dekho: ~97% served, ~28,800 server-minutes. Yahi asli faisla hai: kitna paisa, kitne % users ke liye.` },

    { type: 'h2', text: 'Rung 7: hot keys (jab bheed ek hi key pe ho)' },
    { type: 'callout', tone: 'term', title: 'Hot key', html: `<strong>Ye kya hai:</strong> cache ya database ki ek akeli key (jaise <code>score:final</code>) jis pe baaki sab keys se kai guna zyada traffic aata hai.<br><strong>Kyun dikkat:</strong> sharding keys ko machines mein baant-ti hai, lekin ek key hamesha ek hi machine (shard) pe rehti hai. Us key ka saara traffic us ek machine pe. 10 machines ho ya 100, farak nahi.<br><strong>Iske bina (bina ilaaj):</strong> ek shard 100% pe, uske baaki keys bhi slow, aur cluster \"aadha\" gira hua.` },
    { type: 'p', html: `Baaki saare defences "zyada machines" ya "kam kaam" ke baare mein the. Hot key alag bimaari hai: <a href="#/caching-strategies">caching strategies</a> lesson mein dekha tha ki sharding keys ko baant-ti hai, ek key ke traffic ko nahi. Final ke time <code>score:final</code> pe 9 lakh reads/sec, aur wo ek shard pe hai jo maan lo ~1 lakh ops/sec jhel sakta hai. Do tarah ki hot key hoti hai, aur ilaaj alag:` },
    { type: 'table', head: ['', 'Read-hot key', 'Write-hot key'], rows: [
      ['Example', 'Live score, viral post, trending list', 'Viral video ka view/like counter, flash sale ka stock'],
      ['Ilaaj 1', 'Local (in-process) cache, 1-5 s TTL', 'Memory mein jodo, har second ek baar likho (batching)'],
      ['Ilaaj 2', 'N copies: key#1..key#N alag shards pe, reader random copy padhe', 'N sub-counters: key#1..key#N, writer random mein +1, reader sabka sum'],
      ['Keemat', 'Thoda stale data; update pe N copies likhni', 'Read mehenga (N keys padhni), exact count thoda der se'],
    ]},
    { type: 'p', html: `Numbers khud ghuma ke dekho. Shard ki capacity ~1 lakh ops/sec maani hai (simple GET/SET ke liye ek Redis node ka aam andaaza):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Hot key pe reads/sec: <strong class="hkRv"></strong></label><input class="hkR" type="range" min="10000" max="2000000" step="10000" value="900000"></div>
          <div><label>Copies (key#1..#N): <strong class="hkNv"></strong></label><input class="hkN" type="range" min="1" max="32" step="1" value="1"></div>
          <div><label>App servers: <strong class="hkSv"></strong></label><input class="hkS" type="range" min="10" max="2000" step="10" value="500"></div>
          <div><label>Local cache TTL: <strong class="hkTv"></strong></label><input class="hkT" type="range" min="0" max="5" step="1" value="0"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Redis tak pahunchte reads/sec</span><strong class="hkA"></strong></div>
          <div class="stat"><span>Sabse garam shard</span><strong class="hkB"></strong></div>
          <div class="stat"><span>Data kitna purana ho sakta</span><strong class="hkC"></strong></div>
        </div>
        <div class="calc-note hkNote"></div>`;
      const $ = c => el.querySelector(c), CAP = 100000;
      const fmt = n => Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const R = +$('.hkR').value, N = +$('.hkN').value, S = +$('.hkS').value, T = +$('.hkT').value;
        $('.hkRv').textContent = fmt(R); $('.hkNv').textContent = N; $('.hkSv').textContent = fmt(S); $('.hkTv').textContent = T ? T + ' s' : 'off';
        const reach = T ? Math.min(R, S / T) : R, per = reach / N, pct = per / CAP * 100;
        $('.hkA').textContent = fmt(reach);
        $('.hkB').textContent = fmt(per) + '/s (' + Math.round(pct) + '%)';
        $('.hkC').textContent = T ? '≤ ' + T + ' s' : '~0';
        $('.hkNote').textContent = pct > 100
          ? `Shard ki capacity ka ${Math.round(pct)}%: timeouts. ${T ? '' : 'Local cache on karo: har server har ' + '1 s mein sirf ek baar Redis jaayega. '}${N < Math.ceil(reach / CAP / 0.8) ? 'Ya copies kam se kam ' + Math.ceil(reach / CAP / 0.8) + ' karo (har shard ~80% tak).' : ''}`
          : pct > 80 ? `${Math.round(pct)}%: chal raha hai par kinare pe. Thoda aur traffic aur gaya.`
          : `${Math.round(pct)}%: aaraam se.${T ? ' Local cache ki wajah se Redis tak sirf ' + fmt(reach) + ' reads/sec (servers ÷ TTL), chahe users ' + fmt(R) + ' reads/sec karein. Keemat: score ' + T + ' second tak purana.' : ''}`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'warn', title: 'Hot key pehle se pehchano', html: `Hot key ka pata aksar tab chalta hai jab wo jal rahi hoti hai. Isliye: (1) known events ke liye pehle se split/local-cache karo (score, sale ka product), (2) per-key traffic monitor karo (Redis mein <code>--hotkeys</code> option LFU policy ke saath, ya client-side sampling; <a href="#/ds-for-scale">count-min sketch</a> jaisa sketch bhi top keys nikaal sakta hai), aur (3) system ko itna flexible banao ki kisi key ko runtime pe "hot" mark karke split kar sako.` },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 7)', html: `Sabse pehle local cache (1-5 s TTL): sasta aur zyada tar read-hot keys ke liye kaafi. Key ki copies ya sub-counters tab jab local cache ke baad bhi ek shard garam ho, ya key write-hot ho. Agar data public aur sabke liye same hai (score), to CDN pe 1-2 s TTL se bhi bheed bahar hi ruk jaati hai.` },

    { type: 'h2', text: 'Saare rungs ek flow mein' },
    { type: 'p', html: `Ab sab ek saath chala ke dekho: pehle bina defence, phir defences ke saath, phir hot key. Har box pe click karke uska kaam padho.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'users', label: 'Viewers', sub: 'final dekh rahe', x: 80, y: 170, w: 130, kind: 'client', info: 'Ye kya hai: final dekhne wale crore log, ek hi time pe. App mein retry ke saath exponential backoff + jitter hona chahiye, warna har failure ek nayi lehar banata hai.' },
        { id: 'gw', label: 'API gateway', sub: 'rate limit + shed', x: 255, y: 170, w: 150, kind: 'edge', meter: true, load: 20, info: 'Ye kya hai: sabse aage ka darwaza jahan har request pehle aati hai. Pehli line of defence. Per-user rate limit (429), aur system ke bojh ke hisaab se priority wala load shedding (503 + Retry-After). Yahan reject karna sasta hai: request andar ke services tak pahunchti hi nahi.' },
        { id: 'app', label: 'App servers', sub: 'autoscaled', x: 440, y: 170, w: 140, kind: 'server', meter: true, load: 25, info: 'Ye kya hai: hamare app servers ka jhund (stateless: koi user data apne paas nahi rakhte, isliye kitne bhi jodo). Match se pehle pre-scale, beech mein autoscale. Feature flags se "panic mode": recommendations band, static homepage.' },
        { id: 'q', label: 'Queue', sub: 'likes, history', x: 625, y: 60, w: 130, kind: 'queue', info: 'Ye kya hai: shock absorber line. Async kaam (likes, watch history, analytics) yahan. Workers fixed speed pe DB mein likhte hain. Peak pe backlog banta hai, baad mein khaali.' },
        { id: 'redis', label: 'Redis', sub: 'score, sessions', x: 625, y: 170, w: 130, kind: 'cache', meter: true, load: 20, info: 'Ye kya hai: tez in-memory cache. Live score aur sessions yahan. Ek key (score:final) pe sabki nazar: hot key ka khatra.' },
        { id: 'db', label: 'Database', sub: 'source of truth', x: 625, y: 280, w: 130, kind: 'data', meter: true, load: 20, info: 'Ye kya hai: asli data ka ghar (source of truth). Sabse mushkil se scale hone wala hissa. Minutes mein 10x nahi hota. Baaki saare defences asal mein isi ko bachaate hain.' },
      ],
      edges: [{ a: 'users', b: 'gw' }, { a: 'gw', b: 'app' }, { a: 'app', b: 'q' }, { a: 'app', b: 'redis' }, { a: 'app', b: 'db' }],
      scenarios: [
        { name: 'Normal shaam', steps: [
          { title: 'Request', text: 'Video play aur score ki requests. Sab capacity ke andar.', go: 'users>gw>app>redis', msg: 'GET /live/final/score' },
          { title: 'Jawab', text: '~120 ms. Meters thande.', go: 'res:redis>app>gw>users' },
        ]},
        { name: 'Spike, bina defence', intro: 'Jeet ka run, aur app ne sabko push notification bheja. Koi defence nahi.', steps: [
          { title: 'Jeet ka run + push notification', text: 'Lakhon log ek saath app kholte hain.', flood: { paths: ['users>gw>app>db', 'users>gw>app>redis'], n: 18 }, after: { app: { state: 'hot', load: 100, sub: 'CPU 100%' }, db: { state: 'hot', load: 98, sub: 'connections full' } } },
          { title: 'Timeouts', text: 'Requests queue mein sadti hain, 2-3 second baad timeout. Server phir bhi un pe kaam kar raha hai: congestion collapse.', go: 'lost:app>db', after: { gw: { state: 'warn', load: 90, sub: 'timeouts' } } },
          { title: 'Retry storm', text: 'Har app 3 baar retry karti hai. Load aur badha, critical (video play) bhi utna hi gira jitna analytics.', flood: { paths: ['users>gw>app'], n: 18 }, after: { app: { state: 'down', sub: 'unhealthy' } } },
        ]},
        { name: 'Spike, defences ke saath', intro: 'Same spike. Pre-scaled fleet, shedding, degradation, queue.', steps: [
          { title: 'Pre-scaled fleet', text: 'Match se 30 minute pehle hi 5x machines chalu aur warm.', set: { app: { sub: 'pre-scaled 5x', load: 55 } }, flood: { paths: ['users>gw>app'], n: 12 } },
          { title: 'Gateway: low priority shed', text: 'Recommendations aur prefetch requests ko turant 503 + Retry-After. Ek microsecond ka kaam, andar tak nahi gayi.', go: ['users>gw', 'bad:gw>users'], after: { gw: { state: 'warn', load: 85, sub: 'shed: low priority' } }, msg: '503 Service Unavailable\nRetry-After: 30' },
          { title: 'Panic mode: halka homepage', text: 'Feature flag: personalised rows band, sabko ek cached homepage. Har request ka kaam ~kam.', focus: ['app'], set: { app: { state: 'warn', sub: 'degraded mode', load: 75 } } },
          { title: 'Likes queue mein', text: 'Like ka jawab turant 202, DB mein likhna workers karenge, ~1-2 minute baad.', go: ['users>gw>app>q', 'res:app>gw>users'], after: { q: { sub: 'backlog 12 lakh' } }, msg: 'POST /like  →  202 Accepted' },
          { title: 'Critical chalu', text: 'Video play ~250 ms mein. DB pe sirf zaroori writes.', go: ['users>gw>app>redis', 'res:redis>app>gw>users'], after: { db: { load: 60, state: 'ok', sub: 'safe' } } },
        ]},
        { name: 'Hot key: score', intro: 'Sab ek hi key padh rahe hain: score:final.', steps: [
          { title: 'Ek key, ek shard', text: 'Redis Cluster mein ek key ek hi shard pe. 9 lakh reads/sec us ek node pe. Shards badhane se kuch nahi hoga.', flood: { paths: ['users>gw>app>redis'], n: 16 }, after: { redis: { state: 'hot', load: 100, sub: 'ek shard 100%' } } },
          { title: 'Fix 1: local cache', text: 'Har app server score ko apni memory mein 1 second rakhta hai. 500 servers × 1 refresh/sec = sirf ~500 reads/sec Redis pe.', set: { app: { state: 'ok', sub: 'local cache 1s' } }, go: ['app>redis', 'res:redis>app'], after: { redis: { state: 'ok', load: 20, sub: '~500 reads/s' } } },
          { title: 'Fix 2: key split', text: 'Agar local cache kaafi nahi (jaise bahut saare alag hot keys), to key ki N copies: score:final#1 ... #8, alag shards pe. Har reader random copy padhta hai.', focus: ['redis'], msg: 'GET score:final#(random 1..8)' },
        ]},
      ],
    },

    { type: 'callout', tone: 'tip', title: 'Decide', html: `Spike aane wala hai to socho: <strong>pata tha?</strong> Known event (match, sale, New Year) → forecast, load test, <strong>pre-scale</strong> (servers + cache + DB + quotas). Unknown spike → <strong>autoscaling</strong> (lag chhota karo), aur jab tak capacity aaye tab tak <strong>load shedding by priority</strong> aur <strong>graceful degradation</strong>. Jo kaam baad mein ho sakta hai → <strong>queue</strong> (load levelling). Har client ko hadd mein → <strong>rate limiting</strong> + client backoff. Aur bheed ek key pe → <strong>hot key ko split/replicate</strong> karo + local cache. Ek defence kaafi nahi; layers mein lagao.` },
    { type: 'table', head: ['Situation', 'Pehla hathiyaar', 'Saath mein'], rows: [
      ['Cricket final / sale (date pata hai)', 'Pre-scaling + load test', 'Shedding + degradation as safety net'],
      ['Video viral (achanak)', 'Autoscaling', 'Shedding + degradation jab tak machines aayein'],
      ['Likes / views / analytics ki baadh', 'Queue + batching', 'Write-hot key ke liye sub-counters'],
      ['Bots ya ek client hammer kar raha', 'Rate limiting', 'WAF (web application firewall: bure traffic ko pehchaan ke rokne wala filter) / bot detection'],
      ['Sab ek hi cheez padh rahe (score)', 'Local cache + key copies', 'CDN pe short TTL'],
    ]},

    { type: 'h2', text: 'Poora design, ek nazar mein' },
    { type: 'p', html: `xyz.com final ke din, har rung apni jagah pe. Box pe click karo, aur buttons se ek ek raasta dekho.` },
    { type: 'diagram', title: 'Traffic spikes aur hot keys: poori picture', height: 650,
      nodes: [
        { id: 'users', label: 'Viewers', sub: 'crore phones', x: 90, y: 70, kind: 'client', info: 'Ye kya hai: final dekhne wale log. App mein retries ke saath backoff + jitter, taaki failure pe lehar na bane (Rung 4).' },
        { id: 'cdn', label: 'CDN', sub: 'home + score, 1 s', x: 330, y: 70, kind: 'edge', info: 'Ye kya hai: duniya bhar mein faile cache servers. Degraded homepage aur live score yahan 1-2 second TTL ke saath, taaki crore reads hamare servers tak aayein hi nahi (Rung 6, 7).' },
        { id: 'scaler', label: 'Scaler', sub: 'pre-scale + auto', x: 570, y: 70, kind: 'server', info: 'Ye kya hai: capacity ka manager. Match se pehle forecast pe pre-scale (Rung 1), beech mein request rate / queue length dekh ke autoscale (Rung 2). Scale-in dheere.' },
        { id: 'gw', label: 'API gateway', sub: 'limit + shed', x: 90, y: 250, kind: 'edge', info: 'Ye kya hai: har API request ka pehla darwaza. Per-user rate limit (429, Rung 4) aur priority wala load shedding (503 + Retry-After, Rung 5). Yahan mana karna sasta hai.' },
        { id: 'app', label: 'App servers', sub: 'local cache 1 s', x: 330, y: 250, kind: 'server', info: 'Ye kya hai: stateless app fleet. Pre-scaled + autoscaled. Har server hot keys ko 1 second apni memory mein rakhta hai (Rung 7).' },
        { id: 'flags', label: 'Feature flags', sub: 'panic mode', x: 570, y: 250, kind: 'server', info: 'Ye kya hai: on/off switches ki service. Overload pe recommendations, personalisation band: halka homepage (Rung 6). Pehle se test kiye hue.' },
        { id: 'q', label: 'Queue', sub: 'likes, history', x: 90, y: 430, kind: 'queue', info: 'Ye kya hai: shock absorber (Rung 3). Likes, watch history, analytics yahan. User ko turant 202, backlog peak ke baad khaali.' },
        { id: 'redis', label: 'Redis', sub: 'score#1..#8', x: 330, y: 430, kind: 'cache', info: 'Ye kya hai: in-memory cache cluster. Hot key score:final ki 8 copies alag shards pe; like counter ke sub-counters (Rung 7).' },
        { id: 'db', label: 'Database', sub: 'source of truth', x: 570, y: 430, kind: 'data', info: 'Ye kya hai: asli data ka ghar. Sabse dheere scale hota hai. Upar ke saare rungs isi ko bachaate hain: sirf critical reads/writes aur workers ki barabar speed.' },
        { id: 'workers', label: 'Workers', sub: 'fixed speed', x: 90, y: 590, kind: 'server', info: 'Ye kya hai: queue se kaam uthane wali machines. DB ki safe speed pe likhte hain (jaise 50,000/s), chahe bahar kitni bhi bheed ho.' },
      ],
      edges: [
        { a: 'users', b: 'cdn', n: 1, label: 'reads' },
        { a: 'users', b: 'gw', n: 2, label: 'API calls' },
        { a: 'gw', b: 'app', n: 3 },
        { a: 'cdn', b: 'app', label: 'miss' },
        { a: 'scaler', b: 'app', dashed: true, label: '+ machines' },
        { a: 'flags', b: 'app', dashed: true, label: 'panic mode' },
        { a: 'app', b: 'q', label: '202 + msg' },
        { a: 'app', b: 'redis', label: 'cache miss' },
        { a: 'app', b: 'db', label: 'critical' },
        { a: 'q', b: 'workers' },
        { a: 'workers', b: 'db', label: 'steady writes' },
      ],
      paths: [
        { name: 'Scale', text: 'Match se pehle scaler ne fleet 5x ki, beech mein autoscale. Bheed badhi to flags se panic mode: halka homepage.', go: ['scaler>app', 'flags>app'] },
        { name: 'Shed / limit', text: 'Bot ko 429, aur overload pe low-priority request (recommendations) ko gateway pe hi 503 + Retry-After.', go: ['users>gw', 'bad:gw>users'] },
        { name: 'Like (queue)', text: 'Like ko turant 202. Message queue mein, workers barabar speed pe DB mein likhte hain.', go: ['users>gw>app>q', 'res:app>gw>users', 'q>workers>db'] },
        { name: 'Score (hot key)', text: 'Score CDN se (1 s TTL). Miss hua to app ka local cache, phir Redis ki 8 copies mein se koi ek.', go: ['users>cdn>app>redis', 'res:redis>app>cdn>users'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Pehle poochho: spike pata tha (match, sale) ya achanak (viral)? Pata tha → pre-scale poore raaste ka (servers, cache, DB, quotas) + load test.</li>
      <li>Autoscaling reactive hai: lag minutes ka. Lag chhota karo (warm pool, request-rate metric), lekin akele pe bharosa mat karo.</li>
      <li>Queue = shock absorber: background kaam barabar speed pe, keemat = delay. Spike kha sakti hai, lagataar overload nahi.</li>
      <li>Rate limiting har client ko hadd mein rakhta hai aur retry storm rokta hai. Asli users ki bheed nahi rokta.</li>
      <li>Load shedding by priority: congestion collapse se bachaata hai, critical requests bachaata hai. Capacity paida nahi karta.</li>
      <li>Graceful degradation: request lo, halka jawab do (panic mode, feature flags pehle se test).</li>
      <li>Hot key: sharding madad nahi karti. Local cache → key copies (reads) / sub-counters + batching (writes) → CDN.</li>
      <li>Ek defence kaafi nahi: layers mein lagao, aur cost vs kitne users ka faisla soch ke lo.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Spike mein bhi critical features (video, login, payment) chalte hain', 'Latency kaabu mein: sab ke liye slow ki jagah kuch ke liye "abhi nahi"', 'Retry storm aur congestion collapse se bachaav', 'Async kaam kabhi khota nahi, bas der se hota hai', 'Hot key ek shard ko nahi jalaati'],
      costs: ['Pre-scaling = ghanton tak khaali machines ka bill; forecast galat ho sakta hai', 'Autoscaling ka lag; stateful parts (DB) phir bhi dheere scale', 'Shedding aur degradation = kuch users ko kharab experience, aur feature flags banane/test karne ka kaam', 'Queue = delay aur eventual consistency (like count thodi der purana)', 'Key split aur local cache = stale data aur zyada complex reads/writes'] },

    { type: 'think', questions: [
      { q: 'Simulator mein "Sab on" 100% serve karta hai, lekin ~42,000 server-minutes leta hai; pre-scale hata ke ~97% aur ~28,800. Tum xyz.com ke CTO ho. Kaunsa chunoge?', a: 'Depend karta hai ki gira hua 3% kaun hai aur unka nuksaan kitna. Shedding on hai, to gira hua hissa zyada tar low-priority hai aur critical fail ~2%. Final match (saal ka sabse bada din, ad revenue, brand) ke liye pre-scale ka paisa sasta hai. Ek normal league match ke liye autoscale + shed + degrade kaafi ho sakta hai. Interview mein yahi reasoning dikhani hai: cost vs kitne users, kaunse features.' },
      { q: 'Sale 12:00 baje shuru. Tumne app servers 10x kar diye. 12:00:05 pe site phir bhi gir gayi. Kya miss hua hoga?', a: 'Shayad app ke peeche wali cheezein: database (connections 10x ho gaye, max_connections ya CPU khatam), cache cold tha (sab misses DB pe), ek hot key (sale wala product), ya cloud quota / load balancer ka warm-up. Pre-scaling poore raaste ka hota hai, sirf stateless servers ka nahi. Isliye load test asli raaste pe karte hain.' },
      { q: 'Load shedding 503 deta hai. Agar client turant retry kare to kya hoga, aur kya karna chahiye?', a: 'Retry turant aaya to shedding ka faayda khatam: load wahi ka wahi, bas 503 ka kaam badha. Server Retry-After bheje, aur client exponential backoff + jitter kare (aur retries ki total hadd/budget rakhe). Low-priority requests (prefetch, analytics) ko retry hi mat karo.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Autoscaling akela cricket final ke tsunami traffic ke liye kyun kaafi nahi?', options: ['Autoscaling cloud mein kaam nahi karta', 'Metric → decision → boot → warm-up ka lag minutes ka hai; tab tak spike purani capacity pe girta hai', 'Autoscaling sirf databases ke liye hai'], answer: 1, explain: 'Autoscaling reactive hai. Hotstar ke talk mein bhi boot time, capacity ki kami aur retries ko wajah bataya gaya. Known events ke liye pre-scale.' },
      { q: 'Overload mein load shedding ka sabse bada faayda?', options: ['Zyada requests serve hoti hain jitni capacity hai usse bhi zyada', 'Jo requests andar aati hain wo time pe poori hoti hain, aur critical ko priority milti hai; congestion collapse nahi hota', 'Rate limiting ki zaroorat khatam'], answer: 1, explain: 'Shedding capacity nahi badhata. Wo bekaar kaam (timeout ho chuki requests pe) rokta hai aur zaroori requests bachaata hai. Simulator mein critical fail ~17% → ~2.4%.' },
      { q: 'Viral video ka like counter ek row/key pe 2 lakh writes/sec le raha hai. Best fix?', options: ['Key ki read replicas', 'N sub-counters (likes#1..#N) mein random +1, padhte waqt sum; ya memory mein jod ke har second ek write', 'Like button hata do'], answer: 1, explain: 'Write-hot key ke liye writes ko baanto ya batch karo. Read replicas sirf reads mein madad karti hain.' },
      { q: 'Live score pe 9 lakh reads/sec, 500 app servers, har server pe 1 second ka local cache. Redis tak lagbhag kitne reads/sec?', options: ['9 lakh', '~500', '~9,000'], answer: 1, explain: 'Har server har second ek baar Redis jaata hai: 500 servers ÷ 1 s = ~500 reads/sec. Keemat: score max 1 second purana.' },
      { q: 'Inmein se kaun "graceful degradation" hai?', options: ['Overload mein personalised homepage ki jagah sabko ek cached homepage', 'Ek user ko 100 req/min ke baad 429', 'Like ko queue mein daal ke 202'], answer: 0, explain: 'Degradation request leta hai lekin sasta jawab deta hai. 429 rate limiting hai, 202 + queue load levelling.' },
    ]},
    { type: 'sources', note: 'Hotstar ke details ek conference talk (2019) ke summaries se hain; kuch saal purane hain, aaj ka setup alag ho sakta hai.', items: [
      { title: 'How Hotstar.com dealt with 25 million concurrent viewers (re:Invent 2019, CMY302) — session report', publisher: 'Classmethod DevelopersIO (summary of a talk by Hotstar engineers)', year: 2019, url: 'https://dev.classmethod.jp/articles/reinvent-2019-cmy302/', used: '25.3M concurrent viewers, why ASG autoscaling failed (capacity errors, ~1 min boot, 1M+/min growth, retries), pre-warming and concurrency-based custom scaling, Project HULK load tests, turning off recommendations/personalisation under stress.' },
      { title: 'Scaling hotstar.com for 25 million concurrent viewers', publisher: 'Rootconf 2019 (HasGeek), talk by Hotstar engineer', year: 2019, url: 'https://hasgeek.com/rootconf/2019-hyderabad/sub/scaling-hotstar-com-for-25-million-concurrent-view-JAMnectbppSK5Dk8LGAuqy', used: 'Talk abstract: tsunami traffic, game days, load testing, autoscaling not working for this pattern.' },
      { title: 'Using load shedding to avoid overload', publisher: 'Amazon Builders\' Library', official: true, url: 'https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/', used: 'Why rejecting excess work keeps latency predictable; wasted work on timed-out requests.' },
      { title: 'Scaling your API with rate limiters', publisher: 'Stripe blog', official: true, year: 2017, url: 'https://stripe.com/blog/rate-limiters', used: 'Rate limiters vs load shedders, critical vs non-critical traffic (also used in the rate limiting lesson).' },
      { title: 'Redis CLI (--hotkeys option)', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/tools/cli/', used: '--hotkeys samples keys and only works with an LFU maxmemory-policy.' },
      { title: 'Addressing Cascading Failures', publisher: 'Google SRE book', official: true, url: 'https://sre.google/sre-book/addressing-cascading-failures/', used: 'Overload, retries amplifying load, load shedding and graceful degradation concepts.' },
    ]},
  ],
});
