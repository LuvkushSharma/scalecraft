Lesson.register({
  id: 'design-hotstar',
  title: 'JioHotstar live cricket',
  minutes: 40,
  summary: `Ek match, crores log, ek hi second mein. Stadium ka camera tumhare phone tak kaise pahunchta hai (zero se, ek-ek tukda), live score jo CDN se aata hai, "X crore dekh rahe hain" wala number, aur sabse bada sabak: pehle se scale karo, load test karo, aur zaroorat pade to features band karke video chalu rakho. Hotstar ke engineers ke apne blogs aur talks se.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `India ka bada match hai. Ek hi pal mein 5-6 crore log apne phone pe wahi ek match dekh rahe hain.<br>Stadium mein camera hai, aur tumhare haath mein phone. Beech mein video ko chhota karna hai, chhote tukdon mein kaatna hai, aur saare desh mein phaile computers se baantna hai.<br>Saath mein score har ball pe update hona chahiye, aur jab Kohli batting karne aaye aur 1 minute mein lakhon naye log aa jaayein, tab bhi kuch nahi tootna chahiye.<br>Ye lesson yahi sikhata hai: itne logon tak ek saath live video kaise pahunchate hain, bina system giraaye.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `Padhne se pehle 10 minute socho: 5 crore log ek saath ek match dekh rahe hain. Har phone har 1 second pe score maangta hai. Aakhri over mein ek wicket girta hai aur 30 second mein 50 lakh naye log app kholte hain. Tumhara system kahan tootega? Phir yahan compare karo.` },

    { type: 'p', html: `<strong>JioHotstar</strong> February 2025 mein bana, jab JioCinema aur Disney+ Hotstar ek app mein mil gaye (Reliance aur Disney ka joint venture JioStar, November 2024 mein final hua). Is lesson ke zyadatar engineering sabak purane <strong>Hotstar</strong> (baad mein Disney+ Hotstar) ki team ke hain, jo 2017 se apne blog pe likhti aayi hai. Har baat ke saath saal likha hai, kyunki 2017 ka setup aaj wala nahi hai.` },
    { type: 'p', html: `Pehle scale samjho. Ye numbers sources se hain, apne saal ke saath:` },
    { type: 'table', head: ['Saal', 'Match / event', 'Peak concurrent viewers', 'Source'], rows: [
      ['2016', 'ICC World T20', '15.5 lakh streams, peak traffic 1.3 Tbps', 'Akamai press release, 2016'],
      ['2017', 'Champions Trophy final', '46.9 lakh (platform peak)', 'Hotstar blog "T For Tsunami", 2017'],
      ['2018', 'IPL qualifier (SRH vs CSK)', '82.6 lakh', 'Akamai press release, 2018'],
      ['2019', 'World Cup, India vs New Zealand', '2.53 crore, 1M+ requests/s, 10 Tbps+', 'AWS re:Invent 2019 talk (Hotstar)'],
      ['2023', 'ODI World Cup (final)', '~5.9 crore', 'Hotstar blog 2024 (59M streams); news reports'],
      ['2025', 'Champions Trophy final (JioHotstar)', '6.12 crore', 'JioHotstar figures via Outlook Business, Mar 2025'],
    ], caption: 'Dec 2025 ke JioHotstar blog ke mutabik us waqt tak ka record ~6.25 crore concurrent tha. Concurrent = ek hi pal mein kitne log saath dekh rahe the.' },
    { type: 'callout', tone: 'term', title: 'Naye words: concurrency, views', html: `<strong>Concurrent viewers (concurrency)</strong>: ek <em>hi pal</em> mein kitne log stream dekh rahe hain. System ka load isi se tay hota hai. <strong>Views</strong>: poore match mein kitni baar kisi ne stream khola (ek aadmi 5 baar khole to 5 views). Isliye news mein "124 crore views" aur "6 crore concurrent" dono milte hain; engineer ke liye concurrency wala number zyada maayne rakhta hai.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Live match video, kai languages aur camera angles<br>• Live score aur scorecard, har ball ke baad update<br>• "X crore dekh rahe hain" counter<br>• Ad breaks ke beech ads<br>• Login, subscription, payment<br>• Extra: emojis, polls, recommendations<br><br><strong>Out of scope:</strong> on-demand movies (wo <a href="#/design-youtube">YouTube / Netflix</a> lesson mein)` },
      right: { title: 'Non-functional', html: `• <strong>Video must play</strong>: baaki sab feature isse neeche<br>• Crores concurrent, aur minutes mein kai guna jump<br>• TV broadcast se zyada peeche nahi (latency kam)<br>• Kamzor 4G pe bhi chale<br>• Spike ke time bhi graceful: poora app kabhi na gire<br>• Cost: 4 ghante ke match ke liye saal bhar machines nahi rakh sakte` },
    },
    { type: 'callout', tone: 'why', title: 'Is system ki asli mushkil', html: `YouTube pe load poore din phaila hota hai. Yahan sab log <strong>ek hi cheez, ek hi second</strong> pe maangte hain. Hotstar ki team ise <strong>tsunami</strong> kehti hai: koi bada pal (star batsman aaya, wicket gira) aur notification gaya, to kuch hi seconds mein traffic kai guna. Poora design isi ek baat ke around hai.` },

    { type: 'h2', text: 'Step 2: live video basics, bilkul zero se' },
    { type: 'p', html: `Design karne se pehle samjho ki video stadium se phone tak pahunchta kaise hai. Hum ek-ek problem lenge. Har problem ek naya hissa (component) laayegi. Aakhir mein poori chain ek diagram mein dikhegi.` },
    { type: 'h3', text: '2a. Camera ka video bahut bada hota hai' },
    { type: 'p', html: `Stadium mein camera har second 25 photo (frames) kheenchta hai. Ek 1080p photo mein 1920 × 1080 = ~20 lakh pixels hain. Har pixel ke rang ke liye ~3 bytes maan lo.` },
    { type: 'list', items: [
      `Ek frame: 20.7 lakh × 3 bytes = <strong>~6.2 MB</strong>.`,
      `Ek second (25 frames): <strong>~155 MB</strong>, yaani ~1.2 Gbps (1 byte = 8 bits).`,
      `Ek aam 4G phone ko shayad 5-20 Mbps milta hai. Matlab raw video phone ke internet se <strong>~100 guna</strong> bada hai.`,
    ]},
    { type: 'image', src: 'assets/img/design-hotstar/cricket-broadcast-camera.jpg', alt: 'Cricket ground ke kinare tripod pe ek video camera, aur paas mein ek aadmi production desk (vision mixer) pe baitha hai', caption: 'Chain ki pehli kadi: ground pe camera, aur paas mein production desk jahan cameras ki feeds mila ke ek final feed banti hai. (2011 ka ek chhota live-streamed match; IPL jaise match mein darjanon cameras aur ek poora production truck hota hai.)', credit: { text: 'Mike Ashton, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Twicket_broadcast_crew.jpg', license: 'CC BY-SA 2.0' } },
    { type: 'p', html: `To raw video seedha bhejna namumkin hai. Use chhota karna padega.` },
    { type: 'callout', tone: 'term', title: 'Naya word: encoder (aur codec)', html: `<strong>Ye kya hai:</strong> ek machine/software jo video ko compress karta (dabaata) hai. Wo har frame poora nahi likhta. Wo sirf likhta hai ki pichhle frame se kya badla (ball aage gayi, baaki ground waisa hi). Is tareeke ke rules ko <strong>codec</strong> kehte hain, jaise H.264 ya HEVC.<br><strong>Kyun chahiye:</strong> 1080p video ~1.2 Gbps se ghat ke ~5 Mbps ho jaata hai, yaani <strong>~250 guna chhota</strong>, aur aankh ko farak bahut kam dikhta hai.<br><strong>Iske bina:</strong> ek bhi viewer tak video nahi pahunchta, crores ki baat to chhodo.<br><strong>Live mein khaas:</strong> encoder ko har second ka video usi second mein compress karna hai. Wo kabhi peeche nahi reh sakta.` },
    { type: 'h3', text: '2b. Sabka internet alag hai: isliye kai qualities (ABR ladder)' },
    { type: 'p', html: `Ek user ghar ke WiFi pe hai (20 Mbps). Doosra metro mein 4G pe hai (0.5 Mbps). Agar hum sirf ek 5 Mbps wali 1080p video banayein, to metro wala user har kuch second pe atak jaayega (buffering). Agar sirf 240p banayein, to WiFi wala dhundhli video dekhega.` },
    { type: 'p', html: `Isliye encoder <strong>ek hi pal ki video ko 4-6 alag qualities mein</strong> ek saath banata hai. Is list ko <strong>ladder</strong> kehte hain, kyunki ye seedhi ki tarah neeche se upar jaati hai:` },
    { type: 'table', head: ['Quality (rung)', 'Bitrate', '4 second ke tukde ka size', 'Kiske liye'], rows: [
      ['240p', '0.4 Mbps', '0.2 MB', 'Kamzor 4G, metro, gaon'],
      ['360p', '0.8 Mbps', '0.4 MB', 'Theek-thaak 4G'],
      ['480p', '1.5 Mbps', '0.75 MB', 'Achha 4G'],
      ['720p', '3 Mbps', '1.5 MB', 'WiFi, achha phone'],
      ['1080p', '5 Mbps', '2.5 MB', 'Tez WiFi, bada TV'],
    ], caption: 'Example ladder (numbers maan lo; har company apni ladder tune karti hai). Size = bitrate × 4 s ÷ 8. Jaise 3 Mbps × 4 s = 12 megabit = 1.5 MB.' },
    { type: 'callout', tone: 'term', title: 'Naye words: bitrate, ABR ladder', html: `<strong>Bitrate:</strong> ek second ki video kitne bits ki hai. 3 Mbps = har second 30 lakh bits. Zyada bitrate = zyada saaf video, lekin zyada internet chahiye.<br><strong>ABR ladder (rendition ladder):</strong> <strong>Ye kya hai:</strong> ek hi video ki kai qualities ki list (240p se 1080p). ABR = Adaptive Bitrate, yaani "internet ke hisaab se quality badalna".<br><strong>Kyun chahiye:</strong> har viewer ko uske internet ke hisaab se sabse achhi quality mil sake, aur internet badle to quality bhi badle.<br><strong>Iske bina:</strong> ya to kamzor network pe buffering, ya tez network pe bekaar dhundhli video.<br><strong>Keemat:</strong> encoder ka kaam 5 guna. Aur Hotstar pe har language (Hindi, English, Tamil...) aur har camera angle alag stream hai, to ye kaam aur guna ho jaata hai.` },
    { type: 'h3', text: '2c. Video ko chhote tukdon (segments) mein kyun kaatte hain?' },
    { type: 'p', html: `Ab socho hum poore match ko ek hi lambi file bana dein. Teen problems turant aati hain:` },
    { type: 'list', items: [
      `<strong>File abhi bani hi nahi:</strong> live match ki "poori file" match khatam hone pe hi banegi. Hume to video <em>abhi</em> dikhana hai.`,
      `<strong>Quality beech mein nahi badal sakte:</strong> ek lambi 720p stream chal rahi hai aur user metro mein ghus gaya. Ab quality kaise badlein? Pura connection todna padega.`,
      `<strong>Bahut bada:</strong> 3 ghante × 3 Mbps = ~4 GB ki ek file. Itni badi file ko desh bhar ke cache servers mein rakhna aur baantna mushkil hai.`,
    ]},
    { type: 'p', html: `Jawab: video ko <strong>chhote tukdon</strong> mein kaat do, har tukda bas kuch second ka (jaise 4 second). Har tukda ek alag chhoti file hai: <code>seg_18342.ts</code>, <code>seg_18343.ts</code>... Har quality ke apne alag tukde hote hain. 3 ghante ke match mein 4 second ke tukde = har quality ke 2,700 tukde.` },
    { type: 'callout', tone: 'term', title: 'Naya word: segment (video ka tukda)', html: `<strong>Ye kya hai:</strong> video ka 2-6 second ka chhota hissa, ek alag file. Jaise ek lambi kitaab ke alag alag panne.<br><strong>Kyun chahiye:</strong> (1) Phone pehla tukda aate hi video chala sakta hai, poori file ka intezaar nahi. (2) Har naye tukde pe phone quality badal sakta hai: internet slow hua to agla tukda 240p wala. (3) Har tukda ek chhoti, kabhi na badalne wali file hai, to CDN use aaram se cache kar sakta hai.<br><strong>Iske bina:</strong> ek lambi stream, slow network pe buffering, quality switch lagbhag namumkin, aur CDN cache kisi kaam ka nahi.<br><strong>Example:</strong> 720p (3 Mbps) ka 4 second ka tukda = 3 × 4 ÷ 8 = <strong>1.5 MB</strong>. 4G pe 6 Mbps mile to ye 2 second mein aa jaata hai, yaani video se tez. Bas yahi chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: packager', html: `<strong>Ye kya hai:</strong> encoder ke baad wali machine. Encoder se compress hui video ki lagaataar dhaara aati hai. Packager use har quality ke liye 4-4 second ke tukdon (segments) mein kaat ke files banata hai, unhe sahi naam deta hai, aur ek <strong>list (manifest)</strong> likhta hai ki kaunse tukde kis quality mein available hain.<br><strong>Kyun chahiye:</strong> phone ko pata hona chahiye ki "agla tukda kaunsa hai aur kahan milega". Wo list packager hi banata aur har naye tukde pe update karta hai.<br><strong>Iske bina:</strong> encoder ki dhaara ek lambi stream hi rehti. Na tukde, na list, na CDN caching.<br><strong>Is design mein:</strong> packager hi video ka <strong>origin</strong> hai: asli tukde yahin se nikalte hain. Hotstar ke case mein ad bhi isi jagah jode jaate hain (aage dekhenge).` },
    { type: 'h3', text: '2d. Manifest (playlist): phone ke liye tukdon ki list' },
    { type: 'p', html: `Phone ko kaise pata ki kaunse tukde hain? Ek chhoti text file se, jise <strong>manifest</strong> ya <strong>playlist</strong> kehte hain. Do levels hote hain:` },
    { type: 'code', text: `
# master.m3u8: "is match ki kaunsi qualities hain?" (ek baar padhi jaati hai)
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=426x240
240p/live.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
720p/live.m3u8
...

# 720p/live.m3u8: "720p ke abhi kaunse tukde hain?" (har kuch second dobara padhi jaati hai)
#EXTM3U
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:18340
#EXTINF:4.0,
seg_18340.ts
#EXTINF:4.0,
seg_18341.ts
#EXTINF:4.0,
seg_18342.ts          <- sabse naya tukda. 4 s baad seg_18343 judega, seg_18340 hatega` },
    { type: 'callout', tone: 'term', title: 'Naye words: manifest, HLS, DASH', html: `<strong>Manifest (playlist):</strong> <strong>Ye kya hai:</strong> ek chhoti text file jo batati hai ki video ki kaunsi qualities hain aur har quality ke kaunse tukde abhi available hain.<br><strong>Kyun chahiye:</strong> phone ko har tukde ka naam aur pata (URL) chahiye. Live mein naye tukde har 4 second aate hain, to live manifest bhi har 4 second badalti hai, aur phone use baar baar dobara padhta hai.<br><strong>Iske bina:</strong> phone ko pata hi nahi chalega ki agla tukda kaunsa hai.<br><strong>HLS aur DASH:</strong> ye do "formats" (niyam) hain jo batate hain ki manifest aur tukde kaise likhe jaayein. HLS (HTTP Live Streaming) Apple ka hai, manifest <code>.m3u8</code>. DASH ek open standard hai, manifest <code>.mpd</code>. Dono mein tukde aam HTTP files hain, isliye koi bhi web server ya CDN unhe de sakta hai. Apple ki HLS guide 6 second ke tukde suggest karti hai; hum examples mein 4 second maanenge.` },
    { type: 'h3', text: '2e. Phone ka player: agla tukda kis quality ka?' },
    { type: 'p', html: `Phone ka video <strong>player</strong> (app ke andar ka hissa jo video chalata hai) ek simple loop chalata hai:` },
    { type: 'steps', items: [
      { t: 'Manifest padho', d: 'Live manifest laao. Dekho sabse naya tukda kaunsa hai.' },
      { t: 'Speed ka andaza', d: 'Pichhla tukda kitni der mein aaya? 1.5 MB 2 second mein aaya = 6 Mbps.' },
      { t: 'Quality chuno', d: 'Ladder mein se sabse oonchi quality jo is speed mein aaram se aa jaaye. Thoda margin rakho (jaise speed ka 80%), kyunki mobile internet upar neeche hota hai.' },
      { t: 'Buffer bharo', d: 'Tukda download karke buffer mein rakho, aur buffer se video chalao. Buffer kam ho to aur dhyaan se (kam quality) chuno.' },
      { t: 'Dohrao', d: 'Har 4 second ye loop. Isliye har tukde pe quality badal sakti hai.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naye words: player, buffer, ABR', html: `<strong>Buffer:</strong> <strong>Ye kya hai:</strong> phone ki memory mein rakha hua "aage ka" video, jo abhi dikhaya nahi gaya. Jaise 12 second ka buffer = internet 12 second band ho jaaye tab bhi video chalta rahega.<br><strong>Kyun chahiye:</strong> internet kabhi tez kabhi slow hota hai. Buffer is upar-neeche ko chhupa deta hai.<br><strong>Iske bina:</strong> har chhoti si network hichki pe video ruk jaata (wo ghoomta hua circle).<br><strong>ABR (Adaptive Bitrate):</strong> player ka ye faisla ki agla tukda ladder ki kaunsi quality ka ho. Faisla phone pe hota hai, server pe nahi. Isliye crores phones apna apna faisla khud lete hain aur server pe koi bojh nahi.<br><strong>Live ka twist:</strong> live mein buffer bahut bada nahi ho sakta, kyunki aage ka video abhi bana hi nahi. Player "live edge" (sabse naye tukde) se ~3 tukde peeche chalta hai, to buffer ~12 second tak hi rehta hai.` },
    { type: 'p', html: `Khud chala ke dekho. Slider se network speed badlo aur "Agla tukda lao" dabao. Ya "Story" dabao: ghar ka WiFi, phir metro ki tunnel, phir wapas WiFi. Phir "Ziddi player" chun ke wahi story chalao, jo hamesha 1080p hi maangta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips hs-mode" role="group" aria-label="Player">
          <button type="button" class="chip on" data-m="abr">ABR player</button>
          <button type="button" class="chip" data-m="fixed">Ziddi player (hamesha 1080p)</button>
        </div>
        <div class="row2">
          <div><label>Network speed (Mbps): <strong class="hs-spv"></strong></label><input class="hs-sp" type="range" min="0.3" max="10" step="0.1" value="6"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
            <button type="button" class="btn small primary hs-next">Agla tukda lao</button>
            <button type="button" class="btn small hs-story">Story: WiFi → metro → WiFi</button>
            <button type="button" class="btn small ghost hs-reset">Reset</button>
          </div>
        </div>
        <svg class="hs-svg" viewBox="0 0 720 190" style="width:100%;height:auto;display:block" role="img" aria-label="Har tukde ki quality aur buffer"></svg>
        <div class="stats">
          <div class="stat"><span>Is tukde ki quality</span><strong class="hs-q">-</strong></div>
          <div class="stat"><span>Tukde ka size</span><strong class="hs-mb">-</strong></div>
          <div class="stat"><span>Download time</span><strong class="hs-dl">-</strong></div>
          <div class="stat"><span>Buffer (max 12 s)</span><strong class="hs-buf">-</strong></div>
          <div class="stat"><span>Video atka (kitni baar / kul s)</span><strong class="hs-st">-</strong></div>
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
        const why = mode === 'fixed' ? 'ziddi player hamesha 1080p maangta hai' : `andaza ${est} Mbps × ${st.buf < 8 ? '50% (buffer kam, safe khelo)' : '80%'} = ${(est * (st.buf < 8 ? 0.5 : 0.8)).toFixed(2)} Mbps budget`;
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
        if (!H.length) s += `<text x="374" y="80" text-anchor="middle" style="fill:var(--ink-3);font:13px var(--f-body)">"Agla tukda lao" ya "Story" dabao</text>`;
        q('.hs-svg').innerHTML = s;
        const last = hist[hist.length - 1];
        q('.hs-q').textContent = last ? LAD[last.k][0] : '-';
        q('.hs-mb').textContent = last ? last.mb.toFixed(2) + ' MB' : '-';
        q('.hs-dl').textContent = last ? last.dl.toFixed(1) + ' s' : '-';
        q('.hs-buf').textContent = last ? last.buf.toFixed(1) + ' s' : '-';
        q('.hs-st').textContent = st.stalls + ' / ' + st.stallT.toFixed(1) + ' s';
        q('.hs-note').textContent = !last ? 'Bar = har tukde ki quality (laal = us tukde pe video atka). Peeli line = buffer. Neeche: tukde ka number aur us waqt ki network speed.'
          : `Tukda #${hist.length}: ${LAD[last.k][0]} (${last.why}). ${last.mb.toFixed(2)} MB ÷ ${last.speed} Mbps = ${last.dl.toFixed(1)} s download.` + (last.stall > 0 ? ` Buffer itna nahi tha, video ${last.stall.toFixed(1)} s atka!` : ` Buffer ab ${last.buf.toFixed(1)} s.`)
            + (mode === 'abr' && hist.length >= 16 ? ' Story mein ABR player kabhi nahi atka: tunnel mein 240p pe aa gaya, phir dheere dheere wapas 1080p.' : '')
            + (mode === 'fixed' && hist.length >= 16 ? ` Ziddi player ${st.stalls} baar atka, kul ${st.stallT.toFixed(1)} second ka "loading" circle. Isi liye ABR.` : '');
      };
      q('.hs-sp').addEventListener('input', () => { q('.hs-spv').textContent = q('.hs-sp').value; });
      q('.hs-next').addEventListener('click', () => { step(+q('.hs-sp').value); draw(); });
      q('.hs-story').addEventListener('click', () => { reset(); STORY.forEach(step); q('.hs-sp').value = 8; q('.hs-spv').textContent = 8; draw(); });
      q('.hs-reset').addEventListener('click', () => { reset(); draw(); });
      el.querySelectorAll('.hs-mode .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.hs-mode .chip').forEach(x => x.classList.toggle('on', x === b)); reset(); draw(); }));
      q('.hs-spv').textContent = q('.hs-sp').value; reset(); draw();
    }},
    { type: 'p', html: `Story ke numbers: <strong>ABR player</strong> WiFi (8 Mbps) pe 720p se shuru karta hai, buffer bharte hi 1080p. Tunnel mein speed 0.5 Mbps hui to wo 480p, phir 240p pe aa gaya, aur <strong>ek baar bhi nahi atka</strong>. <strong>Ziddi player</strong> (hamesha 1080p) ne tunnel mein 2.5 MB ka tukda 0.5 Mbps pe 40 second mein laaya: <strong>6 baar atka, kul ~122.5 second</strong> loading. Yahi ABR ka poora fayda hai.` },
    { type: 'h3', text: '2f. Crores phones ek hi tukda maangein: CDN aur origin' },
    { type: 'p', html: `Packager ne ek naya tukda <code>seg_18342.ts</code> (720p, 1.5 MB) banaya. Agle 4 second mein 5 crore phones ise maangenge. Agar sab packager se hi lein, to 5 crore × 1.5 MB = 75,000 GB (75 TB) <em>har 4 second</em>, yaani ~150 Tbps (agar sab 720p dekhein). Ek machine to kya, ek data center ke liye bhi ye namumkin hai. Lekin ek achhi baat hai: <strong>sabko bilkul same file chahiye</strong>, aur ye file ban jaane ke baad kabhi nahi badalti. Aisi file ki copies bana ke users ke paas rakhna sabse aasaan hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: origin', html: `<strong>Ye kya hai:</strong> hamara apna server ya storage jahan asli data banta/rehta hai. Video ke liye origin = packager (asli tukde wahin bante hain). Score ke liye origin = score service ki file.<br><strong>Kyun important:</strong> origin ek hi jagah hai aur uski capacity limited hai. Origin pe aane wali har request mehengi hai.<br><strong>Iska dhyaan na rakho to:</strong> crores requests origin pe aayengi aur wo gir jaayega. Is poore lesson ka ek hi mantra hai: <em>origin ko bachao</em>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: CDN edge', html: `<strong>Ye kya hai:</strong> CDN (Content Delivery Network) ek company ke hazaron servers hain jo shehron mein, internet providers ke paas rakhe hote hain. Har aisi jagah ko edge ya PoP kehte hain. Edge pe tukdon ki copies (cache) rehti hain. Detail <a href="#/cdn">CDN lesson</a> mein.<br><strong>Kyun chahiye:</strong> Mumbai ka phone Mumbai ke edge se tukda le leta hai. Edge ke paas copy na ho (miss) tabhi wo origin se maangta hai, aur phir agle lakhon logon ko apni copy deta hai.<br><strong>Iske bina:</strong> saari bandwidth (10 Tbps+) hamare servers se nikalni padti. Koi ek data center itna nahi bhej sakta.<br><strong>Segments yahan kaam aate hain:</strong> chhoti, kabhi na badalne wali files ko cache karna CDN ke liye sabse aasaan kaam hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: origin shield', html: `<strong>Ye kya hai:</strong> CDN edges aur origin ke beech ek aur cache layer (mid-tier). Edges seedhe origin se nahi, shield se maangte hain.<br><strong>Kyun chahiye:</strong> live mein naya tukda banta hai aur <em>usi second</em> hazaron edges ke paas miss hota hai. Wo sab ek saath maangte hain. Shield in sab requests ko rok ke origin se sirf <strong>ek baar</strong> maangta hai, aur jawab sabko baant deta hai. Ise <strong>request collapsing</strong> kehte hain.<br><strong>Iske bina:</strong> har naye tukde pe, har quality ke liye, hazaron requests origin pe. 5 qualities × har 4 second × 2,000 edges = har second ~2,500 requests sirf ek stream ke liye, aur languages/angles ke saath kai guna.` },
    { type: 'callout', tone: 'term', title: 'Naya word: multi-CDN', html: `<strong>Ye kya hai:</strong> ek se zyada CDN companies ko saath mein use karna (CDN A, CDN B...). App ko play karte waqt ek main CDN aur kuch backup CDNs ke URL milte hain.<br><strong>Kyun chahiye:</strong> (1) Capacity: crores viewers ka traffic ek provider akela shayad na utha paaye. (2) Bachaav: ek provider ka ek region gira, to player agla tukda doosre CDN se le leta hai.<br><strong>Iske bina:</strong> ek CDN ki dikkat = poore desh mein match band.<br><strong>Keemat:</strong> zyada contracts, zyada monitoring, aur har CDN pe extra jagah (headroom) rakhni padti hai taaki doosre ka traffic aa sake.` },
    { type: 'h3', text: '2g. Ad break: ads bhi tukde ban jaate hain' },
    { type: 'p', html: `Over khatam hua, TV pe ad aata hai. App mein bhi aana chahiye, aur ho sake to har user ko uske hisaab se ad (Delhi wale ko ek, Chennai wale ko doosra). Iske liye do cheezein chahiye:` },
    { type: 'callout', tone: 'term', title: 'Naye words: playout, SCTE-35', html: `<strong>Playout:</strong> broadcaster ka "control room" system jo final on-air feed chalata hai (commentary, graphics, replays sab milake).<br><strong>SCTE-35:</strong> <strong>Ye kya hai:</strong> video stream ke andar chhupa ek chhota signal, jaise "abhi se 30 second ka ad break".<br><strong>Kyun chahiye:</strong> neeche ke saare systems (encoder, packager) ko pata chal jaata hai ki ad kab daalna hai, bina kisi insaan ke batayein.<br><strong>Iske bina:</strong> ad galat time pe kat jaayega, ya match ki ball ad ke neeche chhup jaayegi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: SSAI (server-side ad insertion)', html: `<strong>Ye kya hai:</strong> server pe hi ad ke tukde video ke tukdon ke beech jod dena. SCTE-35 signal aaya, to ek "stitching" service ad server se ad leti hai aur manifest mein match ke tukdon ki jagah ad ke tukdon ke naam likh deti hai.<br><strong>Kyun chahiye:</strong> player ke liye ad bas "aur tukde" hain. Na alag ad player, na switch karte waqt kaala screen, aur ad blocker ad ko alag se pehchaan nahi paate.<br><strong>Iske bina (client-side ads):</strong> app ko khud ad laana aur video rok ke chalana padta, crores phones ek saath ad server pe jaate.<br><strong>Keemat:</strong> alag alag groups (cohorts: sheher, umar, device) ki <em>alag manifest</em>. Zyada manifests = CDN pe kam cache hits. JioHotstar ka 2025 ka blog yahi problem batata hai (aage flow mein).` },
    { type: 'p', html: `Bas, poori chain ban gayi: <strong>camera → playout → encoder (ladder) → packager (tukde + manifest, ads) → origin shield → kai CDNs → phone ka ABR player</strong>. Ab har hissa kyun hai, ye pata hai. Aage ki napkin maths aur design mein yahi words use honge.` },

    { type: 'h2', text: 'Step 3: napkin maths' },
    { type: 'p', html: `Har phone teen tarah ki requests bhejta hai. Teeno ko ginenge:` },
    { type: 'list', items: [
      `<strong>Video tukde:</strong> har 4 second ek tukda (upar dekha).`,
      `<strong>Score poll:</strong> "poll" matlab baar baar poochhna. App har kuch second poochhti hai "score kya hai?" (Deep dive 1 mein detail).`,
      `<strong>Heartbeat:</strong> "dil ki dhadkan". Player har ~30 second server ko chhota sa message bhejta hai "main abhi bhi dekh raha hoon". Isi se "X crore dekh rahe hain" ginte hain (Deep dive 2).`,
    ]},
    { type: 'p', html: `Hotstar ke 2019 ke talk ke numbers se ek andaza milta hai: 2.53 crore viewers pe 10 Tbps+ bandwidth (1 Tbps = 10 lakh Mbps), matlab average ~400 kbps per viewer (zyadatar log phone pe, chhoti quality pe). Values badal ke dekho ki har cheez kitni badi hai:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Concurrent viewers (crore): <strong class="hn-vv"></strong></label><input class="hn-v" type="range" min="0.5" max="7" step="0.5" value="6"></div>
          <div><label>Average bitrate (kbps): <strong class="hn-bv"></strong></label><input class="hn-b" type="range" min="200" max="2000" step="100" value="400"></div>
          <div><label>Score poll har kitne second: <strong class="hn-pv"></strong></label><input class="hn-p" type="range" min="1" max="10" step="1" value="2"></div>
          <div><label>Heartbeat har kitne second: <strong class="hn-hv"></strong></label><input class="hn-h" type="range" min="10" max="60" step="10" value="30"></div>
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
        q('.hn-note').textContent = `${tbps.toFixed(1)} Tbps koi ek data center nahi bhej sakta: video sirf CDN ke edge servers se hi ja sakta hai (kai CDNs mila ke). Score ke ${fmt(V / p)} requests/s agar seedhe hamare servers pe aayein to koi database nahi jhelega; isliye score bhi CDN se. Sirf heartbeats aur login jaise "personal" calls hi origin tak pahunchne chahiye. Maana: har player 4 s ka segment leta hai.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Conclusion: is system mein <strong>origin</strong> (hamare apne servers) ko bachaana hi poora khel hai. Jo bhi cheez sabke liye same hai (video segments, score, scorecard, viewer count) wo CDN se jaayegi. Hotstar ke 2018 ke blog ka ek principle yahi tha: zyada se zyada traffic origin tak pahunchne hi mat do.` },

    { type: 'h2', text: 'Step 4: API aur core entities' },
    { type: 'code', text: `
POST /v1/play  { matchId, language: "hi", angle: "main" }      (login + entitlement check)
  → { manifestUrl: "https://cdn-a.xyz.com/live/m42/hi/master.m3u8?token=...",
      fallbackCdns: ["cdn-b..."], heartbeatEverySec: 30 }

GET  https://cdn-a.xyz.com/live/m42/hi/720p/seg_18342.ts        (video, CDN se)

GET  https://static.xyz.com/live/m42/score.json                  (score, CDN se, TTL ~1-2 s)
  → { "runs": 187, "wkts": 4, "overs": "17.3", "lastBall": "4", "v": 9121 }

POST /v1/heartbeat  { sessionId, matchId, position }             (har 30 s, origin tak)` },
    { type: 'p', html: `Seedhe shabdon mein: app pehle <code>/v1/play</code> se poochhti hai "kya main ye match dekh sakta hoon?" (login aur subscription check, isko <strong>entitlement</strong> kehte hain). Jawab mein milta hai master manifest ka URL (ek <strong>token</strong> ke saath, taaki link share karke free mein na dekh sakein) aur backup CDNs ki list. Uske baad video ke tukde aur score dono CDN se aate hain. Sirf play aur heartbeat hi hamare apne servers (origin) tak aate hain.` },
    { type: 'table', head: ['Entity', 'Kya rakhta hai'], rows: [
      ['Match', 'id, teams, status, kaun kaun si streams (language × camera angle)'],
      ['Stream / rendition ladder', 'har stream ki qualities: 240p se 1080p, har ek ka bitrate'],
      ['Score snapshot', 'chhota JSON: runs, wickets, overs, last ball, version number'],
      ['Session', 'kaunsa user, kaunsa device, kaunsi stream, last heartbeat kab'],
      ['Ad break', 'SCTE-35 marker ka time, duration, kaunse cohort ko kaunsa ad'],
    ]},

    { type: 'h2', text: 'Step 5: video ka raasta, stadium se phone tak (design)' },
    { type: 'p', html: `Recorded video (YouTube) mein file pehle se poori hoti hai. Live mein video <em>abhi</em> ban raha hai, to har kaam chalte chalte, har 4 second mein hota hai. Step 2 ke saare hisse ab ek line mein jodte hain (recorded video ke liye <a href="#/design-youtube">YouTube / Netflix</a> lesson dekho; yahan fark bas itna hai ki ye belt kabhi rukti nahi):` },
    { type: 'steps', items: [
      { t: 'Production aur playout', d: 'Stadium ke cameras se broadcaster ki team ek feed banati hai (commentary, graphics, replays). JioHotstar ke Dec 2025 ke blog ke mutabik playout operators isi feed mein ad break ke signal (SCTE-35) bhi daalte hain.' },
      { t: 'Live encoder', d: 'Har second ki video ko usi second compress karta hai, ek saath 5 qualities mein (ladder: 240p se 1080p). Har language aur har camera angle ek alag stream hai, to encoders ka kaam guna ho jaata hai.' },
      { t: 'Packager (origin)', d: 'Har quality ki video ko 4 second ke tukdon (segments) mein kaatta hai. Har naya tukda bante hi manifest (list) mein uska naam jodta hai aur sabse purana hata deta hai. Ad break pe ad ke tukde jodta hai (SSAI).' },
      { t: 'Origin shield + CDNs', d: 'Naya tukda pehli baar maanga gaya to shield origin se ek hi baar laata hai. Phir kai CDN companies ke edge servers, viewers ke shehar ke paas se, wahi tukda crores logon ko dete hain.' },
      { t: 'Player (ABR)', d: 'Phone har kuch second manifest dobara padhta hai, naya tukda laata hai, aur har tukde pe network dekh ke quality chunta hai. Kamzor 4G pe 240p, WiFi pe 1080p.' },
    ]},
    { type: 'p', html: `Neeche ka diagram yahi chain hai. Har box pe click karke uska kaam padho. Scenarios mein dekho: ek tukde ka safar, shield ka request collapsing, ek CDN girna, aur ad break.` },
    { type: 'flow', title: 'Live video path', height: 340,
      nodes: [
        { id: 'feed', label: 'Stadium feed', sub: 'production', x: 80, y: 60, w: 130, kind: 'client', info: 'Ye kya hai: stadium ke cameras se bani final TV feed (commentary, graphics, replays). Is design mein ye video ka shuruaati point hai. Playout system isi feed mein ad break ke signal (SCTE-35) daalta hai.' },
        { id: 'enc', label: 'Live encoder', sub: 'ABR ladder', x: 260, y: 60, w: 140, kind: 'server', info: 'Ye kya hai: wo machine jo bahut badi raw video ko ~250 guna chhota (compress) karti hai, ek saath 5 qualities (ladder) mein. Live mein usi second, bina peeche reh. Hotstar ke 2018 ke blog ke mutabik unhone encoding workflow ke har hisse ka time naapa aur encoder settings tune karke broadcast se latency ~55 s se ~15-20 s tak laayi.' },
        { id: 'pkg', label: 'Packager', sub: 'HLS/DASH + SSAI', x: 460, y: 60, w: 160, kind: 'server', info: 'Ye kya hai: wo machine jo encoder ki video ko 4 second ke tukdon (segments) mein kaat ke files banati hai aur manifest (tukdon ki list) har 4 second update karti hai. Ye video ka origin hai. JioHotstar ke 2025 ke blog ke mutabik unka in-house stitching service ad server se ads lekar har cohort ki manifest mein ad segments jodta hai (server-side ad insertion).' },
        { id: 'shield', label: 'Origin shield', sub: 'mid-tier cache', x: 460, y: 190, w: 160, kind: 'cache', info: 'Ye kya hai: CDN edges aur origin ke beech ek extra cache layer. Kyun: ek naye tukde ke liye hazaar edges ki requests ko ek origin request mein badal deta hai. Dec 2025 ke blog mein JioHotstar ne origin shield pe compute badhne ki baat ki jab cohort manifests bahut badh gayi.' },
        { id: 'cdnA', label: 'CDN A', sub: 'edge PoPs', x: 260, y: 190, w: 140, kind: 'edge', info: 'Ye kya hai: ek CDN company ke edge servers, viewers ke shehar ke paas, jahan tukdon ki copies rehti hain. Isi se 10 Tbps+ video crores tak pahunchta hai. Hotstar 2015 se Akamai ka customer raha hai (Akamai, 2016). Hotstar ke 2024 ke blog mein "CDNs" aur "CDN providers" bahuvachan mein hain: ek provider akela itna traffic nahi utha sakta.' },
        { id: 'cdnB', label: 'CDN B', sub: 'doosra provider', x: 260, y: 300, w: 140, kind: 'edge', info: 'Ye kya hai: doosri CDN company ke edge servers. Multi-CDN se capacity bhi badhti hai aur ek provider ke girne pe bachaav bhi. Kis viewer ko kaunsa CDN mile, ye aam taur pe ek steering logic tay karta hai (region, health, cost); Hotstar ne apna exact logic public nahi kiya.' },
        { id: 'viewer', label: 'Viewers', sub: 'ABR player', x: 80, y: 245, w: 120, kind: 'client', info: 'Ye kya hai: crores phones, TVs, browsers ke video players. Player har kuch second manifest dobara padhta hai, agla tukda laata hai, aur har tukde pe network dekh ke quality chunta hai (ABR). Buffer mein ~12 s ka video rakhta hai.' },
      ],
      edges: [{ a: 'feed', b: 'enc' }, { a: 'enc', b: 'pkg' }, { a: 'pkg', b: 'shield' }, { a: 'shield', b: 'cdnA' }, { a: 'shield', b: 'cdnB' }, { a: 'cdnA', b: 'viewer' }, { a: 'cdnB', b: 'viewer' }],
      scenarios: [
        { name: 'Ek segment ka safar', steps: [
          { title: 'Ball hui', text: 'Camera feed production se encoder tak.', go: 'feed>enc', msg: 'live feed (1080p, commentary: hi)' },
          { title: 'Encode + package', text: 'Encoder ne pichhle kuch second ko ladder ki har quality mein encode kiya. Packager ne har quality ka naya segment banaya aur manifest mein joda.', go: 'enc>pkg', msg: 'seg_18342 (240p ... 1080p), playlist updated' },
          { title: 'Pehli request: miss', text: 'Kisi viewer ne naya segment maanga. CDN edge ke paas nahi tha, shield ke paas bhi nahi, to origin (packager) tak gaya. Aisa har naye segment pe sirf ek baar hota hai.', go: ['viewer>cdnA>shield>pkg', 'res:pkg>shield>cdnA>viewer'], after: { shield: { state: 'hit' } } },
          { title: 'Baaki crores: hit', text: 'Agle lakhon viewers ko wahi segment edge se mil gaya. Origin ko pata bhi nahi chala.', flood: { paths: ['res:cdnA>viewer', 'res:cdnB>viewer'], n: 12 }, after: { cdnA: { state: 'hit' }, cdnB: { state: 'hit' } } },
        ]},
        { name: 'Request collapsing', intro: 'Live mein sab log same segment same second pe maangte hain. Shield na ho to?', steps: [
          { title: 'Hazaar edges ek saath', text: 'Naya segment publish hua. Dono CDNs ke saikdon edge servers ek saath us segment ke liye shield tak aaye.', flood: { paths: ['cdnA>shield', 'cdnB>shield'], n: 12 }, after: { shield: { state: 'warn', sub: 'collapsing' } } },
          { title: 'Origin pe sirf ek', text: 'Shield ne saari requests ko rok ke rakha aur origin se sirf ek baar maanga. Jawab aate hi sabko de diya. Bina shield ke origin pe hazaar requests har segment pe, har quality ke liye.', go: ['shield>pkg', 'res:pkg>shield'], after: { shield: { state: 'hit', sub: 'mid-tier cache' } } },
        ]},
        { name: 'CDN A gira', steps: [
          { title: 'CDN A ke edges slow / down', text: 'Ek provider ke ek region mein dikkat. Segments time pe nahi aa rahe.', set: { cdnA: { state: 'down', sub: 'errors' } }, go: 'bad:viewer>cdnA' },
          { title: 'Player doosra CDN try karta hai', text: 'Play API ne pehle hi fallback CDNs ki list di thi. Player agla segment CDN B se leta hai. Buffer mein kuch second ka video tha, isliye user ko shayad pata bhi na chale.', go: ['viewer>cdnB', 'res:cdnB>viewer'], after: { cdnB: { state: 'hot', sub: 'extra load' } } },
          { title: 'Lekin CDN B pe achanak bojh', text: 'Ek provider ka saara traffic doosre pe gira. Isliye multi-CDN mein har provider ke paas headroom hona chahiye, warna ek ki failure doosre ko bhi gira deti hai. Hotstar ke 2019 ke talk ke summary mein load tests mein CDN failure bhi simulate karne ka zikr hai.', focus: ['cdnB'] },
        ]},
        { name: 'Ad break (SSAI)', steps: [
          { title: 'Over khatam, marker aaya', text: 'Playout ne feed mein SCTE-35 marker daala: 30 second ka ad break.', go: 'feed>enc>pkg', msg: 'SCTE-35: break start, duration 30 s' },
          { title: 'Cohort ki manifest mein ads', text: 'Stitching service har cohort (umar, sheher, device jaise groups) ke liye ad server se ads leta hai aur manifest mein content ki jagah ad segments likh deta hai. Player ke liye ye bas aur segments hain: ek hi player, koi switching nahi.', focus: ['pkg'], set: { pkg: { state: 'hot', sub: 'stitching ads' } } },
          { title: 'Keemat: cache kam', text: 'Har cohort ki alag manifest = CDN pe zyada alag objects, kam cache hits, shield pe zyada kaam. Dec 2025 ke blog mein JioHotstar ne isi wajah se server-guided ad insertion (SGAI) ki taraf jaane ki baat likhi: sabke liye ek common manifest, aur ad ka faisla client ke request pe.', go: ['viewer>cdnA>shield', 'res:shield>cdnA>viewer'], after: { shield: { state: 'warn', sub: 'many manifests' }, pkg: { state: '', sub: 'HLS/DASH + SSAI' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Latency: hum TV se kitna peeche hain?' },
    { type: 'p', html: `Padosi ke ghar se "chhakka!" ki aawaz aayi aur tumhare phone pe ball abhi bowler ke haath mein hai: ye <strong>latency</strong> hai. Hotstar ke 2018 ke blog ke mutabik ek saal mein unhone ise broadcast se ~55 second peeche se ~15-20 second tak laaya, encoding workflow ke har hisse ka time naap ke. Ye delay aata kahan se hai?` },
    { type: 'list', items: [
      `<strong>Encode + package</strong>: video encode hone aur segment banne mein kuch second.`,
      `<strong>Segment poora hona</strong>: 6 second ka segment tabhi publish hoga jab 6 second ki video ban chuki ho.`,
      `<strong>Player ka safety buffer</strong>: HLS ka standard (RFC 8216) kehta hai ki live mein player ko playlist ke aakhri ~3 target durations (target duration = ek tukde ki lambai) ke andar se playback shuru nahi karna chahiye, warna atak sakta hai. Matlab player jaan-boojh ke ~3 segment peeche chalta hai.`,
      `<strong>CDN + network</strong>: segment edge tak aur phone tak aane ka time.`,
    ]},
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Segment duration (s): <strong class="hl-sv"></strong></label><input class="hl-s" type="range" min="1" max="10" step="1" value="6"></div>
          <div><label>Encode + package delay (s, maan lo): <strong class="hl-ev"></strong></label><input class="hl-e" type="range" min="1" max="10" step="1" value="4"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Segment poora hone tak</span><strong class="hl-a"></strong></div>
          <div class="stat"><span>Player buffer (3 segments)</span><strong class="hl-b"></strong></div>
          <div class="stat"><span>Total, broadcast se peeche</span><strong class="hl-t"></strong></div>
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
        q('.hl-note').textContent = `Formula: encode (${E}) + segment (${S}) + 3 × segment (${3 * S}) + network (~${net}) ≈ ${total} s. Chhote segments = kam latency, lekin har viewer manifest zyada baar reload karega (${Math.round(60 / S)} baar/minute) aur CDN pe zyada requests aur zyada chhoti files. Bade segments = sasta aur stable, lekin TV se zyada peeche. Low-latency HLS (LL-HLS) jaise naye tareeke har tukde ko aur chhote hisson (partial segments) mein bhejte hain, taaki player tukda poora hone ka intezaar na kare.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "live" matlab zero delay?', html: `Nahi. HTTP streaming (HLS/DASH) mein hamesha kuch second ka delay hota hai, kyunki video segments mein bant ke CDN se aata hai. Ye delay hi crores logon tak sasta pahunchne ki keemat hai: segments cache ho sakte hain. Video call wali technology (WebRTC) jaisa 1 second se kam delay crores viewers ke liye kahin zyada mehenga hai. Live sports ke liye "TV se thoda peeche, lekin kabhi atke nahi" sahi trade-off hai.` },
    { type: 'p', html: `Quality kaise chuni jaati hai (ABR) ye upar ke segment player mein khel ke dekha, aur <a href="#/design-youtube">YouTube / Netflix</a> lesson mein aur detail hai. Hotstar ke 2017 ke blog mein ek aur baat thi: jab concurrency platform ki capacity ke paas pahunchti hai, to bitrate hi pehla lever hai jo neeche kiya jaata hai, kyunki infrastructure ki bandwidth ki ek hard limit hai. 6 crore × 100 kbps kam = 6 Tbps bachat.` },

    { type: 'h2', text: 'Deep dive 1: live score, 5 crore phones har 2 second' },
    { type: 'p', html: `<strong>Current architecture:</strong> score service ek database mein har ball ka score likhti hai, aur app <code>GET /score</code> se padhti hai. <strong>Naya problem:</strong> match mein 5 crore log, har phone har 2 second pe poochh raha hai. 2.5 crore requests per second, aur sab ka jawab <em>bilkul same</em> hai. Ek ball pe score sirf ek baar badalta hai (~30-40 second mein ek baar), lekin padha jaata hai crores baar.` },
    { type: 'callout', tone: 'term', title: 'Naye words: polling, JSON, TTL', html: `<strong>Polling:</strong> <strong>Ye kya hai:</strong> app khud baar baar poochhti hai "kuch naya?", jaise har 2 second. Server khud se kuch nahi bhejta.<br><strong>JSON:</strong> data likhne ka ek simple text format, jaise <code>{ "runs": 187, "wkts": 4 }</code>.<br><strong>TTL (Time To Live):</strong> <strong>Ye kya hai:</strong> cache ki copy kitni der "taazi" maani jaaye. TTL 1 second = edge apni copy 1 second tak deta hai, phir origin se nayi laata hai.<br><strong>Kyun chahiye:</strong> TTL chhota = score taaza, lekin origin pe zyada requests. TTL bada = origin aaram mein, lekin score purana.<br><strong>Iske bina (TTL = 0):</strong> har poll origin tak jaata, CDN ka koi fayda nahi.` },
    { type: 'p', html: `<strong>Solution:</strong> score ko ek chhoti <strong>JSON file</strong> bana do aur CDN ke peeche rakh do, bahut chhote TTL (~1-2 second) ke saath. Ab har CDN edge server origin se har TTL mein zyada se zyada ek baar poochhta hai, chahe uske peeche 1 viewer ho ya 10 lakh. Hotstar ke 2024 ke blog (2023 World Cup ki taiyaari) ke mutabik scorecard, concurrency count aur key moments jaise features "highly cacheable" maane gaye, aur unhe ek alag CDN domain pe daala gaya jahan security aur routing ke rules halke the, taaki edge servers ka compute bache.` },
    { type: 'flow', title: 'Live score path', height: 300,
      nodes: [
        { id: 'scorer', label: 'Scorer app', sub: 'har ball', x: 80, y: 70, w: 130, kind: 'client', info: 'Ye kya hai: scorer ki app. Stadium/studio mein baitha scorer har ball ka result daalta hai (run, wicket, extras). Ye ek hi jagah se aata hai, to writes bahut kam hain.' },
        { id: 'score', label: 'Score service', sub: 'validate + save', x: 280, y: 70, w: 150, kind: 'server', meter: true, load: 10, info: 'Ye kya hai: hamari service jo har ball ka event check (validate) karti hai, DB mein likhti hai, aur nayi score JSON publish karti hai. Iska load scorers pe nirbhar hai, viewers pe nahi. Yahi poori trick hai.' },
        { id: 'db', label: 'Score DB', sub: 'ball-by-ball', x: 280, y: 220, w: 140, kind: 'data', info: 'Ye kya hai: database jismein har ball ka permanent record hai. Scorecard, commentary, stats sab isse bante hain. Viewers isse kabhi seedhe nahi padhte.' },
        { id: 'json', label: 'score.json', sub: 'origin file', x: 480, y: 70, w: 140, kind: 'data', info: 'Ye kya hai: score ki chhoti (~1 KB) JSON file, version number ke saath. Ye score ka origin hai. Object storage ya ek halka origin server. CDN isi ko cache karta hai.' },
        { id: 'cdn', label: 'CDN edges', sub: 'TTL 1-2 s', x: 480, y: 220, w: 140, kind: 'edge', info: 'Ye kya hai: CDN ke edge servers. Har edge score.json ki copy 1-2 second ke liye rakhta hai. Us beech aaye saare polls copy se. TTL khatam hone pe hi origin se nayi copy.' },
        { id: 'fans', label: 'Viewers', sub: 'poll har 2 s', x: 650, y: 220, w: 120, kind: 'client', info: 'Ye kya hai: crores apps jo har kuch second pe score.json maangti hain (polling). Achhi app thoda random jitter (har phone apne interval mein thoda random time jodta hai) rakhti hai, taaki sab ek hi millisecond pe na poochhein.' },
      ],
      edges: [{ a: 'scorer', b: 'score' }, { a: 'score', b: 'db' }, { a: 'score', b: 'json' }, { a: 'json', b: 'cdn' }, { a: 'cdn', b: 'fans' }, { a: 'fans', b: 'score', id: 'direct', hidden: true, dashed: true }],
      scenarios: [
        { name: 'Ek ball, crores polls', steps: [
          { title: 'Chauka!', text: 'Scorer ne ball ka result daala.', go: 'scorer>score', msg: '{ ball: "17.3", runs: 4 }' },
          { title: 'Save + nayi JSON', text: 'Score service ne DB mein ball likhi aur score.json ka naya version publish kiya. Ye do-teen writes hain, bas.', parallel: true, go: ['score>db', 'score>json'], msg: 'score.json v9121: 187/4 (17.3)' },
          { title: 'Polls edge pe hi', text: 'Lakhon polls aaye. Edge ke paas copy thi (TTL abhi baaki), sab wahin se. Kuch viewers ko ek second purana score mila: chalta hai.', flood: { paths: ['fans>cdn', 'res:cdn>fans'], n: 12 }, after: { cdn: { state: 'hit' } } },
          { title: 'TTL khatam, ek refresh', text: 'Har edge ka TTL khatam hua to usne origin se ek baar nayi copy li. 5 crore viewers, lekin origin pe sirf utni requests jitne edge servers.', go: ['cdn>json', 'res:json>cdn', 'res:cdn>fans'], msg: 'GET score.json → v9121 (cache for 1 s)' },
        ]},
        { name: 'Bina CDN (failure)', intro: 'Agar app seedhe score service se poochhe?', steps: [
          { title: 'Seedha connection', text: 'Har poll seedha score service pe.', show: ['direct'], set: { cdn: { state: 'dim' }, json: { state: 'dim' } }, go: 'fans>score' },
          { title: '2.5 crore requests/s', text: 'Sabka jawab same, lekin har request pe server kaam karta hai. Service garam, phir down. Ab scorer bhi score update nahi kar pa raha.', flood: { paths: ['fans>score'], n: 14 }, after: { score: { state: 'down', sub: 'overloaded', load: 100 } } },
          { title: 'Sabak', text: 'Jo data sabke liye same hai aur thoda purana chal sakta hai, wo kabhi origin se per-user serve mat karo. Hotstar ke 2018 ke blog ka principle "Once Only": caching aur client-side TTL se zyada se zyada traffic origin se door rakho.', hide: ['direct'], set: { score: { state: '', sub: 'validate + save', load: 10 }, cdn: { state: '' }, json: { state: '' } } },
        ]},
        { name: 'TTL cloudburst', steps: [
          { title: 'Sab copies ek saath expire', text: 'Saare edges ne score.json same pal pe cache kiya tha, to sabka TTL bhi same pal pe khatam. Hazaron edges ek saath origin pe.', flood: { paths: ['cdn>json'], n: 12 }, after: { json: { state: 'hot', sub: 'burst' } } },
          { title: 'Ilaaj', text: 'Origin shield se request collapsing (ek hi fetch), TTL mein thoda random jitter, aur "stale-while-revalidate" (CDN ki ek setting: purani copy dete raho, peeche se nayi lao). Hotstar ke 2019 ke blog ne isi ko "TTL cloudburst" kaha: bahut saare objects (tokens, timers) ek saath expire hon to origin pe toofan.', set: { json: { state: '', sub: 'origin file' } }, go: ['cdn>json', 'res:json>cdn'] },
        ]},
        { name: 'Score service down', steps: [
          { title: 'Service gir gayi', text: 'Score service crash. Nayi JSON publish nahi ho rahi.', set: { score: { state: 'down', sub: 'DOWN' } }, go: 'bad:scorer>score' },
          { title: 'Video aur app chalte rahe', text: 'Edges ke paas purani score.json hai. Aam taur pe CDN ko "error aaye to purani copy do" (stale-if-error) bola jaata hai. Score kuch der ruka dikhega, lekin app crash nahi hogi, aur video ka iss service se koi lena dena nahi.', go: ['fans>cdn', 'res:cdn>fans'], after: { cdn: { state: 'warn', sub: 'stale copy' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Calculator: CDN origin ko kitna bachaata hai?' },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Viewers polling (crore): <strong class="hp-vv"></strong></label><input class="hp-v" type="range" min="0.5" max="7" step="0.5" value="5"></div>
          <div><label>Poll har kitne second: <strong class="hp-pv"></strong></label><input class="hp-p" type="range" min="1" max="10" step="1" value="2"></div>
          <div><label>CDN TTL (s): <strong class="hp-tv"></strong></label><input class="hp-t" type="range" min="1" max="10" step="1" value="1"></div>
          <div><label>CDN edge servers (maan lo): <strong class="hp-ev"></strong></label><input class="hp-e" type="range" min="500" max="5000" step="500" value="2000"></div>
        </div>
        <div class="chips hp-mode" role="group" aria-label="Setup">
          <button type="button" class="chip" data-m="none">Bina CDN</button>
          <button type="button" class="chip on" data-m="cdn">CDN</button>
          <button type="button" class="chip" data-m="shield">CDN + origin shield</button>
        </div>
        <div class="stats">
          <div class="stat"><span>Viewers ki requests</span><strong class="hp-c"></strong></div>
          <div class="stat"><span>Origin pe requests</span><strong class="hp-o"></strong></div>
          <div class="stat"><span>Origin ko bacha (offload)</span><strong class="hp-off"></strong></div>
          <div class="stat"><span>Score kitna purana (max)</span><strong class="hp-st"></strong></div>
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
          ? `Har poll seedha origin pe: ${fmt(client)} requests/s, sab ka jawab same. Koi database ya service fleet isse sasta nahi jhel sakti.`
          : mode === 'cdn'
            ? `Har edge server TTL mein ek baar origin se maangta hai (maana ki edge apne andar ki requests collapse karta hai): ${E} edges ÷ ${ttl} s = ${fmt(origin)}/s. Viewers 10 guna badhein, origin ka load wahi rahega. Keemat: CDN ki wajah se score ${ttl} s aur purana ho sakta hai (poll interval ke upar).`
            : `Edges ab origin ki jagah ${SHIELDS} shield servers (maan lo) se maangte hain, aur shields hi origin tak jaate hain: ${SHIELDS} ÷ ${ttl} s = ${fmt(origin)}/s. Origin ka load ab viewers pe nahi, sirf TTL aur shields ki ginti pe nirbhar.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      el.querySelectorAll('.hp-mode .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.hp-mode .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      upd();
    }},
    { type: 'p', html: `Default values pe: 5 crore viewers, har 2 second = <strong>2.5 crore requests/s</strong> viewers ki taraf se. CDN ke saath origin pe sirf ~2,000/s (edges ÷ TTL), shield ke saath ~20/s. Yahi wajah hai ki ye trick viewers ki ginti se <em>independent</em> hai, aur tsunami mein bhi origin shaant rehta hai.` },
    { type: 'h3', text: 'Polling kyun, push (WebSocket) kyun nahi?' },
    { type: 'p', html: `Polling ka ulta hai <strong>push</strong>: har phone server se ek connection khula rakhta hai (jaise WebSocket), aur naya score aate hi server khud bhej deta hai. Sunne mein behtar lagta hai. Lekin crores logon ke liye hisaab dekho:` },
    { type: 'table', head: ['', 'CDN polling', 'Push (WebSocket / MQTT)'], rows: [
      ['Har viewer pe server ka kharcha', 'Zero: CDN edge sambhalta hai', 'Ek khula connection per viewer, crores connections'],
      ['Freshness', 'TTL + poll interval tak purana (1-3 s)', 'Turant'],
      ['Spike pe', 'Naye viewers sirf CDN pe load dalte hain', 'Lakhon naye connections ek saath (connect storm)'],
      ['Kab', 'Data sabke liye same, 1-2 s der chalti hai (score, viewer count)', 'Data per-user ya turant chahiye (chat, emojis, polls)'],
    ]},
    { type: 'p', html: `Dono saath chal sakte hain. Hotstar ke 2020 ke blog ke mutabik live emojis ke liye unhone apna in-house <strong>PubSub</strong> (real-time messaging) use kiya: emojis HTTP se aate hain, <a href="#/kafka">Kafka</a> mein jaate hain, ek Spark streaming job (lagaataar chalne wala data-processing program) har 2 second ka jod (aggregate) nikaalti hai, aur sabse popular emojis PubSub se apps tak push hote hain. 2019 World Cup mein ~5.5 crore users ne ~500 crore emojis bheje. Push vs poll ka poora comparison <a href="#/realtime">real-time lesson</a> mein hai.` },
    { type: 'callout', tone: 'tip', title: 'No dumb clients', html: `Hotstar ke 2018 ke blog ka ek principle: client app "bewakoof" nahi honi chahiye. Polls mein random <strong>jitter</strong> (sab ek hi millisecond pe na poochhein), error pe <strong>exponential back-off</strong> (turant retry nahi; har fail ke baad intezaar double: 1 s, 2 s, 4 s, 8 s...), local caching, aur server ka "panic" signal aaye to khud ruk jaana. Tsunami ke time crores clients ka retry hi sabse bada hathiyaar ya sabse bada dushman hai.` },

    { type: 'h2', text: 'Deep dive 2: "6 crore dekh rahe hain", ye number banta kaise hai?' },
    { type: 'p', html: `Screen ke kone mein jo viewer count dikhta hai, wo do kaam karta hai: fans ko maza aata hai, aur engineers ke liye ye <strong>sabse important metric</strong> hai. Hotstar ke 2019 ke talk ke summary ke mutabik wo servers ko request count ya <strong>platform concurrency</strong> ke hisaab se scale karte the, aur 2018 ke blog mein capacity ki "ladders" estimated concurrency se tay hoti thi. Hotstar ke 2024 ke blog mein "concurrency" ko scorecard ki tarah ek cacheable feature gina gaya hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: heartbeat', html: `<strong>Ye kya hai:</strong> player ka har ~30 second bheja gaya chhota sa message: "main (session 7f3a) abhi bhi match m42 dekh raha hoon".<br><strong>Kyun chahiye:</strong> kaun abhi dekh raha hai, ye janne ka sabse sasta tareeka. Message nahi aaya = viewer chala gaya.<br><strong>Iske bina:</strong> hume pata hi nahi chalega ki kitne log abhi dekh rahe hain. Video ke tukde to CDN se aate hain, wo requests hamare servers tak aati hi nahi.<br><strong>Example:</strong> 6 crore viewers ÷ 30 s = <strong>~20 lakh heartbeats har second</strong>. Ye origin tak aane wala sabse bada stream hai, isliye ise bhi halka rakhna padta hai.` },
    { type: 'p', html: `Hotstar ne apni exact counting public nahi ki. Aam taur pe industry mein ye aise banta hai:` },
    { type: 'steps', items: [
      { t: 'Heartbeat', d: 'Har chalta hua player har ~30 second pe ek chhota "main zinda hoon" message bhejta hai: sessionId, matchId, stream. Player band, app background, ya phone ka network gaya: heartbeat ruk jaati hai.' },
      { t: 'Window', d: 'Ek viewer "concurrent" tab gina jaata hai jab uski aakhri heartbeat pichhle ~60 second mein aayi ho. Ek heartbeat miss hone pe bhi wo gina jaata rahe, isliye window interval se badi.' },
      { t: 'Sharded counting', d: '20 lakh messages/s ek machine nahi gin sakti. To kaam baant do: sessionId se ek number (hash) nikaal ke har heartbeat ko kai hisson (shards ya Kafka partitions) mein se ek mein bhejo. Har shard apne active sessions ginta hai. Same session hamesha same shard pe, to double counting nahi; total = sab shards ka jod.' },
      { t: 'Ya approximate', d: 'Crores sessionIds ki poori list rakhna bhaari ho to HyperLogLog: ek chalaak ginti ka tareeka jo list nahi rakhta, sirf ek chhota sa "sketch" rakhta hai. ~12 KB mein crores unique sessions ka ~1% galti wala andaza, aur sketches merge bhi ho jaate hain (<a href="#/ds-for-scale">data structures for scale</a>).' },
      { t: 'Publish', d: 'Har kuch second / minute pe total ek chhoti JSON mein, aur wo bhi score ki tarah CDN se. Viewer count ko har second exact hone ki zaroorat nahi.' },
    ]},
    { type: 'ascii', text: `
 players ──heartbeat (30 s)──> ingest ──> Kafka (key = sessionId) ──> counters (per partition)
                                                                        │ "last seen < 60 s" ginti
                                                                        v
                         CDN <── concurrency.json <── sum of partitions ──> autoscaler / dashboards
 6 crore viewers ÷ 30 s = ~20 lakh heartbeats/s: ye origin tak jaane wala sabse bada stream hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: requests gin lo, viewers mil jaayenge?', html: `Nahi. Ek viewer har 4 second pe segment, har 2 second pe score, aur kabhi kabhi doosri APIs maangta hai; requests ki ginti viewers ki ginti nahi. Aur segment requests to CDN pe khatam ho jaati hain, origin tak aati hi nahi. Isliye ek alag, sasta signal (heartbeat) chahiye. Ye number hamesha <strong>approximate</strong> hai: heartbeats kho jaati hain, aur window ki wajah se jo abhi gaya wo ~1 minute aur gina jaata hai.` },

    { type: 'h2', text: 'Deep dive 3: tsunami, aur autoscaling kyun haar jaata hai' },
    { type: 'p', html: `Hotstar ke 2017 ke blog "T For Tsunami" ki kahani: Champions Trophy ka India-Pakistan match, team ne 70 lakh concurrency ke liye planning ki thi. Phir <strong>Virat Kohli batting karne aaye</strong>, ek bade hisse ko push notification gaya, aur login API <strong>10 hazaar se 1.25 lakh requests/s</strong> pe kuch hi seconds mein pahunch gayi. Platform hichki kha gaya.` },
    { type: 'p', html: `Post-mortem mein kya mila? Front ke servers to 70 lakh ke liye scale the, lekin <strong>database</strong> us hisaab se nahi badhaya gaya tha, aur wo pighal gaya (memory itni bhar gayi ki wo disk ko memory ki tarah use karne laga, jise <em>swap</em> kehte hain, aur bahut slow ho gaya). Login jaisi request cache nahi ho sakti (har user alag), to saara bojh seedha DB pe. Sabak: scale sirf front ke servers ka nahi, poori chain ka hota hai. Aur clients ko bhi smart banana pada taaki wo is lehar ko thoda smooth karein.` },
    { type: 'callout', tone: 'term', title: 'Naya word: tsunami traffic', html: `Normal spike dheere chadhta hai. <strong>Tsunami</strong> mein traffic ki deewar ek saath aati hai: notification gaya, aur ek minute mein lakhon log ek hi raaste (app open → login → home → play) se guzarte hain. Hotstar ke 2019 ke talk ke summary mein ye growth <strong>10 lakh+ users per minute</strong> bataayi gayi.` },
    { type: 'p', html: `Autoscaling (<a href="#/pattern-spikes">traffic spikes lesson</a> mein detail) kyun kaafi nahi? Usi 2019 talk ke summary ke points: app boot hone mein ~1 minute, metric se faisla lene mein ~90 second, aur spike ke waqt cloud provider ke paas us type ki machines hi khatam (insufficient capacity errors). Jab tak nayi machine aati, lehar aage nikal chuki. Hotstar ke 2018 ke blog ka seedha jawab: <strong>autoscaling pe nahi chalenge</strong>. Peak concurrency ka andaza lagao, aur match se <em>pehle</em> utna scale karke baitho.` },
    { type: 'callout', tone: 'term', title: 'Naye words: autoscaling, pre-scaling', html: `<strong>Autoscaling:</strong> <strong>Ye kya hai:</strong> cloud ka automatic system jo load (jaise CPU) dekh ke machines khud badhata/ghatata hai.<br><strong>Kyun achha:</strong> normal din pe sasta: jitna load, utni machines.<br><strong>Kahan haarta hai:</strong> wo load <em>badhne ke baad</em> jaagta hai, aur nayi machine ko chalu hone mein minutes lagte hain. Tsunami seconds mein aata hai.<br><strong>Pre-scaling:</strong> <strong>Ye kya hai:</strong> event ka time pata hai (match 7:30 baje), to usse pehle hi andaaze (forecast) ke hisaab se machines chalu kar dena.<br><strong>Kyun chahiye:</strong> tsunami ke pehle second se capacity taiyaar.<br><strong>Iske bina:</strong> Kohli aaye, notification gaya, aur machines aane tak app gir chuki.<br><strong>Keemat:</strong> khaali khadi machines ka bill, aur forecast galat ho to phir bhi dikkat. Isliye dono saath: pre-scale farsh, autoscale upar ka jaal.` },
    { type: 'h3', text: 'Simulator: ek match ki timeline' },
    { type: 'p', html: `Ek nakli T20 match (load "lakh rps" mein; rps = requests per second, numbers "maan lo" hain, shape Hotstar ki kahaniyon jaisi). Toss, wickets, innings break ke baad wapsi, aur jeet ka pal: sab pe spike. Teen strategies chala ke dekho. Laal = jab load capacity se upar tha (users ko errors).` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips ht-mode" role="group" aria-label="Strategy">
          <button type="button" class="chip on" data-m="auto">Sirf autoscaling</button>
          <button type="button" class="chip" data-m="pre">Sirf pre-scaling</button>
          <button type="button" class="chip" data-m="both">Pre-scale + autoscale</button>
        </div>
        <div class="row2">
          <div><label>Autoscale lag (min): <strong class="ht-lv"></strong></label><input class="ht-l" type="range" min="1" max="10" step="1" value="5"></div>
          <div><label>Pre-scale capacity (lakh rps): <strong class="ht-fv"></strong></label><input class="ht-f" type="range" min="20" max="50" step="1" value="40"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input class="ht-n" type="checkbox" checked style="width:auto"> Star batsman aaya + push notification (minute 96)</label>
        <svg class="ht-svg" viewBox="0 0 720 270" style="width:100%;height:auto;display:block" role="img" aria-label="Match timeline: load vs capacity"></svg>
        <div class="stats">
          <div class="stat"><span>Minutes with errors</span><strong class="ht-om"></strong></div>
          <div class="stat"><span>Sabse bura pal: fail %</span><strong class="ht-w"></strong></div>
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
      const marks = [[30, 'toss'], [96, 'star + notif'], [150, 'break'], [170, 'wapsi'], [259, 'jeet']];
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
        grid += `<text x="375" y="252" text-anchor="middle" style="fill:var(--ink-3);font:11px var(--f-body)">minutes (0 = toss se pehle) · neela = load · hara = capacity</text>`;
        q('.ht-svg').innerHTML = grid + red + `<path d="${path(C)}" style="fill:none;stroke:var(--green);stroke-width:2.5"/><path d="${path(L)}" style="fill:none;stroke:var(--accent);stroke-width:2"/>`;
        q('.ht-om').textContent = s.over;
        q('.ht-w').textContent = Math.round(s.worst * 100) + '%' + (s.wt >= 0 ? ' (min ' + s.wt + ')' : '');
        q('.ht-fr').textContent = (s.drop * 0.6).toFixed(1) + ' crore';
        q('.ht-c').textContent = Math.round(100 * s.cost / base.cost);
        q('.ht-note').textContent = mode === 'auto'
          ? `Autoscaling har spike ke ${lag} minute baad jaagta hai, aur ek minute mein zyada se zyada ${STEP} lakh rps capacity jod paata hai. Tsunami seconds mein aata hai, to har bade pal pe laal. Sabse sasta bill, lekin sabse bure pal pe ${Math.round(s.worst * 100)}% requests fail.`
          : mode === 'pre'
            ? (s.over === 0 ? `Match se pehle ${F} lakh rps tak scale: koi error nahi. Keemat: capacity poore match khaali khadi rehti hai, bill autoscaling ka ~${(s.cost / base.cost).toFixed(1)} guna. Capacity ko 32 tak ghata ke dekho: forecast galat hua to kya hota hai?`
              : `Forecast (${F}) asli peak (~${Math.round(Math.max(...L))}) se kam nikla. Pre-scaling akela galat forecast ko theek nahi kar sakta: ${s.over} minute errors.`)
            : `Pre-scaled capacity neeche ka farsh hai, autoscaling upar ka safety net. Forecast thoda kam bhi ho to bas kuch minute dikkat (${s.over} min). Hotstar ki journey bhi yahi rahi: 2018 mein haath se ladders, 2019 mein apna autoscaler jo pehle "shadow" mein chala, phir khud.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', upd));
      el.querySelectorAll('.ht-mode .chip').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; el.querySelectorAll('.ht-mode .chip').forEach(x => x.classList.toggle('on', x === b)); upd(); }));
      upd();
    }},

    { type: 'p', html: `Default settings (lag 5 min, capacity 40, notification on) pe: <strong>sirf autoscaling</strong> = ~23 minute errors aur star batsman wale pal pe ~50% requests fail, lekin bill sabse kam. <strong>Sirf pre-scaling (40)</strong> = zero errors, bill ~2 guna. Capacity 32 karo to jeet ke pal pe errors; 25 karo to ~28 minute. <strong>Dono saath</strong> 25 pe bhi sirf ~4 minute. Lag ko 2 minute karke bhi dekho: autoscaling behtar hota hai, lekin tsunami ko phir bhi nahi pakad paata.` },
    { type: 'h3', text: 'Pre-scaling asal mein kaisa dikhta hai (Hotstar ki journey)' },
    { type: 'p', html: `Table mein do words aayenge: <strong>Kubernetes</strong> ek system hai jo bahut saari machines (nodes) pe hamare programs (pods) ko chalaata aur sambhalta hai. <strong>EKS</strong> AWS ka managed Kubernetes hai. <strong>Headroom</strong> = andaaze se upar rakhi extra capacity, galti ki gunjaaish ke liye.` },
    { type: 'table', head: ['Saal', 'Kya kiya', 'Source'], rows: [
      ['2017', 'Match se pehle: cloud load balancers ko "warm up" karwaya, zaroori instance types ki availability pakki ki, DR failover test kiya, har "panic" switch test kiya, thresholds aur ready-made scripts banaye. Match ke time poori on-call team ek chat room mein, har action wahin likha.', 'Hotstar blog, 2017'],
      ['2018', 'Har pillar (subscription, metadata, streaming) ka alag pessimistic traffic model, aur concurrency ke hisaab se "ladders": itne viewers pe itne servers. Headroom threshold cross hua to pehle se agla step.', 'Hotstar blog, 2018'],
      ['2019', 'Kubernetes pe shift, aur apna autoscaling engine jo kai variables dekhta tha. Pehle shadow mein chalaya (sirf suggest kare, kare nahi), data se bharosa aaya to khud chalne diya. Blog ke mutabik 2x concurrency, 10x kam compute.', 'Hotstar blog, 2019'],
      ['2023', 'Amazon EKS pe migration. 400+ nodes ek saath badhane pe Kubernetes API server errors aaye, to pre-scale ko 100-300 nodes ke steps mein automate kiya.', 'Hotstar blog, 2024'],
    ]},
    { type: 'p', html: `2023 ki taiyaari mein jo "chhupe" limits mile, wo interview mein bahut kaam aate hain, kyunki ye dikhate hain ki scale sirf "aur machines" nahi hai (Hotstar blog, 2024):` },
    { type: 'list', items: [
      `<strong>NAT gateway</strong> (wo darwaaza jisse andar ke private servers bahar internet tak jaate hain): ek cluster peak ke 1/10 load pe hi apne NAT gateway ki ~50% network capacity kha raha tha. Fix: har availability zone ki jagah har subnet ka apna NAT gateway (scale out).`,
      `<strong>IP addresses khatam</strong> (har machine/pod ko network pe ek pata, IP, chahiye; ek subnet, yaani network ke ek hisse, mein gine-chune pate hote hain): networking plugin har node ke liye pehle se 35 IPs reserve karta tha, to cluster ~350 nodes pe atak gaya jabki 400+ chahiye the. Fix: bade subnets aur reservation ghatana.`,
      `<strong>Node ka network</strong>: internal API gateway ke pods ek node pe jama hue to 8-9 Gbps. Fix: 10 Gbps+ wale nodes aur har node pe ek hi gateway pod.`,
      `<strong>CDN edge ka compute</strong>: edges API gateway (saari API requests ka pehla darwaaza) ka kaam bhi kar rahe the (security checks, rate control). Cacheable APIs ko alag, halke rules wale domain pe daala.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "front servers 10x kar diye, ho gaya"', html: `2017 ka sabak yahi tha: front fleet scale thi, DB nahi. Har layer ki limit alag hai: CDN edge compute, load balancer warm-up, NAT gateway, IP addresses, Kubernetes API server, database connections, payment partner ki rate. Pre-scaling ka matlab hai <strong>poori chain</strong> ko peak ke liye taiyaar karna, aur ye sirf load testing se pata chalta hai.` },

    { type: 'h2', text: 'Deep dive 4: load testing, asli match se pehle nakli match' },
    { type: 'p', html: `"Hum 5 crore jhel lenge" ye kaise pata? Asli traffic aane se pehle utna hi nakli traffic khud maar ke.` },
    { type: 'callout', tone: 'term', title: 'Naya word: load testing', html: `<strong>Ye kya hai:</strong> hazaron machines se nakli users bana ke apne hi system pe asli jaisa traffic bhejna, jaise "5 crore log, aur minute 96 pe Kohli wala tsunami".<br><strong>Kyun chahiye:</strong> har layer (CDN, gateway, DB, NAT, IPs) ki toot-ne wali hadd (breaking point) match se <em>pehle</em> pata chale.<br><strong>Iske bina:</strong> pehli baar limit asli final mein pata chalegi, 5 crore logon ke saamne.<br><strong>Keemat:</strong> load test khud ek bada system hai (neeche Project HULK dekho) aur mehenga hai.` },
    { type: 'p', html: `Hotstar ne iske liye kai cheezein public ki hain:` },
    { type: 'list', items: [
      `<strong>2018 (blog)</strong>: ~2 mahine sirf traffic models banane aur sahi tool dhoondhne mein. Load ke liye Flood.io (ek load-testing service, jo open-source tool Gatling pe chalti thi). Phir "game days": IPL match ka poora nakli version, nakli tsunamis ke saath. Isse SSL handshake errors (secure connection banane ki shuruaati baat-cheet mein galti), keep-alive (ek connection ko kai requests ke liye khula rakhna) aur alag zones/regions ke beech ke mismatch jaisi cheezein pakdi gayin. Saath mein chaos testing: jaan-boojh ke cheezein band karke dekhna system kaise sambhalta hai.`,
      `<strong>2019 (re:Invent talk ke summary)</strong>: "Project HULK" load generation setup: ~1,08,000 CPUs, 216 TB memory, 200 Gbps network out, 8 regions se. Tests mein push notification, tsunami traffic, der se scale-up, bandwidth limit, badhi latency aur CDN failure tak simulate kiye jaate the. Maqsad: har system ka breaking point dhoondhna.`,
      `<strong>2019 (blog)</strong>: ek bahut sakht simulation mein test system gira, aur pata chala ek system 70% se zyada compute ek aise feature pe kha raha tha jo use hi nahi ho raha tha. Machines badhane ki jagah use tune kiya: headroom free mein mil gaya.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naye words: game day, chaos testing', html: `<strong>Game day</strong>: asli event ki poori rehearsal, wahi team, wahi dashboards, nakli traffic ke saath. Team ko pehle se pata hota hai kis threshold pe kya karna hai. <strong>Chaos testing</strong>: production jaise system mein jaan-boojh ke failure daalna (ek zone band, ek cache down) taaki asli failure se pehle kamzori dikh jaaye.` },

    { type: 'h2', text: 'Deep dive 5: graceful degradation aur panic mode' },
    { type: 'p', html: `Pre-scaling aur load testing ke baad bhi forecast galat ho sakta hai. Tab kya? Hotstar ke 2019 ke blog ka jawab, ek line mein: <strong>"The video must play on."</strong> Recommendations, emojis, "aur dekho" jaise surround features tabhi kaam ke hain jab video chal raha ho. Isko <strong>graceful degradation</strong> kehte hain: poora system girne ki jagah, kam zaroori cheezein band karke zaroori cheez chalu rakhna. Unhone ek <strong>sequence</strong> pehle se tay kiya: concurrency jaise jaise badhe, kaunsi service kis point pe band (jettison: jaise hawai jahaaz halka karne ke liye saamaan phenkna) hogi, taaki naye log aate rahein aur video chalta rahe.` },
    { type: 'callout', tone: 'term', title: 'Naye words: panic mode, positive aur negative panic', html: `<strong>Ye kya hai:</strong> pehle se banaye switches (<strong>feature flags</strong>: config mein on/off button, jisse bina naya code daale koi feature band ho jaaye) jo overload mein system ko halka kar dete hain.<br><strong>Kyun chahiye:</strong> match ke beech code likhne ka time nahi hota; switch dabana seconds ka kaam hai.<br><strong>Iske bina:</strong> overload mein sab kuch thoda thoda slow, aur aakhir mein video bhi band.<br><strong>Tier:</strong> features ki zaroorat ke hisaab se list. Tier 1 = bina iske app bekaar (login, play, subscription). Tier 2 = achha hai, zaroori nahi (recommendations, emojis).<br> Hotstar ke 2017 ke blog mein do tarah: <strong>positive panic</strong> = Tier 1 kaam (login, subscription, watch) user ko "ho gaya" dikhte rahein, lekin backend mein unka kuch hissa baad mein (deferred) ho; <strong>negative panic</strong> = Tier 2 kaam (account page, logout) thodi der ke liye seedha "abhi nahi" message dikha dein. 2019 ke re:Invent talk ke summary mein bhi: recommendations aur personalisation band, taaki streaming aur payment/subscription chalte rahein.` },
    { type: 'flow', title: 'Panic mode on', height: 320,
      nodes: [
        { id: 'app', label: 'Viewer app', sub: 'smart client', x: 80, y: 160, w: 130, kind: 'client', info: 'Ye kya hai: user ke phone/TV ki app. Hotstar ke 2018 ke blog ke mutabik client apps khud resilient (jhatke sehne wali) hain: server ka panic signal aaye to exponential ya custom back-off, local cache se kaam chalana, aur jo feature band hai uski jagah halka fallback dikhana.' },
        { id: 'gw', label: 'API gateway', sub: 'CDN + internal', x: 270, y: 160, w: 150, kind: 'net', meter: true, load: 30, info: 'Ye kya hai: saari API requests ka pehla darwaaza. Hotstar ke 2024 ke blog ke mutabik CDNs unka external API gateway hain (security checks, routing), aur unke peeche ek internal API gateway. Panic rules yahin sabse sasta lagte hain: band feature ki request andar jaati hi nahi.' },
        { id: 'panic', label: 'Panic config', sub: 'feature flags', x: 270, y: 50, w: 150, kind: 'data', info: 'Ye kya hai: feature flags ki config, yaani pehle se bane aur test kiye on/off switches. 2017 ke blog ke mutabik match se pehle har panic switch test kiya gaya tha ki wo wahi kare jo kehta hai. Match ke beech mein code nahi likha jaata, sirf switch dabaya jaata hai.' },
        { id: 'play', label: 'Play + login', sub: 'Tier 1', x: 520, y: 60, w: 170, kind: 'server', meter: true, load: 70, info: 'Ye kya hai: core services: login, entitlement (kya ye user dekh sakta hai), playback URL, subscription. Ye kabhi band nahi hote. Panic mein inke kuch backend kaam (jaise analytics likhna) baad ke liye queue mein.' },
        { id: 'reco', label: 'Recommendations', sub: 'Tier 2', x: 520, y: 160, w: 170, kind: 'server', meter: true, load: 60, info: 'Ye kya hai: "tumhare liye" wali rows (rails), jo ML models aur user history se banti hain. Mehenga aur zaroori nahi. Panic mein band, aur app sabke liye ek cached default rail dikhati hai.' },
        { id: 'social', label: 'Emojis / feed', sub: 'Tier 2', x: 520, y: 260, w: 170, kind: 'server', meter: true, load: 50, info: 'Ye kya hai: live emojis, polls jaise social features. Maze ke liye hain, zaroori nahi. Panic mein update dheemi ya band.' },
      ],
      edges: [{ a: 'app', b: 'gw' }, { a: 'gw', b: 'panic' }, { a: 'gw', b: 'play' }, { a: 'gw', b: 'reco' }, { a: 'gw', b: 'social' }],
      scenarios: [
        { name: 'Normal din', steps: [
          { title: 'Play', text: 'Login aur play ki request Tier 1 tak.', go: ['app>gw>play', 'res:play>gw>app'] },
          { title: 'Baaki features', text: 'Recommendations aur emojis bhi chal rahe hain.', parallel: true, go: ['app>gw>reco', 'app>gw>social'] },
        ]},
        { name: 'Panic: Tier 2 jettison', intro: 'Concurrency forecast se upar, Tier 1 services ka CPU 90%.', steps: [
          { title: 'Load badha', text: 'Sab services garam.', flood: { paths: ['app>gw>play', 'app>gw>reco'], n: 10 }, after: { play: { state: 'hot', load: 92 }, reco: { state: 'hot', load: 90 } } },
          { title: 'Switch dabaya', text: 'On-call team ne threshold cross hote hi pehle se tay script chalayi: panic level 2. Gateway ne config padha.', go: ['gw>panic', 'res:panic>gw'], after: { panic: { state: 'warn', sub: 'PANIC L2' } } },
          { title: 'Tier 2 band, sasta fallback', text: 'Recommendation ki request ab andar jaati hi nahi. Gateway turant ek cached default rail de deta hai. Emojis bhi band.', go: ['app>gw', 'res:gw>app'], set: { reco: { state: 'dim', sub: 'OFF', load: 5 }, social: { state: 'dim', sub: 'OFF', load: 5 } }, msg: '200 { rail: "default-live" }  (cached, sabke liye same)' },
          { title: 'Video chalta raha', text: 'Bacha hua capacity Tier 1 ko mila. Naye log aate rahe, login aur play chalte rahe.', go: ['app>gw>play', 'res:play>gw>app'], after: { play: { state: 'ok', load: 70 } } },
        ]},
        { name: 'Client back-off', steps: [
          { title: 'Server ne kaha: ruko', text: 'Gateway overload mein ek sasta "baad mein aana" jawab deta hai, retry ke time ke saath.', go: ['app>gw', 'bad:gw>app'], set: { gw: { state: 'hot', load: 95 } }, msg: '503 Service Unavailable\nRetry-After: 20' },
          { title: 'Smart client', text: 'App turant retry nahi karti. Wo 20 second + random jitter wait karti hai, aur us beech purana cached data dikhati hai. Crores clients alag alag pal pe wapas aate hain, ek deewar ki tarah nahi. Bewakoof client hota to har second retry karta aur load double ho jaata.', focus: ['app'], after: { gw: { state: '', load: 45 } } },
        ]},
      ],
    },
    { type: 'p', html: `Ek jettison ladder kuch aisi dikh sakti hai (xyz.com ka example, numbers maan lo):` },
    { type: 'table', head: ['Level', 'Kab', 'Kya band / halka', 'User ko kya dikhega'], rows: [
      ['L0', 'Normal', 'Kuch nahi', 'Poora app'],
      ['L1', 'Forecast ka 80%', 'Scorecard / key moments refresh dheema, prefetch band', 'Score 1-2 s aur late'],
      ['L2', 'Forecast ka 95%', 'Recommendations, emojis, watch-history likhna (queue mein)', 'Default rail, emojis gayab'],
      ['L3', 'Forecast se upar', 'Max bitrate cap, naye logins ke liye funnel mein jitter', 'Thodi kam quality, login mein kuch second'],
      ['Kabhi nahi', '-', 'Video playback, chal rahi stream', 'Match chalta rahe'],
    ], caption: 'Hotstar ke blogs mein ye sab levers hain: bitrate degrade karna (2017), refresh rates ghatana (2024), subscription funnel mein jitter "telescope" (2018), aur service jettison sequence (2019). Exact thresholds unke apne hain, ye table sirf idea dikhaati hai.' },

    { type: 'h2', text: 'Failure scenarios aur bottlenecks, ek jagah' },
    { type: 'table', head: ['Kya hua', 'Kya tootega', 'Bachaav (Hotstar ne kya kiya / industry approach)'], rows: [
      ['Notification ke baad tsunami', 'Login/home APIs aur unke peeche DB', 'Pre-scale poori chain; notifications batches mein; client jitter (2017, 2018)'],
      ['Forecast se zyada log', 'Tier 1 services ka CPU', 'Panic levels, Tier 2 jettison, bitrate cap (2017, 2019)'],
      ['Ek CDN provider slow', 'Ek region ke viewers ka video', 'Multi-CDN, player ke paas fallback URLs, har CDN pe headroom'],
      ['Bahut cache objects ek saath expire', 'Origin (TTL cloudburst)', 'TTL ki poori chain ki visibility, jitter, request collapsing (2019)'],
      ['Retry storm', 'Sab kuch, kyunki load double', 'Exponential back-off + jitter, panic signal pe client ruke (2018)'],
      ['Cluster scale-up atka', 'Pods schedule nahi (IPs, API server limits)', 'Steps mein pre-scale, bade subnets, limits pehle load test mein dhoondho (2024)'],
      ['Payment partner ki limit', 'Subscription funnel', '"Telescope": funnel mein jitter taaki success rate bani rahe (2018)'],
    ]},

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Scale aur shape', d: 'Crores concurrent, aur spiky: key moments pe minutes mein kai guna. Isliye "average load" pe design mat karo, peak aur slope pe karo.' },
      { t: 'Do raaste alag', d: 'Video: encoder → packager → shield → multi-CDN → ABR player. Data: jo sabke liye same hai (score, viewer count) wo CDN-cached JSON + polling; jo personal hai (login, heartbeat) wahi origin tak.' },
      { t: 'Origin ko bachao', d: 'Origin load viewers se independent ho: edges ÷ TTL. Request collapsing, smart clients (jitter, back-off).' },
      { t: 'Capacity', d: 'Autoscaling tsunami ke liye bahut slow; concurrency forecast se pre-scale, autoscaling sirf safety net. Poori chain: LB, DB, NAT, IPs.' },
      { t: 'Prove + protect', d: 'Load tests aur game days se breaking points; panic levels se graceful degradation. "Video must play."' },
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `• Event ka time pata hai (match, sale, launch) → <strong>pre-scale</strong> forecast + headroom tak, autoscaling sirf upar ka net.<br>• Data sabke liye same hai aur 1-2 s purana chal sakta hai → <strong>CDN pe JSON, chhota TTL, polling</strong>. Per-user ya turant chahiye → push (WebSocket/MQTT).<br>• Ek cheez core hai (video) → baaki sab features ke liye <strong>panic switches</strong>, pehle se test kiye hue.<br>• Spike seconds mein aata hai → clients mein <strong>jitter + back-off</strong>, warna retries hi system gira denge.` },

    { type: 'diagram', title: 'Poora design, ek nazar mein', height: 630,
      caption: 'Video, score aur viewer count: jo sabke liye same hai wo CDN se. Sirf login, play aur heartbeat hamare servers (origin) tak. Upar ke buttons se ek-ek raasta dekho.',
      groups: [
        { label: 'Video pipeline (stadium se origin tak)', x: 10, y: 32, w: 700, h: 96 },
        { label: 'Edge: CDN', x: 188, y: 152, w: 344, h: 90 },
        { label: 'Live data', x: 548, y: 152, w: 164, h: 334 },
        { label: 'Core services (origin)', x: 10, y: 396, w: 524, h: 218 },
      ],
      nodes: [
        { id: 'feed', label: 'Stadium feed', sub: 'playout + SCTE-35', x: 90, y: 90, kind: 'client', info: 'Ye kya hai: stadium ke cameras se bani final TV feed. Playout system isi mein ad break ka signal (SCTE-35) daalta hai. Poore video ka shuruaati point.' },
        { id: 'enc', label: 'Live encoder', sub: 'ABR ladder', x: 270, y: 90, kind: 'server', info: 'Ye kya hai: raw video (~1.2 Gbps) ko ~250 guna chhota karne wali machine, ek saath 5 qualities (240p se 1080p) mein. Iske bina video phone tak pahunch hi nahi sakta.' },
        { id: 'pkg', label: 'Packager', sub: 'tukde + manifest', x: 450, y: 90, kind: 'server', info: 'Ye kya hai: video ko 4 second ke tukdon (segments) mein kaatne aur manifest (tukdon ki list) likhne wali machine. Video ka origin. Ad break pe ad ke tukde manifest mein jodti hai (SSAI).' },
        { id: 'ads', label: 'Ad server', sub: 'kaunsa ad kise', x: 630, y: 90, kind: 'net', info: 'Ye kya hai: wo system jo batata hai ki kis group (cohort) ko kaunsa ad dikhe. Packager ki stitching service ad break pe isse ads maangti hai.' },
        { id: 'cdn', label: 'CDN A + CDN B', sub: 'edge PoPs', x: 270, y: 210, kind: 'edge', info: 'Ye kya hai: kai CDN companies ke hazaron edge servers, shehron ke paas. Tukde, score.json aur count.json ki copies yahin se crores phones tak. Ek CDN gire to player doosre se leta hai (multi-CDN).' },
        { id: 'shield', label: 'Origin shield', sub: 'request collapsing', x: 450, y: 210, kind: 'cache', info: 'Ye kya hai: edges aur origin ke beech ka cache. Naye tukde ke liye hazaron edges ki requests ko origin pe ek request bana deta hai.' },
        { id: 'scorer', label: 'Scorer app', sub: 'har ball', x: 630, y: 210, kind: 'client', info: 'Ye kya hai: stadium/studio mein scorer ki app jo har ball ka result daalti hai. Writes bahut kam: har ~30-40 second ek.' },
        { id: 'app', label: 'Viewer apps', sub: 'ABR player', x: 90, y: 330, kind: 'client', info: 'Ye kya hai: crores phones/TVs. Player har 4 s ek tukda laata hai aur network dekh ke quality chunta hai, har ~2 s score.json poll karta hai, har ~30 s heartbeat bhejta hai. Smart client: jitter + back-off.' },
        { id: 'json', label: 'Live JSON files', sub: 'score + count', x: 450, y: 330, kind: 'data', info: 'Ye kya hai: score.json aur concurrency.json, chhoti files jo CDN 1-2 s TTL ke saath cache karta hai. Origin pe load viewers se nahi, sirf edges ÷ TTL se tay hota hai.' },
        { id: 'score', label: 'Score service', sub: '+ ball-by-ball DB', x: 630, y: 330, kind: 'server', info: 'Ye kya hai: ball ka event check karke DB mein likhti hai aur nayi score.json publish karti hai. Iska load scorers pe nirbhar hai, viewers pe nahi.' },
        { id: 'panic', label: 'Panic config', sub: 'feature flags', x: 90, y: 450, kind: 'data', info: 'Ye kya hai: pehle se test kiye on/off switches. Overload mein on-call team level badhati hai aur gateway Tier 2 features band kar deta hai. "Video must play."' },
        { id: 'gw', label: 'API gateway', sub: 'CDN + internal', x: 270, y: 450, kind: 'net', info: 'Ye kya hai: saari personal API requests (login, play, heartbeat) ka darwaaza. Panic config padhta hai: band feature ki request andar jaati hi nahi, cached default jawab milta hai.' },
        { id: 'kafka', label: 'Heartbeats', sub: 'Kafka partitions', x: 450, y: 450, kind: 'queue', info: 'Ye kya hai: ~20 lakh heartbeats/s ka stream, sessionId ke hisaab se partitions mein baanta hua, taaki ginti kai machines pe bant jaaye.' },
        { id: 'cnt', label: 'Viewer counter', sub: 'sharded ginti', x: 630, y: 450, kind: 'server', info: 'Ye kya hai: har partition mein "pichhle 60 s mein dikhe" sessions ginta hai, sab jod ke concurrency.json likhta hai. Yahi number pre-scaling aur dashboards ke liye bhi.' },
        { id: 'tier1', label: 'Login + Play', sub: 'Tier 1 + DBs', x: 270, y: 570, kind: 'server', info: 'Ye kya hai: login, subscription, entitlement, playback URL aur unke databases. Kabhi band nahi hote. 2017 ka sabak: poori chain (DB tak) pre-scale karo.' },
        { id: 'tier2', label: 'Reco, emojis', sub: 'Tier 2', x: 450, y: 570, kind: 'server', info: 'Ye kya hai: recommendations, emojis, polls. Achhe hain, zaroori nahi. Panic mein sabse pehle band (jettison), taaki capacity Tier 1 ko mile.' },
      ],
      edges: [
        { a: 'feed', b: 'enc', n: 1 }, { a: 'enc', b: 'pkg', n: 2 }, { a: 'pkg', b: 'ads', both: true, dashed: true },
        { a: 'pkg', b: 'shield', n: 3, label: 'naya tukda' }, { a: 'shield', b: 'cdn', n: 4 }, { a: 'cdn', b: 'app', n: 5, label: 'tukde + JSON' },
        { a: 'scorer', b: 'score', label: 'har ball' }, { a: 'score', b: 'json' }, { a: 'json', b: 'cdn', label: 'TTL 1-2 s' },
        { a: 'app', b: 'gw', label: 'login, heartbeat' }, { a: 'panic', b: 'gw', dashed: true }, { a: 'gw', b: 'tier1' },
        { a: 'gw', b: 'tier2', label: 'panic: band', kind: 'bad', dashed: true }, { a: 'gw', b: 'kafka', kind: 'evt' }, { a: 'kafka', b: 'cnt', kind: 'evt' },
        { a: 'cnt', b: 'json', label: 'count.json' },
      ],
      paths: [
        { name: 'Video', text: 'Camera → encoder (5 qualities) → packager (4 s tukde + manifest) → shield (ek hi fetch) → CDN edge → player, jo har tukde pe quality chunta hai.', go: ['feed>enc>pkg>shield>cdn>app'] },
        { name: 'Ad break', text: 'SCTE-35 signal → packager ki stitching service ad server se ads leti hai → cohort ki manifest mein ad ke tukde → player ke liye bas aur tukde.', go: ['feed>enc>pkg>ads', 'pkg>shield>cdn>app'] },
        { name: 'Live score', text: 'Scorer → score service → score.json → CDN (TTL 1-2 s) → crores apps poll karti hain. Origin pe sirf edges ÷ TTL requests.', go: ['scorer>score>json>cdn>app'] },
        { name: 'Login + viewer count', text: 'Login/play gateway se Tier 1 tak. Heartbeats Kafka partitions → counter → count.json → CDN, wapas har app tak.', go: ['app>gw>tier1', 'app>gw>kafka>cnt>json>cdn>app'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Raw video bahut bada hai: encoder use ~250 guna chhota karta hai, ek saath 5 qualities (ABR ladder) mein.</li>
      <li>Packager video ko 4 s ke tukdon (segments) mein kaatta hai aur manifest (list) likhta hai. Tukde = turant play, har tukde pe quality switch, aur CDN caching.</li>
      <li>Phone ka player network aur buffer dekh ke har agla tukda chunta hai (ABR). Faisla phone pe, server pe zero bojh.</li>
      <li>Jo sabke liye same hai (tukde, score, viewer count) wo CDN se; origin shield request collapsing karta hai; multi-CDN capacity aur bachaav deta hai.</li>
      <li>Live score = CDN pe chhoti JSON, TTL 1-2 s, polling. Origin load viewers se independent.</li>
      <li>Tsunami seconds mein aata hai, autoscaling minutes mein: pre-scale poori chain (DB, NAT, IPs tak), load test se prove karo.</li>
      <li>Panic mode: Tier 2 band karo, smart clients (jitter, back-off). "Video must play."</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['CDN polling: origin load viewers ki ginti se independent', 'Pre-scaling: tsunami ke pehle second se capacity taiyaar', 'Multi-CDN: zyada bandwidth aur ek provider ke girne pe bachaav', 'Panic mode: overload mein bhi core feature (video) chalta hai', 'Load tests / game days: breaking points asli match se pehle pata'],
      costs: ['Live video broadcast se kuch second peeche (segments + buffer)', 'Score aur viewer count 1-3 s purane', 'Pre-scaled capacity ka bill: ghanton tak khaali machines', 'Panic mein kuch users ko kam features / kam quality', 'Multi-CDN, SSAI, panic levels: bahut zyada operational complexity'],
    },
    { type: 'think', questions: [
      { q: 'Match ke beech baarish shuru hui, 40 minute ruka. Phir khel shuru hone ka announcement aur notification. Kya hoga, aur tum kya karoge?', a: 'Baarish mein log app band karte hain, concurrency girti hai. Agar autoscaler ne is beech capacity ghata di, to restart ke notification pe tsunami purani se bhi tez aayegi (sab ek saath wapas). Isliye: baarish ke time scale-in rok do (capacity floor), notification batches mein bhejo, aur restart se pehle wapas peak capacity pe le aao. 2019 ke talk ke summary ke mutabik India vs NZ match mein baarish se pehle 1.39 crore ka peak tha; match agle din poora hua aur tab 2.53 crore ka record bana.' },
      { q: 'Viewer count ko har second exact dikhana hai, product team ki zid hai. Kya keemat hai?', a: 'Exact count ke liye har heartbeat ko ek jagah gin ke turant publish karna hoga: ek central counter crores updates/second, aur JSON ka TTL ~0, matlab CDN ka fayda khatam aur har poll origin pe. Behtar: kuch second ki window, sharded counts, aur "6.1 crore" jaisa rounded number. Users ko farak nahi padta, origin ko bahut padta hai.' },
      { q: 'SSAI mein har cohort ki alag manifest hai. Cohorts 10 se 1,000 kar diye. CDN pe kya asar?', a: 'Har stream × quality × cohort ek alag manifest object. 100 guna zyada objects, har ek ke kam viewers, to cache hit ratio girega aur shield/origin pe manifest generation ka compute badhega. JioHotstar ke 2025 ke blog mein isi wajah se SGAI ki taraf jaane ki baat hai: sabke liye ek manifest, ad ka faisla client ki alag ad request pe.' },
    ]},

    { type: 'quiz', questions: [
      { q: 'Live video ko 4 second ke chhote tukdon (segments) mein kyun kaatte hain?', options: ['Taaki video ki quality badh jaaye', 'Taaki phone turant chala sake, har tukde pe quality badal sake, aur CDN chhoti same files cache kar sake', 'Kyunki encoder 4 second se lamba video bana hi nahi sakta'], answer: 1, explain: 'Tukde quality nahi badhaate. Wo teen kaam karte hain: jaldi start, har tukde pe ABR switch, aur kabhi na badalne wali chhoti files jo CDN aaram se cache karta hai.' },
      { q: 'Packager ka kaam kya hai?', options: ['Video ko compress karna', 'Video ko tukdon mein kaat ke files banana aur manifest (tukdon ki list) har 4 s update karna', 'Phone pe quality chunna'], answer: 1, explain: 'Compress encoder karta hai, quality phone ka player chunta hai. Packager tukde aur unki list (manifest) banata hai, isliye wo video ka origin hai.' },
      { q: 'Metro tunnel mein speed 0.5 Mbps ho gayi. ABR player kya karega?', options: ['1080p hi maangta rahega', 'Agla tukda 240p jaisi kam quality ka maangega taaki buffer khaali na ho', 'Video band kar dega'], answer: 1, explain: '240p (0.4 Mbps) ka 4 s ka tukda 0.2 MB hai, 0.5 Mbps pe ~3 s mein aa jaata hai, yaani video se tez. 1080p ka tukda 40 s leta, aur video atakta.' },
      { q: 'Live score 5 crore viewers tak pahunchane ka sabse sasta tareeka?', options: ['Har viewer ka WebSocket score service se', 'Score ko chhoti JSON bana ke CDN pe 1-2 s TTL ke saath, apps poll karein', 'Har viewer ke liye DB query, Redis cache ke saath'], answer: 1, explain: 'Sabko same data chahiye aur 1-2 s purana chalta hai. CDN se origin pe sirf edges ÷ TTL requests aati hain, viewers chahe kitne bhi hon.' },
      { q: 'Hotstar ne 2018 mein "no auto-scaling" kyun kaha?', options: ['Cloud pe autoscaling hota hi nahi', 'Tsunami seconds mein aata hai, jabki nayi machine aane mein minutes; aur spike pe instances hi na milein', 'Autoscaling mehenga hai'], answer: 1, explain: 'Metric dekhna, faisla, boot, warm-up: sab mila ke minutes. Tab tak lehar nikal chuki. Isliye concurrency forecast se pehle se scale, aur autoscaling sirf ek layer.' },
      { q: '2017 ke Kohli wale spike mein asal mein kya toota?', options: ['CDN', 'Database, kyunki front servers scale the lekin DB us hisaab se nahi, aur login cache nahi ho sakta', 'Video encoder'], answer: 1, explain: 'Front fleet 70 lakh ke liye taiyaar thi, DB nahi. Login per-user hai, cache bypass karta hai. Sabak: poori chain scale karo.' },
      { q: 'Panic mode mein sabse pehle kya band karna chahiye?', options: ['Video playback', 'Login', 'Recommendations aur social features jaise Tier 2'], answer: 2, explain: '"Video must play." Surround features band karke unka capacity core (login, play, subscription) ko do.' },
      { q: 'Live stream TV se ~20-30 s peeche kyun ho sakta hai?', options: ['CDN slow hai', 'Encode + segment poora hona + player ka ~3 segment ka safety buffer', 'Phone ka processor slow hai'], answer: 1, explain: 'Segment-based streaming ka nature. Chhote segments latency ghataate hain lekin requests badhaate hain.' },
    ]},
    { type: 'sources', note: 'Hotstar-specific baatein inhi sources se. Purane posts (2017-2019) us waqt ke setup ke baare mein hain; 2024-25 ke posts naye setup ke.', items: [
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
