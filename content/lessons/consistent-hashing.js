Lesson.register({
  id: 'consistent-hashing',
  title: 'Consistent hashing',
  minutes: 28,
  summary: `Keys ko servers pe baantne ka sabse seedha tareeka hash(key) % N hai. Lekin ek server jodte hi lagbhag saari keys apni jagah badal leti hain. Consistent hashing servers aur keys ko ek gol "ring" pe rakhta hai, taaki server aaye ya jaaye to sirf ~1/N keys hi hilein.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Pichhle lesson mein data ko kai machines mein baanta. Lekin machines ki ginti badalti rehti hai: traffic badha to ek machine jodi, koi kharab hui to hata di.<br>Sabse seedhe formula (<code>hash % N</code>) mein ek machine jodte hi <strong>lagbhag saara data apni jagah badal leta hai</strong>. Jaise class mein ek naya bachcha aaya aur teacher ne sabki seat badal di.<br>Consistent hashing ek chaalaak tareeka hai jisme naya bachcha aaye to sirf uske aas paas ke kuch bachche khiskein, baaki sab apni jagah baithe rahein.<br>Is lesson mein ek gol "ghadi" (ring) pe ye khud chala ke dekhoge.` },
    { type: 'h2', text: 'Problem: ek server joda, cache khaali' },
    { type: 'p', html: `xyz.com ka Redis cache ab ek machine mein nahi samaata. Humne 4 cache servers lagaye aur pichhle lesson ki tarah hash sharding ki: key ka hash nikaalo, 4 se divide karo, remainder = server number.` },
    { type: 'code', text: `
server = hash("user:42") % 4      // 0, 1, 2 ya 3
hash("user:42") = 1,234,567  →  1,234,567 % 4 = 3  →  Server 3` },
    { type: 'p', html: `Sab badhiya chal raha tha. IPL final ke din traffic badha, to humne ek 5th server joda. Ab formula <code>% 5</code> ho gaya. Kya hua?` },
    { type: 'code', text: `
                     % 4   % 5
hash = 1,234,567  →   3     2     (move!)
hash = 1,000,000  →   0     0     (bach gaya)
hash =   999,999  →   3     4     (move!)
hash =   500,002  →   2     2     (bach gaya)
hash =   777,777  →   1     2     (move!)` },
    { type: 'p', html: `Ek key apni jagah tabhi rehti hai jab <code>hash % 4</code> aur <code>hash % 5</code> same aaye. Ye sirf 5 mein se ~1 baar hota hai. Yaani <strong>~80% keys ka server badal gaya</strong>. Cache ke liye iska matlab: 80% requests achanak miss, sab database pe gir padin, aur database usi waqt jab traffic peak pe hai. Jis server ko madad ke liye joda, usi ne site gira di.` },
    { type: 'callout', tone: 'why', title: 'General rule', html: `N se N+1 servers pe jaane pe <code>hash % N</code> mein sirf ~<strong>1/(N+1)</strong> keys apni jagah rehti hain, baaki ~<strong>N/(N+1)</strong> move ho jaati hain. 4 → 5: 80% move. 9 → 10: 90% move. Jitna bada cluster, utna bura. Jabki <em>zaroorat</em> sirf itni thi ki naya server apna 1/(N+1) hissa le le, yaani 4 → 5 mein sirf ~20% keys move hon.` },
    { type: 'p', html: `Khud gino. 12 keys ka hash (chhota karke 6 digit) aur unka server, N aur N+1 servers ke saath. Jo key ka server badla, wo laal:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Abhi servers (N): <strong class="md-nv"></strong>, naye: <strong class="md-n1"></strong></label><input class="md-n" type="range" min="2" max="9" step="1" value="4"></div>
        <div class="md-tab" style="margin-top:12px;overflow-x:auto"></div>
        <div class="stats">
          <div class="stat"><span>In 12 mein se hili</span><strong class="md-12"></strong></div>
          <div class="stat"><span>10,000 keys mein se hili</span><strong class="md-all"></strong></div>
          <div class="stat"><span>Formula N/(N+1)</span><strong class="md-f"></strong></div>
        </div>
        <div class="calc-note md-note"></div>`;
      const q = s => el.querySelector(s);
      const h32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
      const hv = k => h32(k) % 1000000;
      const KEYS = []; for (let i = 1; i <= 12; i++) KEYS.push('video:' + i);
      const ALL = []; for (let i = 0; i < 10000; i++) ALL.push(hv('key:' + i));
      const upd = () => {
        const n = +q('.md-n').value;
        q('.md-nv').textContent = n; q('.md-n1').textContent = n + 1;
        let moved = 0;
        const rows = KEYS.map(k => { const h = hv(k), a = h % n, b = h % (n + 1), mv = a !== b; if (mv) moved++;
          return `<tr style="color:${mv ? 'var(--red)' : 'var(--ink)'}"><td style="padding:3px 8px">${k}</td><td style="padding:3px 8px;font-family:var(--f-mono)">${h.toLocaleString('en-IN')}</td><td style="padding:3px 8px;text-align:center">${a}</td><td style="padding:3px 8px;text-align:center">${b}</td><td style="padding:3px 8px">${mv ? 'hili' : 'wahi'}</td></tr>`; }).join('');
        q('.md-tab').innerHTML = `<table style="border-collapse:collapse;font-size:14px;min-width:300px"><tr style="color:var(--ink-3);text-align:left"><th style="padding:3px 8px">key</th><th style="padding:3px 8px">hash</th><th style="padding:3px 8px">% ${n}</th><th style="padding:3px 8px">% ${n + 1}</th><th style="padding:3px 8px"></th></tr>${rows}</table>`;
        let mAll = 0; ALL.forEach(h => { if (h % n !== h % (n + 1)) mAll++; });
        q('.md-12').textContent = moved + ' / 12';
        q('.md-all').textContent = (mAll / 100).toFixed(1) + '%';
        q('.md-f').textContent = (n / (n + 1) * 100).toFixed(1) + '%';
        q('.md-note').textContent = `${n} se ${n + 1} servers: 10,000 keys mein ${(mAll / 100).toFixed(1)}% ka server badla, formula ${n}/${n + 1} = ${(n / (n + 1) * 100).toFixed(1)}% ke paas. Zaroorat sirf ${(100 / (n + 1)).toFixed(1)}% ki thi (naye server ka hissa). Jitne zyada servers, utna bura.`;
      };
      q('.md-n').addEventListener('input', upd);
      upd();
    }},
    { type: 'p', html: `Cache mein ye "sirf" misses hain. Storage system (Cassandra jaisa) mein ye bahut bura hai: 80% data ka network pe copy hona, terabytes. Server <em>girne</em> pe bhi yahi: N se N-1 hote hi phir sab kuch hil jaata hai. Humein aisa tareeka chahiye jisme server aaye ya jaaye to sirf <strong>uske hisse</strong> ki keys hilein.` },

    { type: 'h2', text: 'Idea: hash ko ek ghadi (ring) bana do' },
    { type: 'p', html: `Hash function 0 se lekar ek bahut bade number tak (maan lo 0 se 2<sup>32</sup> - 1, ~430 crore) kuch bhi deta hai. Is line ko mod ke ek <strong>circle</strong> bana do, jaise ghadi: sabse bada number ke baad wapas 0. Ab:` },
    { type: 'steps', items: [
      { t: 'Servers ring pe', d: 'Har server ke naam ka hash nikaalo (hash("Server A")). Wo number ring pe uski jagah hai.' },
      { t: 'Keys ring pe', d: 'Har key ka hash bhi ring pe ek point hai. Same hash function.' },
      { t: 'Clockwise chalo', d: 'Key ke point se clockwise (ghadi ki sui ki disha) chalo. Jo pehla server mile, key usi ki.' },
    ]},
    { type: 'ascii', text: `
                 0 / max
                    │
         Server D ● │ ● Server A
                 ╱  │  ╲        k1 → clockwise → A
        k3 ○   ╱         ╲  ○ k1
              │   RING    │
        k4 ○  │           │
               ╲         ╱ ○ k2   k2 → clockwise → B
                 ╲     ╱
         Server C ●───● Server B` },
    { type: 'p', html: `<strong>Naya server E aaya?</strong> Wo ring pe kisi ek jagah baithta hai, maan lo A aur B ke beech. Ab sirf wahi keys jo A aur E ke beech thi (pehle B ki thi) E ki ho jaati hain. Baaki saari keys ka "clockwise pehla server" wahi ka wahi. <strong>Server gaya?</strong> Uski keys bas agle clockwise server ki ho jaati hain. Koi aur key nahi hilti.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Consistent hashing', html: `<strong>Ye kya hai:</strong> keys aur servers dono ko same hash ring pe rakhna, aur key ko clockwise pehle server ko dena.<br><strong>Kyun chahiye:</strong> server jodne ya hatane pe average sirf ~1/N keys move hoti hain, jitna zaroori hai utna hi.<br><strong>Iske bina:</strong> <code>hash % N</code> mein har badlaav pe ~N/(N+1) keys hilti hain: cache khaali, ya terabytes ka data network pe.<br><strong>Example:</strong> 4 → 5 servers: % N mein ~80% keys hilti hain, ring pe ~20%.<br>Ye idea 1997 mein MIT ke Karger aur saathiyon ke paper se aaya, jo web caching ki isi problem ke liye tha. "Consistent" ka matlab yahan "mapping zyada nahi badalti" hai; iska CAP wali consistency se koi lena dena nahi.` },

    { type: 'h2', text: 'Ek dikkat: ring pe jagah barabar nahi' },
    { type: 'p', html: `4 servers ko ring pe random jagah mili. Kya chaaron ko ring ka barabar 25% hissa milega? Nahi. Random points kabhi paas paas gir jaate hain, kabhi door. Kisi server ke peeche ka gap (arc) 45% ka ho sakta hai, kisi ka 5%. To load bhi utna hi uneven. Aur jab ek server girta hai to uska <em>poora</em> load sirf ek padosi pe jaata hai, jo ab double load mein hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Virtual nodes (vnodes)', html: `<strong>Ye kya hai:</strong> har physical server ko ring pe <strong>ek nahi, kai jagah</strong> rakhna. Server A ke liye hash("A#0"), hash("A#1") ... hash("A#99"): 100 points. Har point ek <strong>virtual node</strong>.<br><strong>Kyun chahiye:</strong> (1) har server ke bahut saare chhote arcs, jinka total average ke paas aata hai: load barabar. (2) Server gira to uske chhote chhote hisse <em>saare</em> servers mein bikhar jaate hain, ek padosi pe nahi. (3) Badi machine ko zyada vnodes do, to wo zyada hissa leti hai.<br><strong>Iske bina:</strong> 4 servers, 4 random points: kisi ka arc 45%, kisi ka 5%. Aur ek server gira to uska poora bojh ek hi padosi pe.<br><strong>Arc</strong> = ring ka ek tukda, do points ke beech ka hissa.` },
    { type: 'p', html: `Ab khud khelo. Servers aur vnodes badlo, "ek server jodo" dabao, aur dekho kitni keys hilti hain: <code>% N</code> vs ring.` },

    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Servers (N): <strong class="ch-nv"></strong></label><input class="ch-n" type="range" min="2" max="10" step="1" value="4"></div>
          <div><label>Vnodes per server: <strong class="ch-vv"></strong></label><input class="ch-v" type="range" min="1" max="200" step="1" value="1"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary ch-add"></button></div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:12px">
          <svg class="ch-svg" viewBox="0 0 320 320" style="width:100%;max-width:320px;height:auto" role="img" aria-label="Hash ring: servers ke vnodes aur keys"></svg>
          <div class="ch-leg" style="flex:1;min-width:160px;font-size:14px"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>% N: keys moved</span><strong class="ch-mod"></strong></div>
          <div class="stat"><span>Ring: keys moved</span><strong class="ch-ring"></strong></div>
          <div class="stat"><span>Ideal: 1/(N+1)</span><strong class="ch-ideal"></strong></div>
          <div class="stat"><span>Load spread (std-dev ÷ avg)</span><strong class="ch-cv"></strong></div>
          <div class="stat"><span>Sabse bhaari server</span><strong class="ch-max"></strong></div>
        </div>
        <div class="calc-note ch-note"></div>`;
      const q = s => el.querySelector(s);
      const COL = ['var(--accent)', 'var(--green)', 'var(--amber)', 'var(--red)', 'var(--violet)', 'var(--net-s)', 'var(--queue-s)', 'var(--client-s)', 'var(--server-s)', 'var(--cache-t)', 'var(--ink)'];
      const NAMES = 'ABCDEFGHIJK'.split('');
      const h32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
      const K = 10000, SHOW = 90, keys = [];
      for (let i = 0; i < K; i++) keys.push(h32('key:' + i));
      const ring = (n, v) => { const p = []; for (let a = 0; a < n; a++) for (let j = 0; j < v; j++) p.push([h32(NAMES[a] + '#' + j), a]); return p.sort((x, y) => x[0] - y[0]); };
      const owner = (p, k) => { let lo = 0, hi = p.length; while (lo < hi) { const m = (lo + hi) >> 1; if (p[m][0] < k) lo = m + 1; else hi = m; } return p[lo === p.length ? 0 : lo][1]; };
      const pct = x => (x * 100).toFixed(1) + '%';
      let after = false;
      const ang = pos => pos / 4294967296 * 2 * Math.PI - Math.PI / 2;
      const pt = (pos, r) => [160 + r * Math.cos(ang(pos)), 160 + r * Math.sin(ang(pos))];
      const upd = () => {
        const n = Number(q('.ch-n').value), v = Number(q('.ch-v').value);
        q('.ch-nv').textContent = n; q('.ch-vv').textContent = v;
        q('.ch-add').textContent = after ? `Wapas ${n} servers` : `Ek server jodo (${n} → ${n + 1})`;
        const r1 = ring(n, v), r2 = ring(n + 1, v);
        const cnt = new Array(n + 1).fill(0);
        let movedR = 0, movedM = 0;
        const o1 = keys.map(k => owner(r1, k)), o2 = keys.map(k => owner(r2, k));
        keys.forEach((k, i) => { if (o1[i] !== o2[i]) movedR++; if (k % n !== k % (n + 1)) movedM++; cnt[after ? o2[i] : o1[i]]++; });
        const m = after ? n + 1 : n, live = cnt.slice(0, m), mean = K / m;
        const sd = Math.sqrt(live.reduce((a, c) => a + (c - mean) * (c - mean), 0) / m);
        const rr = after ? r2 : r1;
        let svg = `<circle cx="160" cy="160" r="120" fill="none" stroke="var(--line-2)" stroke-width="2"/>`;
        for (let a = 0; a < m; a++) {
          let d = '';
          rr.forEach(([pos, o]) => { if (o === a) { const [x1, y1] = pt(pos, 110), [x2, y2] = pt(pos, 132); d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`; } });
          svg += `<path d="${d}" stroke="${COL[a]}" stroke-width="${v > 30 ? 1.5 : 3}" stroke-linecap="round"/>`;
          if (v === 1) { const [lx, ly] = pt(rr.find(p => p[1] === a)[0], 146); svg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="${COL[a]}">${NAMES[a]}</text>`; }
        }
        for (let i = 0; i < SHOW; i++) {
          const [x, y] = pt(keys[i], 94), o = after ? o2[i] : o1[i], mv = after && o1[i] !== o2[i];
          svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${mv ? 5 : 3.5}" fill="${COL[o]}"${mv ? ' stroke="var(--ink)" stroke-width="2"' : ''}/>`;
        }
        svg += `<text x="160" y="154" text-anchor="middle" font-size="12" fill="var(--ink-3)">${SHOW} sample keys</text><text x="160" y="172" text-anchor="middle" font-size="12" fill="var(--ink-3)">${after ? 'mota ghera = moved' : 'rang = owner'}</text>`;
        q('.ch-svg').innerHTML = svg;
        q('.ch-leg').innerHTML = live.map((c, a) => `<div style="display:flex;align-items:center;gap:8px;margin:3px 0"><span style="width:12px;height:12px;border-radius:3px;background:${COL[a]};display:inline-block"></span><strong>${NAMES[a]}</strong><span style="font-family:var(--f-mono);color:var(--ink-2)">${pct(c / K)}</span></div>`).join('');
        q('.ch-mod').textContent = pct(movedM / K);
        q('.ch-ring').textContent = pct(movedR / K);
        q('.ch-ideal').textContent = pct(1 / (n + 1));
        q('.ch-cv').textContent = pct(sd / mean);
        q('.ch-max').textContent = (Math.max(...live) / mean).toFixed(2) + '× avg';
        q('.ch-note').textContent = v <= 3
          ? `Sirf ${v} point per server: arcs random hain, isliye load uneven (sabse bhaari server average ka ${(Math.max(...live) / mean).toFixed(1)} guna) aur naya server kitni keys lega ye luck pe hai (abhi ${pct(movedR / K)}, ideal ${pct(1 / (n + 1))}). Vnodes 100+ karke dekho.`
          : `% N mein ${pct(movedM / K)} keys hilin. Ring pe sirf ${pct(movedR / K)} (ideal ${pct(1 / (n + 1))}), aur wo bhi sirf naye server ki taraf.` + (Math.abs(movedR / K - 1 / (n + 1)) > 0.03 ? ' Ideal se thoda farak isliye ki naye server ke vnodes ko ring ka kitna hissa mila, ye abhi bhi thoda random hai; vnodes badhao to farak ghatega.' : ' Ideal ke bahut paas.') + ` Load spread: ${pct(sd / mean)}.`;
      };
      q('.ch-add').addEventListener('click', () => { after = !after; upd(); });
      ['.ch-n', '.ch-v'].forEach(s => q(s).addEventListener('input', upd));
      upd();
    }},

    { type: 'callout', tone: 'tip', title: 'Widget mein kya dekha', html: `Har setting pe <code>% N</code> wala number ~N/(N+1) pe atka rehta hai (4 servers: ~80%, 9: ~90%). Ring pe vnodes 1 ho to moved % aur load dono luck pe hain. Vnodes 200 ke aas paas karo to moved % ~1/(N+1) ke paas aa jaata hai (4 → 5 pe ~21%, 9 → 10 pe ~10%) aur sabse bhaari server average ke kareeb (~1.05-1.2×). Beech ki values (jaise 100) pe ye thoda upar neeche hota hai, kyunki naye server ka hissa ab bhi random points se banta hai. Aur dhyaan do: ring pe jo keys hilti hain wo <strong>sirf naye server pe</strong> jaati hain; purane servers ke beech koi faltu shuffle nahi.` },

    { type: 'h2', text: 'Replication along the ring' },
    { type: 'p', html: `Storage systems mein ek key ki ek copy kaafi nahi (Replication lesson). Ring isme bhi madad karta hai: key ka <strong>pehla</strong> clockwise server uska main ghar, aur uske baad ke <strong>agle N-1 alag physical servers</strong> uski replicas. Dynamo paper is list ko <em>preference list</em> kehta hai, aur Cassandra ki SimpleStrategy bhi ring pe clockwise chal ke replicas chunti hai. Vnodes ke saath ek pakad hai: clockwise agla point usi physical server ka doosra vnode ho sakta hai, to aise points skip karte hain, warna do "copies" ek hi machine pe hongi. Cassandra ki NetworkTopologyStrategy replicas ko alag racks (rack = data center mein machines ki ek almaari, jinki power aur network switch ek hi hota hai) pe bhi bikherti hai, taaki ek rack ki power jaane se saari copies na jaayein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Preference list (replicas on the ring)', html: `<strong>Ye kya hai:</strong> ek key ke liye un servers ki list jahan uski copies rahengi: ring pe key se clockwise chalte hue pehle N <em>alag</em> physical servers.<br><strong>Kyun chahiye:</strong> ek server gire to bhi data ki aur copies hon, aur har client bina kisi central table ke khud nikaal sake ki copies kahan hain.<br><strong>Iske bina:</strong> ya to ek hi copy (server gaya, data gaya), ya ek alag table jo batati ki copies kahan hain.<br><strong>Example:</strong> N = 3, key ka pehla server B: copies B, C, D pe. B gira to read C se.` },
    { type: 'flow', title: 'Ring pe 4 servers, N = 3 copies', height: 330,
      nodes: [
        { id: 'app', label: 'App server', sub: 'ring jaanta hai', x: 500, y: 170, w: 130, kind: 'server', info: 'Ye kya hai: xyz.com ka server. Iski client library (ya ek coordinator node) ke paas ring ka map hai: kaunsa server ring pe kahan. Key ka hash nikaal ke khud decide karta hai kahan jaana hai. Cassandra mein jis node pe request aati hai wahi coordinator ban jaata hai.' },
        { id: 'A', label: 'Server A', x: 500, y: 45, w: 120, h: 50, kind: 'cache', info: 'Ye kya hai: ek cache/storage server, ring pe 12 baje ke paas. Iske peeche (anticlockwise) wale arc ki keys iski.' },
        { id: 'B', label: 'Server B', x: 650, y: 170, w: 120, h: 50, kind: 'cache', info: 'Ye kya hai: doosra server, A ke baad clockwise. "user:42" ka hash A aur B ke beech girta hai, to B uska pehla ghar hai.' },
        { id: 'C', label: 'Server C', x: 500, y: 295, w: 120, h: 50, kind: 'cache', info: 'Ye kya hai: teesra server, B ke baad clockwise. N = 3 ho to "user:42" ki doosri copy yahan.' },
        { id: 'D', label: 'Server D', x: 350, y: 170, w: 120, h: 50, kind: 'cache', info: 'Ye kya hai: chautha server, C ke baad clockwise. "user:42" ki teesri copy. D ke baad ring wapas A pe.' },
        { id: 'E', label: 'Server E', sub: 'naya', x: 650, y: 55, w: 110, h: 50, kind: 'cache', hidden: true, info: 'Ye kya hai: naya server. Ring pe A aur B ke beech jagah mili. Sirf A se E tak ke arc ki keys (jo pehle B ki thi) ab iski.' },
      ],
      edges: [
        { a: 'app', b: 'A' }, { a: 'app', b: 'B' }, { a: 'app', b: 'C' }, { a: 'app', b: 'D' }, { a: 'app', b: 'E', id: 'appE', hidden: true },
        { a: 'A', b: 'B', id: 'AB', dashed: true }, { a: 'B', b: 'C', dashed: true }, { a: 'C', b: 'D', dashed: true }, { a: 'D', b: 'A', dashed: true },
        { a: 'A', b: 'E', id: 'AE', dashed: true, hidden: true }, { a: 'E', b: 'B', id: 'EB', dashed: true, hidden: true },
      ],
      scenarios: [
        { name: 'Write + 3 copies', steps: [
          { title: 'Key ka ghar nikaalo', text: 'App ne hash("user:42") nikaala. Wo ring pe A aur B ke beech gira. Clockwise pehla server: B.', focus: ['app', 'B'], msg: 'hash("user:42") → A aur B ke beech → owner B' },
          { title: 'Teen copies, clockwise', text: 'N = 3: B (pehla), phir clockwise C, phir D. App teeno ko ek saath write bhejta hai.', parallel: true, go: ['app>B', 'app>C', 'app>D'], after: { B: { sub: 'user:42 (1)' }, C: { sub: 'user:42 (2)' }, D: { sub: 'user:42 (3)' } } },
          { title: 'Read', text: 'Read B se (ya quorum ho to B, C, D mein se 2 se). A ke paas ye key hai hi nahi.', go: ['app>B', 'res:B>app'], set: { A: { state: 'dim' } }, after: { B: { state: 'hit' } } },
        ]},
        { name: 'Server B down', steps: [
          { title: 'B gir gaya', text: 'Server B crash.', set: { B: { state: 'down', sub: 'DOWN' }, C: { sub: 'user:42 (2)' }, D: { sub: 'user:42 (3)' } }, go: 'lost:app>B' },
          { title: 'Agla clockwise: C', text: 'App ring pe aage chalta hai. C ke paas copy hai. Request kaamyaab. Koi global reshuffle nahi hua.', go: ['app>C', 'res:C>app'], after: { C: { state: 'hit' } } },
          { title: 'Sirf B ka hissa affect', text: 'Agar ye sirf cache hai (copies nahi), to bhi sirf B ki keys (~1/4) miss hongi, aur wo apne aap agle server ki ban jaayengi. A, C, D ki apni keys bilkul wahi. % N mein yahan 4 → 3 hote hi ~75% keys hil jaatin.', focus: ['A', 'C', 'D'] },
        ]},
        { name: 'Naya server E', steps: [
          { title: 'E ring pe aaya', text: 'Naye server ke naam ka hash A aur B ke beech gira.', show: ['E', 'appE', 'AE', 'EB'], hide: ['AB'], focus: ['E'] },
          { title: 'Sirf ek arc move hota hai', text: 'A se E tak ke arc ki keys pehle B ki thi, ab E ki. Sirf ye data B se E pe copy hota hai.', go: 'evt:B>E', after: { E: { state: 'ok', sub: 'A–E arc' } } },
          { title: 'Baaki sab apni jagah', text: 'A, C, D ki ek bhi key nahi hili. Vnodes ke saath E ke kai chhote arcs hote, aur wo har server se thoda thoda leta, ek se bahut saara nahi.', set: { A: { sub: 'no change' }, C: { sub: 'no change' }, D: { sub: 'no change' } }, focus: ['A', 'C', 'D'] },
        ]},
        { name: 'Hot key', intro: 'Consistent hashing kya NAHI karta.', steps: [
          { title: 'Viral post', text: 'Ek post ki key "post:99" pe ek second mein lakhon reads. Ring us key ko hamesha ek hi ghar (B) deta hai.', flood: { paths: ['app>B'], n: 16 }, after: { B: { state: 'hot', sub: 'post:99 HOT' } } },
          { title: 'Ring yahan bekaar', text: 'Consistent hashing <em>keys</em> ko barabar baantta hai, ek key ke <em>traffic</em> ko nahi. Hot key ke liye: uski replicas se bhi reads (C, D), app server ki local memory mein cache, ya key splitting (Sharding lesson).', go: ['app>C', 'res:C>app'], focus: ['B'] },
        ]},
      ],
    },

    { type: 'p', html: `Ab ring pe khud chal ke dekho. Key chuno, copies (N) chuno, aur dekho clockwise walk kin servers ko chunti hai. Vnodes 3 karo aur "same machine skip" OFF karo: kya hota hai? Phir ek server down karo. (Yahan positions asli hash se nikle hain, isliye upar wale diagram se alag hain.)` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="rr-k" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="rr-o" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"></div>
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:12px">
          <svg class="rr-svg" viewBox="0 0 320 320" style="width:100%;max-width:320px;height:auto" role="img" aria-label="Hash ring par replicas"></svg>
          <div class="rr-walk" style="flex:1;min-width:180px;font-size:14px"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Copies kahan</span><strong class="rr-res"></strong></div>
          <div class="stat"><span>Alag machines</span><strong class="rr-dist"></strong></div>
        </div>
        <div class="calc-note rr-note"></div>`;
      const q = s => el.querySelector(s);
      const h32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
      const S = ['A', 'B', 'C', 'D'], COL = { A: 'var(--accent)', B: 'var(--green)', C: 'var(--amber)', D: 'var(--violet)' };
      const KEYS = ['user:42', 'video:3', 'user:1', 'user:7'];
      let key = 'user:42', rf = 3, vn = 1, skip = true, down = '';
      function walk(key, rf, vn, skip, down) {
        const pts = []; S.forEach(s => { for (let j = 0; j < vn; j++) pts.push({ pos: h32(s + '#' + j), s, j }); });
        pts.sort((a, b) => a.pos - b.pos);
        const kp = h32(key);
        let i0 = pts.findIndex(p => p.pos >= kp); if (i0 < 0) i0 = 0;
        const steps = [], chosen = [];
        for (let t = 0; t < pts.length && chosen.length < rf; t++) {
          const p = pts[(i0 + t) % pts.length];
          if (p.s === down) steps.push([p, 'down']);
          else if (skip && chosen.some(c => c.s === p.s)) steps.push([p, 'skip']);
          else { chosen.push(p); steps.push([p, 'pick']); }
        }
        return { pts, kp, steps, chosen, distinct: new Set(chosen.map(c => c.s)).size };
      }
      const ang = pos => pos / 4294967296 * 2 * Math.PI - Math.PI / 2;
      const pt = (pos, r) => [160 + r * Math.cos(ang(pos)), 160 + r * Math.sin(ang(pos))];
      const chip = (box, txt, on, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on ? ' on' : ''); b.textContent = txt; b.onclick = fn; box.appendChild(b); };
      const upd = () => {
        const kb = q('.rr-k'); kb.innerHTML = '';
        KEYS.forEach(k => chip(kb, k, k === key, () => { key = k; upd(); }));
        const ob = q('.rr-o'); ob.innerHTML = '';
        [1, 2, 3].forEach(v => chip(ob, 'N = ' + v, v === rf, () => { rf = v; upd(); }));
        [1, 3].forEach(v => chip(ob, v + ' vnode' + (v > 1 ? 's' : ''), v === vn, () => { vn = v; upd(); }));
        chip(ob, 'Same machine skip: ' + (skip ? 'ON' : 'OFF'), skip, () => { skip = !skip; upd(); });
        chip(ob, down ? 'Server ' + down + ' down' : 'Sab servers up', !!down, () => { down = down === '' ? 'B' : down === 'B' ? 'C' : ''; upd(); });
        const r = walk(key, rf, vn, skip, down);
        const last = r.steps.length ? r.steps[r.steps.length - 1][0].pos : r.kp;
        const [ax, ay] = pt(r.kp, 120), [bx, by] = pt(last, 120);
        let sweep = (last - r.kp + 4294967296) % 4294967296;
        let svg = `<circle cx="160" cy="160" r="120" fill="none" stroke="var(--line-2)" stroke-width="2"/>`;
        if (sweep > 0) svg += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)} A120 120 0 ${sweep > 2147483648 ? 1 : 0} 1 ${bx.toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="6" stroke-opacity="0.35"/>`;
        r.pts.forEach(p => {
          const st = r.steps.find(x => x[0] === p), [x1, y1] = pt(p.pos, 108), [x2, y2] = pt(p.pos, 134), [lx, ly] = pt(p.pos, 150);
          const isDown = p.s === down, picked = st && st[1] === 'pick';
          svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${isDown ? 'var(--ink-3)' : COL[p.s]}" stroke-width="${picked ? 6 : 3}" stroke-linecap="round"${isDown ? ' stroke-dasharray="3 3"' : ''}/>`;
          svg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="${isDown ? 'var(--ink-3)' : COL[p.s]}">${p.s}${vn > 1 ? p.j : ''}</text>`;
        });
        const [kx, ky] = pt(r.kp, 120);
        svg += `<circle cx="${kx.toFixed(1)}" cy="${ky.toFixed(1)}" r="7" fill="var(--ink)"/><text x="160" y="156" text-anchor="middle" font-size="13" fill="var(--ink-2)">${key}</text><text x="160" y="174" text-anchor="middle" font-size="11" fill="var(--ink-3)">● = key, clockwise chalo</text>`;
        q('.rr-svg').innerHTML = svg;
        const LBL = { pick: 'copy yahan', skip: 'skip: same machine', down: 'skip: down' };
        q('.rr-walk').innerHTML = '<strong>Clockwise walk:</strong>' + r.steps.map(([p, w], i) => `<div style="margin:3px 0;color:${w === 'pick' ? 'var(--ink)' : 'var(--ink-3)'}">${i + 1}. <strong style="color:${COL[p.s]}">${p.s}${vn > 1 ? p.j : ''}</strong>: ${LBL[w]}</div>`).join('');
        q('.rr-res').textContent = r.chosen.map(c => c.s).join(', ');
        q('.rr-dist').textContent = r.distinct + ' / ' + rf;
        let note;
        if (r.distinct < rf) note = `Gadbad: ${rf} copies chahiye thi, lekin sirf ${r.distinct} alag machines pe hain. Ek hi machine ke do vnodes ne do "copies" le li. Wo machine gayi to dono copies gayi. Isliye "same machine skip" ON rakhte hain.`;
        else if (down) note = `Server ${down} down hai, to walk use chhod ke agle server pe gayi. ${key} ki copies ab ${r.chosen.map(c => c.s).join(', ')} pe. ${down} wapas aaye to jo writes uske liye doosre ne sambhaale, wo use wapas de diye jaate hain (Dynamo isse hinted handoff kehta hai).`;
        else note = `${key} ka hash ring pe gira, aur clockwise pehla server ${r.chosen[0].s} uska main ghar. ${rf > 1 ? 'Agle ' + (rf - 1) + ' alag server (' + r.chosen.slice(1).map(c => c.s).join(', ') + ') replicas. Is list ko Dynamo "preference list" kehta hai.' : 'N = 1: sirf ek copy.'}`;
        q('.rr-note').textContent = note;
      };
      upd();
    }},

    { type: 'h2', text: 'Ye kahan use hota hai?' },
    { type: 'table', head: ['System', 'Kaise'], rows: [
      ['Amazon Dynamo (2007 paper)', 'Ring + virtual nodes + preference list (agle N alag nodes) pe replicas. Consistent hashing ko famous isi paper ne kiya.'],
      ['Apache Cassandra, ScyllaDB', 'Token ring: har node ke kai tokens (vnodes). Cassandra 4.0 se default <code>num_tokens</code> 16 hai (pehle 256), kyunki naya token allocator kam tokens mein bhi barabar load deta hai.'],
      ['Distributed caches', 'Memcached/Redis client libraries (jaise purana "ketama" algorithm) keys ko cache servers pe ring se baant ti hain, taaki ek server jaane pe poora cache khaali na ho.'],
      ['CDNs aur load balancers', 'Same URL ko hamesha same cache server pe bhejo (hit rate badhta hai). 1997 ka original paper isi web caching ke liye tha. Envoy proxy mein "ring hash" aur "Maglev" load balancers isi family ke hain.'],
      ['Discord', '2023 ki post ke mutabik requests ko channel ke hisaab se consistent hashing se same data-service instance pe route karte hain.'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'DynamoDB aur Redis Cluster: ring nahi', html: `Roadmap DynamoDB ko is list mein rakhta hai, aur idea ka rishta sach hai: DynamoDB bhi partition key ka hash leta hai. Lekin uske 2022 paper ke mutabik table <strong>partitions</strong> mein bati hai, har partition hash space ki ek lagataar range rakhti hai, aur garam/bade partitions <strong>split</strong> hote hain. Ye Dynamo paper wala vnode ring nahi hai (DynamoDB ne naam liya, architecture nahi). Isi tarah <strong>Redis Cluster</strong> ring nahi, 16,384 fixed hash slots use karta hai jo nodes ke beech move hote hain: wahi "fixed many partitions" approach jo Sharding lesson mein dekha. Dono ka goal same hai: node badlo to kam data hile.` },

    { type: 'h2', text: 'Alternative: rendezvous (HRW) hashing' },
    { type: 'callout', tone: 'term', title: 'Naya word: Rendezvous hashing (HRW)', html: `<strong>Ye kya hai:</strong> ring ke bina ek tareeka. Har key ke liye har server ka ek "score" nikaalo; sabse bade score wala server jeetta hai. Jaise har server key ke liye ek lottery ticket kheenchta hai, aur sabse bada number jeetta hai. Lekin ticket random nahi, hash se aata hai, to har baar same.<br><strong>Kyun chahiye:</strong> code bahut simple, vnodes ki zaroorat nahi, aur load apne aap barabar.<br><strong>Iske bina:</strong> ring + vnodes ka poora map sambhalna padta.<br><strong>Example:</strong> 6 servers, key "user:42": scores 71, 12, 94, 40, 55, 8 (maan lo). Server C (94) jeeta. C hata to agla sabse bada (A, 71) jeetega, aur baaki keys ke winners waise hi rahenge.` },
    { type: 'p', html: `Ek aur bahut simple tareeka, ring ke bina. Har key ke liye <strong>har server</strong> ka ek score nikaalo: <code>score = hash(key + server)</code>. Jiska score sabse <strong>bada</strong>, key usi ki. Isliye naam: <strong>Highest Random Weight</strong> (HRW), ya rendezvous hashing (1990s mein Thaler aur Ravishankar ne diya).` },
    { type: 'list', items: [
      `<strong>Server hata:</strong> sirf wahi keys hilti hain jinka winner wo tha; baaki sabka winner wahi.`,
      `<strong>Server aaya:</strong> wo har key pe naya score laata hai, aur sirf ~1/(N+1) keys pe jeetta hai.`,
      `<strong>Bonus:</strong> vnodes ki zaroorat nahi, spread apne aap barabar. Replicas chahiye? Top 3 scores wale servers.`,
      `<strong>Cost:</strong> har lookup pe N hashes (har server ka score). 10-50 servers pe kuch nahi; hazaaron pe ring behtar, jahan sorted list mein binary search (aadha-aadha karke dhoondhna) se kuch hi steps lagte hain.`,
    ]},
    { type: 'p', html: `Khud dekho: key <code>user:42</code> ke liye 6 servers ke score. Servers on/off karo:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="hrw-tg" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        <div class="hrw-bars" style="margin-top:12px"></div>
        <div class="stats">
          <div class="stat"><span>user:42 ka winner</span><strong class="hrw-win"></strong></div>
          <div class="stat"><span>10,000 keys mein se hili (sab on ke mukable)</span><strong class="hrw-mv"></strong></div>
          <div class="stat"><span>Expected</span><strong class="hrw-exp"></strong></div>
        </div>
        <div class="calc-note hrw-note"></div>`;
      const q = s => el.querySelector(s);
      const h32 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
      const S = ['A', 'B', 'C', 'D', 'E', 'F'], on = { A: 1, B: 1, C: 1, D: 1, E: 1, F: 1 };
      const win = (key, list) => { let best = null, bs = -1; list.forEach(s => { const sc = h32(key + '|' + s); if (sc > bs) { bs = sc; best = s; } }); return best; };
      const K = 10000, base = [];
      for (let i = 0; i < K; i++) base.push(win('key:' + i, S));
      const upd = () => {
        const tg = q('.hrw-tg'); tg.innerHTML = '';
        S.forEach(s => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (on[s] ? ' on' : ''); b.textContent = 'Server ' + s + (on[s] ? ' on' : ' off'); b.onclick = () => { if (on[s] && S.filter(x => on[x]).length === 1) return; on[s] = on[s] ? 0 : 1; upd(); }; tg.appendChild(b); });
        const live = S.filter(s => on[s]);
        const w = win('user:42', live);
        q('.hrw-bars').innerHTML = S.map(s => { const sc = h32('user:42|' + s), p = sc / 4294967296 * 100;
          const col = !on[s] ? 'var(--line-2)' : s === w ? 'var(--green)' : 'var(--accent)';
          return `<div style="display:grid;grid-template-columns:70px 1fr 60px;gap:10px;align-items:center;margin:5px 0;opacity:${on[s] ? 1 : 0.45}"><strong>Server ${s}</strong><div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${p.toFixed(1)}%;background:${col}"></div></div><span style="font:13px var(--f-mono)">${p.toFixed(1)}</span></div>`; }).join('');
        let mv = 0;
        for (let i = 0; i < K; i++) if (win('key:' + i, live) !== base[i]) mv++;
        const off = S.length - live.length;
        q('.hrw-win').textContent = 'Server ' + w;
        q('.hrw-mv').textContent = (mv / K * 100).toFixed(1) + '%';
        q('.hrw-exp').textContent = (off / S.length * 100).toFixed(1) + '%';
        q('.hrw-note').textContent = off === 0 ? 'Saare servers on. Kisi server ko off karo: sirf ussi ki keys (~1/6 = 16.7%) naye winners ke paas jaayengi.' : `${off} server off: sirf unki keys hilin (expected ${off}/6 = ${(off / 6 * 100).toFixed(1)}%). Baaki har key ka winner wahi raha, kyunki uske scores badle hi nahi.`;
      };
      upd();
    }},

    { type: 'h3', text: 'Jump consistent hash (awareness)' },
    { type: 'p', html: `Google ke Lamping aur Veach ne 2014 mein <strong>jump consistent hash</strong> diya: kuch lines ka function jo key aur bucket count lekar bucket number deta hai (bucket = ek numbered shard ya server: 0, 1, 2...). Na ring, na memory, load lagbhag perfect barabar, aur N se N+1 pe sirf ~1/(N+1) keys move. Shart: buckets ka number <code>0 ... N-1</code> hona chahiye, aur sirf <strong>aakhri</strong> bucket jod ya hata sakte ho. Isliye ye sharded storage ke liye achha hai (jahan shards numbered hain aur khud replicated hain), lekin cache cluster ke liye nahi jahan beech ka koi bhi server kabhi bhi mar sakta hai.` },
    { type: 'table', head: ['', 'hash % N', 'Ring + vnodes', 'Rendezvous (HRW)', 'Jump hash'], rows: [
      ['Node jodne pe move', '~N/(N+1)', '~1/(N+1)', '~1/(N+1)', '~1/(N+1)'],
      ['Load spread', 'Barabar', 'Vnodes pe depend', 'Barabar', 'Barabar'],
      ['Lookup cost', 'O(1)', 'O(log of total vnodes)', 'O(N)', 'O(log N), no memory'],
      ['Koi bhi node hata sakte ho?', 'Haan (sab hilta hai)', 'Haan', 'Haan', 'Nahi, sirf aakhri'],
      ['Example', 'Simple, fixed clusters', 'Dynamo, Cassandra, caches', 'Chhote clusters, top-k replicas', 'Numbered shards'],
    ]},
    { type: 'p', html: `(O(...) ka matlab: servers badhne pe ek lookup ka kaam kitna badhta hai. O(1) = hamesha utna hi. O(N) = har server ke liye ek kaam. O(log N) = bahut dheere badhta hai: 1,000 points pe ~10 steps.)` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: consistent hashing kab?', html: `Use karo jab <strong>nodes baar baar aate-jaate hain</strong> (cache clusters, storage nodes, autoscaling) aur <strong>data move karna mehenga</strong> hai. Agar shards ki ginti fixed hai aur kabhi kabhi hi badalti hai, to "bahut saare fixed logical partitions + ek map" (jaise Redis Cluster ke 16,384 slots) utna hi achha aur samajhne mein aasaan hai. Chhote cluster aur simple code chahiye to rendezvous hashing.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusions', html: `<strong>1.</strong> Consistent hashing hot keys ka ilaaj nahi: ek key ka saara traffic phir bhi ek server pe (upar ka "Hot key" scenario).<br><strong>2.</strong> "Consistent" ka matlab data consistency nahi, sirf mapping ka stable rehna.<br><strong>3.</strong> Ring se data <em>apne aap</em> move nahi hota. Ring sirf batata hai kaunsi keys ka ghar badla; storage system ko wo data copy (streaming) karna padta hai, aur cache mein wo keys bas miss hoke dobara bharti hain.` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'Consistent hashing: xyz.com ka cache cluster', height: 600,
      groups: [
        { label: 'Users + app', x: 30, y: 6, w: 440, h: 206 },
        { label: 'Cache cluster (ring)', x: 70, y: 222, w: 600, h: 248 },
        { label: 'Data', x: 510, y: 496, w: 200, h: 92 },
      ],
      nodes: [
        { id: 'users', label: 'xyz.com users', x: 360, y: 55, kind: 'client', info: 'Ye kya hai: xyz.com ke log. Har page ke liye app ko kai keys (user:42, post:99) cache se chahiye.' },
        { id: 'app', label: 'App servers', sub: 'ring client', x: 360, y: 160, w: 170, kind: 'server', info: 'Ye kya hai: xyz.com ka code. Iski client library key ka hash nikaal ke ring pe clockwise pehla server chunti hai. Sab app servers ke paas same ring map hona chahiye.' },
        { id: 'map', label: 'Ring map', sub: 'nodes + vnodes', x: 130, y: 160, w: 150, kind: 'data', info: 'Ye kya hai: list ki kaunsa server (aur uske vnodes) ring pe kahan hai. Config service ya gossip (nodes ka aapas mein khabar failana) se sab app servers tak pahunchti hai. Server aaye ya jaaye to yahi badalta hai.' },
        { id: 'ring', label: 'Hash ring', sub: '0 → 2³² → 0', x: 360, y: 350, w: 130, kind: 'net', info: 'Ye kya hai: hash ki poori range ek gol ghadi ki tarah. Servers aur keys dono is pe points hain; key clockwise pehle server ki.' },
        { id: 'cA', label: 'Cache A', x: 360, y: 265, w: 120, kind: 'cache', info: 'Ye kya hai: ek cache server (jaise Redis/Memcached), ring pe upar. D aur A ke beech ke arc ki keys iski.' },
        { id: 'cE', label: 'Cache E', sub: 'naya', x: 590, y: 250, w: 120, kind: 'cache', info: 'Ye kya hai: naya joda gaya server. Ring pe A aur B ke beech baitha, to sirf A-E arc ki keys (pehle B ki) iski hui. Baaki koi key nahi hili.' },
        { id: 'cB', label: 'Cache B', x: 580, y: 380, w: 120, kind: 'cache', info: 'Ye kya hai: ring pe daayein taraf ka server. Replication ho to iski keys ki copies agle clockwise servers (C, D) pe.' },
        { id: 'cC', label: 'Cache C', x: 360, y: 435, w: 120, kind: 'cache', info: 'Ye kya hai: ring pe neeche ka server. B ki keys ki doosri copy yahan (N = 3 ho to).' },
        { id: 'cD', label: 'Cache D', x: 150, y: 350, w: 120, kind: 'cache', info: 'Ye kya hai: ring pe baayein taraf ka server. Ye gira to iski keys bas agle clockwise server (A) ki ho jaati hain; vnodes ho to sab servers mein bikhar jaati hain.' },
        { id: 'db', label: 'Database', sub: 'cache miss pe', x: 610, y: 542, w: 160, kind: 'data', info: 'Ye kya hai: asli data. Server jodne/hatane pe jo keys hilti hain, wo ek baar miss hoke yahan se aati hain. Ring ki wajah se ye sirf ~1/N keys hain, % N jaisi baadh nahi.' },
      ],
      edges: [
        { a: 'users', b: 'app', n: 1 },
        { a: 'app', b: 'map', dashed: true },
        { a: 'app', b: 'cA', n: 2, label: 'hash(key)' },
        { a: 'app', b: 'cB' },
        { a: 'app', b: 'cD' },
        { a: 'cA', b: 'cE', dashed: true, both: false },
        { a: 'cE', b: 'cB', dashed: true, both: false },
        { a: 'cB', b: 'cC', dashed: true, both: false },
        { a: 'cC', b: 'cD', dashed: true, both: false },
        { a: 'cD', b: 'cA', dashed: true, both: false },
        { a: 'app', b: 'db', dashed: true, label: 'miss', via: [[690, 160], [690, 486]] },
      ],
      paths: [
        { name: 'Key lookup', text: 'App ne key ka hash nikaala, ring map dekha, clockwise pehla server A: seedha wahin.', go: ['users>app>cA', 'app>map'] },
        { name: 'Server joda', text: 'E aaya: sirf A-E arc ki keys B se E pe gayin. A, C, D ki keys wahi.', go: ['cA>cE', 'cE>cB'] },
        { name: '3 copies', text: 'Key ka ghar B; N = 3 ho to agle clockwise alag servers C aur D pe copies.', go: ['app>cB', 'cB>cC', 'cC>cD'] },
        { name: 'Server gira', text: 'D gira: uski keys agle clockwise server A ki, aur sirf wahi keys ek baar DB se bharti hain.', go: ['app>cD', 'cD>cA', 'app>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li><code>hash % N</code> mein N badalte hi ~N/(N+1) keys hilti hain (4 → 5: 80%). Cache khaali, ya terabytes copy.</li>
      <li>Consistent hashing: servers aur keys ek ring pe; key clockwise pehle server ki. Server aaye/jaaye to sirf ~1/N keys hilti hain.</li>
      <li>Kam points = uneven arcs. Vnodes (har server ke kai points) se load barabar, aur gire server ka bojh sab mein bikharta hai.</li>
      <li>Replicas: key se clockwise agle N alag physical servers (preference list). Same machine ke vnodes skip karo.</li>
      <li>Rendezvous (HRW): har server ka score, sabse bada jeetta. Simple, vnodes nahi, lekin har lookup pe N hashes.</li>
      <li>Jump hash: memory nahi, perfect spread, lekin sirf aakhri bucket jod/hata sakte ho.</li>
      <li>Hot key ka ilaaj nahi: ek key hamesha ek ghar pe.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Node jodne/hatane pe sirf ~1/N keys hilti hain', 'Cache cluster badhane pe miss ka toofan nahi', 'Vnodes se barabar load aur bade machines ko zyada hissa', 'Ring pe hi replicas: agle N alag nodes'], costs: ['hash % N se zyada complex (ring map, vnodes, sab clients ko same view chahiye)', 'Kam vnodes = uneven load; zyada vnodes = bada map aur zyada metadata', 'Hot keys ka koi ilaaj nahi', 'Data movement (streaming) ka kaam phir bhi karna padta hai'] },

    { type: 'think', questions: [
      { q: 'xyz.com ke 10 Redis cache servers hain, client hash % 10 use karta hai. Ek server ki memory kharab hui aur wo hata diya. Kya hoga? Consistent hashing se kya badlega?', a: '% 9 pe jaate hi ~90% keys ka server badal jaayega: cache lagbhag khaali, database pe achanak 10 guna load. Ring ke saath sirf us ek server ki keys (~10%) miss hongi aur wo baaki 9 pe bikhar jaayengi (vnodes ki wajah se). DB ko sirf 10% extra misses.' },
      { q: 'Ek cluster mein 3 purane chhote servers aur 2 naye servers hain jo 3 guna bade hain. Ring pe load kaise baantoge?', a: 'Vnodes capacity ke hisaab se: chhote servers ko 100-100 vnodes, bade servers ko 300-300. Ring pe bade servers ke 3 guna points, to roughly 3 guna keys. Rendezvous mein bhi weighted variant hota hai.' },
      { q: 'Vnodes 1,000 per server kar diye to kya nuksaan?', a: 'Ring ka map bada (servers × 1,000 entries) jo har client/coordinator ke paas rakhna aur gossip (nodes ka aapas mein khabar failana) se bhejna padta hai; lookup thoda slow; aur ek naye node ko bahut saare chhote hisse alag alag nodes se stream karne padte hain. Cassandra ne isi tarah ki wajah se default 256 se 16 kiya, ek smarter token allocator ke saath.' },
    ]},
    { type: 'quiz', questions: [
      { q: '4 cache servers se 5 kiye, hash % N ke saath. Lagbhag kitni keys ka server badlega?', options: ['~20%', '~50%', '~80%'], answer: 2, explain: 'Key tabhi bachti hai jab hash % 4 = hash % 5, jo ~1/5 baar hota hai. Baaki ~4/5 = 80% move.' },
      { q: 'Ring pe key kis server ki hoti hai?', options: ['Sabse paas wala server, kisi bhi disha mein', 'Key ke point se clockwise pehla server', 'Random server'], answer: 1, explain: 'Convention clockwise ka hai. Server hata to keys agle clockwise server pe.' },
      { q: 'Virtual nodes ka main faayda?', options: ['Data encrypt hota hai', 'Load barabar aur node jaane pe uska load sab nodes pe bikharta hai', 'Lookup O(1) ho jaata hai'], answer: 1, explain: 'Har server ke kai chhote arcs hote hain, to total hissa average ke paas, aur failure ka load ek padosi pe nahi jaata.' },
      { q: 'Rendezvous hashing mein key kis server ki hai?', options: ['Jiska hash(key + server) score sabse bada', 'Ring pe clockwise pehla', 'hash % N'], answer: 0, explain: 'Highest Random Weight: har server ka score, sabse bada jeetta. Server hata to sirf uski jeeti hui keys hilti hain.' },
      { q: 'Vnodes ke saath ring pe replicas chunte waqt "same physical server" wale points kyun skip karte hain?', options: ['Speed ke liye', 'Warna do copies ek hi machine pe ho sakti hain, aur wo machine gayi to dono copies gayi', 'Vnodes pe write nahi ho sakta'], answer: 1, explain: 'Clockwise agla point usi server ka doosra vnode ho sakta hai. Lab mein skip OFF karke dekha: N = 3 maanga, lekin sirf 2 alag machines mili.' },
      { q: 'Viral post ki ek key pe lakhon reads/sec. Consistent hashing kya karega?', options: ['Traffic sab servers pe baant dega', 'Kuch nahi: ek key hamesha ek hi ghar pe; hot key ke liye replicas/local cache/key splitting chahiye', 'Key ko delete kar dega'], answer: 1, explain: 'Ye keys ko baantta hai, ek key ke traffic ko nahi.' },
    ]},
    { type: 'sources', note: 'Papers aur docs jinse specific facts liye gaye.', items: [
      { title: 'Consistent Hashing and Random Trees (Karger et al., STOC 1997)', publisher: 'ACM STOC / MIT', official: true, url: 'https://cs.brown.edu/courses/csci2950-u/f09/papers/chash97stoc.pdf', used: 'Consistent hashing ka origin, web caching motivation.' },
      { title: 'Dynamo: Amazon\'s Highly Available Key-value Store', publisher: 'SOSP 2007 (Amazon)', official: true, url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf', used: 'Ring, virtual nodes, preference list (agle N distinct nodes), hinted handoff.' },
      { title: 'Cassandra docs: Dynamo architecture aur production recommendations', publisher: 'Apache Cassandra', official: true, url: 'https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html', used: 'Token ring, vnodes, clockwise replica selection, NetworkTopologyStrategy racks, num_tokens default 16 (4.0+).' },
      { title: 'Amazon DynamoDB (USENIX ATC 2022)', publisher: 'USENIX / Amazon', official: true, url: 'https://www.usenix.org/system/files/atc22-elhemali.pdf', used: 'Hash of partition key, contiguous key-range partitions, splits: ring nahi.' },
      { title: 'A Fast, Minimal Memory, Consistent Hash Algorithm (Lamping, Veach 2014)', publisher: 'Google (arXiv)', official: true, url: 'https://arxiv.org/abs/1406.2294', used: 'Jump consistent hash ke properties aur limitation (sirf aakhri bucket).' },
      { title: 'How Discord Stores Trillions of Messages', publisher: 'Discord blog (2023)', official: true, url: 'https://discord.com/blog/how-discord-stores-trillions-of-messages', used: 'Channel ke hisaab se consistent-hash routing to data services.' },
    ]},
  ],
});
