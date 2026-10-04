Lesson.register({
  id: 'tcp-udp-https',
  title: 'TCP, UDP aur HTTPS',
  minutes: 24,
  summary: `Internet pe data chhote tukdon (packets) mein jaata hai, aur raaste mein tukde kho bhi jaate hain. TCP pakka karta hai ki saare tukde pahunchein, sahi order mein. UDP speed ke liye ye guarantee chhod deta hai. HTTPS (TLS) pakka karta hai ki raaste mein koi tumhara data padh ya badal na sake.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho tum ek dost ko ek lambi kahani bhej rahe ho, lekin ek baar mein sirf ek chhota postcard bhej sakte ho. Kuch postcards raaste mein kho jaayenge, kuch ulte order mein pahunchenge.<br>Is lesson mein teen sawaal hain: (1) <strong>Kaise pakka karein ki saare postcards pahunchein, sahi order mein?</strong> Jawab: TCP. (2) <strong>Kab kuch postcards kho jaana chalega, bas jaldi pahuncho?</strong> Jawab: UDP. (3) <strong>Raaste mein koi postcard padh le to?</strong> Jawab: HTTPS.<br>Har ek ko tum khud chala ke dekhoge: handshake, khoya packet, checksum, speed control, aur taala (encryption).` },

    { type: 'h2', text: 'Pehle: packet kya hai?' },
    { type: 'callout', tone: 'term', title: 'Yaad karo: packet', html: `<strong>Ye kya hai:</strong> data ka chhota tukda, aam taur pe lagbhag 1,500 bytes tak. Har packet ke upar ek label (header) hota hai: kahan se aaya, kahan jaana hai, aur kuch extra hisaab.<br><strong>Kyun chahiye:</strong> ek bada data (2 MB ka page) ek saath nahi bhej sakte. Network chhote tukde aaram se sambhalta hai, aur ek tukda kho jaaye to sirf wahi dobara bhejna padta hai.<br><strong>Iske bina:</strong> ek galti aur poora 2 MB dobara bhejna padta, aur ek bada transfer poore network ko rok deta.` },
    { type: 'p', html: `Jab xyz.com ka 2 MB page aata hai, wo lagbhag 1,400 packets mein toot ke aata hai. Har packet alag raaste se ja sakta hai. Koi der se aata hai. Koi ulte order mein. Aur koi kho bhi jaata hai (WiFi kamzor, router bahut busy).` },
    { type: 'p', html: `To sawaal ye hai: <strong>agar packet 47 kho gaya to kya karein?</strong> Is sawaal ke do jawab hain: <strong>TCP</strong> aur <strong>UDP</strong>. Dono ke niyam pehle se tay hain. Aise tay niyamon ko protocol kehte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: protocol', html: `<strong>Ye kya hai:</strong> do computers ke beech baat karne ke pehle se tay niyam. Kaun pehle bolega, message kaisa dikhega, galti hone pe kya karna hai.<br><strong>Kyun chahiye:</strong> duniya bhar ke alag alag computers (Android, iPhone, Linux server) ek doosre ki baat samajh sakein.<br><strong>Iske bina:</strong> har company apni bhasha bolti, aur koi kisi se baat na kar pata.<br><strong>Example:</strong> IP, TCP, UDP, TLS, HTTP: ye sab protocols hain.` },

    { type: 'h2', text: 'Layers: kaun kya kaam karta hai' },
    { type: 'p', html: `Internet ka kaam ek saath kai protocols milke karte hain. Har ek ka chhota sa kaam hai, aur wo ek doosre ke upar "layer" ki tarah baithe hain. Upar wali layer neeche wali ki madad leti hai, uske andar ki details jaane bina. Table mein kuch naye shabd hain (port, sequence number, checksum, encryption): ghabrao mat, ye sab isi lesson mein ek ek karke samjhenge.` },
    { type: 'callout', tone: 'term', title: 'Naya word: OSI model (layers)', html: `<strong>Ye kya hai:</strong> networking ko 7 layers (manzilon) mein baantne ka ek naksha. System design mein sirf teen yaad rakhne hain: <strong>layer 3</strong> (IP), <strong>layer 4</strong> (TCP/UDP) aur <strong>layer 7</strong> (HTTP, yaani app ki baat).<br><strong>Kyun chahiye:</strong> jab koi kahe "L4 load balancer" ya "L7 firewall", to turant samajh aaye ki wo packet ka kitna andar tak padhta hai.<br><strong>Iske bina:</strong> design discussions mein ye shabd paheli lagenge.` },
    { type: 'table', head: ['Layer', 'Protocol', 'Kya kaam', 'Packet ke label pe kya likhta hai'], rows: [
      ['7: Application', 'HTTP, DNS, gRPC', 'App ki asli baat: "mujhe /videos page do"', 'URL, headers, cookies'],
      ['(6/5 ka kaam)', 'TLS', 'Taala: encryption, server ki pehchaan', 'Encrypted data'],
      ['4: Transport', 'TCP, UDP', 'Ek computer ke program se doosre computer ke program tak data', 'Port number, sequence number, checksum'],
      ['3: Network', 'IP', 'Ek computer se doosre computer tak, routers ke through', 'Source IP, destination IP'],
      ['1-2: Physical / Link', 'WiFi, Ethernet, fiber', 'Asli taar ya radio waves pe bits', 'Hardware address'],
    ]},
    { type: 'p', html: `Isko aise socho: HTTP ka message ek chitthi hai. TLS us chitthi ko ek taale wale dibbe mein band karta hai. TCP dibbe ko numbered tukdon mein baant ke har tukde ka hisaab rakhta hai. IP har tukde pe ghar ka pata likhta hai. WiFi asli mein use hawa mein uda deta hai.` },
    { type: 'callout', tone: 'tip', title: 'System design mein kahan kaam aata hai', html: `<strong>Load balancer</strong> wo machine hai jo aane wali requests ko kai servers mein baant deti hai. <strong>L4 load balancer</strong> sirf IP aur port dekhta hai: bahut tez, lekin URL nahi samajhta. <strong>L7 load balancer</strong> HTTP padhta hai: <code>/api</code> ko ek jagah, <code>/images</code> ko doosri jagah bhej sakta hai, lekin thoda zyada kaam karta hai. Ye Phase 2 mein load balancer lesson mein aayega.` },

    { type: 'h2', text: 'TCP: "har packet pahunchega, sahi order mein"' },
    { type: 'callout', tone: 'term', title: 'Naya word: TCP', html: `<strong>Ye kya hai:</strong> Transmission Control Protocol. Layer 4 ka protocol jo pakka karta hai ki saara data pahunche, sahi order mein, bina doubling ke.<br><strong>Kyun chahiye:</strong> web page, API ka JSON, payment ka amount, chat message: inme ek byte bhi gaya ya ulta hua to cheez toot jaati hai.<br><strong>Iske bina:</strong> har app ko khud likhna padta "kaunsa tukda aaya, kaunsa nahi, dobara maango". Har app mein bugs.<br><strong>Example:</strong> xyz.com ka har page, har API call TCP pe chalti hai (HTTP/1.1 aur HTTP/2 dono).` },
    { type: 'p', html: `TCP teen kaam karta hai: (1) data bhejne se pehle dono taraf ko "ready" karta hai (<strong>handshake</strong>), (2) har byte ko ek number deta hai taaki hisaab rahe (<strong>sequence number</strong>), (3) jo nahi pahuncha use dobara bhejta hai (<strong>retransmission</strong>).` },
    { type: 'callout', tone: 'term', title: 'Naye words: SYN, ACK, sequence number', html: `<strong>Sequence number (seq):</strong> har byte ka serial number. Jaise kitaab ke page numbers. Receiver inhi se jodta hai aur pata lagata hai ki beech mein kya missing hai.<br><strong>ACK (acknowledgement):</strong> receiver ka jawab "mujhe yahan tak sab mil gaya, ab is number se aage bhejo". <code>ack=101</code> matlab "100 tak mila, 101 bhejo".<br><strong>SYN (synchronize):</strong> pehla packet jo kehta hai "baat karein? mera starting number ye hai". Starting number random hota hai, taaki koi bahar wala andaza laga ke nakli packet na ghusa sake.` },
    { type: 'callout', tone: 'term', title: 'Naya word: RTT (round trip time)', html: `<strong>Ye kya hai:</strong> ek message bhejne aur uska jawab wapas aane mein laga time.<br><strong>Kyun zaroori:</strong> har "poochho aur jawab ka intezaar karo" step ek RTT khaata hai. Mumbai se Mumbai ka server: ~5-10 ms. India se US: ~200 ms. Roshni ki speed fix hai, isliye ye ghat nahi sakta, sirf server ko paas laa ke kam hota hai.` },
    { type: 'p', html: `Ab dekho connection kaise banta hai, packet kho jaaye to kya hota hai, server band ho to kya hota hai, aur UDP kaise alag hai. Har box pe click karke uska kaam padho:` },
    { type: 'flow', height: 260,
      nodes: [
        { id: 'c', label: 'Browser', sub: 'tumhara phone', x: 90, y: 130, w: 140, kind: 'client', info: 'Ye kya hai: wo program jo baat shuru karta hai (client). Yahan tumhare phone ka browser jo xyz.com kholna chahta hai. TCP ka hisaab (kya bheja, kya mila) iske paas bhi rehta hai.' },
        { id: 'r', label: 'WiFi router', sub: 'ghar ka', x: 270, y: 130, w: 130, kind: 'net', info: 'Ye kya hai: ghar ka chhota box jo phone ko internet se jodta hai. Ye packets aage badhata hai. Bahut packets ek saath aayein ya signal kamzor ho, to packets yahin gir (drop ho) sakte hain.' },
        { id: 'i', label: 'Internet', sub: 'ISP ke routers', x: 450, y: 130, w: 130, kind: 'net', info: 'Ye kya hai: internet company (ISP) aur duniya bhar ke routers ki chain. Har router sirf destination IP dekh ke packet agle router ko de deta hai. Ye TCP ka hisaab nahi rakhte, isliye packets yahan bhi kho sakte hain.' },
        { id: 's', label: 'xyz.com server', sub: '203.0.113.10', x: 625, y: 130, w: 150, kind: 'server', info: 'Ye kya hai: wo computer jahan xyz.com chalta hai. Ye port 443 pe "sun" raha hai, yaani naye connections ka intezaar kar raha hai. (Port = computer ke andar ek program ka number. Agle lesson mein detail.)' },
      ],
      edges: [{ a: 'c', b: 'r' }, { a: 'r', b: 'i' }, { a: 'i', b: 's' }],
      scenarios: [
        { name: 'TCP handshake', intro: 'Data bhejne se pehle dono taraf "ready" confirm karte hain. Isko 3-way handshake kehte hain, kyunki teen message jaate hain.', steps: [
          { title: 'SYN: "Baat karein?"', text: 'Browser ek SYN packet bhejta hai, apna random starting number (seq=100) ke saath.', go: 'c>r>i>s', msg: 'SYN  seq=100' },
          { title: 'SYN-ACK: "Haan, ready hoon"', text: 'Server haan kehta hai, apna starting number (500) bhejta hai, aur ack=101 se batata hai ki browser ka SYN mil gaya.', go: 'res:s>i>r>c', msg: 'SYN-ACK  seq=500 ack=101' },
          { title: 'ACK: "Chalo shuru karte hain"', text: 'Browser confirm karta hai. Connection taiyaar. Is poore kaam mein ek RTT laga, aur abhi tak ek byte bhi asli data nahi gaya.', go: 'c>r>i>s', msg: 'ACK  ack=501', after: { c: { state: 'ok' }, s: { state: 'ok' } } },
          { title: 'Ab asli data', text: 'Ab HTTP request jaati hai. Har packet pe number hai, to server ko pata rehta hai ki kya aaya aur kya nahi. Practical tip: browser ACK ke saath hi request bhej deta hai, isliye handshake ka kharcha 1 RTT maana jaata hai.', go: ['c>r>i>s', 'res:s>i>r>c'], msg: 'GET / HTTP/1.1  →  200 OK' },
        ]},
        { name: 'Packet kho gaya', intro: 'Server page ke 3 packets bhej raha hai. Ek raaste mein kho jaata hai.', steps: [
          { title: 'Packet 1 pahuncha', text: 'Sab theek. Browser ACK bhejta hai: "1 tak mila".', go: 'res:s>i>r>c', msg: 'packet #1 ✓' },
          { title: 'Packet 2 kho gaya', text: 'Router busy tha, packet gira diya. Na server ko pata, na browser ko. Abhi tak.', go: 'lost:s>i>r', msg: 'packet #2 ✗ (lost)', after: { r: { state: 'warn' } } },
          { title: 'Packet 3 pahuncha', text: 'Browser ke paas 1 aur 3 hain, 2 nahi. TCP 3 ko apne paas rok ke rakhta hai, app ko nahi deta, kyunki order zaroori hai.', go: 'res:s>i>r>c', msg: 'packet #3 ✓ (2 ka intezaar)' },
          { title: 'Browser: "abhi bhi 1 tak hi"', text: 'Browser phir se ACK 1 bhejta hai. Server ko ek hi ACK baar baar milta hai (duplicate ACK). Ya ek timer khatam hota hai. Dono se server samajh jaata hai: 2 kho gaya.', go: 'c>r>i>s', msg: 'ACK 1 (dobara)  → 2 missing' },
          { title: 'Server 2 dobara bhejta hai', text: 'Retransmission. Ab 1, 2, 3 sab hain, sahi order mein, aur app ko ek saath mil jaate hain. Kimat: lagbhag ek RTT ki der.', go: 'res:s>i>r>c', msg: 'packet #2 (retransmit) ✓', set: { r: { state: '' } }, after: { c: { state: 'ok' } } },
        ]},
        { name: 'Server band hai', intro: 'Failure: server crash ho gaya ya galat IP pe ja rahe ho.', steps: [
          { title: 'SYN bheja', text: 'Browser SYN bhejta hai aur ek timer chalu karta hai.', go: 'c>r>i>s', msg: 'SYN', set: { s: { state: 'down', sub: 'crash' } } },
          { title: 'Koi jawab nahi', text: 'Timer khatam. TCP SYN dobara bhejta hai, har baar pehle se double intezaar karke (1 s, 2 s, 4 s...). Ise exponential backoff kehte hain.', go: 'lost:c>r>i>s', msg: 'SYN (retry, 2x wait)' },
          { title: 'Haar maan li', text: 'Kai koshishon ke baad browser "connection timed out" dikhata hai. Isliye real systems mein client apna chhota timeout rakhte hain (jaise 2-3 s) aur kisi doosre server pe try karte hain. Load balancer yahi karta hai.', go: 'bad:r>c', msg: 'ERR_CONNECTION_TIMED_OUT', after: { c: { state: 'warn' } } },
        ]},
        { name: 'Video call (UDP)', intro: 'Video call mein har second ~30 frames jaate hain. Yahan UDP use hota hai.', steps: [
          { title: 'Frame 1', text: 'UDP mein koi handshake nahi. Seedha bhejna shuru.', go: 'res:s>i>r>c', msg: 'frame 1 ✓' },
          { title: 'Frame 2 kho gaya', text: 'Kho gaya to kho gaya. Koi ACK nahi, koi dobara nahi.', go: 'lost:s>i>r', msg: 'frame 2 ✗' },
          { title: 'Frame 3, call chalti rahi', text: 'Ek frame missing = screen pe ek pal ka halka glitch. Agar 2 ka intezaar karte to poori video atak jaati, aur 200 ms purana frame ab dikhane ka koi fayda bhi nahi. <strong>Live mein freshness completeness se zyada zaroori hai.</strong>', go: 'res:s>i>r>c', msg: 'frame 3 ✓ (koi wait nahi)' },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "handshake har request pe hota hai"', html: `Nahi. Handshake <strong>connection</strong> banate waqt ek baar hota hai. Uske baad usi connection pe sau requests ja sakti hain (isse <strong>keep-alive</strong> ya connection reuse kehte hain). Isliye servers aur browsers connections ko khula rakhte hain, aur app servers database ke saath ek <strong>connection pool</strong> (pehle se khule connections ka set) rakhte hain.` },
    { type: 'h2', text: 'Reliability andar se: khoya packet kaise pakda jaata hai' },
    { type: 'p', html: `TCP ko kaise pata chalta hai ki packet kho gaya? Network to kuch batata nahi. TCP do ishaaron pe chalta hai:` },
    { type: 'list', items: [
      `<strong>Duplicate ACK (fast retransmit):</strong> packet 2 kho gaya lekin 3, 4, 5 pahunch gaye. Har baar receiver wahi purana ACK bhejta hai: "abhi bhi 1 tak hi mila". Server ko <strong>3 duplicate ACK</strong> mil gaye to wo bina timer ka intezaar kiye turant 2 dobara bhej deta hai. Tez: ~1 RTT ki der.`,
      `<strong>Timeout:</strong> agar khoye packet ke baad bahut kam packets aaye (jaise aakhri packet hi kho gaya), to duplicate ACK aate hi nahi. Tab server ek timer (RTO, retransmission timeout) ka intezaar karta hai. Ye slow hai.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: head-of-line blocking', html: `<strong>Ye kya hai:</strong> line mein sabse aage wala atak gaya to peeche wale sab atak jaate hain, chahe wo taiyaar hon.<br><strong>TCP mein:</strong> packet 3, 4, 5 pahunch chuke hain, lekin app ko tab tak nahi milte jab tak 2 na aa jaaye, kyunki TCP order ka vaada karta hai.<br><strong>Kyun yaad rakhna:</strong> yahi wajah hai ki HTTP/3 ne TCP chhod ke QUIC (UDP pe) banaya. Agle lessons mein aayega.` },
    { type: 'p', html: `Khud chala ke dekho. 6 packets ek saath nikle (RTT 100 ms maana, to ek packet 50 ms mein pahunchta hai). Packet pe click karke use "kho do". Phir TCP aur UDP badal ke dekho ki app ko data kab milta hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          <button class="btn small" data-m="tcp">TCP</button><button class="btn small" data-m="udp">UDP</button>
          <span style="color:var(--ink-3);font-size:13px;margin-left:6px">Kho do:</span>
          <span class="tu-chips" style="display:flex;flex-wrap:wrap;gap:6px"></span>
        </div>
        <div style="overflow-x:auto;margin-top:12px"><table style="width:100%;font-size:13.5px"><thead><tr><th>Packet</th><th>Pahuncha</th><th>App ko mila</th><th>Kya hua</th></tr></thead><tbody class="tu-rows"></tbody></table></div>
        <div class="stats"><div class="stat"><span>Poora data app ko</span><strong class="tu-t"></strong></div><div class="stat"><span>Ruke rahe (HoL)</span><strong class="tu-h"></strong></div><div class="stat"><span>Dobara bheje</span><strong class="tu-r"></strong></div></div>
        <div class="calc-note tu-n"></div>`;
      const N = 6, RTT = 100, RTO = 3;
      let mode = 'tcp'; const lost = new Set([1]);
      const model = () => {
        const arr = [], how = [];
        for (let k = 0; k < N; k++) {
          if (!lost.has(k)) { arr.push(0.5); how.push('seedha pahuncha'); continue; }
          if (mode === 'udp') { arr.push(null); how.push('kho gaya, koi dobara nahi'); continue; }
          let after = 0; for (let j = k + 1; j < N; j++) if (!lost.has(j)) after++;
          if (after >= 3) { arr.push(1.5); how.push(`kho gaya → ${after} dup ACK → fast retransmit`); }
          else { arr.push(RTO + 0.5); how.push(`kho gaya → sirf ${after} dup ACK → timer (${RTO} RTT) → retransmit`); }
        }
        const del = []; let m = 0;
        for (let k = 0; k < N; k++) {
          if (mode === 'udp') { del.push(arr[k]); continue; }
          m = Math.max(m, arr[k]); del.push(m);
        }
        return { arr, del, how };
      };
      const ms = x => x == null ? '—' : Math.round(x * RTT) + ' ms';
      const draw = () => {
        el.querySelectorAll('[data-m]').forEach(b => b.className = 'btn small' + (b.dataset.m === mode ? ' primary' : ''));
        el.querySelector('.tu-chips').innerHTML = Array.from({ length: N }, (_, k) => `<button class="chip${lost.has(k) ? ' on' : ''}" data-k="${k}">${k + 1}${lost.has(k) ? ' ✗' : ''}</button>`).join('');
        el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = +b.dataset.k; lost.has(k) ? lost.delete(k) : lost.add(k); draw(); });
        const r = model();
        let held = 0, re = 0;
        el.querySelector('.tu-rows').innerHTML = r.arr.map((a, k) => {
          const wait = mode === 'tcp' && r.del[k] > a; if (wait) held++; if (mode === 'tcp' && lost.has(k)) re++;
          const col = a == null ? 'var(--red)' : (lost.has(k) || wait) ? 'var(--amber)' : 'var(--green)';
          return `<tr><td><strong style="color:${col}">#${k + 1}</strong></td><td>${ms(a)}</td><td>${ms(r.del[k])}</td><td>${wait && !lost.has(k) ? 'pahuncha, par ruka (HoL)' : r.how[k]}</td></tr>`;
        }).join('');
        const got = r.del.filter(x => x != null);
        el.querySelector('.tu-t').textContent = mode === 'udp' && got.length < N ? `${ms(Math.max(...got))}, ${N - got.length} missing` : ms(Math.max(...got));
        el.querySelector('.tu-h').textContent = String(held);
        el.querySelector('.tu-r').textContent = String(re);
        el.querySelector('.tu-n').textContent = mode === 'tcp'
          ? 'TCP: sab kuch pahunchta hai, sahi order mein. Kimat: khoye packet ke peeche wale packets ruke rehte hain. Aakhri packet kho jaaye to duplicate ACK nahi aate, aur timer ka lamba intezaar hota hai.'
          : 'UDP: jo pahuncha wo turant app ko. Jo khoya wo gaya. Video call ya game ke liye theek, payment ya web page ke liye bilkul nahi.';
      };
      el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); });
      draw();
    }},
    { type: 'p', html: `Default setting mein packet 2 khoya: uske baad 4 packets pahunche, 4 duplicate ACK aaye, fast retransmit hua, aur poora data <strong>150 ms</strong> pe mila (bina loss ke 50 ms). Packet 3-6 pahunch chuke the phir bhi 100 ms ruke rahe: yahi head-of-line blocking hai. Ab sirf packet 6 kho ke dekho: duplicate ACK aate hi nahi, timer chalta hai, aur data <strong>350 ms</strong> pe milta hai.` },
    { type: 'callout', tone: 'tip', title: 'Asli duniya mein', html: `Timer (RTO) har connection apne naape hue RTT se tay karta hai. Simulator mein 3 RTT maana hai. Ek packet ke andar ki galti pakadne ka kaam <strong>checksum</strong> karta hai, jo agle section mein hai.` },
    { type: 'h2', text: 'Checksum: packet raaste mein kharab to nahi hua?' },
    { type: 'p', html: `Packet pahunch gaya, lekin raaste mein bijli ke noise ya kharab hardware se uska koi bit (0 ya 1) palat gaya to? "PAY 500" ban sakta hai "PAY 400". Isko pakadne ke liye <strong>checksum</strong> hota hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: checksum', html: `<strong>Ye kya hai:</strong> data se nikla ek chhota number, jo data ke saath bheja jaata hai. Receiver wahi hisaab khud dobara karta hai. Number match nahi hua = data kharab.<br><strong>Kyun chahiye:</strong> galat data chupchaap app tak na pahunche.<br><strong>Iske bina:</strong> ek palta hua bit amount, password ya file ko badal deta aur kisi ko pata bhi na chalta.<br><strong>Example:</strong> IP header, TCP aur UDP teeno mein 16-bit checksum hota hai. TCP mein checksum fail = packet chupchaap phenk do, aur sender ise "khoya packet" maan ke dobara bhejega.` },
    { type: 'p', html: `<strong>Chhota sa hisaab (simple version):</strong> message ke numbers hain 12, 7, 30. Sender jodta hai: 12 + 7 + 30 = <strong>49</strong>, aur 49 saath bhejta hai. Raaste mein 7 badal ke 6 ho gaya. Receiver jodta hai: 12 + 6 + 30 = 48. 48 ≠ 49, packet kharab, phenk do. Internet ka asli checksum bhi lagbhag yahi karta hai: data ko 16-bit ke tukdon mein jod ke ek khaas tareeke (one's complement) se ek 16-bit number banata hai.` },
    { type: 'p', html: `Neeche asli Internet checksum (RFC 1071 wala) chal raha hai. Pehle "Ek bit palto" dabao. Phir Reset karke "Do tukdon ki jagah badlo" dabao, aur dekho checksum kab dhokha kha jaata hai:` },
    { type: 'custom', render(el) {
      const ORIG = 'PAY 500 TO RIYA';
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn small" data-a="flip">Ek bit palto</button>
          <button class="btn small" data-a="swap">Do tukdon ki jagah badlo</button>
          <button class="btn small ghost" data-a="reset">Reset</button></div>
        <div class="row2" style="margin-top:12px">
          <div><div style="font-size:13px;color:var(--ink-3)">Sender ne bheja</div><code class="ck-a" style="font-size:15px"></code></div>
          <div><div style="font-size:13px;color:var(--ink-3)">Receiver ko mila</div><code class="ck-b" style="font-size:15px"></code></div></div>
        <div class="stats"><div class="stat"><span>Saath aaya checksum</span><strong class="ck-s"></strong></div><div class="stat"><span>Receiver ka hisaab</span><strong class="ck-r"></strong></div><div class="stat"><span>Faisla</span><strong class="ck-v"></strong></div></div>
        <div class="calc-note ck-n"></div>`;
      const csum = s => {
        const b = [...s].map(c => c.charCodeAt(0)); if (b.length % 2) b.push(0);
        let sum = 0; for (let i = 0; i < b.length; i += 2) { sum += (b[i] << 8) + b[i + 1]; sum = (sum & 0xffff) + (sum >>> 16); }
        return (~sum) & 0xffff;
      };
      const hex = n => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
      let got = ORIG, act = 'reset';
      const draw = () => {
        const s = csum(ORIG), r = csum(got), same = got === ORIG, ok = s === r;
        el.querySelector('.ck-a').textContent = ORIG;
        el.querySelector('.ck-b').textContent = got;
        el.querySelector('.ck-s').textContent = hex(s);
        el.querySelector('.ck-r').textContent = hex(r);
        el.querySelector('.ck-v').textContent = ok ? (same ? 'Sahi ✓' : 'Pass (galti chhoot gayi!)') : 'Kharab ✗ phenko';
        el.querySelector('.ck-v').style.color = ok && same ? 'var(--green)' : ok ? 'var(--amber)' : 'var(--red)';
        el.querySelector('.ck-n').textContent = act === 'flip' ? 'Ek bit palatne se "5" ban gaya "4" (amount 500 se 400). Checksum alag aaya, to packet phenka gaya aur dobara manga gaya. Ek bit wali galti checksum hamesha pakadta hai.'
          : act === 'swap' ? 'Do 16-bit tukde ("50" aur "0 ") ne jagah badli. Jodne mein order se fark nahi padta, to checksum same aaya aur galat message pass ho gaya! Isliye checksum sirf halki, random galtiyon ke liye hai. Jaan bujh ke kiye badlav pakadne ke liye TLS ka mazboot hisaab (MAC) chahiye.'
          : 'Sender ne message ke saath uska checksum bheja. Receiver wahi hisaab dobara karta hai.';
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        act = b.dataset.a;
        if (act === 'flip') got = ORIG.slice(0, 4) + String.fromCharCode(ORIG.charCodeAt(4) ^ 1) + ORIG.slice(5);
        else if (act === 'swap') got = ORIG.slice(0, 4) + ORIG.slice(6, 8) + ORIG.slice(4, 6) + ORIG.slice(8);
        else got = ORIG;
        draw();
      });
      draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "checksum = security"', html: `Nahi. Checksum sirf <strong>galti se</strong> hua nuksaan pakadta hai. Koi hacker message badal ke checksum bhi naya bana sakta hai, kyunki formula sabko pata hai. Jaan bujh ke chhed-chhaad se bachne ke liye TLS (neeche) ek secret key wala hisaab (MAC) lagata hai, jo bina key ke koi nahi bana sakta.` },
    { type: 'h2', text: 'Kitna tez bhejein? Flow control vs congestion control' },
    { type: 'p', html: `Server ke paas 2 MB bhejne ko hai. Kya wo saare 1,400 packets ek jhatke mein phenk de? Nahi. Do cheezein toot sakti hain, aur TCP dono ke liye alag brake lagata hai.` },
    { type: 'compare',
      left: { title: 'Flow control: receiver ko mat dubao', html: `<strong>Problem:</strong> tumhara purana phone dheere padhta hai. Server bahut tez bheje to phone ki memory (buffer) bhar jaayegi aur packets gir jaayenge.<br><strong>Hal:</strong> har ACK mein receiver batata hai "mere paas abhi itni jagah khaali hai". Isko <strong>receive window (rwnd)</strong> kehte hain. Sender isse zyada bina ACK ke nahi bhejta.<br><strong>Kiski hifazat:</strong> receiver ki.` },
      right: { title: 'Congestion control: network ko mat dubao', html: `<strong>Problem:</strong> phone to tez hai, lekin beech ka router ya raasta bhar gaya (sab log ek saath video dekh rahe hain). Sab tez bhejenge to router packets giraayega, sab dobara bhejenge, aur jam aur bura hoga.<br><strong>Hal:</strong> sender khud ek andaza rakhta hai: <strong>congestion window (cwnd)</strong>. Dheere shuru, theek chala to badhao, packet khoya to turant kam karo.<br><strong>Kiski hifazat:</strong> network ki, yaani sabki.` },
    },
    { type: 'callout', tone: 'term', title: 'Naye words: window, slow start', html: `<strong>Window:</strong> kitne packets bina ACK ka intezaar kiye "raaste mein" ho sakte hain. Har RTT mein lagbhag ek window jitna data jaata hai.<br><strong>Asli limit:</strong> sender ek RTT mein <code>min(cwnd, rwnd)</code> packets bhejta hai. Dono mein jo chhota, wahi chalega.<br><strong>Slow start:</strong> naam ulta hai, ye tezi se badhta hai. cwnd har RTT mein <strong>double</strong> hota hai (1, 2, 4, 8...) jab tak ek hadd (ssthresh) na aa jaaye. Uske baad har RTT mein sirf +1 (congestion avoidance).<br><strong>Packet khoya:</strong> matlab raasta bhar raha hai. cwnd aadha. Isko "additive increase, multiplicative decrease" (AIMD) kehte hain: dheere badho, jhatke se ghatao.` },
    { type: 'p', html: `Chala ke dekho. Har bar ek RTT hai, aur uski oonchaai = us RTT mein kitne packets gaye. rwnd slider se receiver ki jagah badlo. "Loss" on karo to dekho cwnd kaise aadha hota hai.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Receiver window (rwnd): <strong class="cc-wv"></strong> packets</label><input type="range" aria-label="rwnd" class="cc-w" min="8" max="64" step="4" value="64"></div>
          <div><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="cc-l" checked> RTT 7 mein packet loss</label></div></div>
        <div class="cc-bars" style="display:flex;align-items:flex-end;gap:4px;height:150px;margin-top:14px;border-bottom:1px solid var(--line)"></div>
        <div class="cc-x" style="display:flex;gap:4px;font-size:11px;color:var(--ink-3)"></div>
        <div class="stats"><div class="stat"><span>12 RTT mein kul packets</span><strong class="cc-t"></strong></div><div class="stat"><span>Sabse zyada ek RTT mein</span><strong class="cc-m"></strong></div><div class="stat"><span>Brake kisne lagaya (RTT 6)</span><strong class="cc-b"></strong></div></div>
        <div class="calc-note">Hara = cwnd ne roka (network ka brake). Peela = rwnd ne roka (receiver ka brake). Laal = is RTT mein loss hua. Model simple hai: cwnd 1 se shuru, ssthresh 64.</div>`;
      const model = (rwnd, loss) => {
        let cwnd = 1, ss = 64; const rows = [];
        for (let r = 1; r <= 12; r++) {
          const send = Math.min(cwnd, rwnd), by = cwnd <= rwnd ? 'cwnd' : 'rwnd', lost = loss && r === 7;
          rows.push({ r, cwnd, send, by, lost });
          if (lost) { ss = Math.max(Math.floor(cwnd / 2), 2); cwnd = ss; }
          else if (by === 'rwnd') { /* receiver is the limit: cwnd does not grow */ }
          else if (cwnd < ss) cwnd = Math.min(cwnd * 2, ss); else cwnd += 1;
        }
        return rows;
      };
      const draw = () => {
        const rw = +el.querySelector('.cc-w').value, rows = model(rw, el.querySelector('.cc-l').checked);
        el.querySelector('.cc-wv').textContent = rw;
        const mx = 64;
        el.querySelector('.cc-bars').innerHTML = rows.map(o => `<div title="RTT ${o.r}: ${o.send} packets" style="flex:1;height:${(o.send / mx * 100).toFixed(1)}%;min-height:2px;border-radius:3px 3px 0 0;background:${o.lost ? 'var(--red)' : o.by === 'rwnd' ? 'var(--amber)' : 'var(--green)'}"></div>`).join('');
        el.querySelector('.cc-x').innerHTML = rows.map(o => `<div style="flex:1;text-align:center">${o.send}</div>`).join('');
        el.querySelector('.cc-t').textContent = rows.reduce((a, o) => a + o.send, 0);
        el.querySelector('.cc-m').textContent = Math.max(...rows.map(o => o.send));
        el.querySelector('.cc-b').textContent = rows[5].by === 'rwnd' ? 'rwnd (receiver)' : 'cwnd (network)';
      };
      el.querySelector('.cc-w').oninput = draw; el.querySelector('.cc-l').onchange = draw;
      draw();
    }},
    { type: 'p', html: `<strong>Kya dikha:</strong> default setting (rwnd 64, loss on) mein cwnd 1, 2, 4, 8, 16, 32, 64 badha. RTT 7 mein loss hua to agle RTT mein 32 pe aa gaya, phir dheere 33, 34, 35, 36. 12 RTT mein kul <strong>297</strong> packets. Loss off karo to <strong>447</strong>. Ab rwnd 24 karo: cwnd kitna bhi bada ho, har RTT mein 24 se zyada nahi jaate (peeli bars). Tab receiver brake laga raha hai, network nahi.` },
    { type: 'list', items: [
      `<strong>Asli numbers:</strong> aaj ke systems cwnd 1 se nahi, lagbhag 10 packets se shuru karte hain. Linux ka default algorithm <strong>CUBIC</strong> hai, aur Google ne <strong>BBR</strong> banaya jo loss ka intezaar nahi karta, balki speed aur RTT naap ke andaza lagata hai. Idea sabka same: network ki capacity ka andaza, aur bhid dikhe to peeche hato.`,
      `<strong>System design ka sabak 1:</strong> naya connection "thanda" hota hai: pehle kuch RTT dheema. Isliye connections reuse karo (keep-alive, connection pool).`,
      `<strong>Sabak 2:</strong> RTT jitna lamba, slow start utna mehenga (har doubling ek RTT). Server user ke paas (CDN) ho to RTT 20 ms, aur window jaldi badi ho jaati hai.`,
      `<strong>Sabak 3:</strong> mobile network pe loss zyada, to cwnd baar baar aadha. Yahi wajah hai ki kharab network pe badi file dheere aati hai, bandwidth hone ke bawajood.`,
    ]},

    { type: 'h2', text: 'UDP: "bhej diya, baaki tumhari kismat"' },
    { type: 'callout', tone: 'term', title: 'Naya word: UDP', html: `<strong>Ye kya hai:</strong> User Datagram Protocol. Layer 4 ka doosra protocol. Ye sirf do kaam karta hai: port number lagata hai (taaki sahi program tak pahunche) aur checksum lagata hai. Na handshake, na ACK, na dobara bhejna, na order, na speed control.<br><strong>Kyun chahiye:</strong> jab purana data bekaar hai aur intezaar sabse bura hai: video call, online game, live stream. Aur jab sawaal-jawab itna chhota hai ki handshake mehenga lage: DNS lookup.<br><strong>Iske bina:</strong> video call mein har khoye packet pe poori call atakti.<br><strong>Example:</strong> DNS (ek packet sawaal, ek packet jawab), WhatsApp/Zoom calls (RTP over UDP), PUBG jaise games, aur QUIC (HTTP/3).` },
    { type: 'p', html: `Ek baat dhyaan se samjho: UDP pe chalne wala app chahe to <strong>khud</strong> thodi reliability bana sakta hai, sirf utni jitni use chahiye. Game sirf "important" packets (jaise "player mar gaya") dobara bhejta hai, position updates nahi. QUIC poori reliability khud banata hai, lekin har stream ke liye alag alag. UDP ek khaali canvas hai.` },
    { type: 'h2', text: 'TCP vs UDP' },
    { type: 'table', head: ['', 'TCP', 'UDP'], rows: [
      ['Connection', 'Pehle 3-way handshake (1 RTT)', 'Seedha bhejo, 0 RTT'],
      ['Packet khoya to?', 'Dobara bhejta hai', 'Ignore (app chahe to khud sambhale)'],
      ['Order', 'Guaranteed', 'Koi guarantee nahi'],
      ['Galti check (checksum)', 'Haan', 'Haan (IPv4 mein optional, IPv6 mein zaroori)'],
      ['Speed control', 'Flow + congestion control', 'Kuch nahi, app ki zimmedaari'],
      ['Header ka size', '20+ bytes', '8 bytes'],
      ['Kahan use', 'Websites, APIs, payments, chat messages, file download, database connections', 'Video/voice calls, online games, live streaming, DNS lookups, QUIC/HTTP/3'],
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `Ek sawaal poochho: <strong>"Kya ek bhi byte missing hona chalega?"</strong><br>Payment ka amount, chat message, HTML, API ka JSON: nahi chalega → <strong>TCP</strong> (har byte, sahi order mein).<br>Video call ka ek frame, game mein player ki 1/30 second purani position, DNS ka chhota sawaal: chalega, speed aur freshness zyada zaroori → <strong>UDP</strong>.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "UDP hamesha TCP se tez hai"', html: `Ek packet ke liye UDP halka hai, haan. Lekin badi file ke liye agar tum UDP pe khud reliability likhoge to aksar TCP jaisa hi (ya bura) banega. Aur bina congestion control ke UDP network ko jam kar sakta hai. "Tez" ka matlab yahan hai: <strong>intezaar nahi karta</strong>.` },
    { type: 'h2', text: 'HTTPS: beech mein koi padh na sake' },
    { type: 'p', html: `TCP pakka karta hai ki data pahunche. Lekin raaste mein koi use <em>padh</em> sakta hai? Haan, agar tum plain <strong>HTTP</strong> use kar rahe ho. Tumhara packet ghar ke router, ISP ke routers, aur kai aur machines se guzarta hai. Plain HTTP mein har koi use postcard ki tarah padh sakta hai. Teen khatre hain:` },
    { type: 'list', items: [
      `<strong>Padh lena:</strong> password, OTP, chat chori.`,
      `<strong>Badal dena:</strong> page mein nakli ad ya virus wala link ghusa dena, "PAY 500" ko "PAY 5000" bana dena.`,
      `<strong>Nakli ban jaana:</strong> koi khud ko xyz.com bata ke tumhara login le le.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: encryption aur key', html: `<strong>Ye kya hai:</strong> data ko ek secret <strong>key</strong> (bahut lamba random number) se aisa ghuma dena ki bina key ke wo kachra lage. Key wala hi use wapas seedha (decrypt) kar sakta hai.<br><strong>Kyun chahiye:</strong> raaste wale sirf kachra dekhein.<br><strong>Iske bina:</strong> public WiFi pe har password khula.` },
    { type: 'callout', tone: 'term', title: 'Naya word: TLS aur HTTPS', html: `<strong>Ye kya hai:</strong> <strong>TLS</strong> (Transport Layer Security) wo protocol hai jo TCP ke upar taala lagata hai. Purana naam SSL tha. <strong>HTTPS = HTTP + TLS</strong>. Address bar ka lock icon isi ka matlab hai.<br><strong>Kyun chahiye:</strong> TLS teeno khatre rokta hai: encryption (koi padh na sake), MAC (koi badle to pakda jaaye), certificate (server asli hai).<br><strong>Iske bina:</strong> login, payment, kuch bhi safe nahi. Aaj browsers HTTP sites ko "Not secure" dikhate hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: certificate aur CA', html: `<strong>Ye kya hai:</strong> <strong>certificate</strong> server ka digital ID card. Usme likha hai "ye xyz.com hai" aur server ki <strong>public key</strong>. Ise ek <strong>CA (Certificate Authority)</strong>, yaani ek bharosemand company (jaise Let's Encrypt, DigiCert) sign karti hai. Browser/phone mein pehle se in CAs ki list hoti hai.<br><strong>Kyun chahiye:</strong> encryption akela kaafi nahi. Agar tum attacker se hi encrypted baat kar rahe ho to kya fayda? Certificate saabit karta hai ki doosri taraf asli xyz.com hai.<br><strong>Iske bina:</strong> koi bhi WiFi wala khud ko xyz.com bata sakta.<br><strong>Example:</strong> certificate expire bhi hote hain. CA/Browser Forum ke 2025 ke faisle se public certificates ki max umar 15 March 2026 se 200 din, 2027 se 100 din aur 2029 se 47 din. Isliye renewal automatic karna padta hai, warna site pe bada laal warning.` },
    { type: 'callout', tone: 'term', title: 'Naya word: public key aur private key', html: `<strong>Ye kya hai:</strong> ek jodi keys. <strong>Public key</strong> sabko de sakte ho. <strong>Private key</strong> sirf server ke paas, kabhi bahar nahi jaati. Private key se banaya "signature" public key se check ho sakta hai, lekin public key se private key nahi nikal sakti.<br><strong>Kyun chahiye:</strong> server saabit karta hai "certificate wali public key ki private key mere paas hai", bina private key dikhaaye.<br><strong>Iske bina:</strong> koi bhi chura ke certificate copy karke khud ko xyz.com bata deta.` },
    { type: 'p', html: `Ab ek paheli: browser aur server ko ek <strong>shared secret key</strong> chahiye, lekin beech mein sab dekh raha hai. Key network pe bhejoge to chori. Jawab hai <strong>Diffie-Hellman key exchange</strong>: dono taraf ek ek secret number chunte hain, sirf "mix" kiya hua number bhejte hain, aur dono ek hi final key pe pahunch jaate hain. Chhote numbers se hisaab dekho:` },
    { type: 'table', head: ['Step', 'Browser', 'Network pe sab dekh sakte hain', 'Server'], rows: [
      ['Public niyam', '', 'p = 23, g = 5', ''],
      ['Apna secret chuno', 'a = 6 (kisi ko nahi batata)', '', 'b = 15 (kisi ko nahi batata)'],
      ['Mix karke bhejo', 'A = 5<sup>6</sup> mod 23 = <strong>8</strong>', 'A = 8, B = 19', 'B = 5<sup>15</sup> mod 23 = <strong>19</strong>'],
      ['Final key', '19<sup>6</sup> mod 23 = <strong>2</strong>', '?? (8 aur 19 se nikalna bahut mushkil)', '8<sup>15</sup> mod 23 = <strong>2</strong>'],
    ]},
    { type: 'p', html: `Dono ke paas key 2 aa gayi, aur network pe 2 kabhi gaya hi nahi. Asli mein numbers sainkdon digits ke hote hain (ya elliptic curves use hote hain), isliye attacker ke liye 8 aur 19 se key nikalna practically impossible hai. <code>mod</code> ka matlab: bhaag do aur sirf baaki (remainder) rakho.` },
    { type: 'p', html: `Ab poora TLS handshake chala ke dekho. Cafe ka public WiFi hai, aur same WiFi pe ek attacker baitha hai. Chaaron scenarios chalao, khaaskar aakhri do (failure):` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'b', label: 'Browser', sub: 'login kar rahe ho', x: 100, y: 110, w: 150, kind: 'client', info: 'Ye kya hai: tumhara browser, jo xyz.com pe password daal ke login kar raha hai. Isi ke andar CAs ki list hai, aur yahi certificate check karta hai.' },
        { id: 'w', label: 'Public WiFi', sub: 'cafe router', x: 360, y: 110, w: 140, kind: 'net', info: 'Ye kya hai: cafe ka router. Tumhara har packet isse guzarta hai. Router (ya uspe kabza kiya hua koi) har packet dekh, rok ya badal sakta hai.' },
        { id: 's', label: 'xyz.com server', sub: 'asli', x: 620, y: 110, w: 150, kind: 'server', info: 'Ye kya hai: asli server. Iske paas certificate hai (CA ne sign kiya) aur uski private key, jo kabhi bahar nahi jaati.' },
        { id: 'hk', label: 'Attacker', sub: 'same WiFi pe', x: 360, y: 240, w: 140, kind: 'threat', info: 'Ye kya hai: same WiFi pe baitha koi jo traffic padhne ya badalne ki koshish karta hai. Isko man-in-the-middle (beech ka aadmi) attack kehte hain.' },
      ],
      edges: [{ a: 'b', b: 'w' }, { a: 'w', b: 's' }, { a: 'w', b: 'hk', dashed: true }],
      scenarios: [
        { name: 'HTTP (bina taala)', steps: [
          { title: 'Tum password bhejte ho', text: 'Plain HTTP mein data jaisa hai waisa jaata hai, postcard ki tarah.', go: 'b>w', msg: 'POST /login\nemail=me@x.com&password=hunter2' },
          { title: 'Attacker sab padh leta hai', text: 'Router se guzarte waqt attacker ne copy kar liya. Tumhara password ab uske paas hai, aur tumhe pata bhi nahi.', parallel: true, go: ['w>s', 'bad:w>hk'], after: { hk: { sub: 'password mil gaya!' } }, msg: 'Attacker ne dekha: password=hunter2' },
        ]},
        { name: 'HTTPS (TLS 1.3)', intro: 'TCP handshake (1 RTT) ho chuka hai. Ab TLS 1.3 ka handshake, sirf 1 RTT mein.', steps: [
          { title: 'ClientHello', text: 'Browser bolta hai: "main TLS 1.3 jaanta hoon, ye mere encryption options hain", aur Diffie-Hellman ka apna mix kiya number (key share) bhi saath bhej deta hai, taaki ek RTT bache.', go: 'b>w>s', msg: 'ClientHello + key share (A)' },
          { title: 'ServerHello + certificate', text: 'Server apna key share (B), certificate, ek signature (private key se, ye saabit karne ke liye ki certificate uska hai) aur "Finished" bhejta hai. Is point se server ki taraf ka data encrypted hai.', go: 'res:s>w>b', msg: 'ServerHello (B) + Certificate + Signature + Finished' },
          { title: 'Browser certificate check karta hai', text: 'Teen sawaal: (1) kya kisi trusted CA ne sign kiya? (2) kya isme naam xyz.com hai? (3) kya expire to nahi hua? Teeno haan. Phir A, B aur apne secret se wahi key banata hai jo server ne banayi.', focus: ['b'], set: { b: { state: 'ok', sub: 'certificate sahi ✓' } } },
          { title: 'Finished + pehli request, encrypted', text: 'Browser "Finished" ke saath hi apni login request bhej deta hai. Attacker ko sirf kachra dikhta hai. Lock icon aa gaya.', parallel: true, go: ['b>w>s', 'bad:w>hk'], after: { hk: { sub: 'kuch samajh nahi aaya' }, s: { state: 'ok' } }, msg: 'Attacker ne dekha: 9f2a!x#Qm@7Lz...  (encrypted)' },
        ]},
        { name: 'Nakli server', intro: 'Failure: attacker WiFi pe tumhari request ko apni taraf mod deta hai aur khud xyz.com banne ki koshish karta hai.', steps: [
          { title: 'Request attacker ke paas', text: 'WiFi pe kabza karke attacker ne xyz.com ki traffic apni machine pe bhej di.', go: 'b>w>hk', msg: 'ClientHello (xyz.com)' },
          { title: 'Attacker apna certificate bhejta hai', text: 'Uske paas xyz.com ki private key nahi hai. To wo ya to apna banaya (self-signed) certificate bhejta hai, ya kisi aur domain ka.', go: 'res:hk>w>b', msg: 'Certificate: "xyz.com" (signed by: attacker khud)' },
          { title: 'Browser rok deta hai', text: 'Kisi trusted CA ka sign nahi. Browser bada laal page dikhata hai: "Your connection is not private". Password kabhi nahi gaya. Isliye is warning ko kabhi "ignore" nahi karna chahiye.', focus: ['b'], set: { b: { state: 'warn', sub: 'nakli certificate!' }, hk: { sub: 'kuch nahi mila' } } },
        ]},
        { name: 'Raaste mein chhed-chhaad', intro: 'Failure: encrypted data ko attacker padh to nahi sakta, lekin badalne ki koshish karta hai.', steps: [
          { title: 'Server ka encrypted jawab', text: 'Server ne encrypted page bheja. Har record ke saath ek MAC (secret key wala checksum) hai.', go: 'res:s>w', msg: 'encrypted record + MAC' },
          { title: 'Attacker kuch bytes badal deta hai', text: 'Matlab nahi pata, phir bhi kuch bytes palat diye, is umeed mein ki kuch toot jaaye.', go: 'res:w>b', set: { hk: { sub: 'bytes badle' } }, msg: 'encrypted record (badla hua) + purana MAC' },
          { title: 'MAC fail, connection band', text: 'Browser MAC dobara nikalta hai: match nahi. Attacker ke paas key nahi thi, isliye wo sahi MAC bana hi nahi sakta tha. Browser ye data kabhi page pe nahi dikhata aur connection tod deta hai. Badla hua data chupchaap kabhi andar nahi aata.', focus: ['b'], set: { b: { state: 'warn', sub: 'MAC fail: band' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "HTTPS = data hamesha safe"', html: `HTTPS data ko <strong>raaste mein</strong> safe rakhta hai. Server pe pahunchne ke baad wo decrypt hota hai. Database mein data safe hai ya nahi (encryption at rest), aur server khud hack ho gaya to? Wo alag topics hain, Phase 3 ke security lesson mein. Aur lock icon ka matlab "site imaandaar hai" nahi: phishing site ka bhi valid certificate ho sakta hai. Matlab sirf itna: tum <em>isi naam wali site</em> se baat kar rahe ho, aur koi beech mein padh nahi raha.` },
    { type: 'h2', text: 'Handshakes ki keemat: TLS 1.2 vs TLS 1.3' },
    { type: 'p', html: `Har handshake round trips khaata hai, aur pehla byte tab tak nahi aata. <strong>TLS 1.2</strong> (2008) mein TLS handshake ke liye <strong>2 RTT</strong> lagte the: pehle options pe baat, phir keys. <strong>TLS 1.3</strong> (2018, RFC 8446) ne browser ko pehle message mein hi apna key share bhejne diya, to sirf <strong>1 RTT</strong>. Saath mein purane kamzor tareeke hata diye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: 0-RTT (resumption)', html: `<strong>Ye kya hai:</strong> agar browser is server se kuch der pehle baat kar chuka hai, to dono ke paas ek purani shared secret (ticket) bachi hoti hai. Uske dum pe browser <strong>pehle hi message mein</strong> encrypted request bhej deta hai: TLS ka intezaar zero.<br><strong>Kyun chahiye:</strong> wapas aane wale users ke liye page aur tez.<br><strong>Khatra:</strong> ye early data <strong>replay</strong> ho sakta hai: attacker wahi packet dobara bhej de to server use do baar chala sakta hai. Isliye 0-RTT sirf safe requests (jaise GET page) ke liye theek hai, "paise bhejo" jaisi request ke liye nahi.` },
    { type: 'p', html: `RTT slider ghuma ke dekho ki pehla byte aane mein kitna time lagta hai. Grey = TCP handshake, peela = TLS handshake, hara = asli request aur jawab.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<label>RTT: <strong class="hs-v"></strong> ms <span style="color:var(--ink-3)">(Mumbai se Mumbai ~10, India se US ~200)</span></label>
        <input type="range" aria-label="RTT" class="hs-r" min="10" max="300" step="10" value="200">
        <div class="hs-rows" style="margin-top:12px"></div>
        <div class="calc-note hs-n"></div>`;
      const ROWS = [
        ['HTTP (bina TLS)', 1, 0, 'Sasta, lekin koi taala nahi'],
        ['HTTPS, TLS 1.2', 1, 2, 'Purana: TLS ke 2 RTT'],
        ['HTTPS, TLS 1.3', 1, 1, 'Aaj ka default'],
        ['TLS 1.3, 0-RTT (wapas aaya user)', 1, 0, 'Request ClientHello ke saath'],
        ['HTTP/3 (QUIC)', 0, 1, 'Connection + TLS ek saath'],
        ['HTTP/3, 0-RTT', 0, 0, 'Pehle hi packet mein request'],
        ['Khula connection reuse', 0, 0, 'Koi handshake nahi'],
      ];
      const draw = () => {
        const R = +el.querySelector('.hs-r').value; el.querySelector('.hs-v').textContent = R;
        const max = 4;
        el.querySelector('.hs-rows').innerHTML = ROWS.map(([n, tcp, tls, note]) => {
          const tot = tcp + tls + 1, seg = (k, c) => k ? `<div style="width:${(k / max * 100).toFixed(1)}%;background:${c};height:100%;border-right:2px solid var(--surface)"></div>` : '';
          return `<div style="display:grid;grid-template-columns:minmax(120px,1.1fr) 2fr auto;gap:8px;align-items:center;margin:6px 0">
            <div style="font-size:13px">${n}<div style="font-size:11.5px;color:var(--ink-3)">${note}</div></div>
            <div style="display:flex;height:16px;background:var(--surface-2);border-radius:4px;overflow:hidden">${seg(tcp, 'var(--line-2)')}${seg(tls, 'var(--amber)')}${seg(1, 'var(--green)')}</div>
            <strong style="font-family:var(--f-mono);font-size:13px">${tot * R} ms</strong></div>`;
        }).join('');
        el.querySelector('.hs-n').textContent = `RTT ${R} ms pe TLS 1.2 se TLS 1.3 = ${R} ms bachat har naye connection pe. HTTP/3 0-RTT sirf ${R} ms, jabki TLS 1.2 ${4 * R} ms. Server ko user ke paas laana (RTT 200 se 20) in sab se bada fayda deta hai: isliye CDN.`;
      };
      el.querySelector('.hs-r').oninput = draw; draw();
    }},
    { type: 'p', html: `India se US (RTT 200 ms) pe TLS 1.2 wala naya connection <strong>800 ms</strong> baad pehla byte deta hai, TLS 1.3 <strong>600 ms</strong>, aur already khula connection sirf <strong>200 ms</strong>. Isliye do niyam: <strong>connections reuse karo</strong>, aur <strong>handshake user ke paas khatam karo</strong> (CDN ya load balancer pe, jise TLS termination kehte hain, proxies lesson mein).` },
    { type: 'h2', text: 'System design mein ye kyun matter karta hai' },
    { type: 'list', items: [
      `<strong>Latency:</strong> TCP (1 RTT) + TLS (1-2 RTT) = request se pehle hi 2-3 round trips. India se US ka RTT ~200 ms, to pehla byte 600-800 ms baad. Isliye servers aur CDN users ke paas rakhte hain.`,
      `<strong>Connection reuse:</strong> har request pe naya handshake mehenga, aur naya connection slow start se dheere chalta hai. Isliye browsers keep-alive rakhte hain, aur app servers database/Redis ke saath connection pool.`,
      `<strong>TLS termination:</strong> encryption ka kaam (handshake, certificates) aksar load balancer ya CDN pe hota hai, andar ke servers pe nahi. Agle lessons mein.`,
      `<strong>Andar bhi taala (mTLS):</strong> bade systems mein services aapas mein bhi TLS se baat karti hain, aur dono taraf certificate dikhate hain (mutual TLS). "Andar ka network safe hai" maan lena purana soch hai.`,
      `<strong>Protocol choice:</strong> Uber driver location, WhatsApp call, Hotstar live: in sab mein TCP vs UDP ka faisla design ka hissa hai. Ek hi app mein dono ho sakte hain: chat message TCP pe, video call UDP pe.`,
      `<strong>Timeouts:</strong> server band ho to TCP khud kai second retry karta hai. Isliye har network call pe apna chhota timeout lagao, warna ek mara hua server tumhare saare threads atka dega.`,
    ]},
    { type: 'diagram', title: 'TCP, UDP aur TLS: poori picture', height: 560,
      groups: [
        { label: 'Ghar / cafe', x: 20, y: 20, w: 180, h: 460 },
        { label: 'Internet', x: 270, y: 20, w: 180, h: 460 },
        { label: 'xyz.com data center', x: 505, y: 192, w: 195, h: 353 },
      ],
      nodes: [
        { id: 'ph', label: 'Phone', sub: 'browser + app', x: 110, y: 90, kind: 'client', info: 'Ye kya hai: tumhara phone. Web page ke liye TCP + TLS connection banata hai, video call ke liye UDP. Isi mein CAs ki list hai jisse certificate check hota hai.' },
        { id: 'rt', label: 'WiFi router', x: 110, y: 250, kind: 'net', info: 'Ye kya hai: ghar ya cafe ka router. Packets yahan gir sakte hain (TCP dobara bhejega) aur yahan koi padhne ki koshish kar sakta hai (TLS rokega).' },
        { id: 'hk', label: 'Attacker', sub: 'same WiFi', x: 110, y: 420, kind: 'threat', info: 'Ye kya hai: beech ka aadmi. HTTP mein sab padh leta. HTTPS mein sirf kachra dekhta hai, nakli certificate pakda jaata hai, aur badla hua data MAC check mein fail hota hai.' },
        { id: 'ca', label: 'CA', sub: 'certificate deta', x: 360, y: 90, kind: 'edge', info: 'Ye kya hai: Certificate Authority, ek bharosemand company jo pehle se (handshake se kaafi pehle) xyz.com ko sign kiya hua certificate deti hai. Har request mein ye beech mein nahi aati.' },
        { id: 'isp', label: 'Internet', sub: 'ISP routers', x: 360, y: 250, w: 150, kind: 'net', info: 'Ye kya hai: routers ki chain jo sirf IP padh ke packet aage badhati hai (layer 3). Yahan bhi loss aur bhid hoti hai, jise TCP ka congestion control sambhalta hai.' },
        { id: 'media', label: 'Call server', sub: 'UDP, video', x: 360, y: 420, kind: 'server', info: 'Ye kya hai: video call ka server. Frames UDP pe aate hain: khoya frame dobara nahi maanga jaata, kyunki live mein purana frame bekaar hai.' },
        { id: 'lb', label: 'Load Balancer', sub: 'TLS yahan khulta', x: 600, y: 250, w: 160, kind: 'edge', info: 'Ye kya hai: xyz.com ka darwaza. Isi ke paas certificate aur private key hai. TLS handshake yahan khatam (TLS termination), phir request andar ke servers ko.' },
        { id: 'app', label: 'App servers', x: 600, y: 375, kind: 'server', info: 'Ye kya hai: asli kaam karne wale servers. Load balancer se andar ke network pe baat (zaroori ho to wahan bhi TLS). Database ke saath connections pool mein khule rakhte hain.' },
        { id: 'db', label: 'Database', x: 600, y: 495, kind: 'data', info: 'Ye kya hai: xyz.com ka data. TCP pe chalta hai, kyunki ek byte bhi galat nahi chalega. Har query pe naya connection nahi: pool se purana connection.' },
      ],
      edges: [
        { a: 'ph', b: 'rt', n: 1, label: 'TCP + TLS' },
        { a: 'rt', b: 'isp', n: 2 },
        { a: 'isp', b: 'lb', n: 3 },
        { a: 'lb', b: 'app', n: 4, label: 'andar' },
        { a: 'app', b: 'db', n: 5, label: 'pool' },
        { a: 'ca', b: 'lb', dashed: true, label: 'certificate' },
        { a: 'isp', b: 'media', kind: 'evt', label: 'UDP' },
        { a: 'rt', b: 'hk', dashed: true, kind: 'bad', label: 'sniff' },
      ],
      paths: [
        { name: 'Web page (TCP + TLS)', text: 'Phone TCP handshake karta hai, phir TLS 1.3 (load balancer certificate dikhata hai), phir encrypted request andar app aur database tak.', go: ['ph>rt>isp>lb>app>db'] },
        { name: 'Video call (UDP)', text: 'Frames UDP pe: koi handshake nahi, koi retransmit nahi. Ek frame khoya to bas ek pal ka glitch.', go: ['ph>rt>isp>media'] },
        { name: 'WiFi pe attacker', text: 'Attacker router pe packets dekhta hai, lekin TLS ki wajah se sirf kachra. Nakli certificate browser pakad leta hai.', go: ['rt>hk'] },
        { name: 'Certificate kahan se', text: 'CA pehle se load balancer ko signed certificate deti hai. Browser us sign ko apni CA list se check karta hai.', go: ['ca>lb'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Data packets mein jaata hai. Packets kho sakte hain, der se ya ulte order mein aa sakte hain.</li>
      <li>Layers: L3 = IP (kaunsa computer), L4 = TCP/UDP (kaunsa program, kaisa bharosa), L7 = HTTP (app ki baat).</li>
      <li>TCP: 3-way handshake (1 RTT), sequence numbers + ACK, khoya packet dobara (duplicate ACK ya timeout). Kimat: head-of-line blocking.</li>
      <li>Flow control (rwnd) receiver ko bachata hai. Congestion control (cwnd: slow start, loss pe aadha) network ko.</li>
      <li>Checksum galti se hua nuksaan pakadta hai, hacker ka nahi. Uske liye TLS ka MAC.</li>
      <li>UDP: na handshake, na retransmit. Live video, games, DNS, QUIC. Decide: "kya ek byte bhi missing chalega?"</li>
      <li>HTTPS = HTTP + TLS: encryption + certificate (CA ne sign kiya) + MAC. TLS 1.2 = 2 RTT, TLS 1.3 = 1 RTT, resumption pe 0-RTT (replay ka khatra).</li>
      <li>Design ke sabak: connections reuse karo, handshake user ke paas khatam karo (CDN/LB), har call pe timeout.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['TCP: har byte pahunchta hai, sahi order mein, bina app ke code ke', 'Congestion control se network sabke liye chalta rehta hai', 'UDP: zero setup, koi intezaar nahi, live cheezon ke liye perfect', 'TLS: privacy, chhed-chhaad pakadna, aur server ki pakki pehchaan'], costs: ['TCP: handshake ka 1 RTT, slow start, aur ek khoye packet pe sab ruk jaata hai (HoL)', 'UDP: loss, order, speed control sab app ki zimmedaari', 'TLS: 1-2 RTT extra, CPU ka thoda kaam, certificates renew karne ka jhanjhat', '0-RTT tez hai lekin replay ka khatra'] },
    { type: 'think', questions: [
      { q: 'Online multiplayer game mein player ki position har 30 ms bhejte hain. TCP ya UDP?', a: 'UDP. Agar ek position update kho gaya to agla 30 ms mein aa hi raha hai. TCP use karte to ek khoye packet ke liye baaki sab ruk jaate (head-of-line blocking), aur game lag karta. Lekin "match jeeta" jaisa important event game khud dobara bhejega (UDP ke upar apni chhoti reliability).' },
      { q: 'Payment API ke liye UDP kyun nahi?', a: 'Kyunki ek bhi byte missing ya galat order mein hua to amount ya details galat ho sakti hain. Paisa = koi compromise nahi. TCP, aur upar HTTPS (encryption + MAC), taaki koi padh ya badal na sake.' },
      { q: 'Tumhara app server har request pe database se naya TCP + TLS connection banata hai. Database doosre region mein hai (RTT 50 ms). Kya problem hai, aur ilaaj?', a: 'Har request pe 2-3 RTT (100-150 ms) sirf handshake mein, plus slow start, plus database pe hazaaron naye connections ka bojh. Ilaaj: connection pool (pehle se khule connections reuse karo), aur database ko app ke paas (same region) rakho.' },
      { q: 'Kisi ne kaha "hamare andar ke servers private network mein hain, to unke beech TLS ki zarurat nahi". Tum kya kahoge?', a: 'Agar koi ek andar ka server hack ho gaya to wo baaki sab traffic padh sakta hai. Isliye sensitive systems andar bhi TLS (aksar mTLS) use karte hain. Trade-off: thoda CPU aur certificates manage karna, jo service mesh jaise tools automatic kar dete hain.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'TCP mein packet kho jaaye to kya hota hai?', options: ['Ignore ho jaata hai', 'Dobara bheja jaata hai', 'Connection band ho jaata hai'], answer: 1, explain: 'TCP ka poora point reliability hai: khoya packet retransmit hota hai (duplicate ACK ya timeout se pata chalta hai), aur order maintain hota hai.' },
      { q: 'Packet 2 khoya, lekin 3, 4, 5 pahunch gaye. App ko 3, 4, 5 kab milenge (TCP)?', options: ['Turant', 'Jab 2 dobara aa jaaye', 'Kabhi nahi'], answer: 1, explain: 'TCP order ka vaada karta hai, isliye 3-5 ruke rehte hain jab tak 2 na aa jaaye. Isi ko head-of-line blocking kehte hain.' },
      { q: 'Flow control aur congestion control mein farak?', options: ['Dono same hain', 'Flow control receiver ko bachata hai (rwnd), congestion control network ko (cwnd)', 'Flow control sirf UDP mein hota hai'], answer: 1, explain: 'rwnd = receiver ke paas kitni jagah. cwnd = sender ka network ki bhid ka andaza. Sender min(cwnd, rwnd) bhejta hai.' },
      { q: 'Public WiFi pe HTTPS kya protect karta hai?', options: ['Data ko raaste mein padhe ya badle jaane se', 'Server crash se', 'Slow internet se'], answer: 0, explain: 'TLS encryption karta hai (beech wala sirf kachra dekhta hai), MAC se chhed-chhaad pakadta hai, aur certificate se server ki pehchaan.' },
      { q: 'Naye connection pe pehla byte aane mein, RTT 100 ms, TCP + TLS 1.3:', options: ['100 ms', '300 ms', '400 ms'], answer: 1, explain: 'TCP 1 RTT + TLS 1.3 1 RTT + request/response 1 RTT = 3 × 100 = 300 ms. TLS 1.2 mein 400 ms.' },
      { q: 'Browser ko certificate kis cheez se pata chalta hai ki wo asli hai?', options: ['Server khud kehta hai', 'Kisi trusted CA ne us pe sign kiya hai, naam match karta hai, aur expire nahi hua', 'Certificate pe lock ki photo hai'], answer: 1, explain: 'Browser ke paas trusted CAs ki list hai. Sign check, naam check, expiry check. Teeno pass to hi lock icon.' },
      { q: 'Kaunsa UDP ka sahi use case hai?', options: ['Bank transfer', 'File download', 'Live video call'], answer: 2, explain: 'Live mein purana data bekaar hai. Speed aur freshness zyada zaroori, thoda loss chalega.' },
    ]},
    { type: 'sources', note: 'Version-specific facts (RTTs, certificate lifetimes, checksum rules) inhi sources se check kiye.', items: [
      { title: 'RFC 9293: Transmission Control Protocol (TCP)', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9293.html', used: 'Three-way handshake, sequence and acknowledgement numbers, receive window, checksum.' },
      { title: 'RFC 5681: TCP Congestion Control', publisher: 'IETF', official: true, year: 2009, url: 'https://www.rfc-editor.org/rfc/rfc5681.html', used: 'Slow start, congestion avoidance, ssthresh, fast retransmit after three duplicate ACKs.' },
      { title: 'RFC 768: User Datagram Protocol', publisher: 'IETF', official: true, year: 1980, url: 'https://www.rfc-editor.org/rfc/rfc768.html', used: 'UDP has only ports, length and checksum; 8 byte header; no delivery guarantee.' },
      { title: 'RFC 1071: Computing the Internet Checksum', publisher: 'IETF', official: true, year: 1988, url: 'https://www.rfc-editor.org/rfc/rfc1071.html', used: '16-bit one\'s complement sum used by the checksum widget; order of words does not change the sum.' },
      { title: 'RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3', publisher: 'IETF', official: true, year: 2018, url: 'https://www.rfc-editor.org/rfc/rfc8446.html', used: '1-RTT handshake, 0-RTT early data and its replay risk, removal of static RSA key exchange.' },
      { title: 'A Detailed Look at RFC 8446 (a.k.a. TLS 1.3)', publisher: 'Cloudflare blog', official: true, year: 2018, url: 'https://blog.cloudflare.com/rfc-8446-aka-tls-1-3/', used: 'TLS 1.2 needs two extra round trips, TLS 1.3 one; 0-RTT resumption trade-offs.' },
      { title: 'SSL/TLS certificate validity changes (Ballot SC-081)', publisher: 'SSL.com', url: 'https://www.ssl.com/article/ssl-certificate-validity-changes-what-you-need-to-know/', used: 'Maximum public certificate validity: 200 days from 15 March 2026, 100 days from 2027, 47 days from 2029.' },
    ]},
  ],
});
