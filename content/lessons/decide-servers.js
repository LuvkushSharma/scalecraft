Lesson.register({
  id: 'decide-servers',
  title: 'Kitne servers chahiye?',
  minutes: 30,
  summary: `"Kitne servers?" ka jawab ek formula se aata hai: peak QPS ÷ ek server ki capacity × headroom, phir availability zones mein round up. Is lesson mein calculator chala ke dekho ki headroom, N+1 aur AZs kyun zaroori hain, aur asli sawaal kyun "kaunsa layer pehle tootega" hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Ek server ek second mein sirf kuch hazaar requests sambhaal sakta hai.<br>Agar users zyada aaye, to zyada servers chahiye. Lekin kitne?<br>Bahut kam liye to site busy time pe gir jaayegi. Bahut zyada liye to paisa barbaad.<br>Aur machines kabhi kabhi marti bhi hain, kabhi poora data center band ho jaata hai.<br>Is lesson mein ek chhota formula seekhenge jo bataata hai: kitne servers, kahan rakhein, aur kitne extra.` },
    { type: 'h2', text: 'Problem: launch se pehle, boss ka sawaal' },
    { type: 'p', html: `xyz.com ka naya feature agle hafte launch hai. Boss poochta hai: "kitne servers order karein?" Ek dost kehta hai "1 server kaafi hai, average traffic 400 req/s hi hai". Doosra kehta hai "safe rehne ke liye 100 le lo". Pehla launch ke din site gira dega, doosra har mahine lakhon rupaye jalaayega. Sahi jawab ek chhota formula hai jo <a href="#/scalability">horizontal scaling</a>, <a href="#/availability-spof">availability</a> aur napkin maths ko jodta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: QPS (queries per second)', html: `<strong>Ye kya hai:</strong> QPS ya req/s = ek second mein kitni requests aati hain.<br><strong>Kyun chahiye:</strong> server ki capacity bhi "itni requests per second" mein naapi jaati hai. Dono ek hi unit mein hon, tabhi bhaag (÷) kar sakte hain.<br><strong>Iske bina:</strong> "10 crore requests roz" se pata nahi chalta ki ek second mein kitna dabav hai.<br><strong>Trick:</strong> ek din ≈ 86,400 s, round karke <strong>10<sup>5</sup></strong>. To 10 crore requests/day ÷ 10<sup>5</sup> ≈ 1,000 req/s average.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Peak', html: `<strong>Ye kya hai:</strong> din ka sabse busy time, average nahi. Raat 9 baje traffic dopahar 3 baje se kai guna hota hai.<br><strong>Kyun chahiye:</strong> site peak pe girti hai, average pe nahi. Roadmap ka rule: peak ≈ average × 2 se × 5; live events (match, sale) mein ×10 ya zyada.<br><strong>Iske bina:</strong> average pe size kiya, to har raat 9 baje site slow ya band.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Headroom aur utilisation', html: `<strong>Ye kya hai:</strong> <strong>Utilisation</strong> = server kitna busy hai (60% = 60% capacity use ho rahi hai). <strong>Headroom</strong> = jaan-boojh ke rakhi gayi khaali capacity.<br><strong>Kyun chahiye:</strong> 100% ke paas server mein requests line lagati hain aur latency aasmaan chhooti hai. Koi bhi spike ya failure use gira deta hai. Roadmap: formula mein ×1.3 se ×2 headroom, yaani normal peak pe servers ~50-70% busy.<br><strong>Iske bina:</strong> pehla jhatka hi site gira dega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Region aur Availability Zone (AZ)', html: `<strong>Ye kya hai:</strong> <strong>Region</strong> = ek shehar ya area jahan cloud company ke data centers hain (jaise Mumbai, Singapore). <strong>AZ</strong> = region ke andar ek ya zyada alag data centers, jinki power, cooling aur network alag hain, lekin aapas mein tez network se jude.<br><strong>Kyun chahiye:</strong> ek AZ mein aag ya power cut ho to doosre AZ chalte rehte hain. Ek poora region gire to doosra region.<br><strong>Iske bina:</strong> saare servers ek building mein = ek power cut aur poori site band, chahe 1,000 servers hon.` },

    { type: 'h2', text: 'Roadmap ka formula' },
    { type: 'code', text: `
servers = peak QPS ÷ QPS per server × headroom (1.3 – 2)
        → round up so every availability zone has at least 2
Target utilisation: 50 – 70%, never 100%
(so one zone can fail and the others absorb its traffic)` },
    { type: 'table', head: ['Peak load', 'Rough fleet (~2k req/s per server)'], rows: [
      ['100 req/s', '2-3 servers (sirf redundancy ke liye)'],
      ['5,000 req/s', '≈ 4-5 servers'],
      ['50,000 req/s', '≈ 40-50 servers, aur caching zaroori ho jaati hai'],
      ['500,000 req/s', 'Sainkdon servers; zyada tar reads cache ya CDN se aane chahiye'],
    ], caption: 'Source: roadmap phase 5, "How many servers?"' },
    { type: 'callout', tone: 'term', title: 'Naya word: Load test', html: `<strong>Ye kya hai:</strong> nakli users bana ke ek server pe dheere dheere traffic badhana, jab tak latency kharab na ho jaaye. Wahi point us server ki asli capacity hai.<br><strong>Kyun chahiye:</strong> formula ka sabse important number "ek server kitna sambhaalta hai" yahin se aata hai.<br><strong>Iske bina:</strong> kisi blog ka number utha liya, aur poora estimate 10 guna galat.` },
    { type: 'p', html: `Ek server kitna kar sakta hai? Roadmap ke napkin numbers: simple JSON API ka stateless app server ~1k-10k req/s, lekin agar har request asli kaam karti hai (DB calls, JSON banana, auth) to estimate mein <strong>~1k-2k</strong> lo. Ye ballparks hain, benchmark nahi; asli number load test se aata hai.` },

    { type: 'h2', text: 'Table ki har line, ek ek karke' },
    { type: 'p', html: `Table ki har line ek alag duniya hai. Chhote traffic pe servers ki ginti <em>redundancy</em> tay karti hai. Bade traffic pe capacity. Bahut bade traffic pe sawaal hi badal jaata hai: "kaunsi requests servers tak aani hi nahi chahiye?"` },
    { type: 'h3', text: '100 req/s → 2-3 servers' },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com ka naya "Help center": roz ~20 lakh page views.<br><strong>Wajah:</strong> 100 ÷ 2,000 = 0.05 server. Capacity ke hisaab se aadha server bhi bahut hai. Lekin 1 server = ek reboot aur help center band. Isliye 2 AZs mein 2 servers (ya 3 AZs mein 3). Yahan number redundancy se aaya.<br><strong>Jaal:</strong> "traffic kam hai to 1 server". Deploy ke waqt bhi site band hogi, kyunki restart ke beech koi doosra server nahi.` },
    { type: 'h3', text: '5,000 req/s → ~4-5 servers' },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com ka comments API, raat 9 baje ka peak.<br><strong>Wajah:</strong> 5,000 ÷ 2,000 = 2.5. × 1.5 headroom = 3.75 → 4. 2 AZs mein ek AZ gire to sirf 2 bache, aur unhe 125% load. Isliye 2 AZs ke saath 6 (3-3), ya 3 AZs mein 2-2 = 6.<br><strong>Jaal:</strong> sirf formula ka 4 le lena aur AZ gira to kya hoga, ye check na karna. Neeche ke calculator mein ye number khud dekho.` },
    { type: 'h3', text: '50,000 req/s → ~40-50 servers, caching zaroori' },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com ka video page API, ek viral din.<br><strong>Wajah:</strong> 50,000 ÷ 2,000 × 1.5 ≈ 38, aur ×2 headroom pe 50. App servers stateless hain, to badhana aasaan. Lekin 50,000 requests ka har ek DB tak gaya to database pighal jaayega. Isliye cache: zyada tar reads cache se.<br><strong>Jaal:</strong> sirf app servers ginna. Is level pe asli sawaal hai database, cache hit rate aur connection limits.` },
    { type: 'h3', text: '500,000 req/s → sainkdon servers, cache aur CDN' },
    { type: 'p', html: `<strong>xyz.com scenario:</strong> xyz.com pe ek bade match ke time ka homepage aur score.<br><strong>Wajah:</strong> 500,000 ÷ 2,000 × 1.5 = 375 app servers. Lekin zyada tar requests same content maangti hain. CDN aur cache unhe servers tak aane hi nahi dete, to origin pe asli traffic bahut kam.<br><strong>Jaal:</strong> 375 servers order kar dena bina ye pooche ki in mein se kitni requests CDN pe khatam ho sakti hain. Neeche wala "live cricket score" trap yahi hai.` },

    { type: 'h2', text: 'N+1, N+2 aur "ek poora AZ gira to?"' },
    { type: 'callout', tone: 'term', title: 'Naya word: N+1 / N+2 redundancy', html: `<strong>Ye kya hai:</strong> <strong>N</strong> = peak sambhaalne ke liye jitne servers chahiye. <strong>N+1</strong> = ek extra, taaki koi ek server mare (ya deploy ke time restart ho) to bhi peak sambhal jaaye. <strong>N+2</strong> = do extra: ek maintenance/deploy mein bahar ho aur usi waqt ek aur gir jaaye, tab bhi theek. Jitna critical system, utna zyada +.<br><strong>Kyun chahiye:</strong> servers roz marte hain, aur har deploy mein kuch servers thodi der ke liye bahar hote hain.<br><strong>Iske bina:</strong> deploy ke waqt ek server ka crash = peak pe capacity kam = slow site.` },
    { type: 'p', html: `Servers ka marna roz ki baat hai, lekin poora AZ girna bhi hota hai. Socho 3 AZs mein barabar servers hain aur ek AZ gira. Bache hue 2 AZs ko poora traffic uthana hai, yaani har server pe load 3/2 = 1.5 guna. Agar normal mein servers 67% pe the, to ab 67% × 1.5 = 100%. Bas bach gaye. 80% pe the to 120%: overload aur cascading failure (ek ke girne se uska load doosron pe, phir wo bhi girte jaate hain).` },
    { type: 'p', html: `Isse ek saaf rule nikalta hai: <strong>k AZs mein se ek ke girne ke baad bhi chalna hai, to normal utilisation ≤ (k−1)/k rakho</strong>. 2 AZs → 50%, 3 AZs → ~67%. Yahi roadmap ka "50-70% target" hai. AWS ise <strong>static stability</strong> kehta hai (static = bina kuch badle): pehle se itni capacity rakho ki AZ girne pe naye servers launch karne ki zaroorat hi na pade. (Autoscaling madad karta hai, lekin naye servers aane mein minutes lagte hain, aur outage ke waqt cloud ka control plane, yaani naye servers banane wala system, khud dabav mein ho sakta hai.)` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "average pe size karo"', html: `"Average 400 req/s hai, ek server 2,000 karta hai, to 1 server kaafi". Teen galtiyan ek saath: (1) peak average ka 2-5 guna hai, (2) 1 server = single point of failure (SPOF: wo ek hissa jiske girne se sab gire), ek reboot aur site band, (3) 100% ke paas chalne wala server latency mein phat jaata hai. Peak × headroom, aur kam se kam 2 AZs mein.` },

    { type: 'h2', text: 'Calculator: formula khud chalao' },
    { type: 'p', html: `Example buttons roadmap ke table aur worked example load karte hain. Har number ke neeche formula substitute hota dikhega. "Ek AZ gira" wala stat dekhna mat bhoolna.` },
    { type: 'custom',
      presets: [
        { n: '100 req/s', peak: 100, per: 2000, hr: 1.5, sp: 0, az: 2, min: 1 },
        { n: '5,000 req/s', peak: 5000, per: 2000, hr: 1.5, sp: 0, az: 2, min: 1 },
        { n: '50,000 req/s', peak: 50000, per: 2000, hr: 1.5, sp: 0, az: 3, min: 2 },
        { n: '500,000 req/s', peak: 500000, per: 2000, hr: 1.5, sp: 0, az: 3, min: 2 },
        { n: 'Twitter-like feed', peak: 600000, per: 5000, hr: 1.5, sp: 0, az: 3, min: 2 },
      ],
      calc(p) {
        const raw = p.peak / p.per, withH = raw * p.hr;
        const N = Math.max(1, Math.ceil(withH - 1e-9));
        const NS = N + p.sp;
        const perAZ = Math.max(p.min, Math.ceil(NS / p.az));
        const total = perAZ * p.az;
        const uNorm = p.peak / (total * p.per);
        const uAZ = p.az > 1 ? p.peak / ((p.az - 1) * perAZ * p.per) : Infinity;
        const u1 = total > 1 ? p.peak / ((total - 1) * p.per) : Infinity;
        const azSafe = p.az > 1 ? Math.ceil(raw / (p.az - 1) - 1e-9) * p.az : null;
        return { raw, withH, N, NS, perAZ, total, uNorm, uAZ, u1, azSafe };
      },
      render(el) {
        const self = this, st = Object.assign({}, this.presets[2]);
        el.innerHTML = `<div class="ds-pre" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"></div>
          <div class="row2">
            <div><label>Peak QPS (req/s)</label><input class="ds-peak" type="number" min="1" step="1"></div>
            <div><label>Ek server kitna sambhaalta hai (req/s)</label><input class="ds-per" type="number" min="1" step="100"></div>
            <div><label>Headroom: <strong class="ds-vhr"></strong></label><input class="ds-hr" type="range" min="1" max="2" step="0.1"></div>
            <div><label>Extra spare servers</label><div class="ds-sp" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>Availability zones</label><div class="ds-az" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>Har AZ mein kam se kam</label><div class="ds-min" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
          </div>
          <div class="stats">
            <div class="stat"><span>Formula se (N)</span><strong class="ds-o-n"></strong></div>
            <div class="stat"><span>AZs mein round up: total</span><strong class="ds-o-t"></strong></div>
            <div class="stat"><span>Normal peak pe load</span><strong class="ds-o-u"></strong></div>
            <div class="stat"><span>Ek server gira</span><strong class="ds-o-u1"></strong></div>
            <div class="stat"><span>Ek poora AZ gira</span><strong class="ds-o-uaz"></strong></div>
          </div>
          <pre class="ds-f" style="font:13px/1.6 var(--f-mono);background:var(--surface-2);color:var(--ink);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0"></pre>
          <div class="calc-note ds-note"></div>`;
        const $ = c => el.querySelector(c);
        const fmt = n => Math.round(n).toLocaleString('en-IN');
        const pct = u => isFinite(u) ? Math.round(u * 100) + '%' : 'sab band';
        const chips = (box, key, vals, lab) => { const b = $(box); b.innerHTML = ''; vals.forEach(v => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip' + (st[key] === v ? ' on' : ''); c.textContent = lab(v); c.onclick = () => { st[key] = v; upd(); }; b.appendChild(c); }); };
        this.presets.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = p.n; b.onclick = () => { Object.assign(st, p); sync(); upd(); }; $('.ds-pre').appendChild(b); });
        const sync = () => { $('.ds-peak').value = st.peak; $('.ds-per').value = st.per; $('.ds-hr').value = st.hr; };
        const upd = () => {
          chips('.ds-sp', 'sp', [0, 1, 2], v => 'N+' + v);
          chips('.ds-az', 'az', [1, 2, 3], v => v + (v === 1 ? ' AZ' : ' AZs'));
          chips('.ds-min', 'min', [1, 2], v => v + ' server');
          $('.ds-vhr').textContent = '×' + st.hr.toFixed(1);
          const r = self.calc(st);
          $('.ds-o-n').textContent = fmt(r.N);
          $('.ds-o-t').textContent = fmt(r.total) + ' (' + r.perAZ + ' × ' + st.az + ')';
          $('.ds-o-u').textContent = pct(r.uNorm);
          $('.ds-o-u1').textContent = pct(r.u1);
          $('.ds-o-uaz').textContent = st.az === 1 ? 'site band' : pct(r.uAZ);
          $('.ds-o-uaz').style.color = st.az === 1 || r.uAZ > 1 ? 'var(--red)' : r.uAZ > 0.85 ? 'var(--amber)' : 'var(--green)';
          $('.ds-f').textContent =
            `1. ${fmt(st.peak)} ÷ ${fmt(st.per)} = ${r.raw.toFixed(2)} servers (bilkul 100% pe)\n` +
            `2. × headroom ${st.hr.toFixed(1)} = ${r.withH.toFixed(2)} → round up: N = ${r.N}\n` +
            `3. + spares (N+${st.sp}) = ${r.NS}\n` +
            `4. ${st.az} AZ: max(${st.min}, ceil(${r.NS} ÷ ${st.az})) = ${r.perAZ} per AZ → total ${r.perAZ * st.az}\n` +
            `5. Load = ${fmt(st.peak)} ÷ (${r.total} × ${fmt(st.per)}) = ${pct(r.uNorm)}` +
            (st.az > 1 ? `;  AZ gira: ÷ (${st.az - 1} × ${r.perAZ} × ${fmt(st.per)}) = ${pct(r.uAZ)}` : '');
          let note;
          if (st.az === 1) note = 'Sirf 1 AZ: woh data center gira to poori site gayi, chahe kitne bhi servers hon. Kam se kam 2 AZs, behtar 3.';
          else if (r.uAZ > 1) note = `Ek AZ girte hi bache servers ${pct(r.uAZ)} pe: overload, phir cascading failure. AZ-loss jhelne ke liye kam se kam ${fmt(r.azSafe)} servers chahiye (har AZ mein ceil(peak ÷ per-server ÷ ${st.az - 1}), phir × ${st.az}), ya headroom badhao.`;
          else if (r.uNorm < 0.25 && r.total > 2) note = `Normal load sirf ${pct(r.uNorm)}: shayad zaroorat se zyada servers. Lekin chhote traffic pe ye minimum redundancy ki keemat hai.`;
          else if (r.uAZ > 0.85) note = `Ek AZ gire to bache servers ${pct(r.uAZ)} pe: site bachti hai, lekin bilkul kinaare pe (latency badhegi, koi aur spike aaya to gayi). ${st.az} AZs ke saath ye ${Math.round((st.az - 1) / st.az * 100)}% normal load ka natural hissa hai; aaram chahiye to headroom ya spares badhao.`;
          else note = `Normal peak pe ${pct(r.uNorm)}, ek AZ gire to ${pct(r.uAZ)}: site bach jaati hai.`;
          if (st.peak >= 50000) note += ' Itne traffic pe app servers aasaan hissa hain: database ko bachaane ke liye cache, replicas aur CDN zaroori.';
          $('.ds-note').textContent = note;
        };
        const num = (c, k) => $(c).addEventListener('input', e => { const v = Number(e.target.value); if (v > 0) { st[k] = v; upd(); } });
        num('.ds-peak', 'peak'); num('.ds-per', 'per'); num('.ds-hr', 'hr');
        sync(); upd();
      },
    },

    { type: 'p', html: `Calculator se nikli baatein, jo numbers khud dikhate hain:` },
    { type: 'list', items: [
      '<strong>Roadmap table match karta hai:</strong> 100 req/s → N = 1, lekin 2-3 AZs ke liye total 2-3. 5,000 → N = 4 (headroom ×2 pe 5). 50,000 → 38 (×1.5) se 50 (×2). 500,000 → 375. Twitter-like 600k ÷ 5k × 1.5 = 180, yaani 3 AZs mein 60-60.',
      '<strong>2 AZs mein 5,000 req/s, 4 servers:</strong> normal 63%, lekin ek AZ gira to bache 2 servers 125% pe. AZ-loss jhelne ke liye 6 chahiye (3-3), taaki bacha hua AZ akela 2.5 servers ka kaam kar sake. Isliye 2 AZs ke saath target ~50% hai.',
      '<strong>3 AZs, ×1.5 headroom:</strong> normal ~67%, AZ gira to ~100%. Bach jaate ho, lekin kinaare pe. 3 AZs zyada efficient hain kyunki girne pe sirf 1/3 capacity jaati hai, 2 AZs mein 1/2.',
      '<strong>"Har AZ mein kam se kam 2":</strong> roadmap ka rule yahi hai, taaki ek AZ ke andar ek server deploy ya crash mein ho to bhi wo AZ khaali na ho. Bahut chhoti, non-critical service ke liye log 1 per AZ bhi chala lete hain; table ki 100 req/s wali line (2-3 servers) yahi hai.',
    ]},

    { type: 'h2', text: 'Poora hisaab, step by step: users se regions tak' },
    { type: 'p', html: `Upar wala calculator peak QPS se shuru hota tha. Asli interview mein tumhe sirf users ki ginti milti hai. Ye calculator wahan se shuru karta hai aur ek ek kadam dikhata hai: users → requests/day → average QPS → peak → ek server ki capacity → headroom → N+1/N+2 → AZs → regions. "Agla kadam" dabao, ya "Sab dikhao".` },
    { type: 'callout', tone: 'term', title: 'Naya word: Region failover', html: `<strong>Ye kya hai:</strong> xyz.com do ya teen regions mein chalta hai (jaise Mumbai aur Hyderabad). Ek poora region gire to uske users ka traffic doosre region pe bhej diya jaata hai.<br><strong>Kyun chahiye:</strong> region girna rare hai, lekin hota hai. Tab bhi site chalni chahiye.<br><strong>Iske bina:</strong> region gira to us region ke saare users ke liye site band.<br><strong>Keemat:</strong> har region ko itna bada rakhna padta hai ki wo doosre region ka traffic bhi utha sake. 2 regions mein har ek ko poora peak sambhaalna padta hai.` },
    { type: 'custom',
      T: { pre: 'Example:', dau: 'DAU (crore users)', rpu: 'Requests per user per day', pf: 'Peak factor (× average)', per: 'Ek server kitna sambhaalta hai (req/s)', hr: 'Headroom', sp: 'Spare servers', reg: 'Regions', fo: 'Region gire to doosra sambhaale?', yes: 'Haan', no: 'Nahi', az: 'AZs per region', min: 'Har AZ mein kam se kam', srv: 'server', next: 'Agla kadam →', all: 'Sab dikhao', reset: 'Shuru se', total: 'Total servers', norm: 'Normal peak pe load', azd: 'Ek AZ gira', regd: 'Ek region gira', both: 'Region + ek AZ gira', na: 'lagu nahi', down: 'site band (us region ke users)',
        s1: (a, b, c) => `Users → requests/day: ${a} × ${b} = ${c} requests/day`,
        s2: (a, b) => `Average QPS: ${a} ÷ 10^5 (ek din ≈ 10^5 s) = ${b} req/s`,
        s3: (a, f, b) => `Peak: ${a} × ${f} = ${b} req/s (plan isi ke liye)`,
        s4r1: (b) => `Per region: 1 region, to poora ${b} req/s ek hi jagah`,
        s4fo: (b, r, c) => `Per region: ${b} ÷ (${r} − 1) = ${c} req/s (ek region gire to bache regions poora peak uthayein)`,
        s4no: (b, r, c) => `Per region: ${b} ÷ ${r} = ${c} req/s (failover nahi: har region sirf apna hissa)`,
        s5: (c, p, x) => `Ek region ke liye, bilkul 100% pe: ${c} ÷ ${p} = ${x} servers`,
        s6: (x, h, y, n) => `× headroom ${h} = ${y} → round up: N = ${n}`,
        s7: (n, sp, ns) => `+ spares (N+${sp}) = ${ns}`,
        s8: (ns, az, m, pa, rt) => `${az} AZs mein baanto: max(${m}, ceil(${ns} ÷ ${az})) = ${pa} per AZ → ${rt} per region`,
        s9: (rt, r, t) => `× ${r} region = ${t} servers total`,
        okN: 'Har failure ke baad bhi load 100% se kam: design bachta hai.',
        badN: (w) => `Dhyaan: "${w}" pe load 100% se upar. Headroom, spares ya AZs badhao.`,
        db: ' Is traffic pe app servers aasaan hissa hain. Asli sawaal database, cache aur CDN ka hai.' },
      presets: [
        { n: 'xyz.com API (default)', dau: 5, rpu: 20, pf: 3, per: 2000, hr: 1.5, sp: 1, reg: 2, fo: 1, az: 3, min: 2 },
        { n: 'Chhota startup', dau: 0.1, rpu: 20, pf: 3, per: 1000, hr: 1.5, sp: 0, reg: 1, fo: 0, az: 2, min: 1 },
        { n: 'Twitter-like feed', dau: 20, rpu: 100, pf: 3, per: 5000, hr: 1.5, sp: 0, reg: 1, fo: 0, az: 3, min: 2 },
        { n: 'Bank (N+2, 3 regions)', dau: 2, rpu: 10, pf: 5, per: 1000, hr: 1.5, sp: 2, reg: 3, fo: 1, az: 3, min: 2 },
      ],
      calc(p) {
        const reqDay = p.dau * 1e7 * p.rpu, avg = reqDay / 1e5, peak = avg * p.pf;
        const rp = p.reg === 1 ? peak : (p.fo ? peak / (p.reg - 1) : peak / p.reg);
        const raw = rp / p.per, withH = raw * p.hr;
        const N = Math.max(1, Math.ceil(withH - 1e-9)), NS = N + p.sp;
        const perAZ = Math.max(p.min, Math.ceil(NS / p.az)), rt = perAZ * p.az, total = rt * p.reg;
        const share = peak / p.reg, cap = rt * p.per, capAZ = (p.az - 1) * perAZ * p.per;
        const uNorm = share / cap;
        const uAZ = p.az > 1 ? share / capAZ : Infinity;
        const uReg = p.reg > 1 && p.fo ? (peak / (p.reg - 1)) / cap : null;
        const uBoth = p.reg > 1 && p.fo ? (peak / (p.reg - 1)) / capAZ : null;
        return { reqDay, avg, peak, rp, raw, withH, N, NS, perAZ, rt, total, uNorm, uAZ, uReg, uBoth };
      },
      render(el) {
        const T = this.T, self = this, st = Object.assign({}, this.presets[0]);
        let shown = 3;
        el.innerHTML = `<div class="dsr-pre" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"></div>
          <div class="row2">
            <div><label>${T.dau}</label><input class="dsr-dau" type="number" min="0.01" step="0.1"></div>
            <div><label>${T.rpu}</label><input class="dsr-rpu" type="number" min="1" step="1"></div>
            <div><label>${T.pf}: <strong class="dsr-vpf"></strong></label><input class="dsr-pf" type="range" min="1" max="10" step="0.5"></div>
            <div><label>${T.per}</label><input class="dsr-per" type="number" min="1" step="100"></div>
            <div><label>${T.hr}: <strong class="dsr-vhr"></strong></label><input class="dsr-hr" type="range" min="1" max="2" step="0.1"></div>
            <div><label>${T.sp}</label><div class="dsr-sp" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>${T.reg}</label><div class="dsr-reg" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>${T.fo}</label><div class="dsr-fo" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>${T.az}</label><div class="dsr-az" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
            <div><label>${T.min}</label><div class="dsr-min" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
          </div>
          <ol class="dsr-steps" style="font:13px/1.7 var(--f-mono);background:var(--surface-2);color:var(--ink);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 10px 10px 34px;margin:10px 0;overflow-wrap:anywhere"></ol>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            <button type="button" class="btn small primary dsr-next">${T.next}</button>
            <button type="button" class="btn small dsr-all">${T.all}</button>
            <button type="button" class="btn small ghost dsr-reset">${T.reset}</button></div>
          <div class="stats">
            <div class="stat"><span>${T.total}</span><strong class="dsr-o-t"></strong></div>
            <div class="stat"><span>${T.norm}</span><strong class="dsr-o-u"></strong></div>
            <div class="stat"><span>${T.azd}</span><strong class="dsr-o-az"></strong></div>
            <div class="stat"><span>${T.regd}</span><strong class="dsr-o-r"></strong></div>
            <div class="stat"><span>${T.both}</span><strong class="dsr-o-b"></strong></div>
          </div>
          <div class="calc-note dsr-note"></div>`;
        const $ = c => el.querySelector(c);
        const fmt = n => n >= 100 ? Math.round(n).toLocaleString('en-IN') : (Math.round(n * 100) / 100).toLocaleString('en-IN');
        const pct = u => u == null ? T.na : isFinite(u) ? Math.round(u * 100) + '%' : T.down;
        const colr = u => u == null ? 'var(--ink-3)' : !isFinite(u) || u > 1 ? 'var(--red)' : u > 0.85 ? 'var(--amber)' : 'var(--green)';
        const chips = (box, key, vals, lab) => { const b = $(box); b.innerHTML = ''; vals.forEach(v => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip' + (st[key] === v ? ' on' : ''); c.textContent = lab(v); c.onclick = () => { st[key] = v; upd(); }; b.appendChild(c); }); };
        this.presets.forEach(p => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = p.n; b.onclick = () => { Object.assign(st, p); sync(); upd(); }; $('.dsr-pre').appendChild(b); });
        const sync = () => { $('.dsr-dau').value = st.dau; $('.dsr-rpu').value = st.rpu; $('.dsr-pf').value = st.pf; $('.dsr-per').value = st.per; $('.dsr-hr').value = st.hr; };
        const upd = () => {
          chips('.dsr-sp', 'sp', [0, 1, 2], v => 'N+' + v);
          chips('.dsr-reg', 'reg', [1, 2, 3], v => String(v));
          chips('.dsr-fo', 'fo', [1, 0], v => v ? T.yes : T.no);
          chips('.dsr-az', 'az', [2, 3], v => String(v));
          chips('.dsr-min', 'min', [1, 2], v => v + ' ' + T.srv);
          $('.dsr-vpf').textContent = '×' + st.pf; $('.dsr-vhr').textContent = '×' + st.hr.toFixed(1);
          const r = self.calc(st);
          const s4 = st.reg === 1 ? T.s4r1(fmt(r.peak)) : st.fo ? T.s4fo(fmt(r.peak), st.reg, fmt(r.rp)) : T.s4no(fmt(r.peak), st.reg, fmt(r.rp));
          const lines = [T.s1(fmt(st.dau * 1e7), st.rpu, fmt(r.reqDay)), T.s2(fmt(r.reqDay), fmt(r.avg)), T.s3(fmt(r.avg), st.pf, fmt(r.peak)), s4,
            T.s5(fmt(r.rp), fmt(st.per), r.raw.toFixed(2)), T.s6(r.raw.toFixed(2), st.hr.toFixed(1), r.withH.toFixed(2), r.N), T.s7(r.N, st.sp, r.NS),
            T.s8(r.NS, st.az, st.min, r.perAZ, r.rt), T.s9(r.rt, st.reg, fmt(r.total))];
          $('.dsr-steps').innerHTML = lines.slice(0, shown).map(x => `<li>${x}</li>`).join('');
          const done = shown >= lines.length;
          $('.dsr-next').disabled = done;
          const out = [['.dsr-o-u', r.uNorm], ['.dsr-o-az', r.uAZ], ['.dsr-o-r', r.uReg], ['.dsr-o-b', r.uBoth]];
          $('.dsr-o-t').textContent = done ? fmt(r.total) : '?';
          out.forEach(([c, u]) => { $(c).textContent = done ? pct(u) : '?'; $(c).style.color = done ? colr(u) : 'var(--ink-3)'; });
          let note = '';
          if (done) {
            const bad = [[T.azd, r.uAZ], [T.regd, r.uReg], [T.both, r.uBoth]].find(([, u]) => u != null && u > 1);
            note = bad ? T.badN(bad[0]) : T.okN;
            if (r.peak >= 50000) note += T.db;
          }
          $('.dsr-note').textContent = note;
        };
        $('.dsr-next').onclick = () => { shown++; upd(); };
        $('.dsr-all').onclick = () => { shown = 99; upd(); };
        $('.dsr-reset').onclick = () => { shown = 3; upd(); };
        const num = (c, k) => $(c).addEventListener('input', e => { const v = Number(e.target.value); if (v > 0) { st[k] = v; upd(); } });
        num('.dsr-dau', 'dau'); num('.dsr-rpu', 'rpu'); num('.dsr-pf', 'pf'); num('.dsr-per', 'per'); num('.dsr-hr', 'hr');
        sync(); upd();
      },
    },
    { type: 'p', html: `Default example ke numbers khud padho: 5 crore DAU × 20 = 100 crore requests/day → 10,000 req/s average → ×3 = 30,000 peak. 2 regions with failover, to har region ko poora 30,000 sambhaalna hai: 15 servers × 1.5 = 22.5 → 23, N+1 = 24, 3 AZs mein 8-8-8. Dono regions mila ke <strong>48 servers</strong>. Normal din pe load sirf ~31%, kyunki aadhi capacity "doosra region gire to" ke liye rakhi hai. Region gire to 63%, aur region ke saath ek AZ bhi gire to ~94%: bach gaye, lekin kinaare pe. Multi-region ka bill isi wajah se bhaari hota hai.` },

    { type: 'h3', text: 'Connections ke liye: gateways kitne?' },
    { type: 'p', html: `Chat aur live apps mein limit requests/sec nahi, <strong>khule connections</strong> hote hain (har online user ka ek WebSocket). Roadmap ka formula: concurrent users ÷ connections per gateway. Estimate mein ek gateway = ~1 lakh connections. WhatsApp jaise 10 crore online users: 10 crore ÷ 1 lakh ≈ <strong>1,000 gateway servers</strong>, plus ek registry jo yaad rakhe kaun user kis gateway pe hai (<a href="#/realtime">real-time</a> lesson).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Peak pe online users (lakh)</label><input class="dsc-u" type="number" value="1000" min="1" step="1"></div>
          <div><label>Connections per gateway (hazaar)</label><input class="dsc-c" type="number" value="100" min="1" step="1"></div>
          <div><label>Headroom: <strong class="dsc-vh"></strong></label><input class="dsc-h" type="range" min="1" max="2" step="0.1" value="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Gateway servers</span><strong class="dsc-o"></strong></div>
          <div class="stat"><span>Ek gateway gira: kitne reconnect</span><strong class="dsc-r"></strong></div>
        </div>
        <div class="calc-note dsc-n"></div>`;
      const $ = c => el.querySelector(c);
      const upd = () => {
        const u = Math.max(1, +$('.dsc-u').value || 1) * 1e5, c = Math.max(1, +$('.dsc-c').value || 1) * 1e3, h = +$('.dsc-h').value;
        const g = Math.ceil(u / c * h - 1e-9), per = Math.round(u / g);
        $('.dsc-vh').textContent = '×' + h.toFixed(1);
        $('.dsc-o').textContent = g.toLocaleString('en-IN');
        $('.dsc-r').textContent = per.toLocaleString('en-IN');
        $('.dsc-n').textContent = `Formula: ${u.toLocaleString('en-IN')} ÷ ${c.toLocaleString('en-IN')} × ${h.toFixed(1)} = ${g.toLocaleString('en-IN')} gateways. Ek gateway gire to uske ~${per.toLocaleString('en-IN')} users ek saath reconnect karenge: isliye reconnect mein random delay (jitter) aur baaki gateways pe headroom chahiye.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Chala ke dekho: AZ gira, aur kaunsa layer pehle tootega' },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'u', label: 'Users', sub: 'peak traffic', x: 70, y: 170, w: 110, kind: 'client', info: 'Ye kya hai: xyz.com ke users, raat 9 baje ke peak pe. Plan isi ke liye hota hai, average ke liye nahi.' },
        { id: 'lb', label: 'Load balancer', x: 220, y: 170, w: 130, kind: 'net', info: 'Ye kya hai: traffic baantne wala. Health checks (har kuch second pe "zinda ho?" poochhna) se mare servers/AZ ko hata deta hai aur traffic bache servers mein baant deta hai. Wo bache servers us extra load ko utha paayenge ya nahi, ye headroom decide karta hai.' },
        { id: 'a', label: 'AZ-a servers', sub: '60 servers', x: 420, y: 55, w: 150, kind: 'server', meter: true, load: 67, info: 'Ye kya hai: Availability Zone a ke app servers. Alag power aur network wala data center. Meter dikhata hai ye kitne busy hain.' },
        { id: 'b', label: 'AZ-b servers', sub: '60 servers', x: 420, y: 170, w: 150, kind: 'server', meter: true, load: 67, info: 'Ye kya hai: Availability Zone b ke app servers. AZ-a gire to inhe uska hissa uthana padta hai.' },
        { id: 'c', label: 'AZ-c servers', sub: '60 servers', x: 420, y: 285, w: 150, kind: 'server', meter: true, load: 67, info: 'Ye kya hai: Availability Zone c ke app servers. AZ-a gire to inhe bhi uska hissa uthana padta hai.' },
        { id: 'db', label: 'Database', sub: 'leader + replicas', x: 625, y: 170, w: 150, kind: 'data', meter: true, load: 50, info: 'Ye kya hai: xyz.com ka main database. Saare app servers isi pe aate hain. App servers badhana aasaan hai (stateless), database ko badhana mushkil. Isliye aksar yahi pehle toot-ta hai.' },
      ],
      edges: [{ a: 'u', b: 'lb' }, { a: 'lb', b: 'a' }, { a: 'lb', b: 'b' }, { a: 'lb', b: 'c' }, { a: 'a', b: 'db' }, { a: 'b', b: 'db' }, { a: 'c', b: 'db' }],
      scenarios: [
        { name: 'Normal peak', steps: [
          { title: 'Peak traffic, 3 AZs', text: '600k req/s, 180 servers (5k each), 60 per AZ. Har server ~67% pe.', flood: { paths: ['u>lb>a', 'u>lb>b', 'u>lb>c'], n: 12 } },
          { title: 'Sab aaram se', text: 'Har AZ apna teesra hissa le raha hai. Database pe zyada tar reads cache se bach jaati hain.', go: ['b>db', 'res:db>b'], after: { a: { state: 'ok' }, b: { state: 'ok' }, c: { state: 'ok' } } },
        ]},
        { name: 'AZ gira (headroom ×2)', intro: 'Same traffic, lekin ×2 headroom: 240 servers, 80 per AZ, normal load 50%.', steps: [
          { title: 'Normal: 50%', text: 'Har server aadha khaali.', set: { a: { load: 50, sub: '80 servers' }, b: { load: 50, sub: '80 servers' }, c: { load: 50, sub: '80 servers' } }, flood: { paths: ['u>lb>a', 'u>lb>b', 'u>lb>c'], n: 9 } },
          { title: 'AZ-a mein power cut', text: 'Poora AZ-a gaya. LB ke health checks ise hata dete hain.', set: { a: { state: 'down', sub: 'AZ DOWN', load: 0 } }, go: 'lost:lb>a' },
          { title: 'Bache AZs load uthate hain', text: 'Ab b aur c pe 1.5 guna load: 50% → 75%. Koi naya server launch nahi karna pada. Users ko shayad hi pata chala. Yahi static stability hai.', flood: { paths: ['u>lb>b', 'u>lb>c'], n: 12 }, after: { b: { load: 75, state: 'ok' }, c: { load: 75, state: 'ok' } } },
        ]},
        { name: 'Galat: koi headroom nahi', intro: 'Paise bachaane ke liye fleet itni chhoti ki normal peak pe 85% load.', steps: [
          { title: 'Normal: 85%', text: 'Dashboard pe sab hara dikhta hai. Koi problem nahi... abhi.', set: { a: { load: 85, state: 'warn' }, b: { load: 85, state: 'warn' }, c: { load: 85, state: 'warn' } }, flood: { paths: ['u>lb>a', 'u>lb>b', 'u>lb>c'], n: 9 } },
          { title: 'AZ-a gira', text: 'Uska traffic b aur c pe: 85% × 1.5 ≈ 128%.', set: { a: { state: 'down', sub: 'AZ DOWN', load: 0 } }, flood: { paths: ['u>lb>b', 'u>lb>c'], n: 14 }, after: { b: { load: 100, state: 'hot', sub: '128% demand' }, c: { load: 100, state: 'hot', sub: '128% demand' } } },
          { title: 'Cascading failure', text: 'Overloaded servers slow hote hain, health checks fail, LB unhe bhi hata deta hai, aur bache servers pe aur load. Users retry karte hain, load aur badhta hai. AZ-b bhi gira, phir c. Ek AZ ki problem ne poori site gira di.', set: { b: { state: 'down', sub: 'DOWN' } }, flood: { paths: ['u>lb>c'], n: 14 }, after: { c: { state: 'down', sub: 'DOWN' } } },
          { title: 'Autoscaling kyun nahi bachaata', text: 'Naye servers aane, boot hone aur warm hone mein minutes. Cascade seconds mein hota hai. Headroom pehle se hona chahiye.', focus: ['lb'] },
        ]},
        { name: 'Galat layer badhaya', intro: '"Site slow hai, app servers double karo!" Dekho kya hota hai.', steps: [
          { title: 'App servers double', text: 'Ab app servers 33% pe. Lekin site ab bhi slow.', set: { a: { load: 33, sub: '120 servers' }, b: { load: 33, sub: '120 servers' }, c: { load: 33, sub: '120 servers' } }, flood: { paths: ['u>lb>a>db', 'u>lb>b>db', 'u>lb>c>db'], n: 12 }, after: { db: { load: 100, state: 'hot', sub: 'CPU 100%' } } },
          { title: 'Asli bottleneck: database', text: 'Har app server DB pe queries bhej raha hai. Zyada app servers = zyada DB connections = DB aur dabta hai. Roadmap: "5 ya 15 servers" asli sawaal nahi; asli sawaal hai kaunsa layer pehle tootega: aam taur pe database, phir hot keys, phir connection limits.', go: ['bad:db>b'], focus: ['db'] },
          { title: 'Sahi ilaaj', text: 'Cache (reads ka bada hissa DB tak na jaaye), read replicas, connection pooling, aur writes zyada hon to sharding. App fleet wapas normal size pe.', set: { db: { load: 45, state: 'ok', sub: 'cache + replicas' } }, after: { a: { load: 67, sub: '60 servers' }, b: { load: 67, sub: '60 servers' }, c: { load: 67, sub: '60 servers' } }, go: ['b>db', 'res:db>b'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Worked scenarios' },
    { type: 'h3', text: '1. xyz.com ka naya blog section' },
    { type: 'p', html: `10 lakh views/day ÷ 10<sup>5</sup> ≈ 10 req/s average, peak ×5 ≈ 50 req/s. 50 ÷ 2,000 × 1.5 = 0.04 → N = 1. Lekin 1 server = SPOF, to <strong>2 servers, 2 AZs mein</strong>. Yahan servers ki ginti capacity se nahi, redundancy se tay hoti hai (table ki pehli line).` },
    { type: 'h3', text: '2. Twitter-like feed (roadmap ka worked example)' },
    { type: 'p', html: `200M DAU × 100 feed views ÷ 10<sup>5</sup> ≈ 200k reads/s, peak ≈ 600k/s. Agar ek server 5k req/s sambhaale (zyada tar kaam cache se): 600k ÷ 5k × 1.5 = <strong>180 servers, 3 AZs mein 60-60</strong>. Lekin asli design conclusion ye hai ki 600k reads/s koi database nahi jhelega: precomputed feeds aur heavy caching.` },
    { type: 'h3', text: '3. WhatsApp-style chat gateways' },
    { type: 'p', html: `10 crore users peak pe online, har ek ka ek WebSocket. 10 crore ÷ 1 lakh per gateway ≈ <strong>1,000 gateways</strong> (headroom ke saath aur zyada), plus user → gateway registry. Yahan bottleneck req/s nahi, open connections aur memory hai.` },
    { type: 'h3', text: '4. Trap: live cricket score, 3 crore viewers' },
    { type: 'p', html: `Har app har 5 second poll kare: 3 crore ÷ 5 = <strong>60 lakh req/s</strong>. Formula lagao: 6M ÷ 2k × 1.5 = 4,500 servers! Trap. Score JSON sabke liye same hai, to ye CDN ka kaam hai: edges ise 1-2 second cache karte hain, aur origin ko har edge se second mein bas ek-do requests aati hain. Origin ke liye ek chhota fleet kaafi. Formula lagane se pehle poochho: "kya ye requests mere servers tak aani bhi chahiye?"` },
    { type: 'h3', text: '5. Trap: "ek server 10k req/s karta hai"' },
    { type: 'p', html: `Kisi blog mein padha ki ek server 10k req/s karta hai, to 50k peak ke liye 5 × 1.5 ≈ 8 servers order kiye. Lekin xyz.com ki har request 3 DB queries aur ek image resize karti hai: asli capacity 800 req/s nikli. Chahiye the ~94. Per-server number <strong>apne</strong> app ka load test se lo; estimate mein, asli kaam wali requests ke liye 1k-2k.` },

    { type: 'h2', text: 'Practice: 6 chhote cases' },
    { type: 'p', html: `Pehle khud kaagaz pe hisaab karo. Phir "Signal dikhao", phir jawab. Har jawab mein poora formula likha hai.` },
    { type: 'custom',
      cases: [
        { q: 'Peak 12,000 req/s. Load test bolta hai ek server 1,500 req/s. Headroom ×1.5, 3 AZs. Kitne servers?', signal: 'Seedha formula, phir AZ-loss check.', pick: '12 formula se, lekin 15 lena behtar (5 per AZ)', why: '12,000 ÷ 1,500 = 8; × 1.5 = 12 → 4 per AZ. Ek AZ gira to 8 servers = 12,000 capacity, yaani 100%: bilkul kinaare pe. 5 per AZ (15 total) lo: AZ gira to 12,000 ÷ 15,000 = 80%.', trap: 'Formula ka number le ke ruk jaana, AZ-loss check kiye bina.' },
        { q: 'Image resize service: peak 300 resize/s. Har resize 0.5 second CPU leta hai, aur ek server mein 8 cores hain. 3 AZs, headroom ×1.5.', signal: 'Per-server capacity khud nikaalni hai: cores ÷ time per request.', pick: '30 servers (10 per AZ)', why: 'Ek server = 8 cores ÷ 0.5 s = 16 resize/s. 300 ÷ 16 = 18.75; × 1.5 = 28.1 → 29 → 3 AZs mein 10-10-10 = 30. AZ gira to 300 ÷ (20 × 16) ≈ 94%.', trap: '"Ek server 2,000 req/s" wala napkin number lagana. CPU-heavy kaam mein asli capacity 16 hai, 2,000 nahi.' },
        { q: 'xyz.com chat: peak pe 50 lakh users online, har ek ka ek WebSocket. Ek gateway 50,000 connections sambhaalta hai. Headroom ×1.5.', signal: 'Yahan limit req/s nahi, khule connections hain.', pick: '150 gateways', why: '50,00,000 ÷ 50,000 = 100; × 1.5 = 150. Ek gateway gira to uske ~33,000 users reconnect karenge, to reconnect mein random delay (jitter) bhi chahiye.', trap: 'Chat ke liye bhi req/s wala formula lagana. Users chup baithe hon tab bhi connection khula rehta hai aur memory leta hai.' },
        { q: '1 crore DAU, har user din mein 30 requests. Peak factor ×4. Ek server 2,000 req/s, headroom ×1.5, 3 AZs, har AZ mein kam se kam 2.', signal: 'Users se shuru: pehle requests/day, phir QPS, phir peak.', pick: '9 formula se; AZ-loss ke liye 12 (4 per AZ)', why: '1 crore × 30 = 30 crore/day ÷ 10^5 = 3,000 avg; × 4 = 12,000 peak. 12,000 ÷ 2,000 × 1.5 = 9 → 3 per AZ. AZ gira to 6 servers = 12,000: 100%. 4 per AZ (12) pe AZ gira to 75%.', trap: 'Average 3,000 pe size karna: 3,000 ÷ 2,000 × 1.5 = 3 servers. Peak pe site gir jaayegi.' },
        { q: 'App servers 30% CPU pe hain, lekin site slow hai aur p99 latency (sabse slow 1% requests ka time) 4 second. Boss: "servers double karo".', signal: 'App servers khaali hain. Bottleneck kahin aur hai.', pick: 'Servers mat badhao, bottleneck dhoondho', why: 'Aam taur pe database: slow query, lock, ya connection limit. Ya ek hot key, ya slow third party. Zyada app servers = DB pe aur connections = aur slow.', trap: 'Har slowness ka ilaaj "aur servers" samajhna. Roadmap: asli sawaal hai kaunsa layer pehle tootega.' },
        { q: 'xyz.com ka "Terms and conditions" page: launch ke din 20,000 req/s, sab ke liye bilkul same page.', signal: 'Same content sab ke liye.', pick: 'CDN + origin pe 2 servers', why: 'CDN edges page cache kar lete hain. Origin tak har edge se kabhi kabhi ek request aati hai. Origin ke liye redundancy wala minimum (2 servers, 2 AZs) kaafi.', trap: '20,000 ÷ 2,000 × 1.5 = 15 servers order karna. Pehle poochho: kya ye requests mere servers tak aani bhi chahiye?' },
      ],
      render(el) {
        const cases = this.cases, T = { case: 'Case', hint: 'Signal dikhao', ans: 'Jawab dikhao', prev: '← Pichhla', next: 'Agla →', signal: 'Signal', trap: 'Jaal' };
        let i = 0, hint = false, ans = false;
        const draw = () => {
          const c = cases[i];
          el.innerHTML = `<div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">${T.case} ${i + 1} / ${cases.length}</div>
            <div style="font:600 17px/1.45 var(--f-body);color:var(--ink);margin:4px 0 10px">${c.q}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              <button type="button" class="btn small" data-a="hint">${T.hint}</button>
              <button type="button" class="btn small primary" data-a="ans">${T.ans}</button>
              <button type="button" class="btn small ghost" data-a="prev">${T.prev}</button>
              <button type="button" class="btn small ghost" data-a="next">${T.next}</button></div>
            <div class="calc-note" style="${hint ? '' : 'display:none'}"><strong>${T.signal}:</strong> ${c.signal}</div>
            <div style="${ans ? '' : 'display:none'};margin-top:10px;border:1px solid var(--line-2);border-left:4px solid var(--green);border-radius:var(--r);background:var(--surface-2);padding:10px 12px">
              <div style="font:700 16px var(--f-display);color:var(--ink)">${c.pick}</div>
              <p style="margin:6px 0">${c.why}</p><p style="margin:6px 0"><strong>${T.trap}:</strong> ${c.trap}</p></div>`;
          el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
            const a = b.dataset.a;
            if (a === 'hint') hint = true; else if (a === 'ans') { hint = true; ans = true; }
            else { i = (i + (a === 'next' ? 1 : cases.length - 1)) % cases.length; hint = false; ans = false; }
            draw();
          });
        };
        draw();
      },
    },

    { type: 'callout', tone: 'tip', title: 'Decide (roadmap rule)', html: `servers = peak QPS ÷ QPS per server × headroom (1.3-2), phir round up taaki har AZ mein kam se kam 2 hon. Utilisation target 50-70% (2 AZs → ~50%, 3 AZs → ~67%) taaki ek AZ gire to baaki uska load utha lein. Connections ke liye: concurrent users ÷ connections per gateway. Aur phir asli sawaal poochho: <strong>kaunsa layer pehle tootega?</strong> Aam taur pe database, phir hot keys, phir connection limits.` },

    { type: 'h2', text: 'Interview mein ye kaise bolein' },
    { type: 'steps', items: [
      { t: 'Users se peak tak', d: '"1 crore DAU × 30 = 30 crore/day ÷ 10^5 = 3,000 avg, × 4 = 12,000 peak." Har number bolo, taaki galti pakdi ja sake.' },
      { t: 'Per-server number ka source bolo', d: '"Asli kaam wali request ke liye ~2,000 req/s maan raha hoon; production se pehle load test karenge."' },
      { t: 'Headroom, spares, AZs', d: '"× 1.5, N+1, 3 AZs mein 4-4-4. Ek AZ gira to ~75%." Failure ka hisaab khud bolo.' },
      { t: 'Phir asli bottleneck', d: '"App servers aasaan hain. Is traffic pe DB ko cache aur replicas chahiye, aur shared content CDN se." Yahi interviewer sunna chahta hai.' },
    ]},
    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'xyz.com ka fleet: 2 regions, 3 AZs each', height: 575,
      groups: [
        { label: 'Region: Mumbai', x: 14, y: 200, w: 336, h: 362 },
        { label: 'Region: Hyderabad', x: 372, y: 200, w: 336, h: 362 },
      ],
      nodes: [
        { id: 'users', label: 'Users', sub: 'peak 30,000 req/s', x: 360, y: 50, w: 150, kind: 'client', info: 'Ye kya hai: xyz.com ke saare users. Default example mein peak 30,000 req/s. Plan isi peak ke liye, average ke liye nahi.' },
        { id: 'cdn', label: 'CDN', sub: 'static files', x: 150, y: 150, w: 140, kind: 'edge', info: 'Ye kya hai: user ke paas wale cache servers. Images, JS, videos yahin se. Jo requests yahan khatam ho jaati hain, unke liye servers ginne hi nahi padte.' },
        { id: 'dns', label: 'Global DNS', sub: 'region chuno', x: 360, y: 150, w: 160, kind: 'net', info: 'Ye kya hai: wo system jo user ko paas wale region pe bhejta hai. Ek region gire to sab users ko doosre region pe bhej deta hai (region failover).' },
        { id: 'lbM', label: 'LB Mumbai', sub: 'health checks', x: 180, y: 270, w: 140, kind: 'net', info: 'Ye kya hai: Mumbai region ka load balancer. Mare servers ya poore AZ ko health checks se hata deta hai, aur traffic bache servers mein baantta hai.' },
        { id: 'ma', label: 'AZ-a', sub: '8 servers', x: 70, y: 390, w: 90, kind: 'server', info: 'Ye kya hai: Mumbai ka pehla Availability Zone, 8 app servers. Ye gire to b aur c ke 16 servers uska hissa uthate hain.' },
        { id: 'mb', label: 'AZ-b', sub: '8 servers', x: 180, y: 390, w: 90, kind: 'server', info: 'Ye kya hai: Mumbai ka doosra AZ, 8 app servers, alag power aur network.' },
        { id: 'mc', label: 'AZ-c', sub: '8 servers', x: 290, y: 390, w: 90, kind: 'server', info: 'Ye kya hai: Mumbai ka teesra AZ, 8 app servers. 3 AZs isliye ki ek gire to sirf 1/3 capacity jaaye.' },
        { id: 'dbM', label: 'DB leader', sub: '+ cache', x: 180, y: 510, w: 140, kind: 'data', info: 'Ye kya hai: main database (leader) aur uske aage cache. App servers badhana aasaan hai, ye layer nahi. Aksar yahi pehle toot-ta hai.' },
        { id: 'lbH', label: 'LB Hyderabad', sub: 'health checks', x: 540, y: 270, w: 140, kind: 'net', info: 'Ye kya hai: Hyderabad region ka load balancer. Normal din pe aadha traffic, Mumbai gire to poora.' },
        { id: 'ha', label: 'AZ-a', sub: '8 servers', x: 430, y: 390, w: 90, kind: 'server', info: 'Ye kya hai: Hyderabad ka pehla AZ, 8 app servers. Region failover ke liye Hyderabad bhi utna hi bada hai jitna Mumbai.' },
        { id: 'hb', label: 'AZ-b', sub: '8 servers', x: 540, y: 390, w: 90, kind: 'server', info: 'Ye kya hai: Hyderabad ka doosra AZ, 8 app servers.' },
        { id: 'hc', label: 'AZ-c', sub: '8 servers', x: 650, y: 390, w: 90, kind: 'server', info: 'Ye kya hai: Hyderabad ka teesra AZ, 8 app servers.' },
        { id: 'dbH', label: 'DB replica', sub: '+ cache', x: 540, y: 510, w: 140, kind: 'data', info: 'Ye kya hai: database ki copy (replica) aur cache, Hyderabad mein. Reads yahin se. Mumbai gire to ise leader banaya ja sakta hai.' },
      ],
      edges: [
        { a: 'users', b: 'cdn', label: 'files' },
        { a: 'users', b: 'dns', n: 1 },
        { a: 'dns', b: 'lbM', n: 2 },
        { a: 'dns', b: 'lbH' },
        { a: 'lbM', b: 'ma' }, { a: 'lbM', b: 'mb', n: 3 }, { a: 'lbM', b: 'mc' },
        { a: 'lbH', b: 'ha' }, { a: 'lbH', b: 'hb' }, { a: 'lbH', b: 'hc' },
        { a: 'ma', b: 'dbM' }, { a: 'mb', b: 'dbM', n: 4 }, { a: 'mc', b: 'dbM' },
        { a: 'ha', b: 'dbH' }, { a: 'hb', b: 'dbH' }, { a: 'hc', b: 'dbH' },
        { a: 'dbM', b: 'dbH', label: 'replication', dashed: true },
      ],
      paths: [
        { name: 'Normal din', text: 'DNS ne aadhe users Mumbai, aadhe Hyderabad bheje. Har region 48 mein se 24 servers, load ~31%.', go: ['users>dns>lbM>mb>dbM', 'dns>lbH>hb>dbH'] },
        { name: 'AZ gira', text: 'Mumbai ka AZ-a gira. LB ne use hata diya. AZ-b aur AZ-c ke 16 servers ab ~47% pe. Koi naya server nahi chahiye.', go: ['bad:lbM>ma', 'users>dns>lbM>mb', 'lbM>mc'] },
        { name: 'Region gira', text: 'Poora Mumbai gaya. DNS ne sab users Hyderabad bheje. Hyderabad ke 24 servers ~63% pe. Isliye har region poore peak ke liye bana tha.', go: ['bad:dns>lbM', 'users>dns>lbH>ha', 'lbH>hb', 'lbH>hc'] },
        { name: 'Static files', text: 'Images aur JS CDN se. Ye requests servers tak aati hi nahi, isliye formula mein gini hi nahi jaatin.', go: ['users>cdn', 'res:cdn>users'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>servers = peak QPS ÷ ek server ki capacity × headroom (1.3-2). Peak, average nahi.</li>
      <li>Users se shuru: DAU × requests per user ÷ 10^5 = average QPS, × 2-5 = peak.</li>
      <li>Per-server number load test se. Estimate mein asli kaam wali request ke liye ~1k-2k req/s.</li>
      <li>N+1 / N+2: ek ya do extra servers, taaki deploy ke beech crash bhi jhel lo.</li>
      <li>k AZs mein ek gire to bhi chale: normal load ≤ (k−1)/k. 2 AZs → 50%, 3 AZs → ~67%. Har AZ mein kam se kam 2.</li>
      <li>Region failover: har region ko doosre ka traffic bhi uthana hai. 2 regions = har ek poore peak ke liye.</li>
      <li>Connections ke liye: concurrent users ÷ connections per gateway.</li>
      <li>Asli sawaal: kaunsa layer pehle tootega? Aam taur pe database, phir hot keys, phir connection limits.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Headroom + AZs: ek server ya poora AZ gire to bhi site chalti hai, bina emergency ke', 'Spikes aur deploys (jab kuch servers bahar hote hain) aaram se jhel jaate hain', 'Formula se number nikalta hai, guess ya darr se nahi'],
      costs: ['Paisa: 50-67% utilisation ka matlab hai 33-50% capacity zyada tar time khaali', 'Zyada servers = zyada DB connections, zyada deploys, zyada monitoring', 'Estimate galat per-server number pe tika ho to poora answer galat: load test zaroori'],
    },
    { type: 'think', questions: [
      { q: '2 AZs ya 3 AZs: kaunsa sasta hai agar AZ-loss jhelna zaroori hai? 60k req/s, 2k per server.', a: 'Bina headroom N = 30. 2 AZs mein AZ-loss ke baad bhi 30 chahiye ek AZ mein, to total 60 (50% utilisation). 3 AZs mein bache 2 AZs mein 30 chahiye, to 15 per AZ = 45 total (67%). 3 AZs 25% sasta, kyunki girne pe sirf ek-tihaai capacity jaati hai.' },
      { q: 'Autoscaling hai to headroom kyun? Load badhega to naye servers aa jaayenge.', a: 'Naye servers aane, boot hone, cache/JIT warm hone mein minutes lagte hain. Spike ya AZ failure seconds mein overload karta hai, aur overload se cascade. Autoscaling dheere badhte load ke liye hai; achanak jhatke ke liye pehle se rakha headroom. Aur outage ke waqt cloud ka control plane khud dabav mein ho sakta hai.' },
      { q: 'App servers 40% pe hain, lekin p99 latency kharab hai. Servers badhaoge?', a: 'Nahi, pehle dekho kaunsa layer bottleneck hai. Aksar database (slow queries, locks, connections ki limit), ya ek hot key, ya koi slow third party. App servers badhane se DB pe aur connections aur load aayega. Metrics se bottleneck dhoondho, phir wahi layer theek karo.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Peak 8,000 req/s, ek server 2,000 req/s, headroom 1.5. N kitna?', options: ['4', '6', '12'], answer: 1, explain: '8,000 ÷ 2,000 = 4; × 1.5 = 6.' },
      { q: '3 AZs barabar bharein. Ek AZ gira. Bache servers pe load kitna guna?', options: ['1.33×', '1.5×', '3×'], answer: 1, explain: 'Saara traffic ab 2/3 servers pe: 3/2 = 1.5 guna. Isliye 3 AZs ke saath normal load ~67% se kam.' },
      { q: 'N+2 ka matlab?', options: ['Peak ke liye zaroori servers + 2 extra', 'Servers ka double', '2 AZs'], answer: 0, explain: 'Do extra: ek deploy/maintenance mein bahar ho aur ek aur gir jaaye, tab bhi peak sambhal jaaye.' },
      { q: 'Servers ka estimate kis traffic pe?', options: ['Average', 'Peak (×2 se ×5 average), live events pe aur zyada', 'Sabse kam traffic'], answer: 1, explain: 'Peak pe site girti hai. Average pe size kiya to har raat 9 baje dikkat.' },
    ]},
    { type: 'sources', items: [
      { title: 'Static stability using Availability Zones', publisher: 'Amazon Builders\' Library', official: true, url: 'https://aws.amazon.com/builders-library/static-stability-using-availability-zones/', used: 'AZ girne pe naye servers launch kiye bina chalna; 3 AZs mein ~66% utilisation (50% overprovision) ka idea.' },
      { title: 'Regions and Availability Zones', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html', used: 'Region aur AZ ka matlab: ek region ke andar alag, isolated locations jo low-latency network se judi hain.' },
    ]},
  ],
});
