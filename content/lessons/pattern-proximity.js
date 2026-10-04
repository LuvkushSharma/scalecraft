Lesson.register({
  id: 'pattern-proximity',
  title: 'Proximity search ("near me")',
  minutes: 32,
  summary: `"Mere 2 km mein kaun live hai?", "aas paas kaunse events hain?", "sabse paas ke 5 drivers?" Ye sab ek hi pattern hai: naksha (map) chhote khaanon (cells) mein baanto, sirf aas paas ke khaane padho, phir asli doori se chhaano. Seedhi chadhenge: seedha scan, geohash, quadtree, S2/H3, aur phir asli tools: Redis GEO (hilti cheezein), Elasticsearch / PostGIS (tiki cheezein).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum app kholte ho aur poochhte ho: "mere paas kaun hai?"<br>App ke paas 10 lakh logon ki location hai. Har ek se tumhari doori naapna bahut slow hai.<br>Isliye naksha chhote khaanon mein baant dete hain, jaise graph paper.<br>Phir sirf tumhare khaane aur uske padosi khaanon mein dekhte hain. Baaki duniya ko chhoote bhi nahi.<br>Is lesson mein seekhenge ki ye khaane kaise banate hain, aur kinare pe khade user ke saath kya gadbad hoti hai.` },
    { type: 'h2', text: 'Is pattern ki seedhi (ladder)' },
    { type: 'steps', items: [
      { t: 'Rung 1: Seedha scan / lat-lng box', d: 'Sab se doori naapo, ya latitude-longitude ke range se. Chhote data pe bilkul theek.' },
      { t: 'Rung 2: Geohash cells + padosi', d: 'Naksha barabar khaanon mein. Har point ka khaana ek string. Apna + 8 padosi khaane padho.' },
      { t: 'Rung 3: Quadtree', d: 'Bheed wali jagah chhote khaane, khaali jagah bade. Har khaane mein lagbhag barabar log.' },
      { t: 'Rung 4: S2 / H3', d: 'Golaakaar (round) Earth ke liye bane khaane. H3 mein hexagon, saare padosi barabar door.' },
      { t: 'Rung 5: Asli tool chuno', d: 'Hilti cheezein (drivers) → Redis GEO. Tiki cheezein (events) → Elasticsearch ya PostGIS.' },
      { t: 'Rung 6: Scale', d: 'Area ke hisaab se keys todna, garam khaane (hot cells), "sabse paas ke 5" ke liye ring badhana.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'Kab rukna hai (stop climbing)', html: `5,000 venues, Postgres already hai? Rung 1 ya seedha PostGIS (Rung 5) kaafi. Lakhon hilte points? Rung 2 + Redis GEO. Shehar aur gaon mein density bahut alag? Quadtree ya H3. Har rung ke end mein "kab ruko" hai.` },
    { type: 'h2', text: 'Problem: "near me" normal index se slow kyun?' },
    { type: 'p', html: `xyz.com pe do naye features aaye: <strong>Nearby creators</strong> (tumhare 2 km mein abhi live stream kar rahe log) aur <strong>Events near you</strong> (is weekend aas paas ke meetups, concerts). Aur xyz.com ki sister app ek ride service hai jisko <strong>paas ke drivers</strong> chahiye. Teeno ka sawaal same: "is point ke X km ke andar kya hai?"` },
    { type: 'callout', tone: 'term', title: 'Latitude aur longitude', html: `<strong>Ye kya hai:</strong> Earth pe kisi jagah ka pata do numbers mein. <strong>Latitude (lat)</strong> = equator se kitna upar ya neeche (−90° se +90°). <strong>Longitude (lng)</strong> = Greenwich (London) wali line se kitna east ya west (−180° se +180°). Bengaluru ≈ lat 12.97, lng 77.59.<br><strong>Kyun chahiye:</strong> phone ka GPS yahi do numbers deta hai. Har "near me" sawaal inhi se shuru hota hai.<br><strong>Dhyaan:</strong> 1° latitude hamesha ~111 km. Lekin 1° longitude equator pe ~111 km aur poles ki taraf chhota hota jaata hai.` },
    { type: 'h2', text: 'Rung 1: seedha scan, ya lat-lng ka box' },
    { type: 'p', html: `Pehla try: har cheez ka <code>lat</code> aur <code>lng</code> table mein, dono pe index, aur query:` },
    { type: 'code', text: `SELECT id FROM creators
WHERE lat BETWEEN 12.95 AND 12.99      -- ~2 km upar neeche
  AND lng BETWEEN 77.58 AND 77.62;     -- ~2 km daayein baayein` },
    { type: 'p', html: `Dikhne mein theek. Lekin <a href="#/db-internals">B-tree index</a> ek waqt mein <strong>ek hi column</strong> ko sort karke rakhta hai. <code>lat</code> wala index bolta hai "latitude 12.95 se 12.99 ke beech wale sab rows", aur wo ek <em>patli patti</em> hai jo poori duniya ke us latitude pe faili hai (Bengaluru se Ethiopia tak). Lakhon rows. Phir har ek pe <code>lng</code> check. Ya do indexes ki do pattiyan nikaal ke unka intersection: dono mehenge.` },
    { type: 'ascii', text: `
   lng index ki patti
         ║
 ════════╬═══════════   <- lat index ki patti (poori duniya mein faili)
         ║
         ║        Humein sirf beech ka chhota box chahiye (╬),
         ║        lekin har index akela ek lambi patti deta hai.` },
    { type: 'p', html: `Aur sabse sasta galat tareeka, <strong>naive scan</strong>: har creator se doori nikaalo, filter karo. 10 lakh live creators × har second hazaaron "nearby" requests = har second arabon distance calculations. Chahiye ek aisa index jo <strong>2D jagah</strong> samjhe.` },
    { type: 'callout', tone: 'term', title: 'Proximity search', html: `<strong>Ye kya hai:</strong> kisi point ke paas ki cheezein dhoondhna (geo search, "near me" query). Do roop: <strong>radius query</strong> ("2 km ke andar sab") aur <strong>k-nearest</strong> ("sabse paas ke 5").<br><strong>Kyun chahiye:</strong> ride apps, nearby creators, events, maps: sab isi pe chalte hain.<br><strong>Trick:</strong> pehle sasta, mota filter (sirf aas paas ke khaane), phir mehenga, exact filter (asli doori) sirf bache hue candidates (ummeedwaar) pe.<br><strong>Iske bina:</strong> har request pe poori duniya ki doori naapni padegi.` },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 1)', html: `Data chhota hai (10,000 se kam points) aur queries kam? Seedha scan ya lat-lng box bilkul theek. 5,000 venues pe ek scan microseconds-milliseconds ka kaam hai. Cells tab chahiye jab points lakhon mein hon ya queries har second hazaaron.` },

    { type: 'h2', text: 'Rung 2: duniya ko cells mein baanto (geohash)' },
    { type: 'callout', tone: 'term', title: 'Cell (khaana)', html: `<strong>Ye kya hai:</strong> naksha ek grid mein baanto, jaise graph paper. Har chhota khaana ek <strong>cell</strong>, aur har cell ka ek ID. Har point ko uske cell ka ID de do.<br><strong>Kyun chahiye:</strong> ab "2D mein paas" ka sawaal "in 9 cell IDs mein se kisi mein hai?" ban jaata hai. Cell ID pe normal index (B-tree, Redis sorted set) chal jaata hai.<br><strong>Iske bina:</strong> 2D jagah ke liye koi seedha index nahi, bas scan.` },
    { type: 'callout', tone: 'term', title: 'Geohash', html: `<strong>Ye kya hai:</strong> lat-lng ko ek chhoti string mein badalne ka tareeka, jaise <code>tdr1v9</code>. Har character = ek aur chhota cell. Lamba string = chhota cell.<br><strong>Kaise banta hai:</strong> baar baar range ko aadha karo. Longitude ki range −180..180: Bengaluru (77.59) daayein aadhe mein → bit 1. Latitude −90..90: 12.97 upar wale aadhe mein → 1. Phir longitude 0..180 ka beech 90: 77.59 neeche → 0. Latitude 0..90 ka beech 45 → 0. Longitude 0..90 ka beech 45: upar → 1. Paanch bits <code>11001</code> = 25 = character <code>t</code> (32 characters ki list mein). Aise hi aage: Bengaluru (12.97, 77.59) = <code>tdr1v9</code>.<br><strong>Kyun chahiye:</strong> string ka prefix = bada cell. Paas ki jagahon ka prefix aksar same, to sorted index pe range scan se cell ke saare points mil jaate hain.<br><strong>Iske bina:</strong> har cell ka alag hisaab rakhna padta.` },
    { type: 'p', html: `<a href="#/ds-for-scale">Bloom filter, HyperLogLog, Geohash</a> lesson mein teen tareeke andar se dekhe the. Yahan sirf yaad dila dete hain, kyunki pattern teeno ka same hai: <strong>har point ko ek cell ID do, cell ID pe normal index lagao, query mein sirf aas paas ke cells padho</strong>.` },
    { type: 'table', head: ['Tareeka', 'Cell kaisa', 'Achha kab', 'Kahan milta hai'], rows: [
      ['Geohash', 'Fixed rectangles; har extra character = 32 chhote tukde. Cell ID ek string, paas ki jagahon ka prefix aksar same', 'Simple; koi bhi sorted index (B-tree, Redis sorted set) chala de', 'Redis GEO (andar), Elasticsearch geohash grid aggregation'],
      ['Quadtree', 'Ghani jagah pe chhote, khaali jagah pe bade squares (4-4 mein tootte)', 'Density bahut alag (Mumbai vs registaan), points zyada hilte nahi', 'In-memory services, game engines, kuch DB indexes'],
      ['H3 (Uber)', 'Hexagons, 16 resolutions; saare 6 padosi same doori pe', 'Areas pe analysis (surge, demand), smooth "rings" of neighbours', 'Uber ki open-source library; data pipelines'],
      ['S2 (Google)', 'Ek cube ke 6 face golaai pe phaila ke 4-4 mein tode; levels 0-30, ID ek 64-bit number', 'Poori duniya pe, poles tak barabar cells; region ko cells ke set se dhakna', 'Google ki open-source library (s2geometry.io)'],
    ]},
    { type: 'p', html: `Quadtree, S2 aur H3 ko Rung 3 aur 4 mein detail se dekhenge. Pehle geohash pe hi poora khel samjho.` },
    { type: 'p', html: `Lekin ek pakad hai jo har beginner ko lagti hai: tumhara user kisi cell ke <strong>kinare</strong> pe khada ho sakta hai. 50 meter door wala creator border ke us paar, doosre cell mein. Agar sirf apna cell padha, to wo kabhi nahi milega. Neeche khud dekho.` },

    { type: 'h2', text: 'Khud chala ke dekho: naive scan vs cells' },
    { type: 'p', html: `10 km × 10 km ka ek shehar, ~3,000 live creators (teen ghane mohalle + baaki bikhre). Map pe kahin bhi click karke apni jagah badlo (zoom in karke kinaare wala khel saaf dikhta hai). Cells geohash jaise hain (precision 5/6/7 ke asli sizes), bas itne chhote area ke liye flat maan liye.` },
    { type: 'custom', render(el) {
      const PREC = { 5: [4.89, 4.89], 6: [1.22, 0.61], 7: [0.153, 0.152] }, OX = -0.3, OY = -0.45, MAP = 10, PX = 32;
      const P = (() => { let s = 7; const r = () => (s = s * 16807 % 2147483647) / 2147483647; const out = [];
        const hubs = [[3.2, 6.6, 0.7], [6.9, 3.1, 0.9], [7.6, 7.8, 0.5]];
        for (let i = 0; i < 3000; i++) { let x, y; if (i % 5 < 3) { const h = hubs[i % 3], a = r() * 2 * Math.PI, d = h[2] * Math.sqrt(-2 * Math.log(r() + 1e-9)); x = h[0] + d * Math.cos(a); y = h[1] + d * Math.sin(a); } else { x = r() * MAP; y = r() * MAP; }
          if (x >= 0 && x < MAP && y >= 0 && y < MAP) out.push([x, y]); } return out; })();
      const cellOf = (x, y, w, h) => [Math.floor((x - OX) / w), Math.floor((y - OY) / h)];
      const run = (ux, uy, R, prec, mode) => {
        const [w, h] = PREC[prec], [cx, cy] = cellOf(ux, uy, w, h), cells = new Set();
        if (mode === 'own') cells.add(cx + ',' + cy);
        else if (mode === 'nine') { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) cells.add((cx + i) + ',' + (cy + j)); }
        else if (mode === 'cover') { const [a, b] = cellOf(ux - R, uy - R, w, h), [c, d] = cellOf(ux + R, uy + R, w, h);
          for (let i = a; i <= c; i++) for (let j = b; j <= d; j++) { const x0 = OX + i * w, y0 = OY + j * h, nx = Math.max(x0, Math.min(ux, x0 + w)), ny = Math.max(y0, Math.min(uy, y0 + h));
            if ((nx - ux) ** 2 + (ny - uy) ** 2 <= R * R) cells.add(i + ',' + j); } }
        let checked = 0, found = 0, missed = 0; const st = [];
        for (const [x, y] of P) { const inR = (x - ux) ** 2 + (y - uy) ** 2 <= R * R, [i, j] = cellOf(x, y, w, h), chk = mode === 'naive' || cells.has(i + ',' + j);
          if (chk) checked++; if (inR && chk) found++; if (inR && !chk) missed++; st.push(chk ? (inR ? 2 : 1) : (inR ? 3 : 0)); }
        return { cells, checked, found, missed, st, w, h };
      };
      const MODES = [['naive', 'Naive: sab check'], ['own', 'Sirf apna cell'], ['nine', 'Apna + 8 padosi'], ['cover', 'Radius ko dhakne wale cells']];
      const S = { ux: 6.95, uy: 3.25, mode: 'own', zoom: 1 }; let VB = [0, 0, 320, 320];
      el.innerHTML = `<div class="pxModes" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Search radius: <strong class="pxRv"></strong></label><input class="pxR" type="range" min="0.25" max="2" step="0.25" value="0.5"></div>
          <div><label>Cell size (geohash precision)</label><select class="pxP"><option value="5">5: ~4.9 × 4.9 km</option><option value="6" selected>6: ~1.2 × 0.6 km</option><option value="7">7: ~153 × 152 m</option></select></div>
        </div>
        <div style="display:flex;justify-content:center;margin-top:10px"><button type="button" class="btn small ghost pxZoom"></button></div>
        <svg class="pxMap" viewBox="0 0 320 320" style="width:100%;max-width:420px;display:block;margin:12px auto 0;cursor:crosshair;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface)" role="img" aria-label="Map with creators, search circle and scanned cells"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;font-size:12px;color:var(--ink-3);margin-top:6px"><span style="color:var(--green)">● mila</span><span style="color:var(--red)">● radius mein, lekin MISS</span><span style="color:var(--accent)">● check kiya, door tha</span><span>· check hi nahi kiya</span></div>
        <div class="stats">
          <div class="stat"><span>Cells padhe</span><strong class="pxC"></strong></div>
          <div class="stat"><span>Points check kiye</span><strong class="pxK"></strong></div>
          <div class="stat"><span>Mile</span><strong class="pxF"></strong></div>
          <div class="stat"><span>Miss hue</span><strong class="pxM"></strong></div>
        </div>
        <div class="calc-note pxNote"></div>`;
      const $ = c => el.querySelector(c), svg = $('.pxMap');
      const Y = y => 320 - y * PX;
      const upd = () => {
        const R = +$('.pxR').value, prec = +$('.pxP').value;
        $('.pxRv').textContent = R + ' km';
        $('.pxModes').innerHTML = ''; MODES.forEach(([k, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (S.mode === k ? ' on' : ''); b.textContent = l; b.onclick = () => { S.mode = k; upd(); }; $('.pxModes').appendChild(b); });
        const r = run(S.ux, S.uy, R, prec, S.mode);
        let s = '';
        r.cells.forEach(k => { const [i, j] = k.split(',').map(Number), x0 = OX + i * r.w, y0 = OY + j * r.h;
          s += `<rect x="${(x0 * PX).toFixed(1)}" y="${Y(y0 + r.h).toFixed(1)}" width="${(r.w * PX).toFixed(1)}" height="${(r.h * PX).toFixed(1)}" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="0.6"/>`; });
        if (r.w * PX >= 6) { for (let x = OX; x <= MAP; x += r.w) if (x >= 0) s += `<line x1="${(x * PX).toFixed(1)}" x2="${(x * PX).toFixed(1)}" y1="0" y2="320" stroke="var(--line-2)" stroke-width="0.5"/>`;
          for (let y = OY; y <= MAP; y += r.h) if (y >= 0) s += `<line x1="0" x2="320" y1="${Y(y).toFixed(1)}" y2="${Y(y).toFixed(1)}" stroke="var(--line-2)" stroke-width="0.5"/>`; }
        const col = ['var(--ink-3)', 'var(--accent)', 'var(--green)', 'var(--red)'], rad = [0.7, 1.1, 1.8, 1.8];
        P.forEach(([x, y], i) => { const t = r.st[i]; s += `<circle cx="${(x * PX).toFixed(1)}" cy="${Y(y).toFixed(1)}" r="${rad[t]}" fill="${col[t]}"${t === 0 ? ' opacity=".45"' : ''}/>`; });
        s += `<circle cx="${(S.ux * PX).toFixed(1)}" cy="${Y(S.uy).toFixed(1)}" r="${(R * PX).toFixed(1)}" fill="none" stroke="var(--ink)" stroke-width="${S.zoom ? 0.8 : 1.5}" stroke-dasharray="${S.zoom ? '2 1.5' : '4 3'}"/><circle cx="${(S.ux * PX).toFixed(1)}" cy="${Y(S.uy).toFixed(1)}" r="${S.zoom ? 2 : 4}" fill="var(--ink)"/>`;
        svg.innerHTML = s;
        VB = S.zoom ? [Math.max(0, Math.min(200, S.ux * PX - 60)), Math.max(0, Math.min(200, Y(S.uy) - 60)), 120, 120] : [0, 0, 320, 320];
        svg.setAttribute('viewBox', VB.join(' '));
        $('.pxZoom').textContent = S.zoom ? 'Poora shehar dikhao' : 'Zoom in (user ke aas paas)';
        $('.pxC').textContent = S.mode === 'naive' ? '-' : r.cells.size;
        $('.pxK').textContent = r.checked.toLocaleString('en-IN') + ' / ' + P.length.toLocaleString('en-IN');
        $('.pxF').textContent = r.found; $('.pxM').textContent = r.missed;
        const minSide = Math.min(r.w, r.h);
        $('.pxNote').textContent = S.mode === 'naive' ? `Har point ki doori nikaali: ${P.length.toLocaleString('en-IN')} calculations, ek bhi miss nahi, lekin har request pe poora shehar. 10 lakh points pe ye bekaar hai.`
          : r.missed > 0 ? (S.mode === 'own' ? `Edge-of-cell problem: ${r.missed} creators radius ke andar the, lekin padosi cells mein, isliye kabhi dikhe hi nahi. Isliye kabhi sirf apna cell mat padho.`
            : S.mode === 'nine' ? `Radius (${R} km) cell ki chhoti side (~${minSide.toFixed(2)} km) se bada hai, to 3×3 block bhi poora circle nahi dhakta: ${r.missed} miss. Bade cells (kam precision) lo, ya radius ke hisaab se zyada cells.` : '')
          : `Sab ${r.found} mile, sirf ${r.checked.toLocaleString('en-IN')} points check karke (naive ka ~${Math.round(r.checked / P.length * 100)}%). ${r.cells.size > 40 ? 'Lekin ' + r.cells.size + ' cells padhne pade: cells bahut chhote hain, har cell ek alag index lookup hai.' : r.w * r.h > 4 * Math.PI * R * R ? 'Lekin cells radius ke mukable bahut bade hain, isliye bahut saare door ke points bhi check hue: precision badhao.' : 'Yahi sweet spot hai: cell size radius ke aas paas.'}`;
      };
      svg.addEventListener('click', e => { const b = svg.getBoundingClientRect(); if (!b.width) return; S.ux = Math.max(0, Math.min(MAP, (VB[0] + (e.clientX - b.left) / b.width * VB[2]) / PX)); S.uy = Math.max(0, Math.min(MAP, MAP - (VB[1] + (e.clientY - b.top) / b.height * VB[3]) / PX)); upd(); });
      $('.pxZoom').onclick = () => { S.zoom = S.zoom ? 0 : 1; upd(); };
      el.querySelectorAll('input,select').forEach(x => x.addEventListener('input', upd)); upd();
    }},

    { type: 'callout', tone: 'tip', title: 'Default setup pe numbers', html: `Precision 6, radius 0.5 km, user ek cell ke kinare ke paas:<br>
      • <strong>Naive:</strong> 2,998 points check, 89 mile.<br>
      • <strong>Sirf apna cell:</strong> sirf 66 check, lekin 89 mein se <strong>66 miss</strong> (sirf 23 mile). Yahi edge-of-cell problem hai.<br>
      • <strong>Apna + 8 padosi:</strong> 9 cells, 427 check (naive ka ~14%), saare 89 mile.<br>
      • <strong>Radius ko dhakne wale cells:</strong> sirf 4 cells, 283 check (~9%), saare 89.<br>
      Ab radius 1 km karo: 3×3 block 35 miss karta hai (radius cell ki chhoti side ~0.61 km se bada). Precision 7 pe "dhakne wale cells" 163 ho jaate hain: cells bahut chhote. Precision 5 pe ek hi cell mein ~800 points: bahut bade.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Geohash prefix same = paas paas, prefix alag = door." Pehla aadha sach hai, doosra galat. Do points 20 meter door hokar bhi alag cells mein ho sakte hain (aur border pe kabhi poora prefix hi alag). Jaise (12.97, 77.59) = <code>tdr1v9</code> aur sirf ~2 km door (12.97, 77.61) = <code>tdr1y1</code>: paanchwa character hi alag. Isliye sahi query hamesha: <strong>cells ka set (apna + padosi, ya radius ko dhakne wale) → candidates → asli doori se filter</strong>. Cell sirf candidates chhaanne ka tareeka hai, final answer nahi.` },

    { type: 'h2', text: 'Cell size kaise chunein?' },
    { type: 'p', html: `Simulator ne dikhaya: cells bahut bade to faltu points check, bahut chhote to bahut saare cells padhne. Rule of thumb: <strong>cell ki chhoti side ≈ search radius</strong>, phir 3×3 block (apna + 8) poora circle dhak leta hai.` },
    { type: 'table', head: ['Geohash precision', 'Cell size (equator pe, lagbhag)', 'Kis radius ke liye theek'], rows: [
      ['4', '39 km × 19.5 km', '"Is shehar mein" (10-20 km)'],
      ['5', '4.9 km × 4.9 km', 'Events near you (~5 km)'],
      ['6', '1.2 km × 0.61 km', 'Nearby creators, drivers (~0.5 km)'],
      ['7', '153 m × 152 m', 'Bahut paas (~150 m), pickup point'],
    ], caption: 'Equator se door jaane pe cells ki chaudai (east-west) ghat-ti hai, kyunki longitude ki lines paas aati jaati hain.' },
    { type: 'p', html: `Asli systems ye khud karte hain. Redis GEO radius dekh ke precision chunta hai aur 9 areas padhta hai. Quadtree mein density ke hisaab se cell size apne aap. H3 mein "k-ring" (apna hexagon + k layers padosi) maangte ho.` },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 2)', html: `Points poore shehar mein lagbhag barabar faile hain, aur radius ek tay range mein hai (0.5-5 km)? Geohash + padosi kaafi hai, aur Redis GEO ise andar se hi karta hai. Agla rung tab jab kuch cells mein hazaaron points aur kuch khaali (density ka bada farak), ya duniya bhar ka data (poles, date line) ho.` },

    { type: 'h2', text: 'Rung 3: quadtree (bheed ke hisaab se khaane)' },
    { type: 'p', html: `<strong>Naya problem:</strong> xyz.com ke ~3,000 live creators teen ghane mohallon mein jama hain, baaki shehar khaali sa. Barabar khaanon (1.25 km) mein sabse bhare khaane mein 254 creators aur sabse khaali mein sirf 13. Bhare khaane wali har query 254 points check karti hai, aur gaon mein ek bada radius bahut saare khaali khaane padhta hai.` },
    { type: 'callout', tone: 'term', title: 'Quadtree', html: `<strong>Ye kya hai:</strong> ek tree jo naksha 4 hisson mein todta hai, aur sirf un hisson ko phir se 4 mein todta hai jinme bahut zyada points hain (jaise "50 se zyada"). Bheed wali jagah chhote khaane, khaali jagah bade.<br><strong>Kyun chahiye:</strong> har khaane mein lagbhag barabar points. Query ka kaam density pe kam nirbhar.<br><strong>Iske bina (fixed grid):</strong> shehar ke beech ke khaane bhare hue, bahar ke khaali.<br><strong>Keemat:</strong> points hilte hain to tree baar baar todna/jodna padta hai. Isliye quadtree aksar tiki cheezon (places, venues) ya memory mein har kuch second dobara banaye jaane wale tree ke liye.` },
    { type: 'p', html: `<strong>Quadtree lab.</strong> Wahi 3,000 creators. Fixed grid aur quadtree ko compare karo, aur "ek khaane mein max points" badal ke dekho tree kaise todta hai.` },
    { type: 'custom', render(el) {
      const MAP = 10, PX = 32;
      const P = (() => { let s = 7; const r = () => (s = s * 16807 % 2147483647) / 2147483647; const out = [];
        const hubs = [[3.2, 6.6, 0.7], [6.9, 3.1, 0.9], [7.6, 7.8, 0.5]];
        for (let i = 0; i < 3000; i++) { let x, y; if (i % 5 < 3) { const h = hubs[i % 3], a = r() * 2 * Math.PI, d = h[2] * Math.sqrt(-2 * Math.log(r() + 1e-9)); x = h[0] + d * Math.cos(a); y = h[1] + d * Math.sin(a); } else { x = r() * MAP; y = r() * MAP; }
          if (x >= 0 && x < MAP && y >= 0 && y < MAP) out.push([x, y]); } return out; })();
      const build = cap => { const L = []; const go = (x, y, s, pts, d) => { if (pts.length <= cap || d >= 8) { L.push({ x, y, s, n: pts.length }); return; }
        const h = s / 2; [[x, y], [x + h, y], [x, y + h], [x + h, y + h]].forEach(([a, b]) => go(a, b, h, pts.filter(([px, py]) => px >= a && px < a + h && py >= b && py < b + h), d + 1)); };
        go(0, 0, MAP, P, 0); return L; };
      const grid = () => { const L = []; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) L.push({ x: i * 1.25, y: j * 1.25, s: 1.25, n: 0 });
        P.forEach(([x, y]) => L[Math.floor(x / 1.25) * 8 + Math.floor(y / 1.25)].n++); return L; };
      const CAPS = [25, 50, 100, 200]; const S = { mode: 'qt', cap: 1 };
      el.innerHTML = `<div class="pq-modes" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="margin-top:10px"><label>Ek khaane mein max points: <strong class="pq-vc"></strong></label><input class="pq-c" type="range" min="0" max="3" step="1" value="1"></div>
        <svg class="pq-svg" viewBox="0 0 320 320" style="width:100%;max-width:420px;display:block;margin:12px auto 0;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface)" role="img" aria-label="Fixed grid vs quadtree cells over the city"></svg>
        <div class="stats">
          <div class="stat"><span>Khaane (cells)</span><strong class="pq-n"></strong></div>
          <div class="stat"><span>Sabse bhare khaane mein</span><strong class="pq-mx"></strong></div>
          <div class="stat"><span>Sabse chhota khaana</span><strong class="pq-sm"></strong></div>
          <div class="stat"><span>Sabse bada khaana</span><strong class="pq-bg"></strong></div>
        </div>
        <div class="calc-note pq-note"></div>`;
      const $ = c => el.querySelector(c);
      const km = v => v >= 1 ? v.toFixed(2) + ' km' : Math.round(v * 1000) + ' m';
      const upd = () => {
        S.cap = +$('.pq-c').value; const cap = CAPS[S.cap];
        $('.pq-modes').innerHTML = ''; [['grid', 'Fixed grid (1.25 km)'], ['qt', 'Quadtree']].forEach(([k, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (S.mode === k ? ' on' : ''); b.textContent = l; b.onclick = () => { S.mode = k; upd(); }; $('.pq-modes').appendChild(b); });
        $('.pq-vc').textContent = S.mode === 'qt' ? cap : '(sirf quadtree pe)';
        const L = S.mode === 'qt' ? build(cap) : grid(), mx = Math.max(...L.map(l => l.n));
        let g = '';
        L.forEach(l => { const a = l.n / mx; g += `<rect x="${(l.x * PX).toFixed(1)}" y="${(320 - (l.y + l.s) * PX).toFixed(1)}" width="${(l.s * PX).toFixed(1)}" height="${(l.s * PX).toFixed(1)}" fill="var(--accent)" fill-opacity="${(0.06 + 0.5 * a).toFixed(2)}" stroke="var(--accent)" stroke-width="0.6"/>`; });
        P.forEach(([x, y]) => { g += `<circle cx="${(x * PX).toFixed(1)}" cy="${(320 - y * PX).toFixed(1)}" r="0.8" fill="var(--ink-2)"/>`; });
        $('.pq-svg').innerHTML = g;
        $('.pq-n').textContent = L.length; $('.pq-mx').textContent = mx + ' points';
        $('.pq-sm').textContent = km(Math.min(...L.map(l => l.s))); $('.pq-bg').textContent = km(Math.max(...L.map(l => l.s)));
        $('.pq-note').textContent = S.mode === 'grid' ? `64 barabar khaane. Ghane mohalle wale khaane mein ${mx} points, jabki kuch khaanon mein sirf 13. Har query ka kaam is pe nirbhar ki user kahan khada hai.` : `${L.length} khaane, kisi mein ${cap} se zyada points nahi. Ghane mohallon mein khaane ${km(Math.min(...L.map(l => l.s)))} tak chhote, khaali jagah ${km(Math.max(...L.map(l => l.s)))} tak bade. Chhoti hadd = zyada khaane (tree gehra), badi hadd = har khaane mein zyada points.`;
      };
      $('.pq-c').oninput = upd; upd();
    }},
    { type: 'p', html: `Numbers (verify kiye hue): fixed grid ke 64 khaanon mein max 254 points. Quadtree hadd 50 pe: 145 khaane, max 50 points, sabse chhota khaana 313 m, sabse bada 1.25 km. Hadd 25 pe 241 khaane aur sabse chhota 156 m.` },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 3)', html: `Density ka farak bada hai (shehar vs gaon) aur points zyada nahi hilte? Quadtree. Points har few second hilte hain (drivers)? Geohash/Redis GEO simple rehta hai; quadtree ko memory mein har kuch second dobara banana padega. Poori duniya ka data ho to agla rung dekho.` },

    { type: 'h2', text: 'Rung 4: S2 aur H3 (golaakaar Earth ke liye cells)' },
    { type: 'p', html: `<strong>Naya problem:</strong> xyz.com ab duniya bhar mein hai: Norway se New Zealand tak. Geohash ke rectangles equator pe ~1.2 × 0.6 km hain, lekin poles ki taraf east-west mein pichak jaate hain. Aur 180° longitude (date line) pe do paas ke points ka geohash bilkul alag. Hamein aise cells chahiye jo poori golaai pe lagbhag barabar hon.` },
    { type: 'callout', tone: 'term', title: 'S2 (Google)', html: `<strong>Ye kya hai:</strong> Google ki open-source geometry library. Earth ko ek cube ke andar socho; cube ke 6 face golaai pe phaila do. Har face ko baar baar 4 mein todo: levels 0 se 30. Level 30 ke cells lagbhag 1 cm ke. Har cell ka ID ek 64-bit number.<br><strong>Khaas baat:</strong> cells ko ek <strong>space-filling curve</strong> (Hilbert curve jaisi ek lakeer jo har khaane se ek baar guzarti hai) ke order mein number kiya jaata hai. Isliye do cell IDs paas paas = cells bhi paas paas. Ek region (jaise "Bengaluru ka ye area") ko kuch cell ID ranges se dhak sakte ho.<br><strong>Kyun chahiye:</strong> poles tak barabar cells, aur area/region queries saaf.<br><strong>Iske bina:</strong> geohash ke pichke cells aur date line ki gadbad.` },
    { type: 'image', src: 'assets/img/pattern-proximity/hilbert-curve.jpg', alt: 'Hilbert curve ke pehle chhe kadam: ek lakeer jo grid ke har khaane se ek baar guzarti hai, har kadam pe khaane 4 guna', caption: 'Hilbert curve: lakeer har khaane se ek baar guzarti hai, isliye lakeer pe paas wale number naqshe pe bhi paas hote hain. S2 cells isi tarah ki curve (6 Hilbert curves jude hue) ke order mein number hote hain.', credit: { text: 'Braindrain0000, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Hilbert_curve.svg', license: 'CC BY-SA 3.0' } },
    { type: 'callout', tone: 'term', title: 'H3 (Uber)', html: `<strong>Ye kya hai:</strong> Uber ki open-source library jo Earth ko <strong>hexagons</strong> (6 kone wale khaane) mein baant-ti hai, 16 resolutions (0 se 15) mein. Har resolution pe theek 12 pentagon (5 kone) bhi hote hain, kyunki golaai ko sirf hexagons se poora nahi dhak sakte.<br><strong>Kyun hexagon:</strong> square ke 8 padosi do alag dooriyon pe hain (4 kinaare wale, 4 kone wale ~1.4 guna door). Hexagon ke saare 6 padosi barabar door. "Mere aas paas ki 1 ring, 2 rings" (<strong>k-ring</strong>) saaf circle jaisi lagti hai.<br><strong>Kyun chahiye:</strong> areas pe ginti aur analysis: har hexagon mein kitni demand, kitne drivers (surge pricing jaisa kaam).<br><strong>Iske bina:</strong> square grid pe kone wale padosi ka hisaab tedha.` },
    { type: 'table', head: ['H3 resolution', 'Ek hexagon ka average area', 'xyz.com pe kis kaam ka'], rows: [
      ['7', '~5.16 km²', 'Shehar ke bade hisse: "is area mein aaj kitne events"'],
      ['8', '~0.74 km²', 'Mohalla: demand / supply ginti'],
      ['9', '~0.105 km² (~1 lakh m²)', 'Kuch gali: pickup point ke aas paas'],
    ], caption: 'Numbers h3geo.org ki cell statistics table se (average hexagon area).' },
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 4)', html: `Ek ya do shehar, India jaisa ek desh? Geohash ke chhote pichkaav se farak nahi padta, Rung 2 kaafi. S2 tab jab poori duniya ya polygon/region coverage chahiye. H3 tab jab areas pe ginti/analysis (demand, surge, heatmaps) karna ho. "Paas ke 10 drivers" ke liye in mein se kisi ki zaroorat nahi; Redis GEO kaafi.` },

    { type: 'h2', text: 'Rung 5: asli tool chuno (hilti cheezein vs tiki cheezein)' },
    { type: 'p', html: `Do bilkul alag workload hain, aur roadmap ka rule bhi isi pe hai:` },
    { type: 'compare',
      left: { title: 'Moving: drivers, live creators, delivery partners', html: `• Har few second location update<br>• 10 lakh drivers × har 4 second = <strong>2.5 lakh writes/sec</strong><br>• Purana data bekaar (30 second purani location = galat)<br>• Query simple: "paas wale, kaun available"<br>• Data kho bhi jaaye to agle update mein wapas<br><br>→ <strong>In-memory: Redis GEO</strong> (ya apna in-memory grid)` },
      right: { title: 'Static: events, venues, shops, places', html: `• Kabhi kabhi badalte hain<br>• Writes kam, reads zyada<br>• Query complex: "comedy event, is weekend, 5 km mein, ticket ₹500 se kam, rating 4+"<br>• Durable rehna chahiye<br><br>→ <strong>Elasticsearch</strong> (text + filters + geo) ya <strong>PostGIS</strong> (relational + geo + polygons)` },
    },

    { type: 'h2', text: 'Redis GEO: hilti cheezon ke liye' },
    { type: 'p', html: `Redis mein geo commands built-in hain. Andar se ye ek normal <strong>sorted set</strong> hai (Redis ki ek list jisme har member ke saath ek number, "score", aur list us score se sorted rehti hai). Yahan har member (driver) ka score uska 52-bit geohash hai (latitude aur longitude ke bits ek doosre mein gunthe hue, bilkul upar wale geohash ki tarah). Isliye add karna O(log N), aur radius query sorted set pe kuch range scans hain.` },
    { type: 'code', text: `# driver ne location bheji (longitude PEHLE, phir latitude)
GEOADD drivers:blr 77.6067 12.9756 driver:42

# rider ke 2 km mein sabse paas ke 10 drivers, doori ke saath
GEOSEARCH drivers:blr FROMLONLAT 77.6100 12.9700 BYRADIUS 2 km ASC COUNT 10 WITHDIST

# driver offline gaya: GEO ka apna delete command nahi, sorted set wala ZREM
ZREM drivers:blr driver:42` },
    { type: 'list', items: [
      `<strong>GEOSEARCH</strong> Redis 6.2 se hai aur purane <code>GEORADIUS</code>/<code>GEORADIUSBYMEMBER</code> ki jagah use karna chahiye (docs unhe deprecated kehte hain). Circle (<code>BYRADIUS</code>) ya box (<code>BYBOX</code>), aur <code>FROMLONLAT</code> ya kisi member se (<code>FROMMEMBER</code>).`,
      `<strong>Andar kya hota hai:</strong> Redis docs ke mutabik query shape ko dhakne ke liye 1 + 8 areas ki score ranges padhta hai, phir circle se bahar wale hata deta hai. Wahi "apna + 8 padosi" jo simulator mein dekha.`,
      `<strong>Accuracy:</strong> doori Haversine formula se (golaai pe do points ke beech ki doori nikaalne ka formula), Earth ko perfect sphere maan ke. Docs ke mutabik worst case ~0.5% error: "nearby" ke liye theek, survey/legal naap ke liye nahi. Poles ke bahut paas (latitude ±85.05° se aage) index nahi hota.`,
      `<strong>COUNT ... ANY:</strong> pehle jitne mile utne de do, sort mat karo. Tez, lekin zaroori nahi ki sabse paas wale hon.`,
    ]},
    { type: 'callout', tone: 'warn', title: 'Interview depth: Redis GEO ki teen pakad', html: `
      <strong>1. Stale members.</strong> Sorted set ke member pe alag TTL nahi lagta. Driver ka phone band, to wo set mein "khada" rehta hai. Fix: ek doosra sorted set <code>drivers:lastseen</code> (score = timestamp); cleanup job har kuch second purane members dono sets se <code>ZREM</code> kare. Ya query ke baad last-seen check.<br>
      <strong>2. Ek key = ek shard.</strong> <code>drivers:blr</code> poore Bengaluru ka set hai aur Redis Cluster mein ek hi node pe: peak pe ye hot key ban sakta hai (<a href="#/pattern-spikes">hot keys</a>). Fix: key ko chhote area mein todo, jaise geohash precision 4/5 ke hisaab se <code>drivers:tdr1</code>, aur query mein apna + padosi keys padho.<br>
      <strong>3. Memory hai, durable nahi.</strong> Location data waise bhi har few second refresh hota hai, to Redis gire to replica promote karo; jo kami rahi wo agle updates mein apne aap bhar jaati hai. Ye "ephemeral" data ka faayda hai.` },

    { type: 'h2', text: 'Elasticsearch: geo + text + filters' },
    { type: 'p', html: `"Events near you" sirf doori nahi: "stand-up comedy", "is weekend", "₹500 se kam", phir rating se sort. Ye <a href="#/search">search</a> wala kaam hai, aur Elasticsearch (ya OpenSearch) geo ko baaki filters ke saath ek hi query mein karta hai. Field ko <code>geo_point</code> type do; andar Lucene (Elasticsearch ke neeche wali search library) points ke liye ek tree index (BKD tree, 2D points ke liye bana tree) banata hai, to geo filter bhi index se chalta hai.` },
    { type: 'code', text: `GET events/_search
{
  "query": { "bool": {
    "must":   [ { "match": { "title": "stand-up comedy" } } ],
    "filter": [
      { "range": { "date": { "gte": "2026-10-10", "lte": "2026-10-11" } } },
      { "geo_distance": { "distance": "5km", "location": { "lat": 12.97, "lon": 77.61 } } }
    ]
  }},
  "sort": [ { "_geo_distance": { "location": { "lat": 12.97, "lon": 77.61 }, "order": "asc", "unit": "km" } } ]
}` },
    { type: 'p', html: `Kab: static ya kam badalne wali cheezein jinpe text search aur bahut saare filters chahiye. Kab nahi: lakhon updates/second wale moving points; Elasticsearch mein har update ek naya document version hai aur refresh ke baad hi dikhta hai (near real-time), to drivers jaisa data iske liye mehenga hai.` },

    { type: 'h2', text: 'PostGIS: SQL mein geo' },
    { type: 'p', html: `Data pehle se Postgres mein hai (events, venues, unke organisers, tickets: sab relational)? To <strong>PostGIS</strong> extension lagao. Ye points ke saath polygons (kai kono wali shapes, jaise kisi city zone ki seema) bhi samajhta hai: "ye point kis city zone mein hai", "ye event venue kis delivery area mein hai" jaise geofence sawaal.` },
    { type: 'code', text: `-- geography type: doori METERS mein, Earth ki golaai ke saath
ALTER TABLE events ADD COLUMN location geography(Point, 4326);
CREATE INDEX events_location_gist ON events USING GIST (location);

-- 5 km ke andar ke events (index use hota hai)
SELECT id, title FROM events
WHERE ST_DWithin(location, ST_MakePoint(77.61, 12.97)::geography, 5000)
  AND starts_at BETWEEN '2026-10-10' AND '2026-10-12';

-- sabse paas ke 5 (k-nearest, index-assisted)
SELECT id, title FROM events
ORDER BY location <-> ST_MakePoint(77.61, 12.97)::geography
LIMIT 5;` },
    { type: 'callout', tone: 'term', title: 'GiST index aur ST_DWithin', html: `<strong>GiST</strong> (Generalized Search Tree) Postgres ka ek index type hai jo har shape ka ek chhota bounding box rakhta hai, R-tree jaisa: paas wale boxes ek group, groups ke upar bade boxes. <strong>ST_DWithin(a, b, d)</strong> poochhta hai "kya a aur b ke beech doori d se kam hai?". PostGIS docs ke mutabik ye pehle bounding box se index pe sasta filter karta hai, phir exact doori. Isliye radius ke liye <code>ST_DWithin</code> likho, <code>ST_Distance(...) &lt; 5000</code> nahi: doosra har row pe doori nikaal sakta hai aur index chhoot jaata hai.` },
    { type: 'callout', tone: 'mistake', title: 'Degrees vs meters', html: `<code>geometry</code> type (SRID 4326) mein <code>ST_DWithin(..., 5000)</code> ka matlab 5000 <strong>degrees</strong> hai, meters nahi: poori duniya match! Meters chahiye to <code>geography</code> type use karo (jaise upar), ya data ko meters wale projection mein rakho. Aur yaad rakho: 1° longitude equator pe ~111 km hai, lekin north jaate jaate ghat-ta hai. Degrees mein "radius" ek circle nahi, ek pichka hua shape hai.` },

    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 5)', html: `Pehle dekho data kahan pehle se hai. Postgres hai to PostGIS. Search pehle se Elasticsearch pe hai to wahin geo_point. Sirf hilte points ke liye naya Redis GEO. Teeno ek saath tabhi jab teeno tarah ke sawaal sach mein hon (drivers + events + zones).` },

    { type: 'h2', text: 'Rung 6: scale (garam khaane, area keys, sabse paas ke k)' },
    { type: 'p', html: `<strong>Naya problem:</strong> xyz.com ki ride app ab 10 lakh drivers tak pahunchi, har 4 second update = <strong>2.5 lakh writes/sec</strong>. Ek hi <code>drivers:blr</code> key ek Redis node pe hai. Aur IPL final ke baad stadium ke bahar 20,000 drivers ek hi khaane mein.` },
    { type: 'list', items: [
      `<strong>Area ke hisaab se keys:</strong> ek shehar ki ek key ki jagah geohash prefix (precision 4-5) pe key: <code>drivers:tdr1</code>, <code>drivers:tdr4</code>... Alag keys alag Redis shards pe jaati hain, to writes aur reads bant jaate hain. Query mein apna + padosi keys padho (wahi edge-of-cell rule).`,
      `<strong>Garam khaana (hot cell):</strong> stadium wala khaana ek <a href="#/pattern-spikes">hot key</a> hai. Us area ke liye chhote khaane (zyada precision), <code>COUNT</code> se result ki hadd, aur quadtree jaisa density ke hisaab se todna.`,
      `<strong>Sabse paas ke k (k-nearest):</strong> radius pata nahi. Chhote ring se shuru karo (apna khaana + padosi). k se kam mile to agla, bada ring. Ek upper hadd rakho (jaise 50 km) taaki khaali gaon mein loop na chale. H3 mein ye seedha k-ring 0, 1, 2... hai.`,
      `<strong>Seedhi doori sadak ki doori nahi:</strong> geo index sirf pehla, sasta filter hai. Asli apps candidates ke liye road network pe ETA nikaal ke rank karti hain.`,
    ]},
    { type: 'callout', tone: 'tip', title: 'Kab ruko (Rung 6)', html: `Ek Redis node simple commands pe aam taur pe ~1 lakh ops/sec ke aas paas sambhal leta hai (Traffic spikes lesson wala andaaza). Jab tak ek shehar ke writes aur set ek node mein fit hain, keys mat todo. Todna tab jab ek node CPU ya memory mein 70-80% chhoone lage.` },

    { type: 'h2', text: 'Poora proximity service, chala ke dekho' },
    { type: 'p', html: `Ab sab rungs ek saath: driver location likhna, paas ke drivers padhna, events dhoondhna, aur do failures. Har box pe click karke uska kaam padho.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'drv', label: 'Driver app', sub: 'har 4 s location', x: 85, y: 70, w: 140, kind: 'client', info: 'Ye kya hai: driver ki app. Driver ka phone har kuch second (maan lo 4) apni latitude/longitude bhejta hai. Live creators ke liye bhi same: stream chalu hai to location heartbeat.' },
        { id: 'usr', label: 'User app', sub: 'nearby kholta', x: 85, y: 270, w: 140, kind: 'client', info: 'Ye kya hai: user ki app. Rider ya viewer: "paas ke drivers", "nearby creators", "events near you".' },
        { id: 'loc', label: 'Location svc', sub: 'writes', x: 290, y: 70, w: 140, kind: 'server', info: 'Ye kya hai: location likhne wali service. Location updates leta hai. Bahut write-heavy (lakhon/sec), isliye stateless aur horizontally scaled. Redis mein GEOADD aur last-seen timestamp likhta hai.' },
        { id: 'near', label: 'Nearby svc', sub: 'reads', x: 290, y: 270, w: 140, kind: 'server', info: 'Ye kya hai: "near me" ka jawab dene wali query service. Moving cheezon ke liye Redis GEOSEARCH, static cheezon ke liye PostGIS/Elasticsearch. Results pe business filters (available? blocked?) aur ranking.' },
        { id: 'redis', label: 'Redis GEO', sub: 'drivers:{cell}', x: 505, y: 170, w: 140, kind: 'cache', meter: true, load: 30, info: 'Ye kya hai: Redis ke geo sets, memory mein. Sorted set per area (geohash prefix key). Member = driver id, score = 52-bit geohash. Saath mein drivers:lastseen (score = timestamp) cleanup ke liye.' },
        { id: 'pg', label: 'Events DB', sub: 'PostGIS / ES', x: 640, y: 290, w: 130, kind: 'data', info: 'Ye kya hai: tiki cheezon ka database. Static, durable data: events, venues. PostGIS (GiST index + ST_DWithin) agar relational queries chahiye, Elasticsearch agar text search + filters.' },
      ],
      edges: [{ a: 'drv', b: 'loc' }, { a: 'usr', b: 'near' }, { a: 'loc', b: 'redis' }, { a: 'near', b: 'redis' }, { a: 'near', b: 'pg' }],
      scenarios: [
        { name: 'Driver location update', steps: [
          { title: 'Location aayi', text: 'Driver 42 ne nayi location bheji.', go: 'drv>loc', msg: 'POST /location  { "lat": 12.9756, "lng": 77.6067, "ts": 1791200000 }' },
          { title: 'Redis mein update', text: 'Same member pe GEOADD purani location overwrite kar deta hai. Saath mein last-seen time. Dono O(log N), memory mein, microseconds.', go: ['loc>redis', 'res:redis>loc'], after: { redis: { sub: 'driver:42 moved' } }, msg: 'GEOADD drivers:tdr1 77.6067 12.9756 driver:42\nZADD drivers:lastseen 1791200000 driver:42' },
        ]},
        { name: 'Paas ke drivers', steps: [
          { title: 'User ne app kholi', text: 'Rider ki location ke saath query.', go: 'usr>near', msg: 'GET /nearby/drivers?lat=12.9700&lng=77.6100&r=2km' },
          { title: 'GEOSEARCH', text: 'Redis 9 areas padhta hai, circle se bahar wale hata ke, doori ke order mein 10 deta hai.', go: ['near>redis', 'res:redis>near'], after: { redis: { state: 'hit' } }, msg: 'GEOSEARCH drivers:tdr1 FROMLONLAT 77.61 12.97 BYRADIUS 2 km ASC COUNT 10 WITHDIST' },
          { title: 'Filter + jawab', text: 'Busy/offline drivers hatao, ETA nikaalo, map pe dikhao. Sab ~10-20 ms.', go: 'res:near>usr', msg: '[ { "driver": 42, "dist_km": 0.71 }, ... ]' },
        ]},
        { name: 'Events near you', steps: [
          { title: 'Query', text: 'Is weekend, 5 km, comedy.', go: 'usr>near', msg: 'GET /nearby/events?lat=12.97&lng=77.61&r=5km&type=comedy' },
          { title: 'Index se geo filter', text: 'GiST index (ya ES ka geo index) se 5 km ke candidates, saath mein date/type filters.', go: ['near>pg', 'res:pg>near'], set: { redis: { state: 'dim' } }, after: { pg: { state: 'hit' } }, msg: 'SELECT ... WHERE ST_DWithin(location, :me, 5000) AND type = \'comedy\' ...' },
          { title: 'Jawab', text: 'Static data, to iska result kuch minute cache bhi kar sakte ho (same cell + same filters).', go: 'res:near>usr' },
        ]},
        { name: 'Failure: ghost driver', steps: [
          { title: 'Phone band', text: 'Driver 77 ka phone tunnel mein, ya app crash. Updates aane band.', go: 'lost:drv>loc' },
          { title: 'Set mein abhi bhi hai', text: 'Sorted set member pe TTL nahi hota. Rider ko ek driver dikhta hai jo asal mein hai hi nahi.', go: ['usr>near', 'near>redis', 'res:redis>near', 'res:near>usr'], after: { redis: { state: 'warn', sub: 'driver:77 stale' } } },
          { title: 'Fix: last-seen cleanup', text: 'Cleanup job: 30 second se purane last-seen wale members dono sets se hatao. Aur query ke time bhi last-seen check.', go: ['loc>redis'], after: { redis: { state: '', sub: 'driver:77 removed' } }, msg: 'ZRANGEBYSCORE drivers:lastseen -inf (now-30)\nZREM drivers:tdr1 driver:77' },
        ]},
        { name: 'Failure: Redis node down', steps: [
          { title: 'Node gira', text: 'drivers:tdr1 wala Redis node crash.', set: { redis: { state: 'down', sub: 'DOWN' } }, go: 'lost:near>redis' },
          { title: 'Replica promote', text: 'Replica primary banti hai (Sentinel/Cluster failover). Replication async hai, to aakhri kuch updates kho sakte hain.', after: { redis: { state: 'warn', sub: 'replica = primary' } }, focus: ['redis'] },
          { title: 'Data apne aap bhar jaata hai', text: 'Har driver 4 second mein phir location bhejta hai. Kuch hi seconds mein set poora. Location ephemeral data hai: isliye isko durable DB mein har update ke saath likhna zaroori nahi (history chahiye to alag stream mein).', go: ['drv>loc', 'loc>redis'], after: { redis: { state: 'ok', sub: 'rebuilt in ~4 s' } } },
        ]},
      ],
    },

    { type: 'callout', tone: 'tip', title: 'Decide', html: `"Near me" dikhte hi: <strong>bade data pe scan mat karo, cells use karo</strong> (geohash, quadtree, S2 ya H3) aur hamesha apna cell + padosi padho, phir asli doori se filter. Cheez <strong>hilti hai</strong> (drivers, live creators, delivery partners) → <strong>Redis GEO</strong> (memory mein, tez writes, area ke hisaab se keys, last-seen cleanup). Cheez <strong>tiki hai</strong> (events, venues, places) → <strong>Elasticsearch</strong> agar text search + filters chahiye, <strong>PostGIS</strong> agar data relational hai ya polygons/geofences chahiye. Density bahut alag ho to quadtree; poori duniya ya regions/polygons ko cells se dhakna ho to S2; areas pe analysis (demand, surge) ho to H3.` },
    { type: 'table', head: ['Sawaal', 'Jawab'], rows: [
      ['10 lakh drivers, har 4 s update, "paas ke 10"', 'Redis GEO, geohash-prefix keys, last-seen cleanup'],
      ['"Comedy events, 5 km, is weekend, ₹500 se kam"', 'Elasticsearch: geo_distance filter + text + range'],
      ['"Ye pickup point kis city zone mein hai?" (polygon)', 'PostGIS: ST_Contains / ST_Within, GiST index'],
      ['Shehar ke har area ki demand, har minute', 'H3 cells mein bucket karke count'],
      ['Chhoti app, 5,000 venues, already Postgres', 'PostGIS hi kaafi; naya system mat lao'],
    ]},

    { type: 'h2', text: 'Poora design, ek nazar mein' },
    { type: 'p', html: `xyz.com ki "near me" features ka poora naksha, har rung apni jagah pe. Box pe click karo, buttons se ek ek raasta dekho.` },
    { type: 'diagram', title: 'Proximity search: poori picture', height: 620,
      nodes: [
        { id: 'drv', label: 'Driver app', sub: 'location / 4 s', x: 100, y: 70, kind: 'client', info: 'Ye kya hai: driver (ya live creator) ki app. Har ~4 second lat-lng bhejti hai. Yahi lakhon writes/sec ka source hai.' },
        { id: 'loc', label: 'Location svc', sub: 'GEOADD', x: 360, y: 70, kind: 'server', info: 'Ye kya hai: location likhne wali stateless service. Sahi area key (drivers:tdr1) mein GEOADD, saath mein last-seen time. Updates ko ek stream mein bhi daalti hai.' },
        { id: 'h3', label: 'Demand job', sub: 'H3 counts', x: 610, y: 70, kind: 'server', info: 'Ye kya hai: analytics job (Rung 4). Har location ko H3 hexagon (jaise resolution 8, ~0.74 km²) mein daal ke har minute ginta hai: kis area mein kitne drivers, kitni demand.' },
        { id: 'redis', label: 'Redis GEO', sub: 'drivers:{geohash4}', x: 360, y: 230, kind: 'cache', info: 'Ye kya hai: memory mein geo sets (Rung 2, 5, 6). Har area ki alag key, member = driver, score = 52-bit geohash. Query apna + 8 padosi areas padhti hai.' },
        { id: 'clean', label: 'Cleanup job', sub: 'stale > 30 s', x: 610, y: 230, kind: 'server', info: 'Ye kya hai: chhota cron job. Sorted set member pe TTL nahi hota, isliye ye last-seen dekh ke 30 second se chup drivers ko ZREM karta hai (ghost driver fix).' },
        { id: 'usr', label: 'User app', sub: 'near me?', x: 100, y: 390, kind: 'client', info: 'Ye kya hai: rider ya viewer. "Paas ke drivers", "nearby creators", "events near you" poochhta hai.' },
        { id: 'near', label: 'Nearby svc', sub: 'cells + filter', x: 360, y: 390, kind: 'server', info: 'Ye kya hai: query service. Moving cheezein Redis GEO se, static cheezein ES/PostGIS se. Candidates pe business filters (available? blocked?), aur k-nearest ke liye ring badhana.' },
        { id: 'eta', label: 'Routing / ETA', sub: 'road distance', x: 610, y: 390, kind: 'server', info: 'Ye kya hai: road network pe asli time nikaalne wali service (aam industry tareeka). Geo index seedhi doori deta hai; final ranking sadak ke ETA se.' },
        { id: 'es', label: 'Elasticsearch', sub: 'text + geo_point', x: 220, y: 560, kind: 'data', info: 'Ye kya hai: search engine (Rung 5). "Comedy, is weekend, 5 km, ₹500 se kam": geo_distance filter + text + range ek hi query mein.' },
        { id: 'pg', label: 'PostGIS', sub: 'venues, zones', x: 500, y: 560, kind: 'data', info: 'Ye kya hai: Postgres + geo extension (Rung 5). Venues aur city zones (polygons). GiST index + ST_DWithin (radius), ST_Contains (kaunse zone mein).' },
      ],
      edges: [
        { a: 'drv', b: 'loc', n: 1, label: 'every 4 s' },
        { a: 'loc', b: 'redis', n: 2, label: 'GEOADD' },
        { a: 'loc', b: 'h3', kind: 'evt', label: 'stream' },
        { a: 'clean', b: 'redis', kind: 'bad', label: 'ZREM stale' },
        { a: 'usr', b: 'near', n: 3, label: 'nearby?' },
        { a: 'near', b: 'redis', n: 4, label: 'GEOSEARCH' },
        { a: 'near', b: 'eta', n: 5, label: 'ETA' },
        { a: 'near', b: 'es', label: 'events' },
        { a: 'near', b: 'pg', label: 'zones' },
      ],
      paths: [
        { name: 'Location update', text: 'Driver ne location bheji. Location service ne sahi area key mein GEOADD kiya, aur stream se demand job ne H3 count badhaya.', go: ['drv>loc>redis', 'evt:loc>h3'] },
        { name: 'Paas ke drivers', text: 'User ne poochha. Nearby service ne apna + padosi areas GEOSEARCH kiye, candidates ko ETA se rank kiya, aur top 10 lautaye.', go: ['usr>near>redis', 'res:redis>near', 'near>eta', 'res:near>usr'] },
        { name: 'Events near you', text: 'Static data: Elasticsearch mein geo + text + date ek query mein. Zone ka sawaal PostGIS se.', go: ['usr>near>es', 'res:es>near', 'near>pg', 'res:near>usr'] },
        { name: 'Ghost driver', text: 'Driver ka phone band, updates ruke. Cleanup job ne 30 second baad use set se hataya.', go: ['bad:clean>redis'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>lat aur lng pe alag B-tree indexes 2D "paas" nahi samajhte: har ek lambi patti deta hai.</li>
      <li>Trick: naksha cells mein baanto, sirf aas paas ke cells padho, phir asli doori se filter.</li>
      <li>Kabhi sirf apna cell mat padho (edge-of-cell). Apna + 8 padosi, ya radius ko dhakne wale cells. Cell ki chhoti side ≈ radius.</li>
      <li>Geohash = string cells, simple. Quadtree = density ke hisaab se. S2 = poori golaai, Hilbert order. H3 = hexagons, barabar padosi, area analysis.</li>
      <li>Hilte points (drivers) → Redis GEO (memory, area keys, last-seen cleanup). Tiki cheezein → Elasticsearch (text + filters) ya PostGIS (relational, polygons).</li>
      <li>PostGIS: ST_DWithin + GiST, geography type (meters). Redis: GEOSEARCH, longitude pehle.</li>
      <li>Scale: area ke hisaab se keys, hot cells ko todna, k-nearest ke liye ring badhana. Seedhi doori ≠ sadak ki doori.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Har query mein poore shehar ki jagah sirf kuch cells: 10-100x kam kaam', 'Cell ID ek normal key hai: B-tree, sorted set, ya key-value store sab chala lete hain', 'Redis GEO: microsecond writes, hilti cheezon ke liye perfect', 'ES/PostGIS: geo ke saath text, filters, polygons, durability'],
      costs: ['Edge-of-cell: padosi cells padhne hi padte hain, aur cell size radius se match karna padta hai', 'Redis GEO: memory ka kharcha, member TTL nahi (stale cleanup khud), ek key ek shard pe', 'Fixed grid pe density ka farak: ghane cell mein bahut points (quadtree/H3 resolution se sambhalo)', 'ES mein bahut tez updates mehenge; PostGIS mein degrees vs meters jaisi galtiyan', 'Doori approximation hai (Redis worst case ~0.5%); "seedhi doori" sadak ki doori nahi'] },

    { type: 'think', questions: [
      { q: '"Sabse paas ke 5 creators" (k-nearest) chahiye, radius nahi pata. Ghane Mumbai mein 200 m mein 5 mil jaayenge, gaon mein 20 km mein bhi shayad nahi. Cells se kaise karoge?', a: 'Chhote radius se shuru karo (apna cell + padosi). 5 se kam mile to radius/ring badhao (bade cells ya agla ring) aur dobara. Ek upper limit rakho (jaise 50 km) taaki khaali area mein loop na chale. Redis mein GEOSEARCH ... ASC COUNT 5 ek radius ke andar sabse paas ke deta hai; radius badhane ka loop app karta hai. PostGIS mein ORDER BY location <-> point LIMIT 5 index-assisted k-nearest seedha de deta hai.' },
      { q: 'IPL final ke din stadium ke bahar 20,000 drivers ek hi geohash cell mein. Kya toot sakta hai?', a: 'Ek cell (aur agar key per cell hai to ek Redis key/shard) hot ho jaata hai: writes bhi wahi, reads bhi wahi. Har query 20,000 candidates check karegi. Fix: us area ke liye zyada precision (chhote cells), COUNT ke saath limit, quadtree jaisa density-aware split, aur key ko aur todna. Ye pattern-spikes wala hot key problem hai, bas geo roop mein.' },
      { q: 'Rider ko "2 km mein" driver dikha, lekin pahunchne mein 15 minute laga. Galti kahan hai?', a: 'Geo index seedhi line (crow-fly) doori deta hai. Beech mein nadi, flyover ya one-way ho sakta hai. Asli systems pehle geo index se candidates nikaalte hain, phir unke liye road network pe ETA nikaal ke rank karte hain. Proximity search sirf pehla, sasta filter hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: '<code>lat</code> aur <code>lng</code> pe alag alag B-tree index hain. Radius query slow kyun?', options: ['B-tree float support nahi karta', 'Har index akela ek lambi patti (poori duniya ka band) deta hai; 2D box ke liye dono ka bada intersection chahiye', 'Index hamesha disk pe hota hai'], answer: 1, explain: 'B-tree ek dimension sort karta hai. 2D ke liye cells (geohash/H3) ya spatial index (GiST/R-tree, BKD) chahiye.' },
      { q: 'Simulator mein "sirf apna cell" padhne pe 89 mein se 66 creators miss hue. Kyun?', options: ['Hash collision', 'User cell ke kinare pe tha; paas wale creators padosi cells mein the', 'Radius bahut chhota tha'], answer: 1, explain: 'Edge-of-cell problem. Hamesha apna + 8 padosi (ya radius ko dhakne wale saare cells) padho, phir doori se filter.' },
      { q: 'Redis mein radius query ke liye aaj kaunsa command use karna chahiye?', options: ['GEORADIUS', 'GEOSEARCH ... BYRADIUS', 'ZRANGE'], answer: 1, explain: 'GEOSEARCH Redis 6.2 se hai; docs GEORADIUS aur GEORADIUSBYMEMBER ko deprecated kehte hain.' },
      { q: 'PostGIS mein 5 km ke andar ke events, index ke saath. Sahi query?', options: ['WHERE ST_Distance(location, me) < 5000', 'WHERE ST_DWithin(location, me, 5000) (geography type, GiST index)', 'WHERE lat - 12.97 < 0.05'], answer: 1, explain: 'ST_DWithin pehle bounding box se index use karta hai, phir exact doori. geography type pe units meters hain.' },
      { q: 'Quadtree fixed grid se behtar kab hai?', options: ['Jab points poore shehar mein barabar faile hon', 'Jab density bahut alag ho (ghane mohalle vs khaali jagah) aur points zyada na hilte hon', 'Jab har second lakhon points hilte hon'], answer: 1, explain: 'Quadtree bheed wali jagah ko chhote khaanon mein todta hai, taaki har khaane mein lagbhag barabar points hon. Lab mein fixed grid ka sabse bhara khaana 254 points, quadtree (hadd 50) mein max 50.' },
      { q: 'H3 hexagons kyun use karta hai?', options: ['Hexagons ka hisaab sabse aasaan hai', 'Hexagon ke saare 6 padosi barabar door hain, to rings (k-ring) circle jaise aur area analysis saaf', 'Hexagon se poori Earth bina kisi aur shape ke dhak jaati hai'], answer: 1, explain: 'Square ke kone wale padosi ~1.4 guna door hote hain; hexagon ke sab padosi barabar. (Golaai ko dhakne ke liye H3 mein har resolution pe 12 pentagon bhi hote hain.)' },
      { q: '10 lakh drivers ki live location ke liye pehli pasand?', options: ['Elasticsearch', 'Redis GEO (in-memory, per-area keys)', 'Har update Postgres mein, phir PostGIS query'], answer: 1, explain: 'Lakhon writes/sec, data ephemeral, query simple: memory wala geo index. ES/PostGIS static, filter-heavy data ke liye.' },
    ]},
    { type: 'sources', note: 'Commands aur behaviour official docs se verify kiye. Geohash/quadtree/H3 ke andar ke details ds-for-scale lesson ke sources mein hain.', items: [
      { title: 'GEOSEARCH', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/commands/geosearch/', used: 'Syntax (FROMMEMBER/FROMLONLAT, BYRADIUS/BYBOX, ASC, COUNT ANY, WITHDIST), available since 6.2, replaces deprecated GEORADIUS/GEORADIUSBYMEMBER.' },
      { title: 'GEOADD', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/commands/geoadd/', used: 'Sorted set with 52-bit interleaved geohash score, 1+8 areas checked, longitude before latitude, latitude limit ±85.05112878, Haversine on a sphere with up to 0.5% error, ZREM for removal.' },
      { title: 'ST_DWithin', publisher: 'PostGIS documentation', official: true, url: 'https://postgis.net/docs/ST_DWithin.html', used: 'Geography version in meters, uses bounding-box index comparison, prefer over ST_Distance for radius filters.' },
      { title: 'Geo-distance query', publisher: 'Elastic documentation', official: true, url: 'https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-geo-distance-query', used: 'geo_distance filter syntax on geo_point fields inside a bool filter.' },
      { title: 'S2 Cells (cell hierarchy and S2CellId numbering)', publisher: 'S2 Geometry documentation', official: true, url: 'https://s2geometry.io/devguide/s2cell_hierarchy.html', used: 'Cube faces projected onto the sphere, levels 0-30, ~1 cm leaf cells, 64-bit cell ids ordered along a Hilbert-based space-filling curve.' },
      { title: 'Tables of Cell Statistics Across Resolutions', publisher: 'H3 documentation', official: true, url: 'https://h3geo.org/docs/core-library/restable/', used: '16 resolutions, 12 pentagons per resolution, average hexagon areas (res 7: ~5.16 km², res 8: ~0.74 km², res 9: ~0.105 km²).' },
      { title: 'H3: Uber\'s Hexagonal Hierarchical Spatial Index', publisher: 'Uber Engineering blog', official: true, year: 2018, url: 'https://www.uber.com/blog/h3/', used: 'H3 hexagon grid background (older post; library still maintained at h3geo.org).' },
    ]},
  ],
});
