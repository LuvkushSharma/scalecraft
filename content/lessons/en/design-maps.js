Lesson.register({
  id: 'design-maps',
  title: 'Google Maps',
  minutes: 40,
  summary: `Showing the map of the whole world smoothly, finding the fastest route through hundreds of millions of road segments in milliseconds, and knowing where the traffic is right now. Tiles, graph routing with precomputation, live traffic, ML for ETA, and offline maps.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You open a map on your phone and drag it with your finger. The map appears at once, whether you look at Delhi or a small village.<br>Then you type "India Gate", and in 1 second the app says: "41 minutes, via Ring Road, traffic ahead".<br>Behind this are three jobs: cutting the map of the whole world into small pieces in advance, finding the fastest path through a web of roads, and learning from millions of phones which road is jammed right now.<br>This lesson builds all three from zero, one by one.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper for 10 minutes: (1) how will the map of the whole world reach a phone, when the detail is different at every zoom? (2) How will you find the fastest route from Delhi to Jaipur when the road network has millions of intersections? (3) Where does the number "it will take 40 minutes now" come from? Then read on.` },

    { type: 'p', html: `Google Maps is a mix of three completely different problems, and each one has a different solution. That is why it is a great interview question: <strong>showing the map</strong> (static data, a huge number of reads, a game of CDNs), <strong>finding a route</strong> (a graph algorithm, a game of precomputation), and <strong>traffic + ETA</strong> (a game of streaming data and machine learning).` },
    { type: 'callout', tone: 'warn', title: 'What is public and what is not', html: `Google has never published the full internal architecture of Maps. In this lesson, the Google-specific parts come from their official blogs, the Google Maps Platform docs, and Google/DeepMind research papers (with the year each time). Other parts, like the exact choice of routing algorithm, are the <em>general industry approach</em>, and there we will say clearly that this is the textbook/open-source way, not Google\'s confirmed internal design.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• View the map: pan, zoom, rotate, the whole world<br>• Find a place: type "India Gate" or an address, get a pin on the map (geocoding)<br>• Route: A to B, by car / bike / walking, with alternatives<br>• Live traffic layer (red / yellow / green)<br>• ETA: "40 min, you will arrive by 6:52"<br>• Navigation: turn-by-turn, reroute if you miss a turn<br><br><strong>Out of scope:</strong> Street View, reviews, transit timetables` },
      right: { title: 'Non-functional', html: `• Smooth map: tiles in &lt; ~100 ms when you pan/zoom<br>• Fast route queries: even long routes in a few hundred ms<br>• Fresh traffic: minutes old, not hours<br>• Accurate ETA (in 2020 Google said ETAs were accurate for &gt;97% of trips)<br>• Privacy: nobody can track one single phone\'s movement<br>• Very high availability, all over the world` },
    },
    { type: 'callout', tone: 'term', title: 'New word: Geocoding', html: `<strong>What it is:</strong> an address or place name → latitude/longitude (two numbers that mark a place on Earth), like "India Gate, New Delhi" → 28.6129, 77.2295. <strong>Reverse geocoding</strong> is the opposite: coordinates → a readable address. The Google Maps Platform Geocoding API docs define exactly these two jobs.<br><strong>Why we need it:</strong> people type names, but routing and the map need numbers.<br><strong>Without it:</strong> users would have to type coordinates themselves, and "my current location" would never show an address.` },

    { type: 'h2', text: 'Step 2: showing the map, the tile pyramid' },
    { type: 'p', html: `First attempt: keep one giant image of the whole world on the server, and cut out whatever part the phone asks for. Problem: the server must cut an image on every pan/zoom (CPU), every user\'s view is slightly different so nothing can be cached, and when the zoom changes the detail must change too (zoomed out, no small streets, only highways).` },
    { type: 'p', html: `Solution: cut the world into small squares <strong>in advance</strong>, separately for each zoom level. At zoom 0, the whole world is one 256×256 pixel square. At zoom 1, each square splits into 4 (2×2), at zoom 2 into 16 (4×4)... At every zoom there are 4 times as many tiles. This is called the <strong>tile pyramid</strong>. Now every tile has a fixed address: <code>/{z}/{x}/{y}</code>. Same address = same bytes, for every user. That makes it a perfect thing to cache on a <a href="#/cdn">CDN</a>.` },
    { type: 'callout', tone: 'term', title: 'New word: Tile (and zoom level)', html: `<strong>What it is:</strong> a small square piece of the map (traditionally 256×256 pixels), like cutting a big photo into small square stickers. The <strong>zoom level z</strong> says into how many pieces the world is cut: 2<sup>z</sup> × 2<sup>z</sup> = 4<sup>z</sup> tiles. Each tile has the address <code>z/x/y</code>: zoom, column, row.<br><strong>Why we need it:</strong> the phone needs only the few tiles that are on the screen, and a tile at the same address is the same for everyone, so a CDN can cache it.<br><strong>Without it:</strong> the server would have to cut a new image for every user on every pan/zoom: wasted CPU and zero caching.` },
    { type: 'callout', tone: 'term', title: 'New word: Web Mercator', html: `<strong>What it is:</strong> a way to "stretch" the round Earth onto a flat square (a projection), like cutting an orange peel and spreading it flat on a table. To make a square, it cuts the map at about ±85° latitude (exactly ±85.0511° according to the OpenStreetMap wiki), so the poles never appear on web maps.<br><strong>Why we need it:</strong> a square world can be split into 4 squares again and again; the tile pyramid rests on this. The Google Maps Platform docs explain the same tile coordinates: at every zoom, the resolution doubles in both directions.<br><strong>Without it:</strong> finding the shape and address of a tile at each zoom would be very complex. The cost: things near the poles look too big (Greenland looks as big as Africa).` },
    { type: 'callout', tone: 'term', title: 'New word: CDN (Content Delivery Network)', html: `<strong>What it is:</strong> cache servers placed in cities all over the world that serve copies of files from near the user. Details are in the <a href="#/cdn">CDN lesson</a>.<br><strong>Why we need it:</strong> Delhi\'s tiles come from a server near Delhi, not from a faraway origin; and even if millions of people ask for one tile, the origin is asked only once.<br><strong>Without it:</strong> every tile request reaches our servers, with more delay and a huge bill.` },
    { type: 'p', html: `Move the slider. See how fast the number of tiles grows, and how many tiles one phone screen actually needs:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Zoom level: <strong class="gmz-v"></strong></label><input class="gmz" type="range" min="0" max="20" value="15"></div>
          <div><label>Place</label><select class="gmp"><option value="28.6129,77.2295">India Gate, Delhi</option><option value="18.9220,72.8347">Gateway of India, Mumbai</option><option value="59.3293,18.0686">Stockholm (far north)</option></select></div>
          <div><label>Screen</label><select class="gmv"><option value="390,844">Phone (390×844)</option><option value="1440,900">Laptop (1440×900)</option></select></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Tiles at this zoom</span><strong class="gm-t"></strong></div>
          <div class="stat"><span>Total from zoom 0 to here</span><strong class="gm-c"></strong></div>
          <div class="stat"><span>Storage for this zoom (assuming 20 KB/tile)</span><strong class="gm-s"></strong></div>
          <div class="stat"><span>1 pixel = on the ground</span><strong class="gm-m"></strong></div>
          <div class="stat"><span>The screen needs</span><strong class="gm-n"></strong></div>
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
        q('.gm-note').innerHTML = `Blue box = your screen. Grey squares = the tiles that will be downloaded, addresses <code>/${z}/${x0}/${y0}</code> to <code>/${z}/${x1}/${y1}</code>. The world has ${fmt(tiles)} tiles, but the screen needs only ${need}: a map is very read-heavy and very cache-friendly.`;
      };
      ['.gmz', '.gmp', '.gmv'].forEach(c => q(c).addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `Notice two things. (1) At zoom 18 there are ~68.7 billion tiles (the OpenStreetMap wiki gives the same number), and from zoom 0 to 19 the total is ~366 billion. In 2010 Google wrote that 20 zoom levels for the whole world needed more than 360 billion image tiles: the same number. (2) The phone needs only ~10-20 tiles at a time. The storage is huge, but every request is small and cacheable.` },
    { type: 'image', src: 'assets/img/design-maps/osm-tiles-india-gate-zooms.jpg', alt: 'Three real map tiles side by side: at zoom 7, Delhi and nearby cities; at zoom 11, the roads of South Delhi; at zoom 16, India Gate and Children\'s Park. Under each tile is its z/x/y address.', caption: 'One place (India Gate), three zoom levels, three different tiles. Each tile is 256×256 pixels, but the zoom 7 tile shows an area ~275 km wide and the zoom 16 tile only ~540 m. The address under each tile is the tile\'s "name", which the CDN uses to cache it. (OpenStreetMap tiles, not Google\'s; the idea is the same.)', credit: { text: '© OpenStreetMap contributors (tiles arranged for this course)', url: 'https://www.openstreetmap.org/copyright', license: 'ODbL' } },
    { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "all tiles must be rendered in advance"', html: `No. At zoom 18-20, most tiles are ocean, desert or forest that look exactly the same. In the industry, popular areas and low zoom levels are usually rendered in advance, and rare deep-zoom tiles are built on the first request (render on demand) and then cached. Identical "empty blue" tiles can all point to one single file. This is the general approach; Google\'s exact method is not public.` },

    { type: 'h3', text: 'Raster tiles vs vector tiles' },
    { type: 'p', html: `At first, every tile was an <strong>image</strong> (PNG): roads, labels, everything "baked in" as pixels. In December 2010 (Google Maps 5.0 for Android), the Google Maps blog explained that they moved the mobile app to <strong>vector tiles</strong>: a tile is no longer an image, but a "blueprint" of the map\'s geometry (here is a road line, this is a building\'s outline, this is a name), and the phone draws the map from it itself.` },
    { type: 'compare',
      left: { title: 'Raster (image) tiles', html: `• Rendered on the server, the phone only shows it (less work for the phone)<br>• Zoom in 2× and lines and text get blurry; so fixed zoom levels, with new tiles downloaded at every level<br>• Rotate the map and labels turn upside down<br>• Every style (dark mode, satellite overlay) = separate tiles<br>• Separate data for every zoom: more storage and downloads` },
      right: { title: 'Vector tiles', html: `• Drawn on the phone with the GPU (more work for the device)<br>• One vector tile works for several zoom levels; smooth zoom, sharp text<br>• Tilt, rotate, 3D buildings, labels always upright<br>• Same data, different style (night mode) on the client<br>• Google 2010: "less than 1/100th" of the data across all zoom levels, which made offline caching possible` },
    },
    { type: 'callout', tone: 'term', title: 'New word: Vector tile', html: `<strong>What it is:</strong> a tile that holds data about shapes, not pixels: points (places), lines (roads, rivers), polygons (buildings, parks), plus their attributes (name, road type). The phone draws them itself following a <strong>style</strong> (rules for colours and thick or thin lines). In the open-source world, the Mapbox Vector Tile format is a popular standard for this idea.<br><strong>Why we need it:</strong> less data, smooth zoom/rotate, upright labels, dark mode without a new download, and offline maps become possible.<br><strong>Without it (only raster images):</strong> separate tiles to download for every zoom and every style, blurry text when zooming, and it is hard to fit a big area\'s offline map on a phone.` },

    { type: 'h2', text: 'Step 3: API and core entities' },
    { type: 'code', text: `
GET  /tiles/{z}/{x}/{y}?style=v2          → vector tile (from CDN, long cache TTL)
GET  /geocode?q=India+Gate                → [{ place_id, lat, lng, address }]
GET  /reverse-geocode?lat=..&lng=..       → { address }
POST /routes
     { origin, destination, mode: "DRIVE", departure_time: "now", alternatives: true }
  →  [{ polyline, distance_m: 23100, eta_s: 2460, steps: [...] }, ...]
POST /location-updates   (only if the user turned on location sharing)
     [{ ts, lat, lng, speed, heading }, ...]   ← in batches, every few seconds` },
    { type: 'table', head: ['Entity', 'What it is', 'Where it lives'], rows: [
      ['Road graph', 'Node = intersection, edge = road segment (length, speed limit, one-way, turn restrictions, toll)', 'In the memory of the routing servers, split by region'],
      ['Segment speed', 'The current speed of each segment + its historical speed pattern (day, hour)', 'Fast key-value store, updated by the traffic pipeline'],
      ['Place', 'Name, address, category, lat/lng, place_id', 'Text search index + geo index'],
      ['Tile', 'Vector data for z/x/y', 'Object storage + CDN'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Graph (road network)', html: `<strong>What it is:</strong> dots (<strong>nodes</strong>) and the lines that join them (<strong>edges</strong>). In a road network, every intersection is a node, and the road between two intersections is an edge. Every edge has a <strong>weight</strong>: how long it takes to drive that road. Fastest route = the path in the graph with the smallest total weight.<br><strong>Why we need it:</strong> "finding a route" becomes a maths problem that already has good algorithms (Dijkstra, A*).<br><strong>Without it:</strong> the computer has no way to understand "roads"; the map would only be a picture.` },

    { type: 'h2', text: 'Step 4: high-level design' },
    { type: 'p', html: `There are three separate paths: <strong>tiles</strong> (huge volume, static, CDN), <strong>search/geocoding</strong> (text + geo index), and <strong>routing</strong> (graph + live speeds). To keep the diagram simple, the load balancer and API gateway in front of each service are counted as part of the same box. Run all the scenarios:` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'app', label: 'Maps app', sub: 'phone / browser', x: 80, y: 165, w: 124, kind: 'client', info: 'What it is: the Maps app on the user\'s phone, or a browser. It draws vector tiles itself, shows the route line, and tracks its own position with GPS during navigation.' },
        { id: 'cdn', label: 'CDN', sub: 'tiles cache', x: 280, y: 55, w: 130, kind: 'edge', info: 'What it is: cache servers placed near cities. A tile\'s address (z/x/y) is fixed and its content is the same for everyone, so tiles are cached at the CDN edge with a long TTL. Most tile requests end here and never reach the origin.' },
        { id: 'tiles', label: 'Tile store', sub: 'pre-built + render', x: 560, y: 55, w: 170, kind: 'data', info: 'What it is: the real home (origin) of all tiles. Pre-built tiles in object storage (low zooms and popular areas). A rare deep-zoom tile can be rendered and stored the first time it is requested. When map data changes (a new road), only the affected tiles are rebuilt. This is the general approach.' },
        { id: 'places', label: 'Places / Geocode', sub: 'text + geo index', x: 320, y: 165, w: 160, kind: 'server', info: 'What it is: the service that finds places. It turns "India Gate" or an address into lat/lng. Inside, there is a text search index (typos, synonyms) and a geo index (nearby places first). See the <a href="#/search">search lesson</a> for text search and <a href="#/ds-for-scale">geohash/S2/H3</a> for the geo index.' },
        { id: 'route', label: 'Routing', sub: 'graph in memory', x: 320, y: 275, w: 150, kind: 'server', info: 'What it is: the service that finds routes. The road graph is in memory, split by region (the detailed graph of the whole world plus its precomputed data is hard to fit on one machine). With precomputation (like contraction hierarchies), even long routes take milliseconds. It finds a few candidate routes, then the ETA model ranks them.' },
        { id: 'traffic', label: 'Live speeds', sub: 'per road segment', x: 580, y: 275, w: 160, kind: 'data', info: 'What it is: a store of speeds for every piece of road (segment). The current speed of each road segment (from the live traffic pipeline, updated every few minutes) and its historical pattern (the usual speed on this road at 9 am on a Monday). Routing uses these as edge weights.' },
      ],
      edges: [{ a: 'app', b: 'cdn' }, { a: 'cdn', b: 'tiles' }, { a: 'app', b: 'places' }, { a: 'app', b: 'route' }, { a: 'route', b: 'traffic' }, { a: 'traffic', b: 'tiles', id: 'tt', dashed: true, hidden: true }],
      scenarios: [
        { name: 'Open the map (CDN hit)', intro: 'The most common request. It must be the cheapest.', steps: [
          { title: 'Ask for the screen\'s tiles', text: 'From its position and zoom, the app works out which ~12 tiles it needs, and asks for all of them in parallel.', go: 'app>cdn', msg: 'GET /tiles/15/23413/13664?style=v2  (and ~11 more)' },
          { title: 'CDN: HIT', text: 'Thousands of people ask for these Delhi tiles every minute, so they are already at the edge. No request went to the origin.', go: 'res:cdn>app', after: { cdn: { state: 'hit' }, tiles: { state: 'dim' } } },
          { title: 'Draw on the phone', text: 'These are vector tiles, so the phone\'s GPU draws them. Zoom in a little and the same data is drawn again at the new scale, with no new download.', focus: ['app'] },
        ]},
        { name: 'Tile miss', steps: [
          { title: 'Rare tile', text: 'Someone opened a faraway village at zoom 19. It is not at the edge.', go: ['app>cdn', 'cdn>tiles'], after: { cdn: { state: 'miss' } }, msg: 'GET /tiles/19/...  → MISS' },
          { title: 'Fetch from origin, cache it', text: 'It came from the tile store (or was rendered right then), and the CDN kept a copy. The next user in this area gets it fast.', go: ['res:tiles>cdn', 'res:cdn>app'], after: { cdn: { state: '' } } },
        ]},
        { name: 'Find a route', steps: [
          { title: 'Find the destination', text: 'The user typed "India Gate". The places service turned the name into coordinates and a place_id.', go: ['app>places', 'res:places>app'], msg: 'GET /geocode?q=India+Gate  →  28.6129, 77.2295' },
          { title: 'Route request', text: 'Now both origin and destination are coordinates.', go: 'app>route', msg: 'POST /routes { origin, destination, mode: DRIVE, departure_time: now }' },
          { title: 'Edge weights = current speeds', text: 'Routing needs to know how long each segment takes: the live speed where fresh data exists, otherwise the historical pattern.', go: ['route>traffic', 'res:traffic>route'] },
          { title: 'Candidates + ETA', text: 'Routing finds a few good candidate routes, the ETA model predicts the travel time of each, and the best comes first.', go: 'res:route>app', msg: '[{ eta: 41 min, via Ring Road }, { eta: 46 min, via NH48 }]' },
        ]},
        { name: 'Traffic layer', steps: [
          { title: 'Where do the red/yellow lines come from?', text: 'Traffic colours are separate overlay tiles that are rebuilt often from live speeds. Their CDN TTL is very short (minutes); the base map\'s is long (days).', show: ['tt'], go: 'evt:traffic>tiles' },
          { title: 'The app asks for the overlay', text: 'Base tiles from the cache, traffic overlay fresh. There are two separate layers so that a traffic change does not force a download of the whole map again.', go: ['app>cdn', 'res:cdn>app'] },
        ]},
        { name: 'Failure: stale traffic data', steps: [
          { title: 'The pipeline stalled', text: 'The live traffic pipeline is lagging; the speeds are 20 minutes old.', set: { traffic: { state: 'warn', sub: '20 min old' } }, focus: ['traffic'] },
          { title: 'Routing degrades, it does not stop', text: 'After a limit, routing stops trusting the old data and falls back to historical speeds. Routes still come back; the ETA is just a little less accurate. This is <strong>graceful degradation</strong> (general practice).', go: ['app>route', 'route>traffic', 'res:traffic>route', 'res:route>app'], msg: 'eta: 44 min (historical-only)' },
        ]},
        { name: 'Failure: tile store down', steps: [
          { title: 'The origin fell over', text: 'One region of the tile store is down.', set: { tiles: { state: 'down', sub: 'DOWN' } } },
          { title: 'The CDN serves an old tile', text: 'Popular tiles are already in the CDN. The CDN can be set up to serve even an expired copy when the origin returns an error (stale-if-error). The map is a little old, but it keeps showing. Only rare tiles that nobody has viewed before will fail.', go: ['app>cdn', 'res:cdn>app'], after: { cdn: { state: 'warn', sub: 'stale serve' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 1: the fastest route, from Dijkstra to contraction hierarchies' },
    { type: 'p', html: `Think of India\'s road network: millions of intersections. A user asks for "Delhi to Jaipur" and wants the answer in ~100 ms, and there are thousands of such requests every second. Which algorithm?` },
    { type: 'steps', items: [
      { t: 'Dijkstra (1959)', d: 'Start at the source. Each time, pick the node that can be reached in the least time so far, and update the times of its neighbours. It spreads out in every direction like a circle until it reaches the destination. It gives the correct answer, but for Delhi to Jaipur it will also explore the streets of Chandigarh and Agra, because it has no sense of direction.' },
      { t: 'A* (A-star)', d: 'Dijkstra + a guess (heuristic): "what is the least time from this node to the destination?" Straight-line distance ÷ the fastest possible speed. This guess is never more than the real time, so the answer stays correct, but the search leans towards the destination. The circle now looks like an egg (ellipse).' },
      { t: 'Bidirectional search', d: 'One search goes forward from the source, one goes backward from the destination; stop as soon as they meet in the middle. Two small circles cover less area than one big circle.' },
      { t: 'Precomputation: contraction hierarchies (CH)', d: 'The real trick: do work in advance (offline) to save work at query time. Details below.' },
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Priority queue', html: `<strong>What it is:</strong> a list from which the item with the smallest number always comes out first, even if it was added later. Like a hospital emergency line: the most serious case goes first.<br><strong>Why we need it:</strong> at every step, Dijkstra needs "the intersection that can be reached in the least time so far". A priority queue gives it right away.<br><strong>Without it:</strong> at every step you would have to look at all intersections to find the minimum, which is very slow on a big graph.` },
    { type: 'callout', tone: 'term', title: 'New word: Heuristic (A*\'s guess)', html: `<strong>What it is:</strong> a cheap guess of "the least time it will take from here to the destination". In maps: straight-line distance ÷ the fastest possible speed.<br><strong>Why we need it:</strong> A* keeps each intersection in the queue by <code>f = g + h</code>: g = the real time from the start to here, h = the guess for the rest. This makes the search lean towards the destination.<br><strong>Without it (h = 0):</strong> A* becomes exactly Dijkstra. And if the guess says <em>more</em> than the real time, A* can return a wrong (longer) route; so the guess must always be an "at least" value.` },
    { type: 'p', html: `Now run it one step at a time. We need to go from S to G. The number on each line = minutes. On every "Next step", the algorithm takes the smallest item out of the queue, marks that intersection as <strong>final</strong> (settled), and updates the times of its neighbours:` },
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
      el.innerHTML = `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button type="button" class="chip on" data-a="d">Dijkstra</button><button type="button" class="chip" data-a="a">A* (with a guess)</button></div>
        <svg class="dj-svg" viewBox="0 0 340 222" style="width:100%;max-width:520px;display:block;margin:0 auto"></svg>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0"><button type="button" class="btn small primary dj-n">Next step</button><button type="button" class="btn small dj-all">Run to the end</button><button type="button" class="btn small ghost dj-r">Reset</button></div>
        <div class="stats"><div class="stat"><span>Settled intersections</span><strong class="dj-c"></strong></div><div class="stat"><span>Just taken out</span><strong class="dj-u"></strong></div><div class="stat"><span>S → G time</span><strong class="dj-t"></strong></div></div>
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
        q('.dj-q').textContent = (st.end ? `Done! Route ${route()}, ${st.g.G} min. ${astar ? 'A* never settled P and Q (the ones in the opposite direction): 7 intersections.' : 'Dijkstra settled every intersection, even P and Q in the opposite direction: 9 intersections.'}\n` : '') + 'Colours: blue = just taken out, green = settled, yellow = in the queue.\nQueue (smallest first):\n' + (qs || '(empty)') + (astar ? '\nh = straight-line distance, rounded down (never says too much).' : '');
      };
      el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { astar = b.dataset.a === 'a'; el.querySelectorAll('[data-a]').forEach(x => x.classList.toggle('on', x === b)); reset(); draw(); }));
      q('.dj-n').onclick = () => { step(); draw(); };
      q('.dj-all').onclick = () => { while (!st.end) step(); draw(); };
      q('.dj-r').onclick = () => { reset(); draw(); };
      reset(); draw();
    }},
    { type: 'p', html: `Did you see? After S, Dijkstra picked B, then <strong>P and Q</strong>, which are in the opposite direction from G, because they were "close". For A*, P had <code>f = 4 + 10 = 14</code> (close, but far from G), so it stayed at the back of the queue. Both found the same answer: S → B → F → G, 13 min. The only difference is the effort: 9 vs 7 intersections. In a real city, this difference becomes thousands of times bigger.` },
    { type: 'h3', text: 'Contraction hierarchies, in simple words' },
    { type: 'p', html: `This technique was given in a 2008 paper by Geisberger, Sanders, Schultes and Delling, researchers in Karlsruhe (Germany). The idea comes from one observation: a long trip always goes a little through small streets, then on big roads/highways, and at the end through small streets again. No Delhi-Jaipur route passes through the lane of some village in between.` },
    { type: 'list', ordered: true, items: [
      '<strong>Importance order</strong>: give every node an "importance" rank (a small street corner is less important, a highway junction more). In the paper, this order is built with heuristics, like "how many shortcuts would removing this node create".',
      '<strong>Contract</strong>: "remove" the least important node from the graph. If the shortest path between two of its neighbours went through this node, add a <strong>shortcut</strong> edge between those two (weight = the sum of both edges). If another equally good path (a witness) exists, no shortcut is needed.',
      '<strong>Repeat</strong> until all nodes have been contracted in some order. This preprocessing is done offline, once (or when the map data changes).',
      '<strong>Query</strong>: a bidirectional search, but with a rule: the forward search only goes towards <em>more important</em> nodes, and so does the backward one. Both "climb up" and meet at some important node. Very few nodes are explored.',
      '<strong>Unpack</strong>: the answer contains shortcuts; open each shortcut through the node in its middle, again and again, and you get the real road route.',
    ]},
    { type: 'p', html: `A small example. Three intersections in a line: <code>A —3 min— X —2 min— B</code>. X is a small street corner (less important). "Remove" (contract) X: the shortest path from A to B went through X, so add a shortcut <code>A —5 min— B</code>, and remember that it goes "through X". Now a query gets from A to B in one jump. When the full route must be shown, open the shortcut back into "A → X → B".` },
    { type: 'ascii', text: `
 Before:      A ──3── X ──2── B          (X = small street corner, less important)

 Contract X:  A ─────── 5 ─────── B      shortcut, remembers: "via X"
                  (X is still in the graph, but queries no longer touch it)

 Query:       start → up (important) → up → meet ← up ← up ← destination` },
    { type: 'callout', tone: 'term', title: 'New word: Shortcut edge', html: `<strong>What it is:</strong> an artificial edge that joins two nodes directly, with a weight equal to the real path between them. It is a "remembered shortest path".<br><strong>Why we need it:</strong> a query does not have to look at thousands of small intersections in between, one by one; it just jumps across a few shortcuts. According to the paper, CH gave queries about 5 times faster than earlier hierarchical techniques, and even with the shortcuts added, its data structure took less space than the input graph.<br><strong>Without it:</strong> every query would have to explore all the intersections of a long route (like Dijkstra/A*), which is very slow on a big country\'s graph.` },
    { type: 'callout', tone: 'term', title: 'New word: Precomputation', html: `<strong>What it is:</strong> doing expensive work once, offline, <em>before</em> queries arrive, and keeping the result, so that every query becomes cheap. Like making a formula sheet before an exam.<br><strong>Why we need it:</strong> the road network does not change every day, but thousands of route queries arrive every second. Work done once pays off across millions of queries.<br><strong>Without it:</strong> every query would do the full work itself; both the CPU bill and the delay go up.` },
    { type: 'p', html: `Run it yourself. This is a small road network: thin lines are streets, thick lines are highways (at least 2.5× faster than streets). Every algorithm finds the same route and the same time; the only difference is how many nodes it had to check:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Trip</label><select class="gr-trip"><option value="0,53">Corner to corner (long)</option><option value="45,8">Bottom-left to top-right</option><option value="18,35">Short trip</option></select></div>
          <div><label>Algorithm</label><div class="gr-alg" style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="chip on" data-a="d">Dijkstra</button><button type="button" class="chip" data-a="a">A*</button><button type="button" class="chip" data-a="c">CH</button></div></div>
        </div>
        <svg class="gr-svg" viewBox="0 0 340 220" style="width:100%;max-width:560px;display:block;margin:10px auto"></svg>
        <div class="stats">
          <div class="stat"><span>Nodes explored</span><strong class="gr-x"></strong></div>
          <div class="stat"><span>Route time</span><strong class="gr-d"></strong></div>
          <div class="stat"><span>Count for all three (D / A* / CH)</span><strong class="gr-all"></strong></div>
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
        q('.gr-note').textContent = alg === 'c' ? `CH: preprocessing added ${shortcuts} shortcuts (once, offline). The query only goes "up" (towards more important nodes), so there are very few yellow dots. Route and time are exactly the same.` : alg === 'a' ? 'A*: a search that leans towards the destination. Very good on a short trip (here even fewer nodes than CH), but on a long trip it still explores many nodes, because the guess (straight line, highway speed) is far too optimistic compared with the real speed on streets.' : 'Dijkstra: spreads in every direction. Yellow dots = explored nodes. On a long trip, almost the whole graph.';
      };
      el.querySelectorAll('.gr-alg .chip').forEach(b => b.addEventListener('click', () => { alg = b.dataset.a; el.querySelectorAll('.gr-alg .chip').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
      q('.gr-trip').addEventListener('input', draw);
      draw();
    }},

    { type: 'p', html: `In the widget, on the long trip Dijkstra explores ~49 nodes, A* ~43, and CH only ~15. On a real road network this gap becomes huge: the bigger the graph, the bigger CH\'s advantage, because the important nodes you "climb up" to are few. On a short trip, A* is also quite good.` },
    { type: 'callout', tone: 'warn', title: 'Twist: if traffic changes, are the shortcuts wrong?', html: `CH shortcuts are based on edge weights. If live traffic changes the weights every few minutes, must the whole preprocessing run again? That is very expensive. The answer from research and open-source routing engines: split preprocessing into two parts. (1) The <em>structure</em> of the graph (which nodes are important, region boundaries): once, expensive, offline. (2) Putting in the new weights and quickly updating the weights of the shortcuts ("customization"): in seconds. Customizable Contraction Hierarchies and partition-based techniques work on this idea. Google has not published its exact routing algorithm; this is the standard industry/research approach.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "fastest route = shortest distance"', html: `No. Edge weight = <em>time</em>, not distance, and time changes with traffic, speed limits, turns and signals. And the "best" route is not just the fastest one either: according to Google\'s 2020 Maps blog, choosing a route also looks at road quality (paved or unpaved), road size, how direct it is, tolls, and official data (speed limits, restrictions). In 2023 Google Research said that by learning from the routes real drivers choose (inverse reinforcement learning), they improved how well their suggested routes match real routes by 16-24% (relative).` },

    { type: 'h2', text: 'Deep dive 2: where does live traffic come from?' },
    { type: 'p', html: `Problem: routing needs the speed of every road <em>right now</em>. Putting a sensor on every road is impossible. In its official blog in August 2009, Google described its method: users who have turned on location (My Location) on their phone send small <strong>anonymous</strong> pieces of speed and location data. Combine the speeds of many phones moving on one road, and you get that road\'s live speed. According to Google\'s 2020 "Google Maps 101" post, this aggregated location data comes from more than 220 countries and territories.` },
    { type: 'p', html: `The same 2009 post also named two difficulties: <strong>scale</strong> (without enough phones the data is useless) and <strong>privacy</strong>. For privacy, they wrote that the data of many people in an area is combined so that one phone cannot be singled out, and that the <strong>start and end points</strong> of every trip are <strong>permanently deleted</strong>, so nobody can learn where a car started or where it stopped.` },
    { type: 'callout', tone: 'term', title: 'New word: Map matching', html: `<strong>What it is:</strong> "snapping" a GPS point onto the right <strong>road segment</strong> (a piece of road between two intersections). GPS is a little off (an error of 10-20 m is normal): on top of the flyover or under it? Service lane or main road? Looking at many points in a row and the direction, the most likely road is chosen.<br><strong>Why we need it:</strong> a speed must belong to a road, not to a point in the air.<br><strong>Without it:</strong> the speed of a car doing 60 km/h on a flyover would be written onto the jammed road below, and both roads would show the wrong traffic.` },
    { type: 'callout', tone: 'term', title: 'New word: Aggregation (median)', html: `<strong>What it is:</strong> combining the speeds of many phones into one number. <strong>Median</strong> = line up all the speeds from smallest to largest and take the middle one. If one person stopped for tea (0 km/h), the median does not change, but the average does.<br><strong>Why we need it:</strong> a road needs one "current speed", and for privacy no single phone\'s data should leave the system.<br><strong>Without it:</strong> one or two odd phones would show the wrong traffic for the whole road, and one person\'s movement could be identified.` },

    { type: 'p', html: `The shape of the pipeline is below. Google has not published these boxes in this form; this is the general industry design for streaming systems that implements the points of the 2009 post (anonymous speeds, aggregation, deleting trip ends). See <a href="#/kafka">Kafka</a> for the queue and the <a href="#/big-data">big data lesson</a> for windowing.` },
    { type: 'flow', title: 'Live traffic pipeline (general design)', height: 330,
      nodes: [
        { id: 'ph', label: 'Phones', sub: 'location on', x: 75, y: 85, w: 120, kind: 'client', info: 'What it is: people\'s phones, the source of traffic data. Only phones that have turned on location sharing. They send points from every few seconds in batches (to save battery and data), with anonymous IDs.' },
        { id: 'in', label: 'Ingest', sub: 'queue / log', x: 235, y: 85, w: 120, kind: 'queue', info: 'What it is: a line (queue/log) of incoming points. The firehose of points from millions of phones. A durable queue/log (like Kafka) sits in between, so that if processing is slow, no data is lost; only a backlog builds up.' },
        { id: 'mm', label: 'Map matching', sub: 'point → segment', x: 400, y: 85, w: 140, kind: 'server', info: 'What it is: the service that snaps GPS points onto the right road segment and computes a speed for each segment. The privacy steps happen here: cut off the start and end parts of each trip.' },
        { id: 'ag', label: 'Aggregator', sub: 'per segment, 1 min', x: 590, y: 85, w: 150, kind: 'server', info: 'What it is: the service that combines the speeds of many phones into one number. For each segment, it combines the speeds of all phones in a short time window (say 1 minute): a robust average like the median, and a minimum number of phones. Too few phones = the data is not reliable (and for privacy, too little data is not published).' },
        { id: 'hs', label: 'Historical', sub: 'speed patterns', x: 120, y: 245, w: 150, kind: 'data', info: 'What it is: a record of "normal" speeds built from old data. The usual pattern of each segment: the speed at 9 am on a Monday, and at 9 am on a Sunday. According to Google\'s 2020 post, ETA combines this historical database with live data.' },
        { id: 'rt', label: 'Routing + ETA', sub: 'edge weights', x: 370, y: 245, w: 150, kind: 'server', info: 'What it is: the part that finds the route and the arrival time. The routing engine and the ETA model. Edge weights come from live speeds; where live data is missing or old, from historical data.' },
        { id: 'sp', label: 'Live speeds', sub: 'segment → km/h', x: 590, y: 245, w: 150, kind: 'data', info: 'What it is: a store of the current speed of every segment. The latest aggregated speed of each segment and its timestamp. Routing reads from here, and traffic overlay tiles are also built from it.' },
      ],
      edges: [{ a: 'ph', b: 'in' }, { a: 'in', b: 'mm' }, { a: 'mm', b: 'ag' }, { a: 'ag', b: 'sp' }, { a: 'sp', b: 'rt' }, { a: 'hs', b: 'rt' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Phones send points', text: 'Thousands of phones on Ring Road, each sending its points in batches.', flood: { paths: ['evt:ph>in'], n: 8 }, msg: '[{ t, lat, lng, speed: 18 km/h }, ...]' },
          { title: 'Snap to a segment', text: 'Map matching placed the points on the segment "Ring Road, Dhaula Kuan → AIIMS, eastbound" and computed each phone\'s speed.', go: 'evt:in>mm>ag' },
          { title: 'One combined number', text: 'This minute, 140 phones on this segment, median speed 17 km/h. No single phone\'s data goes out, only the aggregate.', go: 'evt:ag>sp', after: { sp: { state: 'hot', sub: 'Ring Rd: 17 km/h' } } },
          { title: 'Routing uses it', text: 'The next route request will treat this segment as slow and may choose another road.', go: ['rt>sp', 'res:sp>rt'] },
        ]},
        { name: 'Privacy: trip ends', steps: [
          { title: 'A trip starts at home', text: 'A phone\'s trip started outside a house and ended at an office.', go: 'evt:ph>in>mm' },
          { title: 'Erase the start and the end', text: 'According to Google\'s 2009 post, the start and end points of a trip are permanently deleted. Only the speeds in between go on, and even those are combined with other phones.', set: { mm: { state: 'ok', sub: 'ends trimmed' } }, go: 'evt:mm>ag' },
        ]},
        { name: 'Empty road', steps: [
          { title: 'A village road at 3 am', text: 'Only one phone on this segment in the last 10 minutes. One phone\'s data is not reliable (maybe it stopped for tea), and for privacy it should not be published either.', go: 'evt:ph>in>mm>ag', after: { ag: { state: 'warn', sub: 'too few phones' } } },
          { title: 'Fall back to historical', text: 'Routing uses the historical pattern for this segment: "at 3 am the usual speed here is 50 km/h".', go: ['rt>hs', 'res:hs>rt'] },
        ]},
        { name: 'Failure: pipeline lag', steps: [
          { title: 'Map matching is slow', text: 'A bug or a traffic spike (evening rush) left map matching behind. A backlog is building up in the queue; no data is lost.', set: { mm: { state: 'hot', sub: 'overloaded' } }, flood: { paths: ['evt:ph>in'], n: 8 }, after: { in: { state: 'warn', sub: 'backlog 8 min' } } },
          { title: 'Old speeds', text: 'The live speeds\' timestamp is old. After an age limit, routing gives the live speed less weight and leans towards historical data. Old-but-honest data is better than wrong-but-"fresh" data.', set: { sp: { state: 'warn', sub: '8 min old' } }, go: ['rt>hs', 'res:hs>rt'] },
          { title: 'Scale out, catch up', text: 'Add more map matching workers (according to the queue partitions) and the backlog clears. Monitoring should alert on "data age > X min", not just on errors.', set: { mm: { state: 'ok', sub: 'scaled out' } }, go: 'evt:in>mm>ag>sp', after: { in: { state: '', sub: 'queue / log' }, sp: { state: '', sub: 'segment → km/h' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 3: ETA, why "the current speed" is not enough' },
    { type: 'p', html: `The simple way: take the current speed of every segment on the route, add up the times, and that is the ETA. Problem: you will not reach that segment <em>now</em>, but 25 minutes later, and by then rush hour may have started there. DeepMind\'s 2020 blog said the same: live traffic does not tell you what the road will be like in 10, 20 or 50 minutes. See for yourself below (the speeds come from a made-up "historical pattern"):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>Time you leave home: <strong class="et-tv"></strong></label><input class="et-t" type="range" min="0" max="16" value="6">
        <div class="et-bars" style="display:grid;gap:6px;margin:10px 0"></div>
        <div class="stats">
          <div class="stat"><span>ETA from "current speed"</span><strong class="et-a"></strong></div>
          <div class="stat"><span>Time-aware ETA (real)</span><strong class="et-b"></strong></div>
          <div class="stat"><span>Error</span><strong class="et-e"></strong></div>
        </div>
        <div class="calc-note et-note"></div>`;
      const q = s => el.querySelector(s);
      // 4 segments of 10 km. speed(t) = free - drop * triangle around rush centre (minutes after 7:00)
      const S = [{ n: 'Expressway', f: 70, d: 42, c: 120, w: 75 }, { n: 'Flyover', f: 50, d: 30, c: 135, w: 75 }, { n: 'Ring Road', f: 45, d: 27, c: 150, w: 75 }, { n: 'City centre', f: 35, d: 20, c: 160, w: 75 }];
      const sp = (s, t) => s.f - s.d * Math.max(0, 1 - Math.abs(t - s.c) / s.w);
      const hm = m => { const t = 7 * 60 + Math.round(m); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
      const upd = () => {
        const t0 = Number(q('.et-t').value) * 15; let naive = 0, t = t0, rows = '';
        S.forEach(s => { naive += 10 / sp(s, t0) * 60; const v = sp(s, t); rows += `<div style="display:flex;gap:8px;align-items:center;font-size:13px"><span style="flex:0 0 92px">${s.n}</span><div style="flex:1;background:var(--surface-2);border-radius:4px;height:14px"><div style="width:${(v / 70 * 100).toFixed(0)}%;height:100%;border-radius:4px;background:${v < s.f * 0.6 ? 'var(--red)' : v < s.f * 0.85 ? 'var(--amber)' : 'var(--green)'}"></div></div><span style="flex:0 0 120px;font-family:var(--f-mono)">${v.toFixed(0)} km/h at ${hm(t)}</span></div>`; t += 10 / v * 60; });
        const real = t - t0, err = real - naive;
        q('.et-tv').textContent = hm(t0); q('.et-bars').innerHTML = rows;
        q('.et-a').textContent = naive.toFixed(0) + ' min'; q('.et-b').textContent = real.toFixed(0) + ' min';
        q('.et-e').textContent = (err >= 0 ? '+' : '') + err.toFixed(0) + ' min';
        q('.et-note').textContent = Math.abs(err) < 3 ? 'Here both are about the same: traffic now and later is alike.' : err > 0 ? `"Current speed" said ${err.toFixed(0)} min too little: you will reach each segment after the rush has started there.` : `The opposite case: there is a jam now, but it will clear by the time you get there, so the naive ETA says ${(-err).toFixed(0)} min too much.`;
      };
      q('.et-t').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Put the slider at 8:15-8:45 and the naive ETA says much less (the rush is coming), and after 9:15 it says more (the jam is clearing). At 7:00 or 11:00 both are the same, because traffic is not changing then. A real ETA has to predict <em>future</em> traffic. That is what ML is for.` },
    { type: 'h3', text: 'Google + DeepMind: ETA with a graph neural network (2020)' },
    { type: 'list', items: [
      '<strong>Historical + live</strong>: according to Google Maps\' September 2020 blog ("Google Maps 101"), ETA combines a database of historical traffic patterns with live conditions using ML, and they claimed ETAs were accurate for >97% of trips.',
      '<strong>Supersegments</strong>: according to DeepMind\'s September 2020 blog, the road network was split into "supersegments": groups of nearby segments that carry a lot of traffic. Each supersegment is a small graph.',
      '<strong>Graph Neural Network (GNN)</strong>: each segment is a node, with edges between segments that are connected or meet. The model passes "messages" between neighbours and learns how a jam on a side road affects the main road. It looks at the whole local network, not just the segments in one line.',
      '<strong>Training difficulties</strong>: the graphs ranged from 2 nodes to 100+, and training was unstable. DeepMind used MetaGradients (the model learns its own learning-rate schedule) and a combination of several loss functions.',
      '<strong>Result</strong>: in some cities, cases of wrong ETAs dropped by up to 50% (Taichung ~51%, Sydney ~43%); according to the 2021 CIKM paper ("ETA Prediction with Graph Neural Networks in Google Maps"), this model was deployed in production.',
      '<strong>Its place in the system</strong>: the routing engine gives candidate routes, and the GNN predicts their travel times to rank them. So ML does not replace routing; it sits on top of it.',
      '<strong>The world changed, so did the model</strong>: according to the 2020 blog, traffic around the world dropped by up to 50% during COVID lockdowns. Google updated its models to give more weight to the patterns of the last 2-4 weeks and less to older ones.',
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Graph Neural Network (GNN)', html: `<strong>What it is:</strong> a neural network (a program that learns patterns from data) that works on a graph. Each node has a small "state", and in every round a node takes information from its neighbours, the way students in a class get news from the ones sitting next to them. After a few rounds, every node has a sense of the whole area around it.<br><strong>Why we need it:</strong> how a jam on a side road will block the main road 10 minutes later cannot be seen by looking at that one road alone. The road network is itself a graph, so this is a natural fit.<br><strong>Without it:</strong> the model would look at each road alone and miss jams spreading from neighbouring roads.` },

    { type: 'h2', text: 'Places, geocoding and navigation' },
    { type: 'p', html: `<strong>Places search</strong> combines two indexes: a <a href="#/search">text index</a> (name, category, typo-tolerant: "indai gate" also works) and a <a href="#/ds-for-scale">geo index</a> (S2/geohash cells, so that "petrol pump" means "the one near me"). Ranking uses text match, distance and popularity together. <strong>Geocoding</strong> splits an address into parts (street, area, city, PIN code) and matches them against known addresses; in a country like India, where addresses are unstructured ("behind the XYZ temple"), this is quite a hard problem. The Google Maps Platform docs offer geocoding (address → coordinates/place ID) and reverse geocoding (coordinates → address) as separate APIs.` },
    { type: 'p', html: `<strong>Navigation</strong> runs mostly on the phone: the route (polyline + steps) is downloaded once, then the position is tracked with GPS, and the phone itself says "turn left in 200 m". The server helps at two moments: (1) <strong>deviation</strong>: you left the route (a wrong turn), so the phone asks for a new route; (2) <strong>new traffic</strong>: a jam ahead, and if a better route is found, the app suggests it. And when there is no signal at all? That is what offline maps are for, below.` },
    { type: 'h2', text: 'Offline maps: no internet, but still a map' },
    { type: 'p', html: `A trip to the mountains, or underground in the metro. There is no signal, but you still need the map and the route. For this, the user <strong>downloads</strong> an area in advance.` },
    { type: 'callout', tone: 'term', title: 'New word: Offline map (downloaded area)', html: `<strong>What it is:</strong> a chosen area (like all of Delhi or Manali) whose map data is already saved in the phone\'s storage, so the map shows and routes work even without internet.<br><strong>Why we need it:</strong> there is not always a signal, and data is expensive when roaming.<br><strong>Without it:</strong> in a tunnel or a village, the map is just empty grey squares, and navigation stops.` },
    { type: 'p', html: `According to Google\'s official help page (read in 2026): in a downloaded area the app works as usual, and you get driving directions <em>if the whole route is inside the downloaded area</em>. Offline, there are no transit, cycling or walking directions, and while driving there is no traffic info and no alternate routes. This means routing runs on the phone itself, so the road graph of that area must also be on the phone, not just the tiles. And live traffic comes from the server, so it disappears offline.` },
    { type: 'steps', items: [
      { t: 'What gets downloaded', d: 'The vector tiles of that area (to show the map), and the road data of that area for routing. Google does not publish the exact format; this is the general approach that matches the features on the help page (offline driving directions).' },
      { t: 'Why vector tiles matter', d: 'According to Google\'s 2010 blog, vector tiles needed less than 1/100th of the data across all zoom levels, and this is what made offline caching of big areas possible. With raster, you would have to store separate images for every zoom.' },
      { t: 'Expiry and updates', d: 'According to the help page, offline maps must be updated before they expire. When 15 days or less are left before expiry and the phone is on Wi-Fi, the app tries to update by itself; there is also an "Auto-update" setting. The reason: shops close, new roads get built.' },
      { t: 'Storage', d: 'On Android, offline maps can be kept in the phone\'s internal storage or on an SD card (help page).' },
    ]},
    { type: 'p', html: `The difference between raster and vector shows most clearly offline. Choose a square area below. The tile counting uses real tile maths; the tile sizes are only assumptions (raster ~15 KB, vector ~40 KB). Open-source vector tile sets often hold data only up to zoom 14 and draw the same data bigger beyond that (overzoom); raster needs images up to zoom 17 to show streets:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>One side of the area: <strong class="of-sv"></strong></label><input class="of-s" type="range" min="5" max="200" step="5" value="40"></div>
          <div><label>Where</label><select class="of-l"><option value="28.6">Delhi (28.6° N)</option><option value="32.2">Manali (32.2° N)</option><option value="8.5">Thiruvananthapuram (8.5° N)</option></select></div>
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
        q('.of-n').textContent = `For ${s} × ${s} km, the vector data is ~${Math.round(r * 15 / (v * 40))} times smaller than raster. Reason: raster needs separate images for every zoom level (4 times more tiles at each zoom), while a vector tile arrives once and works for several zoom levels.`;
      };
      el.querySelectorAll('input,select').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `With the default (Delhi, 40 km), raster needs ~30,000 tiles (~451 MB) and vector needs ~509 tiles (~20 MB). These numbers use assumed tile sizes, but the <em>shape</em> of the difference is real: the raster load grows 4 times with every extra zoom level.` },

    { type: 'h2', text: 'Failures and bottlenecks' },
    { type: 'table', head: ['What happened', 'Effect', 'Defence'], rows: [
      ['New map data arrived (a new road)', 'Both tiles and the routing graph are out of date', 'Rebuild only the affected tiles + CDN purge; build a new version of the routing graph and swap it onto servers gradually (blue/green)'],
      ['One region\'s routing server is down', 'Routes in that region fail', 'Several replicas per region behind a load balancer; the graph is read-only, so replicas are easy'],
      ['Traffic pipeline lag', 'Live speeds are old', 'Monitor data age; after an age limit, fall back to historical'],
      ['Few phones (night, villages)', 'Live speed is noisy', 'Minimum-samples rule, historical fallback'],
      ['Crowds after a big festival/match', 'The historical pattern is wrong', 'Give live data more weight; for a long change like COVID, give recent weeks more weight (Google 2020)'],
      ['Viral area (everyone zooms into one place)', 'Tile hot spots', 'This is what the CDN is for: the same z/x/y for everyone, a cache hit'],
      ['Route query storm (office hours)', 'Routing CPU', 'Precomputation (CH) makes every query cheap; horizontal scaling; a short-TTL cache for popular origin-destination pairs'],
      ['An offline map became old', 'A closed shop still shows, a new road does not', 'Expiry on downloads; auto-update on Wi-Fi when 15 days or less are left (Google help page)'],
    ]},

    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Separate the three sub-problems', d: '"Map rendering, routing, and traffic/ETA: each has a different nature, so each has a different design."' },
      { t: 'Tiles', d: 'Tile pyramid (4^z), z/x/y address, CDN, raster vs vector; huge storage, but every request is small and cacheable.' },
      { t: 'Routing', d: 'Graph in memory, by region; Dijkstra → A* → bidirectional → contraction hierarchies (offline shortcuts, upward query). Customizable preprocessing for live weights.' },
      { t: 'Traffic', d: 'Anonymous phone speeds → queue → map matching → per-segment aggregation (minimum samples, remove trip ends) → live speeds store. Fallback: historical.' },
      { t: 'ETA', d: 'Historical + live + ML that predicts future traffic; Google/DeepMind\'s GNN ranks the routing candidates.' },
      { t: 'Offline', d: 'Area download: vector tiles + routing data on the phone; offline driving directions only when the whole route is inside; update before expiry.' },
      { t: 'Failures', d: 'Stale data detection, graceful degradation, CDN stale serving, privacy.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Static, the same for everyone, a huge number of reads</strong> (tiles) → cut in advance, keep the address fixed, use a CDN. <strong>Expensive computation on an input with the same structure again and again</strong> (routing) → precompute offline (CH), make queries cheap. <strong>Fast-changing data</strong> (traffic) → streaming pipeline + freshness monitoring + historical fallback. <strong>Guessing the future</strong> (ETA) → ML on historical + live data, and always a simple fallback.` },

    { type: 'diagram', title: 'The whole design at a glance', height: 530,
      caption: 'Three separate worlds: tiles at the top (static, a CDN game), routing and ETA in the middle (graph + precomputation + ML), live traffic at the bottom (streaming). Everything starts and ends with your phone. Use the buttons to see one path at a time.',
      groups: [
        { label: 'Showing the map (tiles)', x: 148, y: 58, w: 568, h: 92 },
        { label: 'Search, routing and ETA', x: 148, y: 178, w: 432, h: 214 },
        { label: 'Live traffic pipeline', x: 148, y: 418, w: 568, h: 92 },
      ],
      nodes: [
        { id: 'app', label: 'Maps app', sub: 'phone / browser', x: 75, y: 290, w: 120, kind: 'client', info: 'What it is: the app on the user\'s phone. It fetches tiles and draws them itself (vector), asks for places and routes, runs navigation, and sends anonymous speed points if location is on. Offline areas are downloaded into it too.' },
        { id: 'cdn', label: 'CDN', sub: 'tiles cache', x: 215, y: 110, w: 120, kind: 'edge', info: 'What it is: cache servers near cities. The z/x/y address is fixed and the same for everyone, so most tile requests end here. If the origin fails, it can even serve an old tile (stale-if-error).' },
        { id: 'tiles', label: 'Tile store', sub: 'z/x/y files', x: 360, y: 110, w: 120, kind: 'data', info: 'What it is: the home of all built tiles (object storage). Low zooms and popular areas in advance, rare deep-zoom tiles when requested. The general approach; Google\'s exact method is not public.' },
        { id: 'builder', label: 'Tile builder', sub: 'render / cut', x: 505, y: 110, w: 120, kind: 'server', info: 'What it is: the job that builds tiles from map data. When a new road arrives, only the affected tiles are rebuilt. Traffic overlay tiles are rebuilt often from live speeds, with a short TTL.' },
        { id: 'mapdata', label: 'Map data', sub: 'roads, places', x: 650, y: 110, w: 120, kind: 'data', info: 'What it is: the real data of the world\'s roads, buildings and places (the source of truth). Tiles, the routing graph and the places index are all built from it. According to Google\'s 2020 post, official data (speed limits, restrictions) also feeds into route choice.' },
        { id: 'places', label: 'Places', sub: 'geocode, search', x: 215, y: 230, w: 120, kind: 'server', info: 'What it is: the service that turns "India Gate" or an address into lat/lng (geocoding), and the reverse. Inside: a text index (typos work too) + a geo index (nearby first).' },
        { id: 'pre', label: 'CH preprocess', sub: 'shortcuts', x: 505, y: 230, w: 120, kind: 'server', info: 'What it is: offline work that contracts the nodes of the road graph in order of importance and adds shortcuts (contraction hierarchies, 2008 paper). For live weights: the structure once, the weights quickly (customization). The general industry approach; Google\'s exact algorithm is not public.' },
        { id: 'route', label: 'Routing', sub: 'graph in memory', x: 215, y: 350, w: 120, kind: 'server', info: 'What it is: the service that finds routes. The road graph by region in memory, an upward search with precomputed shortcuts, and a few candidate routes as output.' },
        { id: 'eta', label: 'ETA model', sub: 'GNN (2020)', x: 360, y: 350, w: 120, kind: 'server', info: 'What it is: the ML model that predicts travel time. According to DeepMind\'s 2020 blog, a graph neural network runs on supersegments and ranks the candidate routes from routing.' },
        { id: 'speeds', label: 'Live speeds', sub: 'segment → km/h', x: 505, y: 350, w: 120, kind: 'data', info: 'What it is: the current aggregated speed of every road segment and its timestamp. Both routing edge weights and the traffic overlay come from it. When it gets old, routing leans towards historical data.' },
        { id: 'ingest', label: 'Ingest', sub: 'queue / log', x: 215, y: 470, w: 120, kind: 'queue', info: 'What it is: a durable line (like Kafka) for the speed points of millions of phones. If processing is slow, no data is lost; a backlog builds up.' },
        { id: 'mm', label: 'Map matching', sub: 'point → segment', x: 360, y: 470, w: 120, kind: 'server', info: 'What it is: the service that snaps a GPS point onto the right piece of road. Privacy: the start and end points of each trip are removed here (Google 2009).' },
        { id: 'agg', label: 'Aggregator', sub: 'median, 1 min', x: 505, y: 470, w: 120, kind: 'server', info: 'What it is: the service that turns the speeds of many phones on one segment into one number (the median). With too few phones, nothing is published: for both reliability and privacy.' },
        { id: 'hist', label: 'Historical', sub: 'speed patterns', x: 650, y: 470, w: 120, kind: 'data', info: 'What it is: the "usual" pattern of each segment (the speed at 9 am on a Monday). ETA combines it with live data (Google 2020), and it is the fallback when there is no live data.' },
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
        { name: 'Load map', text: 'The app asks for the screen\'s ~10-20 tiles → CDN (mostly a HIT) → on a miss, the tile store → a tile that was never built is built by the builder from map data.', go: ['app>cdn>tiles>builder>mapdata'] },
        { name: 'Search place', text: '"India Gate" → places service (text + geo index) → lat/lng and place ID back.', go: ['app>places'] },
        { name: 'Get route', text: 'Routing finds candidates with an upward search on the precomputed CH graph, with edge weights from live speeds; the ETA model (live + historical) predicts each candidate\'s time and ranks them.', go: ['app>route>eta', 'route>speeds', 'pre>route', 'eta>hist', 'eta>speeds'] },
        { name: 'Live traffic', text: 'Anonymous points from phones → ingest → map matching (remove trip ends) → the median for each segment → live speeds → routing and traffic overlay tiles.', go: ['app>ingest>mm>agg>speeds', 'speeds>builder', 'speeds>route'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Google Maps is three separate problems: showing the map (static, CDN), finding a route (graph + precomputation), traffic and ETA (streaming + ML).</li>
      <li>Tile pyramid: 4<sup>z</sup> tiles at zoom z, address z/x/y; same address = same bytes, so the CDN caches it. The screen needs only ~10-20 tiles.</li>
      <li>Vector tiles: data about shapes, the phone draws them itself; less data, smooth zoom, offline becomes possible.</li>
      <li>Dijkstra spreads in every direction; A* leans towards the destination with a guess (heuristic); both give the same answer.</li>
      <li>Contraction hierarchies: offline, contract less important nodes and add shortcuts; queries only climb "up". For live traffic: the structure once, the weights quickly.</li>
      <li>Live traffic: anonymous phone speeds → map matching → median per segment, nothing published with too few phones, trip start/end deleted.</li>
      <li>ETA needs <em>future</em> traffic: historical + live + ML (GNN), and always a simple fallback.</li>
      <li>Offline maps: download the area first (tiles + routing data); driving directions only when the whole route is inside; update before expiry.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Tile pyramid + CDN: a map of the whole world, every request small and a cache hit', 'Vector tiles: less data, smooth zoom/rotate, offline maps', 'CH precomputation: even long routes in milliseconds', 'Crowdsourced traffic: live speeds without a sensor on every road', 'ML ETA: a guess of future traffic, more accurate arrival times'],
      costs: ['Tile storage in petabytes, and invalidation work on every map update', 'Vector tiles: rendering work on the phone (GPU, battery)', 'Expensive preprocessing; an extra customization step for live weights', 'Great care for privacy: aggregation, minimum samples, deleting trip ends', 'Training/monitoring ML models; when the world changes (COVID), the model must change too'],
    },

    { type: 'think', questions: [
      { q: 'A new flyover opened. What must be updated, and in what order?', a: 'New road segments in the map data → rebuild the tiles of the affected area and purge/version those tiles on the CDN → build a new version of the routing graph (redo CH preprocessing, at least for that region) and swap it onto replicas gradually → the map matching of the traffic pipeline must also know the new segment, or points will be snapped to the wrong road. The historical pattern for that segment will be empty at first, so for a few weeks use defaults from the speed limit/road type.' },
      { q: 'Why can traffic layer tiles not get a long CDN TTL like base map tiles?', a: 'Traffic changes every few minutes; a long TTL means users see traffic that is hours old. So traffic is a separate overlay layer with a TTL of minutes, while the base map (roads, buildings) changes over days/weeks and can take a long TTL. Keeping the two layers separate means a traffic change does not force a download of the whole map.' },
      { q: 'Someone put 99 phones in a handcart and pushed it slowly down a road. What could happen, and how would you defend against it?', a: 'The aggregator will think 99 "cars" are moving at 5 km/h, so a fake jam can appear and people will change their routes. Defence: treat many devices with the same pattern in one place (same speed, same position, same time) as suspicious; cross-check signals (phones on other roads, historical data, incident reports); call a segment jammed only when data from different trips agrees.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'How many tiles cover the whole world at zoom level 10?', options: ['10 × 10 = 100', '2^10 = 1,024', '4^10 ≈ 1 million (1,048,576)', '10^4 = 10,000'], answer: 2, explain: 'At every zoom, each tile splits into 4: 2^z × 2^z = 4^z. At zoom 10 that is 1,048,576 tiles.' },
      { q: 'How do contraction hierarchies make queries fast?', options: ['They search only highways and ignore streets', 'They add shortcuts offline, and the query only moves towards more important nodes', 'They store every possible route in advance', 'They give an approximate route, not an exact one'], answer: 1, explain: 'In preprocessing, less important nodes are contracted and shortcuts are created; the query is bidirectional and "upward-only". The answer stays exact, and not every route is stored.' },
      { q: 'What did Google say in 2009 about privacy for live traffic?', options: ['Only paid users\' data is used', 'Data is aggregated and the start/end points of every trip are permanently deleted', 'Each phone\'s full path is stored encrypted', 'Only government sensors are used'], answer: 1, explain: 'The data of many people is combined so that one phone does not stand out, and the start/end points of trips are deleted.' },
      { q: 'What is the real difference between Dijkstra and A*?', options: ['A* always gives a shorter (better) route', 'Both give the same route; A* leans towards the destination with a guess (heuristic) and explores fewer intersections', 'Dijkstra only works on highways'], answer: 1, explain: 'In the widget both found S → B → F → G, 13 min. Dijkstra settled 9 intersections (including P and Q in the opposite direction), A* settled 7. A* stays correct only if the guess is never too high.' },
      { q: 'According to Google\'s help page, what do you not get with an offline map?', options: ['The map itself', 'Driving directions when the whole route is inside the downloaded area', 'Live traffic and alternate routes (and transit, cycling, walking directions)'], answer: 2, explain: 'Routing and the map run on the phone, so offline driving directions work. Live traffic comes from the server, so it is not available offline.' },
      { q: 'What does DeepMind\'s GNN do in Google Maps?', options: ['It renders map tiles', 'It replaces the shortest path algorithm', 'It predicts the travel time of the routing engine\'s candidate routes and ranks them', 'It snaps GPS points onto roads'], answer: 2, explain: 'According to DeepMind\'s 2020 blog, the GNN predicts ETA and is used to rank the routing engine\'s candidate routes.' },
    ]},
    { type: 'sources', note: 'Google has not published the full internal architecture of Maps. The Google-specific facts come from these sources; the boxes for the routing algorithm and the traffic pipeline are the general industry approach.', items: [
      { title: 'Google Maps 101: How AI helps predict traffic and determine routes', publisher: 'Google Keyword blog (Johann Lau, Google Maps)', year: 2020, official: true, url: 'https://blog.google/products/maps/google-maps-101-how-ai-helps-predict-traffic-and-determine-routes/', used: 'Aggregate location data from 220+ countries/territories, historical + live with ML, >97% accurate ETAs, COVID re-weighting to the last 2-4 weeks, route factors (road quality, size, tolls, official data, incidents).' },
      { title: 'Traffic prediction with advanced Graph Neural Networks', publisher: 'DeepMind blog (Oliver Lange, Luis Perez)', year: 2020, official: true, url: 'https://deepmind.google/discover/blog/traffic-prediction-with-advanced-graph-neural-networks/', used: 'Supersegments, GNN message passing over the road graph, MetaGradients and combined losses, up to 50% fewer bad ETAs (Taichung ~51%, Sydney ~43%), GNN ranks candidate routes.' },
      { title: 'ETA Prediction with Graph Neural Networks in Google Maps (CIKM 2021)', publisher: 'Derrow-Pinion et al., Google/DeepMind (arXiv 2108.11482)', year: 2021, official: true, url: 'https://arxiv.org/abs/2108.11482', used: 'Confirms the GNN ETA model is deployed in production in Google Maps.' },
      { title: 'Under the hood of Google Maps 5.0 for Android', publisher: 'Google Maps blog', year: 2010, official: true, url: 'https://maps.googleblog.com/2010/12/under-hood-of-google-maps-50-for.html', used: '256×256 image tiles before, 360B+ tiles for 20 zoom levels, switch to vector tiles, >100× less data across zoom levels, offline caching, dynamic labels.' },
      { title: 'The bright side of sitting in traffic: Crowdsourcing road congestion data', publisher: 'Official Google Blog', year: 2009, official: true, url: 'https://googleblog.blogspot.com/2009/08/bright-side-of-sitting-in-traffic.html', used: 'Anonymous speed data from phones with location on, scale and privacy challenges, aggregation, deleting trip start/end points.' },
      { title: 'Contraction Hierarchies: Faster and Simpler Hierarchical Routing in Road Networks (WEA 2008)', publisher: 'Geisberger, Sanders, Schultes, Delling (Karlsruhe)', year: 2008, url: 'https://ae.iti.kit.edu/999.php', used: 'Node ordering by importance, contraction with shortcuts, bidirectional upward query, ~5× faster than previous hierarchical methods, negative space overhead.' },
      { title: 'World scale inverse reinforcement learning in Google Maps', publisher: 'Google Research blog', year: 2023, official: true, url: 'https://research.google/blog/world-scale-inverse-reinforcement-learning-in-google-maps/', used: 'Route choice trades off ETA, tolls, directness, surface; learning from real routes improved route match rate 16-24%.' },
      { title: 'Map and tile coordinates', publisher: 'Google Maps Platform docs', official: true, url: 'https://developers.google.com/maps/documentation/javascript/coordinates', used: 'World/pixel/tile coordinates, 256 px base tile, resolution doubles per zoom, Mercator cut at ~±85°.' },
      { title: 'Slippy map tilenames', publisher: 'OpenStreetMap wiki', url: 'https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames', used: 'z/x/y scheme, 4^z tiles, lat/lon → tile formula (used in the widgets), ±85.0511°, metres-per-pixel formula, ~68.7B tiles at z18.' },
      { title: 'Download areas & navigate offline in Google Maps', publisher: 'Google Maps Help', official: true, url: 'https://support.google.com/maps/answer/6291838?hl=en', used: 'Offline driving directions only if the whole route is inside the area; no transit/bike/walk, no traffic or alternate routes offline; update before expiry, auto-update on Wi-Fi when 15 days or less remain; SD card storage. (Read in 2026.)' },
      { title: 'OSM data downloads (OpenMapTiles schema)', publisher: 'MapTiler data downloads', url: 'https://data.maptiler.com/downloads/dataset/osm/', used: 'Open-source vector tiles generated for zoom 0-14 and overzoomed beyond; used for the offline size widget assumption.' },
      { title: 'Copyright and License', publisher: 'OpenStreetMap', official: true, url: 'https://www.openstreetmap.org/copyright', used: 'ODbL licence and attribution rules for the tile figure (© OpenStreetMap contributors).' },
      { title: 'Geocoding API overview', publisher: 'Google Maps Platform docs', official: true, url: 'https://developers.google.com/maps/documentation/geocoding/overview', used: 'Definitions of geocoding and reverse geocoding.' },
    ]},
  ],
});
