Lesson.register({
  id: 'design-hotstar',
  title: 'JioHotstar live cricket',
  minutes: 40,
  summary: `One match, crores of people, in the same second. How the stadium camera reaches your phone (from zero, one piece at a time), the live score that comes from a CDN, the "X crore watching" number, and the biggest lesson: scale up early, load test, and if needed switch features off to keep the video running. Built from Hotstar engineers' own blogs and talks.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `India is playing a big match. At the same moment, 5-6 crore people are watching that one match on their phones.<br>There is a camera in the stadium and a phone in your hand. In between, we must make the video small, cut it into small pieces, and spread it through computers all over the country.<br>The score must also update after every ball. And when Kohli walks in to bat and lakhs of new people arrive in one minute, nothing should break.<br>This lesson teaches exactly that: how to send live video to so many people at once without the system falling over.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Before reading, think for 10 minutes. 5 crore people are watching one match together. Every phone asks for the score every 1 second. A wicket falls in the last over and 50 lakh new people open the app within 30 seconds. Where will your system break? Then compare with this lesson.` },

    { type: 'p', html: `<strong>JioHotstar</strong> was created in February 2025, when JioCinema and Disney+ Hotstar joined into one app (JioStar, the joint venture of Reliance and Disney, was completed in November 2024). Most engineering lessons here come from the team of the older <strong>Hotstar</strong> (later Disney+ Hotstar), which has written on its blog since 2017. Every fact has its year, because the 2017 setup is not the setup of today.` },
    { type: 'p', html: `First, feel the scale. These numbers come from the sources, with their year. (1 lakh = 100,000. 1 crore = 100 lakh = 10 million.)` },
    { type: 'table', head: ['Year', 'Match / event', 'Peak concurrent viewers', 'Source'], rows: [
      ['2016', 'ICC World T20', '15.5 lakh streams, peak traffic 1.3 Tbps', 'Akamai press release, 2016'],
      ['2017', 'Champions Trophy final', '46.9 lakh (platform peak)', 'Hotstar blog "T For Tsunami", 2017'],
      ['2018', 'IPL qualifier (SRH vs CSK)', '82.6 lakh', 'Akamai press release, 2018'],
      ['2019', 'World Cup, India vs New Zealand', '2.53 crore, 1M+ requests/s, 10 Tbps+', 'AWS re:Invent 2019 talk (Hotstar)'],
      ['2023', 'ODI World Cup (final)', '~5.9 crore', 'Hotstar blog 2024 (59M streams); news reports'],
      ['2025', 'Champions Trophy final (JioHotstar)', '6.12 crore', 'JioHotstar figures via Outlook Business, Mar 2025'],
    ], caption: 'The JioHotstar blog of Dec 2025 says the record until then was ~6.25 crore concurrent. Concurrent = how many people were watching at the same moment.' },
    { type: 'callout', tone: 'term', title: 'New words: concurrency, views', html: `<strong>Concurrent viewers (concurrency)</strong>: how many people are watching at the <em>same moment</em>. This number decides the load on the system. <strong>Views</strong>: how many times anyone opened the stream during the whole match (one person opening it 5 times = 5 views). That is why news reports show both "124 crore views" and "6 crore concurrent". For an engineer, the concurrency number matters more.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Live match video, in many languages and camera angles<br>• Live score and scorecard, updated after every ball<br>• A "X crore watching" counter<br>• Ads during ad breaks<br>• Login, subscription, payment<br>• Extras: emojis, polls, recommendations<br><br><strong>Out of scope:</strong> on-demand movies (see the <a href="#/design-youtube">YouTube / Netflix</a> lesson)` },
      right: { title: 'Non-functional', html: `• <strong>Video must play</strong>: every other feature comes second<br>• Crores of concurrent viewers, with jumps of many times within minutes<br>• Not far behind the TV broadcast (low latency)<br>• Works even on weak 4G<br>• Graceful during spikes: the whole app must never go down<br>• Cost: we cannot keep machines for a whole year for a 4-hour match` },
    },
    { type: 'callout', tone: 'why', title: 'The real difficulty of this system', html: `On YouTube, the load is spread across the whole day. Here, everyone asks for <strong>the same thing in the same second</strong>. The Hotstar team calls this a <strong>tsunami</strong>: a big moment happens (a star batter walks in, a wicket falls), a notification goes out, and traffic grows many times within seconds. The whole design is built around this one fact.` },

    { type: 'h2', text: 'Step 2: live video basics, from zero' },
    { type: 'p', html: `Before we design anything, let us understand how video travels from the stadium to a phone. We will take one problem at a time. Each problem will bring in a new part (component). At the end, the whole chain will appear in one diagram.` },
    { type: 'h3', text: '2a. Camera video is huge' },
    { type: 'p', html: `A stadium camera takes 25 pictures (frames) every second. One 1080p picture has 1920 × 1080 = ~20 lakh pixels. Let us say each pixel needs ~3 bytes for its colour.` },
    { type: 'list', items: [
      `One frame: 20.7 lakh × 3 bytes = <strong>~6.2 MB</strong>.`,
      `One second (25 frames): <strong>~155 MB</strong>, which is ~1.2 Gbps (1 byte = 8 bits).`,
      `A normal 4G phone may get 5-20 Mbps. So raw video is <strong>~100 times</strong> bigger than the phone's internet can carry.`,
    ]},
    { type: 'image', src: 'assets/img/design-hotstar/cricket-broadcast-camera.jpg', alt: 'A video camera on a tripod at the edge of a cricket ground, with a man sitting at a production desk (vision mixer) next to it', caption: 'The first link of the chain: a camera at the ground, and next to it a production desk where the camera feeds are mixed into one final feed. (A small live-streamed match from 2011; a match like the IPL has dozens of cameras and a full production truck.)', credit: { text: 'Mike Ashton, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Twicket_broadcast_crew.jpg', license: 'CC BY-SA 2.0' } },
    { type: 'p', html: `So sending raw video directly is impossible. We must make it smaller.` },
    { type: 'callout', tone: 'term', title: 'New word: encoder (and codec)', html: `<strong>What it is:</strong> a machine or program that compresses (squeezes) video. It does not store every frame in full. It only stores what changed since the last frame (the ball moved, the rest of the ground stayed the same). The set of rules for doing this is called a <strong>codec</strong>, for example H.264 or HEVC.<br><strong>Why we need it:</strong> 1080p video shrinks from ~1.2 Gbps to ~5 Mbps, which is <strong>~250 times smaller</strong>, and the eye sees very little difference.<br><strong>Without it:</strong> the video would not reach even one viewer, let alone crores.<br><strong>Special for live:</strong> the encoder must compress each second of video within that same second. It can never fall behind.` },
    { type: 'h3', text: '2b. Everyone has different internet: so we make many qualities (ABR ladder)' },
    { type: 'p', html: `One user is on home WiFi (20 Mbps). Another is on 4G inside a metro train (0.5 Mbps). If we make only one 1080p video at 5 Mbps, the metro user will get stuck every few seconds (buffering). If we make only 240p, the WiFi user will see a blurry video.` },
    { type: 'p', html: `So the encoder makes <strong>the same moment of video in 4-6 different qualities</strong> at the same time. This list is called a <strong>ladder</strong>, because it goes from bottom to top like the steps of a ladder:` },
    { type: 'table', head: ['Quality (rung)', 'Bitrate', 'Size of a 4-second piece', 'Who it is for'], rows: [
      ['240p', '0.4 Mbps', '0.2 MB', 'Weak 4G, metro, villages'],
      ['360p', '0.8 Mbps', '0.4 MB', 'Average 4G'],
      ['480p', '1.5 Mbps', '0.75 MB', 'Good 4G'],
      ['720p', '3 Mbps', '1.5 MB', 'WiFi, good phone'],
      ['1080p', '5 Mbps', '2.5 MB', 'Fast WiFi, big TV'],
    ], caption: 'Example ladder (assumed numbers; every company tunes its own ladder). Size = bitrate × 4 s ÷ 8. For example, 3 Mbps × 4 s = 12 megabits = 1.5 MB.' },
    { type: 'callout', tone: 'term', title: 'New words: bitrate, ABR ladder', html: `<strong>Bitrate:</strong> how many bits one second of video takes. 3 Mbps = 3 million bits every second. Higher bitrate = clearer video, but it needs more internet.<br><strong>ABR ladder (rendition ladder):</strong> <strong>What it is:</strong> a list of several qualities of the same video (240p to 1080p). ABR = Adaptive Bitrate, which means "change the quality to match the internet".<br><strong>Why we need it:</strong> every viewer gets the best quality their internet can handle, and the quality changes when their internet changes.<br><strong>Without it:</strong> either buffering on weak networks, or a needlessly blurry video on fast networks.<br><strong>The cost:</strong> the encoder does 5 times the work. On Hotstar, every language (Hindi, English, Tamil...) and every camera angle is a separate stream, so the work multiplies again.` },
    { type: 'h3', text: '2c. Why do we cut video into small pieces (segments)?' },
    { type: 'p', html: `Now imagine we turn the whole match into one long file. Three problems appear at once:` },
    { type: 'list', items: [
      `<strong>The file does not exist yet:</strong> the "full file" of a live match is ready only when the match ends. But we must show the video <em>now</em>.`,
      `<strong>We cannot change quality in the middle:</strong> a long 720p stream is playing and the user enters a metro tunnel. How do we change quality now? We would have to break the whole connection.`,
      `<strong>Too big:</strong> 3 hours × 3 Mbps = one file of ~4 GB. Storing and sharing such a big file across cache servers all over the country is hard.`,
    ]},
    { type: 'p', html: `The answer: cut the video into <strong>small pieces</strong>, each just a few seconds long (for example 4 seconds). Each piece is a separate small file: <code>seg_18342.ts</code>, <code>seg_18343.ts</code>... Each quality has its own pieces. A 3-hour match cut into 4-second pieces = 2,700 pieces for each quality.` },
    { type: 'callout', tone: 'term', title: 'New word: segment (a piece of video)', html: `<strong>What it is:</strong> a small part of the video, 2-6 seconds long, stored as its own file. Like the separate pages of a long book.<br><strong>Why we need it:</strong> (1) The phone can start playing as soon as the first piece arrives; it does not wait for a full file. (2) The phone can change quality at every new piece: if the internet gets slow, the next piece is the 240p one. (3) Each piece is a small file that never changes, so a CDN can cache it easily.<br><strong>Without it:</strong> one long stream, buffering on slow networks, quality switching almost impossible, and the CDN cache is of no use.<br><strong>Example:</strong> a 4-second 720p (3 Mbps) piece = 3 × 4 ÷ 8 = <strong>1.5 MB</strong>. If 4G gives 6 Mbps, it arrives in 2 seconds, which is faster than the video plays. That is all we need.` },
    { type: 'callout', tone: 'term', title: 'New word: packager', html: `<strong>What it is:</strong> the machine that comes after the encoder. The encoder sends a non-stop flow of compressed video. The packager cuts this flow into 4-second pieces (segments) for each quality, saves them as files with the right names, and writes a <strong>list (manifest)</strong> of which pieces are available in which quality.<br><strong>Why we need it:</strong> the phone must know "which piece comes next and where can I get it". The packager creates that list and updates it for every new piece.<br><strong>Without it:</strong> the encoder output stays one long stream. No pieces, no list, no CDN caching.<br><strong>In this design:</strong> the packager is the <strong>origin</strong> of the video: the real pieces come from here. In Hotstar's case, ads are also added at this point (we will see this later).` },
    { type: 'h3', text: '2d. Manifest (playlist): the list of pieces for the phone' },
    { type: 'p', html: `How does the phone know which pieces exist? From a small text file called a <strong>manifest</strong> or <strong>playlist</strong>. There are two levels:` },
    { type: 'code', text: `
# master.m3u8: "which qualities does this match have?" (read once)
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=426x240
240p/live.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
720p/live.m3u8
...

# 720p/live.m3u8: "which 720p pieces exist right now?" (read again every few seconds)
#EXTM3U
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:18340
#EXTINF:4.0,
seg_18340.ts
#EXTINF:4.0,
seg_18341.ts
#EXTINF:4.0,
seg_18342.ts          <- newest piece. In 4 s seg_18343 is added and seg_18340 is removed` },
    { type: 'callout', tone: 'term', title: 'New words: manifest, HLS, DASH', html: `<strong>Manifest (playlist):</strong> <strong>What it is:</strong> a small text file that says which qualities the video has and which pieces of each quality are available right now.<br><strong>Why we need it:</strong> the phone needs the name and address (URL) of every piece. In live video, new pieces arrive every 4 seconds, so the live manifest also changes every 4 seconds, and the phone reads it again and again.<br><strong>Without it:</strong> the phone would never know which piece comes next.<br><strong>HLS and DASH:</strong> these are two "formats" (sets of rules) for how manifests and pieces are written. HLS (HTTP Live Streaming) comes from Apple, and its manifest is <code>.m3u8</code>. DASH is an open standard, and its manifest is <code>.mpd</code>. In both, the pieces are normal HTTP files, so any web server or CDN can serve them. Apple's HLS guide suggests 6-second pieces; in our examples we use 4 seconds.` },
    { type: 'h3', text: '2e. The phone player: which quality for the next piece?' },
    { type: 'p', html: `The video <strong>player</strong> on the phone (the part of the app that plays video) runs a simple loop:` },
    { type: 'steps', items: [
      { t: 'Read the manifest', d: 'Fetch the live manifest. See which piece is the newest.' },
      { t: 'Guess the speed', d: 'How long did the last piece take? 1.5 MB arrived in 2 seconds = 6 Mbps.' },
      { t: 'Pick a quality', d: 'Choose the highest quality on the ladder that arrives comfortably at this speed. Keep some margin (for example 80% of the speed), because mobile internet goes up and down.' },
      { t: 'Fill the buffer', d: 'Download the piece, keep it in the buffer, and play video from the buffer. If the buffer is low, choose more carefully (a lower quality).' },
      { t: 'Repeat', d: 'This loop runs every 4 seconds. That is why the quality can change at every piece.' },
    ]},
    { type: 'callout', tone: 'term', title: 'New words: player, buffer, ABR', html: `<strong>Buffer:</strong> <strong>What it is:</strong> video "from just ahead" kept in the phone's memory, not shown yet. For example, a 12-second buffer = the video keeps playing even if the internet stops for 12 seconds.<br><strong>Why we need it:</strong> internet speed goes up and down. The buffer hides these ups and downs.<br><strong>Without it:</strong> the video would stop at every small network hiccup (the spinning circle).<br><strong>ABR (Adaptive Bitrate):</strong> the player's decision about which quality on the ladder the next piece should be. The decision happens on the phone, not on the server. So crores of phones each make their own decision, and the server carries no extra load.<br><strong>The live twist:</strong> in live video the buffer cannot be very big, because the video ahead has not been made yet. The player stays ~3 pieces behind the "live edge" (the newest piece), so the buffer stays at about 12 seconds at most.` },
    { type: 'p', html: `Try it yourself. Change the network speed with the slider and press "Get next piece". Or press "Story": home WiFi, then a metro tunnel, then WiFi again. Then choose "Stubborn player" and run the same story. That player always asks for 1080p.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips hs-mode" role="group" aria-label="Player">
          <button type="button" class="chip on" data-m="abr">ABR player</button>
          <button type="button" class="chip" data-m="fixed">Stubborn player (always 1080p)</button>
        </div>
        <div class="row2">
          <div><label>Network speed (Mbps): <strong class="hs-spv"></strong></label><input class="hs-sp" type="range" min="0.3" max="10" step="0.1" value="6"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
            <button type="button" class="btn small primary hs-next">Get next piece</button>
            <button type="button" class="btn small hs-story">Story: WiFi → metro → WiFi</button>
            <button type="button" class="btn small ghost hs-reset">Reset</button>
          </div>
        </div>
        <svg class="hs-svg" viewBox="0 0 720 190" style="width:100%;height:auto;display:block" role="img" aria-label="Quality of each piece and the buffer"></svg>
        <div class="stats">
          <div class="stat"><span>Quality of this piece</span><strong class="hs-q">-</strong></div>
          <div class="stat"><span>Piece size</span><strong class="hs-mb">-</strong></div>
          <div class="stat"><span>Download time</span><strong class="hs-dl">-</strong></div>
          <div class="stat"><span>Buffer (max 12 s)</span><strong class="hs-buf">-</strong></div>
          <div class="stat"><span>Video stalls (times / total s)</span><strong class="hs-st">-</strong></div>
        </div>
        <div class="calc-note hs-note"></div>`;
      const q = s => el.querySelector(s);
      const LAD = [['240p', 0.4], ['360p', 0.8], ['480p', 1.5], ['720p', 3], ['1080p', 5]];
      const SEG = 4, MAXBUF = 12;
      const STORY = [8, 8, 8, 8, 8, 8, 2.5, 1.2, 0.5, 0.5, 0.6, 1.5, 3, 8, 8, 8];
      let mode = 'abr', st, hist;
      const reset = () => { st = { n: 0, buf: 0, est: null, stalls: 0, stallT: 0 }; hist = []; };
      const pick = (est, buf) => { const f = buf < 8 ? 0.5 : 0.8; let k = 0; LAD.forEach((r, i) => { if (r[1] <= est * f) k = i; }); return k; };
      const step = speed => {
        const est = st.est == null ? speed : st.est;
        const k = mode === 'fixed' ? 4 : pick(est, st.buf), mb = LAD[k][1] * SEG / 8, dl = LAD[k][1] * SEG / speed;
        const stall = st.n === 0 ? 0 : Math.max(0, dl - st.buf);
        const buf = Math.min(MAXBUF, Math.max(0, st.buf - dl) + SEG);
        const why = mode === 'fixed' ? 'the stubborn player always asks for 1080p' : `guess ${est} Mbps × ${st.buf < 8 ? '50% (low buffer, play safe)' : '80%'} = ${(est * (st.buf < 8 ? 0.5 : 0.8)).toFixed(2)} Mbps budget`;
        st = { n: st.n + 1, buf, est: speed, stalls: st.stalls + (stall > 0 ? 1 : 0), stallT: st.stallT + stall };
        hist.push({ k, mb, dl, stall, buf, speed, why });
      };
      const draw = () => {
        const H = hist.slice(-16), off = hist.length - H.length;
        let s = '';
        for (let k = 0; k < 5; k++) { const y = 150 - (k + 1) * 24; s += `<line x1="36" x2="712" y1="${y}" y2="${y}" style="stroke:var(--line);stroke-width:1"/><text x="32" y="${y + 4}" text-anchor="end" style="fill:var(--ink-3);font:10px var(--f-mono)">${LAD[k][0]}</text>`; }
        H.forEach((h, i) => {
          const x = 44 + i * 42, bh = (h.k + 1) * 24;
          s += `<rect x="${x}" y="${150 - bh}" width="30" height="${bh}" rx="3" style="fill:${h.stall > 0 ? 'var(--red)' : 'var(--accent-soft)'};stroke:${h.stall > 0 ? 'var(--red)' : 'var(--accent)'}"/>`;
          s += `<text x="${x + 15}" y="166" text-anchor="middle" style="fill:var(--ink-3);font:10px var(--f-mono)">#${off + i + 1}</text><text x="${x + 15}" y="180" text-anchor="middle" style="fill:var(--ink-2);font:10px var(--f-mono)">${h.speed}M</text>`;
        });
        const pts = H.map((h, i) => `${44 + i * 42 + 15},${(150 - h.buf * 10).toFixed(1)}`).join(' ');
        if (H.length > 1) s += `<polyline points="${pts}" style="fill:none;stroke:var(--amber);stroke-width:2.5"/>`;
        H.forEach((h, i) => { s += `<circle cx="${44 + i * 42 + 15}" cy="${(150 - h.buf * 10).toFixed(1)}" r="3.5" style="fill:var(--amber)"/>`; });
        if (!H.length) s += `<text x="374" y="80" text-anchor="middle" style="fill:var(--ink-3);font:13px var(--f-body)">Press "Get next piece" or "Story"</text>`;
        q('.hs-svg').innerHTML = s;
        const last = hist[hist.length - 1];
        q('.hs-q').textContent = last ? LAD[last.k][0] : '-';
        q('.hs-mb').textContent = last ? last.mb.toFixed(2) + ' MB' : '-';
        q('.hs-dl').textContent = last ? last.dl.toFixed(1) + ' s' : '-';
        q('.hs-buf').textContent = last ? last.buf.toFixed(1) + ' s' : '-';
        q('.hs-st').textContent = st.stalls + ' / ' + st.stallT.toFixed(1) + ' s';
        q('.hs-note').textContent = !last ? 'Bar = quality of each piece (red = the video stalled on that piece). Yellow line = buffer. Below: piece number and the network speed at that time.'
          : `Piece #${hist.length}: ${LAD[last.k][0]} (${last.why}). ${last.mb.toFixed(2)} MB ÷ ${last.speed} Mbps = ${last.dl.toFixed(1)} s download.` + (last.stall > 0 ? ` The buffer was not enough, so the video stalled for ${last.stall.toFixed(1)} s!` : ` Buffer is now ${last.buf.toFixed(1)} s.`)
            + (mode === 'abr' && hist.length >= 16 ? ' In the story, the ABR player never stalled: it dropped to 240p in the tunnel, then slowly climbed back to 1080p.' : '')
            + (mode === 'fixed' && hist.length >= 16 ? ` The stubborn player stalled ${st.stalls} times, a total of ${st.stallT.toFixed(1)} seconds of the "loading" circle. This is why we use ABR.` : '');
      };
      q('.hs-sp').addEventListener('input', () => { q('.hs-spv').textContent = q('.hs-sp').value; });
      q('.hs-next').addEventListener('click', () => { step(+q('.hs-sp').value); draw(); });
      q('.hs-story').addEventListener('click', () => { reset(); STORY.forEach(step); q('.hs-sp').value = 8; q('.hs-spv').textContent = 8; draw(); });
      q('.hs-reset').addEventListener('click', () => { reset(); draw(); });
      el.querySelectorAll('.hs-mode .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.hs-mode .chip').forEach(x => x.classList.toggle('on', x === b)); reset(); draw(); }));
      q('.hs-spv').textContent = q('.hs-sp').value; reset(); draw();
    }},
    { type: 'p', html: `The story in numbers: the <strong>ABR player</strong> starts on WiFi (8 Mbps) at 720p and moves to 1080p once the buffer fills. In the tunnel the speed drops to 0.5 Mbps, so it drops to 480p, then 240p, and it <strong>never stalls even once</strong>. The <strong>stubborn player</strong> (always 1080p) needs 40 seconds to fetch a 2.5 MB piece at 0.5 Mbps in the tunnel: <strong>it stalls 6 times, for a total of ~122.5 seconds</strong> of loading. That is the whole benefit of ABR.` },
    { type: 'h3', text: '2f. Crores of phones want the same piece: CDN and origin' },
    { type: 'p', html: `The packager has made a new piece, <code>seg_18342.ts</code> (720p, 1.5 MB). In the next 4 seconds, 5 crore phones will ask for it. If all of them get it from the packager, that is 5 crore × 1.5 MB = 75,000 GB (75 TB) <em>every 4 seconds</em>, which is ~150 Tbps (if everyone watches 720p). That is impossible for one machine, and even for one data center. But there is good news: <strong>everyone needs exactly the same file</strong>, and the file never changes after it is made. Copying such a file and keeping the copies close to users is the easiest thing to do.` },
    { type: 'callout', tone: 'term', title: 'New word: origin', html: `<strong>What it is:</strong> our own server or storage where the real data is made or kept. For video, the origin = the packager (the real pieces are made there). For the score, the origin = the score service's file.<br><strong>Why it matters:</strong> the origin is in one place and its capacity is limited. Every request that reaches the origin is expensive.<br><strong>If we do not protect it:</strong> crores of requests reach the origin and it falls over. This whole lesson has one motto: <em>protect the origin</em>.` },
    { type: 'callout', tone: 'term', title: 'New word: CDN edge', html: `<strong>What it is:</strong> a CDN (Content Delivery Network) is a company's thousands of servers placed in cities, close to internet providers. Each such place is called an edge or a PoP. Copies (cache) of the pieces are kept at the edge. Details in the <a href="#/cdn">CDN lesson</a>.<br><strong>Why we need it:</strong> a phone in Mumbai gets the piece from the Mumbai edge. Only when the edge does not have a copy (a miss) does it ask the origin, and then it gives its copy to the next lakhs of people.<br><strong>Without it:</strong> all the bandwidth (10 Tbps+) would have to come from our own servers. No single data center can send that much.<br><strong>This is where segments help:</strong> caching small files that never change is the easiest job for a CDN.` },
    { type: 'callout', tone: 'term', title: 'New word: origin shield', html: `<strong>What it is:</strong> one more cache layer (a mid-tier) between the CDN edges and the origin. Edges ask the shield, not the origin directly.<br><strong>Why we need it:</strong> in live video a new piece is made, and <em>in that same second</em> thousands of edges have a miss for it. They all ask at once. The shield holds all these requests, asks the origin only <strong>once</strong>, and shares the answer with everyone. This is called <strong>request collapsing</strong>.<br><strong>Without it:</strong> for every new piece and every quality, thousands of requests reach the origin. 5 qualities × every 4 seconds × 2,000 edges = ~2,500 requests every second for just one stream, and many times more with languages and camera angles.` },
    { type: 'callout', tone: 'term', title: 'New word: multi-CDN', html: `<strong>What it is:</strong> using more than one CDN company together (CDN A, CDN B...). When the app starts playing, it gets the URL of one main CDN and a few backup CDNs.<br><strong>Why we need it:</strong> (1) Capacity: one provider alone may not carry the traffic of crores of viewers. (2) Safety: if one region of one provider goes down, the player gets the next piece from another CDN.<br><strong>Without it:</strong> a problem in one CDN = the match stops across the whole country.<br><strong>The cost:</strong> more contracts, more monitoring, and spare room (headroom) on every CDN so it can take the other's traffic.` },
    { type: 'h3', text: '2g. Ad break: ads also become pieces' },
    { type: 'p', html: `The over ends and an ad plays on TV. An ad should play in the app too, and if possible a different ad for each user (one for a viewer in Delhi, another for a viewer in Chennai). For this we need two things:` },
    { type: 'callout', tone: 'term', title: 'New words: playout, SCTE-35', html: `<strong>Playout:</strong> the broadcaster's "control room" system that runs the final on-air feed (commentary, graphics and replays all mixed together).<br><strong>SCTE-35:</strong> <strong>What it is:</strong> a small signal hidden inside the video stream, such as "a 30-second ad break starts now".<br><strong>Why we need it:</strong> all the systems further down (encoder, packager) learn when to insert an ad, without a person telling them.<br><strong>Without it:</strong> the ad would cut in at the wrong time, or a ball of the match would be hidden under an ad.` },
    { type: 'callout', tone: 'term', title: 'New word: SSAI (server-side ad insertion)', html: `<strong>What it is:</strong> joining the ad pieces in between the video pieces on the server itself. When the SCTE-35 signal arrives, a "stitching" service gets ads from the ad server and writes the names of the ad pieces into the manifest in place of the match pieces.<br><strong>Why we need it:</strong> for the player, an ad is just "more pieces". No separate ad player, no black screen while switching, and ad blockers cannot easily tell the ad apart.<br><strong>Without it (client-side ads):</strong> the app would have to fetch the ad itself and pause the video to play it, and crores of phones would hit the ad server at the same moment.<br><strong>The cost:</strong> each group of users (cohort: city, age, device) needs <em>its own manifest</em>. More manifests = fewer cache hits on the CDN. The JioHotstar blog of 2025 describes exactly this problem (see the flow below).` },
    { type: 'p', html: `That is it, the whole chain is built: <strong>camera → playout → encoder (ladder) → packager (pieces + manifest, ads) → origin shield → several CDNs → the phone's ABR player</strong>. Now you know why each part exists. The napkin maths and the design below use these same words.` },

    { type: 'h2', text: 'Step 3: napkin maths' },
    { type: 'p', html: `Every phone sends three kinds of requests. We will count all three:` },
    { type: 'list', items: [
      `<strong>Video pieces:</strong> one piece every 4 seconds (as we saw above).`,
      `<strong>Score poll:</strong> "poll" means asking again and again. The app asks "what is the score?" every few seconds (details in Deep dive 1).`,
      `<strong>Heartbeat:</strong> like the beat of a heart. Every ~30 seconds the player sends the server a tiny message: "I am still watching". This is how we count "X crore watching" (Deep dive 2).`,
    ]},
    { type: 'p', html: `The numbers from Hotstar's 2019 talk give an estimate: 2.53 crore viewers used 10 Tbps+ of bandwidth (1 Tbps = 10 lakh Mbps). That means an average of ~400 kbps per viewer (most people watch on phones, at lower quality). Change the values and see how big each thing is:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Concurrent viewers (crore): <strong class="hn-vv"></strong></label><input class="hn-v" type="range" min="0.5" max="7" step="0.5" value="6"></div>
          <div><label>Average bitrate (kbps): <strong class="hn-bv"></strong></label><input class="hn-b" type="range" min="200" max="2000" step="100" value="400"></div>
          <div><label>Score poll every N seconds: <strong class="hn-pv"></strong></label><input class="hn-p" type="range" min="1" max="10" step="1" value="2"></div>
          <div><label>Heartbeat every N seconds: <strong class="hn-hv"></strong></label><input class="hn-h" type="range" min="10" max="60" step="10" value="30"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Video bandwidth</span><strong class="hn-bw"></strong></div>
          <div class="stat"><span>Segment requests (4 s segments)</span><strong class="hn-seg"></strong></div>
          <div class="stat"><span>Score polls</span><strong class="hn-sc"></strong></div>
          <div class="stat"><span>Heartbeats</span><strong class="hn-hb"></strong></div>
        </div>
        <div class="calc-note hn-note"></div>`;
      const q = s => el.querySelector(s);
      const fmt = n => n >= 1e7 ? (n / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' crore' : n >= 1e5 ? (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' lakh' : Math.round(n).toLocaleString('en-IN');
      const upd = () => {
        const V = +q('.hn-v').value * 1e7, kb = +q('.hn-b').value, p = +q('.hn-p').value, hb = +q('.hn-h').value;
        q('.hn-vv').textContent = q('.hn-v').value; q('.hn-bv').textContent = kb; q('.hn-pv').textContent = p; q('.hn-hv').textContent = hb;
        const tbps = V * kb * 1e3 / 1e12;
        q('.hn-bw').textContent = tbps.toFixed(1) + ' Tbps';
        q('.hn-seg').textContent = fmt(V / 4) + '/s';
        q('.hn-sc').textContent = fmt(V / p) + '/s';
        q('.hn-hb').textContent = fmt(V / hb) + '/s';
        q('.hn-note').textContent = `No single data center can send ${tbps.toFixed(1)} Tbps: the video can only go out from CDN edge servers (several CDNs together). If the ${fmt(V / p)} score requests/s came straight to our servers, no database could survive it; so the score also comes from the CDN. Only "personal" calls like heartbeats and login should reach the origin. Assumption: every player fetches one 4 s segment at a time.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Conclusion: in this system, protecting the <strong>origin</strong> (our own servers) is the whole game. Anything that is the same for everyone (video segments, score, scorecard, viewer count) goes through the CDN. One principle in Hotstar's 2018 blog was exactly this: do not let traffic reach the origin at all, as far as possible.` },

    { type: 'h2', text: 'Step 4: API and core entities' },
    { type: 'code', text: `
POST /v1/play  { matchId, language: "hi", angle: "main" }      (login + entitlement check)
  → { manifestUrl: "https://cdn-a.xyz.com/live/m42/hi/master.m3u8?token=...",
      fallbackCdns: ["cdn-b..."], heartbeatEverySec: 30 }

GET  https://cdn-a.xyz.com/live/m42/hi/720p/seg_18342.ts        (video, from the CDN)

GET  https://static.xyz.com/live/m42/score.json                  (score, from the CDN, TTL ~1-2 s)
  → { "runs": 187, "wkts": 4, "overs": "17.3", "lastBall": "4", "v": 9121 }

POST /v1/heartbeat  { sessionId, matchId, position }             (every 30 s, reaches the origin)` },
    { type: 'p', html: `In plain words: first the app asks <code>/v1/play</code> "may I watch this match?" (a login and subscription check, called <strong>entitlement</strong>). The answer contains the URL of the master manifest (with a <strong>token</strong>, so that people cannot share the link and watch for free) and a list of backup CDNs. After that, both the video pieces and the score come from the CDN. Only play and heartbeat calls reach our own servers (the origin).` },
    { type: 'table', head: ['Entity', 'What it stores'], rows: [
      ['Match', 'id, teams, status, which streams exist (language × camera angle)'],
      ['Stream / rendition ladder', 'the qualities of each stream: 240p to 1080p, and the bitrate of each'],
      ['Score snapshot', 'a small JSON: runs, wickets, overs, last ball, version number'],
      ['Session', 'which user, which device, which stream, when the last heartbeat came'],
      ['Ad break', 'time of the SCTE-35 marker, duration, which ad for which cohort'],
    ]},

    { type: 'h2', text: 'Step 5: the video path, from stadium to phone (design)' },
    { type: 'p', html: `In recorded video (YouTube), the file is complete in advance. In live video, the video is being made <em>right now</em>, so every job happens on the move, every 4 seconds. Let us now join all the parts from Step 2 in one line (for recorded video, see the <a href="#/design-youtube">YouTube / Netflix</a> lesson; the only difference here is that this conveyor belt never stops):` },
    { type: 'steps', items: [
      { t: 'Production and playout', d: 'The broadcaster\'s team makes one feed from the stadium cameras (commentary, graphics, replays). According to JioHotstar\'s Dec 2025 blog, playout operators also put ad-break signals (SCTE-35) into this feed.' },
      { t: 'Live encoder', d: 'Compresses each second of video within that same second, in 5 qualities at once (ladder: 240p to 1080p). Every language and every camera angle is a separate stream, so the encoders\' work multiplies.' },
      { t: 'Packager (origin)', d: 'Cuts the video of each quality into 4-second pieces (segments). As soon as a new piece is ready, it adds its name to the manifest (the list) and removes the oldest one. During an ad break it adds ad pieces (SSAI).' },
      { t: 'Origin shield + CDNs', d: 'When a new piece is asked for the first time, the shield fetches it from the origin only once. Then the edge servers of several CDN companies, close to the viewers\' cities, give that same piece to crores of people.' },
      { t: 'Player (ABR)', d: 'Every few seconds the phone reads the manifest again, fetches the new piece, and picks a quality for each piece by looking at the network. 240p on weak 4G, 1080p on WiFi.' },
    ]},
    { type: 'p', html: `The diagram below is this same chain. Click each box to read what it does. In the scenarios, watch: the journey of one piece, request collapsing at the shield, one CDN failing, and an ad break.` },
    { type: 'flow', title: 'Live video path', height: 340,
      nodes: [
        { id: 'feed', label: 'Stadium feed', sub: 'production', x: 80, y: 60, w: 130, kind: 'client', info: 'What it is: the final TV feed made from the stadium cameras (commentary, graphics, replays). In this design it is the starting point of the video. The playout system puts ad-break signals (SCTE-35) into this feed.' },
        { id: 'enc', label: 'Live encoder', sub: 'ABR ladder', x: 260, y: 60, w: 140, kind: 'server', info: 'What it is: the machine that makes the huge raw video ~250 times smaller (compresses it), in 5 qualities (the ladder) at once. In live video it must do this within the same second, without falling behind. According to Hotstar\'s 2018 blog, they measured the time of every part of the encoding workflow and tuned the encoder settings, bringing the delay behind the broadcast down from ~55 s to ~15-20 s.' },
        { id: 'pkg', label: 'Packager', sub: 'HLS/DASH + SSAI', x: 460, y: 60, w: 160, kind: 'server', info: 'What it is: the machine that cuts the encoder\'s video into 4-second pieces (segments), saves them as files, and updates the manifest (the list of pieces) every 4 seconds. It is the origin of the video. According to JioHotstar\'s 2025 blog, their in-house stitching service gets ads from the ad server and adds ad segments into the manifest of each cohort (server-side ad insertion).' },
        { id: 'shield', label: 'Origin shield', sub: 'mid-tier cache', x: 460, y: 190, w: 160, kind: 'cache', info: 'What it is: an extra cache layer between the CDN edges and the origin. Why: for a new piece, it turns the requests of thousands of edges into one request to the origin. In its Dec 2025 blog, JioHotstar wrote that compute on the origin shield grew when the number of cohort manifests grew a lot.' },
        { id: 'cdnA', label: 'CDN A', sub: 'edge PoPs', x: 260, y: 190, w: 140, kind: 'edge', info: 'What it is: the edge servers of one CDN company, close to the viewers\' cities, where copies of the pieces are kept. This is how 10 Tbps+ of video reaches crores of people. Hotstar has been an Akamai customer since 2015 (Akamai, 2016). Hotstar\'s 2024 blog speaks of "CDNs" and "CDN providers" in the plural: one provider alone cannot carry this much traffic.' },
        { id: 'cdnB', label: 'CDN B', sub: 'second provider', x: 260, y: 300, w: 140, kind: 'edge', info: 'What it is: the edge servers of a second CDN company. Multi-CDN adds capacity and also protects us when one provider fails. Which viewer gets which CDN is usually decided by steering logic (region, health, cost); Hotstar has not made its exact logic public.' },
        { id: 'viewer', label: 'Viewers', sub: 'ABR player', x: 80, y: 245, w: 120, kind: 'client', info: 'What it is: the video players on crores of phones, TVs and browsers. Every few seconds the player reads the manifest again, fetches the next piece, and picks a quality for each piece by looking at the network (ABR). It keeps ~12 s of video in its buffer.' },
      ],
      edges: [{ a: 'feed', b: 'enc' }, { a: 'enc', b: 'pkg' }, { a: 'pkg', b: 'shield' }, { a: 'shield', b: 'cdnA' }, { a: 'shield', b: 'cdnB' }, { a: 'cdnA', b: 'viewer' }, { a: 'cdnB', b: 'viewer' }],
      scenarios: [
        { name: 'Journey of one segment', steps: [
          { title: 'A ball is bowled', text: 'The camera feed goes from production to the encoder.', go: 'feed>enc', msg: 'live feed (1080p, commentary: hi)' },
          { title: 'Encode + package', text: 'The encoder encoded the last few seconds in every quality of the ladder. The packager made a new segment for each quality and added it to the manifest.', go: 'enc>pkg', msg: 'seg_18342 (240p ... 1080p), playlist updated' },
          { title: 'First request: miss', text: 'A viewer asked for the new segment. The CDN edge did not have it, the shield did not have it either, so the request went to the origin (the packager). This happens only once for each new segment.', go: ['viewer>cdnA>shield>pkg', 'res:pkg>shield>cdnA>viewer'], after: { shield: { state: 'hit' } } },
          { title: 'The other crores: hit', text: 'The next lakhs of viewers got the same segment from the edge. The origin did not even notice.', flood: { paths: ['res:cdnA>viewer', 'res:cdnB>viewer'], n: 12 }, after: { cdnA: { state: 'hit' }, cdnB: { state: 'hit' } } },
        ]},
        { name: 'Request collapsing', intro: 'In live video, everyone asks for the same segment in the same second. What if there were no shield?', steps: [
          { title: 'Thousands of edges at once', text: 'A new segment was published. Hundreds of edge servers of both CDNs came to the shield for that segment at the same time.', flood: { paths: ['cdnA>shield', 'cdnB>shield'], n: 12 }, after: { shield: { state: 'warn', sub: 'collapsing' } } },
          { title: 'Only one at the origin', text: 'The shield held all the requests and asked the origin only once. As soon as the answer came, it gave it to everyone. Without a shield, the origin would get thousands of requests for every segment, for every quality.', go: ['shield>pkg', 'res:pkg>shield'], after: { shield: { state: 'hit', sub: 'mid-tier cache' } } },
        ]},
        { name: 'CDN A fails', steps: [
          { title: 'CDN A edges slow / down', text: 'One provider has a problem in one region. Segments are not arriving on time.', set: { cdnA: { state: 'down', sub: 'errors' } }, go: 'bad:viewer>cdnA' },
          { title: 'The player tries another CDN', text: 'The play API already gave a list of fallback CDNs. The player fetches the next segment from CDN B. The buffer held a few seconds of video, so the user may not even notice.', go: ['viewer>cdnB', 'res:cdnB>viewer'], after: { cdnB: { state: 'hot', sub: 'extra load' } } },
          { title: 'But CDN B suddenly carries extra load', text: 'All the traffic of one provider fell on the other. That is why, with multi-CDN, every provider needs headroom, or one failure brings down the other too. A summary of Hotstar\'s 2019 talk says their load tests also simulated CDN failure.', focus: ['cdnB'] },
        ]},
        { name: 'Ad break (SSAI)', steps: [
          { title: 'Over ends, a marker arrives', text: 'Playout put an SCTE-35 marker into the feed: a 30-second ad break.', go: 'feed>enc>pkg', msg: 'SCTE-35: break start, duration 30 s' },
          { title: 'Ads in the cohort manifest', text: 'For each cohort (groups such as age, city, device), the stitching service gets ads from the ad server and writes ad segments into the manifest in place of the content. For the player these are just more segments: one player, no switching.', focus: ['pkg'], set: { pkg: { state: 'hot', sub: 'stitching ads' } } },
          { title: 'The cost: less caching', text: 'A separate manifest for each cohort = more different objects on the CDN, fewer cache hits, more work for the shield. In its Dec 2025 blog, JioHotstar wrote that this is why they are moving towards server-guided ad insertion (SGAI): one common manifest for everyone, and the ad decision made on the client\'s request.', go: ['viewer>cdnA>shield', 'res:shield>cdnA>viewer'], after: { shield: { state: 'warn', sub: 'many manifests' }, pkg: { state: '', sub: 'HLS/DASH + SSAI' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Latency: how far behind TV are we?' },
    { type: 'p', html: `Your neighbour shouts "six!" while on your phone the ball is still in the bowler's hand: that is <strong>latency</strong>. According to Hotstar's 2018 blog, within one year they brought it down from ~55 seconds behind the broadcast to ~15-20 seconds, by measuring the time of every part of the encoding workflow. Where does this delay come from?` },
    { type: 'list', items: [
      `<strong>Encode + package</strong>: a few seconds to encode the video and build the segment.`,
      `<strong>Segment must be complete</strong>: a 6-second segment can be published only after 6 seconds of video have been made.`,
      `<strong>The player's safety buffer</strong>: the HLS standard (RFC 8216) says that in live video the player should not start playback within the last ~3 target durations of the playlist (target duration = the length of one piece), or it may stall. So the player stays ~3 segments behind on purpose.`,
      `<strong>CDN + network</strong>: the time for the segment to reach the edge and then the phone.`,
    ]},
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Segment duration (s): <strong class="hl-sv"></strong></label><input class="hl-s" type="range" min="1" max="10" step="1" value="6"></div>
          <div><label>Encode + package delay (s, assumed): <strong class="hl-ev"></strong></label><input class="hl-e" type="range" min="1" max="10" step="1" value="4"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Until the segment is complete</span><strong class="hl-a"></strong></div>
          <div class="stat"><span>Player buffer (3 segments)</span><strong class="hl-b"></strong></div>
          <div class="stat"><span>Total, behind the broadcast</span><strong class="hl-t"></strong></div>
          <div class="stat"><span>Manifest reloads per viewer / min</span><strong class="hl-r"></strong></div>
        </div>
        <div class="calc-note hl-note"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const S = +q('.hl-s').value, E = +q('.hl-e').value, net = 1;
        q('.hl-sv').textContent = S; q('.hl-ev').textContent = E;
        const total = E + S + 3 * S + net;
        q('.hl-a').textContent = S + ' s'; q('.hl-b').textContent = (3 * S) + ' s';
        q('.hl-t').textContent = '~' + total + ' s'; q('.hl-r').textContent = Math.round(60 / S);
        q('.hl-note').textContent = `Formula: encode (${E}) + segment (${S}) + 3 × segment (${3 * S}) + network (~${net}) ≈ ${total} s. Shorter segments = lower latency, but every viewer reloads the manifest more often (${Math.round(60 / S)} times/minute), and the CDN gets more requests and more small files. Longer segments = cheaper and more stable, but further behind TV. Newer methods such as Low-latency HLS (LL-HLS) send each piece in even smaller parts (partial segments), so the player does not wait for the whole piece to finish.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common mistake: does "live" mean zero delay?', html: `No. HTTP streaming (HLS/DASH) always has a delay of a few seconds, because the video is split into segments and comes through a CDN. This delay is the price of reaching crores of people cheaply: segments can be cached. A delay under 1 second, like video-call technology (WebRTC), is far more expensive for crores of viewers. For live sports, "a little behind TV, but never stuck" is the right trade-off.` },
    { type: 'p', html: `You already played with how the quality is chosen (ABR) in the segment player above, and the <a href="#/design-youtube">YouTube / Netflix</a> lesson has more detail. Hotstar's 2017 blog made one more point: when concurrency gets close to the platform's capacity, bitrate is the first lever to pull down, because the infrastructure's bandwidth has a hard limit. 6 crore × 100 kbps less = 6 Tbps saved.` },

    { type: 'h2', text: 'Deep dive 1: live score, 5 crore phones every 2 seconds' },
    { type: 'p', html: `<strong>Current architecture:</strong> the score service writes the score of every ball into a database, and the app reads it with <code>GET /score</code>. <strong>New problem:</strong> 5 crore people are in the match, and every phone asks every 2 seconds. That is 2.5 crore requests per second, and every answer is <em>exactly the same</em>. The score changes only once per ball (about once every 30-40 seconds), but it is read crores of times.` },
    { type: 'callout', tone: 'term', title: 'New words: polling, JSON, TTL', html: `<strong>Polling:</strong> <strong>What it is:</strong> the app itself asks again and again "anything new?", for example every 2 seconds. The server never sends anything on its own.<br><strong>JSON:</strong> a simple text format for writing data, like <code>{ "runs": 187, "wkts": 4 }</code>.<br><strong>TTL (Time To Live):</strong> <strong>What it is:</strong> how long a cached copy counts as "fresh". TTL 1 second = the edge serves its copy for 1 second, then fetches a new one from the origin.<br><strong>Why we need it:</strong> a short TTL = a fresh score, but more requests to the origin. A long TTL = a relaxed origin, but an older score.<br><strong>Without it (TTL = 0):</strong> every poll would go to the origin, and the CDN would be useless.` },
    { type: 'p', html: `<strong>Solution:</strong> turn the score into a small <strong>JSON file</strong> and put it behind the CDN, with a very short TTL (~1-2 seconds). Now each CDN edge server asks the origin at most once per TTL, whether 1 viewer or 10 lakh viewers are behind it. According to Hotstar's 2024 blog (preparing for the 2023 World Cup), features like the scorecard, concurrency count and key moments were treated as "highly cacheable". They were moved to a separate CDN domain with lighter security and routing rules, to save compute on the edge servers.` },
    { type: 'flow', title: 'Live score path', height: 300,
      nodes: [
        { id: 'scorer', label: 'Scorer app', sub: 'every ball', x: 80, y: 70, w: 130, kind: 'client', info: 'What it is: the scorer\'s app. A scorer sitting in the stadium or studio enters the result of every ball (runs, wicket, extras). It comes from one place only, so there are very few writes.' },
        { id: 'score', label: 'Score service', sub: 'validate + save', x: 280, y: 70, w: 150, kind: 'server', meter: true, load: 10, info: 'What it is: our service that checks (validates) the event of every ball, writes it to the DB, and publishes a new score JSON. Its load depends on the scorers, not on the viewers. That is the whole trick.' },
        { id: 'db', label: 'Score DB', sub: 'ball-by-ball', x: 280, y: 220, w: 140, kind: 'data', info: 'What it is: the database with the permanent record of every ball. The scorecard, commentary and stats are all built from it. Viewers never read it directly.' },
        { id: 'json', label: 'score.json', sub: 'origin file', x: 480, y: 70, w: 140, kind: 'data', info: 'What it is: a small (~1 KB) JSON file with the score and a version number. It is the origin of the score. It sits in object storage or on a light origin server. This is what the CDN caches.' },
        { id: 'cdn', label: 'CDN edges', sub: 'TTL 1-2 s', x: 480, y: 220, w: 140, kind: 'edge', info: 'What it is: the CDN edge servers. Each edge keeps a copy of score.json for 1-2 seconds. All polls during that time are answered from the copy. Only when the TTL ends does it fetch a new copy from the origin.' },
        { id: 'fans', label: 'Viewers', sub: 'poll every 2 s', x: 650, y: 220, w: 120, kind: 'client', info: 'What it is: crores of apps that ask for score.json every few seconds (polling). A good app adds a little random jitter (each phone adds a small random time to its interval), so that everyone does not ask in the same millisecond.' },
      ],
      edges: [{ a: 'scorer', b: 'score' }, { a: 'score', b: 'db' }, { a: 'score', b: 'json' }, { a: 'json', b: 'cdn' }, { a: 'cdn', b: 'fans' }, { a: 'fans', b: 'score', id: 'direct', hidden: true, dashed: true }],
      scenarios: [
        { name: 'One ball, crores of polls', steps: [
          { title: 'Four!', text: 'The scorer entered the result of the ball.', go: 'scorer>score', msg: '{ ball: "17.3", runs: 4 }' },
          { title: 'Save + new JSON', text: 'The score service wrote the ball into the DB and published a new version of score.json. That is just two or three writes.', parallel: true, go: ['score>db', 'score>json'], msg: 'score.json v9121: 187/4 (17.3)' },
          { title: 'Polls stop at the edge', text: 'Lakhs of polls arrived. The edge had a copy (the TTL was not over yet), so all of them were answered there. Some viewers got a score that was one second old: that is fine.', flood: { paths: ['fans>cdn', 'res:cdn>fans'], n: 12 }, after: { cdn: { state: 'hit' } } },
          { title: 'TTL over, one refresh', text: 'When each edge\'s TTL ended, it fetched a new copy from the origin once. 5 crore viewers, but the origin only gets as many requests as there are edge servers.', go: ['cdn>json', 'res:json>cdn', 'res:cdn>fans'], msg: 'GET score.json → v9121 (cache for 1 s)' },
        ]},
        { name: 'Without CDN (failure)', intro: 'What if the app asked the score service directly?', steps: [
          { title: 'Direct connection', text: 'Every poll goes straight to the score service.', show: ['direct'], set: { cdn: { state: 'dim' }, json: { state: 'dim' } }, go: 'fans>score' },
          { title: '2.5 crore requests/s', text: 'Every answer is the same, but the server does work for every request. The service heats up, then goes down. Now even the scorer cannot update the score.', flood: { paths: ['fans>score'], n: 14 }, after: { score: { state: 'down', sub: 'overloaded', load: 100 } } },
          { title: 'Lesson', text: 'Data that is the same for everyone and can be slightly old should never be served per user from the origin. The "Once Only" principle from Hotstar\'s 2018 blog: keep as much traffic as possible away from the origin with caching and client-side TTLs.', hide: ['direct'], set: { score: { state: '', sub: 'validate + save', load: 10 }, cdn: { state: '' }, json: { state: '' } } },
        ]},
        { name: 'TTL cloudburst', steps: [
          { title: 'All copies expire together', text: 'All edges cached score.json at the same moment, so all their TTLs also end at the same moment. Thousands of edges hit the origin at once.', flood: { paths: ['cdn>json'], n: 12 }, after: { json: { state: 'hot', sub: 'burst' } } },
          { title: 'The fix', text: 'Request collapsing through an origin shield (just one fetch), a little random jitter in the TTL, and "stale-while-revalidate" (a CDN setting: keep serving the old copy while fetching a new one in the background). Hotstar\'s 2019 blog called this a "TTL cloudburst": when many objects (tokens, timers) expire together, a storm hits the origin.', set: { json: { state: '', sub: 'origin file' } }, go: ['cdn>json', 'res:json>cdn'] },
        ]},
        { name: 'Score service down', steps: [
          { title: 'The service crashed', text: 'The score service crashed. No new JSON is being published.', set: { score: { state: 'down', sub: 'DOWN' } }, go: 'bad:scorer>score' },
          { title: 'Video and app keep running', text: 'The edges still have the old score.json. Usually the CDN is told "if there is an error, serve the old copy" (stale-if-error). The score will look frozen for a while, but the app will not crash, and the video has nothing to do with this service.', go: ['fans>cdn', 'res:cdn>fans'], after: { cdn: { state: 'warn', sub: 'stale copy' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Calculator: how much does the CDN protect the origin?' },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Viewers polling (crore): <strong class="hp-vv"></strong></label><input class="hp-v" type="range" min="0.5" max="7" step="0.5" value="5"></div>
          <div><label>Poll every N seconds: <strong class="hp-pv"></strong></label><input class="hp-p" type="range" min="1" max="10" step="1" value="2"></div>
          <div><label>CDN TTL (s): <strong class="hp-tv"></strong></label><input class="hp-t" type="range" min="1" max="10" step="1" value="1"></div>
          <div><label>CDN edge servers (assumed): <strong class="hp-ev"></strong></label><input class="hp-e" type="range" min="500" max="5000" step="500" value="2000"></div>
        </div>
        <div class="chips hp-mode" role="group" aria-label="Setup">
          <button type="button" class="chip" data-m="none">Without CDN</button>
          <button type="button" class="chip on" data-m="cdn">CDN</button>
          <button type="button" class="chip" data-m="shield">CDN + origin shield</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Requests from viewers</span><strong class="hp-c"></strong></div>
          <div class="stat"><span>Requests at the origin</span><strong class="hp-o"></strong></div>
          <div class="stat"><span>Origin saved (offload)</span><strong class="hp-off"></strong></div>
          <div class="stat"><span>How old the score can be (max)</span><strong class="hp-st"></strong></div>
        </div>
        <div class="calc-note hp-note"></div>`;
      const q = s => el.querySelector(s);
      let mode = 'cdn';
      const fmt = n => n >= 1e7 ? (n / 1e7).toFixed(1).replace(/\.0$/, '') + ' crore' : n >= 1e5 ? (n / 1e5).toFixed(1).replace(/\.0$/, '') + ' lakh' : Math.round(n).toLocaleString('en-IN');
      const SHIELDS = 20;
      const upd = () => {
        const V = +q('.hp-v').value * 1e7, p = +q('.hp-p').value, ttl = +q('.hp-t').value, E = +q('.hp-e').value;
        q('.hp-vv').textContent = q('.hp-v').value; q('.hp-pv').textContent = p; q('.hp-tv').textContent = ttl; q('.hp-ev').textContent = E;
        const client = V / p;
        const origin = mode === 'none' ? client : mode === 'cdn' ? Math.min(client, E / ttl) : Math.min(client, SHIELDS / ttl);
        q('.hp-c').textContent = fmt(client) + '/s';
        q('.hp-o').textContent = fmt(origin) + '/s';
        const off = 100 * (1 - origin / client);
        q('.hp-off').textContent = off >= 99.99 ? '> 99.99%' : off.toFixed(2) + '%';
        q('.hp-st').textContent = mode === 'none' ? '~' + p + ' s' : '~' + (p + ttl) + ' s';
        q('.hp-note').textContent = mode === 'none'
          ? `Every poll goes straight to the origin: ${fmt(client)} requests/s, all with the same answer. No database or fleet of services can handle this cheaply.`
          : mode === 'cdn'
            ? `Each edge server asks the origin once per TTL (assuming each edge collapses its own requests): ${E} edges ÷ ${ttl} s = ${fmt(origin)}/s. If viewers grow 10 times, the origin load stays the same. The cost: because of the CDN, the score can be ${ttl} s older (on top of the poll interval).`
            : `Edges now ask ${SHIELDS} shield servers (assumed) instead of the origin, and only the shields go to the origin: ${SHIELDS} ÷ ${ttl} s = ${fmt(origin)}/s. The origin load no longer depends on viewers, only on the TTL and the number of shields.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      el.querySelectorAll('.hp-mode .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.hp-mode .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      upd();
    }},
    { type: 'p', html: `With the default values: 5 crore viewers, every 2 seconds = <strong>2.5 crore requests/s</strong> from viewers. With a CDN, the origin gets only ~2,000/s (edges ÷ TTL); with a shield, ~20/s. This is why the trick is <em>independent</em> of the number of viewers, and why the origin stays calm even in a tsunami.` },
    { type: 'h3', text: 'Why polling, and not push (WebSocket)?' },
    { type: 'p', html: `The opposite of polling is <strong>push</strong>: every phone keeps one connection open to the server (for example a WebSocket), and the server sends the new score as soon as it arrives. It sounds better. But look at the numbers for crores of people:` },
    { type: 'table', head: ['', 'CDN polling', 'Push (WebSocket / MQTT)'], rows: [
      ['Server cost per viewer', 'Zero: the CDN edge handles it', 'One open connection per viewer, crores of connections'],
      ['Freshness', 'Up to TTL + poll interval old (1-3 s)', 'Instant'],
      ['During a spike', 'New viewers only add load on the CDN', 'Lakhs of new connections at once (connect storm)'],
      ['When to use', 'Data is the same for everyone and a 1-2 s delay is fine (score, viewer count)', 'Data is per user or needed instantly (chat, emojis, polls)'],
    ]},
    { type: 'p', html: `Both can run together. According to Hotstar's 2020 blog, for live emojis they used their in-house <strong>PubSub</strong> (real-time messaging): emojis come in over HTTP and go into <a href="#/kafka">Kafka</a>, a Spark streaming job (a data-processing program that runs non-stop) computes a total (aggregate) every 2 seconds, and the most popular emojis are pushed to the apps through PubSub. In the 2019 World Cup, ~5.5 crore users sent ~500 crore emojis. The full push vs poll comparison is in the <a href="#/realtime">real-time lesson</a>.` },
    { type: 'callout', tone: 'tip', title: 'No dumb clients', html: `A principle from Hotstar's 2018 blog: the client app must not be "dumb". Random <strong>jitter</strong> in polls (so that not everyone asks in the same millisecond), <strong>exponential back-off</strong> on errors (no instant retry; after every failure the wait doubles: 1 s, 2 s, 4 s, 8 s...), local caching, and stopping by itself when the server sends a "panic" signal. During a tsunami, the retries of crores of clients are either your biggest weapon or your biggest enemy.` },

    { type: 'h2', text: 'Deep dive 2: "6 crore watching": how is this number made?' },
    { type: 'p', html: `The viewer count in the corner of the screen does two jobs: fans enjoy it, and for engineers it is the <strong>most important metric</strong>. According to a summary of Hotstar's 2019 talk, they scaled servers by request count or by <strong>platform concurrency</strong>, and in their 2018 blog the capacity "ladders" were set by estimated concurrency. Hotstar's 2024 blog lists "concurrency" as a cacheable feature, just like the scorecard.` },
    { type: 'callout', tone: 'term', title: 'New word: heartbeat', html: `<strong>What it is:</strong> a tiny message the player sends every ~30 seconds: "I (session 7f3a) am still watching match m42".<br><strong>Why we need it:</strong> it is the cheapest way to know who is watching right now. No message = the viewer has left.<br><strong>Without it:</strong> we would not know how many people are watching right now. The video pieces come from the CDN, so those requests never reach our servers.<br><strong>Example:</strong> 6 crore viewers ÷ 30 s = <strong>~20 lakh heartbeats every second</strong>. This is the biggest stream that reaches the origin, so it must also be kept light.` },
    { type: 'p', html: `Hotstar has not made its exact counting method public. In the industry, it is usually built like this:` },
    { type: 'steps', items: [
      { t: 'Heartbeat', d: 'Every running player sends a small "I am alive" message every ~30 seconds: sessionId, matchId, stream. If the player is closed, the app goes to the background, or the phone loses network, the heartbeats stop.' },
      { t: 'Window', d: 'A viewer counts as "concurrent" if their last heartbeat came in the last ~60 seconds. The window is longer than the interval so that a viewer is still counted even if one heartbeat is missed.' },
      { t: 'Sharded counting', d: 'One machine cannot count 20 lakh messages per second. So split the work: compute a number (hash) from the sessionId and send each heartbeat to one of many parts (shards or Kafka partitions). Each shard counts its own active sessions. The same session always goes to the same shard, so nothing is counted twice; total = the sum of all shards.' },
      { t: 'Or approximate', d: 'If keeping the full list of crores of sessionIds is too heavy, use HyperLogLog: a clever counting method that keeps no list, only a small "sketch". In ~12 KB it estimates crores of unique sessions with ~1% error, and sketches can also be merged (<a href="#/ds-for-scale">data structures for scale</a>).' },
      { t: 'Publish', d: 'Every few seconds or every minute, the total goes into a small JSON, and that also goes out through the CDN, like the score. The viewer count does not need to be exact every second.' },
    ]},
    { type: 'ascii', text: `
 players ──heartbeat (30 s)──> ingest ──> Kafka (key = sessionId) ──> counters (per partition)
                                                                        │ count "last seen < 60 s"
                                                                        v
                         CDN <── concurrency.json <── sum of partitions ──> autoscaler / dashboards
 6 crore viewers ÷ 30 s = ~20 lakh heartbeats/s: the biggest stream that reaches the origin.` },
    { type: 'callout', tone: 'mistake', title: 'Common mistake: count requests and you get viewers?', html: `No. One viewer asks for a segment every 4 seconds, the score every 2 seconds, and other APIs now and then; the number of requests is not the number of viewers. Also, segment requests end at the CDN and never reach the origin. That is why we need a separate, cheap signal (the heartbeat). This number is always <strong>approximate</strong>: some heartbeats get lost, and because of the window, someone who just left is counted for ~1 more minute.` },

    { type: 'h2', text: 'Deep dive 3: the tsunami, and why autoscaling loses' },
    { type: 'p', html: `The story from Hotstar's 2017 blog "T For Tsunami": the India-Pakistan match of the Champions Trophy. The team had planned for 70 lakh concurrency. Then <strong>Virat Kohli walked in to bat</strong>, a push notification went to a large group of users, and the login API went from <strong>10 thousand to 1.25 lakh requests/s</strong> within a few seconds. The platform hiccupped.` },
    { type: 'p', html: `What did the post-mortem find? The front servers were scaled for 70 lakh, but the <strong>database</strong> had not been grown to match, and it melted down (its memory filled up so much that it started using the disk as memory, called <em>swap</em>, and became very slow). A request like login cannot be cached (every user is different), so all the load went straight to the DB. Lesson: you scale the whole chain, not just the front servers. The clients also had to be made smart, so that they smooth this wave a little.` },
    { type: 'callout', tone: 'term', title: 'New word: tsunami traffic', html: `A normal spike rises slowly. In a <strong>tsunami</strong>, a wall of traffic arrives at once: a notification goes out, and within one minute lakhs of people pass through the same path (open app → login → home → play). A summary of Hotstar's 2019 talk put this growth at <strong>10 lakh+ users per minute</strong>.` },
    { type: 'p', html: `Why is autoscaling (details in the <a href="#/pattern-spikes">traffic spikes lesson</a>) not enough? Points from the same 2019 talk summary: ~1 minute for an app to boot, ~90 seconds to decide based on a metric, and during a spike the cloud provider may simply run out of that type of machine (insufficient capacity errors). By the time the new machine arrives, the wave has already passed. The direct answer in Hotstar's 2018 blog: <strong>we will not rely on autoscaling</strong>. Estimate the peak concurrency, and scale to it <em>before</em> the match.` },
    { type: 'callout', tone: 'term', title: 'New words: autoscaling, pre-scaling', html: `<strong>Autoscaling:</strong> <strong>What it is:</strong> the cloud's automatic system that adds or removes machines by itself by watching the load (for example CPU).<br><strong>Why it is good:</strong> cheap on normal days: as much load, as many machines.<br><strong>Where it loses:</strong> it wakes up <em>after</em> the load has grown, and a new machine takes minutes to start. A tsunami arrives in seconds.<br><strong>Pre-scaling:</strong> <strong>What it is:</strong> the event time is known (the match starts at 7:30), so we start machines before it, based on an estimate (forecast).<br><strong>Why we need it:</strong> capacity is ready from the first second of the tsunami.<br><strong>Without it:</strong> Kohli walks in, the notification goes out, and the app has fallen over before the machines arrive.<br><strong>The cost:</strong> paying for machines that stand idle, and trouble anyway if the forecast is wrong. So use both: pre-scale as the floor, autoscale as the safety net above it.` },
    { type: 'h3', text: 'Simulator: the timeline of one match' },
    { type: 'p', html: `A made-up T20 match (load in "lakh rps"; rps = requests per second; the numbers are assumed, the shape is like Hotstar's stories). Toss, wickets, the return after the innings break, and the winning moment: each one brings a spike. Try three strategies. Red = when load was above capacity (users got errors).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips ht-mode" role="group" aria-label="Strategy">
          <button type="button" class="chip on" data-m="auto">Only autoscaling</button>
          <button type="button" class="chip" data-m="pre">Only pre-scaling</button>
          <button type="button" class="chip" data-m="both">Pre-scale + autoscale</button>
        </div>
        <div class="row2">
          <div><label>Autoscale lag (min): <strong class="ht-lv"></strong></label><input class="ht-l" type="range" min="1" max="10" step="1" value="5"></div>
          <div><label>Pre-scale capacity (lakh rps): <strong class="ht-fv"></strong></label><input class="ht-f" type="range" min="20" max="50" step="1" value="40"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input class="ht-n" type="checkbox" checked style="width:auto"> Star batter walks in + push notification (minute 96)</label>
        <svg class="ht-svg" viewBox="0 0 720 270" style="width:100%;height:auto;display:block" role="img" aria-label="Match timeline: load vs capacity"></svg>
        <div class="stats">
          <div class="stat"><span>Minutes with errors</span><strong class="ht-om"></strong></div>
          <div class="stat"><span>Worst moment: fail %</span><strong class="ht-w"></strong></div>
          <div class="stat"><span>Failed requests</span><strong class="ht-fr"></strong></div>
          <div class="stat"><span>Capacity bill (autoscale = 100)</span><strong class="ht-c"></strong></div>
        </div>
        <div class="calc-note ht-note"></div>`;
      const q = s => el.querySelector(s);
      const T = 280, STEP = 1.5;
      const bump = (t, t0, h, d) => t >= t0 ? h * Math.exp(-(t - t0) / d) : 0;
      const load = notif => { const L = []; for (let t = 0; t < T; t++) {
        let b = t < 30 ? 2 + t * 0.1 : t < 60 ? 5 + (t - 30) * 0.1 : t < 150 ? 8 + (t - 60) * 0.11 : t < 170 ? 18 - (t - 150) * 0.35 : t < 255 ? 11 + (t - 170) * 0.2 : t < 262 ? 28 : Math.max(2, 28 - (t - 262) * 1.6);
        b += bump(t, 30, 4, 3) + bump(t, 95, 5, 3) + bump(t, 130, 5, 3) + bump(t, 170, 7, 4) + bump(t, 205, 5, 3) + bump(t, 238, 6, 3) + bump(t, 259, 8, 2);
        if (notif) b += bump(t, 96, 12, 2);
        L.push(b); } return L; };
      const capacity = (L, m, lag, F) => { const C = []; let a = 6; for (let t = 0; t < T; t++) {
        const tgt = Math.max(6, L[Math.max(0, t - lag)] * 1.2);
        a = tgt > a ? Math.min(tgt, a + STEP) : Math.max(tgt, a - 0.5);
        const lad = t < 15 ? 6 : t < 45 ? 0.6 * F : F;
        C.push(m === 'auto' ? a : m === 'pre' ? lad : Math.max(lad, a)); } return C; };
      const stats = (L, C) => { let drop = 0, over = 0, cost = 0, worst = 0, wt = -1;
        for (let t = 0; t < T; t++) { const d = Math.max(0, L[t] - C[t]); drop += d; if (d > 0.05) over++; cost += C[t]; if (d / L[t] > worst) { worst = d / L[t]; wt = t; } }
        return { drop, over, cost, worst, wt }; };
      let mode = 'auto';
      const X = t => 40 + t * (670 / T), Y = v => 225 - v * (200 / 50);
      const marks = [[30, 'toss'], [96, 'star + notif'], [150, 'break'], [170, 'return'], [259, 'win']];
      const upd = () => {
        const lag = +q('.ht-l').value, F = +q('.ht-f').value, notif = q('.ht-n').checked;
        q('.ht-lv').textContent = lag; q('.ht-fv').textContent = F;
        const L = load(notif), C = capacity(L, mode, lag, F), s = stats(L, C), base = stats(L, capacity(L, 'auto', lag, F));
        let red = '';
        for (let t = 0; t < T; t++) if (L[t] > C[t]) red += `<rect x="${X(t).toFixed(1)}" y="${Y(L[t]).toFixed(1)}" width="${(670 / T + 0.4).toFixed(2)}" height="${(Y(C[t]) - Y(L[t])).toFixed(1)}" style="fill:var(--red);opacity:.55"/>`;
        const path = A => A.map((v, t) => (t ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
        let grid = '';
        for (let v = 0; v <= 50; v += 10) grid += `<line x1="40" x2="710" y1="${Y(v)}" y2="${Y(v)}" style="stroke:var(--line);stroke-width:1"/><text x="34" y="${Y(v) + 4}" text-anchor="end" style="fill:var(--ink-3);font:11px var(--f-mono)">${v}</text>`;
        marks.forEach(([t, n]) => { grid += `<line x1="${X(t)}" x2="${X(t)}" y1="22" y2="225" style="stroke:var(--line-2);stroke-dasharray:3 3"/><text x="${X(t)}" y="16" text-anchor="middle" style="fill:var(--ink-2);font:11px var(--f-body)">${n}</text>`; });
        grid += `<text x="375" y="252" text-anchor="middle" style="fill:var(--ink-3);font:11px var(--f-body)">minutes (0 = before the toss) · blue = load · green = capacity</text>`;
        q('.ht-svg').innerHTML = grid + red + `<path d="${path(C)}" style="fill:none;stroke:var(--green);stroke-width:2.5"/><path d="${path(L)}" style="fill:none;stroke:var(--accent);stroke-width:2"/>`;
        q('.ht-om').textContent = s.over;
        q('.ht-w').textContent = Math.round(s.worst * 100) + '%' + (s.wt >= 0 ? ' (min ' + s.wt + ')' : '');
        q('.ht-fr').textContent = (s.drop * 0.6).toFixed(1) + ' crore';
        q('.ht-c').textContent = Math.round(100 * s.cost / base.cost);
        q('.ht-note').textContent = mode === 'auto'
          ? `Autoscaling wakes up ${lag} minutes after each spike, and can add at most ${STEP} lakh rps of capacity per minute. A tsunami arrives in seconds, so every big moment turns red. The cheapest bill, but at the worst moment ${Math.round(s.worst * 100)}% of requests fail.`
          : mode === 'pre'
            ? (s.over === 0 ? `Scaled to ${F} lakh rps before the match: no errors. The cost: capacity stands idle for the whole match, and the bill is ~${(s.cost / base.cost).toFixed(1)} times that of autoscaling. Lower the capacity to 32 and see: what happens when the forecast is wrong?`
              : `The forecast (${F}) turned out lower than the real peak (~${Math.round(Math.max(...L))}). Pre-scaling alone cannot fix a wrong forecast: ${s.over} minutes of errors.`)
            : `Pre-scaled capacity is the floor, autoscaling is the safety net above it. Even if the forecast is a little low, there are only a few minutes of trouble (${s.over} min). This was also Hotstar's journey: manual ladders in 2018, and in 2019 their own autoscaler, which first ran in "shadow" mode and then on its own.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', upd));
      el.querySelectorAll('.ht-mode .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.ht-mode .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      upd();
    }},

    { type: 'p', html: `With the default settings (lag 5 min, capacity 40, notification on): <strong>only autoscaling</strong> = ~23 minutes of errors and ~50% of requests failing at the star-batter moment, but the lowest bill. <strong>Only pre-scaling (40)</strong> = zero errors, about 2 times the bill. Set the capacity to 32 and you get errors at the winning moment; at 25 you get ~28 minutes. <strong>Both together</strong> give only ~4 minutes even at 25. Also try a 2-minute lag: autoscaling gets better, but it still cannot catch the tsunami.` },
    { type: 'h3', text: 'What pre-scaling really looks like (Hotstar\'s journey)' },
    { type: 'p', html: `Two words appear in the table: <strong>Kubernetes</strong> is a system that runs and manages our programs (pods) on many machines (nodes). <strong>EKS</strong> is AWS's managed Kubernetes. <strong>Headroom</strong> = extra capacity kept above the estimate, as a margin for error.` },
    { type: 'table', head: ['Year', 'What they did', 'Source'], rows: [
      ['2017', 'Before the match: had the cloud load balancers "warmed up", made sure the needed instance types were available, tested DR failover, tested every "panic" switch, and prepared thresholds and ready-made scripts. During the match the whole on-call team sat in one chat room and wrote every action there.', 'Hotstar blog, 2017'],
      ['2018', 'A separate pessimistic traffic model for each pillar (subscription, metadata, streaming), and "ladders" based on concurrency: this many viewers need this many servers. When the headroom threshold was crossed, they moved to the next step in advance.', 'Hotstar blog, 2018'],
      ['2019', 'Moved to Kubernetes, with their own autoscaling engine that looked at many variables. They first ran it in shadow mode (it only suggests, it does not act), and once the data built trust, they let it act on its own. According to the blog: 2x the concurrency with 10x less compute.', 'Hotstar blog, 2019'],
      ['2023', 'Migrated to Amazon EKS. Adding 400+ nodes at once caused Kubernetes API server errors, so they automated pre-scaling in steps of 100-300 nodes.', 'Hotstar blog, 2024'],
    ]},
    { type: 'p', html: `The "hidden" limits they found while preparing for 2023 are very useful in interviews, because they show that scale is not just "more machines" (Hotstar blog, 2024):` },
    { type: 'list', items: [
      `<strong>NAT gateway</strong> (the door through which private servers inside reach the internet outside): one cluster was using ~50% of its NAT gateway's network capacity at just 1/10 of peak load. Fix: one NAT gateway for every subnet instead of one per availability zone (scale out).`,
      `<strong>Running out of IP addresses</strong> (every machine/pod needs an address on the network, an IP; a subnet, which is one part of the network, has a limited number of addresses): the networking plugin reserved 35 IPs for every node in advance, so the cluster got stuck at ~350 nodes while 400+ were needed. Fix: bigger subnets and smaller reservations.`,
      `<strong>Node network</strong>: when internal API gateway pods piled up on one node, it reached 8-9 Gbps. Fix: nodes with 10 Gbps+ and only one gateway pod per node.`,
      `<strong>CDN edge compute</strong>: the edges were also doing the work of an API gateway (the first door for all API requests): security checks, rate control. Cacheable APIs were moved to a separate domain with lighter rules.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common mistake: "we made the front servers 10x, done"', html: `This was exactly the 2017 lesson: the front fleet was scaled, the DB was not. Every layer has its own limit: CDN edge compute, load balancer warm-up, NAT gateway, IP addresses, the Kubernetes API server, database connections, the payment partner's rate. Pre-scaling means preparing <strong>the whole chain</strong> for the peak, and only load testing shows you where it breaks.` },

    { type: 'h2', text: 'Deep dive 4: load testing, a fake match before the real one' },
    { type: 'p', html: `How do we know "we can handle 5 crore"? By sending that much fake traffic ourselves, before the real traffic arrives.` },
    { type: 'callout', tone: 'term', title: 'New word: load testing', html: `<strong>What it is:</strong> creating fake users on thousands of machines and sending real-looking traffic at our own system, for example "5 crore people, and the Kohli tsunami at minute 96".<br><strong>Why we need it:</strong> to find the breaking point of every layer (CDN, gateway, DB, NAT, IPs) <em>before</em> the match.<br><strong>Without it:</strong> we would discover the limit for the first time in the real final, in front of 5 crore people.<br><strong>The cost:</strong> the load test is a big system by itself (see Project HULK below) and it is expensive.` },
    { type: 'p', html: `Hotstar has shared several things about this:` },
    { type: 'list', items: [
      `<strong>2018 (blog)</strong>: ~2 months just to build traffic models and find the right tool. For load they used Flood.io (a load-testing service that ran on the open-source tool Gatling). Then "game days": a full fake version of an IPL match, with fake tsunamis. This caught things like SSL handshake errors (mistakes in the first conversation that sets up a secure connection), keep-alive issues (keeping one connection open for many requests) and mismatches between zones/regions. Along with this, chaos testing: switching things off on purpose to see how the system copes.`,
      `<strong>2019 (summary of the re:Invent talk)</strong>: the "Project HULK" load generation setup: ~1,08,000 CPUs, 216 TB memory, 200 Gbps of outgoing network, from 8 regions. The tests simulated push notifications, tsunami traffic, late scale-up, bandwidth limits, higher latency and even CDN failure. The goal: find the breaking point of every system.`,
      `<strong>2019 (blog)</strong>: in one very hard simulation the test system fell over, and they found that one system was spending more than 70% of its compute on a feature that nobody was using. Instead of adding machines they tuned it: free headroom.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New words: game day, chaos testing', html: `<strong>Game day</strong>: a full rehearsal of the real event, with the same team and the same dashboards, using fake traffic. The team knows in advance what to do at which threshold. <strong>Chaos testing</strong>: injecting failures on purpose into a production-like system (one zone off, one cache down) so that weaknesses show up before a real failure.` },

    { type: 'h2', text: 'Deep dive 5: graceful degradation and panic mode' },
    { type: 'p', html: `Even after pre-scaling and load testing, the forecast can be wrong. What then? The answer from Hotstar's 2019 blog, in one line: <strong>"The video must play on."</strong> Surround features like recommendations, emojis and "watch more" are only useful while the video is playing. This is called <strong>graceful degradation</strong>: instead of the whole system falling over, switch off the less important things and keep the important thing running. They decided a <strong>sequence</strong> in advance: as concurrency grows, which service is switched off (jettisoned: like an aircraft throwing out cargo to become lighter) at which point, so that new people keep coming in and the video keeps playing.` },
    { type: 'callout', tone: 'term', title: 'New words: panic mode, positive and negative panic', html: `<strong>What it is:</strong> switches built in advance (<strong>feature flags</strong>: on/off buttons in the config that turn a feature off without new code) that make the system lighter during overload.<br><strong>Why we need it:</strong> there is no time to write code during a match; pressing a switch takes seconds.<br><strong>Without it:</strong> during overload everything gets a little slower, and in the end even the video stops.<br><strong>Tier:</strong> a list of features by how much they are needed. Tier 1 = the app is useless without it (login, play, subscription). Tier 2 = nice to have, not needed (recommendations, emojis).<br> Hotstar's 2017 blog describes two kinds: <strong>positive panic</strong> = Tier 1 jobs (login, subscription, watch) keep showing the user "done", but part of their backend work happens later (deferred); <strong>negative panic</strong> = Tier 2 jobs (account page, logout) show a plain "not right now" message for a while. The summary of the 2019 re:Invent talk says the same: recommendations and personalisation are switched off, so that streaming and payment/subscription keep running.` },
    { type: 'flow', title: 'Panic mode on', height: 320,
      nodes: [
        { id: 'app', label: 'Viewer app', sub: 'smart client', x: 80, y: 160, w: 130, kind: 'client', info: 'What it is: the app on the user\'s phone or TV. According to Hotstar\'s 2018 blog, the client apps are resilient themselves (they can take shocks): when the server sends a panic signal they use exponential or custom back-off, work from the local cache, and show a light fallback in place of a feature that is switched off.' },
        { id: 'gw', label: 'API gateway', sub: 'CDN + internal', x: 270, y: 160, w: 150, kind: 'net', meter: true, load: 30, info: 'What it is: the first door for all API requests. According to Hotstar\'s 2024 blog, their CDNs act as their external API gateway (security checks, routing), with an internal API gateway behind them. Panic rules are cheapest here: a request for a switched-off feature never even goes inside.' },
        { id: 'panic', label: 'Panic config', sub: 'feature flags', x: 270, y: 50, w: 150, kind: 'data', info: 'What it is: the feature-flag config, meaning on/off switches built and tested in advance. According to the 2017 blog, before the match every panic switch was tested to check it does what it says. No code is written during the match; switches are only pressed.' },
        { id: 'play', label: 'Play + login', sub: 'Tier 1', x: 520, y: 60, w: 170, kind: 'server', meter: true, load: 70, info: 'What it is: the core services: login, entitlement (may this user watch?), playback URL, subscription. These are never switched off. In panic, some of their backend work (like writing analytics) is queued for later.' },
        { id: 'reco', label: 'Recommendations', sub: 'Tier 2', x: 520, y: 160, w: 170, kind: 'server', meter: true, load: 60, info: 'What it is: the "for you" rows (rails), built from ML models and user history. Expensive and not essential. In panic it is switched off, and the app shows one cached default rail to everyone.' },
        { id: 'social', label: 'Emojis / feed', sub: 'Tier 2', x: 520, y: 260, w: 170, kind: 'server', meter: true, load: 50, info: 'What it is: social features like live emojis and polls. They are for fun, not essential. In panic their updates slow down or stop.' },
      ],
      edges: [{ a: 'app', b: 'gw' }, { a: 'gw', b: 'panic' }, { a: 'gw', b: 'play' }, { a: 'gw', b: 'reco' }, { a: 'gw', b: 'social' }],
      scenarios: [
        { name: 'Normal day', steps: [
          { title: 'Play', text: 'Login and play requests reach Tier 1.', go: ['app>gw>play', 'res:play>gw>app'] },
          { title: 'Other features', text: 'Recommendations and emojis are also running.', parallel: true, go: ['app>gw>reco', 'app>gw>social'] },
        ]},
        { name: 'Panic: Tier 2 jettison', intro: 'Concurrency is above the forecast, and Tier 1 services are at 90% CPU.', steps: [
          { title: 'Load goes up', text: 'All services are running hot.', flood: { paths: ['app>gw>play', 'app>gw>reco'], n: 10 }, after: { play: { state: 'hot', load: 92 }, reco: { state: 'hot', load: 90 } } },
          { title: 'Switch pressed', text: 'As soon as the threshold was crossed, the on-call team ran a script decided in advance: panic level 2. The gateway read the config.', go: ['gw>panic', 'res:panic>gw'], after: { panic: { state: 'warn', sub: 'PANIC L2' } } },
          { title: 'Tier 2 off, cheap fallback', text: 'Recommendation requests no longer go inside. The gateway immediately returns a cached default rail. Emojis are off too.', go: ['app>gw', 'res:gw>app'], set: { reco: { state: 'dim', sub: 'OFF', load: 5 }, social: { state: 'dim', sub: 'OFF', load: 5 } }, msg: '200 { rail: "default-live" }  (cached, same for everyone)' },
          { title: 'The video kept playing', text: 'The freed capacity went to Tier 1. New people kept arriving, and login and play kept working.', go: ['app>gw>play', 'res:play>gw>app'], after: { play: { state: 'ok', load: 70 } } },
        ]},
        { name: 'Client back-off', steps: [
          { title: 'The server says: wait', text: 'When overloaded, the gateway sends a cheap "come back later" answer, with a retry time.', go: ['app>gw', 'bad:gw>app'], set: { gw: { state: 'hot', load: 95 } }, msg: '503 Service Unavailable\nRetry-After: 20' },
          { title: 'Smart client', text: 'The app does not retry at once. It waits 20 seconds + random jitter, and shows old cached data meanwhile. Crores of clients come back at different moments, not as one wall. A dumb client would retry every second and double the load.', focus: ['app'], after: { gw: { state: '', load: 45 } } },
        ]},
      ],
    },
    { type: 'p', html: `A jettison ladder could look like this (an xyz.com example, with assumed numbers):` },
    { type: 'table', head: ['Level', 'When', 'What is switched off / made lighter', 'What the user sees'], rows: [
      ['L0', 'Normal', 'Nothing', 'The full app'],
      ['L1', '80% of forecast', 'Slower refresh for scorecard / key moments, prefetch off', 'Score 1-2 s later'],
      ['L2', '95% of forecast', 'Recommendations, emojis, writing watch history (queued)', 'Default rail, emojis gone'],
      ['L3', 'Above forecast', 'Cap on max bitrate, jitter in the funnel for new logins', 'Slightly lower quality, login takes a few seconds'],
      ['Never', '-', 'Video playback, streams already running', 'The match keeps playing'],
    ], caption: 'All these levers appear in Hotstar\'s blogs: lowering bitrate (2017), reducing refresh rates (2024), jitter in the subscription funnel, the "telescope" (2018), and the service jettison sequence (2019). Their exact thresholds are their own; this table only shows the idea.' },

    { type: 'h2', text: 'Failure scenarios and bottlenecks, in one place' },
    { type: 'table', head: ['What happened', 'What breaks', 'Protection (what Hotstar did / industry approach)'], rows: [
      ['Tsunami after a notification', 'Login/home APIs and the DB behind them', 'Pre-scale the whole chain; send notifications in batches; client jitter (2017, 2018)'],
      ['More people than forecast', 'CPU of Tier 1 services', 'Panic levels, Tier 2 jettison, bitrate cap (2017, 2019)'],
      ['One CDN provider slow', 'Video for viewers in one region', 'Multi-CDN, fallback URLs in the player, headroom on every CDN'],
      ['Many cache objects expire together', 'The origin (TTL cloudburst)', 'Visibility of the whole TTL chain, jitter, request collapsing (2019)'],
      ['Retry storm', 'Everything, because the load doubles', 'Exponential back-off + jitter, clients stop on a panic signal (2018)'],
      ['Cluster scale-up gets stuck', 'Pods cannot be scheduled (IPs, API server limits)', 'Pre-scale in steps, bigger subnets, find limits early in load tests (2024)'],
      ['Payment partner limit', 'Subscription funnel', '"Telescope": jitter in the funnel so the success rate stays up (2018)'],
    ]},

    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Scale and shape', d: 'Crores concurrent, and spiky: many times higher within minutes at key moments. So do not design for "average load"; design for the peak and the slope.' },
      { t: 'Two separate paths', d: 'Video: encoder → packager → shield → multi-CDN → ABR player. Data: what is the same for everyone (score, viewer count) is CDN-cached JSON + polling; only personal calls (login, heartbeat) reach the origin.' },
      { t: 'Protect the origin', d: 'Origin load should not depend on viewers: edges ÷ TTL. Request collapsing, smart clients (jitter, back-off).' },
      { t: 'Capacity', d: 'Autoscaling is too slow for a tsunami; pre-scale from the concurrency forecast, and use autoscaling only as a safety net. The whole chain: LB, DB, NAT, IPs.' },
      { t: 'Prove + protect', d: 'Find breaking points with load tests and game days; graceful degradation with panic levels. "Video must play."' },
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `• The event time is known (match, sale, launch) → <strong>pre-scale</strong> up to forecast + headroom, with autoscaling only as the net above.<br>• Data is the same for everyone and can be 1-2 s old → <strong>JSON on the CDN, short TTL, polling</strong>. Needed per user or instantly → push (WebSocket/MQTT).<br>• One thing is core (video) → <strong>panic switches</strong> for every other feature, tested in advance.<br>• Spikes arrive in seconds → <strong>jitter + back-off</strong> in clients, or the retries themselves will bring the system down.` },

    { type: 'diagram', title: 'The whole design at a glance', height: 630,
      caption: 'Video, score and viewer count: whatever is the same for everyone comes from the CDN. Only login, play and heartbeat reach our servers (the origin). Use the buttons above to see one path at a time.',
      groups: [
        { label: 'Video pipeline (stadium to origin)', x: 10, y: 32, w: 700, h: 96 },
        { label: 'Edge: CDN', x: 188, y: 152, w: 344, h: 90 },
        { label: 'Live data', x: 548, y: 152, w: 164, h: 334 },
        { label: 'Core services (origin)', x: 10, y: 396, w: 524, h: 218 },
      ],
      nodes: [
        { id: 'feed', label: 'Stadium feed', sub: 'playout + SCTE-35', x: 90, y: 90, kind: 'client', info: 'What it is: the final TV feed made from the stadium cameras. The playout system puts the ad-break signal (SCTE-35) into it. The starting point of all the video.' },
        { id: 'enc', label: 'Live encoder', sub: 'ABR ladder', x: 270, y: 90, kind: 'server', info: 'What it is: the machine that makes raw video (~1.2 Gbps) ~250 times smaller, in 5 qualities (240p to 1080p) at once. Without it, video could never reach a phone.' },
        { id: 'pkg', label: 'Packager', sub: 'pieces + manifest', x: 450, y: 90, kind: 'server', info: 'What it is: the machine that cuts video into 4-second pieces (segments) and writes the manifest (the list of pieces). The origin of the video. During an ad break it adds ad pieces to the manifest (SSAI).' },
        { id: 'ads', label: 'Ad server', sub: 'which ad for whom', x: 630, y: 90, kind: 'net', info: 'What it is: the system that decides which group (cohort) sees which ad. The packager\'s stitching service asks it for ads during an ad break.' },
        { id: 'cdn', label: 'CDN A + CDN B', sub: 'edge PoPs', x: 270, y: 210, kind: 'edge', info: 'What it is: thousands of edge servers of several CDN companies, close to cities. Copies of the pieces, score.json and count.json go from here to crores of phones. If one CDN fails, the player uses another (multi-CDN).' },
        { id: 'shield', label: 'Origin shield', sub: 'request collapsing', x: 450, y: 210, kind: 'cache', info: 'What it is: a cache between the edges and the origin. For a new piece, it turns the requests of thousands of edges into one request to the origin.' },
        { id: 'scorer', label: 'Scorer app', sub: 'every ball', x: 630, y: 210, kind: 'client', info: 'What it is: the scorer\'s app in the stadium or studio that enters the result of every ball. Very few writes: one every ~30-40 seconds.' },
        { id: 'app', label: 'Viewer apps', sub: 'ABR player', x: 90, y: 330, kind: 'client', info: 'What it is: crores of phones and TVs. The player fetches a piece every 4 s and picks its quality by looking at the network, polls score.json every ~2 s, and sends a heartbeat every ~30 s. A smart client: jitter + back-off.' },
        { id: 'json', label: 'Live JSON files', sub: 'score + count', x: 450, y: 330, kind: 'data', info: 'What it is: score.json and concurrency.json, small files that the CDN caches with a 1-2 s TTL. The origin load depends not on viewers but only on edges ÷ TTL.' },
        { id: 'score', label: 'Score service', sub: '+ ball-by-ball DB', x: 630, y: 330, kind: 'server', info: 'What it is: checks each ball event, writes it to the DB, and publishes a new score.json. Its load depends on the scorers, not the viewers.' },
        { id: 'panic', label: 'Panic config', sub: 'feature flags', x: 90, y: 450, kind: 'data', info: 'What it is: on/off switches tested in advance. During overload the on-call team raises the level and the gateway switches off Tier 2 features. "Video must play."' },
        { id: 'gw', label: 'API gateway', sub: 'CDN + internal', x: 270, y: 450, kind: 'net', info: 'What it is: the door for all personal API requests (login, play, heartbeat). It reads the panic config: a request for a switched-off feature never goes inside and gets a cached default answer.' },
        { id: 'kafka', label: 'Heartbeats', sub: 'Kafka partitions', x: 450, y: 450, kind: 'queue', info: 'What it is: a stream of ~20 lakh heartbeats/s, split into partitions by sessionId, so the counting is spread over many machines.' },
        { id: 'cnt', label: 'Viewer counter', sub: 'sharded count', x: 630, y: 450, kind: 'server', info: 'What it is: counts the sessions "seen in the last 60 s" in each partition, adds them up and writes concurrency.json. The same number is also used for pre-scaling and dashboards.' },
        { id: 'tier1', label: 'Login + Play', sub: 'Tier 1 + DBs', x: 270, y: 570, kind: 'server', info: 'What it is: login, subscription, entitlement, playback URL and their databases. Never switched off. The 2017 lesson: pre-scale the whole chain (right down to the DB).' },
        { id: 'tier2', label: 'Reco, emojis', sub: 'Tier 2', x: 450, y: 570, kind: 'server', info: 'What it is: recommendations, emojis, polls. Nice to have, not essential. Switched off first in panic (jettisoned), so that the capacity goes to Tier 1.' },
      ],
      edges: [
        { a: 'feed', b: 'enc', n: 1 }, { a: 'enc', b: 'pkg', n: 2 }, { a: 'pkg', b: 'ads', both: true, dashed: true },
        { a: 'pkg', b: 'shield', n: 3, label: 'new piece' }, { a: 'shield', b: 'cdn', n: 4 }, { a: 'cdn', b: 'app', n: 5, label: 'pieces + JSON' },
        { a: 'scorer', b: 'score', label: 'every ball' }, { a: 'score', b: 'json' }, { a: 'json', b: 'cdn', label: 'TTL 1-2 s' },
        { a: 'app', b: 'gw', label: 'login, heartbeat' }, { a: 'panic', b: 'gw', dashed: true }, { a: 'gw', b: 'tier1' },
        { a: 'gw', b: 'tier2', label: 'panic: off', kind: 'bad', dashed: true }, { a: 'gw', b: 'kafka', kind: 'evt' }, { a: 'kafka', b: 'cnt', kind: 'evt' },
        { a: 'cnt', b: 'json', label: 'count.json' },
      ],
      paths: [
        { name: 'Video', text: 'Camera → encoder (5 qualities) → packager (4 s pieces + manifest) → shield (just one fetch) → CDN edge → player, which picks the quality for each piece.', go: ['feed>enc>pkg>shield>cdn>app'] },
        { name: 'Ad break', text: 'SCTE-35 signal → the packager\'s stitching service gets ads from the ad server → ad pieces in the cohort\'s manifest → for the player, just more pieces.', go: ['feed>enc>pkg>ads', 'pkg>shield>cdn>app'] },
        { name: 'Live score', text: 'Scorer → score service → score.json → CDN (TTL 1-2 s) → crores of apps poll it. The origin gets only edges ÷ TTL requests.', go: ['scorer>score>json>cdn>app'] },
        { name: 'Login + viewer count', text: 'Login/play go through the gateway to Tier 1. Heartbeats → Kafka partitions → counter → count.json → CDN, and back to every app.', go: ['app>gw>tier1', 'app>gw>kafka>cnt>json>cdn>app'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Raw video is huge: the encoder makes it ~250 times smaller, in 5 qualities at once (the ABR ladder).</li>
      <li>The packager cuts video into 4 s pieces (segments) and writes the manifest (the list). Pieces = instant start, a quality switch at every piece, and CDN caching.</li>
      <li>The phone's player picks every next piece by looking at the network and the buffer (ABR). The decision is on the phone, so zero load on the server.</li>
      <li>Whatever is the same for everyone (pieces, score, viewer count) comes from the CDN; the origin shield does request collapsing; multi-CDN gives capacity and safety.</li>
      <li>Live score = a small JSON on the CDN, TTL 1-2 s, polling. Origin load does not depend on viewers.</li>
      <li>A tsunami arrives in seconds, autoscaling in minutes: pre-scale the whole chain (down to DB, NAT, IPs) and prove it with load tests.</li>
      <li>Panic mode: switch off Tier 2, use smart clients (jitter, back-off). "Video must play."</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['CDN polling: origin load does not depend on the number of viewers', 'Pre-scaling: capacity is ready from the first second of the tsunami', 'Multi-CDN: more bandwidth, and safety when one provider fails', 'Panic mode: the core feature (video) keeps running even during overload', 'Load tests / game days: breaking points are known before the real match'],
      costs: ['Live video is a few seconds behind the broadcast (segments + buffer)', 'Score and viewer count are 1-3 s old', 'The bill for pre-scaled capacity: idle machines for hours', 'In panic, some users get fewer features / lower quality', 'Multi-CDN, SSAI, panic levels: a lot more operational complexity'],
    },
    { type: 'think', questions: [
      { q: 'Rain starts during the match and play stops for 40 minutes. Then the restart is announced and a notification goes out. What will happen, and what will you do?', a: 'During rain, people close the app and concurrency drops. If the autoscaler reduces capacity in this time, the tsunami after the restart notification will be even faster than before (everyone comes back together). So: stop scale-in during the rain (a capacity floor), send notifications in batches, and bring capacity back to peak before the restart. According to the summary of the 2019 talk, the India vs NZ match had a peak of 1.39 crore before the rain; the match was completed the next day, and that is when the 2.53 crore record was set.' },
      { q: 'The product team insists the viewer count must be exact every second. What is the cost?', a: 'An exact count means counting every heartbeat in one place and publishing at once: one central counter with crores of updates per second, and a JSON TTL of ~0, which means the CDN benefit is gone and every poll reaches the origin. Better: a window of a few seconds, sharded counts, and a rounded number like "6.1 crore". Users do not notice the difference; the origin does, a lot.' },
      { q: 'With SSAI, every cohort has its own manifest. The cohorts go from 10 to 1,000. What happens on the CDN?', a: 'Every stream × quality × cohort is a separate manifest object. 100 times more objects, each with fewer viewers, so the cache hit ratio falls and the compute for manifest generation on the shield/origin grows. This is why JioHotstar\'s 2025 blog talks about moving to SGAI: one manifest for everyone, and the ad decision made on the client\'s separate ad request.' },
    ]},

    { type: 'quiz', questions: [
      { q: 'Why do we cut live video into small 4-second pieces (segments)?', options: ['So that the video quality goes up', 'So that the phone can start at once, change quality at every piece, and the CDN can cache small identical files', 'Because the encoder cannot make video longer than 4 seconds'], answer: 1, explain: 'Pieces do not raise quality. They do three jobs: a quick start, an ABR switch at every piece, and small files that never change, which the CDN caches easily.' },
      { q: 'What is the packager\'s job?', options: ['Compressing the video', 'Cutting the video into pieces saved as files, and updating the manifest (the list of pieces) every 4 s', 'Picking the quality on the phone'], answer: 1, explain: 'The encoder compresses, and the phone\'s player picks the quality. The packager makes the pieces and their list (the manifest), which is why it is the origin of the video.' },
      { q: 'In a metro tunnel the speed drops to 0.5 Mbps. What will the ABR player do?', options: ['Keep asking for 1080p', 'Ask for the next piece in a lower quality like 240p, so the buffer does not run empty', 'Stop the video'], answer: 1, explain: 'A 4 s piece of 240p (0.4 Mbps) is 0.2 MB and arrives in ~3 s at 0.5 Mbps, which is faster than the video plays. A 1080p piece would take 40 s, and the video would stall.' },
      { q: 'What is the cheapest way to send the live score to 5 crore viewers?', options: ['A WebSocket from every viewer to the score service', 'Turn the score into a small JSON on the CDN with a 1-2 s TTL, and let apps poll it', 'A DB query for every viewer, with a Redis cache'], answer: 1, explain: 'Everyone needs the same data, and 1-2 s old is fine. With a CDN, the origin gets only edges ÷ TTL requests, no matter how many viewers there are.' },
      { q: 'Why did Hotstar say "no auto-scaling" in 2018?', options: ['Autoscaling does not exist in the cloud', 'A tsunami arrives in seconds, while a new machine takes minutes; and during a spike the instances may not even be available', 'Autoscaling is expensive'], answer: 1, explain: 'Watching the metric, deciding, booting, warming up: all together it takes minutes. By then the wave has passed. So scale in advance from the concurrency forecast, and keep autoscaling as just one layer.' },
      { q: 'In the 2017 Kohli spike, what actually broke?', options: ['The CDN', 'The database, because the front servers were scaled but the DB was not, and login cannot be cached', 'The video encoder'], answer: 1, explain: 'The front fleet was ready for 70 lakh, the DB was not. Login is per user, so it bypasses the cache. Lesson: scale the whole chain.' },
      { q: 'In panic mode, what should be switched off first?', options: ['Video playback', 'Login', 'Tier 2, like recommendations and social features'], answer: 2, explain: '"Video must play." Switch off the surround features and give their capacity to the core (login, play, subscription).' },
      { q: 'Why can a live stream be ~20-30 s behind TV?', options: ['The CDN is slow', 'Encoding + waiting for the segment to complete + the player\'s ~3-segment safety buffer', 'The phone\'s processor is slow'], answer: 1, explain: 'This is the nature of segment-based streaming. Shorter segments reduce latency but increase requests.' },
    ]},
    { type: 'sources', note: 'Hotstar-specific facts come from these sources. The older posts (2017-2019) describe the setup of that time; the 2024-25 posts describe the newer setup.', items: [
      { title: 'T For Tsunami: Dealing with traffic spikes', publisher: 'Hotstar engineering blog (Akash Saxena)', year: 2017, official: true, url: 'https://blog.hotstar.com/t-for-tsunami-dealing-with-traffic-spikes-c22443bcdd3e', used: 'Champions Trophy 2017 concurrency (4.02M, 4.2M, 4.69M), Kohli notification spike 10K → 125K TPS login, DB meltdown, progressive degradation, positive/negative panics, Tier 1/2, bitrate lever, LB warm-up, panic switch tests, chatops.' },
      { title: 'Scaling Is Not An Accident', publisher: 'Hotstar engineering blog (Akash Saxena)', year: 2018, official: true, url: 'https://blog.hotstar.com/scaling-is-not-an-accident-895140ac84c0', used: 'No auto-scaling / headroom, ladders per pillar, no dumb clients (jitter, back-off, panic), Once Only caching, reject early, telescope funnel, latency 55 s → 15-20 s, Flood.io + Gatling, game days, chaos testing.' },
      { title: 'Scaling the Hotstar Platform for 50M', publisher: 'Hotstar engineering blog (Akash Saxena)', year: 2019, official: true, url: 'https://blog.hotstar.com/scaling-the-hotstar-platform-for-50m-a7f96a019add', used: 'Kubernetes move, own autoscaler run in shadow, 2x concurrency with 10x less compute, jettison sequence, "video must play on", 70% compute on unused feature, CDN not a silver bullet, TTL cloudbursts.' },
      { title: 'Scaling Hotstar.com for 25 million concurrent viewers (CMY302), session report', publisher: 'Classmethod DevelopersIO, summary of AWS re:Invent 2019 talk by Hotstar\'s cloud architect', year: 2019, url: 'https://dev.classmethod.jp/articles/reinvent-2019-cmy302/', used: '25.3M peak, 1M+ rps, 10 Tbps+, rain-split peaks, Project HULK size, 1M+/min growth, ~1 min boot, 90 s reaction, insufficient capacity, scaling on concurrency, panic mode turning off recommendations.' },
      { title: 'Scaling Infrastructure for Millions: From Challenges to Triumphs (Part 1)', publisher: 'Disney+ Hotstar engineering blog', year: 2024, official: true, url: 'https://blog.hotstar.com/scaling-infrastructure-for-millions-from-challenges-to-triumphs-part-1-6099141a99ef', used: '2023 World Cup prep for ~50M (59M served), CDNs as external API gateway, cacheable vs non-cacheable APIs (scorecard, concurrency), separate CDN domain, reduced refresh rates, NAT gateways per subnet, 10 Gbps nodes, EKS stepwise scale-up, IP exhaustion.' },
      { title: 'Capturing A Billion Emo(j)i-ons', publisher: 'Hotstar engineering blog', year: 2020, official: true, url: 'https://blog.hotstar.com/capturing-a-billion-emojis-62114cc0b440', used: 'Emoji pipeline: HTTP → Kafka → Spark 2 s aggregates → PubSub; ~5B emojis from 55.83M users in WC 2019.' },
      { title: 'Demuxed 2025 Talk: Server Guided Ad Insertion (SGAI)', publisher: 'JioHotstar engineering blog', year: 2025, official: true, url: 'https://blog.hotstar.com/demuxed-2025-talk-server-guided-ad-insertion-sgai-193d7326d270', used: 'Playout + SCTE-35 markers, in-house SSAI with cohort manifests, CDN offload and origin shield cost, SGAI, record ~62.5M concurrent (Dec 2025).' },
      { title: 'Hotstar and Akamai deliver live sports events in India; Hotstar and Akamai create internet history', publisher: 'Akamai press releases', year: 2016, official: true, url: 'https://www.akamai.com/newsroom/press-release/hotstar-and-akamai-deliver-live-sports-events-in-india', used: 'Akamai as CDN since 2015; WT20 2016 1.55M streams, 1.3 Tbps; IPL 2018 qualifier 8.26M (2018 release).' },
      { title: 'JioHotstar sets new records of viewership in Champions Trophy', publisher: 'Outlook Business', year: 2025, url: 'https://www.outlookbusiness.com/news/jiohotstar-sets-new-records-of-viewership-in-champions-trophy', used: '6.12 crore peak concurrency (CT 2025 final), previous 5.9 crore (WC 2023 final).' },
      { title: 'HTTP Live Streaming (HLS) authoring specification for Apple devices', publisher: 'Apple Developer', official: true, url: 'https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices', used: 'Recommended target/segment duration of 6 seconds.' },
      { title: 'RFC 8216: HTTP Live Streaming', publisher: 'IETF', year: 2017, official: true, url: 'https://www.rfc-editor.org/rfc/rfc8216', used: 'Live playback should not start within three target durations of the playlist end.' },
    ]},
  ],
});
