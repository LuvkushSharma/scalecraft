Lesson.register({
  id: 'design-maps',
  title: 'Google Maps',
  minutes: 40,
  summary: `Poori duniya ka map smoothly dikhana, karodon road segments mein milliseconds mein fastest route nikaalna, aur abhi is waqt traffic kahan hai ye jaanna. Tiles, graph routing with precomputation, live traffic aur ML se ETA.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum phone pe map kholte ho aur ungli se khiskaate ho. Map turant aata hai, chahe tum Delhi dekho ya kisi chhote gaon ko.<br>Phir likhte ho "India Gate", aur app 1 second mein batata hai: "41 minute, Ring Road se, aage jam hai".<br>Iske peeche teen kaam hain: poori duniya ka map chhote tukdon mein pehle se kaat ke rakhna, sadkon ke jaal mein sabse tez raasta dhoondhna, aur crores phones se pata karna ki abhi kis sadak pe jam hai.<br>Ye lesson teeno ko zero se, ek ek karke banata hai.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `10 minute kaagaz pe socho: (1) poori duniya ka map phone pe kaise aayega, jab har zoom pe detail alag hai? (2) Delhi se Jaipur ka fastest route kaise nikalega jab road network mein crores intersections hain? (3) "Abhi 40 minute lagenge" ye number kahan se aata hai? Phir aage padho.` },

    { type: 'p', html: `Google Maps teen bilkul alag problems ka combination hai, aur teeno ka solution alag hai. Isliye ye interview mein bahut achha design question hai: <strong>map dikhana</strong> (static data, bahut zyada reads, CDN ka khel), <strong>route nikaalna</strong> (graph algorithm, precomputation ka khel), aur <strong>traffic + ETA</strong> (streaming data aur machine learning ka khel).` },
    { type: 'callout', tone: 'warn', title: 'Kya public hai, kya nahi', html: `Google ne apne Maps ke andar ka poora architecture kabhi publish nahi kiya. Is lesson mein jo Google-specific hai wo unke official blogs, Google Maps Platform docs aur Google/DeepMind ke research papers se hai (har jagah saal likha hai). Baaki hisse, jaise routing algorithm ka exact choice, <em>general industry approach</em> hain, aur wahan hum saaf bolenge ki ye textbook/open-source tareeka hai, Google ka confirmed internal design nahi.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Map dekhna: pan, zoom, rotate, poori duniya<br>• Jagah dhoondhna: "India Gate" ya address likho, map pe pin (geocoding)<br>• Route: A se B, car / bike / walking, alternatives ke saath<br>• Live traffic layer (laal / peela / hara)<br>• ETA: "40 min, 6:52 tak pahunchoge"<br>• Navigation: turn-by-turn, raasta chhoota to reroute<br><br><strong>Out of scope:</strong> Street View, reviews, transit timetables` },
      right: { title: 'Non-functional', html: `• Map smooth: pan/zoom pe tiles &lt; ~100 ms mein<br>• Route query fast: lambe route bhi ~100s of ms mein<br>• Traffic fresh: minutes purana, ghante nahi<br>• ETA accurate (Google ne 2020 mein &gt;97% trips pe accurate ETA ka daava kiya)<br>• Privacy: kisi ek phone ki movement track na ho sake<br>• Bahut high availability, poori duniya mein` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: Geocoding', html: `<strong>Ye kya hai:</strong> address ya jagah ka naam → latitude/longitude (zameen pe jagah ke do numbers), jaise "India Gate, New Delhi" → 28.6129, 77.2295. <strong>Reverse geocoding</strong> ulta hai: coordinates → padhne layak address. Google Maps Platform ki Geocoding API docs yahi do kaam define karti hain.<br><strong>Kyun chahiye:</strong> insaan naam likhta hai, lekin routing aur map ko numbers chahiye.<br><strong>Iske bina:</strong> user ko khud coordinates type karne padte, ya "mera current location" ka address kabhi nahi dikhta.` },

    { type: 'h2', text: 'Step 2: map dikhana, tiles ka pyramid' },
    { type: 'p', html: `Pehli koshish: server pe poori duniya ki ek badi image rakho, phone jitna hissa maange utna kaat ke bhejo. Problem: har pan/zoom pe server ko image kaatni padegi (CPU), har user ka view thoda alag hai to kuch bhi cache nahi hoga, aur zoom badalte hi detail badalni chahiye (zoom out pe galiyan nahi, sirf highways).` },
    { type: 'p', html: `Solution: duniya ko <strong>pehle se</strong> chhote squares mein kaat ke rakh do, har zoom level ke liye alag. Zoom 0 pe poori duniya ek 256×256 pixel ka square. Zoom 1 pe har square 4 mein toot jaata hai (2×2), zoom 2 pe 16 (4×4)... Har zoom pe tiles 4 guna. Isse <strong>tile pyramid</strong> kehte hain. Ab har tile ka ek fixed address hai: <code>/{z}/{x}/{y}</code>. Same address = same bytes, har user ke liye. Matlab ye perfectly <a href="#/cdn">CDN</a> pe cache hone wali cheez hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Tile (aur zoom level)', html: `<strong>Ye kya hai:</strong> map ka ek chhota square tukda (traditionally 256×256 pixel), jaise ek badi photo ko chhote square stickers mein kaat diya ho. <strong>Zoom level z</strong> batata hai duniya ko kitne tukdon mein kaata: 2<sup>z</sup> × 2<sup>z</sup> = 4<sup>z</sup> tiles. Har tile ka address <code>z/x/y</code>: zoom, column, row.<br><strong>Kyun chahiye:</strong> phone ko sirf wahi kuch tiles chahiye jo screen pe hain, aur same address ka tile sabke liye same hai, to CDN use cache kar sakta hai.<br><strong>Iske bina:</strong> server ko har user ke liye har pan/zoom pe nayi image kaatni padti: CPU bekaar aur cache zero.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Web Mercator', html: `<strong>Ye kya hai:</strong> gol Earth ko flat square pe "khinchne" ka tareeka (projection), jaise santre ka chhilka kaat ke table pe failana. Square banane ke liye ye ~±85° latitude pe map kaat deta hai (OpenStreetMap wiki ke hisaab se exact ±85.0511°), isliye poles web maps pe dikhte hi nahi.<br><strong>Kyun chahiye:</strong> square duniya ko baar baar 4 square tukdon mein baanta ja sakta hai; tile pyramid isi pe tika hai. Google Maps Platform docs bhi yahi tile coordinates samjhaate hain: har zoom pe resolution dono directions mein double.<br><strong>Iske bina:</strong> har zoom pe tile ka shape aur address nikaalna bahut complex hota. Keemat: poles ke paas cheezein badi dikhti hain (Greenland Africa jitna lagta hai).` },
    { type: 'callout', tone: 'term', title: 'Naya word: CDN (Content Delivery Network)', html: `<strong>Ye kya hai:</strong> duniya bhar ke shehron mein rakhe cache servers, jo files ki copy user ke paas se dete hain. Detail <a href="#/cdn">CDN lesson</a> mein.<br><strong>Kyun chahiye:</strong> Delhi ke tiles Delhi ke paas wale server se aayein, door ke origin se nahi; aur ek tile ko crores log maangein to bhi origin pe ek hi baar.<br><strong>Iske bina:</strong> har tile request hamare servers tak, latency zyada aur bill bahut bada.` },
    { type: 'p', html: `Slider chalao. Dekho tiles kitni tezi se badhte hain, aur ek phone screen ko actually kitne tiles chahiye:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Zoom level: <strong class="gmz-v"></strong></label><input class="gmz" type="range" min="0" max="20" value="15"></div>
          <div><label>Jagah</label><select class="gmp"><option value="28.6129,77.2295">India Gate, Delhi</option><option value="18.9220,72.8347">Gateway of India, Mumbai</option><option value="59.3293,18.0686">Stockholm (door north)</option></select></div>
          <div><label>Screen</label><select class="gmv"><option value="390,844">Phone (390×844)</option><option value="1440,900">Laptop (1440×900)</option></select></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Is zoom pe tiles</span><strong class="gm-t"></strong></div>
          <div class="stat"><span>Zoom 0 se yahan tak total</span><strong class="gm-c"></strong></div>
          <div class="stat"><span>Is zoom ka storage (20 KB/tile maan ke)</span><strong class="gm-s"></strong></div>
          <div class="stat"><span>1 pixel = zameen pe</span><strong class="gm-m"></strong></div>
          <div class="stat"><span>Screen ko chahiye</span><strong class="gm-n"></strong></div>
        </div>
        <svg class="gm-svg" viewBox="0 0 340 220" style="width:100%;max-width:520px;display:block;margin:10px auto"></svg>
        <div class="calc-note gm-note"></div>`;
      const q = s => el.querySelector(s);
      const fmt = n => n >= 1e12 ? (n / 1e12).toFixed(2) + ' trillion' : n >= 1e9 ? (n / 1e9).toFixed(1) + ' billion' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(n);
      const bytes = b => b >= 1e15 ? (b / 1e15).toFixed(1) + ' PB' : b >= 1e12 ? (b / 1e12).toFixed(1) + ' TB' : b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : (b / 1e3).toFixed(0) + ' KB';
      const upd = () => {
        const z = Number(q('.gmz').value), n = Math.pow(2, z);
        const [lat, lon] = q('.gmp').value.split(',').map(Number);
        const [vw, vh] = q('.gmv').value.split(',').map(Number);
        const tiles = Math.pow(4, z), cum = (Math.pow(4, z + 1) - 1) / 3;
        const r = lat * Math.PI / 180;
        const px = (lon + 180) / 360 * 256 * n;
        const py = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 256 * n;
        const x0 = Math.max(0, Math.floor((px - vw / 2) / 256)), x1 = Math.min(n - 1, Math.floor((px + vw / 2 - 1) / 256));
        const y0 = Math.max(0, Math.floor((py - vh / 2) / 256)), y1 = Math.min(n - 1, Math.floor((py + vh / 2 - 1) / 256));
        const cols = x1 - x0 + 1, rows = y1 - y0 + 1, need = cols * rows;
        const mpp = 156543.03 * Math.cos(r) / n;
        q('.gmz-v').textContent = z;
        q('.gm-t').textContent = fmt(tiles);
        q('.gm-c').textContent = fmt(Math.round(cum));
        q('.gm-s').textContent = bytes(tiles * 20e3);
        q('.gm-m').textContent = mpp >= 1000 ? (mpp / 1000).toFixed(1) + ' km' : mpp.toFixed(mpp < 10 ? 2 : 0) + ' m';
        q('.gm-n').textContent = need + ' tiles (' + cols + '×' + rows + ')';
        // drawing: tiles grid with the viewport rectangle on top
        const W = 340, H = 220, pad = 8;
        const sc = Math.min((W - 2 * pad) / (cols * 256), (H - 2 * pad) / (rows * 256));
        const ox = (W - cols * 256 * sc) / 2, oy = (H - rows * 256 * sc) / 2;
        let s = '';
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
          const X = ox + i * 256 * sc, Y = oy + j * 256 * sc, S = 256 * sc;
          s += `<rect x="${X.toFixed(1)}" y="${Y.toFixed(1)}" width="${S.toFixed(1)}" height="${S.toFixed(1)}" fill="var(--surface-2)" stroke="var(--line-2)"/>`;
          const fs = S > 90 ? 10 : 8;
          if (S > 40) s += `<text x="${(X + S / 2).toFixed(1)}" y="${(Y + S / 2 - fs * 0.6).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-family="var(--f-mono)" fill="var(--ink-3)">x ${x0 + i}</text><text x="${(X + S / 2).toFixed(1)}" y="${(Y + S / 2 + fs * 0.7).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-family="var(--f-mono)" fill="var(--ink-3)">y ${y0 + j}</text>`;
        }
        const vx = ox + (Math.max(0, px - vw / 2) - x0 * 256) * sc, vy = oy + (Math.max(0, py - vh / 2) - y0 * 256) * sc;
        const vwx = (Math.min(n * 256, px + vw / 2) - Math.max(0, px - vw / 2)) * sc, vhy = (Math.min(n * 256, py + vh / 2) - Math.max(0, py - vh / 2)) * sc;
        s += `<rect x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" width="${vwx.toFixed(1)}" height="${vhy.toFixed(1)}" fill="var(--accent-soft)" fill-opacity="0.45" stroke="var(--accent)" stroke-width="2"/>`;
        q('.gm-svg').innerHTML = s;
        q('.gm-note').innerHTML = `Neela dabba = tumhari screen. Grey squares = wo tiles jo download honge, address <code>/${z}/${x0}/${y0}</code> se <code>/${z}/${x1}/${y1}</code> tak. Duniya mein ${fmt(tiles)} tiles hain, lekin screen ko sirf ${need} chahiye: map ek bahut read-heavy, cache-friendly cheez hai.`;
      };
      ['.gmz', '.gmp', '.gmv'].forEach(c => q(c).addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `Do baatein note karo. (1) Zoom 18 pe ~68.7 billion tiles hain (OpenStreetMap wiki bhi yahi number deta hai), aur zoom 0 se 19 tak total ~366 billion. Google ne 2010 mein likha tha ki 20 zoom levels pe poori duniya ke liye 360 billion se zyada image tiles lagte the: wahi number. (2) Phone ko ek baar mein sirf ~10-20 tiles chahiye. Storage bada hai, lekin har request chhoti aur cacheable.` },
    { type: 'image', src: 'assets/img/design-maps/osm-tiles-india-gate-zooms.jpg', alt: 'Teen asli map tiles saath saath: zoom 7 pe Delhi aur aas paas ke shehar, zoom 11 pe South Delhi ki sadkein, zoom 16 pe India Gate aur Children\'s Park. Har tile ke neeche uska z/x/y address.', caption: 'Ek hi jagah (India Gate), teen zoom levels, teen alag tiles. Har tile 256×256 pixel ka hai, lekin zoom 7 ka tile ~275 km chauda area dikhata hai aur zoom 16 ka sirf ~540 m. Neeche likha address hi tile ka "naam" hai, jisse CDN use cache karta hai. (OpenStreetMap ke tiles, Google ke nahi; idea same hai.)', credit: { text: '© OpenStreetMap contributors (tiles arranged for this course)', url: 'https://www.openstreetmap.org/copyright', license: 'ODbL' } },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "saare tiles pehle se render karke rakhne padenge"', html: `Nahi. Zoom 18-20 pe zyada tar tiles samundar, registan ya jungle hain jo bilkul ek jaise dikhte hain. Aam taur pe industry mein popular areas aur kam zoom levels pehle se render kiye jaate hain, aur gehre zoom ke rare tiles pehli request pe banaye (render on demand) aur phir cache kiye jaate hain. Ek jaise "khaali neele" tiles ek hi file ki taraf point kar sakte hain. Ye general approach hai; Google ka exact tareeka public nahi hai.` },

    { type: 'h3', text: 'Raster tiles vs vector tiles' },
    { type: 'p', html: `Shuru mein har tile ek <strong>image</strong> (PNG) thi: roads, labels, sab kuch pixels mein "baked in". Google ke Maps blog ne December 2010 mein (Google Maps 5.0 for Android) bataya ki unhone mobile app ko <strong>vector tiles</strong> pe shift kiya: tile ab image nahi, balki map ki geometry ka "blueprint" hai (yahan sadak ki line hai, ye building ka polygon hai, ye naam hai), aur phone khud usse map draw karta hai.` },
    { type: 'compare',
      left: { title: 'Raster (image) tiles', html: `• Server pe render, phone bas dikhata hai (phone ka kaam kam)<br>• Zoom 2× kiya to lines aur text dhundhle; isliye fixed zoom levels, har level pe naye tiles download<br>• Rotate kiya to labels ulte ho jaate<br>• Har style (dark mode, satellite overlay) = alag tiles<br>• Har zoom pe alag data: storage aur download zyada` },
      right: { title: 'Vector tiles', html: `• Phone pe GPU se draw (device ka kaam zyada)<br>• Ek vector tile kai zoom levels ke liye kaam aata hai; zoom smooth, text crisp<br>• Tilt, rotate, 3D buildings, labels hamesha seedhe<br>• Same data, alag style (night mode) client pe<br>• Google 2010: saare zoom levels ke liye "100 guna se bhi kam data", isliye offline caching possible hua` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: Vector tile', html: `<strong>Ye kya hai:</strong> ek tile jisme pixels nahi, shapes ka data hota hai: points (jagah), lines (sadak, nadi), polygons (building, park), plus unke attributes (naam, road type). Phone ek <strong>style</strong> (rang aur moti-patli lines ke rules) ke hisaab se inhe khud draw karta hai. Open-source duniya mein Mapbox Vector Tile format isi idea ka popular standard hai.<br><strong>Kyun chahiye:</strong> kam data, smooth zoom/rotate, labels seedhe, dark mode bina naye download ke, aur offline maps possible.<br><strong>Iske bina (sirf raster images):</strong> har zoom aur har style ke alag tiles download, zoom pe dhundhla text, aur bade area ka offline map phone mein fit karna mushkil.` },

    { type: 'h2', text: 'Step 3: API aur core entities' },
    { type: 'code', text: `
GET  /tiles/{z}/{x}/{y}?style=v2          → vector tile (CDN se, long cache TTL)
GET  /geocode?q=India+Gate                → [{ place_id, lat, lng, address }]
GET  /reverse-geocode?lat=..&lng=..       → { address }
POST /routes
     { origin, destination, mode: "DRIVE", departure_time: "now", alternatives: true }
  →  [{ polyline, distance_m: 23100, eta_s: 2460, steps: [...] }, ...]
POST /location-updates   (sirf jab user ne location sharing on ki ho)
     [{ ts, lat, lng, speed, heading }, ...]   ← batch mein, har kuch second` },
    { type: 'table', head: ['Entity', 'Kya hai', 'Kahan rehta hai'], rows: [
      ['Road graph', 'Node = intersection, edge = road segment (length, speed limit, one-way, turn restrictions, toll)', 'Routing servers ki memory mein, region-wise baanta hua'],
      ['Segment speed', 'Har segment ki abhi ki speed + historical speed pattern (din, ghanta)', 'Fast key-value store, traffic pipeline update karta hai'],
      ['Place', 'Naam, address, category, lat/lng, place_id', 'Text search index + geo index'],
      ['Tile', 'z/x/y ka vector data', 'Object storage + CDN'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Graph (road network)', html: `<strong>Ye kya hai:</strong> dots (<strong>nodes</strong>) aur unhe jodne wali lines (<strong>edges</strong>). Road network mein har chauraha ek node, aur do chauraho ke beech ki sadak ek edge. Har edge pe ek <strong>weight</strong>: us sadak pe kitna time lagega. Fastest route = graph mein sabse kam total weight wala raasta.<br><strong>Kyun chahiye:</strong> "raasta dhoondhna" ek maths problem ban jaata hai jiske liye achhe algorithms pehle se hain (Dijkstra, A*).<br><strong>Iske bina:</strong> computer ke paas "sadak" samajhne ka koi tareeka nahi; map sirf ek tasveer rehta.` },

    { type: 'h2', text: 'Step 4: high-level design' },
    { type: 'p', html: `Teen alag raaste hain: <strong>tiles</strong> (bahut zyada, static, CDN), <strong>search/geocoding</strong> (text + geo index), aur <strong>routing</strong> (graph + live speeds). Diagram simple rakhne ke liye har service ke aage ka Load Balancer aur API gateway ek hi box mein maan liya hai. Saare scenarios chalao:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'app', label: 'Maps app', sub: 'phone / browser', x: 80, y: 165, w: 124, kind: 'client', info: 'Ye kya hai: user ke phone ki Maps app ya browser. Vector tiles ko khud draw karta hai, route ki polyline dikhata hai, aur navigation ke time GPS se apni position track karta hai.' },
        { id: 'cdn', label: 'CDN', sub: 'tiles cache', x: 280, y: 55, w: 130, kind: 'edge', info: 'Ye kya hai: shehron ke paas rakhe cache servers. Tiles ka address (z/x/y) fixed hai aur content sabke liye same, isliye CDN edge pe lambe TTL ke saath cache hote hain. Zyada tar tile requests yahin khatam ho jaati hain, origin tak aati hi nahi.' },
        { id: 'tiles', label: 'Tile store', sub: 'pre-built + render', x: 560, y: 55, w: 170, kind: 'data', info: 'Ye kya hai: saare tiles ka asli ghar (origin). Object storage mein pehle se bane tiles (kam zoom aur popular areas). Rare deep-zoom tile pehli baar maange jaane pe render karke store kiya ja sakta hai. Map data badalne pe (nayi sadak) sirf affected tiles dobara bante hain. Ye general approach hai.' },
        { id: 'places', label: 'Places / Geocode', sub: 'text + geo index', x: 320, y: 165, w: 160, kind: 'server', info: 'Ye kya hai: jagah dhoondhne wali service. "India Gate" ya address ko lat/lng mein badalta hai. Andar ek text search index (typo, synonyms) aur ek geo index hota hai (paas wali jagah pehle). Text search ke liye <a href="#/search">search lesson</a>, geo index ke liye <a href="#/ds-for-scale">geohash/S2/H3</a> dekho.' },
        { id: 'route', label: 'Routing', sub: 'graph in memory', x: 320, y: 275, w: 150, kind: 'server', info: 'Ye kya hai: raasta nikaalne wali service. Road graph memory mein, region ke hisaab se baanta hua (ek machine pe poori duniya ka detailed graph aur uska precomputed data fit karna mushkil hai). Precomputation (jaise contraction hierarchies) ki madad se lambe route bhi milliseconds mein. Kuch candidate routes nikalta hai, phir ETA model unhe rank karta hai.' },
        { id: 'traffic', label: 'Live speeds', sub: 'per road segment', x: 580, y: 275, w: 160, kind: 'data', info: 'Ye kya hai: har sadak ke tukde (segment) ki speed ka store. Har road segment ki abhi ki speed (live traffic pipeline se, har kuch minute mein update) aur historical pattern (Monday 9 baje is sadak pe aam taur pe kitni speed). Routing inhe edge weights ki tarah use karta hai.' },
      ],
      edges: [{ a: 'app', b: 'cdn' }, { a: 'cdn', b: 'tiles' }, { a: 'app', b: 'places' }, { a: 'app', b: 'route' }, { a: 'route', b: 'traffic' }, { a: 'traffic', b: 'tiles', id: 'tt', dashed: true, hidden: true }],
      scenarios: [
        { name: 'Map kholo (CDN hit)', intro: 'Sabse common request. Yahi sabse sasta hona chahiye.', steps: [
          { title: 'Screen ke tiles maango', text: 'App apni position aur zoom se nikaalta hai ki kaun se ~12 tiles chahiye, aur sab parallel mein maangta hai.', go: 'app>cdn', msg: 'GET /tiles/15/23413/13664?style=v2  (aur ~11 aur)' },
          { title: 'CDN: HIT', text: 'Delhi ke ye tiles har minute hazaaron log maang rahe hain, to edge pe already hain. Origin tak koi request nahi gayi.', go: 'res:cdn>app', after: { cdn: { state: 'hit' }, tiles: { state: 'dim' } } },
          { title: 'Phone pe draw', text: 'Vector tiles hain, to phone ka GPU unhe draw karta hai. Zoom thoda badhao to wahi data naye scale pe dobara draw, naya download nahi.', focus: ['app'] },
        ]},
        { name: 'Tile miss', steps: [
          { title: 'Rare tile', text: 'Kisi ne door gaon ko zoom 19 pe khola. Edge pe nahi hai.', go: ['app>cdn', 'cdn>tiles'], after: { cdn: { state: 'miss' } }, msg: 'GET /tiles/19/...  → MISS' },
          { title: 'Origin se lao, cache karo', text: 'Tile store se aaya (ya us waqt render hua), CDN ne copy rakh li. Agla user isi area mein fast.', go: ['res:tiles>cdn', 'res:cdn>app'], after: { cdn: { state: '' } } },
        ]},
        { name: 'Route nikaalo', steps: [
          { title: 'Destination dhoondho', text: 'User ne "India Gate" likha. Places service ne naam ko coordinates aur place_id mein badla.', go: ['app>places', 'res:places>app'], msg: 'GET /geocode?q=India+Gate  →  28.6129, 77.2295' },
          { title: 'Route request', text: 'Ab origin aur destination dono coordinates hain.', go: 'app>route', msg: 'POST /routes { origin, destination, mode: DRIVE, departure_time: now }' },
          { title: 'Edge weights = abhi ki speeds', text: 'Routing ko har segment pe kitna time lagega ye chahiye: live speed jahan fresh data hai, warna historical pattern.', go: ['route>traffic', 'res:traffic>route'] },
          { title: 'Candidates + ETA', text: 'Routing kuch achhe candidate routes nikaalta hai, ETA model har ek ka travel time predict karta hai, sabse achha pehle.', go: 'res:route>app', msg: '[{ eta: 41 min, via Ring Road }, { eta: 46 min, via NH48 }]' },
        ]},
        { name: 'Traffic layer', steps: [
          { title: 'Laal/peeli lines kahan se?', text: 'Traffic colours alag overlay tiles hain jo live speeds se baar baar bante hain. Inka CDN TTL bahut chhota (minutes), base map ka lamba (din).', show: ['tt'], go: 'evt:traffic>tiles' },
          { title: 'App overlay maangta hai', text: 'Base tiles cache se, traffic overlay fresh. Do alag layers isliye taaki traffic badalne pe poora map dobara download na karna pade.', go: ['app>cdn', 'res:cdn>app'] },
        ]},
        { name: 'Failure: traffic data stale', steps: [
          { title: 'Pipeline ruki', text: 'Live traffic pipeline mein lag aa gaya, speeds 20 minute purani hain.', set: { traffic: { state: 'warn', sub: '20 min purana' } }, focus: ['traffic'] },
          { title: 'Routing degrade hota hai, rukta nahi', text: 'Routing purane data ko ek limit ke baad trust karna band karke historical speeds pe aa jaata hai. Route milta rahega; bas ETA thoda kam accurate. Ye <strong>graceful degradation</strong> hai (general practice).', go: ['app>route', 'route>traffic', 'res:traffic>route', 'res:route>app'], msg: 'eta: 44 min (historical-only)' },
        ]},
        { name: 'Failure: tile store down', steps: [
          { title: 'Origin gir gaya', text: 'Tile store ka ek region down.', set: { tiles: { state: 'down', sub: 'DOWN' } } },
          { title: 'CDN purana tile de deta hai', text: 'Popular tiles CDN mein already hain. CDN ko config kar sakte hain ki origin error pe expired copy bhi de de (stale-if-error). Map thoda purana, lekin dikhta rahega. Sirf rare, kabhi na dekhe gaye tiles fail honge.', go: ['app>cdn', 'res:cdn>app'], after: { cdn: { state: 'warn', sub: 'stale serve' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 1: fastest route, Dijkstra se contraction hierarchies tak' },
    { type: 'p', html: `India ka road network socho: crores intersections. User ne "Delhi se Jaipur" maanga aur jawab ~100 ms mein chahiye, aur aise hazaaron requests har second. Kaunsa algorithm?` },
    { type: 'steps', items: [
      { t: 'Dijkstra (1959)', d: 'Source se shuru karo. Har baar wo node uthao jo ab tak sabse kam time mein pahunch mein hai, aur uske padosiyon ka time update karo. Ye ek ghere (circle) ki tarah har direction mein failta hai, jab tak destination na mil jaaye. Sahi jawab deta hai, lekin Delhi se Jaipur ke liye wo Chandigarh aur Agra ki galiyan bhi explore kar lega, kyunki use direction ka koi andaaza nahi.' },
      { t: 'A* (A-star)', d: 'Dijkstra + ek andaaza (heuristic): "is node se destination tak kam se kam kitna time?" Seedhi line ki doori ÷ sabse tez possible speed. Ye andaaza kabhi asli time se zyada nahi hota, isliye jawab ab bhi sahi rehta hai, lekin search destination ki taraf jhuk jaata hai. Ghera ab ek ande (ellipse) jaisa.' },
      { t: 'Bidirectional search', d: 'Ek search source se aage, ek destination se peeche; beech mein milte hi ruk jao. Do chhote ghere ek bade ghere se kam area cover karte hain.' },
      { t: 'Precomputation: contraction hierarchies (CH)', d: 'Asli trick: query ke time kaam bachane ke liye pehle se (offline) kaam kar lo. Neeche detail.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Priority queue', html: `<strong>Ye kya hai:</strong> ek list jisme se hamesha sabse chhote number wala item pehle nikalta hai, chahe wo baad mein daala gaya ho. Jaise hospital ki emergency line: jo sabse serious hai wo pehle.<br><strong>Kyun chahiye:</strong> Dijkstra ko har step pe "abhi tak sabse kam time mein pahunch mein aane wala chauraha" chahiye. Priority queue ye turant de deti hai.<br><strong>Iske bina:</strong> har step pe saare chauraho ko dekh ke minimum dhoondhna padta, jo bade graph pe bahut slow hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Heuristic (A* ka andaaza)', html: `<strong>Ye kya hai:</strong> ek sasta andaaza ki "yahan se destination tak kam se kam kitna time lagega". Maps mein: seedhi line ki doori ÷ sabse tez possible speed.<br><strong>Kyun chahiye:</strong> A* queue mein har chaurahe ko <code>f = g + h</code> se rakhta hai: g = start se yahan tak ka asli time, h = andaaza aage ka. Isse search destination ki taraf jhukta hai.<br><strong>Iske bina (h = 0):</strong> A* bilkul Dijkstra ban jaata hai. Aur agar andaaza asli time se <em>zyada</em> bata de, to A* galat (lamba) route de sakta hai; isliye andaaza hamesha "kam se kam" wala hona chahiye.` },
    { type: 'p', html: `Ab ek-ek step chala ke dekho. S se G jaana hai. Lines pe likha number = minutes. Har "Next step" pe algorithm queue se sabse chhota item nikaalta hai, us chaurahe ko <strong>pakka</strong> (settled) karta hai, aur uske padosiyon ka time update karta hai:` },
    { type: 'custom', render(el) {
      const P = { P: [0, 1], Q: [0, 7], S: [2, 4], A: [4, 1], B: [4, 7], C: [6, 4], E: [8, 1], F: [8, 7], G: [10, 4] };
      const ED = [['S', 'P', 4], ['S', 'Q', 4], ['S', 'A', 5], ['S', 'B', 4], ['S', 'C', 6], ['A', 'C', 4], ['B', 'C', 5], ['A', 'E', 4], ['C', 'E', 6], ['C', 'F', 4], ['B', 'F', 5], ['E', 'G', 5], ['F', 'G', 4], ['P', 'A', 5], ['Q', 'B', 5]];
      const eu = (a, b) => Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]), H = v => Math.floor(eu(v, 'G'));
      const adj = {}; Object.keys(P).forEach(k => adj[k] = []); ED.forEach(([a, b, w]) => { adj[a].push([b, w]); adj[b].push([a, w]); });
      const X = v => 30 + P[v][0] * 28, Y = v => 22 + P[v][1] * 25;
      let astar = false, st;
      const reset = () => { st = { g: { S: 0 }, prev: {}, done: [], q: [['S', astar ? H('S') : 0]], cur: null, end: false }; };
      const step = () => { if (st.end) return; st.q.sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1)); let u; do { u = st.q.shift(); } while (u && st.done.includes(u[0])); if (!u) { st.end = true; return; } u = u[0]; st.cur = u; st.done.push(u);
        if (u === 'G') { st.end = true; return; }
        for (const [v, w] of adj[u]) if (!st.done.includes(v) && (st.g[v] === undefined || st.g[u] + w < st.g[v])) { st.g[v] = st.g[u] + w; st.prev[v] = u; st.q = st.q.filter(x => x[0] !== v); st.q.push([v, st.g[v] + (astar ? H(v) : 0)]); } };
      el.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button type="button" class="chip on" data-a="d">Dijkstra</button><button type="button" class="chip" data-a="a">A* (andaaze ke saath)</button></div>
        <svg class="dj-svg" viewBox="0 0 340 222" style="width:100%;max-width:520px;display:block;margin:0 auto"></svg>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0"><button type="button" class="btn small primary dj-n">Next step</button><button type="button" class="btn small dj-all">Poora chalao</button><button type="button" class="btn small ghost dj-r">Reset</button></div>
        <div class="stats"><div class="stat"><span>Pakke (settled) chaurahe</span><strong class="dj-c"></strong></div><div class="stat"><span>Abhi nikala</span><strong class="dj-u"></strong></div><div class="stat"><span>S → G ka time</span><strong class="dj-t"></strong></div></div>
        <div class="calc-note dj-q" style="font-family:var(--f-mono);font-size:13px;white-space:pre-wrap"></div>`;
      const q = s => el.querySelector(s);
      const route = () => { const r = []; for (let u = 'G'; u; u = st.prev[u]) r.unshift(u); return r.join(' → '); };
      const draw = () => {
        const path = new Set(); if (st.end) for (let u = 'G'; st.prev[u]; u = st.prev[u]) path.add([u, st.prev[u]].sort().join());
        const inQ = new Set(st.q.map(x => x[0]));
        let s = ED.map(([a, b, w]) => { const on = path.has([a, b].sort().join()); const mx = (X(a) + X(b)) / 2, my = (Y(a) + Y(b)) / 2;
          return `<line x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}" stroke="${on ? 'var(--accent)' : 'var(--line-2)'}" stroke-width="${on ? 5 : 2}" stroke-linecap="round"/><rect x="${mx - 8}" y="${my - 8}" width="16" height="16" rx="4" fill="var(--surface)"/><text x="${mx}" y="${my + 4}" text-anchor="middle" font-size="11" font-family="var(--f-mono)" fill="var(--ink-2)">${w}</text>`; }).join('');
        s += Object.keys(P).map(v => { const dn = st.done.includes(v), fill = v === st.cur ? 'var(--accent)' : dn ? 'var(--green)' : inQ.has(v) ? 'var(--amber)' : 'var(--surface-2)';
          return `<circle cx="${X(v)}" cy="${Y(v)}" r="12" fill="${fill}" stroke="var(--ink-3)"/><text x="${X(v)}" y="${Y(v) + 4}" text-anchor="middle" font-size="12" font-weight="700" font-family="var(--f-mono)" fill="${dn || v === st.cur ? 'var(--bg)' : 'var(--ink)'}">${v}</text>`; }).join('');
        q('.dj-svg').innerHTML = s;
        q('.dj-c').textContent = st.done.length + ' / 9';
        q('.dj-u').textContent = st.cur ? st.cur + ' (g = ' + st.g[st.cur] + ')' : '-';
        q('.dj-t').textContent = st.end ? st.g.G + ' min' : '?';
        const qs = st.q.slice().sort((x, y) => x[1] - y[1] || (x[0] < y[0] ? -1 : 1)).map(x => astar ? `${x[0]}: g ${st.g[x[0]]} + h ${H(x[0])} = ${x[1]}` : `${x[0]}: ${x[1]}`).join('\n');
        q('.dj-q').textContent = (st.end ? `Ho gaya! Route ${route()}, ${st.g.G} min. ${astar ? 'A* ne P aur Q (ulti disha wale) ko kabhi pakka hi nahi kiya: 7 chaurahe.' : 'Dijkstra ne har chauraha pakka kiya, ulti disha wale P aur Q bhi: 9 chaurahe.'}\n` : '') + 'Rang: neela = abhi nikala, hara = pakka, peela = queue mein.\nQueue (chhota pehle):\n' + (qs || '(khaali)') + (astar ? '\nh = seedhi line ki doori, neeche round (kabhi zyada nahi bataata).' : '');
      };
      el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { astar = b.dataset.a === 'a'; el.querySelectorAll('[data-a]').forEach(x => x.classList.toggle('on', x === b)); reset(); draw(); }));
      q('.dj-n').onclick = () => { step(); draw(); };
      q('.dj-all').onclick = () => { while (!st.end) step(); draw(); };
      q('.dj-r').onclick = () => { reset(); draw(); };
      reset(); draw();
    }},
    { type: 'p', html: `Dekha? Dijkstra ne pehla step S ke baad B, phir <strong>P aur Q</strong> uthaaye, jo G ki ulti disha mein hain, kyunki wo "paas" the. A* ke liye P ka <code>f = 4 + 10 = 14</code> tha (paas hai, lekin G se door), to wo queue mein peeche hi pada raha. Dono ko same jawab mila: S → B → F → G, 13 min. Farq sirf mehnat ka: 9 vs 7 chaurahe. Asli shehar mein ye farq hazaaron guna ho jaata hai.` },
    { type: 'h3', text: 'Contraction hierarchies, simple shabdon mein' },
    { type: 'p', html: `Ye technique Karlsruhe (Germany) ke researchers Geisberger, Sanders, Schultes aur Delling ne 2008 ke paper mein di thi. Idea ye observation hai: lamba safar hamesha thodi der galiyon mein, phir bade roads/highways pe, aur end mein phir galiyon mein hota hai. Koi bhi Delhi-Jaipur route kisi beech ke gaon ki gali se nahi guzarta.` },
    { type: 'list', ordered: true, items: [
      '<strong>Importance order</strong>: har node ko ek "importance" rank do (gali ka chauraha kam important, highway junction zyada). Paper mein ye order heuristics se banta hai, jaise "is node ko hataane se kitne shortcuts banenge".',
      '<strong>Contract</strong>: sabse kam important node ko graph se "hatao". Agar uske do padosiyon ke beech ka sabse chhota raasta isi node se jaata tha, to un dono ke beech ek <strong>shortcut</strong> edge jod do (weight = dono edges ka sum). Agar koi aur utna hi achha raasta (witness) hai, to shortcut ki zaroorat nahi.',
      '<strong>Repeat</strong> jab tak saare nodes ek order mein contract na ho jaayein. Ye preprocessing offline, ek baar (ya map data badalne pe).',
      '<strong>Query</strong>: bidirectional search, lekin rule ke saath: forward search sirf <em>zyada important</em> nodes ki taraf jaata hai, backward bhi. Dono "upar" chadhte hain aur kisi important node pe milte hain. Bahut kam nodes explore hote hain.',
      '<strong>Unpack</strong>: answer mein shortcuts hain; har shortcut ko uske beech wale node se recursively khol do, asli sadak wala route mil jaata hai.',
    ]},
    { type: 'p', html: `Ek chhota example. Teen chauraahe ek line mein: <code>A —3 min— X —2 min— B</code>. X ek gali ka chhota chauraha hai (kam important). X ko "hatao" (contract): A se B ka sabse chhota raasta X se hi jaata tha, to ek shortcut <code>A —5 min— B</code> jod do, aur yaad rakho ki ye "X ke through" hai. Ab query A se B tak ek hi chhalaang mein pahunchti hai. Jab poora route dikhana ho, shortcut ko wapas "A → X → B" mein khol do.` },
    { type: 'ascii', text: `
 Pehle:      A ──3── X ──2── B          (X = gali ka chauraha, kam important)

 Contract X: A ─────── 5 ─────── B      shortcut, andar yaad: "via X"
                 (X graph mein hai, lekin query ab use chhoo-ti nahi)

 Query:      start → upar (important) → upar → milan ← upar ← upar ← destination` },
    { type: 'callout', tone: 'term', title: 'Naya word: Shortcut edge', html: `<strong>Ye kya hai:</strong> ek nakli edge jo do nodes ko seedha jodti hai, jiska weight beech ke asli raaste ke barabar hai. Ye ek "yaad rakha hua shortest path" hai.<br><strong>Kyun chahiye:</strong> query ko beech ke hazaaron chhote chauraahe ek ek karke nahi dekhne padte; bas kuch shortcuts pe kood ke pahunch jaati hai. Paper ke mutabik CH pichhli hierarchical techniques se ~5 guna tez queries deta tha, aur shortcuts jodne ke baad bhi uska data structure input graph se kam jagah leta tha.<br><strong>Iske bina:</strong> har query ko lambe route ke saare chauraahe explore karne padte (Dijkstra/A* jaisa), jo bade desh ke graph pe bahut slow hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Precomputation', html: `<strong>Ye kya hai:</strong> query aane se <em>pehle</em>, offline, ek baar mehenga kaam kar ke result rakh lena, taaki har query sasti ho jaaye. Jaise exam se pehle formula sheet bana lena.<br><strong>Kyun chahiye:</strong> road network roz roz nahi badalta, lekin route queries har second hazaaron aati hain. Ek baar ka kaam, crores queries mein fayda.<br><strong>Iske bina:</strong> har query khud poora kaam karti; CPU ka bill aur latency dono zyada.` },
    { type: 'p', html: `Khud chala ke dekho. Ye ek chhota sa road network hai: patli lines galiyan, moti lines highway (galiyon se kam se kam 2.5× tez). Har algorithm same route aur same time nikaalta hai; farq sirf ye hai ki kitne nodes check karne pade:` },

    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Trip</label><select class="gr-trip"><option value="0,53">Kone se kone tak (lamba)</option><option value="45,8">Neeche-left se upar-right</option><option value="18,35">Chhota trip</option></select></div>
          <div><label>Algorithm</label><div class="gr-alg" style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="chip on" data-a="d">Dijkstra</button><button type="button" class="chip" data-a="a">A*</button><button type="button" class="chip" data-a="c">CH</button></div></div>
        </div>
        <svg class="gr-svg" viewBox="0 0 340 220" style="width:100%;max-width:560px;display:block;margin:10px auto"></svg>
        <div class="stats">
          <div class="stat"><span>Nodes explore kiye</span><strong class="gr-x"></strong></div>
          <div class="stat"><span>Route ka time</span><strong class="gr-d"></strong></div>
          <div class="stat"><span>Teeno ka count (D / A* / CH)</span><strong class="gr-all"></strong></div>
        </div>
        <div class="calc-note gr-note"></div>`;
      const q = s => el.querySelector(s);
      // graph: 9x6 grid, seeded weights, row 3 and column 4 are highways
      const C = 9, R = 6, N = C * R, P = [], adj = Array.from({ length: N }, () => []), lines = [];
      let seed = 7; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) P.push([22 + c * 37, 22 + r * 35]);
      const hw = (a, b) => (Math.floor(a / C) === 3 && Math.floor(b / C) === 3) || (a % C === 4 && b % C === 4);
      const add = (a, b) => { const d = Math.hypot(P[a][0] - P[b][0], P[a][1] - P[b][1]); const w = Math.round(d * (hw(a, b) ? 0.4 : 1 + rnd() * 0.8)); adj[a].push([b, w]); adj[b].push([a, w]); lines.push([a, b, hw(a, b)]); };
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const i = r * C + c; if (c < C - 1 && (hw(i, i + 1) || rnd() > 0.12)) add(i, i + 1); if (r < R - 1 && (hw(i, i + C) || rnd() > 0.12)) add(i, i + C); }
      const push = (h, x) => { h.push(x); h.sort((a, b) => a[0] - b[0]); };
      const search = (s, t, hf) => { const dist = Array(N).fill(Infinity), prev = Array(N).fill(-1), done = Array(N).fill(false), order = []; dist[s] = 0; const h = [[0, s]];
        while (h.length) { const u = h.shift()[1]; if (done[u]) continue; done[u] = true; order.push(u); if (u === t) break;
          for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; push(h, [dist[v] + hf(v), v]); } }
        const path = []; for (let u = t; u !== -1; u = prev[u]) path.unshift(u); return { d: dist[t], path, explored: order }; };
      // CH preprocessing: contract least important node first, add shortcuts unless a witness path exists
      const E = Array.from({ length: N }, () => new Map()), rank = Array(N).fill(-1), cnb = Array(N).fill(0);
      adj.forEach((l, u) => l.forEach(([v, w]) => E[u].set(v, { w, mid: -1 })));
      const witness = (a, skip, b, lim) => { const dist = new Map([[a, 0]]), h = [[0, a]], seen = new Set();
        while (h.length) { const [d, u] = h.shift(); if (seen.has(u)) continue; seen.add(u); if (u === b) return d; if (d > lim) return Infinity;
          for (const [v, e] of E[u]) { if (v === skip || rank[v] >= 0) continue; const nd = d + e.w; if (nd < (dist.has(v) ? dist.get(v) : Infinity)) { dist.set(v, nd); push(h, [nd, v]); } } } return Infinity; };
      const needed = v => { const nb = [...E[v].entries()].filter(([u]) => rank[u] < 0), sc = [];
        for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) { const via = nb[i][1].w + nb[j][1].w; if (witness(nb[i][0], v, nb[j][0], via) > via) sc.push([nb[i][0], nb[j][0], via]); }
        return { sc, deg: nb.length }; };
      let shortcuts = 0;
      for (let k = 0; k < N; k++) { let best = -1, bp = Infinity;
        for (let v = 0; v < N; v++) if (rank[v] < 0) { const n2 = needed(v), p = n2.sc.length - n2.deg + cnb[v]; if (p < bp) { bp = p; best = v; } }
        for (const [a, b, w] of needed(best).sc) { const o = E[a].get(b); if (!o || w < o.w) { E[a].set(b, { w, mid: best }); E[b].set(a, { w, mid: best }); shortcuts++; } }
        rank[best] = k; for (const u of E[best].keys()) if (rank[u] < 0) cnb[u]++; }
      const up = src => { const dist = Array(N).fill(Infinity), prev = Array(N).fill(-1), done = Array(N).fill(false), order = []; dist[src] = 0; const h = [[0, src]];
        while (h.length) { const u = h.shift()[1]; if (done[u]) continue; done[u] = true; order.push(u);
          for (const [v, e] of E[u]) if (rank[v] > rank[u] && dist[u] + e.w < dist[v]) { dist[v] = dist[u] + e.w; prev[v] = u; push(h, [dist[v], v]); } }
        return { dist, prev, order }; };
      const unpack = (a, b) => { const e = E[a].get(b); if (e.mid < 0) return [a, b]; const l = unpack(a, e.mid); return l.concat(unpack(e.mid, b).slice(1)); };
      const chQuery = (s, t) => { const F = up(s), B = up(t); let best = Infinity, m = -1;
        for (let v = 0; v < N; v++) if (F.dist[v] + B.dist[v] < best) { best = F.dist[v] + B.dist[v]; m = v; }
        const co = []; for (let u = m; u !== -1; u = F.prev[u]) co.unshift(u); for (let u = B.prev[m]; u !== -1; u = B.prev[u]) co.push(u);
        let path = [co[0]]; for (let i = 0; i + 1 < co.length; i++) path = path.concat(unpack(co[i], co[i + 1]).slice(1));
        return { d: best, path, explored: [...new Set(F.order.concat(B.order))] }; };
      const run = (alg, s, t) => alg === 'd' ? search(s, t, () => 0) : alg === 'a' ? search(s, t, v => Math.hypot(P[v][0] - P[t][0], P[v][1] - P[t][1]) * 0.4) : chQuery(s, t);
      let alg = 'd';
      const draw = () => {
        const [s, t] = q('.gr-trip').value.split(',').map(Number), res = run(alg, s, t), ex = new Set(res.explored), on = new Set();
        for (let i = 0; i + 1 < res.path.length; i++) on.add(Math.min(res.path[i], res.path[i + 1]) + '-' + Math.max(res.path[i], res.path[i + 1]));
        let g = lines.map(([a, b, h]) => `<line x1="${P[a][0]}" y1="${P[a][1]}" x2="${P[b][0]}" y2="${P[b][1]}" stroke="${on.has(a + '-' + b) ? 'var(--accent)' : 'var(--line-2)'}" stroke-width="${on.has(a + '-' + b) ? 5 : h ? 4 : 1.5}" stroke-linecap="round"/>`).join('');
        g += P.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="${i === s || i === t ? 7 : 4.5}" fill="${i === s || i === t ? 'var(--ink)' : ex.has(i) ? 'var(--amber)' : 'var(--surface-2)'}" stroke="var(--ink-3)" stroke-width="1"/>`).join('');
        q('.gr-svg').innerHTML = g;
        const counts = ['d', 'a', 'c'].map(a => run(a, s, t).explored.length);
        q('.gr-x').textContent = res.explored.length + ' / ' + N;
        q('.gr-d').textContent = res.d + ' units';
        q('.gr-all').textContent = counts.join(' / ');
        q('.gr-note').textContent = alg === 'c' ? `CH: preprocessing mein ${shortcuts} shortcuts jode gaye (ek baar, offline). Query sirf "upar" (zyada important nodes) ki taraf chalti hai, isliye peeli dots bahut kam. Route aur time bilkul same.` : alg === 'a' ? 'A*: destination ki taraf jhuka hua search. Chhote trip pe bahut achha (yahan CH se bhi kam nodes), lekin lambe trip pe phir bhi kaafi nodes, kyunki andaaza (seedhi line, highway speed) galiyon ki asli speed se bahut optimistic hai.' : 'Dijkstra: har direction mein failta hai. Peeli dots = explore kiye nodes. Lambe trip pe lagbhag poora graph.';
      };
      el.querySelectorAll('.gr-alg .chip').forEach(b => b.addEventListener('click', () => { alg = b.dataset.a; el.querySelectorAll('.gr-alg .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
      q('.gr-trip').addEventListener('input', draw);
      draw();
    }},

    { type: 'p', html: `Widget mein lambe trip pe Dijkstra ~49 nodes, A* ~43, aur CH sirf ~15 explore karta hai. Asli road network mein ye farq bahut bada ho jaata hai: graph jitna bada, CH ka faayda utna zyada, kyunki "upar chadhne" wale important nodes kam hi hote hain. Chhote trip pe A* bhi kaafi achha hai.` },
    { type: 'callout', tone: 'warn', title: 'Twist: traffic badla to shortcuts galat?', html: `CH ke shortcuts edge weights pe based hain. Agar live traffic se weights har kuch minute badlein, to pura preprocessing dobara? Wo bahut mehenga hai. Research aur open-source routing engines ka jawab: preprocessing ko do hisson mein todo. (1) Graph ka <em>structure</em> (kaunse nodes important, region boundaries) ek baar, mehenga, offline. (2) Naye weights daal ke shortcuts ke weights jaldi update karna ("customization"), seconds mein. Customizable Contraction Hierarchies aur partition-based techniques isi idea pe chalte hain. Google ne apna exact routing algorithm publish nahi kiya hai; ye industry/research ka standard tareeka hai.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "fastest route = shortest distance"', html: `Nahi. Edge weight = <em>time</em>, distance nahi, aur time traffic, speed limit, turns, signals se badalta hai. Aur "best" route sirf fastest bhi nahi hota: Google ke 2020 Maps blog ke mutabik route chunte waqt road quality (pakki/kachi), sadak ka size, seedhapan, tolls aur sarkari data (speed limits, restrictions) bhi dekhe jaate hain. Google Research ne 2023 mein bataya ki unhone asli drivers ke chune routes se seekh ke (inverse reinforcement learning) apne suggested routes ka "asli route se match" 16-24% relative behtar kiya.` },

    { type: 'h2', text: 'Deep dive 2: live traffic kahan se aata hai?' },
    { type: 'p', html: `Problem: routing ko har sadak ki <em>abhi ki</em> speed chahiye. Har sadak pe sensor lagana impossible hai. Google ne August 2009 ke official blog mein apna tareeka bataya: jin users ne phone pe location (My Location) on ki hai, unka phone <strong>anonymous</strong> speed aur location ke chhote tukde bhejta hai. Ek sadak pe chal rahe bahut saare phones ki speed milao, to us sadak ki live speed mil jaati hai. Google ke 2020 "Google Maps 101" post ke mutabik ye aggregate location data 220 se zyada countries aur territories se aata hai.` },
    { type: 'p', html: `Usi 2009 post ne do mushkilein bhi batayi: <strong>scale</strong> (kaafi saare phones ke bina data bekaar) aur <strong>privacy</strong>. Privacy ke liye unhone likha ki ek area ke bahut saare logon ka data milaya jaata hai taaki ek phone ko alag na pehchana ja sake, aur har trip ke <strong>start aur end points permanently delete</strong> kiye jaate hain, taaki koi ye na jaan sake ki gaadi kahan se chali aur kahan ruki.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Map matching', html: `<strong>Ye kya hai:</strong> GPS point ko sahi <strong>road segment</strong> (do chauraahon ke beech ki sadak ka tukda) pe "chipkana". GPS thoda idhar udhar hota hai (10-20 m galti normal hai): flyover ke upar ya neeche? service lane ya main road? Lagatar kai points aur direction dekh ke sabse sambhav sadak chuni jaati hai.<br><strong>Kyun chahiye:</strong> speed kisi sadak ki honi chahiye, hawa mein kisi point ki nahi.<br><strong>Iske bina:</strong> flyover pe 60 km/h chal rahi gaadi ki speed neeche wali jam sadak pe likh di jaayegi, aur dono sadkon ka traffic galat dikhega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Aggregation (median)', html: `<strong>Ye kya hai:</strong> bahut saare phones ki speeds ko mila ke ek number banana. <strong>Median</strong> = sab speeds ko chhote se bade line mein lagao, beech wali lo. Ek aadmi chai ke liye ruka (0 km/h) to median pe farak nahi padta, average pe padta.<br><strong>Kyun chahiye:</strong> ek sadak ki ek "abhi ki speed" chahiye, aur privacy ke liye kisi ek phone ka data bahar nahi jaana chahiye.<br><strong>Iske bina:</strong> ek-do ajeeb phones poori sadak ka traffic galat dikha dete, aur kisi ek insaan ki movement pehchani ja sakti.` },

    { type: 'p', html: `Pipeline ka shape neeche hai. Google ne ye boxes is form mein publish nahi kiye; ye streaming systems ka general industry design hai jo 2009 post ki baaton (anonymous speeds, aggregation, trip ends delete) ko implement karta hai. Queue ke liye <a href="#/kafka">Kafka</a> aur windowing ke liye <a href="#/big-data">big data lesson</a> dekho.` },
    { type: 'flow', title: 'Live traffic pipeline (general design)', height: 330,
      nodes: [
        { id: 'ph', label: 'Phones', sub: 'location on', x: 75, y: 85, w: 120, kind: 'client', info: 'Ye kya hai: logon ke phones, traffic data ka source. Sirf wahi phones jinhone location sharing on ki hai. Har kuch second ke points batch karke bhejte hain (battery aur data bachane ke liye), anonymous IDs ke saath.' },
        { id: 'in', label: 'Ingest', sub: 'queue / log', x: 235, y: 85, w: 120, kind: 'queue', info: 'Ye kya hai: aane wale points ki ek line (queue/log). Crores phones ke points ka firehose. Ek durable queue/log (Kafka jaisa) beech mein taaki processing slow ho to data khoye nahi, bas backlog bane.' },
        { id: 'mm', label: 'Map matching', sub: 'point → segment', x: 400, y: 85, w: 140, kind: 'server', info: 'Ye kya hai: wo service jo GPS points ko sahi road segment pe chipkata hai aur har segment pe speed nikaalta hai. Yahin privacy steps: trip ke shuru aur aakhri hisse hata do.' },
        { id: 'ag', label: 'Aggregator', sub: 'per segment, 1 min', x: 590, y: 85, w: 150, kind: 'server', info: 'Ye kya hai: bahut saare phones ki speed ko ek number mein milane wali service. Har segment ke liye chhote time window (maan lo 1 minute) mein saare phones ki speeds milata hai: median jaisa robust average, aur minimum kitne phones chahiye. Kam phones = data bharosemand nahi (aur privacy ke liye bhi kam data publish nahi karte).' },
        { id: 'hs', label: 'Historical', sub: 'speed patterns', x: 120, y: 245, w: 150, kind: 'data', info: 'Ye kya hai: purane data se bana "normal" speed ka record. Har segment ka "aam taur pe" pattern: Monday 9 baje kitni speed, Sunday 9 baje kitni. Google ke 2020 post ke mutabik ETA isi historical database ko live data ke saath milata hai.' },
        { id: 'rt', label: 'Routing + ETA', sub: 'edge weights', x: 370, y: 245, w: 150, kind: 'server', info: 'Ye kya hai: raasta aur pahunchne ka time nikaalne wala hissa. Routing engine aur ETA model. Edge weights live speeds se, jahan live data nahi ya purana hai wahan historical se.' },
        { id: 'sp', label: 'Live speeds', sub: 'segment → km/h', x: 590, y: 245, w: 150, kind: 'data', info: 'Ye kya hai: har segment ki abhi ki speed ka store. Har segment ki latest aggregated speed aur uska timestamp. Routing yahan se padhta hai, aur traffic overlay tiles bhi isi se bante hain.' },
      ],
      edges: [{ a: 'ph', b: 'in' }, { a: 'in', b: 'mm' }, { a: 'mm', b: 'ag' }, { a: 'ag', b: 'sp' }, { a: 'sp', b: 'rt' }, { a: 'hs', b: 'rt' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Phones points bhejte hain', text: 'Ring Road pe hazaaron phones, har ek apne points batch mein bhej raha hai.', flood: { paths: ['evt:ph>in'], n: 8 }, msg: '[{ t, lat, lng, speed: 18 km/h }, ...]' },
          { title: 'Segment pe chipkao', text: 'Map matching ne points ko "Ring Road, Dhaula Kuan → AIIMS, eastbound" segment pe rakha aur har phone ki speed nikaali.', go: 'evt:in>mm>ag' },
          { title: 'Milake ek number', text: 'Is minute mein is segment pe 140 phones, median speed 17 km/h. Akele kisi ek phone ka data bahar nahi jaata, sirf aggregate.', go: 'evt:ag>sp', after: { sp: { state: 'hot', sub: 'Ring Rd: 17 km/h' } } },
          { title: 'Routing use karta hai', text: 'Agla route request is segment ko slow maanega aur shayad doosra raasta chunega.', go: ['rt>sp', 'res:sp>rt'] },
        ]},
        { name: 'Privacy: trip ends', steps: [
          { title: 'Ghar se trip shuru', text: 'Ek phone ka trip ek ghar ke bahar shuru hua aur office pe khatam.', go: 'evt:ph>in>mm' },
          { title: 'Shuru aur ant mita do', text: 'Google ke 2009 post ke mutabik trip ke start aur end points permanently delete hote hain. Beech ki speeds hi aage jaati hain, aur wo bhi doosre phones ke saath mila ke.', set: { mm: { state: 'ok', sub: 'ends trimmed' } }, go: 'evt:mm>ag' },
        ]},
        { name: 'Sunsaan sadak', steps: [
          { title: 'Raat 3 baje gaon ki sadak', text: 'Is segment pe pichhle 10 minute mein sirf ek phone. Ek phone ka data bharosemand nahi (shayad wo chai ke liye ruka ho), aur privacy ke liye bhi publish nahi karna.', go: 'evt:ph>in>mm>ag', after: { ag: { state: 'warn', sub: 'too few phones' } } },
          { title: 'Historical pe fallback', text: 'Routing is segment ke liye historical pattern use karta hai: "raat 3 baje yahan aam taur pe 50 km/h".', go: ['rt>hs', 'res:hs>rt'] },
        ]},
        { name: 'Failure: pipeline lag', steps: [
          { title: 'Map matching slow', text: 'Ek bug ya traffic spike (shaam ka rush) se map matching peeche reh gaya. Queue mein backlog ban raha hai, data khoya nahi.', set: { mm: { state: 'hot', sub: 'overloaded' } }, flood: { paths: ['evt:ph>in'], n: 8 }, after: { in: { state: 'warn', sub: 'backlog 8 min' } } },
          { title: 'Speeds purani', text: 'Live speeds ka timestamp purana. Routing ek age limit ke baad live speed ko kam weight deta hai aur historical ki taraf jhukta hai. Galat-fresh data se purana-honest data behtar.', set: { sp: { state: 'warn', sub: '8 min purana' } }, go: ['rt>hs', 'res:hs>rt'] },
          { title: 'Scale out, catch up', text: 'Aur map matching workers lagao (queue partitions ke hisaab se), backlog khatam. Monitoring alert "data age > X min" pe hona chahiye, sirf errors pe nahi.', set: { mm: { state: 'ok', sub: 'scaled out' } }, go: 'evt:in>mm>ag>sp', after: { in: { state: '', sub: 'queue / log' }, sp: { state: '', sub: 'segment → km/h' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 3: ETA, sirf "abhi ki speed" kaafi kyun nahi' },
    { type: 'p', html: `Seedha tareeka: route ke har segment ki abhi ki speed lo, time jodo, ho gaya ETA. Problem: tum us segment pe <em>abhi</em> nahi, 25 minute baad pahunchoge, aur tab tak wahan rush hour shuru ho chuka hoga. DeepMind ke 2020 blog ne bhi yahi kaha: live traffic ye nahi batata ki 10, 20 ya 50 minute baad sadak kaisi hogi. Neeche khud dekho (speeds ek made-up "historical pattern" se hain):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Ghar se nikalne ka time: <strong class="et-tv"></strong></label><input class="et-t" type="range" min="0" max="16" value="6">
        <div class="et-bars" style="display:grid;gap:6px;margin:10px 0"></div>
        <div class="stats">
          <div class="stat"><span>"Abhi ki speed" se ETA</span><strong class="et-a"></strong></div>
          <div class="stat"><span>Time-aware ETA (asli)</span><strong class="et-b"></strong></div>
          <div class="stat"><span>Galti</span><strong class="et-e"></strong></div>
        </div>
        <div class="calc-note et-note"></div>`;
      const q = s => el.querySelector(s);
      // 4 segments of 10 km. speed(t) = free - drop * triangle around rush centre (minutes after 7:00)
      const S = [{ n: 'Expressway', f: 70, d: 42, c: 120, w: 75 }, { n: 'Flyover', f: 50, d: 30, c: 135, w: 75 }, { n: 'Ring Road', f: 45, d: 27, c: 150, w: 75 }, { n: 'City centre', f: 35, d: 20, c: 160, w: 75 }];
      const sp = (s, t) => s.f - s.d * Math.max(0, 1 - Math.abs(t - s.c) / s.w);
      const hm = m => { const t = 7 * 60 + Math.round(m); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
      const upd = () => {
        const t0 = Number(q('.et-t').value) * 15; let naive = 0, t = t0, rows = '';
        S.forEach(s => { naive += 10 / sp(s, t0) * 60; const v = sp(s, t); rows += `<div style="display:flex;gap:8px;align-items:center;font-size:13px"><span style="flex:0 0 92px">${s.n}</span><div style="flex:1;background:var(--surface-2);border-radius:4px;height:14px"><div style="width:${(v / 70 * 100).toFixed(0)}%;height:100%;border-radius:4px;background:${v < s.f * 0.6 ? 'var(--red)' : v < s.f * 0.85 ? 'var(--amber)' : 'var(--green)'}"></div></div><span style="flex:0 0 120px;font-family:var(--f-mono)">${hm(t)} pe ${v.toFixed(0)} km/h</span></div>`; t += 10 / v * 60; });
        const real = t - t0, err = real - naive;
        q('.et-tv').textContent = hm(t0); q('.et-bars').innerHTML = rows;
        q('.et-a').textContent = naive.toFixed(0) + ' min'; q('.et-b').textContent = real.toFixed(0) + ' min';
        q('.et-e').textContent = (err >= 0 ? '+' : '') + err.toFixed(0) + ' min';
        q('.et-note').textContent = Math.abs(err) < 3 ? 'Yahan dono lagbhag same: traffic abhi aur aage ek jaisa hai.' : err > 0 ? `"Abhi ki speed" ne ${err.toFixed(0)} min kam bataya: tum har segment pe tab pahunchoge jab wahan rush shuru ho chuka hoga.` : `Ulta case: abhi jam hai lekin tumhare pahunchne tak khul jaayega, to naive ETA ${(-err).toFixed(0)} min zyada bata raha hai.`;
      };
      q('.et-t').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Slider ko 8:15-8:45 pe rakho to naive ETA kaafi kam batata hai (rush aane wala hai), aur 9:15 ke baad zyada (jam khul raha hai). 7 baje ya 11 baje dono same, kyunki tab traffic badal hi nahi raha. Asli ETA ko <em>future</em> traffic predict karna padta hai. Isi ke liye ML.` },
    { type: 'h3', text: 'Google + DeepMind: graph neural network se ETA (2020)' },
    { type: 'list', items: [
      '<strong>Historical + live</strong>: Google Maps ke September 2020 blog ("Google Maps 101") ke mutabik ETA historical traffic patterns ke database ko live conditions ke saath ML se milata hai, aur unka daava tha ki >97% trips pe ETA accurate rehta hai.',
      '<strong>Supersegments</strong>: DeepMind ke September 2020 blog ke mutabik road network ko "supersegments" mein baanta gaya: paas paas ke segments ke groups jinpe kaafi traffic hota hai. Har supersegment ek chhota graph hai.',
      '<strong>Graph Neural Network (GNN)</strong>: har segment ek node, jude hue/milte hue segments ke beech edges. Model neighbours ke beech "messages" pass karke seekhta hai ki ek side road ka jam main road pe kaise asar daalta hai. Sirf ek line ke segments nahi, poora local network dekhta hai.',
      '<strong>Training ki mushkilein</strong>: graphs ka size 2 nodes se 100+ tak badalta tha, training unstable thi. DeepMind ne MetaGradients (model khud apna learning rate schedule seekhe) aur kai loss functions ka combination use kiya.',
      '<strong>Result</strong>: kuch shehron mein galat ETA wale cases 50% tak kam (Taichung ~51%, Sydney ~43%); 2021 ke CIKM paper ("ETA Prediction with Graph Neural Networks in Google Maps") ke mutabik ye model production mein deploy hua.',
      '<strong>System mein jagah</strong>: routing engine candidate routes deta hai, GNN unka travel time predict karke unhe rank karta hai. Yaani ML routing ko replace nahi karta, uske upar baithta hai.',
      '<strong>Duniya badli, model bhi</strong>: 2020 ke blog ke mutabik COVID lockdowns mein duniya bhar mein traffic 50% tak gira. Google ne models update kiye taaki pichhle 2-4 hafton ke patterns ko zyada weight mile, usse purane ko kam.',
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Graph Neural Network (GNN)', html: `<strong>Ye kya hai:</strong> ek neural network (data se patterns seekhne wala program) jo graph ke upar kaam karta hai. Har node ka ek chhota "state" hota hai, aur har round mein node apne padosiyon se information leta hai, jaise class mein bachche apne bagal walon se khabar lete hain. Kuch rounds ke baad har node ko aas paas ke poore area ka andaaza ho jaata hai.<br><strong>Kyun chahiye:</strong> ek side road ka jam main road ko 10 minute baad kaise rokega, ye sirf us ek sadak ko dekh ke pata nahi chalta. Road network khud ek graph hai, isliye ye fit natural hai.<br><strong>Iske bina:</strong> model har sadak ko akela dekhta, aur padosi sadkon se aane wala jam miss karta.` },

    { type: 'h2', text: 'Places, geocoding aur navigation' },
    { type: 'p', html: `<strong>Places search</strong> do indexes ka combination hai: ek <a href="#/search">text index</a> (naam, category, typo-tolerant: "indai gate" bhi chale) aur ek <a href="#/ds-for-scale">geo index</a> (S2/geohash cells, taaki "petrol pump" ka matlab "mere paas wala" ho). Ranking mein text match, doori aur popularity teeno. <strong>Geocoding</strong> address ke tukde (gali, area, shehar, PIN) parse karke known addresses se match karta hai; India jaise desh mein jahan addresses unstructured hain ("XYZ mandir ke peeche"), ye kaafi mushkil problem hai. Google Maps Platform ke docs geocoding (address → coordinates/place ID) aur reverse geocoding (coordinates → address) ko alag APIs ki tarah dete hain.` },
    { type: 'p', html: `<strong>Navigation</strong> mostly phone pe chalta hai: route (polyline + steps) ek baar download, phir GPS se position track, "200 m mein left" phone khud bolta hai. Server do waqt kaam aata hai: (1) <strong>deviation</strong>: tum route se hat gaye (galat turn), phone naya route maangta hai; (2) <strong>naya traffic</strong>: aage jam, behtar route mila to app suggest karta hai. Aur jab signal hi na ho? Uske liye offline maps, neeche.` },
    { type: 'h2', text: 'Offline maps: internet gaya, map nahi' },
    { type: 'p', html: `Pahaadon ki trip, ya metro ke neeche. Signal nahi hai, lekin map aur raasta chahiye. Iske liye user pehle se ek area <strong>download</strong> kar leta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Offline map (downloaded area)', html: `<strong>Ye kya hai:</strong> ek chuna hua area (jaise poora Delhi ya Manali) jiska map data phone ki storage mein pehle se save hai, taaki internet ke bina bhi map dikhe aur raasta mile.<br><strong>Kyun chahiye:</strong> signal hamesha nahi hota, aur roaming mein data mehenga hota hai.<br><strong>Iske bina:</strong> tunnel ya gaon mein map khaali grey squares, aur navigation band.` },
    { type: 'p', html: `Google ki official help page ke mutabik (2026 mein dekhi): download kiye area mein app normal ki tarah chalta hai, aur driving directions milti hain <em>agar poora route downloaded area ke andar ho</em>. Offline mein transit, cycling aur walking directions nahi milti, aur drive karte waqt traffic info aur alternate routes bhi nahi. Iska matlab: routing phone pe hi chal raha hai, to us area ka road graph bhi phone mein hona chahiye, sirf tiles nahi. Aur live traffic server se aata hai, isliye offline mein wo gaayab.` },
    { type: 'steps', items: [
      { t: 'Kya download hota hai', d: 'Us area ke vector tiles (map dikhane ke liye), aur routing ke liye us area ka road data. Google exact format publish nahi karta; ye general approach hai jo help page ke features (offline driving directions) se match karta hai.' },
      { t: 'Vector tiles kyun zaroori', d: 'Google ke 2010 blog ke mutabik vector tiles ne saare zoom levels ke liye 100 guna se bhi kam data liya, aur isi se bade areas ka offline caching possible hua. Raster mein har zoom ke alag images rakhne padte.' },
      { t: 'Expiry aur update', d: 'Help page ke mutabik offline maps ko expire hone se pehle update karna padta hai. Expiry 15 din ya kam bachi ho aur phone Wi-Fi pe ho, to app khud update karne ki koshish karta hai; "Auto-update" setting bhi hai. Wajah: dukaanein band hoti hain, nayi sadkein banti hain.' },
      { t: 'Storage', d: 'Android pe offline maps phone ki internal storage ya SD card pe rakhe ja sakte hain (help page).' },
    ]},
    { type: 'p', html: `Raster vs vector ka farq offline mein sabse zyada dikhta hai. Neeche ek square area chuno. Tile counting asli tile maths se hai; tile ka size sirf "maan lo" (raster ~15 KB, vector ~40 KB). Open-source vector tile sets aksar zoom 14 tak hi data rakhte hain aur usse aage wahi data bada karke draw karte hain (overzoom); raster ko gali dikhane ke liye zoom 17 tak ke images chahiye:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Area ki ek side: <strong class="of-sv"></strong></label><input class="of-s" type="range" min="5" max="200" step="5" value="40"></div>
          <div><label>Kahan</label><select class="of-l"><option value="28.6">Delhi (28.6° N)</option><option value="32.2">Manali (32.2° N)</option><option value="8.5">Thiruvananthapuram (8.5° N)</option></select></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Raster tiles (zoom 0-17)</span><strong class="of-rt"></strong></div>
          <div class="stat"><span>Raster size (~15 KB/tile)</span><strong class="of-rs"></strong></div>
          <div class="stat"><span>Vector tiles (zoom 0-14)</span><strong class="of-vt"></strong></div>
          <div class="stat"><span>Vector size (~40 KB/tile)</span><strong class="of-vs"></strong></div>
        </div>
        <div class="calc-note of-n"></div>`;
      const q = s => el.querySelector(s);
      const tw = (z, lat) => 40075 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z);
      const cnt = (s, lat, z1) => { let n = 0; for (let z = 0; z <= z1; z++) { const k = Math.ceil(s / tw(z, lat)); n += k * k; } return n; };
      const mb = kb => kb >= 1e6 ? (kb / 1e6).toFixed(1) + ' GB' : (kb / 1e3).toFixed(kb < 1e4 ? 1 : 0) + ' MB';
      const upd = () => {
        const s = Number(q('.of-s').value), lat = Number(q('.of-l').value), r = cnt(s, lat, 17), v = cnt(s, lat, 14);
        q('.of-sv').textContent = s + ' km';
        q('.of-rt').textContent = r.toLocaleString('en-IN'); q('.of-rs').textContent = mb(r * 15);
        q('.of-vt').textContent = v.toLocaleString('en-IN'); q('.of-vs').textContent = mb(v * 40);
        q('.of-n').textContent = `${s} × ${s} km ke liye vector data raster se ~${Math.round(r * 15 / (v * 40))} guna chhota. Wajah: raster ko har zoom level ke alag images chahiye (har zoom pe tiles 4 guna), jabki vector tile ek baar aa ke kai zoom levels pe kaam aata hai.`;
      };
      el.querySelectorAll('input,select').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Default (Delhi, 40 km) pe raster ko ~30,000 tiles (~451 MB) chahiye aur vector ko ~509 tiles (~20 MB). Ye numbers maan lo wale tile sizes pe hain, lekin farak ka <em>shape</em> asli hai: raster ka bojh har extra zoom level ke saath 4 guna badhta hai.` },

    { type: 'h2', text: 'Failures aur bottlenecks' },
    { type: 'table', head: ['Kya hua', 'Asar', 'Bachaav'], rows: [
      ['Naya map data (nayi sadak) aaya', 'Tiles aur routing graph dono purane', 'Sirf affected tiles dobara banao + CDN purge; routing graph ka naya version banake dheere dheere servers pe swap (blue/green)'],
      ['Ek region ka routing server down', 'Us region ke routes fail', 'Har region ke kai replicas LB ke peeche; graph read-only hai to replicas aasaan'],
      ['Traffic pipeline lag', 'Live speeds purani', 'Data age monitor karo; age limit ke baad historical pe fallback'],
      ['Kam phones (raat, gaon)', 'Live speed noisy', 'Minimum samples rule, historical fallback'],
      ['Badi festival/match ke baad bheed', 'Historical pattern galat', 'Live data ko zyada weight; COVID jaisi lambi change mein recent hafton ko zyada weight (Google 2020)'],
      ['Viral area (sab ek jagah zoom kar rahe)', 'Tile hot spots', 'CDN isi ke liye hai: same z/x/y sabke liye, cache hit'],
      ['Route query storm (office time)', 'Routing CPU', 'Precomputation (CH) se har query sasti; horizontal scale; popular origin-destination pairs ka short-TTL cache'],
      ['Offline map purana ho gaya', 'Band dukaan dikhe, nayi sadak na dikhe', 'Download pe expiry; Wi-Fi pe auto-update jab 15 din ya kam bache (Google help page)'],
    ]},

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Teen sub-problems alag karo', d: '"Map rendering, routing, aur traffic/ETA: teeno ka nature alag hai, teeno ka design alag."' },
      { t: 'Tiles', d: 'Tile pyramid (4^z), z/x/y address, CDN, raster vs vector; storage bada lekin har request chhoti aur cacheable.' },
      { t: 'Routing', d: 'Graph in memory, region-wise; Dijkstra → A* → bidirectional → contraction hierarchies (offline shortcuts, upward query). Live weights ke liye customizable preprocessing.' },
      { t: 'Traffic', d: 'Anonymous phone speeds → queue → map matching → per-segment aggregation (min samples, trip ends hatao) → live speeds store. Fallback: historical.' },
      { t: 'ETA', d: 'Historical + live + ML jo future traffic predict kare; Google/DeepMind ka GNN routing ke candidates ko rank karta hai.' },
      { t: 'Offline', d: 'Area download: vector tiles + routing data phone pe; driving directions offline sirf jab poora route andar ho; expiry se pehle update.' },
      { t: 'Failures', d: 'Stale data detection, graceful degradation, CDN stale serve, privacy.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Static, sabke liye same, bahut zyada reads</strong> (tiles) → pehle se kaato, address fixed rakho, CDN. <strong>Mehenga computation, input baar baar same structure pe</strong> (routing) → offline precompute (CH), query ko sasta banao. <strong>Tezi se badalta data</strong> (traffic) → streaming pipeline + freshness monitoring + historical fallback. <strong>Future ka andaaza</strong> (ETA) → ML on historical + live, aur hamesha ek simple fallback.` },

    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 530,
      caption: 'Teen alag duniya: upar tiles (static, CDN ka khel), beech mein routing aur ETA (graph + precomputation + ML), neeche live traffic (streaming). Sab ki shuruaat aur ant tumhara phone hai. Buttons se ek-ek raasta dekho.',
      groups: [
        { label: 'Map dikhana (tiles)', x: 148, y: 58, w: 568, h: 92 },
        { label: 'Search, routing aur ETA', x: 148, y: 178, w: 432, h: 214 },
        { label: 'Live traffic pipeline', x: 148, y: 418, w: 568, h: 92 },
      ],
      nodes: [
        { id: 'app', label: 'Maps app', sub: 'phone / browser', x: 75, y: 290, w: 120, kind: 'client', info: 'Ye kya hai: user ke phone ki app. Tiles laake khud draw karti hai (vector), jagah aur route maangti hai, navigation chalati hai, aur location on ho to anonymous speed points bhejti hai. Offline area bhi isi mein download hota hai.' },
        { id: 'cdn', label: 'CDN', sub: 'tiles cache', x: 215, y: 110, w: 120, kind: 'edge', info: 'Ye kya hai: shehron ke paas ke cache servers. z/x/y address fixed aur sabke liye same, isliye zyada tar tile requests yahin khatam. Origin gire to purana tile bhi de sakta hai (stale-if-error).' },
        { id: 'tiles', label: 'Tile store', sub: 'z/x/y files', x: 360, y: 110, w: 120, kind: 'data', info: 'Ye kya hai: saare bane tiles ka ghar (object storage). Kam zoom aur popular areas pehle se, rare deep-zoom tiles maange jaane pe. General approach; Google ka exact tareeka public nahi.' },
        { id: 'builder', label: 'Tile builder', sub: 'render / cut', x: 505, y: 110, w: 120, kind: 'server', info: 'Ye kya hai: map data se tiles banane wala kaam. Nayi sadak aayi to sirf affected tiles dobara. Traffic overlay tiles live speeds se baar baar banti hain, chhote TTL ke saath.' },
        { id: 'mapdata', label: 'Map data', sub: 'roads, places', x: 650, y: 110, w: 120, kind: 'data', info: 'Ye kya hai: duniya ki sadkon, buildings aur jagahon ka asli data (source of truth). Yahin se tiles, routing graph aur places index bante hain. Google ke 2020 post ke mutabik route chunne mein sarkari data (speed limits, restrictions) bhi jud-ta hai.' },
        { id: 'places', label: 'Places', sub: 'geocode, search', x: 215, y: 230, w: 120, kind: 'server', info: 'Ye kya hai: "India Gate" ya address ko lat/lng mein badalne wali service (geocoding), aur ulta bhi. Andar text index (typo bhi chale) + geo index (paas wala pehle).' },
        { id: 'pre', label: 'CH preprocess', sub: 'shortcuts', x: 505, y: 230, w: 120, kind: 'server', info: 'Ye kya hai: offline kaam jo road graph mein nodes ko importance ke hisaab se contract karke shortcuts jodta hai (contraction hierarchies, 2008 paper). Live weights ke liye structure ek baar, weights jaldi (customization). General industry approach; Google ka exact algorithm public nahi.' },
        { id: 'route', label: 'Routing', sub: 'graph in memory', x: 215, y: 350, w: 120, kind: 'server', info: 'Ye kya hai: raasta nikaalne wali service. Region-wise road graph memory mein, precomputed shortcuts ke saath upward search, aur kuch candidate routes nikaalti hai.' },
        { id: 'eta', label: 'ETA model', sub: 'GNN (2020)', x: 360, y: 350, w: 120, kind: 'server', info: 'Ye kya hai: travel time predict karne wala ML model. DeepMind ke 2020 blog ke mutabik graph neural network supersegments pe chalta hai aur routing ke candidate routes ko rank karta hai.' },
        { id: 'speeds', label: 'Live speeds', sub: 'segment → km/h', x: 505, y: 350, w: 120, kind: 'data', info: 'Ye kya hai: har road segment ki abhi ki aggregated speed aur uska timestamp. Routing ke edge weights aur traffic overlay dono isi se. Purani ho jaaye to routing historical pe jhukta hai.' },
        { id: 'ingest', label: 'Ingest', sub: 'queue / log', x: 215, y: 470, w: 120, kind: 'queue', info: 'Ye kya hai: crores phones ke speed points ki durable line (Kafka jaisi). Processing slow ho to data khota nahi, backlog banta hai.' },
        { id: 'mm', label: 'Map matching', sub: 'point → segment', x: 360, y: 470, w: 120, kind: 'server', info: 'Ye kya hai: GPS point ko sahi sadak ke tukde pe chipkane wali service. Privacy: trip ke shuru aur aakhri points yahin hata diye jaate hain (Google 2009).' },
        { id: 'agg', label: 'Aggregator', sub: 'median, 1 min', x: 505, y: 470, w: 120, kind: 'server', info: 'Ye kya hai: ek segment pe chal rahe bahut phones ki speeds ko ek number (median) banane wali service. Kam phones hon to publish nahi: bharosa aur privacy dono ke liye.' },
        { id: 'hist', label: 'Historical', sub: 'speed patterns', x: 650, y: 470, w: 120, kind: 'data', info: 'Ye kya hai: har segment ka "aam taur pe" pattern (Monday 9 baje kitni speed). ETA isse live data ke saath milata hai (Google 2020), aur live data na ho to fallback yahi.' },
      ],
      edges: [
        { a: 'app', b: 'cdn' }, { a: 'cdn', b: 'tiles' }, { a: 'tiles', b: 'builder', kind: 'res' }, { a: 'builder', b: 'mapdata' },
        { a: 'mapdata', b: 'pre' }, { a: 'pre', b: 'route', label: 'CH graph' },
        { a: 'app', b: 'places' }, { a: 'app', b: 'route' }, { a: 'route', b: 'eta' },
        { a: 'route', b: 'speeds', label: 'edge weights', via: [[287, 410], [433, 410]] },
        { a: 'eta', b: 'hist' }, { a: 'eta', b: 'speeds' },
        { a: 'app', b: 'ingest', kind: 'evt', via: [[75, 470]] }, { a: 'ingest', b: 'mm', kind: 'evt' }, { a: 'mm', b: 'agg', kind: 'evt' }, { a: 'agg', b: 'speeds', kind: 'evt' },
        { a: 'speeds', b: 'builder', dashed: true, via: [[580, 290], [580, 170]] },
      ],
      paths: [
        { name: 'Load map', text: 'App screen ke ~10-20 tiles maangta hai → CDN (zyada tar HIT) → miss pe tile store → jo tile bana hi nahi, use builder map data se banata hai.', go: ['app>cdn>tiles>builder>mapdata'] },
        { name: 'Search place', text: '"India Gate" → places service (text + geo index) → lat/lng aur place ID wapas.', go: ['app>places'] },
        { name: 'Get route', text: 'Routing precomputed CH graph pe upward search se candidates nikaalta hai, edge weights live speeds se; ETA model (live + historical) har candidate ka time predict karke rank karta hai.', go: ['app>route>eta', 'route>speeds', 'pre>route', 'eta>hist', 'eta>speeds'] },
        { name: 'Live traffic', text: 'Phones ke anonymous points → ingest → map matching (trip ends hatao) → har segment ka median → live speeds → routing aur traffic overlay tiles.', go: ['app>ingest>mm>agg>speeds', 'speeds>builder', 'speeds>route'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Google Maps teen alag problems hai: map dikhana (static, CDN), raasta nikaalna (graph + precomputation), traffic aur ETA (streaming + ML).</li>
      <li>Tile pyramid: zoom z pe 4<sup>z</sup> tiles, address z/x/y; same address = same bytes, isliye CDN cache. Screen ko sirf ~10-20 tiles chahiye.</li>
      <li>Vector tiles: shapes ka data, phone khud draw karta hai; kam data, smooth zoom, offline possible.</li>
      <li>Dijkstra har taraf failta hai; A* andaaze (heuristic) se destination ki taraf jhukta hai; dono ka jawab same.</li>
      <li>Contraction hierarchies: offline kam important nodes contract karke shortcuts; query sirf "upar" chadhti hai. Live traffic ke liye structure ek baar, weights jaldi.</li>
      <li>Live traffic: anonymous phone speeds → map matching → per-segment median, kam phones pe publish nahi, trip ke start/end delete.</li>
      <li>ETA ko <em>future</em> traffic chahiye: historical + live + ML (GNN), aur hamesha ek simple fallback.</li>
      <li>Offline maps: area pehle download (tiles + routing data), driving directions tabhi jab poora route andar ho; expiry se pehle update.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Tile pyramid + CDN: duniya bhar ka map, har request chhoti aur cache hit', 'Vector tiles: kam data, smooth zoom/rotate, offline maps', 'CH precomputation: lambe routes bhi milliseconds mein', 'Crowdsourced traffic: har sadak pe sensor ke bina live speeds', 'ML ETA: future traffic ka andaaza, zyada accurate arrival time'],
      costs: ['Tiles ka storage petabytes mein, map update pe invalidation ka kaam', 'Vector tiles: phone pe rendering ka kaam (GPU, battery)', 'Preprocessing mehenga; live weights ke liye extra customization step', 'Privacy ka bahut dhyaan: aggregation, minimum samples, trip ends delete', 'ML models ka training/monitoring; duniya badle (COVID) to model bhi badalna padta hai'],
    },

    { type: 'think', questions: [
      { q: 'Ek nayi flyover khuli. Kya kya update karna padega, aur kis order mein?', a: 'Map data mein nayi road segments → affected area ke tiles dobara banao aur CDN pe un tiles ko purge/naya version → routing graph ka naya version (CH preprocessing dobara, kam se kam us region ka) bana ke replicas pe dheere dheere swap → traffic pipeline ke map matching ko bhi naya segment pata hona chahiye, warna points galat sadak pe chipkenge. Historical pattern us segment ke liye shuru mein khaali hoga, to kuch hafte speed limit/road type se default.' },
      { q: 'Traffic layer ke tiles ko base map tiles jaisa lamba CDN TTL kyun nahi de sakte?', a: 'Traffic har kuch minute badalta hai; lamba TTL matlab users ghanton purana traffic dekhenge. Isliye traffic alag overlay layer hai jiska TTL minutes mein, jabki base map (sadkein, buildings) din/hafton mein badalta hai aur lamba TTL le sakta hai. Do layers alag karne se traffic badalne pe poora map dobara download nahi hota.' },
      { q: 'Kisi ne 99 phones ek thele mein rakh ke sadak pe dheere dheere chalaya. Kya ho sakta hai, aur kaise bachoge?', a: 'Aggregator ko lagega 99 "gaadiyan" 5 km/h pe hain, to jhootha jam dikh sakta hai aur log route badal lenge. Bachaav: ek jagah pe bahut saare devices ka ek jaisa pattern (same speed, same position, same time) suspicious maano; signals cross-check karo (doosri sadakon ke phones, historical, incident reports); kisi segment ko jam tabhi bolo jab alag alag trips ka data agree kare.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Zoom level 10 pe poori duniya kitne tiles mein hai?', options: ['10 × 10 = 100', '2^10 = 1,024', '4^10 ≈ 10 lakh (1,048,576)', '10^4 = 10,000'], answer: 2, explain: 'Har zoom pe har tile 4 mein toot-ta hai: 2^z × 2^z = 4^z. Zoom 10 pe 1,048,576 tiles.' },
      { q: 'Contraction hierarchies queries ko tez kaise banata hai?', options: ['Sirf highways pe search karta hai, galiyon ko ignore', 'Offline shortcuts jodta hai aur query sirf zyada important nodes ki taraf chalti hai', 'Har possible route pehle se store kar leta hai', 'Approximate route deta hai, exact nahi'], answer: 1, explain: 'Preprocessing mein kam important nodes contract karke shortcuts bante hain; query bidirectional aur "upward-only" hai. Jawab exact rehta hai, aur saare routes store nahi hote.' },
      { q: 'Live traffic ke liye Google ne 2009 mein privacy ke liye kya bataya tha?', options: ['Sirf paid users ka data', 'Data aggregate karna aur har trip ke start/end points permanently delete karna', 'Har phone ka poora path encrypt karke rakhna', 'Sirf government sensors use karna'], answer: 1, explain: 'Bahut logon ka data milaya jaata hai taaki ek phone alag na dikhe, aur trip ke start/end points delete kiye jaate hain.' },
      { q: 'Dijkstra aur A* mein asli farak kya hai?', options: ['A* hamesha chhota (behtar) route deta hai', 'Dono ka route same; A* andaaze (heuristic) se destination ki taraf jhuk ke kam chauraahe explore karta hai', 'Dijkstra sirf highways pe chalta hai'], answer: 1, explain: 'Widget mein dono ko S → B → F → G, 13 min mila. Dijkstra ne 9 chauraahe pakke kiye (ulti disha ke P, Q bhi), A* ne 7. Andaaza kabhi zyada na ho, tabhi A* ka jawab sahi rehta hai.' },
      { q: 'Google help page ke mutabik offline map mein kya nahi milta?', options: ['Map dikhna', 'Driving directions jab poora route downloaded area ke andar ho', 'Live traffic aur alternate routes (aur transit, cycling, walking directions)'], answer: 2, explain: 'Routing aur map phone pe chalte hain, isliye offline driving directions milti hain. Live traffic server se aata hai, wo offline mein nahi milta.' },
      { q: 'DeepMind ka GNN Google Maps mein kya karta hai?', options: ['Map tiles render karta hai', 'Shortest path algorithm ko replace karta hai', 'Routing engine ke candidate routes ka travel time predict karke unhe rank karta hai', 'GPS points ko roads pe chipkata hai'], answer: 2, explain: 'DeepMind 2020 blog ke mutabik GNN ETA predict karta hai aur routing engine ke candidate routes ko rank karne mein use hota hai.' },
    ]},
    { type: 'sources', note: 'Google ne Maps ka poora internal architecture publish nahi kiya. Google-specific baatein inhi sources se hain; routing algorithm aur traffic pipeline ke boxes general industry approach hain.', items: [
      { title: 'Google Maps 101: How AI helps predict traffic and determine routes', publisher: 'Google Keyword blog (Johann Lau, Google Maps)', year: 2020, official: true, url: 'https://blog.google/products/maps/google-maps-101-how-ai-helps-predict-traffic-and-determine-routes/', used: 'Aggregate location data from 220+ countries/territories, historical + live with ML, >97% accurate ETAs, COVID re-weighting to last 2-4 weeks, route factors (road quality, size, tolls, authoritative data, incidents).' },
      { title: 'Traffic prediction with advanced Graph Neural Networks', publisher: 'DeepMind blog (Oliver Lange, Luis Perez)', year: 2020, official: true, url: 'https://deepmind.google/discover/blog/traffic-prediction-with-advanced-graph-neural-networks/', used: 'Supersegments, GNN message passing over road graph, MetaGradients and combined losses, up to 50% fewer bad ETAs (Taichung ~51%, Sydney ~43%), GNN ranks candidate routes.' },
      { title: 'ETA Prediction with Graph Neural Networks in Google Maps (CIKM 2021)', publisher: 'Derrow-Pinion et al., Google/DeepMind (arXiv 2108.11482)', year: 2021, official: true, url: 'https://arxiv.org/abs/2108.11482', used: 'Confirms the GNN ETA model is deployed in production in Google Maps.' },
      { title: 'Under the hood of Google Maps 5.0 for Android', publisher: 'Google Maps blog', year: 2010, official: true, url: 'https://maps.googleblog.com/2010/12/under-hood-of-google-maps-50-for.html', used: '256×256 image tiles before, 360B+ tiles for 20 zoom levels, switch to vector tiles, >100× less data across zoom levels, offline caching, dynamic labels.' },
      { title: 'The bright side of sitting in traffic: Crowdsourcing road congestion data', publisher: 'Official Google Blog', year: 2009, official: true, url: 'https://googleblog.blogspot.com/2009/08/bright-side-of-sitting-in-traffic.html', used: 'Anonymous speed data from phones with location on, scale and privacy challenges, aggregation, deleting trip start/end points.' },
      { title: 'Contraction Hierarchies: Faster and Simpler Hierarchical Routing in Road Networks (WEA 2008)', publisher: 'Geisberger, Sanders, Schultes, Delling (Karlsruhe)', year: 2008, url: 'https://ae.iti.kit.edu/999.php', used: 'Node ordering by importance, contraction with shortcuts, bidirectional upward query, ~5× faster than previous hierarchical methods, negative space overhead.' },
      { title: 'World scale inverse reinforcement learning in Google Maps', publisher: 'Google Research blog', year: 2023, official: true, url: 'https://research.google/blog/world-scale-inverse-reinforcement-learning-in-google-maps/', used: 'Route choice trades off ETA, tolls, directness, surface; learning from real routes improved route match rate 16-24%.' },
      { title: 'Map and tile coordinates', publisher: 'Google Maps Platform docs', official: true, url: 'https://developers.google.com/maps/documentation/javascript/coordinates', used: 'World/pixel/tile coordinates, 256 px base tile, resolution doubles per zoom, Mercator cut at ~±85°.' },
      { title: 'Slippy map tilenames', publisher: 'OpenStreetMap wiki', url: 'https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames', used: 'z/x/y scheme, 4^z tiles, lat/lon → tile formula (used in the widget), ±85.0511°, metres-per-pixel formula, ~68.7B tiles at z18.' },
      { title: 'Download areas & navigate offline in Google Maps', publisher: 'Google Maps Help', official: true, url: 'https://support.google.com/maps/answer/6291838?hl=en', used: 'Offline driving directions only if the whole route is inside the area; no transit/bike/walk, no traffic or alternate routes offline; update before expiry, auto-update on Wi-Fi when 15 days or less remain; SD card storage. (Read in 2026.)' },
      { title: 'OSM data downloads (OpenMapTiles schema)', publisher: 'MapTiler data downloads', url: 'https://data.maptiler.com/downloads/dataset/osm/', used: 'Open-source vector tiles generated for zoom 0-14 and overzoomed beyond; used for the offline size widget assumption.' },
      { title: 'Copyright and License', publisher: 'OpenStreetMap', official: true, url: 'https://www.openstreetmap.org/copyright', used: 'ODbL licence and attribution rules for the tile figure (© OpenStreetMap contributors).' },
      { title: 'Geocoding API overview', publisher: 'Google Maps Platform docs', official: true, url: 'https://developers.google.com/maps/documentation/geocoding/overview', used: 'Definitions of geocoding and reverse geocoding.' },
    ]},
  ],
});
