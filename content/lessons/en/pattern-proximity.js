Lesson.register({
  id: 'pattern-proximity',
  title: 'Proximity search ("near me")',
  minutes: 32,
  summary: `"Who is live within 2 km of me?", "which events are nearby?", "the 5 closest drivers?" These are all one pattern: split the map into small boxes (cells), read only the nearby boxes, then filter by the real distance. We climb a ladder: plain scan, geohash, quadtree, S2/H3, and then the real tools: Redis GEO (moving things), Elasticsearch / PostGIS (things that stay in one place).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You open the app and ask: "who is near me?"<br>The app has the location of 10 lakh people. Measuring your distance to every one of them is very slow.<br>So we split the map into small boxes, like graph paper.<br>Then we only look in your box and the boxes next to it. We do not even touch the rest of the world.<br>In this lesson we learn how these boxes are made, and what goes wrong for a user standing at the edge of a box.` },
    { type: 'h2', text: 'The ladder for this pattern' },
    { type: 'steps', items: [
      { t: 'Rung 1: Plain scan / lat-lng box', d: 'Measure the distance to everything, or use latitude-longitude ranges. Perfectly fine for small data.' },
      { t: 'Rung 2: Geohash cells + neighbours', d: 'The map in equal boxes. Each point\'s box is a string. Read your box + 8 neighbour boxes.' },
      { t: 'Rung 3: Quadtree', d: 'Small boxes where it is crowded, big boxes where it is empty. About the same number of people in every box.' },
      { t: 'Rung 4: S2 / H3', d: 'Boxes made for a round Earth. H3 uses hexagons, where all neighbours are equally far.' },
      { t: 'Rung 5: Choose the real tool', d: 'Moving things (drivers) → Redis GEO. Things that stay put (events) → Elasticsearch or PostGIS.' },
      { t: 'Rung 6: Scale', d: 'Split keys by area, handle crowded boxes (hot cells), grow the ring for "the 5 closest".' },
    ]},
    { type: 'callout', tone: 'tip', title: 'When to stop climbing', html: `5,000 venues and you already have Postgres? Rung 1 or straight to PostGIS (Rung 5) is enough. Lakhs of moving points? Rung 2 + Redis GEO. Very different density between city and village? Quadtree or H3. Each rung ends with a "when to stop" note.` },
    { type: 'h2', text: 'The problem: why is "near me" slow with a normal index?' },
    { type: 'p', html: `xyz.com got two new features: <strong>Nearby creators</strong> (people streaming live within 2 km of you right now) and <strong>Events near you</strong> (meetups and concerts nearby this weekend). And xyz.com's sister app is a ride service that needs <strong>nearby drivers</strong>. All three ask the same question: "what is within X km of this point?"` },
    { type: 'callout', tone: 'term', title: 'Latitude and longitude', html: `<strong>What it is:</strong> the address of a place on Earth as two numbers. <strong>Latitude (lat)</strong> = how far north or south of the equator (−90° to +90°). <strong>Longitude (lng)</strong> = how far east or west of the Greenwich (London) line (−180° to +180°). Bengaluru ≈ lat 12.97, lng 77.59.<br><strong>Why we need it:</strong> a phone\'s GPS gives exactly these two numbers. Every "near me" question starts with them.<br><strong>Careful:</strong> 1° of latitude is always ~111 km. But 1° of longitude is ~111 km at the equator and gets smaller towards the poles.` },
    { type: 'h2', text: 'Rung 1: a plain scan, or a lat-lng box' },
    { type: 'p', html: `First try: store <code>lat</code> and <code>lng</code> for everything in a table, put an index on both, and query:` },
    { type: 'code', text: `SELECT id FROM creators
WHERE lat BETWEEN 12.95 AND 12.99      -- ~2 km up and down
  AND lng BETWEEN 77.58 AND 77.62;     -- ~2 km left and right` },
    { type: 'p', html: `It looks fine. But a <a href="#/db-internals">B-tree index</a> keeps only <strong>one column</strong> sorted at a time. The <code>lat</code> index says "all rows with latitude between 12.95 and 12.99", and that is a <em>thin strip</em> that runs around the whole world at that latitude (from Bengaluru to Ethiopia). Lakhs of rows. Then <code>lng</code> is checked on each one. Or you take the two strips from two indexes and intersect them: both are expensive.` },
    { type: 'ascii', text: `
   strip from the lng index
         ║
 ════════╬═══════════   <- strip from the lat index (runs around the world)
         ║
         ║        We only need the small box in the middle (╬),
         ║        but each index alone gives a long strip.` },
    { type: 'p', html: `And the cheapest wrong way, the <strong>naive scan</strong>: compute the distance to every creator and filter. 10 lakh live creators × thousands of "nearby" requests every second = billions of distance calculations every second. We need an index that understands <strong>2D space</strong>.` },
    { type: 'callout', tone: 'term', title: 'Proximity search', html: `<strong>What it is:</strong> finding things near a point (geo search, a "near me" query). Two forms: a <strong>radius query</strong> ("everything within 2 km") and <strong>k-nearest</strong> ("the 5 closest").<br><strong>Why we need it:</strong> ride apps, nearby creators, events, maps: all run on it.<br><strong>The trick:</strong> first a cheap, rough filter (only nearby boxes), then an expensive, exact filter (the real distance) only on the remaining candidates.<br><strong>Without it:</strong> every request would measure the distance to the whole world.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 1)', html: `Small data (fewer than 10,000 points) and few queries? A plain scan or a lat-lng box is perfectly fine. A scan over 5,000 venues takes microseconds to milliseconds. You need cells when there are lakhs of points or thousands of queries every second.` },

    { type: 'h2', text: 'Rung 2: split the world into cells (geohash)' },
    { type: 'callout', tone: 'term', title: 'Cell (a box)', html: `<strong>What it is:</strong> split the map into a grid, like graph paper. Each small box is a <strong>cell</strong>, and every cell has an ID. Give every point the ID of its cell.<br><strong>Why we need it:</strong> now "close in 2D" becomes "is it in one of these 9 cell IDs?". A normal index (B-tree, Redis sorted set) works on cell IDs.<br><strong>Without it:</strong> there is no direct index for 2D space, only a scan.` },
    { type: 'callout', tone: 'term', title: 'Geohash', html: `<strong>What it is:</strong> a way to turn lat-lng into a short string, like <code>tdr1v9</code>. Each character = one more, smaller cell. Longer string = smaller cell.<br><strong>How it is made:</strong> keep cutting the range in half. Longitude range −180..180: Bengaluru (77.59) is in the right half → bit 1. Latitude −90..90: 12.97 is in the upper half → 1. Then the middle of longitude 0..180 is 90: 77.59 is below → 0. The middle of latitude 0..90 is 45 → 0. The middle of longitude 0..90 is 45: above → 1. The five bits <code>11001</code> = 25 = the character <code>t</code> (in a list of 32 characters). Keep going: Bengaluru (12.97, 77.59) = <code>tdr1v9</code>.<br><strong>Why we need it:</strong> a prefix of the string = a bigger cell. Nearby places often share a prefix, so a range scan on a sorted index finds all the points in a cell.<br><strong>Without it:</strong> you would have to keep track of every cell separately.` },
    { type: 'p', html: `In the <a href="#/ds-for-scale">Bloom filter, HyperLogLog, Geohash</a> lesson we looked inside three methods. Here is a quick reminder, because all of them follow the same pattern: <strong>give every point a cell ID, put a normal index on the cell ID, and read only the nearby cells in the query</strong>.` },
    { type: 'table', head: ['Method', 'What the cell looks like', 'Good when', 'Where you find it'], rows: [
      ['Geohash', 'Fixed rectangles; each extra character = 32 smaller pieces. The cell ID is a string; nearby places often share a prefix', 'Simple; any sorted index (B-tree, Redis sorted set) can run it', 'Redis GEO (inside), Elasticsearch geohash grid aggregation'],
      ['Quadtree', 'Small squares where it is crowded, big squares where it is empty (split into 4 at a time)', 'Very different density (Mumbai vs a desert), points do not move much', 'In-memory services, game engines, some DB indexes'],
      ['H3 (Uber)', 'Hexagons, 16 resolutions; all 6 neighbours at the same distance', 'Analysis over areas (surge, demand), smooth "rings" of neighbours', 'Uber\'s open-source library; data pipelines'],
      ['S2 (Google)', 'The 6 faces of a cube spread over the sphere and split 4 at a time; levels 0-30, the ID is a 64-bit number', 'The whole world, equal cells up to the poles; covering a region with a set of cells', 'Google\'s open-source library (s2geometry.io)'],
    ]},
    { type: 'p', html: `We will look at quadtree, S2 and H3 in detail in Rungs 3 and 4. First understand the whole game with geohash.` },
    { type: 'p', html: `But there is a catch that gets every beginner: your user may be standing at the <strong>edge</strong> of a cell. A creator 50 metres away is across the border, in another cell. If you read only your own cell, you will never find them. See for yourself below.` },

    { type: 'h2', text: 'Try it yourself: naive scan vs cells' },
    { type: 'p', html: `A city of 10 km × 10 km with ~3,000 live creators (three crowded neighbourhoods + the rest scattered). Click anywhere on the map to move yourself (zoom in to see the edge effect clearly). The cells are like geohash (the real sizes of precision 5/6/7), just treated as flat for such a small area.` },
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
      const MODES = [['naive', 'Naive: check all'], ['own', 'Own cell only'], ['nine', 'Own + 8 neighbours'], ['cover', 'Cells covering the radius']];
      const S = { ux: 6.95, uy: 3.25, mode: 'own', zoom: 1 }; let VB = [0, 0, 320, 320];
      el.innerHTML = `<div class="pxModes" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div class="row2" style="margin-top:10px">
          <div><label>Search radius: <strong class="pxRv"></strong></label><input class="pxR" type="range" min="0.25" max="2" step="0.25" value="0.5"></div>
          <div><label>Cell size (geohash precision)</label><select class="pxP"><option value="5">5: ~4.9 × 4.9 km</option><option value="6" selected>6: ~1.2 × 0.6 km</option><option value="7">7: ~153 × 152 m</option></select></div>
        </div>
        <div style="display:flex;justify-content:center;margin-top:10px"><button type="button" class="btn small ghost pxZoom"></button></div>
        <svg class="pxMap" viewBox="0 0 320 320" style="width:100%;max-width:420px;display:block;margin:12px auto 0;cursor:crosshair;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface)" role="img" aria-label="Map with creators, search circle and scanned cells"></svg>
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;font-size:12px;color:var(--ink-3);margin-top:6px"><span style="color:var(--green)">● found</span><span style="color:var(--red)">● inside radius, but MISSED</span><span style="color:var(--accent)">● checked, too far</span><span>· not checked at all</span></div>
        <div class="stats">
          <div class="stat"><span>Cells read</span><strong class="pxC"></strong></div>
          <div class="stat"><span>Points checked</span><strong class="pxK"></strong></div>
          <div class="stat"><span>Found</span><strong class="pxF"></strong></div>
          <div class="stat"><span>Missed</span><strong class="pxM"></strong></div>
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
        $('.pxZoom').textContent = S.zoom ? 'Show the whole city' : 'Zoom in (around the user)';
        $('.pxC').textContent = S.mode === 'naive' ? '-' : r.cells.size;
        $('.pxK').textContent = r.checked.toLocaleString('en-IN') + ' / ' + P.length.toLocaleString('en-IN');
        $('.pxF').textContent = r.found; $('.pxM').textContent = r.missed;
        const minSide = Math.min(r.w, r.h);
        $('.pxNote').textContent = S.mode === 'naive' ? `Computed the distance to every point: ${P.length.toLocaleString('en-IN')} calculations, not a single miss, but the whole city on every request. With 10 lakh points this is useless.`
          : r.missed > 0 ? (S.mode === 'own' ? `Edge-of-cell problem: ${r.missed} creators were inside the radius, but in neighbouring cells, so they never showed up. So never read only your own cell.`
            : S.mode === 'nine' ? `The radius (${R} km) is bigger than the short side of a cell (~${minSide.toFixed(2)} km), so even the 3×3 block does not cover the whole circle: ${r.missed} missed. Use bigger cells (lower precision), or more cells based on the radius.` : '')
          : `All ${r.found} found, by checking only ${r.checked.toLocaleString('en-IN')} points (~${Math.round(r.checked / P.length * 100)}% of naive). ${r.cells.size > 40 ? 'But ' + r.cells.size + ' cells had to be read: the cells are too small, and each cell is a separate index lookup.' : r.w * r.h > 4 * Math.PI * R * R ? 'But the cells are much bigger than the radius, so many far-away points were checked too: raise the precision.' : 'This is the sweet spot: cell size close to the radius.'}`;
      };
      svg.addEventListener('click', e => { const b = svg.getBoundingClientRect(); if (!b.width) return; S.ux = Math.max(0, Math.min(MAP, (VB[0] + (e.clientX - b.left) / b.width * VB[2]) / PX)); S.uy = Math.max(0, Math.min(MAP, MAP - (VB[1] + (e.clientY - b.top) / b.height * VB[3]) / PX)); upd(); });
      $('.pxZoom').onclick = () => { S.zoom = S.zoom ? 0 : 1; upd(); };
      el.querySelectorAll('input,select').forEach(x => x.addEventListener('input', upd)); upd();
    }},


    { type: 'callout', tone: 'tip', title: 'Numbers for the default setup', html: `Precision 6, radius 0.5 km, the user near the edge of a cell:<br>
      • <strong>Naive:</strong> 2,998 points checked, 89 found.<br>
      • <strong>Own cell only:</strong> only 66 checked, but <strong>66 of the 89 missed</strong> (only 23 found). This is the edge-of-cell problem.<br>
      • <strong>Own + 8 neighbours:</strong> 9 cells, 427 checked (~14% of naive), all 89 found.<br>
      • <strong>Cells covering the radius:</strong> only 4 cells, 283 checked (~9%), all 89.<br>
      Now set the radius to 1 km: the 3×3 block misses 35 (the radius is bigger than the short side of a cell, ~0.61 km). At precision 7 the "covering cells" become 163: the cells are too small. At precision 5 a single cell holds ~800 points: too big.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Same geohash prefix = close, different prefix = far." The first half is true, the second is wrong. Two points only 20 metres apart can be in different cells (and at a border sometimes the whole prefix is different). For example (12.97, 77.59) = <code>tdr1v9</code> and (12.97, 77.61), only ~2 km away, = <code>tdr1y1</code>: already the fifth character differs. So the right query is always: <strong>a set of cells (own + neighbours, or the ones covering the radius) → candidates → filter by real distance</strong>. A cell is only a way to sift candidates, not the final answer.` },

    { type: 'h2', text: 'How to choose the cell size?' },
    { type: 'p', html: `The simulator showed it: cells too big means checking useless points, too small means reading too many cells. Rule of thumb: <strong>short side of the cell ≈ search radius</strong>; then the 3×3 block (own + 8) covers the whole circle.` },
    { type: 'table', head: ['Geohash precision', 'Cell size (at the equator, roughly)', 'Good for which radius'], rows: [
      ['4', '39 km × 19.5 km', '"In this city" (10-20 km)'],
      ['5', '4.9 km × 4.9 km', 'Events near you (~5 km)'],
      ['6', '1.2 km × 0.61 km', 'Nearby creators, drivers (~0.5 km)'],
      ['7', '153 m × 152 m', 'Very close (~150 m), pickup point'],
    ], caption: 'Away from the equator the width (east-west) of the cells shrinks, because the longitude lines come closer together.' },
    { type: 'p', html: `Real systems do this by themselves. Redis GEO picks the precision from the radius and reads 9 areas. In a quadtree the cell size follows the density automatically. In H3 you ask for a "k-ring" (your hexagon + k layers of neighbours).` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 2)', html: `Points spread roughly evenly over the city, and the radius in a fixed range (0.5-5 km)? Geohash + neighbours is enough, and Redis GEO already does it inside. Go to the next rung when some cells hold thousands of points and others are empty (a big density difference), or when the data covers the whole world (poles, date line).` },

    { type: 'h2', text: 'Rung 3: quadtree (boxes that follow the crowd)' },
    { type: 'p', html: `<strong>A new problem:</strong> xyz.com\'s ~3,000 live creators are packed into three crowded neighbourhoods, and the rest of the city is nearly empty. With equal boxes (1.25 km), the fullest box holds 254 creators and the emptiest only 13. Every query in the full box checks 254 points, and in a village a big radius reads lots of empty boxes.` },
    { type: 'callout', tone: 'term', title: 'Quadtree', html: `<strong>What it is:</strong> a tree that splits the map into 4 parts, and splits again into 4 only the parts that hold too many points (say "more than 50"). Small boxes where it is crowded, big boxes where it is empty.<br><strong>Why we need it:</strong> about the same number of points in every box. The work of a query depends less on density.<br><strong>Without it (fixed grid):</strong> boxes in the city centre are packed, boxes outside are empty.<br><strong>The price:</strong> when points move, the tree must be split and merged again and again. So quadtrees are often used for things that stay put (places, venues), or for a tree rebuilt in memory every few seconds.` },
    { type: 'p', html: `<strong>Quadtree lab.</strong> The same 3,000 creators. Compare a fixed grid and a quadtree, and change the "max points in one box" to see how the tree splits.` },
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
        <div style="margin-top:10px"><label>Max points in one box: <strong class="pq-vc"></strong></label><input class="pq-c" type="range" min="0" max="3" step="1" value="1"></div>
        <svg class="pq-svg" viewBox="0 0 320 320" style="width:100%;max-width:420px;display:block;margin:12px auto 0;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--surface)" role="img" aria-label="Fixed grid vs quadtree cells over the city"></svg>
        <div class="stats">
          <div class="stat"><span>Boxes (cells)</span><strong class="pq-n"></strong></div>
          <div class="stat"><span>In the fullest box</span><strong class="pq-mx"></strong></div>
          <div class="stat"><span>Smallest box</span><strong class="pq-sm"></strong></div>
          <div class="stat"><span>Biggest box</span><strong class="pq-bg"></strong></div>
        </div>
        <div class="calc-note pq-note"></div>`;
      const $ = c => el.querySelector(c);
      const km = v => v >= 1 ? v.toFixed(2) + ' km' : Math.round(v * 1000) + ' m';
      const upd = () => {
        S.cap = +$('.pq-c').value; const cap = CAPS[S.cap];
        $('.pq-modes').innerHTML = ''; [['grid', 'Fixed grid (1.25 km)'], ['qt', 'Quadtree']].forEach(([k, l]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (S.mode === k ? ' on' : ''); b.textContent = l; b.onclick = () => { S.mode = k; upd(); }; $('.pq-modes').appendChild(b); });
        $('.pq-vc').textContent = S.mode === 'qt' ? cap : '(quadtree only)';
        const L = S.mode === 'qt' ? build(cap) : grid(), mx = Math.max(...L.map(l => l.n));
        let g = '';
        L.forEach(l => { const a = l.n / mx; g += `<rect x="${(l.x * PX).toFixed(1)}" y="${(320 - (l.y + l.s) * PX).toFixed(1)}" width="${(l.s * PX).toFixed(1)}" height="${(l.s * PX).toFixed(1)}" fill="var(--accent)" fill-opacity="${(0.06 + 0.5 * a).toFixed(2)}" stroke="var(--accent)" stroke-width="0.6"/>`; });
        P.forEach(([x, y]) => { g += `<circle cx="${(x * PX).toFixed(1)}" cy="${(320 - y * PX).toFixed(1)}" r="0.8" fill="var(--ink-2)"/>`; });
        $('.pq-svg').innerHTML = g;
        $('.pq-n').textContent = L.length; $('.pq-mx').textContent = mx + ' points';
        $('.pq-sm').textContent = km(Math.min(...L.map(l => l.s))); $('.pq-bg').textContent = km(Math.max(...L.map(l => l.s)));
        $('.pq-note').textContent = S.mode === 'grid' ? `64 equal boxes. The box in a crowded neighbourhood holds ${mx} points, while some boxes hold only 13. The work of each query depends on where the user is standing.` : `${L.length} boxes, none with more than ${cap} points. In crowded neighbourhoods boxes get as small as ${km(Math.min(...L.map(l => l.s)))}, in empty areas as big as ${km(Math.max(...L.map(l => l.s)))}. A small limit = more boxes (a deeper tree), a big limit = more points per box.`;
      };
      $('.pq-c').oninput = upd; upd();
    }},
    { type: 'p', html: `Numbers (checked): in the fixed grid of 64 boxes the max is 254 points. With a quadtree limit of 50: 145 boxes, at most 50 points each, the smallest box 313 m and the biggest 1.25 km. With a limit of 25: 241 boxes and the smallest is 156 m.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 3)', html: `A big density difference (city vs village) and points that do not move much? Quadtree. Points that move every few seconds (drivers)? Geohash/Redis GEO stays simpler; a quadtree would have to be rebuilt in memory every few seconds. For data covering the whole world, see the next rung.` },

    { type: 'h2', text: 'Rung 4: S2 and H3 (cells for a round Earth)' },
    { type: 'p', html: `<strong>A new problem:</strong> xyz.com is now worldwide: from Norway to New Zealand. Geohash rectangles are ~1.2 × 0.6 km at the equator, but towards the poles they get squeezed east-west. And at 180° longitude (the date line) two nearby points get completely different geohashes. We need cells that are roughly equal all over the sphere.` },
    { type: 'callout', tone: 'term', title: 'S2 (Google)', html: `<strong>What it is:</strong> Google\'s open-source geometry library. Imagine the Earth inside a cube; spread the cube\'s 6 faces over the sphere. Split each face into 4 again and again: levels 0 to 30. Cells at level 30 are about 1 cm across. Every cell ID is a 64-bit number.<br><strong>What is special:</strong> cells are numbered in the order of a <strong>space-filling curve</strong> (a line, like the Hilbert curve, that passes through every box once). So two cell IDs that are close = cells that are close. You can cover a region (like "this area of Bengaluru") with a few ranges of cell IDs.<br><strong>Why we need it:</strong> equal cells all the way to the poles, and clean area/region queries.<br><strong>Without it:</strong> the squeezed geohash cells and the trouble at the date line.` },
    { type: 'image', src: 'assets/img/pattern-proximity/hilbert-curve.jpg', alt: 'The first six steps of the Hilbert curve: a line that passes through every box of a grid once, with 4 times more boxes at each step', caption: 'The Hilbert curve: the line passes through every box once, so numbers that are close along the line are also close on the map. S2 cells are numbered in the order of a curve like this (6 Hilbert curves joined together).', credit: { text: 'Braindrain0000, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Hilbert_curve.svg', license: 'CC BY-SA 3.0' } },
    { type: 'callout', tone: 'term', title: 'H3 (Uber)', html: `<strong>What it is:</strong> Uber\'s open-source library that splits the Earth into <strong>hexagons</strong> (boxes with 6 corners), at 16 resolutions (0 to 15). Every resolution also has exactly 12 pentagons (5 corners), because a sphere cannot be covered with hexagons alone.<br><strong>Why hexagons:</strong> a square\'s 8 neighbours are at two different distances (4 along the sides, 4 at the corners ~1.4 times farther). A hexagon\'s 6 neighbours are all equally far. "My ring 1, ring 2 around me" (a <strong>k-ring</strong>) looks like a clean circle.<br><strong>Why we need it:</strong> counting and analysis over areas: how much demand and how many drivers in each hexagon (work like surge pricing).<br><strong>Without it:</strong> on a square grid the corner neighbours make the maths uneven.` },
    { type: 'table', head: ['H3 resolution', 'Average area of one hexagon', 'Used for what on xyz.com'], rows: [
      ['7', '~5.16 km²', 'Big parts of a city: "how many events in this area today"'],
      ['8', '~0.74 km²', 'A neighbourhood: counting demand / supply'],
      ['9', '~0.105 km² (~1 lakh m²)', 'A few streets: around a pickup point'],
    ], caption: 'Numbers from the cell statistics table on h3geo.org (average hexagon area).' },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 4)', html: `One or two cities, or one country like India? The small squeeze of geohash does not matter; Rung 2 is enough. Use S2 for the whole world or for polygon/region coverage. Use H3 for counting/analysis over areas (demand, surge, heatmaps). For "the 10 closest drivers" you need none of these; Redis GEO is enough.` },

    { type: 'h2', text: 'Rung 5: choose the real tool (moving things vs things that stay put)' },
    { type: 'p', html: `These are two completely different workloads, and the roadmap rule is based on exactly this:` },
    { type: 'compare',
      left: { title: 'Moving: drivers, live creators, delivery partners', html: `• A location update every few seconds<br>• 10 lakh drivers × every 4 seconds = <strong>2.5 lakh writes/sec</strong><br>• Old data is useless (a 30-second-old location = wrong)<br>• Simple query: "who is near, who is available"<br>• If data is lost, the next update brings it back<br><br>→ <strong>In memory: Redis GEO</strong> (or your own in-memory grid)` },
      right: { title: 'Static: events, venues, shops, places', html: `• Change only now and then<br>• Few writes, many reads<br>• Complex query: "comedy event, this weekend, within 5 km, ticket under ₹500, rating 4+"<br>• Must be durable<br><br>→ <strong>Elasticsearch</strong> (text + filters + geo) or <strong>PostGIS</strong> (relational + geo + polygons)` },
    },

    { type: 'h2', text: 'Redis GEO: for moving things' },
    { type: 'p', html: `Redis has built-in geo commands. Inside, it is a normal <strong>sorted set</strong> (a Redis list where every member has a number, the "score", and the list stays sorted by that score). Here each member's (driver's) score is its 52-bit geohash (the bits of latitude and longitude woven together, just like the geohash above). So adding is O(log N), and a radius query is a few range scans on the sorted set.` },
    { type: 'code', text: `# a driver sent a location (longitude FIRST, then latitude)
GEOADD drivers:blr 77.6067 12.9756 driver:42

# the 10 closest drivers within 2 km of the rider, with distance
GEOSEARCH drivers:blr FROMLONLAT 77.6100 12.9700 BYRADIUS 2 km ASC COUNT 10 WITHDIST

# the driver went offline: GEO has no delete command of its own, use the sorted set's ZREM
ZREM drivers:blr driver:42` },
    { type: 'list', items: [
      `<strong>GEOSEARCH</strong> exists since Redis 6.2 and should be used instead of the old <code>GEORADIUS</code>/<code>GEORADIUSBYMEMBER</code> (the docs call them deprecated). A circle (<code>BYRADIUS</code>) or a box (<code>BYBOX</code>), and from <code>FROMLONLAT</code> or from a member (<code>FROMMEMBER</code>).`,
      `<strong>What happens inside:</strong> according to the Redis docs, it reads the score ranges of 1 + 8 areas to cover the query shape, then removes the ones outside the circle. The same "own + 8 neighbours" we saw in the simulator.`,
      `<strong>Accuracy:</strong> the distance uses the Haversine formula (a formula for the distance between two points on a sphere), treating the Earth as a perfect sphere. According to the docs the worst-case error is ~0.5%: fine for "nearby", not for surveys or legal measurements. Very close to the poles (beyond latitude ±85.05°) points cannot be indexed.`,
      `<strong>COUNT ... ANY:</strong> return as many as you found first, do not sort. Faster, but they are not necessarily the closest ones.`,
    ]},
    { type: 'callout', tone: 'warn', title: 'Interview depth: three catches of Redis GEO', html: `
      <strong>1. Stale members.</strong> A member of a sorted set cannot have its own TTL. If a driver's phone dies, they keep "standing" in the set. Fix: a second sorted set <code>drivers:lastseen</code> (score = timestamp); a cleanup job removes old members from both sets with <code>ZREM</code> every few seconds. Or check last-seen after the query.<br>
      <strong>2. One key = one shard.</strong> <code>drivers:blr</code> is the set for all of Bengaluru and lives on a single node in Redis Cluster: at the peak it can become a hot key (<a href="#/pattern-spikes">hot keys</a>). Fix: split the key into smaller areas, like <code>drivers:tdr1</code> by geohash precision 4/5, and read your own + neighbour keys in the query.<br>
      <strong>3. It is memory, not durable.</strong> Location data is refreshed every few seconds anyway, so if Redis fails, promote a replica; whatever is missing fills itself in with the next updates. This is the advantage of "ephemeral" (short-lived) data.` },

    { type: 'h2', text: 'Elasticsearch: geo + text + filters' },
    { type: 'p', html: `"Events near you" is not only distance: "stand-up comedy", "this weekend", "under ₹500", then sort by rating. This is <a href="#/search">search</a> work, and Elasticsearch (or OpenSearch) does geo together with the other filters in one query. Give the field the <code>geo_point</code> type; inside, Lucene (the search library under Elasticsearch) builds a tree index for points (a BKD tree, a tree made for 2D points), so the geo filter also runs on an index.` },
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
    { type: 'p', html: `When: things that are static or change rarely and need text search and many filters. When not: moving points with lakhs of updates per second; in Elasticsearch every update is a new document version and becomes visible only after a refresh (near real-time), so data like drivers is expensive here.` },

    { type: 'h2', text: 'PostGIS: geo inside SQL' },
    { type: 'p', html: `Is the data already in Postgres (events, venues, their organisers, tickets: all relational)? Then add the <strong>PostGIS</strong> extension. Besides points it also understands polygons (shapes with many corners, like the border of a city zone): geofence questions like "which city zone is this point in?" or "which delivery area is this event venue in?".` },
    { type: 'code', text: `-- geography type: distance in METERS, following the curve of the Earth
ALTER TABLE events ADD COLUMN location geography(Point, 4326);
CREATE INDEX events_location_gist ON events USING GIST (location);

-- events within 5 km (uses the index)
SELECT id, title FROM events
WHERE ST_DWithin(location, ST_MakePoint(77.61, 12.97)::geography, 5000)
  AND starts_at BETWEEN '2026-10-10' AND '2026-10-12';

-- the 5 closest (k-nearest, index-assisted)
SELECT id, title FROM events
ORDER BY location <-> ST_MakePoint(77.61, 12.97)::geography
LIMIT 5;` },
    { type: 'callout', tone: 'term', title: 'GiST index and ST_DWithin', html: `<strong>GiST</strong> (Generalized Search Tree) is a Postgres index type that keeps a small bounding box for every shape, like an R-tree: nearby boxes form a group, and bigger boxes sit above the groups. <strong>ST_DWithin(a, b, d)</strong> asks "is the distance between a and b less than d?". According to the PostGIS docs it first does a cheap bounding-box filter on the index, then the exact distance. So for a radius write <code>ST_DWithin</code>, not <code>ST_Distance(...) &lt; 5000</code>: the second one may compute the distance for every row and skip the index.` },
    { type: 'callout', tone: 'mistake', title: 'Degrees vs meters', html: `With the <code>geometry</code> type (SRID 4326), <code>ST_DWithin(..., 5000)</code> means 5000 <strong>degrees</strong>, not meters: the whole world matches! If you want meters, use the <code>geography</code> type (as above), or keep the data in a projection measured in meters. And remember: 1° of longitude is ~111 km at the equator but shrinks as you go north. A "radius" in degrees is not a circle but a squashed shape.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 5)', html: `First check where the data already lives. Postgres? Then PostGIS. Search already on Elasticsearch? Then geo_point right there. A new Redis GEO only for moving points. All three together only when you really have all three kinds of questions (drivers + events + zones).` },

    { type: 'h2', text: 'Rung 6: scale (hot cells, area keys, the closest k)' },
    { type: 'p', html: `<strong>A new problem:</strong> xyz.com's ride app has grown to 10 lakh drivers, an update every 4 seconds = <strong>2.5 lakh writes/sec</strong>. One single <code>drivers:blr</code> key sits on one Redis node. And after the IPL final, 20,000 drivers are in the same box outside the stadium.` },
    { type: 'list', items: [
      `<strong>Keys by area:</strong> instead of one key per city, one key per geohash prefix (precision 4-5): <code>drivers:tdr1</code>, <code>drivers:tdr4</code>... Different keys go to different Redis shards, so writes and reads are spread out. Read your own + neighbour keys in the query (the same edge-of-cell rule).`,
      `<strong>Hot cell:</strong> the stadium box is a <a href="#/pattern-spikes">hot key</a>. For that area use smaller boxes (higher precision), cap the results with <code>COUNT</code>, and split by density like a quadtree.`,
      `<strong>The closest k (k-nearest):</strong> the radius is unknown. Start with a small ring (your box + neighbours). If you found fewer than k, try the next, bigger ring. Keep an upper limit (like 50 km) so the loop does not run forever in an empty village. In H3 this is simply k-ring 0, 1, 2...`,
      `<strong>Straight-line distance is not road distance:</strong> the geo index is only the first, cheap filter. Real apps compute an ETA on the road network for the candidates and rank by that.`,
    ]},
    { type: 'callout', tone: 'tip', title: 'When to stop (Rung 6)', html: `One Redis node usually handles around ~1 lakh ops/sec for simple commands (the estimate from the Traffic spikes lesson). As long as one city's writes and set fit on one node, do not split the keys. Split when a node starts touching 70-80% CPU or memory.` },

    { type: 'h2', text: 'The whole proximity service, run it yourself' },
    { type: 'p', html: `Now all the rungs together: writing a driver's location, reading nearby drivers, finding events, and two failures. Click any box to read what it does.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'drv', label: 'Driver app', sub: 'location every 4 s', x: 85, y: 70, w: 140, kind: 'client', info: 'What it is: the driver\'s app. The driver\'s phone sends its latitude/longitude every few seconds (say 4). Live creators do the same: while the stream is on, a location heartbeat.' },
        { id: 'usr', label: 'User app', sub: 'opens nearby', x: 85, y: 270, w: 140, kind: 'client', info: 'What it is: the user\'s app. A rider or viewer: "nearby drivers", "nearby creators", "events near you".' },
        { id: 'loc', label: 'Location svc', sub: 'writes', x: 290, y: 70, w: 140, kind: 'server', info: 'What it is: the service that writes locations. It takes location updates. Very write-heavy (lakhs/sec), so it is stateless and scaled horizontally. It writes GEOADD and a last-seen timestamp to Redis.' },
        { id: 'near', label: 'Nearby svc', sub: 'reads', x: 290, y: 270, w: 140, kind: 'server', info: 'What it is: the query service that answers "near me". Redis GEOSEARCH for moving things, PostGIS/Elasticsearch for static things. Business filters on the results (available? blocked?) and ranking.' },
        { id: 'redis', label: 'Redis GEO', sub: 'drivers:{cell}', x: 505, y: 170, w: 140, kind: 'cache', meter: true, load: 30, info: 'What it is: Redis geo sets, in memory. One sorted set per area (geohash-prefix key). Member = driver id, score = 52-bit geohash. Plus drivers:lastseen (score = timestamp) for cleanup.' },
        { id: 'pg', label: 'Events DB', sub: 'PostGIS / ES', x: 640, y: 290, w: 130, kind: 'data', info: 'What it is: the database for things that stay put. Static, durable data: events, venues. PostGIS (GiST index + ST_DWithin) if you need relational queries, Elasticsearch if you need text search + filters.' },
      ],
      edges: [{ a: 'drv', b: 'loc' }, { a: 'usr', b: 'near' }, { a: 'loc', b: 'redis' }, { a: 'near', b: 'redis' }, { a: 'near', b: 'pg' }],
      scenarios: [
        { name: 'Driver location update', steps: [
          { title: 'A location arrives', text: 'Driver 42 sent a new location.', go: 'drv>loc', msg: 'POST /location  { "lat": 12.9756, "lng": 77.6067, "ts": 1791200000 }' },
          { title: 'Update in Redis', text: 'GEOADD on the same member overwrites the old location. Plus the last-seen time. Both are O(log N), in memory, microseconds.', go: ['loc>redis', 'res:redis>loc'], after: { redis: { sub: 'driver:42 moved' } }, msg: 'GEOADD drivers:tdr1 77.6067 12.9756 driver:42\nZADD drivers:lastseen 1791200000 driver:42' },
        ]},
        { name: 'Nearby drivers', steps: [
          { title: 'The user opened the app', text: 'A query with the rider\'s location.', go: 'usr>near', msg: 'GET /nearby/drivers?lat=12.9700&lng=77.6100&r=2km' },
          { title: 'GEOSEARCH', text: 'Redis reads 9 areas, drops the ones outside the circle, and returns 10 in order of distance.', go: ['near>redis', 'res:redis>near'], after: { redis: { state: 'hit' } }, msg: 'GEOSEARCH drivers:tdr1 FROMLONLAT 77.61 12.97 BYRADIUS 2 km ASC COUNT 10 WITHDIST' },
          { title: 'Filter + answer', text: 'Remove busy/offline drivers, compute the ETA, show them on the map. All in ~10-20 ms.', go: 'res:near>usr', msg: '[ { "driver": 42, "dist_km": 0.71 }, ... ]' },
        ]},
        { name: 'Events near you', steps: [
          { title: 'Query', text: 'This weekend, 5 km, comedy.', go: 'usr>near', msg: 'GET /nearby/events?lat=12.97&lng=77.61&r=5km&type=comedy' },
          { title: 'Geo filter on the index', text: 'The GiST index (or ES\'s geo index) gives the candidates within 5 km, together with the date/type filters.', go: ['near>pg', 'res:pg>near'], set: { redis: { state: 'dim' } }, after: { pg: { state: 'hit' } }, msg: 'SELECT ... WHERE ST_DWithin(location, :me, 5000) AND type = \'comedy\' ...' },
          { title: 'Answer', text: 'The data is static, so you can even cache this result for a few minutes (same cell + same filters).', go: 'res:near>usr' },
        ]},
        { name: 'Failure: ghost driver', steps: [
          { title: 'Phone off', text: 'Driver 77\'s phone is in a tunnel, or the app crashed. The updates stop.', go: 'lost:drv>loc' },
          { title: 'Still in the set', text: 'A sorted set member has no TTL. The rider sees a driver who is not really there.', go: ['usr>near', 'near>redis', 'res:redis>near', 'res:near>usr'], after: { redis: { state: 'warn', sub: 'driver:77 stale' } } },
          { title: 'Fix: last-seen cleanup', text: 'A cleanup job removes members whose last-seen is older than 30 seconds from both sets. And last-seen is also checked at query time.', go: ['loc>redis'], after: { redis: { state: '', sub: 'driver:77 removed' } }, msg: 'ZRANGEBYSCORE drivers:lastseen -inf (now-30)\nZREM drivers:tdr1 driver:77' },
        ]},
        { name: 'Failure: Redis node down', steps: [
          { title: 'A node fails', text: 'The Redis node holding drivers:tdr1 crashes.', set: { redis: { state: 'down', sub: 'DOWN' } }, go: 'lost:near>redis' },
          { title: 'Promote the replica', text: 'The replica becomes the primary (Sentinel/Cluster failover). Replication is async, so the last few updates may be lost.', after: { redis: { state: 'warn', sub: 'replica = primary' } }, focus: ['redis'] },
          { title: 'The data fills itself in', text: 'Every driver sends a location again within 4 seconds. In a few seconds the set is complete. Location is ephemeral data: that is why it does not need to be written to a durable DB on every update (if you need history, use a separate stream).', go: ['drv>loc', 'loc>redis'], after: { redis: { state: 'ok', sub: 'rebuilt in ~4 s' } } },
        ]},
      ],
    },

    { type: 'callout', tone: 'tip', title: 'Decide', html: `As soon as you see "near me": <strong>do not scan big data, use cells</strong> (geohash, quadtree, S2 or H3), always read your own cell + neighbours, then filter by real distance. The thing <strong>moves</strong> (drivers, live creators, delivery partners) → <strong>Redis GEO</strong> (in memory, fast writes, keys by area, last-seen cleanup). The thing <strong>stays put</strong> (events, venues, places) → <strong>Elasticsearch</strong> if you need text search + filters, <strong>PostGIS</strong> if the data is relational or you need polygons/geofences. Very different density → quadtree; covering the whole world or regions/polygons with cells → S2; analysis over areas (demand, surge) → H3.` },
    { type: 'table', head: ['Question', 'Answer'], rows: [
      ['10 lakh drivers, an update every 4 s, "the 10 closest"', 'Redis GEO, geohash-prefix keys, last-seen cleanup'],
      ['"Comedy events, 5 km, this weekend, under ₹500"', 'Elasticsearch: geo_distance filter + text + range'],
      ['"Which city zone is this pickup point in?" (polygon)', 'PostGIS: ST_Contains / ST_Within, GiST index'],
      ['Demand for every area of the city, every minute', 'Bucket into H3 cells and count'],
      ['A small app, 5,000 venues, already on Postgres', 'PostGIS is enough; do not bring a new system'],
    ]},

    { type: 'h2', text: 'The whole design at a glance' },
    { type: 'p', html: `The full map of xyz.com's "near me" features, with every rung in its place. Click a box, and use the buttons to see one path at a time.` },
    { type: 'diagram', title: 'Proximity search: the full picture', height: 620,
      nodes: [
        { id: 'drv', label: 'Driver app', sub: 'location / 4 s', x: 100, y: 70, kind: 'client', info: 'What it is: the app of a driver (or a live creator). It sends lat-lng every ~4 seconds. This is the source of lakhs of writes/sec.' },
        { id: 'loc', label: 'Location svc', sub: 'GEOADD', x: 360, y: 70, kind: 'server', info: 'What it is: the stateless service that writes locations. GEOADD into the right area key (drivers:tdr1), plus the last-seen time. It also puts the updates into a stream.' },
        { id: 'h3', label: 'Demand job', sub: 'H3 counts', x: 610, y: 70, kind: 'server', info: 'What it is: an analytics job (Rung 4). It puts every location into an H3 hexagon (like resolution 8, ~0.74 km²) and counts every minute: how many drivers and how much demand in each area.' },
        { id: 'redis', label: 'Redis GEO', sub: 'drivers:{geohash4}', x: 360, y: 230, kind: 'cache', info: 'What it is: geo sets in memory (Rungs 2, 5, 6). A separate key per area, member = driver, score = 52-bit geohash. A query reads its own + 8 neighbour areas.' },
        { id: 'clean', label: 'Cleanup job', sub: 'stale > 30 s', x: 610, y: 230, kind: 'server', info: 'What it is: a small cron job. A sorted set member has no TTL, so this job looks at last-seen and ZREMs drivers that have been silent for 30 seconds (the ghost driver fix).' },
        { id: 'usr', label: 'User app', sub: 'near me?', x: 100, y: 390, kind: 'client', info: 'What it is: a rider or viewer. Asks for "nearby drivers", "nearby creators", "events near you".' },
        { id: 'near', label: 'Nearby svc', sub: 'cells + filter', x: 360, y: 390, kind: 'server', info: 'What it is: the query service. Moving things from Redis GEO, static things from ES/PostGIS. Business filters on the candidates (available? blocked?), and growing the ring for k-nearest.' },
        { id: 'eta', label: 'Routing / ETA', sub: 'road distance', x: 610, y: 390, kind: 'server', info: 'What it is: a service that computes the real travel time on the road network (the general industry approach). The geo index gives straight-line distance; the final ranking uses the road ETA.' },
        { id: 'es', label: 'Elasticsearch', sub: 'text + geo_point', x: 220, y: 560, kind: 'data', info: 'What it is: a search engine (Rung 5). "Comedy, this weekend, 5 km, under ₹500": geo_distance filter + text + range in one query.' },
        { id: 'pg', label: 'PostGIS', sub: 'venues, zones', x: 500, y: 560, kind: 'data', info: 'What it is: Postgres + a geo extension (Rung 5). Venues and city zones (polygons). GiST index + ST_DWithin (radius), ST_Contains (which zone).' },
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
        { name: 'Location update', text: 'A driver sent a location. The location service did GEOADD into the right area key, and through the stream the demand job raised the H3 count.', go: ['drv>loc>redis', 'evt:loc>h3'] },
        { name: 'Nearby drivers', text: 'The user asked. The nearby service ran GEOSEARCH on its own + neighbour areas, ranked the candidates by ETA, and returned the top 10.', go: ['usr>near>redis', 'res:redis>near', 'near>eta', 'res:near>usr'] },
        { name: 'Events near you', text: 'Static data: geo + text + date in one Elasticsearch query. The zone question goes to PostGIS.', go: ['usr>near>es', 'res:es>near', 'near>pg', 'res:near>usr'] },
        { name: 'Ghost driver', text: 'The driver\'s phone died and the updates stopped. After 30 seconds the cleanup job removed them from the set.', go: ['bad:clean>redis'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Separate B-tree indexes on lat and lng do not understand 2D "near": each gives a long strip.</li>
      <li>The trick: split the map into cells, read only the nearby cells, then filter by real distance.</li>
      <li>Never read only your own cell (edge-of-cell). Own + 8 neighbours, or the cells covering the radius. Short side of a cell ≈ radius.</li>
      <li>Geohash = string cells, simple. Quadtree = follows density. S2 = the whole sphere, Hilbert order. H3 = hexagons, equal neighbours, area analysis.</li>
      <li>Moving points (drivers) → Redis GEO (memory, area keys, last-seen cleanup). Things that stay put → Elasticsearch (text + filters) or PostGIS (relational, polygons).</li>
      <li>PostGIS: ST_DWithin + GiST, geography type (meters). Redis: GEOSEARCH, longitude first.</li>
      <li>Scale: keys by area, split hot cells, grow the ring for k-nearest. Straight-line distance ≠ road distance.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Each query reads a few cells instead of the whole city: 10-100x less work', 'A cell ID is a normal key: a B-tree, a sorted set or a key-value store can all handle it', 'Redis GEO: microsecond writes, perfect for moving things', 'ES/PostGIS: text, filters, polygons and durability together with geo'],
      costs: ['Edge-of-cell: you must read neighbour cells, and the cell size must match the radius', 'Redis GEO: memory cost, no member TTL (you clean stale members yourself), one key on one shard', 'Density differences on a fixed grid: too many points in a crowded cell (handle with quadtree/H3 resolution)', 'Very fast updates are expensive in ES; mistakes like degrees vs meters in PostGIS', 'Distance is an approximation (Redis worst case ~0.5%); "straight-line distance" is not road distance'] },

    { type: 'think', questions: [
      { q: 'You need "the 5 closest creators" (k-nearest), and the radius is unknown. In crowded Mumbai you will find 5 within 200 m; in a village maybe not even within 20 km. How do you do it with cells?', a: 'Start with a small radius (own cell + neighbours). If you find fewer than 5, grow the radius/ring (bigger cells or the next ring) and try again. Keep an upper limit (like 50 km) so the loop does not run forever in an empty area. In Redis, GEOSEARCH ... ASC COUNT 5 gives the closest ones within one radius; the app runs the loop that grows the radius. In PostGIS, ORDER BY location <-> point LIMIT 5 gives an index-assisted k-nearest directly.' },
      { q: 'On IPL final day, 20,000 drivers are in one geohash cell outside the stadium. What can break?', a: 'One cell (and, if there is one key per cell, one Redis key/shard) becomes hot: all the writes and all the reads go there. Every query checks 20,000 candidates. Fix: higher precision (smaller cells) for that area, a limit with COUNT, a density-aware split like a quadtree, and splitting the key further. This is the hot key problem from the Traffic spikes lesson, just in geo form.' },
      { q: 'The rider saw a driver "within 2 km", but the driver took 15 minutes to arrive. Where is the mistake?', a: 'A geo index gives straight-line (as the crow flies) distance. There may be a river, a flyover or a one-way street in between. Real systems first take candidates from the geo index, then compute an ETA on the road network for them and rank by it. Proximity search is only the first, cheap filter.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'There are separate B-tree indexes on <code>lat</code> and <code>lng</code>. Why is a radius query slow?', options: ['B-trees do not support floats', 'Each index alone gives a long strip (a band around the whole world); a 2D box needs a big intersection of both', 'Indexes are always on disk'], answer: 1, explain: 'A B-tree sorts one dimension. For 2D you need cells (geohash/H3) or a spatial index (GiST/R-tree, BKD).' },
      { q: 'In the simulator, reading "own cell only" missed 66 of 89 creators. Why?', options: ['A hash collision', 'The user was at the edge of a cell; the nearby creators were in neighbour cells', 'The radius was too small'], answer: 1, explain: 'The edge-of-cell problem. Always read your own + 8 neighbours (or all cells covering the radius), then filter by distance.' },
      { q: 'Which command should you use today for a radius query in Redis?', options: ['GEORADIUS', 'GEOSEARCH ... BYRADIUS', 'ZRANGE'], answer: 1, explain: 'GEOSEARCH exists since Redis 6.2; the docs call GEORADIUS and GEORADIUSBYMEMBER deprecated.' },
      { q: 'Events within 5 km in PostGIS, using the index. Which query is right?', options: ['WHERE ST_Distance(location, me) < 5000', 'WHERE ST_DWithin(location, me, 5000) (geography type, GiST index)', 'WHERE lat - 12.97 < 0.05'], answer: 1, explain: 'ST_DWithin first uses the index with a bounding box, then the exact distance. With the geography type the units are meters.' },
      { q: 'When is a quadtree better than a fixed grid?', options: ['When points are spread evenly over the city', 'When density differs a lot (crowded neighbourhoods vs empty areas) and points do not move much', 'When lakhs of points move every second'], answer: 1, explain: 'A quadtree splits crowded areas into small boxes so that each box holds about the same number of points. In the lab the fullest fixed-grid box had 254 points; with a quadtree (limit 50) the max is 50.' },
      { q: 'Why does H3 use hexagons?', options: ['Hexagons are the easiest to calculate', 'All 6 neighbours of a hexagon are equally far, so rings (k-ring) look like circles and area analysis is clean', 'Hexagons cover the whole Earth with no other shape'], answer: 1, explain: 'The corner neighbours of a square are ~1.4 times farther; all neighbours of a hexagon are equal. (To cover the sphere, H3 also has 12 pentagons at every resolution.)' },
      { q: 'First choice for the live location of 10 lakh drivers?', options: ['Elasticsearch', 'Redis GEO (in memory, per-area keys)', 'Every update into Postgres, then a PostGIS query'], answer: 1, explain: 'Lakhs of writes/sec, ephemeral data, a simple query: an in-memory geo index. ES/PostGIS are for static, filter-heavy data.' },
    ]},
    { type: 'sources', note: 'Commands and behaviour were checked in the official docs. The inner details of geohash/quadtree/H3 are in the sources of the ds-for-scale lesson.', items: [
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
