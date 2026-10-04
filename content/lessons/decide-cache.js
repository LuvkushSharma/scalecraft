(function () {
  /* Decision widget: questions as chips -> recommendation card.
     cfg = { questions: [{ id, q, opts: [[value, label]], when?(ans) }], decide(ans) -> { pick, why, cost, alt } }
     The cfg is also attached to the block (block.cfg) so a node script can walk every path. */
  const decider = (el, cfg) => {
    const ans = {};
    el.innerHTML = '<div class="dz-qs"></div><div class="dz-out" aria-live="polite"></div>' +
      '<div style="margin-top:12px"><button type="button" class="btn small ghost dz-reset">Shuru se</button></div>';
    const qs = el.querySelector('.dz-qs'), out = el.querySelector('.dz-out');
    const draw = () => {
      const live = [];
      cfg.questions.forEach(q => { if (q.when && !q.when(ans)) delete ans[q.id]; else live.push(q); });
      qs.innerHTML = '';
      let done = true;
      for (let i = 0; i < live.length; i++) {
        const q = live[i], box = document.createElement('div');
        box.style.margin = '0 0 14px';
        box.innerHTML = `<div style="font-weight:600;color:var(--ink);margin-bottom:6px">${i + 1}. ${q.q}</div><div style="display:flex;flex-wrap:wrap;gap:6px"></div>`;
        q.opts.forEach(([v, t]) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'chip' + (ans[q.id] === v ? ' on' : '');
          b.style.borderRadius = '14px'; b.style.textAlign = 'left';
          b.setAttribute('aria-pressed', String(ans[q.id] === v));
          b.innerHTML = t;
          b.onclick = () => { ans[q.id] = v; draw(); };
          box.lastChild.appendChild(b);
        });
        qs.appendChild(box);
        if (ans[q.id] == null) { done = false; break; }
      }
      if (!done) { out.innerHTML = '<div class="calc-note">Upar wale sawaal ka jawab chuno. Saare jawab milte hi recommendation yahan aayega.</div>'; return; }
      const r = cfg.decide(ans);
      out.innerHTML = `<div style="border:1px solid var(--line-2);border-left:4px solid var(--accent);border-radius:var(--r);background:var(--surface-2);padding:12px 14px">
        <div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">Recommendation</div>
        <div style="font:700 20px/1.3 var(--f-display);color:var(--ink);margin:2px 0 8px">${r.pick}</div>
        <p style="margin:6px 0"><strong>Kyun:</strong> ${r.why}</p>
        <p style="margin:6px 0"><strong>Kya chhodte ho:</strong> ${r.cost}</p>
        <p style="margin:6px 0"><strong>Runner-up:</strong> ${r.alt}</p></div>`;
    };
    el.querySelector('.dz-reset').onclick = () => { Object.keys(ans).forEach(k => delete ans[k]); draw(); };
    draw();
  };

  /* Practice cards: one case at a time; "signal" hint and "answer" reveal, prev/next. */
  const practice = (el, cases, T) => {
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
  };
  const CASES = [
    { q: 'Video page pe "Comments (1,234)" count. Har page view pe dikhta hai, naye comments kabhi kabhi aate hain.', signal: 'Read-heavy, repeat, thoda purana count chalega, sirf display.', pick: 'Cache-aside + TTL (~30-60 s)', why: 'Count dikhane ke liye hai, faisle ke liye nahi. Har view pe COUNT(*) query mehngi; cache se 1 ms.', trap: 'Comment karne wale ko apna comment list mein na dikhe: list ke liye write pe key delete karo, count thoda late chalega.' },
    { q: 'Har user ki "Watch history" page, sirf wahi user dekhta hai, mahine mein 1-2 baar.', signal: 'Har key ka owner ek, aur bahut kam reads. Repeat lagbhag nahi.', pick: 'Cache nahi; DB se seedha (index on user_id, time)', why: 'Hit rate bahut kam hoga. Sahi index ke saath ye query milliseconds ki hai.', trap: 'Sab users ki history Redis mein bhar dena: RAM ka bill, faayda nahi.' },
    { q: 'Creator ka ad earnings balance: dashboard pe dikhta hai, aur "Withdraw" button se paisa bank jaata hai.', signal: 'Ek hi value: display aur faisla (withdraw) dono.', pick: 'Display cache se (chhota TTL); withdraw DB transaction mein', why: 'Dashboard ke liye kuch second purana balance theek. Withdraw ke waqt DB mein "balance >= amount" atomic check.', trap: 'Withdraw bhi cached balance se: do tabs se do withdraw = double payout.' },
    { q: '"Trending in India" list: ek job har 5 minute banata hai, aur har homepage pe dikhti hai (sabko same).', signal: 'Computed, sabke liye same, 5 min purana chalega.', pick: 'Precompute → cache (TTL ~10 min) + CDN', why: 'Job result seedha cache mein likhe; public response CDN pe. Users kabhi miss pe intezaar nahi karte.', trap: 'Cache-aside se har expiry pe hazaaron requests list dobara banane lagein (stampede).' },
    { q: 'Live stream pe "hearts" (likes): 1 lakh taps/sec, screen pe total dikhana hai.', signal: 'Bahut write-heavy counter, exact-turant zaroori nahi.', pick: 'Write-back: Redis INCR, har kuch second DB flush', why: 'Har tap pe DB write impossible. Redis RAM mein ginta hai; total kuch second mein DB.', trap: 'Agar ek hi counter key pe 1 lakh/sec ek Redis node ke liye bhaari ho, to key ko kai keys mein baanto (hearts:v1:0..9) aur padhte waqt jodo.' },
    { q: 'Admin panel ka report jo har baar alag filters ke saath chalta hai (date range, region, category).', signal: 'Har query alag combination: long tail.', pick: 'Cache nahi; warehouse ya read replica pe chalao', why: 'Same report dobara shayad hi chale. Bhaari query ko live DB se hatao, cache se nahi.', trap: 'Har report ka result cache karna: RAM bhar jaayega, hit rate ~0.' },
  ];
  const R = (pick, why, cost, alt) => ({ pick, why, cost, alt });
  const CFG = {
    questions: [
      { id: 'use', q: 'Ye value kisi faisle ke liye use hogi (paisa kaatna, seat book karna)?', opts: [
        ['strict', 'Haan: galat/purani value = asli nuksaan'],
        ['display', 'Nahi, sirf dikhana hai; thodi purani chalegi'],
      ]},
      { id: 'pattern', q: 'Reads aur writes ka pattern?', when: a => a.use === 'display', opts: [
        ['reads', 'Reads bahut zyada (10:1 ya zyada)'],
        ['counter', 'Writes bahut zyada, counter jaisa (views, likes)'],
        ['balanced', 'Reads aur writes lagbhag barabar'],
      ]},
      { id: 'reuse', q: 'Same keys baar baar maangi jaati hain?', when: a => a.pattern === 'reads', opts: [
        ['hot1', 'Ek-do keys pe lakhon hits (celebrity post, match score)'],
        ['repeat', 'Haan, popular items repeat hote hain'],
        ['longtail', 'Nahi, har key lagbhag ek hi baar'],
      ]},
      { id: 'aud', q: 'Wo hot data kaisa hai?', when: a => a.reuse === 'hot1', opts: [
        ['public', 'Public, sabke liye same response (score JSON)'],
        ['app', 'App ke andar ka object (post, profile) jo API/Redis se aata hai'],
      ]},
      { id: 'cost', q: 'Ek cache miss ka cost?', when: a => a.reuse === 'repeat', opts: [
        ['cheap', 'Simple DB lookup (ek row, ek index)'],
        ['expensive', 'Mehngi computation (feed, recommendations, search results)'],
      ]},
      { id: 'own', q: 'User ko apna update turant dikhna chahiye?', when: a => a.reuse === 'repeat', opts: [
        ['yes', 'Haan (naam badla, turant dikhe)'],
        ['no', 'Nahi, kuch second/minute purana chalega'],
      ]},
    ],
    decide(a) {
      if (a.use === 'strict') return R('Source of truth se padho; cache sirf display ke liye', 'Debit se pehle balance, checkout pe seat: ye faisle cache ki purani copy pe nahi ho sakte. Screen pe balance cache se dikha sakte ho, lekin debit ke waqt DB transaction mein dobara check.', 'Har critical read DB pe jaata hai, to DB ko ye load uthana padega (index, replicas nahi, primary se).', 'Cache se display + DB mein conditional write (WHERE bal >= x) jo galti pakad le.');
      if (a.pattern === 'counter') return R('Write-back: Redis mein gino, DB mein batch flush', 'Har view pe DB write = lakhs writes/sec. Redis INCR memory mein microseconds ka hai; har kuch second total DB mein ek write. 1000 views = 1 DB write.', 'Redis crash pe pichhle flush ke baad ke counts ja sakte hain (thoda loss accept). Count thoda late dikhta hai.', 'Events Kafka mein aur stream job se aggregate, agar ek bhi count khona mana hai.');
      if (a.pattern === 'balanced') return R('Shayad cache nahi (ya sirf hot subset)', 'Jitni baar padhoge utni hi baar likhoge, to har write cache invalidate karega aur hit rate gir jaayega. Cache ka faayda kam, stale data ka risk poora.', 'DB ko reads khud uthane padenge.', 'Read replicas / better indexes; ya sirf un keys ko cache karo jo sach mein read-heavy hain.');
      if (a.reuse === 'longtail') return R('Shayad nahi: hit rate kam rahega', 'Har key ek baar maangi jaati hai, to cache mein rakhi cheez dobara kabhi nahi padhi jaati. RAM ka kharcha, faayda zero.', 'DB load wahi rehta hai.', 'Sirf popular "head" (top queries) cache karo, ya DB index/replicas se fast karo.');
      if (a.reuse === 'hot1') return a.aud === 'public'
        ? R('CDN pe daalo (chhota TTL)', 'Sabke liye same response hai, to CDN edges use 1-2 second cache karke lakhon hits khud jhel lete hain. Tumhara Redis aur origin bache rehte hain.', '1-2 second purana data; personalised cheezein CDN pe nahi.', 'App servers mein local in-process cache.')
        : R('Hot key replicate karo + local in-process cache', 'Ek key ek hi Redis node pe hoti hai, to lakhon hits us ek node ko pighla dete hain. Key ki N copies (post:9#1 ... #N) alag nodes pe rakho aur random copy padho; saath mein har app server apni memory mein 1-2 second ki copy rakhe.', 'Copies thodi der alag ho sakti hain; invalidation N+servers jagah.', 'CDN, agar response public ban sake.');
      if (a.cost === 'expensive') return a.own === 'yes'
        ? R('Computed result cache karo + write pe us user ki key delete', 'Feed/recommendations banana mehnga hai, to result cache karo. Lekin user ne khud post kiya to uski apni feed key delete (ya apna post usme jod do), taaki use turant dikhe.', 'Invalidation logic har write path pe; doosron ko update thodi der se dikhega.', 'Background job jo results pehle se bana ke rakhe (precompute), aur author ke liye DB se direct read.')
        : R('Computed result cache karo (TTL ke saath)', 'Search results, feed, recommendations: ek baar banao, kai baar parosho. Miss mehnga hai, to har hit bahut kuch bachata hai.', 'TTL tak purana result; expiry pe kai requests ek saath rebuild na karein (stampede) iske liye lock / early refresh.', 'Background job se precompute, taaki user kabhi miss pe intezaar na kare.');
      return a.own === 'yes'
        ? R('Cache-aside + write pe key delete (ya write-through)', 'Read-heavy aur repeat, to cache-aside. User ko apna update turant dikhna chahiye, to write ke saath cache key delete karo (agla read DB se fresh), ya write-through se cache aur DB dono update.', 'Har write path pe invalidation code; ek bhoola to stale bug. Write-through mein har write thoda slow.', 'Sirf author ke liye kuch second DB se padho (read-your-writes), baaki sab cache se.')
        : R('Cache-aside + TTL', 'Classic case: reads 10:1+, same items repeat, thoda stale chalega. Miss pe DB se laao, TTL ke saath cache mein rakho. Hit rate 90%+ = DB load 10 guna kam.', 'TTL tak stale data; ek aur system (Redis) jo gir sakta hai; cold start pe misses.', 'Read replicas, agar data chhota aur DB pe load abhi kam ho.');
    },
  };

  Lesson.register({
    id: 'decide-cache',
    title: 'Cache chahiye? Kaunsi strategy?',
    minutes: 26,
    summary: `Har slow page ka jawab "Redis laga do" nahi hai. Kab cache faayda deta hai, kab sirf bugs, aur kaunsi strategy kis situation ke liye: sawaal-jawab widget, hit-rate simulator aur traps.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Cache ek tez "yaad-daasht" hai jo database ke saamne baithti hai. Jo cheez baar baar maangi jaaye, wo yahan se turant mil jaati hai.<br>Lekin cache har jagah faayda nahi deta. Agar har cheez ek hi baar maangi jaati hai, to cache bekaar hai. Agar paise jaisa faisla cache ki purani copy pe le liya, to nuksaan hai.<br>Is lesson mein teen seedhe sawaal hain jo batate hain ki cache lagana hai ya nahi, aur kaunsa tareeka. Saath mein ek simulator jisme tum khud dekhoge ki cache kab jeet-ta hai.` },
      { type: 'h2', text: 'Problem: "slow hai? cache laga do"' },
      { type: 'p', html: `xyz.com pe har standup mein koi kehta hai: "page slow hai, Redis laga do". Kabhi ye sahi hota hai (DB load 10 guna kam), kabhi bilkul bekaar (hit rate 2%), aur kabhi khatarnaak (wallet ka purana balance dikha ke paisa kaat liya). Cache ke parts tum <a href="#/caching">caching</a> aur <a href="#/caching-strategies">caching strategies</a> lessons mein seekh chuke ho. Yahan sirf ek kaam: <strong>decide karna</strong>.` },
      { type: 'h3', text: 'Pichhle lessons ke words, ek line mein' },
      { type: 'table', head: ['Word', 'Ek line mein', 'Detail'], rows: [
        ['Hit rate', 'Kitne % reads cache se hi answer hue. 90% = 10 mein se sirf 1 read DB tak.', '<a href="#/caching">Caching</a>'],
        ['Cache-aside', 'App pehle cache dekhta hai; miss pe DB se laake cache mein rakhta hai.', '<a href="#/caching-strategies">Cache strategies</a>'],
        ['Write-through', 'Har write cache aur DB dono mein, saath saath.', '<a href="#/caching-strategies">Cache strategies</a>'],
        ['Write-back', 'Write pehle sirf cache mein; DB mein baad mein, batch mein.', '<a href="#/caching-strategies">Cache strategies</a>'],
        ['TTL', 'Kitni der baad cache ki copy apne aap expire ho jaaye.', '<a href="#/caching">Caching</a>'],
        ['Stale', 'Cache ki copy jo DB ke asli data se purani ho chuki hai.', '<a href="#/caching">Caching</a>'],
        ['Hot key', 'Ek key jis pe bahut zyada traffic, itna ki ek cache node na jhel paaye.', '<a href="#/caching-strategies">Cache strategies</a>'],
        ['Stampede', 'Popular key expire hote hi hazaaron requests ek saath DB pe.', '<a href="#/caching-strategies">Cache strategies</a>'],
      ]},
      { type: 'callout', tone: 'term', title: 'Naya word: Long tail', html: `<strong>Ye kya hai:</strong> jab bahut saari keys hon aur har ek bahut kam baar maangi jaaye. Jaise search mein "blue running shoes size 9 under 2000 for flat feet": aisi queries crore hain, har ek shayad ek hi baar aati hai. Graph banao to ek lambi, patli poonchh (tail) dikhti hai, isliye naam.<br><strong>Kyun zaroori:</strong> cache tabhi kaam karta hai jab same key dobara maangi jaaye. Long tail mein aisa hota hi nahi.<br><strong>Iske bina (pehchaane bina):</strong> tum cache lagaoge, RAM bharoge, aur hit rate 1-2% aayega.` },
      { type: 'callout', tone: 'tip', title: 'Decide: teen sawaal pehle', html: `1) Kya ye value kisi <strong>faisle</strong> (paisa, seat) ke liye hai? Haan → source of truth. 2) Kya <strong>reads writes se kaafi zyada</strong> (10:1+) hain? 3) Kya <strong>same keys repeat</strong> hoti hain? Teeno ka jawab sahi ho tabhi cache kaam karta hai. Default: <strong>cache-aside + TTL</strong>, write pe key delete.` },

      { type: 'h2', text: 'Decision helper' },
      { type: 'p', html: `Ek data socho (profile, feed, view count, wallet balance, match score) aur jawab do. Result mein strategy, wajah, keemat aur runner-up.` },
      { type: 'custom', cfg: CFG, render(el) { decider(el, CFG); } },

      { type: 'h2', text: 'Poori table' },
      { type: 'table', head: ['Situation', 'Answer'], caption: 'Roadmap phase 5: "Do I need a cache? Which strategy?"', rows: [
        ['Read-heavy (10:1 ya zyada), same items baar baar, thoda stale chalega', 'Haan: cache-aside + TTL'],
        ['Mehngi computation jo reuse hoti hai (feed, recommendations, search results)', 'Haan: computed result cache karo'],
        ['User ko apna write turant dikhna chahiye', 'Write-through, ya write pe cache key delete'],
        ['Bahut write-heavy counters (views, likes)', 'Write-back: Redis mein gino, DB mein batch flush (thoda loss risk accept)'],
        ['Long-tail access, har key ek hi baar maangi jaati hai', 'Shayad nahi; hit rate kam rahega'],
        ['Strictly sahi values (debit se pehle balance, checkout pe seat)', 'Source of truth se padho; cache sirf display ke liye'],
        ['Ek key pe lakhon hits (celebrity post, match score)', 'Hot key replicate karo, local in-process cache, ya CDN pe daalo'],
      ]},
      { type: 'h2', text: 'Har row, ek ek karke: signal, scenario, wajah, jaal' },
      { type: 'h3', text: 'Read-heavy, repeat, thoda stale chalega → cache-aside + TTL' },
      { type: 'p', html: `<strong>Signal:</strong> ek write pe 10 ya zyada reads, same items baar baar, aur kuch second/minute purana data chalega.<br><strong>xyz.com:</strong> creator profile, video page ka title/description.<br><strong>Kyun:</strong> sabse simple pattern. Sirf wahi cheezein cache mein jo maangi gayin. TTL galti ki umar limited rakhta hai. 90% hit = DB pe 10 guna kam reads.<br><strong>Jaal:</strong> TTL lagana bhool jaana, ya sab keys ka ek hi TTL (sab ek saath expire = stampede). TTL mein thoda random jitter jodo.` },
      { type: 'h3', text: 'Mehngi computation reuse → computed result cache' },
      { type: 'p', html: `<strong>Signal:</strong> jawab banane mein bahut kaam (kai queries, ranking), aur wahi jawab kai baar chahiye.<br><strong>xyz.com:</strong> home feed, "aapko ye bhi pasand aayega", popular search results.<br><strong>Kyun:</strong> miss mehnga hai (300 ms), hit sasta (1 ms). Har hit 300 ms ka kaam bachata hai.<br><strong>Jaal:</strong> expiry pe hazaaron users ek saath rebuild karein (stampede). Lock / single-flight ya expiry se pehle background refresh lagao.` },
      { type: 'h3', text: 'User ko apna write turant dikhe → write-through ya key delete' },
      { type: 'p', html: `<strong>Signal:</strong> "maine naam badla, mujhe abhi dikhna chahiye" (read-your-own-writes).<br><strong>xyz.com:</strong> creator bio edit karta hai aur page refresh karta hai.<br><strong>Kyun:</strong> write ke saath cache key delete karo (agla read DB se fresh), ya write-through se cache bhi update karo. Doosron ko kuch second baad dikhe to bhi chalega.<br><strong>Jaal:</strong> delete ki jagah cache ko <em>update</em> karna. Do writes ek saath hon to purani value cache mein reh sakti hai. Delete zyada safe hai.` },
      { type: 'h3', text: 'Bahut write-heavy counters → write-back' },
      { type: 'p', html: `<strong>Signal:</strong> ek hi value pe lagataar +1 (views, likes), aur thoda kam ginti chal jaayegi.<br><strong>xyz.com:</strong> viral video pe 50,000 views/sec.<br><strong>Kyun:</strong> Redis <code>INCR</code> RAM mein; har 5 second ek DB write. 5 second mein 2.5 lakh views = 1 DB write.<br><strong>Jaal:</strong> isko paise ke liye use karna. Flush se pehle Redis gira to pichhle 5 second ke counts gaye.` },
      { type: 'h3', text: 'Long tail → shayad cache nahi' },
      { type: 'p', html: `<strong>Signal:</strong> lagbhag har request ek nayi key.<br><strong>xyz.com:</strong> lambi, unique search queries; har user ka alag filter combination.<br><strong>Kyun nahi:</strong> rakha hua result dobara padha hi nahi jaata. RAM ka kharcha, ek extra hop, aur hit rate ~1%.<br><strong>Jaal:</strong> "cache se sab tez hota hai". Miss pe request cache <em>aur</em> DB dono jagah jaati hai. Sirf "head" (top popular queries) cache karo; baaki ke liye index sudhaaro.` },
      { type: 'h3', text: 'Strictly sahi value → source of truth se padho' },
      { type: 'p', html: `<strong>Signal:</strong> value se faisla hota hai: paisa kaatna, seat dena, stock ghataana.<br><strong>xyz.com:</strong> paid workshop ki aakhri seat; wallet se tip.<br><strong>Kyun:</strong> cache ki copy kabhi bhi purani ho sakti hai. Dikhane ke liye cache theek; faisla DB mein ek atomic conditional update se (<code>WHERE seats_left > 0</code>).<br><strong>Jaal:</strong> checkout bhi cache se check kare. Neeche flow mein 100 seats pe 101 tickets.` },
      { type: 'h3', text: 'Ek key pe lakhon hits → replicate, local cache, CDN' },
      { type: 'p', html: `<strong>Signal:</strong> ek hi key pe itna traffic ki ek Redis node ka CPU 100%.<br><strong>xyz.com:</strong> superstar ka post, IPL final ka score.<br><strong>Kyun:</strong> Redis cluster mein ek key ek hi node pe rehti hai. Uski copies (<code>post:9#1..#8</code>) alag nodes pe rakho, har app server 1-2 second ki local copy rakhe, aur response public ho to CDN pe daalo.<br><strong>Jaal:</strong> "aur bada Redis node le lo". Ek node ki ek limit hai; problem ek key ki hai, size ki nahi.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Cache = speed, to har jagah lagao" <strong>galat hai</strong>. Cache tabhi tez hai jab <em>hit</em> ho. Miss pe to request cache <em>aur</em> DB dono jagah jaati hai, yaani bina cache se bhi thodi slow. Hit rate 5% ho to tumne ek naya system, naye bugs (stale data), aur naya bill sirf 5% requests ke liye liya. Doosri galti: "cache mein hai to wahi sach hai". Sach hamesha DB (source of truth) mein hai; cache sirf ek purani ho sakne wali copy.` },
      { type: 'h2', text: 'Simulator: long tail vs popular keys' },
      { type: 'p', html: `Hit rate do cheezon pe tikta hai: cache kitna bada hai, aur traffic kitna "popular keys" pe jhuka hua hai. Real traffic aksar <strong>Zipf</strong> jaisa hota hai: sabse popular key ko sabse zyada hits, doosri ko usse kam, aur ek lambi tail. Neeche 10 lakh keys hain. Traffic ka shape aur cache size badal ke dekho.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Zipf distribution', html: `<strong>Ye kya hai:</strong> ek pattern jisme rank #1 item ko sabse zyada hits milte hain, rank #2 ko lagbhag aadhe, rank #3 ko ek-tihaai... (hits ∝ 1/rank<sup>s</sup>). <strong>s</strong> jitna bada, traffic utna kuch hi keys pe jhuka hua. s = 0 matlab har key barabar, yaani pure long tail.<br><strong>Kyun zaroori:</strong> web traffic aksar aisa hi hota hai (research traces mein s lagbhag 0.6-0.9). Isi jhukaav ki wajah se chhota cache bhi bahut saare hits pakad leta hai.<br><strong>Iske bina (samjhe bina):</strong> tum andaaza nahi laga paoge ki 1% keys ka cache 1% hits dega ya 68%.` },
      { type: 'custom', render(el) {
        const SHAPES = [['Long tail (s = 0)', 0], ['Halka repeat (s = 0.5)', 0.5], ['Normal web (s = 0.8)', 0.8], ['Popular-heavy (s = 1.0)', 1.0], ['Bahut skewed (s = 1.2)', 1.2]];
        const SIZES = [0.1, 0.5, 1, 2, 5, 10, 20], N = 1000000;
        let si = 3;
        el.innerHTML = `<div class="dc-sh" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px"></div>
          <label>Cache size: <strong class="dc-szv"></strong> keys cache mein</label><input class="dc-sz" type="range" min="0" max="6" step="1" value="2" aria-label="Cache size">
          <div class="stats"><div class="stat"><span>Hit rate</span><strong class="dc-hr"></strong></div>
            <div class="stat"><span>Har 10,000 requests mein DB tak</span><strong class="dc-db"></strong></div>
            <div class="stat"><span>Verdict</span><strong class="dc-v" style="font-size:17px"></strong></div></div>
          <div class="calc-note">Ideal cache maana hai jo hamesha sabse popular keys rakhe. Asli LRU cache thoda kam hit rate deta hai, lekin trend wahi rehta hai.</div>`;
        const sh = el.querySelector('.dc-sh'), sz = el.querySelector('.dc-sz');
        const hit = (C, s) => { let a = 0, b = 0; for (let i = 1; i <= N; i++) { const v = Math.pow(i, -s); b += v; if (i <= C) a += v; } return a / b; };
        const upd = () => {
          sh.querySelectorAll('button').forEach((b, k) => { b.className = 'chip' + (k === si ? ' on' : ''); b.setAttribute('aria-pressed', String(k === si)); });
          const pct = SIZES[Number(sz.value)], C = Math.round(N * pct / 100), h = hit(C, SHAPES[si][1]);
          el.querySelector('.dc-szv').textContent = pct + '% (' + C.toLocaleString('en-IN') + ')';
          el.querySelector('.dc-hr').textContent = (h * 100).toFixed(1) + '%';
          el.querySelector('.dc-db').textContent = Math.round(10000 * (1 - h)).toLocaleString('en-IN');
          el.querySelector('.dc-v').textContent = h < 0.3 ? 'Faayda kam: shayad cache mat lagao' : h < 0.8 ? 'Theek: cache madad karega' : 'Bahut achha: cache lagao';
        };
        SHAPES.forEach(([t], k) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = () => { si = k; upd(); }; sh.appendChild(b); });
        sz.addEventListener('input', upd); upd();
      }},
      { type: 'p', html: `Dekha? <strong>Long tail</strong> pe 1% keys cache karo to hit rate sirf <strong>1%</strong>: 10,000 mein se 9,900 requests phir bhi DB tak. Wahi 1% cache <strong>popular-heavy</strong> traffic (s = 1.0) pe <strong>~68%</strong> hit deta hai, aur s = 1.2 pe ~91%. Isliye "kya same keys repeat hoti hain?" cache ka sabse zaroori sawaal hai.` },
      { type: 'h2', text: 'Worked scenarios' },
      { type: 'h3', text: '1. Creator profile page' },
      { type: 'p', html: `Ek profile ko roz lakhs log dekhte hain, creator mahine mein ek-do baar edit karta hai. Reads ≫ writes, same keys repeat, kuch second purana chalega. <strong>Decision: cache-aside + TTL</strong> (jaise 10 min), aur creator edit kare to <code>DEL profile:42</code> taaki use apna naya bio turant dikhe.` },
      { type: 'h3', text: '2. Home feed' },
      { type: 'p', html: `Feed banane mein 200 posts fetch, ranking, filters: ~300 ms ka kaam. Ek user din mein 20 baar app kholta hai. <strong>Decision: computed result cache karo</strong> (feed:user_id, TTL ~1-2 min). Miss mehnga hai, to har hit bahut bachata hai. Expiry pe stampede rokne ke liye lock / early refresh.` },
      { type: 'h3', text: '3. Video view counter' },
      { type: 'p', html: `Ek viral video pe 50,000 views/sec. Har view pe <code>UPDATE videos SET views = views + 1</code> = ek hi row pe 50,000 writes/sec, DB ghutne tek dega. <strong>Decision: write-back</strong>: <code>INCR views:v1</code> Redis mein, har 5 second total DB mein. Redis crash pe kuch second ke views ja sakte hain; view count ke liye ye chalta hai.` },
      { type: 'h3', text: '4. Trap: "search slow hai, results cache karo"' },
      { type: 'p', html: `Search queries ka bada hissa long tail hai: "kal wala video jisme cat piano bajati hai". Har query alag key, to cache mein rakha result shayad hi dobara padha jaaye. <strong>Decision: poora search cache mat karo</strong>; sirf top popular queries ("ipl highlights") cache karo, aur baaki ko search index fast karke sambhalo. Upar simulator mein "Long tail" chuno aur dekho.` },
      { type: 'h3', text: '5. Trap: paid live workshop, "sirf 1 seat bachi"' },
      { type: 'p', html: `xyz.com pe ek paid workshop hai, 100 seats. "Seats left" har page view pe dikhta hai, to team ne use 60 second ke TTL ke saath cache kar diya. Dikhane ke liye ye theek hai. Galti tab hui jab <strong>checkout ne bhi cache se hi check kiya</strong>. Neeche diagram chalao. <strong>Decision:</strong> display cache se, lekin faisla (seat dena) source of truth se, atomic conditional update ke saath.` },
      { type: 'h3', text: '6. Celebrity ka post' },
      { type: 'p', html: `Ek superstar ne post kiya, 20 lakh reads/minute ek hi key <code>post:9</code> pe. Ye key Redis cluster ke ek node pe hai, wo node 100% CPU pe. <strong>Decision:</strong> key ki copies (<code>post:9#1..#8</code>) alag nodes pe, random copy padho, aur har app server 1-2 second ki local in-process copy rakhe.` },

      { type: 'h2', text: 'Practice: 6 chhote cases' },
      { type: 'p', html: `Teen sawaal yaad rakho: faisla hai ya display? reads zyada ya writes? same keys repeat hoti hain? Phir "Signal dikhao" aur "Jawab dikhao".` },
      { type: 'custom', render(el) { practice(el, CASES, { case: 'Case', hint: 'Signal dikhao', ans: 'Jawab dikhao', prev: '← Pichhla', next: 'Agla →', signal: 'Signal', trap: 'Jaal' }); } },

      { type: 'h2', text: 'Cache se faisla: chala ke dekho' },
      { type: 'flow', height: 330,
        nodes: [
          { id: 'u1', label: 'Riya', sub: 'Buy seat', x: 90, y: 80, w: 130, kind: 'client', info: 'Ye kya hai: Riya, pehli buyer. "1 seat left" dekh ke Buy dabaya.' },
          { id: 'u2', label: 'Aman', sub: 'Buy seat', x: 90, y: 250, w: 130, kind: 'client', info: 'Ye kya hai: Aman, doosra buyer, usi second mein. Race ka setup.' },
          { id: 'app', label: 'Checkout service', x: 330, y: 165, w: 170, kind: 'server', info: 'Ye kya hai: checkout service, wo code jo seat bechta hai. Galat design: seats_left cache se padh ke decide karta hai. Sahi design: page display ke liye cache, lekin seat dene ke liye DB mein conditional update.' },
          { id: 'cache', label: 'Redis cache', sub: 'seats_left = 1', x: 590, y: 70, w: 160, kind: 'cache', info: 'Ye kya hai: Redis cache mein seats_left ki copy, TTL 60 s. Display ke liye bilkul theek. Faisle ke liye nahi: copy kabhi bhi purani ho sakti hai.' },
          { id: 'db', label: 'Database', sub: 'seats_left = 1', x: 590, y: 260, w: 160, kind: 'data', info: 'Ye kya hai: database, yaani source of truth. Yahan ek atomic statement "seat do, agar bachi ho" race ko rok deta hai.' },
        ],
        edges: [{ a: 'u1', b: 'app' }, { a: 'u2', b: 'app' }, { a: 'app', b: 'cache' }, { a: 'app', b: 'db' }],
        scenarios: [
          { name: 'Cache se faisla (galat)', steps: [
            { title: 'Dono ek saath Buy', text: 'Dono checkout cache se seats_left padhta hai. Dono ko 1 dikhta hai.', parallel: true, go: ['u1>app>cache', 'u2>app>cache'], after: { cache: { state: 'hit', sub: 'seats_left = 1' } }, msg: 'GET seats:w7 → 1   (dono baar)' },
            { title: 'Dono ko ticket', text: '"1 > 0, theek hai" — dono ke liye ticket row insert.', go: ['app>db', 'app>db'], after: { db: { state: 'warn', sub: '101 tickets / 100!' } }, msg: 'INSERT INTO tickets ... (2 baar)' },
            { title: 'Oversold', text: '100 seat ke workshop mein 101 tickets bik gaye. Cache ne kuch galat nahi kiya; galti ye thi ki ek <strong>purani ho sakne wali copy</strong> se faisla liya.', parallel: true, go: ['res:app>u1', 'res:app>u2'], after: { cache: { state: 'warn', sub: 'abhi bhi 1 (stale)' } } },
          ]},
          { name: 'Display cache, faisla DB (sahi)', steps: [
            { title: 'Page cache se', text: 'Lakhs page views "1 seat left" cache se padhte hain. DB ko pata bhi nahi.', set: { cache: { state: 'hit', sub: 'seats_left = 1' }, db: { state: '', sub: 'seats_left = 1' } }, go: ['u1>app>cache', 'res:cache>app>u1'] },
            { title: 'Riya ka Buy: DB mein atomic', text: 'Check aur decrement ek statement mein, source of truth pe.', go: ['u1>app>db', 'res:db>app>u1'], after: { db: { state: 'ok', sub: 'seats_left = 0' } }, msg: 'UPDATE workshops SET seats_left = seats_left - 1\nWHERE id = 7 AND seats_left > 0;   -- 1 row' },
            { title: 'Aman ka Buy: 0 rows', text: 'Condition fail, koi ticket nahi. Aman ko "Sold out".', go: ['u2>app>db', 'bad:db>app>u2'], msg: '0 rows → "Sold out"' },
            { title: 'Cache key delete', text: 'Write ke baad cache key delete, taaki page jaldi "Sold out" dikhaye.', go: 'app>cache', after: { cache: { state: '', sub: 'deleted' } }, msg: 'DEL seats:w7' },
          ]},
          { name: 'Long-tail cache (bekaar)', intro: 'Ab Checkout service ki jagah Search service socho, aur har user alag query bhej raha hai.', steps: [
            { title: 'Miss', text: 'Har query nayi key. Cache mein nahi.', set: { app: { label: 'Search service' }, cache: { sub: '', state: '' }, db: { sub: '', state: '' } }, go: ['u1>app>cache', 'bad:cache>app', 'app>db'], after: { cache: { state: 'miss', sub: 'MISS' } } },
            { title: 'Phir miss', text: 'Doosre user ki query bhi nayi. Phir DB.', go: ['u2>app>cache', 'bad:cache>app', 'app>db'] },
            { title: 'Nateeja', text: 'Cache RAM ek-baar wali keys se bhar gaya, hit rate ~1%, DB load waisa hi, aur ek extra hop har request mein. Yahan cache ki jagah search index aur DB tune karo.', after: { cache: { state: 'warn', sub: 'hit rate ~1%' }, db: { state: 'hot', sub: 'load same' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'Interview mein kaise bolein' },
      { type: 'list', items: [
        '"Profile read-heavy hai (~100:1) aur repeat hota hai, to cache-aside + 10 min TTL with jitter; edit pe key delete."',
        '"Feed banana ~300 ms ka hai, to computed feed cache, aur expiry pe single-flight lock taaki stampede na ho."',
        '"Views write-back: Redis INCR, har 5 s flush. Paise wale counts Kafka se, kyunki wahan loss mana hai."',
        '"Seat aur balance ka faisla hamesha DB mein conditional update se; cache sirf display ke liye."',
      ]},
      { type: 'diagram', title: 'xyz.com mein cache: poori picture', height: 490,
        groups: [
          { label: 'Users', x: 20, y: 14, w: 680, h: 74 },
          { label: 'Edge + app', x: 4, y: 108, w: 712, h: 96 },
          { label: 'Cache + data', x: 4, y: 236, w: 712, h: 100 },
          { label: 'Background jobs', x: 4, y: 370, w: 712, h: 106 },
        ],
        nodes: [
          { id: 'users', label: 'Users', sub: 'app + browser', x: 360, y: 50, w: 170, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Profile dekhte hain, seat khareedte hain, video dekhte (views), trending aur search use karte hain. Har cheez ka cache decision alag.' },
          { id: 'cdn', label: 'CDN edges', sub: 'trending, score', x: 110, y: 165, w: 160, kind: 'edge', info: 'Ye kya hai: users ke paas ke cache servers. Sirf public, sabke liye same responses (trending list, live score) chhote TTL ke saath. Personal data yahan nahi.' },
          { id: 'app', label: 'App servers', sub: 'local: hot keys', x: 400, y: 165, w: 190, kind: 'server', info: 'Ye kya hai: xyz.com ka code. Cache-aside logic yahan; celebrity post jaisi hot keys ki 1-2 s ki local in-process copy; aur seat/balance ka faisla seedha DB se.' },
          { id: 'redis', label: 'Redis cluster', sub: 'profile, feed, views', x: 150, y: 300, w: 170, kind: 'cache', info: 'Ye kya hai: shared cache. Profiles (cache-aside + TTL), computed feeds, views counters (INCR), aur hot key ki copies alag nodes pe.' },
          { id: 'db', label: 'Database', sub: 'source of truth', x: 430, y: 300, w: 160, kind: 'data', info: 'Ye kya hai: asli data. Cache misses yahan aate hain, aur seat/balance jaise faisle hamesha yahin atomic conditional update se.' },
          { id: 'search', label: 'Search index', sub: 'long tail: no cache', x: 620, y: 300, w: 150, kind: 'data', info: 'Ye kya hai: search engine. Zyada tar queries long tail hain, to results cache nahi karte; sirf top popular queries ka chhota cache.' },
          { id: 'trend', label: 'Trending job', sub: 'precompute', x: 150, y: 430, w: 160, kind: 'queue', info: 'Ye kya hai: har 5 minute chalne wala job. Trending list bana ke seedha cache mein likhta hai, taaki koi user miss pe intezaar na kare.' },
          { id: 'flush', label: 'Flush job', sub: 'write-back, 5 s', x: 430, y: 430, w: 150, kind: 'queue', info: 'Ye kya hai: har 5 second Redis ke views counters DB mein ek batch write mein daalta hai. Redis gira to max ~5 s ke views ja sakte hain.' },
        ],
        edges: [
          { a: 'users', b: 'cdn', label: 'public' },
          { a: 'users', b: 'app', n: 1 },
          { a: 'cdn', b: 'app', dashed: true, label: 'miss' },
          { a: 'app', b: 'redis', n: 2, label: 'GET / SET' },
          { a: 'app', b: 'db', n: 3, label: 'decisions' },
          { a: 'app', b: 'search', label: 'search' },
          { a: 'trend', b: 'redis', kind: 'evt' },
          { a: 'redis', b: 'flush', kind: 'evt', label: 'views' },
          { a: 'flush', b: 'db', kind: 'evt', label: 'batch' },
        ],
        paths: [
          { name: 'Profile (cache-aside)', text: 'Redis mein dekha; miss pe DB se laaye aur TTL ke saath SET. Edit pe key delete.', go: ['users>app>redis', 'app>db'] },
          { name: 'Buy seat (DB decides)', text: 'Page "1 seat left" cache se dikhata hai, lekin seat dene ka faisla DB mein atomic update se.', go: ['users>app>db'] },
          { name: 'Views (write-back)', text: 'Har view Redis INCR; flush job har 5 s ek batch write DB mein.', go: ['users>app>redis', 'redis>flush>db'] },
          { name: 'Trending + search', text: 'Trending precompute hoke cache mein aur CDN pe. Search long tail hai, seedha index se.', go: ['trend>redis', 'users>cdn>app', 'app>search'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Teen sawaal: <strong>faisla ya display?</strong> <strong>reads ≫ writes?</strong> <strong>same keys repeat?</strong></li>
        <li>Default: <strong>cache-aside + TTL</strong> (jitter ke saath), write pe key delete.</li>
        <li>Mehnga result (feed, recommendations) = computed result cache, stampede se bachao.</li>
        <li>Counters (views, likes) = write-back: Redis INCR + batch flush; paise ke liye nahi.</li>
        <li>Long tail = hit rate kam; cache mat lagao, sirf "head" cache karo.</li>
        <li>Paisa, seat, stock ka faisla hamesha source of truth se; cache sirf display.</li>
        <li>Hot key = copies alag nodes pe + local in-process cache + CDN (public ho to).</li>
        <li>Hit rate traffic ke jhukaav (Zipf s) pe tikta hai: s = 1 pe 1% cache ≈ 68% hits.</li>
      </ul>` },
      { type: 'tradeoffs', gains: [
        'Sahi jagah cache: reads 10x+ fast, DB load 10 guna tak kam',
        'Computed results cache: mehngi computation ek baar, kai baar use',
        'Write-back: counters ki lakhs writes DB pe kuch hazaar ban jaati hain',
        'CDN / local cache / replicated keys: hot keys bhi sambhal jaati hain',
      ], costs: [
        'Har cache = stale data ka koi window; invalidation har write path pe',
        'Long tail pe RAM ka kharcha, faayda lagbhag zero, aur ek extra hop',
        'Write-back mein crash = kuch acknowledged writes ka loss',
        'Cache se faisla (paisa, seat) = oversell / double spend jaise bugs',
        'Ek aur system jo gir sakta hai; gire to saara load achanak DB pe',
      ]},
      { type: 'think', questions: [
        { q: 'xyz.com ka "Trending today" list har 10 minute pe ek batch job banata hai, aur har homepage pe dikhta hai. Kaunsi strategy?', a: 'Ye computed result hai, sabke liye same, aur 10 minute purana chalega. Batch job result ko seedha cache mein likh de (precompute), TTL ~15 min. Agar response public hai to CDN pe bhi. Cache-aside ki zaroorat bhi nahi, kyunki result pehle se bana hai.' },
        { q: 'User ne apna profile photo badla, lekin use 10 minute purana photo dikhta raha. Tumne cache-aside + TTL 10 min lagaya tha. Do fix batao.', a: '1) Write ke saath cache key delete karo (agla read DB se fresh). 2) Ya write-through: DB ke saath cache bhi update. Aur agar photo CDN se aata hai to naye photo ka URL hi naya rakho (version/hash), taaki purani cached copy ka sawaal hi na rahe.' },
        { q: 'Redis mein views count karte ho aur har 5 second flush. Redis crash hua. Kitna nuksaan, aur kab ye accept nahi?', a: 'Max ~5 second ke views (us window ka count) ja sakte hain. View count ke liye theek. Accept nahi jab count se paisa juda ho (creator ki ad revenue per view): tab events durable log (Kafka) mein likho aur wahan se aggregate karo, ya Redis persistence (AOF) + replica.' },
      ]},
      { type: 'quiz', questions: [
        { q: 'Kaunse case mein cache lagana sabse kam faayde ka hai?', options: ['Product page jise roz lakhs log dekhte hain', 'Har user ki unique, ek-baar search query ka result', 'Homepage ka trending list'], answer: 1, explain: 'Long tail: har key ek baar, to hit rate bahut kam. Cache RAM aur complexity khaata hai, faayda nahi.' },
        { q: 'Likes count pe 1 lakh writes/sec. Strategy?', options: ['Har like pe DB UPDATE', 'Write-back: Redis INCR + batch flush', 'Cache-aside + TTL'], answer: 1, explain: 'Write-heavy counter: Redis mein gino, DB mein batch mein likho. Thoda loss risk accept.' },
        { q: 'Checkout pe seat available hai ya nahi, kahan se padhoge?', options: ['Redis cache', 'CDN', 'Source of truth (DB) mein atomic conditional update'], answer: 2, explain: 'Faisla kabhi purani ho sakne wali copy pe nahi. Cache sirf display ke liye.' },
        { q: 'Ek celebrity post pe lakhon reads, Redis ka ek node 100% CPU. Kya karoge?', options: ['TTL badha do', 'Hot key ki copies alag nodes pe + local in-process cache', 'Cache hata do'], answer: 1, explain: 'Ek key ek node pe hai; copies aur local cache load ko baant dete hain. Public ho to CDN bhi.' },
      ]},
      { type: 'sources', note: 'Decision table roadmap phase 5 se. Simulator ka maths: Zipf distribution par ideal "top-C keys" cache ka hit rate, node mein verify kiya.', items: [
        { title: 'Caching patterns (cache-aside, write-through, write-behind)', publisher: 'AWS whitepaper: Database Caching Strategies Using Redis', official: true, url: 'https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html', used: 'Cache-aside (lazy loading) aur write-through ki definitions aur trade-offs.' },
        { title: 'Web Caching and Zipf-like Distributions: Evidence and Implications', publisher: 'Breslau et al., IEEE INFOCOM 1999', url: 'https://pages.cs.wisc.edu/~cao/papers/zipf-implications.html', used: 'Web requests Zipf-like hoti hain (traces mein exponent ~0.6-0.9), isliye simulator ka "Normal web" s = 0.8; hit rate cache size ke saath dheere (log jaisa) badhta hai.' },
      ]},
    ],
  });
})();
