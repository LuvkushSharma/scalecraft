(function () {
  /* Shared step-by-step engine for the five algorithm visualisers. Each one passes its own algorithm (init/send/tick/panel). */
  const RLUI = { one: '1 request bhejo', burst: 'Burst ×10', t1: 'Ghadi +1 s', t5: 'Ghadi +5 s', reset: 'Reset', clock: 'Ghadi', ok: 'Allowed', no: 'Blocked (429)',
    legend: 'Timeline: har dot ek request. Hara = allowed, laal = blocked, peela = queue mein wait. Outline wala khaana = abhi ka second.', aria: 'Requests ki timeline',
    burstNote: (n, a, b, q) => `${n} requests ek saath: ${a} allowed${q ? `, ${q} queue mein` : ''}, ${b} blocked.` };
  const fmt = x => String(Math.round(x * 100) / 100);
  const COL = { ok: 'var(--green)', no: 'var(--red)', q: 'var(--amber)' };
  function rlViz(el, o) {
    const p = {};
    const sl = (o.params || []).map(q => `<div><label>${q.label}: <strong class="rv-${q.key}"></strong> ${q.unit}</label><input type="range" aria-label="${q.label}" data-k="${q.key}" min="${q.min}" max="${q.max}" step="${q.step}" value="${q.val}"></div>`).join('');
    el.innerHTML = `${sl ? `<div class="row2">${sl}</div>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
        <button type="button" class="btn small primary" data-a="one">${RLUI.one}</button>
        <button type="button" class="btn small" data-a="burst">${RLUI.burst}</button>
        <button type="button" class="btn small" data-a="t1">${RLUI.t1}</button>
        <button type="button" class="btn small" data-a="t5">${RLUI.t5}</button>
        ${(o.extra || []).map((x, i) => `<button type="button" class="btn small" data-x="${i}">${x.label}</button>`).join('')}
        <button type="button" class="btn small ghost" data-a="reset">${RLUI.reset}</button>
      </div>
      <div class="rv-panel" style="margin-top:14px"></div>
      <div style="font-size:13px;color:var(--ink-3);margin-top:12px">${RLUI.legend}</div>
      <div class="rv-tl"></div>
      <div class="stats rv-stats"></div>
      <div class="calc-note rv-note"></div>`;
    let s, reqs, t, note;
    const begin = () => { if (o.begin) o.begin(s); };
    const reset = () => { el.querySelectorAll('input[data-k]').forEach(i => { p[i.dataset.k] = Number(i.value); }); s = o.init(p); reqs = []; t = 0; note = o.start; draw(); };
    const send = n => { begin(); let a = 0, b = 0, q = 0, last = '';
      for (let i = 0; i < n; i++) { const r = { t, st: 'no', id: reqs.length + 1 }; last = o.send(s, t, r, p); reqs.push(r); if (r.st === 'ok') a++; else if (r.st === 'q') q++; else b++; }
      note = n > 1 ? RLUI.burstNote(n, a, b, q) + ' ' + last : last; draw(); };
    const tick = k => { begin(); let last = ''; for (let i = 0; i < k; i++) { t++; const m = o.tick ? o.tick(s, t, p, k > 1) : ''; if (m) last = m; } note = last || o.idle(s, t, p); draw(); };
    const draw = () => {
      (o.params || []).forEach(q => { el.querySelector('.rv-' + q.key).textContent = p[q.key]; });
      el.querySelector('.rv-panel').innerHTML = o.panel(s, t, p, reqs);
      const T0 = Math.max(0, t - 15), X = v => 24 + (v - T0) * 29;
      let svg = `<svg viewBox="0 0 640 120" width="100%" role="img" aria-label="${RLUI.aria}" style="font-family:var(--f-mono);display:block;margin-top:4px;min-width:520px">`;
      svg += o.overlay ? o.overlay(s, t, X, T0, p) : '';
      svg += `<rect x="${X(t) + 1}" y="22" width="27" height="72" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.5"/>`;
      for (let v = T0; v <= T0 + 20; v++) svg += `<line x1="${X(v)}" y1="96" x2="${X(v)}" y2="${v % 5 ? 100 : 104}" stroke="var(--line-2)"/>` + (v % 5 ? '' : `<text x="${X(v)}" y="116" font-size="11" text-anchor="middle" fill="var(--ink-3)">${v}s</text>`);
      svg += `<line x1="24" y1="96" x2="${X(T0 + 20)}" y2="96" stroke="var(--line-2)"/>`;
      const by = {}; reqs.forEach(r => { if (r.t >= T0 && r.t < T0 + 20) (by[r.t] = by[r.t] || []).push(r); });
      Object.keys(by).forEach(k => { const a = by[k], d = Math.min(7, 64 / a.length); a.forEach((r, i) => { svg += `<circle cx="${X(+k) + 14.5}" cy="${88 - i * d}" r="3.4" fill="${COL[r.st]}"/>`; }); });
      el.querySelector('.rv-tl').innerHTML = '<div style="overflow-x:auto">' + svg + '</svg></div>';
      const st = [[RLUI.clock, t + ' s'], [RLUI.ok, reqs.filter(r => r.st === 'ok').length], [RLUI.no, reqs.filter(r => r.st === 'no').length], ...(o.stats ? o.stats(s, t, p) : [])];
      el.querySelector('.rv-stats').innerHTML = st.map(([a, b]) => `<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join('');
      el.querySelector('.rv-note').innerHTML = note;
    };
    const api = { send, tick, reset, note: m => { note = m; draw(); } };
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => ({ one: () => send(1), burst: () => send(10), t1: () => tick(1), t5: () => tick(5), reset })[b.dataset.a]());
    el.querySelectorAll('[data-x]').forEach(b => b.onclick = () => o.extra[+b.dataset.x].run(api));
    el.querySelectorAll('input[data-k]').forEach(i => i.addEventListener('input', reset));
    reset();
  }

Lesson.register({
  id: 'rate-limiting',
  title: 'Rate limiting',
  minutes: 38,
  summary: `Ek client kitni requests bhej sakta hai, uski hadd. Bots, buggy scripts aur achanak spikes se system bachane ke liye. Is lesson mein paanchon algorithms (token bucket, leaky bucket, fixed window, sliding window log, sliding window counter), har ek ka apna simulator, Redis + Lua se distributed limiting, kahan aur kis cheez pe limit lagayein, 429 + Retry-After, client ka backoff, load shedding, aur AI products mein tokens se limit.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho tumhari website pe ek hi insaan (ya ek bot) ek second mein hazaar baar "refresh" dabata hai. Server sabka kaam chhod ke usi mein lag jaata hai, aur baaki sab users ke liye site atak jaati hai.<br>Rate limiting ek simple niyam hai: <strong>"har insaan ek minute mein itni hi baar maang sakta hai."</strong> Usse zyada maanga to jawab milta hai: "thoda ruko, phir aana."<br>Is lesson mein hum dekhenge ki ye ginti kaise karte hain (5 tareeke, sab khud chala ke), ye niyam kahan lagta hai, aur jab bahut saare servers ho tab bhi ginti sahi kaise rehti hai.` },
    { type: 'h2', text: 'Problem: ek client sabka system gira deta hai' },
    { type: 'p', html: `xyz.com ab bada ho gaya hai: Load Balancer, cache, queues, object storage, sab lag chuka. Ek raat teen cheezein ek saath hoti hain:` },
    { type: 'list', items: [
      `<strong>Bot attack:</strong> koi <code>POST /login</code> pe har minute 10,000 password guess bhej raha hai (password guessing, jise <em>credential stuffing</em> bhi kehte hain jab churaaye hue passwords try kiye jaayein).`,
      `<strong>Buggy client:</strong> ek partner company ki script mein bug hai. Error aane pe wo turant retry karti hai, bina ruke. 1 request ki jagah 500 per second.`,
      `<strong>Ek bhaari user:</strong> ek developer ne free API key se poore catalogue ko scrape karna shuru kar diya (scrape = program chala ke saara data copy kar lena).`,
    ]},
    { type: 'p', html: `Teeno mein ek hi baat: <strong>kuch clients apne hisse se kahin zyada maang rahe hain</strong>. Servers aur database utne hi hain. Nateeja: sab users ke liye site slow, aur shayad down. Autoscaling (load badhne pe apne aap naye servers chalu karna) bhi hal nahi: abuse ke liye naye servers ka bill tum bharoge, aur database phir bhi ek hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: rate limiting', html: `<strong>Ye kya hai:</strong> ek niyam jo kehta hai "ek client ek time window mein itni hi requests bhej sakta hai", jaise "100 requests per minute". Client matlab koi bhi pehchaan: ek user, ek IP address, ya ek API key.<br><strong>Kyun chahiye:</strong> taaki koi ek client (bot, buggy script, ya bhaari user) servers aur database ka saara time na kha jaaye.<br><strong>Iske bina:</strong> ek client ki galti ya badmaashi se sab users ke liye site slow ya down.<br><strong>Example:</strong> xyz.com ka login: ek IP se 10 attempts per minute. 11vi attempt ko turant "429: thoda ruko" milta hai, wo server tak pahunchti hi nahi.<br>Isko <strong>throttling</strong> bhi kehte hain. Lambe time ki hadd (jaise "10,000 per month") ko aksar <strong>quota</strong> kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: request aur 429', html: `<strong>Request</strong> = client ka server se ek baar kuch maangna (page kholna, login dabana, ek API call). <strong>429</strong> ek HTTP status code hai, yaani server ke jawab ka ek number. 200 matlab "theek hai", 404 matlab "nahi mila", aur <strong>429 Too Many Requests</strong> matlab "tumne bahut zyada maanga, thoda ruko". Iske baare mein aage detail mein padhenge.` },
    { type: 'compare',
      left: { title: 'Bina rate limit', ascii: `
Bot (10,000/min) ─┐
Buggy script ─────┼──> Servers ──> DB (overload)
Normal users ─────┘     (sab slow,
                        sab ke liye)` },
      right: { title: 'Rate limit ke saath', ascii: `
Bot ──────────> Limiter ──X 429
Buggy script ─> Limiter ──X 429 (thoda pass)
Normal users ─> Limiter ──────> Servers ──> DB
                (har client ki
                 apni hadd)` },
    },
    { type: 'h2', text: 'Rate limit kyun? Paanch seedhi wajah' },
    { type: 'list', ordered: true, items: [
      `<strong>Suraksha (security):</strong> password guess karne wale bot ko 10 tries per minute mile, to 10 lakh passwords try karne mein use lagbhag 70 din lagenge (10,00,000 ÷ 10 = 1 lakh minute). Attack bekaar ho jaata hai.`,
      `<strong>Bugs se bachaav:</strong> kisi ki script galti se loop mein phas gayi. Limit uski galti ko uske hisse tak rok deti hai.`,
      `<strong>Fairness (sabko barabar hissa):</strong> ek bhaari user poore server ko na le, baaki users ka hissa bhi bache.`,
      `<strong>Kharcha:</strong> kuch requests ka paisa lagta hai: har OTP SMS, har AI answer (GPU). Limit na ho to bill koi aur bana dega.`,
      `<strong>Capacity ka bharosa:</strong> tumhe pata hai DB 5,000 queries/second jhel sakta hai. Limits lagao to ye number kabhi paar nahi hoga, chahe bahar kuch bhi ho.`,
    ]},
    { type: 'h2', text: 'Rate limiter kahan baithta hai, chala ke dekho' },
    { type: 'callout', tone: 'term', title: 'Naya word: rate limiter aur API gateway', html: `<strong>Ye kya hai:</strong> <strong>rate limiter</strong> wo code hai jo har request pe poochhta hai "is client ka hisaab hadd ke andar hai?" Ye aksar <strong>API gateway</strong> mein lagta hai. API gateway sabhi API requests ka ek darwaza hai: request pehle yahan aati hai, phir sahi service tak jaati hai (resilience lesson mein detail mein aayega).<br><strong>Kyun chahiye:</strong> darwaze pe hi rok do, to faltu request andar ke servers aur database tak pahunchti hi nahi. Har service ko alag se ginti likhni nahi padti.<br><strong>Iske bina:</strong> har service apni ginti khud kare, sab alag alag niyam, aur abuse wali request andar tak pahunch ke paisa aur time kha jaaye.` },
    { type: 'callout', tone: 'term', title: 'Yaad karo: Redis', html: `<strong>Ye kya hai:</strong> ek bahut tez database jo data RAM mein rakhta hai (caching lesson mein dekha tha). Ek command lagbhag 1 ms se kam mein.<br><strong>Kyun chahiye:</strong> xyz.com ke kai gateway hain. Sabko ek hi ginti dikhni chahiye, to ginti ek shared jagah rakhte hain: Redis.<br><strong>Iske bina:</strong> har gateway apni alag ginti rakhega, aur client gateways badal badal ke hadd se kai guna zyada bhej dega (aage "Distributed limiting" mein dekhoge).` },
    { type: 'p', html: `Flow simple hai. Har request pe gateway Redis mein us client ka hisaab dekhta hai. Hadd ke andar: request aage bhejo. Hadd ke bahar: turant <code>429</code> lauta do. Neeche "Next step" dabao aur dekho:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'Riya', sub: 'normal user', x: 80, y: 70, w: 130, kind: 'client', info: 'Ye kya hai: ek normal user, xyz.com ka app chala rahi hai. Minute mein 20-30 requests. Achhi limit wo hai jo Riya ko kabhi mehsoos hi na ho.' },
        { id: 'bot', label: 'Bot', sub: '10k req/min', x: 80, y: 260, w: 130, kind: 'threat', info: 'Ye kya hai: ek program (bot) jo login pe lagatar password guess bhej raha hai, ek hi IP ya kuch IPs se. Isi ko rokna hai.' },
        { id: 'gw', label: 'API gateway', sub: 'rate limiter', x: 320, y: 165, w: 160, kind: 'edge', info: 'Ye kya hai: sabhi requests ka darwaza, aur isi mein rate limiter laga hai. Har request pe ek key banata hai (jaise "login:ip:1.2.3.4" ya "api:user:42"), Redis mein us key ka hisaab check karta hai, phir allow ya 429. Ye check ~1 ms ka hona chahiye, warna har request slow.' },
        { id: 'r', label: 'Redis', sub: 'counters / buckets', x: 570, y: 265, w: 160, kind: 'cache', info: 'Ye kya hai: RAM mein chalne wala tez database, yahan saare gateways ka shared hisaab (counters, buckets). Aise commands deta hai jo ek jhatke mein poore hote hain (INCR, Lua scripts), to ginti galat nahi hoti. Ye counters kho bhi jaayein to koi asli user data nahi khota, isliye Redis yahan achha fit hai.' },
        { id: 'app', label: 'App servers', sub: 'asli kaam', x: 570, y: 65, w: 160, kind: 'server', meter: true, load: 30, info: 'Ye kya hai: xyz.com ka asli kaam karne wale servers (login, feed, search). Rate limiter ka poora kaam inko bekaar ke traffic se bachaana hai.' },
      ],
      edges: [{ a: 'u', b: 'gw' }, { a: 'bot', b: 'gw' }, { a: 'gw', b: 'r' }, { a: 'gw', b: 'app' }],
      scenarios: [
        { name: 'Normal request', steps: [
          { title: 'Riya login karti hai', text: 'Request gateway pe aayi.', go: 'u>gw', msg: 'POST /login  (IP 49.36.x.x)' },
          { title: 'Hisaab check', text: 'Gateway Redis se poochhta hai: is IP ne pichhle minute mein kitni login requests ki? 1. Hadd 10 hai. Theek.', go: ['gw>r', 'res:r>gw'], after: { r: { sub: 'login:49.36..: 1/10' } }, msg: 'rate check  key=login:ip:49.36.x.x  →  allowed (remaining 9)' },
          { title: 'Aage bhejo', text: 'Request app server tak gayi aur jawab wapas. Saath mein headers jo client ko batate hain kitna bacha hai.', go: ['gw>app', 'res:app>gw', 'res:gw>u'], msg: '200 OK\nRateLimit-Policy: "login";q=10;w=60\nRateLimit: "login";r=9;t=60' },
        ]},
        { name: 'Bot ko 429', steps: [
          { title: 'Bot ki baadh', text: 'Bot lagatar requests bhej raha hai.', flood: { paths: ['bot>gw'], n: 10 }, after: { gw: { state: 'hot' } } },
          { title: 'Pehli 10 pass, phir band', text: 'Pehli 10 requests ki hadd poori. 11vi se gateway Redis dekh ke turant mana kar deta hai. App servers tak ek bhi extra request nahi gayi.', go: ['gw>r', 'res:r>gw', 'bad:gw>bot'], after: { r: { sub: 'login:bot: 10/10' } }, set: { app: { load: 30 } }, msg: '429 Too Many Requests\nRetry-After: 42\n{ "error": "too many login attempts, try after 42 s" }' },
          { title: 'App servers aaraam se', text: 'Riya ki requests normal chal rahi hain. Bot ka bojh gateway pe hi ruk gaya, aur 429 bhejna bahut sasta kaam hai.', go: ['u>gw>app', 'res:app>gw>u'], set: { gw: { state: '' } }, after: { app: { state: 'ok' } } },
        ]},
        { name: 'Redis down', intro: 'Limiter khud ek dependency hai. Wo gire to kya?', steps: [
          { title: 'Redis crash', text: 'Gateway hisaab check nahi kar pa raha.', set: { r: { state: 'down', sub: 'DOWN' } }, go: 'lost:gw>r' },
          { title: 'Option 1: fail-open', text: 'Limit check chhod do, sab requests jaane do. Site chalti rahegi, bas kuch der bina suraksha ke. Stripe ne apni rate limiting post (2017) mein yahi salah di thi: limiter ki gadbad se legit traffic nahi rukna chahiye.', go: ['u>gw>app', 'res:app>gw>u'] },
          { title: 'Option 2: fail-closed', text: 'Check nahi ho sakta to mana kar do. Login ya OTP jaise sensitive endpoints pe kabhi kabhi ye sahi hai (brute force ka darwaza khula nahi chhodna). Keemat: Redis gira = feature gira. Beech ka raasta: har gateway ki apni local, thodi dheeli limit as fallback.', go: 'bad:gw>u' },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Fail-open vs fail-closed', html: `<strong>Ye kya hai:</strong> jab koi suraksha wala hissa (limiter, login check) khud kharab ho jaaye, tab ka faisla. <strong>Fail-open</strong> = darwaza khula chhodo (site chalti rahe, availability pehle). <strong>Fail-closed</strong> = darwaza band karo (suraksha pehle).<br><strong>Kyun chahiye:</strong> Redis bhi kabhi girega. Pehle se tay hona chahiye ki tab kya karna hai.<br><strong>Iske bina:</strong> Redis gira aur ya to poori site band (sab fail-closed), ya OTP endpoint bina hadd ke khula (sab fail-open).<br>Har endpoint (API ka ek address, jaise <code>POST /login</code>) ka alag faisla ho sakta hai: feed API fail-open, OTP bhejna fail-closed.` },
    { type: 'p', html: `Ek baat aur: limit hamesha <strong>server ki taraf</strong> lagti hai. App ke andar "button 1 second mein ek hi baar dabe" jaisa code achha hai (bekaar requests kam), lekin us pe bharosa nahi kar sakte. Bot tumhara app use hi nahi karta, seedha API ko requests bhejta hai.` },

    { type: 'h2', text: 'Ginti kaise karein? Paanch algorithms' },
    { type: 'p', html: `Paanchon algorithms ek hi sawaal ka jawab dete hain: <strong>"ye nayi request allow karein ya nahi?"</strong> Farak teen cheezon mein hai: har client ke liye kitni <strong>memory</strong> lagti hai, ek saath aayi requests (<strong>burst</strong>) ke saath kya hota hai, aur ginti kitni <strong>sahi</strong> hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: burst', html: `<strong>Ye kya hai:</strong> bahut saari requests lagbhag ek hi pal mein. Jaise xyz.com ka app khulte hi 8 API calls ek saath bhejta hai (profile, feed, notifications...).<br><strong>Kyun zaroori:</strong> asli users bursty hote hain. Achha algorithm chhote, normal bursts ko jaane deta hai, aur bade abuse ko rokta hai.<br><strong>Iske bina (dhyaan na do to):</strong> ya to normal app khulte hi 429 khaata hai, ya bot ek bada burst maar ke nikal jaata hai.` },
    { type: 'p', html: `Har algorithm ke liye ek <strong>simulator</strong> hai. Ghadi tum chalaate ho: "Ghadi +1 s" se time aage badhta hai, "1 request bhejo" ya "Burst ×10" se requests jaati hain, aur andar ki halat (baalti, queue, counters, timestamps) live dikhti hai. Samajhna aasaan rahe isliye zyadatar simulators mein hadd <strong>5 requests per 10 seconds</strong> hai.` },

    { type: 'h2', text: 'Algorithm 1: token bucket (default choice)' },
    { type: 'p', html: `Socho har client ki ek <strong>baalti (bucket)</strong> hai jisme <strong>tokens</strong> (sikke jaise chhote ticket) pade hain.` },
    { type: 'steps', items: [
      { t: 'Har request ek token leti hai', d: 'Request aayi, baalti se ek token nikalo, request allow.' },
      { t: 'Token nahi bacha? Request blocked', d: 'Baalti khaali hai to request ko 429 milta hai.' },
      { t: 'Baalti apne aap bharti hai', d: 'Ek fixed speed se naye tokens aate rehte hain, jaise har 2 second mein 1 token.' },
      { t: 'Lekin capacity se zyada nahi', d: 'Baalti bhar gayi to naye tokens bekaar. Isliye koi bhi ek baar mein capacity se bada burst nahi maar sakta.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Token bucket ke do number', html: `<strong>Capacity (burst size):</strong> baalti mein max kitne tokens. Yahi tay karta hai ki ek saath kitni requests chal sakti hain.<br><strong>Refill rate:</strong> har second kitne naye tokens. Yahi lambe time ki average speed hai.<br><strong>Example:</strong> capacity 5, refill 0.5/s = "ek saath 5 tak chalega, lekin lambe time mein 0.5 per second (yaani 5 per 10 s) se zyada nahi".` },
    { type: 'p', html: `<strong>Chhota sa hisaab (capacity 5, refill 0.5/s):</strong>` },
    { type: 'table', head: ['Ghadi', 'Kya hua', 'Baalti mein tokens', 'Nateeja'], rows: [
      ['0 s', 'Shuru: baalti bhari', '5', ''],
      ['0 s', '10 requests ka burst', '5 → 0', '5 allowed, 5 blocked'],
      ['1 s', '+0.5 token aaya, 1 request', '0.5', 'Blocked (1 se kam). Retry-After = (1 − 0.5) ÷ 0.5 = 1 s'],
      ['2 s', '+0.5 token, 1 request', '1 → 0', 'Allowed'],
      ['12 s', '10 second kuch nahi bheja', '5 (capacity pe ruk gaya)', 'Baalti phir bhari, agla burst 5 tak'],
    ]},
    { type: 'p', html: `Ab khud chalao. Upar wali table wala hi kaam karo: "Burst ×10", phir "Ghadi +1 s", phir "1 request bhejo". Sliders se capacity aur refill rate badal ke dekho:` },
    { type: 'custom', render(el) {
      rlViz(el, {
        params: [
          { key: 'cap', label: 'Capacity', unit: 'tokens', min: 1, max: 10, step: 1, val: 5 },
          { key: 'rate', label: 'Refill rate', unit: 'tokens/sec', min: 0.5, max: 3, step: 0.5, val: 0.5 },
        ],
        start: 'Baalti bhari hai. "Burst ×10" dabao aur dekho kitni requests nikalti hain.',
        init: p => ({ tok: p.cap, used: 0 }),
        send: (s, t, r, p) => {
          if (s.tok >= 1 - 1e-9) { s.tok -= 1; s.used++; r.st = 'ok'; return `Allowed: ek token kharch hua. Baalti mein ab ${fmt(s.tok)} bache.`; }
          return `Blocked: baalti mein sirf ${fmt(s.tok)} token (1 se kam). Client ko 429 milega, Retry-After = (1 − ${fmt(s.tok)}) ÷ ${p.rate} = ${fmt((1 - s.tok) / p.rate)} s.`;
        },
        tick: (s, t, p, many) => { const b = s.tok; s.tok = Math.min(p.cap, s.tok + p.rate);
          return many ? '' : s.tok > b + 1e-9 ? `${t} s: +${fmt(s.tok - b)} token aaya (refill ${p.rate}/s). Baalti mein ab ${fmt(s.tok)} / ${p.cap}.` : `${t} s: baalti pehle se bhari (${p.cap}). Naya token bekaar gaya: capacity se zyada jama nahi hota.`; },
        idle: (s, t, p) => `${t} s: baalti mein ab ${fmt(s.tok)} / ${p.cap} tokens${s.tok >= p.cap - 1e-9 ? ' (bhari: isse zyada jama nahi honge)' : ''}.`,
        panel: (s, t, p) => {
          let h = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">';
          for (let i = 0; i < p.cap; i++) { const f = Math.max(0, Math.min(1, s.tok - i)) * 100;
            h += `<span style="width:26px;height:26px;border-radius:50%;border:2px solid var(--accent);background:linear-gradient(to top, var(--accent) ${f}%, transparent ${f}%)"></span>`; }
          return h + `</div><div style="font-size:14px;margin-top:8px;color:var(--ink-2)">Baalti: <strong>${fmt(s.tok)} / ${p.cap}</strong> tokens. Refill ${p.rate} per second, to khaali baalti ${fmt(p.cap / p.rate)} s mein poori bharti hai. Lambe time mein average ${p.rate}/s se zyada kabhi pass nahi hoga.</div>`;
        },
        stats: s => [['Tokens kharch', s.used]],
      });
    }},
    { type: 'p', html: `Andar se implement karna bahut sasta hai. Har second tokens "daalne" ka koi timer nahi chalta. Har client ke sirf do number store hote hain: <code>tokens</code> aur <code>last_refill_time</code>. Request aane pe hisaab laga lo ki pichhli baar se kitna time beeta, aur utne tokens jod do:` },
    { type: 'code', text: `
now     = current time
tokens  = min(capacity, tokens + (now - last_refill_time) * refill_rate)
last_refill_time = now
if tokens >= 1:  tokens -= 1;  ALLOW
else:            REJECT  (Retry-After = (1 - tokens) / refill_rate seconds)` },
    { type: 'list', items: [
      `<strong>Faayde:</strong> chhote bursts allow (capacity tak), lambe time ka average pakka (refill rate). Har client ke sirf 2 numbers. Ek request ka "cost" 1 se zyada bhi ho sakta hai (jaise mehenga search = 5 tokens).`,
      `<strong>Nuksaan:</strong> do knobs (capacity, rate) sahi chunne padte hain. Bhari baalti ka matlab: lambe time ke baad pehla burst capacity jitna bada ho sakta hai, to downstream ko ye burst jhelna aana chahiye.`,
      `<strong>Kahan use hota hai:</strong> AWS API Gateway apni throttling ko token bucket (rate + burst) se samjhaata hai. Stripe ki 2017 post Redis mein token bucket batati hai. Anthropic ki Claude API docs bhi limits ko token bucket ki tarah lagaati hain (capacity lagatar bharti hai).`,
    ]},
    { type: 'callout', tone: 'why', title: 'Token bucket default kyun?', html: `Asli users "bursty" hote hain: app khulte hi 8 API calls ek saath, phir 30 second kuch nahi. Token bucket ye chhote bursts aaram se jaane deta hai (capacity tak), lekin lambe time ki average speed pakki rakhta hai (refill rate). Aur har client ke liye sirf do numbers ki memory.` },
    { type: 'h2', text: 'Algorithm 2: leaky bucket' },
    { type: 'p', html: `Ab ulta socho. Baalti mein tokens nahi, <strong>requests</strong> bharti hain. Baalti ke neeche ek chhota chhed hai jisse requests <strong>fixed speed</strong> pe bahar nikal ke server tak jaati hain (jaise har 2 second mein ek). Baalti bhar gayi to nayi request bahar gir jaati hai (reject).` },
    { type: 'callout', tone: 'term', title: 'Naya word: queue (line)', html: `<strong>Ye kya hai:</strong> requests ki ek line. Jo pehle aaya, wo pehle jaata hai. Leaky bucket ki "baalti" asal mein yahi line hai.<br><strong>Kyun chahiye:</strong> burst mein aayi requests ko turant mana karne ki jagah line mein bitha do, aur server ko ek ek karke barabar speed se do.<br><strong>Iske bina:</strong> burst seedha server pe girta, aur kamzor server (jaise ek purani payment service jo 5/s se zyada nahi jhel sakti) atak jaata.` },
    { type: 'ascii', text: `
requests (bursty)  ▼▼▼▼▼ ▼   ▼▼▼
                 ┌───────────┐
                 │ ● ● ● ● ● │  queue (capacity 5)   bhar gayi? → reject
                 └─────┬─────┘
                       │  fixed rate: 1 request har 2 sec
                       ▼
                    Server   (hamesha smooth, kabhi burst nahi)` },
    { type: 'p', html: `<strong>Chhota sa hisaab (queue 5, rate 0.5/s yaani har 2 s mein ek):</strong> ghadi 0 s pe 10 requests ka burst aaya. Server khaali tha, to pehli request seedhi chali gayi. Agli 5 line mein lagin: wo 2, 4, 6, 8 aur 10 second baad server tak pahunchengi. Baaki 4 ke liye line mein jagah nahi, wo gir gayin. Dhyaan do: 5vi line wali request <strong>10 second</strong> wait karegi. Reject nahi hui, lekin bahut der se pahunchi.` },
    { type: 'p', html: `Chala ke dekho. "Burst ×10" dabao, phir "Ghadi +1 s" baar baar dabao aur dekho line kaise ek fixed speed se khaali hoti hai:` },
    { type: 'custom', render(el) {
      rlViz(el, {
        params: [
          { key: 'qcap', label: 'Queue capacity', unit: 'requests', min: 1, max: 10, step: 1, val: 5 },
          { key: 'rate', label: 'Leak rate', unit: 'requests/sec', min: 0.5, max: 2, step: 0.5, val: 0.5 },
        ],
        start: 'Queue khaali hai, server free hai. "Burst ×10" dabao.',
        init: () => ({ q: [], free: 0, drop: 0 }),
        send: (s, t, r, p) => {
          if (!s.q.length && s.free <= t + 1e-9) { r.st = 'ok'; s.free = t + 1 / p.rate; return 'Queue khaali thi aur server free: request seedhi server tak gayi, 0 s wait.'; }
          if (s.q.length < p.qcap) { r.st = 'q'; r.at = Math.max(s.free, t); s.free = r.at + 1 / p.rate; s.q.push(r); return `Line mein laga, position ${s.q.length}. Server tak ${fmt(r.at - t)} s baad pahunchega.`; }
          s.drop++; return `Queue bhari (${p.qcap}/${p.qcap}): request gir gayi (overflow). Server phir bhi sirf ${p.rate}/s hi dekhega.`;
        },
        tick: (s, t, p, many) => { let n = 0; while (s.q.length && s.q[0].at <= t + 1e-9) { s.q.shift().st = 'ok'; n++; }
          return n ? `${t} s: ${n} request line se nikal ke server tak gayi (fixed ${p.rate}/s). Line mein ab ${s.q.length}.` : many ? '' : (s.q.length ? `${t} s: is second koi nahi nikli (har ${fmt(1 / p.rate)} s mein ek). Line mein ${s.q.length}.` : `${t} s: line khaali, server bhi khaali baitha hai.`); },
        idle: (s, t) => `${t} s: line mein ${s.q.length}.`,
        panel: (s, t, p) => {
          let h = '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:13px;color:var(--ink-3)">Line:</span>';
          for (let i = 0; i < p.qcap; i++) { const r = s.q[i];
            h += `<span style="min-width:52px;padding:4px 6px;border-radius:8px;text-align:center;font:600 12px var(--f-mono);border:2px solid ${r ? 'var(--amber)' : 'var(--line-2)'};color:var(--ink)">${r ? `#${r.id}<br>${fmt(r.at - t)} s` : '&nbsp;<br>&nbsp;'}</span>`; }
          return h + `<span style="font:600 13px var(--f-mono);color:var(--ink-2)">→ server (${p.rate}/s)</span></div><div style="font-size:14px;margin-top:8px;color:var(--ink-2)">Har dabbe mein request number aur "server tak pahunchne mein kitna time bacha". Line mein <strong>${s.q.length}/${p.qcap}</strong>. Line ke aakhri wale ka extra wait: <strong>${s.q.length ? fmt(s.q[s.q.length - 1].at - t) : 0} s</strong>.</div>`;
        },
        stats: s => [['Line mein (peela)', s.q.length], ['Gir gayi (overflow)', s.drop]],
      });
    }},
    { type: 'list', items: [
      `<strong>Faayda:</strong> downstream ko bilkul smooth traffic milta hai. Kamzor service ya bahar ki API (jo "2 per second se zyada mat bhejo" bolti hai) ke liye perfect.`,
      `<strong>Nuksaan:</strong> burst mein aayi requests reject nahi, <em>wait</em> karti hain. Lambi line = zyada latency (upar 10 s tak!). User ke clicks ke liye ye aksar bura hai. Aur line bhari ho to nayi, zaroori request bhi gir jaati hai.`,
      `<strong>Kahan use hota hai:</strong> NGINX ka <code>limit_req</code> module apni docs mein khud ko "leaky bucket" method kehta hai. Wahan <code>burst=5</code> matlab 5 extra requests line mein ruk sakti hain (bilkul upar wale simulator jaisa), aur <code>nodelay</code> lagao to line mein wait nahi karwaata. Line bhari ho to NGINX default mein 503 lautata hai; <code>limit_req_status 429</code> se 429 kar sakte ho.`,
      `<strong>Dhyaan:</strong> "leaky bucket" naam do tarah use hota hai. Ek: upar wali queue. Doosra: ek counter jo fixed speed se ghatta hai (isko "meter" bhi kehte hain): bhar gaya to request turant 429, koi wait nahi. Ye doosra roop maths mein token bucket jaisa hi hai. Shopify ki REST Admin API yahi doosra roop use karti hai: baalti 40 requests ki, aur 2 per second khaali hoti hai. Interview mein bata do kaunsa matlab le rahe ho.`,
    ]},
    { type: 'h2', text: 'Algorithm 3: fixed window counter' },
    { type: 'p', html: `Sabse simple tareeka. Time ko barabar ke <strong>khaanon (windows)</strong> mein baanto, jaise 0-10 s, 10-20 s, 20-30 s. Har khaane ka ek <strong>counter</strong> (ginti). Request aayi: counter +1. Counter hadd pe pahuncha: baaki requests blocked. Naya khaana shuru: counter wapas zero.` },
    { type: 'callout', tone: 'term', title: 'Naya word: window aur counter', html: `<strong>Ye kya hai:</strong> <strong>window</strong> = time ka ek tukda, jaise "12:00 se 12:01 tak". <strong>Counter</strong> = ek number jo ginta hai ki is tukde mein kitni requests aayin.<br><strong>Kyun chahiye:</strong> "100 per minute" jaisi hadd ko check karne ka sabse sasta tareeka: har client ka sirf ek number.<br><strong>Iske bina:</strong> har request ka poora itihaas yaad rakhna padta (jo sliding log karta hai, aur wo mehenga hai).` },
    { type: 'p', html: `Redis mein ye sirf do commands hain. Key mein window ka number daal do, to har window ki apni key ban jaati hai:` },
    { type: 'code', text: `
key = "rl:user42:" + floor(now / 60)      # jaise rl:user42:29384712 (window number)
count = INCR key                           # atomic +1, naya count lautata hai
if count == 1: EXPIRE key 60               # purani keys apne aap hat jaayein
if count > 100: REJECT` },
    { type: 'p', html: `<strong>Chhota sa hisaab (hadd 5 per 10 s):</strong> ghadi 3 s pe 4 requests: counter 4, sab allowed. 7 s pe 3 requests: pehli allowed (counter 5), baaki 2 blocked. 10 s pe naya window, counter 0: ab phir 5 tak allowed. Bahut sasta aur samajhne mein aasaan. Lekin ek chhupa hua bug hai: <strong>boundary burst</strong>.` },
    { type: 'ascii', text: `
Hadd: 100 per minute

   window 12:00 - 12:01            window 12:01 - 12:02
|-------------------------------|-------------------------------|
                         100 req ▲▲▲ 100 req
                        12:00:59 │ 12:01:00
                                 │
            dono windows apni hadd mein, lekin 2 second mein 200 requests!` },
    { type: 'p', html: `Har window ne apne hisaab se sahi kaam kiya. Phir bhi boundary (do windows ki seema) ke aas paas client hadd se <strong>double</strong> bhej gaya. Agar server sach mein sirf 100/min jhel sakta hai, to wo isi pal girega. Simulator mein "Boundary trick chalao" dabao aur ye live dekho. Upar ki patti mein har window ka counter likha hai:` },
    { type: 'custom', render(el) {
      const W = 10, L = 5;
      rlViz(el, {
        start: 'Hadd 5 requests per 10 s window. Windows: 0-10 s, 10-20 s, 20-30 s...',
        init: () => ({ c: {} }),
        send: (s, t, r) => { const k = Math.floor(t / W); s.c[k] = s.c[k] || 0;
          if (s.c[k] < L) { s.c[k]++; r.st = 'ok'; return `Window ${k * W}-${k * W + W} s ka counter: ${s.c[k]}/${L}. Allowed.`; }
          return `Is window ka counter ${L}/${L}. Blocked jab tak ${(k + 1) * W} s pe naya window shuru na ho (Retry-After ${(k + 1) * W - t} s).`; },
        tick: (s, t) => t % W === 0 ? `${t} s: naya window shuru, counter wapas 0. Pichhle window mein kya hua, ye ab bhool gaye.` : '',
        idle: (s, t) => { const k = Math.floor(t / W); return `${t} s. Is window (${k * W}-${k * W + W} s) ka counter ${s.c[k] || 0}/${L}. Reset ${(k + 1) * W} s pe.`; },
        overlay: (s, t, X, T0) => { let g = '';
          for (let k = Math.floor(T0 / W); k * W < T0 + 20; k++) { const a = Math.max(T0, k * W), b = Math.min(T0 + 20, k * W + W);
            g += `<rect x="${X(a)}" y="2" width="${X(b) - X(a)}" height="94" fill="${k % 2 ? 'var(--surface-2)' : 'transparent'}" stroke="var(--line)"/><text x="${(X(a) + X(b)) / 2}" y="15" font-size="11" text-anchor="middle" fill="var(--ink-2)">${k * W}-${k * W + W}s: ${s.c[k] || 0}/${L}</text>`; }
          return g; },
        panel: (s, t, p, reqs) => { const k = Math.floor(t / W), c = s.c[k] || 0;
          const ts = reqs.filter(r => r.st === 'ok').map(r => r.t); let m = 0, from = 0, to = 0;
          for (let i = 0; i < ts.length; i++) { let n = 0, j = i; for (; j < ts.length && ts[j] < ts[i] + W; j++) n++; if (n > m) { m = n; from = ts[i]; to = ts[j - 1]; } }
          let h = `<div style="font-size:14px;color:var(--ink-2)">Abhi wala window: <strong>${k * W}-${k * W + W} s</strong> · counter <strong>${c}/${L}</strong> · reset <strong>${(k + 1) * W - t} s</strong> mein</div>`;
          h += `<div style="display:flex;gap:6px;margin-top:8px">${[...Array(L)].map((_, i) => `<span style="width:26px;height:14px;border-radius:4px;background:${i < c ? 'var(--accent)' : 'var(--surface-2)'};border:1px solid var(--line-2)"></span>`).join('')}</div>`;
          if (m > L) h += `<div style="margin-top:8px;color:var(--red);font-weight:600">Boundary burst: ${from} s se ${to} s ke beech ${m} requests allowed huin, jabki hadd ${L} per ${W} s thi.</div>`;
          return h; },
        extra: [{ label: 'Boundary trick chalao', run: api => { api.reset(); api.tick(9); api.send(10); api.tick(1); api.send(10);
          api.note('Ghadi 9 s pe 10 bheji: 5 allowed (pehle window ki hadd poori). 10 s pe naya window, counter 0: phir 5 allowed. Sirf 2 second (9 s aur 10 s) mein 10 requests pass ho gayin: hadd 5 per 10 s ka double.'); } }],
      });
    }},
    { type: 'list', items: [
      `<strong>Faayde:</strong> sabse sasta: har client ka ek counter, ek <code>INCR</code>. Samajhna aur users ko samjhaana aasaan ("har ghante 5,000, ghante ki shuruaat pe reset").`,
      `<strong>Nuksaan:</strong> boundary pe hadd ka double tak nikal sakta hai. Aur reset ke pal pe saare blocked clients ek saath wapas aate hain (ek chhota toofan).`,
      `<strong>Kahan use hota hai:</strong> lambe quotas (per day, per month) jahan boundary ka double chalta hai. GitHub ki REST API logged-in user ko 5,000 requests per hour deti hai, aur <code>x-ratelimit-reset</code> header batata hai ki ye ghante wala window kab reset hoga: fixed window ka hi roop.`,
    ]},
    { type: 'h2', text: 'Algorithm 4: sliding window log' },
    { type: 'p', html: `Boundary ka ilaaj: fixed khaane banao hi mat. Har allowed request ka <strong>timestamp</strong> (kis second pe aayi) ek list mein likh lo. Nayi request aaye to do kaam: (1) 10 second se purane timestamps list se hata do, (2) gino ki list mein kitne bache. Hadd se kam: allow, aur iska timestamp bhi likh lo. Ye 10 second ki window har pal aage <em>khisakti (slide)</em> hai, isliye koi boundary hi nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: timestamp aur log', html: `<strong>Ye kya hai:</strong> <strong>timestamp</strong> = ghadi ka time jab kuch hua (jaise "12:00:07"). <strong>Log</strong> = aise timestamps ki list, ek diary jaisi.<br><strong>Kyun chahiye:</strong> "pichhle 10 second mein kitni?" ka bilkul sahi jawab sirf tab mil sakta hai jab har request ka time yaad ho.<br><strong>Iske bina:</strong> sirf counters bachte hain, jo window ke andar requests kab aayin ye bhool jaate hain (aur boundary bug aata hai).` },
    { type: 'code', text: `
# Redis sorted set (har entry ka score = timestamp)
ZREMRANGEBYSCORE key 0 (now - 60s)    # 60 s se purane hatao
count = ZCARD key                     # bache kitne?
if count < 100:  ZADD key now req_id;  ALLOW
else:            REJECT` },
    { type: 'p', html: `<strong>Chhota sa hisaab (hadd 5 per 10 s):</strong> requests 1, 2, 3, 4 aur 5 second pe aayin: log = [1, 2, 3, 4, 5], sab allowed. 8 s pe ek aur: pichhle 10 s mein pehle se 5, blocked. 11 s pe: timestamp 1 ab 10 s purana, hat gaya. Log = [2, 3, 4, 5], to allowed, aur log = [2, 3, 4, 5, 11]. Kisi bhi 10 second mein 5 se zyada kabhi nahi.` },
    { type: 'p', html: `Simulator mein log ki list dekho. Ghadi aage badhao to purane timestamps kat ke gir jaate hain. "Boundary trick chalao" bhi dabao: is baar trick kaam nahi karegi.` },
    { type: 'custom', render(el) {
      const W = 10, L = 5;
      rlViz(el, {
        start: 'Log khaali hai. Hadd: kisi bhi 10 second mein 5.',
        begin: s => { s.gone = []; },
        init: () => ({ log: [], gone: [] }),
        send: (s, t, r) => { if (s.log.length < L) { s.log.push(t); r.st = 'ok'; return `Pichhle 10 s mein ${s.log.length - 1} the (5 se kam): allowed, aur timestamp ${t} s log mein likh liya.`; }
          return `Pichhle 10 s mein pehle se ${L}. Blocked. Sabse purana (${s.log[0]} s) ${s.log[0] + W} s pe hatega: Retry-After ${s.log[0] + W - t} s.`; },
        tick: (s, t) => { const out = []; while (s.log.length && s.log[0] <= t - W) out.push(s.log.shift()); s.gone = s.gone.concat(out);
          return out.length ? `${t} s: timestamps ${out.join(', ')} ab 10 s purane ho gaye, log se hata diye. Log mein ab ${s.log.length}.` : ''; },
        idle: (s, t) => `${t} s. Log mein ${s.log.length}/${L}. Window: ${Math.max(0, t - W + 1)} s se ${t} s tak ke seconds.`,
        overlay: (s, t, X, T0) => { const a = Math.max(T0, t - W + 1);
          return `<rect x="${X(a)}" y="2" width="${X(t + 1) - X(a)}" height="94" rx="6" fill="var(--accent-soft)" stroke="var(--accent)" stroke-dasharray="4 3"/><text x="${X(a) + 6}" y="15" font-size="11" fill="var(--ink-2)">pichhle 10 s</text>`; },
        panel: s => {
          const chip = (v, g) => `<span style="padding:3px 8px;border-radius:999px;font:600 12px var(--f-mono);border:1px solid ${g ? 'var(--line-2)' : 'var(--accent)'};color:${g ? 'var(--ink-3)' : 'var(--ink)'};${g ? 'text-decoration:line-through;' : ''}">${v} s</span>`;
          return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><span style="font-size:13px;color:var(--ink-3)">Log:</span>${s.log.map(v => chip(v)).join('') || '<span style="color:var(--ink-3)">(khaali)</span>'}${s.gone.map(v => chip(v, 1)).join('')}</div>
            <div style="font-size:14px;margin-top:8px;color:var(--ink-2)">Memory: is user ke <strong>${s.log.length}</strong> timestamps × 8 bytes = <strong>${s.log.length * 8} bytes</strong> (Redis ka apna overhead alag). Hadd 1,000 per hour ho to har user ke 1,000 timestamps tak. 1 crore users × 1,000 × 8 bytes = <strong>80 GB</strong>, sirf timestamps ke liye.</div>`; },
        stats: s => [['Log mein entries', s.log.length]],
        extra: [{ label: 'Boundary trick chalao', run: api => { api.reset(); api.tick(9); api.send(10); api.tick(1); api.send(10);
          api.note('9 s pe 5 allowed, log = [9, 9, 9, 9, 9]. 10 s pe log mein abhi bhi 5 (9 s wale 10 s purane nahi hue), to saari 10 blocked. Koi boundary nahi, koi double nahi.'); } }],
      });
    }},
    { type: 'list', items: [
      `<strong>Faayda:</strong> bilkul sahi. Kisi bhi 10 (ya 60) second mein hadd se zyada kabhi nahi.`,
      `<strong>Nuksaan:</strong> memory. Har allowed request ka ek timestamp. Hadd 10,000/hour hai to har user ke 10,000 tak. Upar dekha: crores users ke liye GBs. Aur har request pe Redis ke 3-4 operations.`,
      `<strong>Ek variant:</strong> kuch implementations blocked requests ka timestamp bhi log mein daalti hain. Tab jo client lagatar spam karta rahe, wo kabhi andar nahi aata jab tak ruke nahi.`,
      `<strong>Kahan use hota hai:</strong> jahan hadd chhoti hai aur ekdum sahi honi chahiye: login attempts, OTP ("5 per hour"), password reset. Chhoti hadd = chhota log, to memory ki dikkat nahi.`,
    ]},
    { type: 'h2', text: 'Algorithm 5: sliding window counter' },
    { type: 'p', html: `Beech ka raasta: fixed window jitna sasta, log jitna lagbhag sahi. Har client ke sirf <strong>do counters</strong>: <strong>pichhla window</strong> (jaise 0-10 s) aur <strong>abhi wala window</strong> (10-20 s). Pichhle window ke andar requests kab aayin, ye yaad nahi. To hum maan lete hain ki wo poore window mein <strong>barabar faili</strong> thin, aur andaza lagaate hain:` },
    { type: 'callout', tone: 'term', title: 'Naya word: weight (wazan)', html: `<strong>Ye kya hai:</strong> pichhle window ka kitna hissa abhi bhi "pichhle 10 second" mein aata hai. Abhi wale window ke 3 second beete hain, to pichhle 10 second mein pichhle window ke aakhri 7 second aate hain: weight = 7/10 = 0.7.<br><strong>Kyun chahiye:</strong> isse naye window ki shuruaat pe purani ginti ek jhatke mein zero nahi hoti, dheere dheere ghatti hai. Boundary burst khatam.<br><strong>Iske bina:</strong> ye fixed window ban jaata, boundary bug ke saath.` },
    { type: 'code', text: `
estimate = previous_count × weight + current_count
weight   = (window − abhi wale window mein beeta time) / window

Cloudflare ka example (hadd 50/min), abhi minute ke 15 s beete:
  pichhla minute = 42,  abhi tak = 18
  estimate = 42 × (60 − 15)/60 + 18 = 42 × 0.75 + 18 = 49.5   → 50 se kam, ALLOW` },
    { type: 'p', html: `<strong>Chhota sa hisaab (hadd 5 per 10 s):</strong> pichhle window (0-10 s) mein 4 requests, abhi ghadi 13 s, abhi wale window mein 1. Estimate = 4 × 0.7 + 1 = 3.8. 5 se kam: allow (current ab 2). Agli: 4 × 0.7 + 2 = 4.8: allow. Agli: 4 × 0.7 + 3 = 5.8: block.` },
    { type: 'p', html: `Simulator mein formula live chalta hai. "Boundary trick chalao" dabao, phir ghadi aage badha ke dekho ki pichhle window ka wazan kaise ghatta hai:` },
    { type: 'custom', render(el) {
      const W = 10, L = 5;
      const calc = (s, t) => { const k = Math.floor(t / W), e = t - k * W, prev = s.c[k - 1] || 0, cur = s.c[k] || 0, w = (W - e) / W; return { k, e, prev, cur, w, est: prev * w + cur }; };
      const line = x => `${x.prev} × (10 − ${x.e})/10 + ${x.cur} = ${x.prev} × ${fmt(x.w)} + ${x.cur} = <strong>${fmt(x.est)}</strong>`;
      rlViz(el, {
        start: 'Hadd 5 per 10 s. Do counters: pichhla window aur abhi wala window.',
        init: () => ({ c: {} }),
        send: (s, t, r) => { const x = calc(s, t);
          if (x.est < L) { s.c[x.k] = x.cur + 1; r.st = 'ok'; return `${line(x)} &lt; ${L} → ALLOW. Abhi wala counter ab ${x.cur + 1}.`; }
          return `${line(x)} ≥ ${L} → BLOCK (429).`; },
        tick: (s, t) => t % W === 0 ? `${t} s: naya window. "Abhi wala" counter ab "pichhla" ban gaya (${s.c[t / W - 1] || 0}), naya counter 0. Lekin weight abhi 1.0 hai, to purani ginti ek dum gayab nahi hui.` : '',
        idle: (s, t) => { const x = calc(s, t); return `${t} s. Abhi ka estimate: ${line(x)}. Agli request ${x.est < L ? 'allow' : 'block'} hogi.`; },
        overlay: (s, t, X, T0) => { const x = calc(s, t); let g = '';
          [[x.k - 1, 'pichhla'], [x.k, 'abhi']].forEach(([k, nm]) => { if (k < 0) return; const a = Math.max(T0, k * W), b = Math.min(T0 + 20, k * W + W); if (b <= a) return;
            g += `<rect x="${X(a)}" y="2" width="${X(b) - X(a)}" height="94" fill="${nm === 'abhi' ? 'var(--surface-2)' : 'transparent'}" stroke="var(--line)"/><text x="${(X(a) + X(b)) / 2}" y="15" font-size="11" text-anchor="middle" fill="var(--ink-2)">${nm}: ${s.c[k] || 0}</text>`; });
          const a = Math.max(T0, t - W + 1);
          return g + `<rect x="${X(a)}" y="20" width="${X(t + 1) - X(a)}" height="76" rx="6" fill="none" stroke="var(--accent)" stroke-dasharray="4 3"/>`; },
        panel: (s, t) => { const x = calc(s, t);
          const box = (nm, v, sub) => `<div style="flex:1;min-width:120px;padding:8px 10px;border:1px solid var(--line-2);border-radius:10px"><div style="font-size:12px;color:var(--ink-3)">${nm}</div><div style="font:700 20px var(--f-display);color:var(--ink)">${v}</div><div style="font-size:12px;color:var(--ink-3)">${sub}</div></div>`;
          return `<div style="display:flex;flex-wrap:wrap;gap:8px">${box('Pichhla window', x.prev, x.k ? `${(x.k - 1) * W}-${x.k * W} s` : '(abhi nahi)')}${box('Abhi wala window', x.cur, `${x.k * W}-${x.k * W + W} s, ${x.e} s beete`)}${box('Weight', fmt(x.w), `(10 − ${x.e}) / 10`)}</div>
            <div style="margin-top:10px;font:14px var(--f-mono);color:var(--ink)">estimate = ${line(x)} ${x.est < L ? '&lt;' : '≥'} ${L} → agli request <strong style="color:${x.est < L ? 'var(--green)' : 'var(--red)'}">${x.est < L ? 'ALLOW' : 'BLOCK'}</strong></div>`; },
        stats: s => [['Memory', '2 counters']],
        extra: [{ label: 'Boundary trick chalao', run: api => { api.reset(); api.tick(9); api.send(10); api.tick(1); api.send(10);
          api.note('9 s pe 5 allowed. 10 s pe naya window, lekin estimate = 5 × 1.0 + 0 = 5: saari 10 blocked. Ab "Ghadi +5 s" dabao: 15 s pe weight 0.5, estimate 2.5, to phir se 3 requests allowed hongi.'); } }],
      });
    }},
    { type: 'p', html: `Cloudflare ne 2017 ki ek post mein bataya ki unke 40 crore requests ke test mein is andaze se sirf 0.003% requests galat allow ya reject huin. Memory: har client ke sirf do numbers. Isliye bade CDNs aur gateways mein ye bahut popular hai.` },
    { type: 'list', items: [
      `<strong>Faayde:</strong> 2 counters ki memory, boundary burst lagbhag khatam, aur hisaab bahut sasta.`,
      `<strong>Nuksaan:</strong> ye andaza hai, exact nahi. Aur do keys padhni padti hain (pichhli + abhi wali).`,
      `<strong>Kahan use hota hai:</strong> Cloudflare ka rate limiting (unki 2017 engineering post), aur kai API gateways jo bade scale pe sasta + achha hisaab chahte hain.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "sliding counter bilkul exact hai"', html: `Nahi, ye ek <strong>andaza</strong> hai. Ye maanta hai ki pichhli window ki requests barabar faili thin. Agar saari pichhli requests window ke aakhri second mein aayi thin, to andaza thoda galat hoga (kabhi thoda zyada allow, kabhi thoda zyada strict). Zyadatar APIs ke liye ye chhoti galti chalti hai. Paisa ya security jahan ekdum exact limit chahiye, wahan log ya token bucket.` },
    { type: 'h2', text: 'Paanchon ek saath: same requests, alag faisle' },
    { type: 'p', html: `Hadd sabke liye same: <strong>10 requests per 10 seconds</strong> (token bucket: capacity 10, refill 1/s; leaky bucket: queue 10, 1/s nikalti hai). Traffic pattern chuno. Har dot ek request hai: hara = allowed, laal = rejected.` },
    { type: 'custom', render(el) {
      const L = 10, W = 10, r2 = x => Math.round(x * 100) / 100;
      const seq = (n, a, d) => [...Array(n)].map((_, i) => r2(a + i * d));
      const TL = {
        boundary: { name: 'Boundary burst', ts: seq(10, 8, 0.2).concat(seq(10, 10, 0.2)) },
        steady: { name: 'Lagatar 2/s', ts: seq(30, 0, 0.5) },
        burst: { name: 'Ek bada burst', ts: seq(25, 2, 0.02).concat([15, 16, 17, 18, 19]) },
      };
      const ALG = [
        ['Token bucket', ts => { let tok = L, last = 0; return ts.map(t => { tok = Math.min(L, tok + (t - last) * (L / W)); last = t; if (tok >= 1 - 1e-9) { tok -= 1; return 1; } return 0; }); }],
        ['Leaky bucket', ts => { let q = [], free = 0; return ts.map(t => { q = q.filter(d => d > t); if (q.length < L) { const d = Math.max(t, free) + W / L; free = d; q.push(d); return 1; } return 0; }); }],
        ['Fixed window', ts => { const c = {}; return ts.map(t => { const k = Math.floor(t / W); c[k] = c[k] || 0; if (c[k] < L) { c[k]++; return 1; } return 0; }); }],
        ['Sliding log', ts => { const log = []; return ts.map(t => { while (log.length && log[0] <= t - W) log.shift(); if (log.length < L) { log.push(t); return 1; } return 0; }); }],
        ['Sliding counter', ts => { const c = {}; return ts.map(t => { const k = Math.floor(t / W), el2 = t - k * W; const est = (c[k - 1] || 0) * (1 - el2 / W) + (c[k] || 0); if (est < L) { c[k] = (c[k] || 0) + 1; return 1; } return 0; }); }],
      ];
      const maxIn = (ts, a) => { const acc = ts.filter((_, i) => a[i]); let m = 0; for (let i = 0; i < acc.length; i++) { let n = 0; for (let j = i; j < acc.length && acc[j] < acc[i] + W - 1e-9; j++) n++; m = Math.max(m, n); } return m; };
      const NOTE = {
        boundary: 'Fixed window ne 4 second mein saari 20 pass kar di (dono windows "apni hadd" mein the). Sliding log ne kisi bhi 10 s mein 10 se zyada nahi jaane diya. Token bucket ne 10 ka burst + raaste mein bane tokens jaane diye. Sliding counter andaza hai, isliye 12.',
        steady: 'Hadd se double speed. Token bucket shuru mein poori baalti (10) kharch karta hai, phir 1/s: isliye kisi 10 s mein 19 tak dikh sakti hain (capacity + refill × 10). Leaky bucket ne bhi utni hi li, lekin unhe queue mein bitha ke 1/s pe chhoda: ek request ko 10 s tak wait.',
        burst: 'Aadhe second mein 25. Sabne 10 hi li. Leaky bucket ki 10 requests reject nahi hui lekin queue mein 10 s tak wait karti rahin. Baad ki dheemi requests sab algorithms ne allow ki.',
      };
      let cur = 'boundary';
      el.innerHTML = `<div class="rlP" style="display:flex;flex-wrap:wrap;gap:8px"></div><div class="rlSvg" style="margin-top:12px"></div>
        <div class="rlTbl" style="overflow-x:auto"></div><div class="calc-note rlCN"></div>`;
      const run = () => {
        const box = el.querySelector('.rlP'); box.innerHTML = '';
        Object.keys(TL).forEach(k => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (k === cur ? ' primary' : ''); b.textContent = TL[k].name; b.onclick = () => { cur = k; run(); }; box.appendChild(b); });
        const ts = TL[cur].ts, T = Math.max(20, Math.ceil(ts[ts.length - 1] + 1));
        const X = t => 118 + t / T * 510, rowH = 34, H = ALG.length * rowH + 30;
        let svg = `<svg viewBox="0 0 640 ${H}" width="100%" role="img" aria-label="Request timeline per algorithm" style="font-family:var(--f-mono)">`;
        for (let s = 0; s <= T; s += 5) svg += `<line x1="${X(s)}" y1="4" x2="${X(s)}" y2="${H - 22}" stroke="var(--line)" ${s % 10 ? 'stroke-dasharray="3 3"' : ''}/><text x="${X(s)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="var(--ink-3)">${s}s</text>`;
        const rows = ALG.map(([name, f], i) => {
          const a = f(ts), y = 4 + i * rowH + rowH / 2;
          svg += `<text x="4" y="${y + 4}" font-size="12" fill="var(--ink)">${name}</text>`;
          ts.forEach((t, j) => { svg += `<circle cx="${X(t)}" cy="${y + (j % 2 ? 5 : -5)}" r="3.6" fill="${a[j] ? 'var(--green)' : 'var(--red)'}"/>`; });
          return [name, a.filter(x => x).length, a.filter(x => !x).length, maxIn(ts, a)];
        });
        svg += '</svg>';
        el.querySelector('.rlSvg').innerHTML = svg;
        el.querySelector('.rlTbl').innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px"><tr style="text-align:left;color:var(--ink-3)"><th>Algorithm</th><th>Allowed</th><th>Rejected</th><th>Kisi bhi 10 s mein max</th></tr>` +
          rows.map(r => `<tr style="border-top:1px solid var(--line)"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td style="color:${r[3] > L ? 'var(--red)' : 'var(--ink)'};font-weight:600">${r[3]}</td></tr>`).join('') + '</table>';
        el.querySelector('.rlCN').textContent = NOTE[cur];
      };
      run();
    }},
    { type: 'table', head: ['Algorithm', 'Memory per client', 'Bursts', 'Sahi kitna', 'Kab'], rows: [
      ['Token bucket', '2 numbers', 'Capacity tak allow', 'Average pakka, burst ki ijazat', 'Default: public APIs, user actions'],
      ['Leaky bucket (queue)', 'Queue', 'Queue mein wait', 'Output bilkul smooth', 'Kamzor downstream ko bachaana'],
      ['Fixed window', '1 counter', 'Boundary pe 2x tak', 'Sabse kam', 'Simple quotas (per day/month)'],
      ['Sliding window log', 'Har request ka timestamp', 'Kabhi hadd paar nahi', 'Exact', 'Chhoti hadd, strict (login, OTP)'],
      ['Sliding window counter', '2 counters', 'Thoda andaza', 'Lagbhag (Cloudflare: 0.003% galat)', 'Bade scale pe sasta + achha'],
    ]},
    { type: 'h2', text: 'Distributed limiting: Redis + Lua' },
    { type: 'p', html: `xyz.com ke paas ek gateway nahi, 10 hain (Load Balancer ke peeche). Agar har gateway apni memory mein hisaab rakhe, to hadd 100/min ka matlab asal mein 10 × 100 = 1,000/min ho gaya, kyunki Load Balancer client ki requests sab gateways mein baant deta hai. Isliye hisaab ek <strong>shared</strong> jagah chahiye: Redis.` },
    { type: 'p', html: `Lekin shared hisaab ke saath ek nayi problem aati hai: <strong>race condition</strong>. Dekho kya hota hai jab do gateways ek hi waqt pe same client ka counter padhte hain:` },
    { type: 'callout', tone: 'term', title: 'Naya word: race condition aur atomic', html: `<strong>Ye kya hai:</strong> <strong>race condition</strong> = do kaam ek saath chal rahe hain, aur nateeja is pe nirbhar hai ki kaun pehle pahuncha. "Padho → check karo → likho" teen alag steps hain. Beech mein koi doosra wahi number badal sakta hai. <strong>Atomic</strong> operation = jo ek hi jhatke mein poora hota hai, beech mein koi ghus nahi sakta.<br><strong>Kyun zaroori:</strong> rate limiter ki ginti tabhi sahi hai jab "padho + badhao + check" atomic ho.<br><strong>Iske bina:</strong> do gateways ek saath ek hi purana number padhte hain, dono allow kar dete hain, aur hadd chupke se toot jaati hai. Neeche chala ke dekho.` },
    { type: 'flow', height: 320,
      nodes: [
        { id: 'c', label: 'Client', sub: 'hadd 100/min', x: 80, y: 160, w: 130, kind: 'client', info: 'Ye kya hai: ek app ya script jiski hadd 100 per minute hai. Is minute mein 99 requests ho chuki hain. Ab do requests lagbhag ek saath bhejta hai, aur Load Balancer unhe do alag gateways pe bhej deta hai.' },
        { id: 'g1', label: 'Gateway 1', x: 320, y: 60, w: 150, kind: 'edge', info: 'Ye kya hai: API gateway ki ek copy (instance). Doosre gateway ke baare mein kuch nahi jaanta, isliye ginti ke liye Redis pe nirbhar hai.' },
        { id: 'g2', label: 'Gateway 2', x: 320, y: 260, w: 150, kind: 'edge', info: 'Ye kya hai: API gateway ki doosri copy, same kaam. Load Balancer requests dono mein baant deta hai.' },
        { id: 'r', label: 'Redis', sub: 'count = 99', x: 580, y: 160, w: 160, kind: 'cache', info: 'Ye kya hai: dono gateways ka shared counter. Redis commands ek ek karke chalta hai, lekin tumhare do commands ke BEECH mein doosre gateway ka command aa sakta hai. INCR ya Lua script poora ek hi command ki tarah chalta hai, beech mein koi nahi ghusta.' },
      ],
      edges: [{ a: 'c', b: 'g1' }, { a: 'c', b: 'g2' }, { a: 'g1', b: 'r' }, { a: 'g2', b: 'r' }],
      scenarios: [
        { name: 'Race: GET, phir SET', steps: [
          { title: 'Do requests ek saath', text: 'Request #100 aur #101, alag gateways pe.', parallel: true, go: ['c>g1', 'c>g2'] },
          { title: 'Dono ne padha: 99', text: 'Dono ne count padha. Dono ko 99 mila, kyunki abhi kisi ne likha nahi.', parallel: true, go: ['g1>r', 'g2>r', 'res:r>g1', 'res:r>g2'], msg: 'Gateway 1: GET rl:c  →  99\nGateway 2: GET rl:c  →  99' },
          { title: 'Dono ne socha: 99 < 100, allow', text: 'Dono ne apne hisaab se sahi kiya.', parallel: true, go: ['g1>r', 'g2>r'], after: { r: { state: 'warn', sub: 'count = 100 (?!)' } }, msg: 'Gateway 1: SET rl:c 100\nGateway 2: SET rl:c 100' },
          { title: 'Nateeja: 101 requests pass, count 100', text: 'Ek request hadd ke upar nikal gayi, aur counter ne use gina bhi nahi. 10 gateways aur bot ke hazaaron parallel requests ke saath ye galti bahut badi ho jaati hai.', parallel: true, go: ['res:g1>c', 'res:g2>c'] },
        ]},
        { name: 'Fix: atomic (INCR / Lua)', steps: [
          { title: 'Do requests ek saath', text: 'Same situation.', parallel: true, go: ['c>g1', 'c>g2'], set: { r: { sub: 'count = 99' } } },
          { title: 'Ek hi atomic command', text: 'Padhna + badhana + check, sab Redis ke andar ek command mein. Redis ek waqt mein ek command/script chalata hai, to dono ek ke baad ek chalte hain.', go: ['g1>r', 'res:r>g1'], after: { r: { sub: 'count = 100' } }, msg: 'Gateway 1: INCR rl:c  →  100   (≤ 100, allow)' },
          { title: 'Doosra 101 dekhta hai', text: 'Gateway 2 ko 101 milta hai: hadd paar, 429.', go: ['g2>r', 'res:r>g2', 'bad:g2>c'], after: { r: { state: 'ok', sub: 'count = 101' } }, msg: 'Gateway 2: INCR rl:c  →  101   (> 100, reject 429)' },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Naya word: Lua script', html: `<strong>Ye kya hai:</strong> Lua ek chhoti programming language hai. Redis tumhe Lua ka chhota sa program (script) bhejne deta hai, jo Redis ke andar hi chalta hai.<br><strong>Kyun chahiye:</strong> token bucket mein kai steps hain (padho, hisaab lagao, likho). Script mein daal do to Redis use ek hi jhatke mein chalata hai: atomic, aur network ka sirf ek chakkar.<br><strong>Iske bina:</strong> har step ek alag network call, beech mein race condition, aur zyada latency.` },
    { type: 'p', html: `Fixed window ke liye Redis ka <code>INCR</code> akela atomic hai, kaafi hai. Lekin token bucket mein do fields padhne, hisaab lagaana, aur do fields likhne hain. Ye Redis ke ek command mein nahi hota. Hal: <strong>Lua script</strong>. Redis docs ke mutabik script chalte waqt server aur kuch nahi chalata, to poora script atomic hai. Saath mein network ka ek hi round trip.` },
    { type: 'code', text: `
-- token_bucket.lua    KEYS[1] = bucket key
-- ARGV: capacity, refill_per_sec, now_ms, cost
local b    = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local cap  = tonumber(ARGV[1]);  local rate = tonumber(ARGV[2])
local now  = tonumber(ARGV[3]);  local cost = tonumber(ARGV[4])
local tokens = tonumber(b[1]) or cap        -- naya client: poori baalti
local ts     = tonumber(b[2]) or now
local elapsed = math.max(0, now - ts) / 1000 -- clock peeche gayi to negative nahi
tokens = math.min(cap, tokens + elapsed * rate)
local allowed = 0
if tokens >= cost then tokens = tokens - cost; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000))  -- bhari baalti = key ki zaroorat nahi
return { allowed, tostring(tokens) }   -- Lua number Redis mein integer ban jaata, isliye string` },
    { type: 'list', items: [
      `<strong>Latency:</strong> har request pe ek Redis round trip (~1 ms ek data center ke andar). Gateway aur Redis paas paas rakho.`,
      `<strong>Scale:</strong> ek Redis node bahut kuch sambhal leta hai, phir bhi zyada ho to Redis Cluster mein keys client ke hisaab se shard ho jaati hain. Ek client ki saari keys ek node pe, isliye script phir bhi atomic.`,
      `<strong>Clock:</strong> gateways ki ghadiyan thodi alag ho sakti hain. Isliye script mein <code>max(0, ...)</code>. Kuch log Redis ka apna <code>TIME</code> use karte hain taaki sab ek hi ghadi dekhein.`,
      `<strong>Aur sasta chahiye?</strong> Har gateway thodi der local count kare aur har kuch sau ms mein Redis mein jod de. Thoda kam sahi, bahut kam Redis calls. Bahut bade scale pe ye trade-off common hai.`,
    ]},
    { type: 'h2', text: 'Kahan limit lagayein, aur kis cheez pe?' },
    { type: 'p', html: `Rate limit ek jagah nahi, kai <strong>layers</strong> mein lagti hai. Jitna bahar, utna sasta rokna; jitna andar, utna zyada context.` },
    { type: 'table', head: ['Layer', 'Kis pe limit', 'Kya rokta hai'], rows: [
      ['Edge / CDN / WAF', 'IP address', 'Bade bot floods, DDoS (hazaaron machines se ek saath hamla) jaisi baadh. WAF (Web Application Firewall) edge pe baitha ek filter hai jo bure requests pehchaan ke rokta hai. Request tumhare data center tak aati hi nahi.'],
      ['API gateway', 'User ID, API key, endpoint', 'Har customer ki hadd (plan ke hisaab se), har endpoint ki alag hadd (login 10/min, feed 600/min).'],
      ['Service ke andar', 'Mehenga operation', 'Jaise "report export" jo DB ko 30 s pakadta hai: ek user ek waqt mein 2 se zyada nahi.'],
      ['Downstream call ke aage', 'Bahar ki API', 'Payment ya SMS provider ki apni hadd hai; unhe hadd se zyada mat bhejo.'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: limit key', html: `<strong>Ye kya hai:</strong> wo pehchaan jiske naam pe ginti hoti hai. Redis mein ye key ka naam ban jaati hai, jaise <code>rl:user:42</code> ya <code>rl:ip:49.36.1.7</code> ya <code>rl:apikey:abc123</code>.<br><strong>Kyun zaroori:</strong> key hi tay karti hai ki "ek client" kaun hai. Galat key = galat logon ki ginti ek saath ho jaati hai.<br><strong>Iske bina (galat chuni to):</strong> ya to bekasoor log saath mein block, ya bot nayi pehchaan bana ke bach nikalta hai.` },
    { type: 'list', items: [
      `<strong>Per user:</strong> logged-in users ke liye sabse fair. Ek user = ek hisaab.`,
      `<strong>Per IP:</strong> login se pehle (login page, signup, OTP) yahi ek pehchaan hai. Lekin dhyaan: ek college ya office ke hazaaron log internet pe ek hi public IP se dikhte hain (router sabka traffic ek IP ke peeche chhupa deta hai, isko <strong>NAT</strong> kehte hain). Aur ek attacker hazaaron IPs se aa sakta hai.`,
      `<strong>Per API key:</strong> API key ek lamba secret code hai jo developer har request ke saath bhejta hai, taaki server jaane request kiski hai. Developers aur partners ke liye yahi pehchaan hai. Plans isi se bante hain: free 60/min, paid 6,000/min.`,
      `<strong>Global:</strong> sabko mila ke ek hadd, jaise "is endpoint pe total 50,000/s", taaki backend ki asli capacity se zyada kabhi na aaye.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: sirf IP pe limit', html: `Sirf IP pe limit lagaayi to do galtiyan ek saath: (1) ek hostel ke 500 students ek IP share karte hain, unme se ek ki galti se sab block. (2) Bot 10,000 alag IPs (botnet, cloud machines) se aata hai aur har IP hadd ke andar rehta hai. Isliye layers milaao: IP pe dheeli limit, account/API key pe asli limit, aur login jaise endpoints pe "is username pe" alag limit.` },

    { type: 'h2', text: 'Mana kaise karein: 429, Retry-After, headers' },
    { type: 'p', html: `Reject karna bhi ek API hai. Client ko saaf batao kya hua aur kab wapas aaye. Ye kaam <strong>headers</strong> karte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: header aur Retry-After', html: `<strong>Ye kya hai:</strong> <strong>header</strong> = jawab ke saath chipki chhoti si extra jaankari (naam: value), jo user ko nahi, client ke code ko dikhti hai. <strong>Retry-After</strong> ek header hai jo kehta hai "itne second baad dobara aana".<br><strong>Kyun chahiye:</strong> client ko andaza nahi lagana padta. Wo theek utni der rukta hai jitni zaroori hai.<br><strong>Iske bina:</strong> client ya to turant retry karke aur 429 khaata hai (bekaar load), ya bahut der tak rukta hai (bekaar wait).` },
    { type: 'code', text: `
HTTP/1.1 429 Too Many Requests
Retry-After: 30
RateLimit-Policy: "default";q=100;w=60
RateLimit: "default";r=0;t=30
Content-Type: application/json

{ "error": "rate_limited", "message": "100 requests per minute. 30 s baad try karo." }` },
    { type: 'list', items: [
      `<code>429 Too Many Requests</code> RFC 6585 mein define hai. Spec jaan bujh ke ye nahi batata ki user kaise pehchaano ya ginti kaise karo; wo tumhara design hai.`,
      `<code>Retry-After</code>: kitne second baad (ya kis time ke baad) dobara aao. Achhe clients (aur SDKs) isko maante hain.`,
      `<code>RateLimit-Policy</code> / <code>RateLimit</code>: IETF ka ek draft standard jo hadd aur bachi hui quota batata hai. <code>q</code> = kul hadd, <code>w</code> = window (seconds), <code>r</code> = kitni bachi, <code>t</code> = kitne second mein reset. Ye abhi RFC nahi bana: 2026 mein bhi iska draft 11 chal raha hai. Aaj bahut APIs apne purane headers use karti hain, jaise <code>X-RateLimit-Remaining</code> ya Anthropic ke <code>anthropic-ratelimit-requests-remaining</code>. Naam alag, kaam same: client ko pehle se pata chal jaaye ki wo hadd ke paas hai.`,
    ]},
    { type: 'h2', text: 'Client kaise behave kare: backoff' },
    { type: 'p', html: `429 milte hi turant retry = wahi buggy script waali problem, bas ab tumhare apne app se. Achha client ye karta hai:` },
    { type: 'steps', items: [
      { t: 'Retry-After maano', d: 'Header ne 30 s bola to 30 s ruko. Ye sabse sahi jaankari hai.' },
      { t: 'Header nahi? Exponential backoff', d: 'Har galat koshish ke baad wait double karo: 1 s, 2 s, 4 s, 8 s... aur ek upar ki hadd (jaise 60 s) aur max koshishein (jaise 5) rakho.' },
      { t: 'Jitter jodo', d: 'Har wait mein thoda random time milao (jaise 4 s ki jagah 0 se 4 s ke beech koi bhi). Warna hazaaron clients ek hi second pe wapas aa ke phir se toofan banate hain.' },
      { t: 'Pehle se dheere ho jao', d: 'RateLimit ya X-RateLimit-Remaining header bata raha hai ki 2 hi bachi hain? 429 aane se pehle hi speed kam kar do.' },
      { t: 'Sirf safe requests retry karo', d: 'GET jaise read requests retry karna safe hai. Payment jaisi requests tabhi retry karo jab server idempotency key samajhta ho (ek hi kaam do baar na ho).' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: exponential backoff + jitter', html: `<strong>Ye kya hai:</strong> <strong>backoff</strong> = fail hone ke baad thodi der rukna. <strong>Exponential</strong> = har baar wait double (1, 2, 4, 8 s). <strong>Jitter</strong> = us wait mein thoda random milaana.<br><strong>Kyun chahiye:</strong> server ko saans lene ka time milta hai, aur sab clients alag alag pal pe wapas aate hain.<br><strong>Iske bina:</strong> sab clients ek saath retry karte hain, server phir girta hai, phir sab retry: ek chakkar jo khatam hi nahi hota. Resilience lesson mein iska simulator hai.` },

    { type: 'h2', text: 'Load shedding: jab sab ke sab zyada ho jaayein' },
    { type: 'p', html: `Rate limiting har client ko uske hisse tak rokta hai. Lekin socho: India-Pakistan match khatam, aur 2 crore normal users ek saath app kholte hain. Har user apni hadd ke andar hai, phir bhi total servers ki capacity se upar. Ab server ko <strong>khud ko bachaana</strong> hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: load shedding', html: `<strong>Ye kya hai:</strong> server ka khud ko bachaane ka tareeka. <strong>Kyun chahiye:</strong> jab sab clients apni hadd mein hon phir bhi total bojh capacity se zyada ho. <strong>Iske bina:</strong> sab requests slow, phir timeout, phir server crash: kisi ko kuch nahi milta.<br>Kaise: server jab overload ke paas ho, to kuch requests jaan bujh ke turant chhod deta hai (aksar <code>503 Service Unavailable</code> ke saath), taaki baaki requests theek se poori hon. Sab ko slow aur timeout dene se behtar hai kuch ko turant "abhi nahi" bolna. Zaroori: <strong>priority</strong> se chhodo. Pehle analytics aur recommendations, sabse aakhir mein login aur payment.` },
    { type: 'p', html: `Stripe ne 2017 ki post mein apne chaar limiters bataye the: (1) request rate limiter: har user N requests/second, (2) concurrent requests limiter: ek user ki ek saath chal rahi requests ki hadd, (3) fleet usage load shedder: infrastructure ka ek hissa (unke example mein 20%) critical requests ke liye reserved, non-critical requests usme ghusein to reject, (4) worker utilization load shedder: workers par bojh badhe to kam zaroori traffic (jaise test mode) dheere dheere chhodna. Pehle do "client ki hadd" hain, aakhri do "system ki suraksha".` },
    { type: 'table', head: ['', 'Rate limiting', 'Load shedding'], rows: [
      ['Sawaal', 'Kya ye client apni hadd mein hai?', 'Kya system abhi aur jhel sakta hai?'],
      ['Kis pe nirbhar', 'Client ka hisaab', 'Server ka bojh (CPU, queue, latency)'],
      ['Normal din', 'Sirf abuse rokta hai', 'Kuch nahi karta'],
      ['Response', '429 + Retry-After', '503 (aksar Retry-After ke saath)'],
    ]},

    { type: 'h2', text: 'AI products: requests nahi, tokens gino' },
    { type: 'p', html: `xyz.com ne ek AI chat assistant launch kiya. Ek user poochhta hai "hi" (5 tokens). Doosra 300 page ka PDF chipka ke summary maangta hai (1.5 lakh tokens). Dono "1 request" hain, lekin GPU pe doosra hazaaron guna mehenga. Sirf requests per minute ginoge to doosra user poori GPU kha jaayega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: LLM token', html: `<strong>Ye kya hai:</strong> AI model (LLM) text ko chhote tukdon mein padhta aur likhta hai, jinhe <strong>tokens</strong> kehte hain. Angrezi mein ek token lagbhag 3-4 letters ya ek chhota shabd. (Ye token bucket wale "token" se alag cheez hai, bas naam same hai.)<br><strong>Kyun zaroori:</strong> AI ka kharcha (GPU ka time) tokens se badhta hai, requests se nahi.<br><strong>Iske bina (sirf requests gino):</strong> "hi" aur "300 page summarise karo" barabar gine jaate hain, aur ek user sabki GPU kha jaata hai.` },
    { type: 'p', html: `Isliye LLM APIs kai hadd ek saath lagati hain. Anthropic ki docs ke mutabik: <strong>requests per minute (RPM)</strong>, <strong>input tokens per minute (ITPM)</strong> aur <strong>output tokens per minute (OTPM)</strong>, aur ye token bucket algorithm se lagti hain (capacity lagatar bharti hai, minute ke shuru mein reset nahi hoti). Hadd paar: 429 aur <code>retry-after</code> header. Wahi token bucket, bas har request ka <strong>cost</strong> 1 nahi, uske tokens hain:` },
    { type: 'code', text: `
# Bucket: capacity 2,00,000 tokens, refill 2,00,000 per minute
request aayi:  estimate = input tokens (gin sakte ho) + andaza output ka
if bucket >= estimate:  bucket -= estimate;  ALLOW
else:                   429, Retry-After = jitne second mein itne tokens bhar jaayein
response khatam:  asli output tokens pata chale → farak bucket mein wapas/aur kaato` },
    { type: 'p', html: `<strong>Chhota sa hisaab:</strong> hadd 30,000 input tokens per minute, to refill = 30,000 ÷ 60 = <strong>500 tokens per second</strong>. Baalti bhari hai (30,000). Pehli request mein 20,000 tokens: allowed, 10,000 bache. Turant doosri request, phir 20,000 tokens: 10,000 kam pad rahe hain. 10,000 ÷ 500 = 20, to jawab: <code>429</code>, <code>Retry-After: 20</code>. Isi beech 50 tokens ka chhota "hi" aaye to wo chal jaata hai, kyunki baalti mein 10,000 hain.` },
    { type: 'h2', text: 'Decide: kaunsa algorithm, kab' },
    { type: 'table', head: ['Situation', 'Chuno', 'Kyun'], rows: [
      ['Public API, app ke user actions', 'Token bucket', 'Chhote bursts chalte hain, average pakka, 2 numbers ki memory'],
      ['Kamzor downstream ya bahar ki API ko smooth traffic', 'Leaky bucket (queue)', 'Output bilkul barabar speed pe'],
      ['Per day / per month quota, simple billing', 'Fixed window', 'Sabse sasta, users ko samjhaana aasaan'],
      ['Login, OTP, password reset (chhoti, strict hadd)', 'Sliding window log', 'Exact, aur chhoti hadd mein memory kam'],
      ['Bahut bada scale, crores keys', 'Sliding window counter', '2 counters, boundary bug lagbhag khatam'],
      ['AI / LLM API', 'Token bucket, cost = tokens', 'Kharcha tokens se judta hai, requests se nahi'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Default <strong>token bucket</strong>: chhote bursts allow karta hai lekin average rate pakki rakhta hai. Bade scale pe sasta andaza chahiye to sliding window counter; ekdum strict chhoti hadd (login, OTP) ke liye sliding log. Hisaab shared Redis mein, atomic Lua script se. AI chat jaise product mein <strong>tokens consumed</strong> se limit karo, sirf requests se nahi. Aur rate limiting ke saath load shedding bhi rakho: ek client ko rokta hai, doosra poore system ko bachaata hai.` },
    { type: 'diagram', title: 'Rate limiting: poori picture', height: 580,
      groups: [
        { label: 'Clients', x: 20, y: 14, w: 690, h: 94 },
        { label: 'Edge', x: 180, y: 128, w: 380, h: 190 },
        { label: 'Gateway + limiter', x: 180, y: 330, w: 535, h: 100 },
        { label: 'Services + data', x: 30, y: 452, w: 685, h: 112 },
      ],
      nodes: [
        { id: 'riya', label: 'Riya ka app', sub: 'normal user', x: 200, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com ka ek normal user. Minute mein kuch dozen requests. Achhi limits use kabhi mehsoos nahi hoti. Galti se hadd paar kare to 429 + Retry-After milta hai, aur app utni der ruk ke dobara koshish karta hai (backoff).' },
        { id: 'bot', label: 'Bot', sub: '10k req/min', x: 540, y: 60, kind: 'threat', info: 'Ye kya hai: password guess ya scraping karne wala program. Iski baadh ko sabse bahar, edge pe hi rokna sabse sasta hai.' },
        { id: 'edge', label: 'CDN / WAF', sub: 'per-IP limit', x: 370, y: 170, w: 170, kind: 'edge', info: 'Ye kya hai: user ke sabse paas baitha network layer (CDN) aur bure traffic ka filter (WAF). Yahan per-IP ki dheeli limit lagti hai: bade floods tumhare data center tak aate hi nahi.' },
        { id: 'lb', label: 'Load Balancer', x: 370, y: 280, kind: 'net', info: 'Ye kya hai: requests ko kai gateways mein baantne wala. Isi wajah se ginti har gateway ki memory mein nahi, shared Redis mein rakhni padti hai.' },
        { id: 'gw', label: 'API gateways', sub: 'limiter: user/key', x: 370, y: 390, w: 170, kind: 'edge', info: 'Ye kya hai: sabhi API requests ka darwaza, jisme rate limiter laga hai. Har request pe key banata hai (user, API key, endpoint), Redis se poochhta hai, phir allow ya 429. Redis gire to har endpoint ka pehle se tay fail-open ya fail-closed niyam.' },
        { id: 'redis', label: 'Redis', sub: 'counters + Lua', x: 640, y: 390, w: 130, kind: 'cache', info: 'Ye kya hai: RAM wala tez database, sab gateways ka shared hisaab (token buckets, window counters). Lua script se "padho + hisaab + likho" ek atomic step mein, to race condition nahi.' },
        { id: 'app', label: 'App services', sub: 'load shedding', x: 370, y: 510, w: 170, kind: 'server', info: 'Ye kya hai: asli kaam karne wale servers. Overload ke paas aayein to load shedding: kam zaroori requests ko turant 503, taaki login aur payment chalte rahein.' },
        { id: 'db', label: 'Database', x: 120, y: 510, kind: 'data', info: 'Ye kya hai: xyz.com ka asli data. Rate limits ka poora maqsad yahi hai ki DB tak kabhi uski capacity se zyada kaam na pahunche.' },
        { id: 'sms', label: 'SMS provider', sub: 'bahar ki hadd', x: 640, y: 510, w: 130, kind: 'net', info: 'Ye kya hai: OTP bhejne wali bahar ki company (ya koi AI API). Iski apni hadd hai, aur har SMS ka paisa lagta hai. Isliye iske aage bhi hamari taraf se ek limit (aksar leaky bucket jaisi smooth queue).' },
      ],
      edges: [
        { a: 'riya', b: 'edge', n: 1 },
        { a: 'bot', b: 'edge', label: 'flood' },
        { a: 'edge', b: 'bot', kind: 'bad', label: 'block', via: [[640, 170]] },
        { a: 'edge', b: 'lb', n: 2 },
        { a: 'lb', b: 'gw', n: 3 },
        { a: 'gw', b: 'redis', n: 4, both: true, label: 'Lua check' },
        { a: 'gw', b: 'app', n: 5 },
        { a: 'app', b: 'db', n: 6 },
        { a: 'app', b: 'sms', dashed: true, label: 'own limit' },
        { a: 'gw', b: 'riya', kind: 'bad', label: '429 + Retry-After', via: [[70, 390], [70, 60]] },
      ],
      paths: [
        { name: 'Allowed request', text: 'Edge ne IP check kiya, gateway ne Redis mein user ka bucket dekha (token mila), request app aur DB tak gayi.', go: ['riya>edge>lb>gw>redis', 'gw>app>db'] },
        { name: 'Blocked (429)', text: 'Bucket khaali: gateway ne turant 429 + Retry-After lautaya. App servers aur DB ko pata bhi nahi chala.', go: ['riya>edge>lb>gw>redis', 'gw>riya'] },
        { name: 'Bot flood', text: 'Ek IP se baadh: edge pe hi per-IP limit ne rok diya. Andar ek bhi request nahi gayi.', go: ['bot>edge', 'edge>bot'] },
        { name: 'Downstream limit', text: 'OTP request allowed, lekin SMS provider ki apni hadd hai: hamari service unhe smooth speed pe hi bhejti hai.', go: ['riya>edge>lb>gw>app>sms'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Rate limiting = har client (user, IP, API key) ki hadd. Hadd paar: <code>429</code> + <code>Retry-After</code>, request andar jaati hi nahi.</li>
      <li>Token bucket default hai: capacity = kitna burst, refill rate = lambe time ki average speed.</li>
      <li>Leaky bucket output smooth karta hai lekin wait badhata hai. Fixed window sasta hai lekin boundary pe 2x. Sliding log exact hai lekin memory khaata hai. Sliding counter 2 numbers mein lagbhag sahi.</li>
      <li>Kai gateways = ginti shared Redis mein, aur atomic (INCR ya Lua script), warna race condition se hadd toot jaati hai.</li>
      <li>Layers mein limit: edge pe per-IP (dheeli), gateway pe per-user / per-API key (asli), service ke andar mehenge kaam pe.</li>
      <li>Client ka kaam: Retry-After maano, warna exponential backoff + jitter.</li>
      <li>Rate limiting client ko rokta hai; load shedding system ko bachaata hai (503, priority se).</li>
      <li>AI APIs mein requests nahi, tokens gino.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Ek bura client sabka system nahi gira sakta', 'Brute force aur scraping mehenge ho jaate hain', 'Backend ki capacity ka andaza pakka: plan ke hisaab se hadd', 'Fair usage: free vs paid plans', 'Load shedding ke saath overload mein bhi zaroori features chalte rehte hain'], costs: ['Har request pe ek extra check (Redis ~1 ms)', 'Redis ek aur dependency: fail-open ya fail-closed tay karna padta hai', 'Galat hadd = asli users ko 429 (NAT ke peeche wale, bursty apps)', 'Distributed counting mein race conditions, atomic scripts likhni padti hain', 'Sliding counter jaise sasta tareeka thoda andaza hai, exact nahi'] },
    { type: 'think', questions: [
      { q: 'xyz.com ke mobile app ke khulte hi 8 API calls ek saath jaati hain. Limit "60 per minute" fixed window se lagi hai. Kya problem ho sakti hai, aur kaunsa algorithm behtar hai?', a: 'Fixed window mein 8 ka burst theek hai, lekin boundary pe double ka khatra hai. Token bucket (capacity ~20, refill 1/s) behtar fit hai: app ke khulne ka burst aaram se chalega, aur lambe time ka average 60/min hi rahega.' },
      { q: 'OTP bhejne wala endpoint: har OTP ka SMS ka paisa lagta hai. Redis down ho gaya. Fail-open ya fail-closed?', a: 'Aksar fail-closed (ya ek local, bahut strict fallback limit). Fail-open kiya to attacker usi waqt lakhon SMS bhejwa ke bill bana sakta hai ya users ko spam kar sakta hai. Feed jaise sasta, read-only endpoint fail-open ho sakta hai.' },
      { q: 'Ek bahar ki payment API kehti hai "2 requests per second se zyada mat bhejo, warna block". Tumhare paas kabhi kabhi 50 requests ek saath aati hain. Kaunsa algorithm, aur user ko kya keemat?', a: 'Leaky bucket (queue): requests line mein lagti hain aur 2/s ki fixed speed se bahar ki API tak jaati hain, to unki hadd kabhi nahi tootti. Keemat: wait. 50 ka burst = aakhri request ~25 s baad pahunchegi. Isliye queue ki capacity aur timeout soch ke rakho, aur user ko "processing" dikhao.' },
      { q: 'Tumhare 10 gateways hain aur har request pe Redis call latency ka 30% kha rahi hai. Kya karoge?', a: 'Options: Lua script se ek hi round trip, Redis gateways ke paas (same zone), aur agar thoda andaza chal jaaye to har gateway local counter rakhe aur har ~100-500 ms mein Redis se sync kare. Trade-off: kam latency ke badle hadd thodi dheeli ho jaati hai (sync ke beech overshoot).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Token bucket, capacity 10, refill 2/s, baalti bhari hai. Ek saath 15 requests aayin. Kitni allow?', options: ['15', '10', '2'], answer: 1, explain: 'Baalti mein 10 tokens the, 10 requests chal gayin, baaki 5 ko 429. Phir har second 2 naye tokens.' },
      { q: 'Fixed window counter ki sabse badi kamzori?', options: ['Bahut memory leta hai', 'Window boundary ke aas paas client hadd ka lagbhag double bhej sakta hai', 'Redis ke bina chal hi nahi sakta'], answer: 1, explain: 'Ek window ke aakhri second mein 100 aur agli ke pehle second mein 100: dono windows "sahi", lekin 2 second mein 200.' },
      { q: 'Do gateways ek saath GET karte hain, dono 99 dekhte hain, dono allow karte hain. Fix?', options: ['Zyada gateways', 'Atomic operation: INCR ya Lua script, taaki padhna + check + likhna ek hi step ho', 'TTL badhao'], answer: 1, explain: 'Read-check-write teen alag steps hain, beech mein race. Redis INCR ya Lua script ek atomic step mein karta hai.' },
      { q: 'Rate limiting aur load shedding mein farak?', options: ['Dono same hain', 'Rate limiting client ki hadd dekhta hai; load shedding server ka bojh dekh ke kam zaroori requests chhodta hai', 'Load shedding sirf bots ke liye hai'], answer: 1, explain: 'Sab clients apni hadd mein hon phir bhi total zyada ho sakta hai. Tab load shedding priority se requests chhodta hai.' },
      { q: 'Leaky bucket (queue 5, 0.5/s), server khaali. 10 requests ek saath aayin. Kya hoga?', options: ['Sab 10 turant server tak', '1 seedhi, 5 line mein (2, 4, 6, 8, 10 s wait), 4 gir gayin', '5 allowed, 5 blocked, koi wait nahi'], answer: 1, explain: 'Server free tha to pehli seedhi gayi. Line mein 5 ki jagah, wo har 2 s mein ek nikalti hain. Baaki 4 overflow. Yahi NGINX ke burst=5 jaisa behaviour hai.' },
      { q: 'Sliding window counter, hadd 5 per 10 s. Pichhle window mein 4, abhi wale mein 2, abhi window ke 3 s beete. Nayi request?', options: ['Allow, kyunki estimate 4 × 0.7 + 2 = 4.8 hai, 5 se kam', 'Block, kyunki 4 + 2 = 6', 'Allow, kyunki abhi wale mein sirf 2'], answer: 0, explain: 'Pichhle window ka sirf 70% hissa (aakhri 7 s) abhi bhi pichhle 10 s mein aata hai: 4 × 0.7 = 2.8, plus 2 = 4.8 < 5.' },
      { q: 'AI chat API ke liye sabse sahi limit?', options: ['Sirf requests per minute', 'Tokens per minute (input aur output), saath mein requests per minute', 'Sirf IP pe'], answer: 1, explain: 'Ek request 5 tokens ki ho sakti hai ya 1.5 lakh ki. Asli kharcha (GPU) tokens se judta hai.' },
    ]},
    { type: 'sources', note: 'Algorithms ke numbers aur real-world examples inhi sources se.', items: [
      { title: 'Scaling your API with rate limiters', publisher: 'Stripe blog', official: true, year: 2017, url: 'https://stripe.com/blog/rate-limiters', used: 'Four limiter types (request rate, concurrent requests, fleet usage load shedder with 20% reserved example, worker utilization load shedder), token bucket in Redis, fail open, 429.' },
      { title: 'How we built rate limiting capable of scaling to millions of domains', publisher: 'Cloudflare blog', official: true, year: 2017, url: 'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/', used: 'Sliding window counter formula, 42 × 0.75 + 18 = 49.5 example, 0.003% wrong decisions over 400M requests, two numbers per counter.' },
      { title: 'RFC 6585: Additional HTTP Status Codes', publisher: 'IETF', official: true, year: 2012, url: 'https://www.rfc-editor.org/rfc/rfc6585.html', used: '429 Too Many Requests, optional Retry-After, spec does not define how to identify users or count.' },
      { title: 'RateLimit header fields for HTTP (Internet-Draft)', publisher: 'IETF HTTPAPI working group', official: true, url: 'https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/', used: 'RateLimit-Policy and RateLimit fields (q, w, r, t); still an Internet-Draft (draft 11, 2026), not an RFC.' },
      { title: 'Scripting with Lua', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/programmability/eval-intro/', used: 'Scripts run atomically and block other commands; keys must be passed via KEYS for cluster correctness.' },
      { title: 'Module ngx_http_limit_req_module', publisher: 'NGINX documentation', official: true, url: 'https://nginx.org/en/docs/http/ngx_http_limit_req_module.html', used: 'limit_req uses the leaky bucket method; burst queues extra requests, nodelay stops the delay.' },
      { title: 'REST Admin API rate limits', publisher: 'Shopify developer docs', official: true, url: 'https://shopify.dev/docs/api/admin-rest/usage/rate-limits', used: 'Leaky bucket: bucket of 40 requests, leaks 2 per second (standard plan).' },
      { title: 'Rate limits for the REST API', publisher: 'GitHub Docs', official: true, url: 'https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api', used: '5,000 requests per hour for authenticated users, x-ratelimit-reset tells when the hourly window resets.' },
      { title: 'Throttle requests to your REST APIs', publisher: 'AWS API Gateway documentation', official: true, url: 'https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html', used: 'API Gateway throttles with the token bucket algorithm (rate + burst), 429 on throttle.' },
      { title: 'Rate limits', publisher: 'Claude API documentation (Anthropic)', official: true, url: 'https://platform.claude.com/docs/en/api/rate-limits', used: 'RPM, ITPM, OTPM limits, token bucket with continuous replenishment, 429 with retry-after, anthropic-ratelimit-* headers.' },
    ]},
  ],
});
})();
