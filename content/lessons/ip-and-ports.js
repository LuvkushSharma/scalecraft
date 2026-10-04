Lesson.register({
  id: 'ip-and-ports',
  title: 'IP address aur ports',
  minutes: 22,
  summary: `IP address batata hai "kaunsa computer". Port batata hai "us computer ka kaunsa program". Dono milke internet pe har baatcheet ka exact pata bante hain. Saath mein: IPv4 vs IPv6, private vs public IP, NAT, sockets, firewall aur DNS records.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Internet pe har message ko ek pata chahiye, warna wo kahin nahi pahunchega.<br>Pate ke do hisse hain: <strong>kaunsa computer</strong> (IP address) aur <strong>us computer pe kaunsa program</strong> (port). Jaise ek building ka address aur andar flat number.<br>Is lesson mein dekhenge: address kaise dikhte hain, kyun khatam ho gaye, ek ghar ke 10 phone ek hi address se internet kaise chalate hain (NAT), aur server ke database wale darwaze ko bahar walon se kaise band rakhte hain (firewall).` },

    { type: 'h2', text: 'IP address: computer ka address' },
    { type: 'callout', tone: 'term', title: 'Yaad karo: IP address', html: `<strong>Ye kya hai:</strong> internet pe har computer (ya network card) ka ek number wala address, jaise <code>203.0.113.10</code>.<br><strong>Kyun chahiye:</strong> packet ko pata hona chahiye ki jaana kahan hai, aur jawab kahan wapas aana hai.<br><strong>Iske bina:</strong> data bhejne ka koi tareeka nahi, jaise bina pate ki chitthi.<br><strong>Example:</strong> pichhle lessons mein DNS ne <code>xyz.com</code> ko <code>203.0.113.10</code> mein badla tha. Wahi xyz.com ke server ka IP hai.` },
    { type: 'p', html: `Internet pe har packet ke label pe do IP likhe hote hain: <strong>source IP</strong> (kahan se aaya) aur <strong>destination IP</strong> (kahan jaana hai). Raaste mein routers bas destination dekhte hain aur packet ko agle router ki taraf badha dete hain. Ye layer 3 ka kaam hai (pichhle lesson ki layers yaad karo).` },
    { type: 'callout', tone: 'term', title: 'Naya word: router', html: `<strong>Ye kya hai:</strong> ek machine jo packets ko ek network se doosre network ki taraf aage badhati hai. Har router ke paas ek "naksha" (routing table) hota hai: "203.x wale packets us taraf bhejo".<br><strong>Kyun chahiye:</strong> tumhara phone aur xyz.com ka server seedhe taar se jude nahi hain. Beech mein 10-20 routers packet ko haath badal badal ke pahunchaate hain.<br><strong>Iske bina:</strong> sirf ek hi network ke computers aapas mein baat kar paate, internet hota hi nahi.<br><strong>Example:</strong> ghar ka WiFi router tumhare ghar ke network ko ISP ke network se jodta hai.` },

    { type: 'h2', text: 'IPv4 vs IPv6: address khatam kyun ho gaye?' },
    { type: 'p', html: `<code>203.0.113.10</code> ek <strong>IPv4</strong> address hai: 4 numbers, har ek 0 se 255 tak. Kyun 255? Kyunki har number <strong>8 bits</strong> (8 zero-ya-one) mein likha jaata hai, aur 8 bits se 256 alag numbers ban sakte hain (0 se 255). 4 × 8 = <strong>32 bits</strong>. Kul possible addresses: 2<sup>32</sup> = lagbhag <strong>4.3 billion</strong> (430 crore).` },
    { type: 'callout', tone: 'term', title: 'Naya word: bit', html: `<strong>Ye kya hai:</strong> computer ki sabse chhoti jaankari: 0 ya 1. 8 bits = 1 byte.<br><strong>Kyun yahan:</strong> address mein jitne bits, utne hi alag address ban sakte hain. Har ek extra bit se ginti double.<br><strong>Example:</strong> 3 bits se 8 alag cheezein (000, 001, ... 111). 32 bits se 4.3 billion.` },
    { type: 'p', html: `1980s mein 4.3 billion bahut lagte the. Aaj duniya mein phones, laptops, TVs, cameras, servers milake us se kahin zyada devices hain. Isliye addresses khatam ho gaye: 3 February 2011 ko IANA (jo duniya ke addresses baantti hai) ne apne aakhri IPv4 blocks regions ko de diye. Iske do ilaaj nikle: (1) <strong>private IP + NAT</strong>, jo aaj har ghar mein chal raha hai, aur (2) <strong>IPv6</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: IPv6', html: `<strong>Ye kya hai:</strong> IP ka naya version jisme address <strong>128 bits</strong> ka hai. Likhne mein 8 hisse, har hissa hexadecimal mein (0-9 aur a-f), jaise <code>2001:db8:0:0:0:0:0:1</code>. Lagataar zeros ko <code>::</code> se chhota kar dete hain: <code>2001:db8::1</code>.<br><strong>Kyun chahiye:</strong> 2<sup>128</sup> addresses itne hain ki har device ko apna public address mil sakta hai, NAT ke jugaad ke bina.<br><strong>Iske bina:</strong> naye users ke liye IPv4 addresses kharidne padte (ye mehenge bikte hain) aur NAT ki pareshaniyan badhti.<br><strong>Example:</strong> Google ke measurement mein 23 April 2026 ko pehli baar 50% users IPv6 se aaye. India is mamle mein bahut aage hai (lagbhag 70%+), kyunki Jio jaise naye networks ne shuru se IPv6 rakha.` },
    { type: 'table', head: ['', 'IPv4', 'IPv6'], rows: [
      ['Kaisa dikhta hai', '<code>203.0.113.10</code>', '<code>2001:db8::8a2e:370:7334</code>'],
      ['Size', '32 bits', '128 bits'],
      ['Kitne possible', '~4.3 billion (khatam)', '~3.4 × 10<sup>38</sup> (practically khatam nahi honge)'],
      ['NAT ki zarurat', 'Lagbhag hamesha', 'Aam taur pe nahi'],
      ['DNS record', 'A record', 'AAAA record (neeche aayega)'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "IPv6 aaya to IPv4 band"', html: `Nahi. IPv4 aur IPv6 seedhe ek doosre se baat nahi kar sakte (alag "bhasha" hain). Isliye aaj zyada tar servers aur phones <strong>dual-stack</strong> chalate hain: dono addresses rakhte hain. Tumhara phone pehle IPv6 try karta hai, na chale to IPv4. xyz.com ko bhi dono pe available rehna chahiye, warna kuch users tak nahi pahunchoge.` },
    { type: 'p', html: `Neeche koi bhi IPv4 address likho (ya button dabao). Dekho wo bits mein kaisa dikhta hai, aur wo kis type ka hai. Type ka matlab agle section mein samjhenge:` },
    { type: 'custom', render(el) {
      const PRE = ['192.168.1.5', '10.0.2.15', '172.20.0.3', '172.40.1.1', '8.8.8.8', '127.0.0.1', '100.72.5.9', '203.0.113.10'];
      el.innerHTML = `<label>IPv4 address</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><input type="text" class="ip-in" value="192.168.1.5" aria-label="IPv4 address" style="max-width:200px;font-family:var(--f-mono)"></div>
        <div class="ip-pre" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${PRE.map(p => `<button class="chip" data-ip="${p}">${p}</button>`).join('')}</div>
        <div class="ip-bits" style="font-family:var(--f-mono);font-size:13px;margin-top:12px;display:flex;flex-wrap:wrap;gap:6px 14px"></div>
        <div class="stats"><div class="stat"><span>Type</span><strong class="ip-t"></strong></div><div class="stat"><span>Internet pe dikhega?</span><strong class="ip-v"></strong></div></div>
        <div class="calc-note ip-n"></div>`;
      const classify = o => {
        const [a, b, c] = o;
        if (a === 10) return ['Private', 'Nahi', 'RFC 1918 private range 10.0.0.0/8 (10.x.x.x). Ghar, office aur cloud ke andar ke networks ke liye. Internet ke routers ise aage nahi badhaate.'];
        if (a === 172 && b >= 16 && b <= 31) return ['Private', 'Nahi', 'RFC 1918 private range 172.16.0.0/12: sirf 172.16.x.x se 172.31.x.x. Dhyaan do: 172.40 isme nahi aata.'];
        if (a === 192 && b === 168) return ['Private', 'Nahi', 'RFC 1918 private range 192.168.0.0/16. Zyada tar ghar ke WiFi routers yahi dete hain.'];
        if (a === 127) return ['Loopback', 'Nahi', '127.x.x.x = "khud yahi computer" (localhost). Packet computer se bahar jaata hi nahi. Developers apne laptop pe server test karne ke liye use karte hain.'];
        if (a === 100 && b >= 64 && b <= 127) return ['Shared (CGNAT)', 'Nahi', '100.64.0.0/10: ISP ka apna private range. Mobile networks ek public IP ke peeche hazaaron customers rakhte hain (carrier-grade NAT, neeche samjhenge).'];
        if (a === 169 && b === 254) return ['Link-local', 'Nahi', '169.254.x.x: device ko kisi ne address nahi diya (DHCP fail), to usne khud ek bana liya. Aksar matlab: network mein kuch gadbad hai.'];
        if ((a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)) return ['Documentation', 'Nahi (reserved)', 'Ye range sirf examples aur kitaabon ke liye reserved hai, taaki example kisi asli server pe na jaaye. Isliye is course mein xyz.com ka IP 203.0.113.10 hai.'];
        if (a === 0 || a >= 224) return ['Special', 'Nahi', '0.x, 224-239 (multicast) aur 240+ khaas kaamon ke liye reserved hain.'];
        return ['Public', 'Haan', 'Public address: poori duniya mein sirf ek device (ya ek NAT router / load balancer) ke paas. Internet ke routers ise kahin se bhi dhoondh sakte hain.'];
      };
      const draw = () => {
        const s = el.querySelector('.ip-in').value.trim(), parts = s.split('.');
        const o = parts.map(Number);
        const ok = parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p)) && o.every(n => n <= 255);
        if (!ok) { el.querySelector('.ip-bits').textContent = ''; el.querySelector('.ip-t').textContent = 'Galat'; el.querySelector('.ip-v').textContent = '—'; el.querySelector('.ip-n').textContent = 'IPv4 mein 4 numbers hote hain, har ek 0 se 255, beech mein dot.'; return; }
        el.querySelector('.ip-bits').innerHTML = o.map(n => `<span><strong>${n}</strong> = ${n.toString(2).padStart(8, '0')}</span>`).join('') + `<span style="color:var(--ink-3)">(4 × 8 = 32 bits)</span>`;
        const [t, v, n] = classify(o);
        el.querySelector('.ip-t').textContent = t; el.querySelector('.ip-v').textContent = v; el.querySelector('.ip-n').textContent = n;
        el.querySelectorAll('[data-ip]').forEach(b => b.className = 'chip' + (b.dataset.ip === s ? ' on' : ''));
      };
      el.querySelector('.ip-in').oninput = draw;
      el.querySelectorAll('[data-ip]').forEach(b => b.onclick = () => { el.querySelector('.ip-in').value = b.dataset.ip; draw(); });
      draw();
    }},
    { type: 'h2', text: 'Private IP, public IP aur NAT' },
    { type: 'p', html: `Tumhare ghar ke WiFi pe laptop, phone, TV sab hain. Internet company (ISP) ne tumhe sirf <strong>ek</strong> public IP diya hai. To andar ke devices ko kya address milega?` },
    { type: 'callout', tone: 'term', title: 'Naya word: public IP aur private IP', html: `<strong>Ye kya hai:</strong> <strong>public IP</strong> poore internet mein unique hai: duniya mein sirf ek jagah. <strong>Private IP</strong> sirf ek chhote network (ghar, office, cloud) ke andar valid hai. Teen range private ke liye reserved hain: <code>10.x.x.x</code>, <code>172.16-31.x.x</code> aur <code>192.168.x.x</code>.<br><strong>Kyun chahiye:</strong> lakhon gharon mein <code>192.168.1.5</code> ho sakta hai, koi problem nahi, kyunki ye internet pe kabhi dikhta hi nahi. Isse IPv4 ke kam addresses bach jaate hain.<br><strong>Iske bina:</strong> har phone, TV, bulb ko apna public IPv4 chahiye hota, jo kab ke khatam ho chuke.` },
    { type: 'p', html: `Lekin ek sawaal: laptop ka address private hai, to xyz.com ka server jawab kahan bheje? <code>192.168.1.5</code> pe bheja to internet ke routers ko pata hi nahi wo kahan hai. Iska jawab hai <strong>NAT</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: NAT (Network Address Translation)', html: `<strong>Ye kya hai:</strong> ghar ka router bahar jaate har packet pe se private IP aur port hata ke <strong>apna public IP aur ek naya port</strong> likh deta hai. Saath mein ek table (NAT table) mein likh leta hai: "public port 40001 = laptop ka 51000". Jawab aane pe table dekh ke sahi device ko de deta hai.<br><strong>Kyun chahiye:</strong> ek public IP ke peeche poora ghar (ya office) internet chala sake.<br><strong>Iske bina:</strong> private IP wale devices internet se baat hi nahi kar paate.<br><strong>Side effect:</strong> bahar se koi naya packet aaye jiski table mein entry nahi hai, to router ko pata nahi kise de, aur wo use gira deta hai. Isliye bahar se koi seedha tumhare laptop tak nahi pahunch sakta.` },
    { type: 'p', html: `Khud chala ke dekho. Devices se requests bhejo aur NAT table bharte dekho. Phir server ke jawab bhejo, aur ek "anjaan" packet bhi:` },
    { type: 'custom', render(el) {
      const DEV = { lap: ['Laptop', '192.168.1.5'], ph: ['Phone', '192.168.1.8'], tv: ['TV', '192.168.1.12'] };
      const DST = { lap: 'xyz.com 203.0.113.10:443', ph: 'xyz.com 203.0.113.10:443', tv: 'video site 198.51.100.7:443' };
      const PUB = '49.36.10.20';
      el.innerHTML = `<div style="font-size:13px;color:var(--ink-3)">Bahar jaao:</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 10px">
          <button class="btn small" data-o="lap">Laptop → xyz.com</button><button class="btn small" data-o="ph">Phone → xyz.com</button><button class="btn small" data-o="tv">TV → video site</button></div>
        <div style="font-size:13px;color:var(--ink-3)">Andar aao (jawab):</div>
        <div class="nat-in" style="display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 10px"></div>
        <div style="overflow-x:auto"><table style="width:100%;font-size:13px"><thead><tr><th>Public port</th><th>Andar ka device</th><th>Kahan gaya</th></tr></thead><tbody class="nat-rows"></tbody></table></div>
        <div class="calc-note nat-log" style="font-family:var(--f-mono);font-size:12.5px"></div>
        <button class="btn small ghost nat-reset">Reset</button>`;
      let rows = [], next = 40001, sport = 51000, log = '';
      const draw = () => {
        el.querySelector('.nat-rows').innerHTML = rows.length ? rows.map(r => `<tr><td><code>${PUB}:${r.pp}</code></td><td>${DEV[r.d][0]} <code>${DEV[r.d][1]}:${r.sp}</code></td><td>${DST[r.d]}</td></tr>`).join('') : `<tr><td colspan="3" style="color:var(--ink-3)">Table khaali. Upar se koi request bhejo.</td></tr>`;
        el.querySelector('.nat-in').innerHTML = rows.map(r => `<button class="btn small" data-i="${r.pp}">Jawab → port ${r.pp}</button>`).join('') + `<button class="btn small" data-i="40099" style="border-color:var(--red)">Anjaan packet → port 40099</button>`;
        el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
          const pp = +b.dataset.i, r = rows.find(x => x.pp === pp);
          log = r ? `IN : ${PUB}:${pp} → table mein mila → ${DEV[r.d][0]} ${DEV[r.d][1]}:${r.sp}. Pahuncha ✓`
            : `IN : ${PUB}:${pp} → table mein koi entry nahi → kise doon? DROP ✗ (bahar se koi seedha andar nahi aa sakta)`;
          draw();
        });
        el.querySelector('.nat-log').textContent = log || 'Log yahan dikhega.';
      };
      el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
        const d = b.dataset.o; sport += 7;
        const r = { d, sp: sport, pp: next++ }; rows.push(r);
        log = `OUT: ${DEV[d][1]}:${r.sp} → NAT → ${PUB}:${r.pp} → ${DST[d]}  (server ko sirf ${PUB} dikhta hai)`;
        draw();
      });
      el.querySelector('.nat-reset').onclick = () => { rows = []; next = 40001; sport = 51000; log = ''; draw(); };
      draw();
    }},
    { type: 'p', html: `Laptop aur phone dono ne xyz.com khola: server ko dono requests <strong>ek hi IP</strong> (<code>49.36.10.20</code>) se aayin, bas port alag (40001, 40002). Router port dekh ke jawab sahi device ko deta hai. Aur port 40099 wala anjaan packet gira diya gaya, kyunki kisi andar wale ne us baatcheet ko shuru nahi kiya tha.` },
    { type: 'callout', tone: 'term', title: 'Naya word: CGNAT (carrier-grade NAT)', html: `<strong>Ye kya hai:</strong> NAT ke upar ek aur NAT, ISP ke level pe. Mobile network tumhare phone ko bhi private jaisa address (aksar <code>100.64.x.x</code> range) deta hai, aur hazaaron customers ek public IP share karte hain.<br><strong>Kyun:</strong> ISPs ke paas bhi IPv4 kam hain.<br><strong>System design pe asar:</strong> xyz.com ko ek IP se hazaaron asli users aate dikh sakte hain. Isliye "ek IP = ek user" maan ke rate limit ya ban lagana khatarnak hai.` },
    { type: 'h2', text: 'Port: computer ke andar kaunsa program?' },
    { type: 'p', html: `xyz.com ke server pe ek saath kai programs chal sakte hain: web server, database, cache. Packet machine tak pahunch gaya. Ab kis program ko diya jaaye? Iske liye <strong>port</strong> hota hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: port', html: `<strong>Ye kya hai:</strong> 0 se 65535 tak ka ek number jo machine ke andar ek program ko pehchanta hai. TCP aur UDP (layer 4) packet ke label pe port likhte hain. Server program ek port pe "sunta" (listen karta) hai, yaani us port pe aane wale packets usi ko milte hain.<br><strong>Kyun chahiye:</strong> ek machine, ek IP, lekin kai programs. Port batata hai packet kiska hai.<br><strong>Iske bina:</strong> ek machine pe sirf ek hi network program chal paata.<br><strong>Example:</strong> IP address building ka pata hai, port andar ka flat number. Courier ko dono chahiye.` },
    { type: 'table', head: ['Port', 'Kaun sunta hai', 'Internet se khula hona chahiye?'], rows: [
      ['443', 'HTTPS (web server)', 'Haan'],
      ['80', 'HTTP (aksar sirf HTTPS pe redirect ke liye)', 'Haan'],
      ['53', 'DNS (UDP, aur bade jawab ke liye TCP)', 'Sirf DNS server pe'],
      ['22', 'SSH (server mein remote login)', 'Nahi, sirf office/VPN se'],
      ['5432', 'PostgreSQL database', 'Bilkul nahi'],
      ['6379', 'Redis', 'Bilkul nahi'],
      ['8080', 'App server (andar, load balancer ke peeche)', 'Nahi'],
    ]},
    { type: 'p', html: `IP + port milke ek poora pata bante hain, jaise <code>203.0.113.10:443</code>. Browser address bar mein port nahi likhte, kyunki <code>https://</code> ka matlab hi default port 443 hai. Ports 0-1023 "well-known" hain: in pe aam taur pe mashhoor services chalti hain, aur Linux pe inhe kholne ke liye khaas permission chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: ephemeral port', html: `<strong>Ye kya hai:</strong> client ki taraf ka "temporary" port. Jab tumhara browser connection banata hai to OS khud ek khaali port chun leta hai (jaise 51007), aur connection band hote hi wapas le leta hai.<br><strong>Kitne:</strong> IANA ki range 49152-65535 hai. Linux by default 32768-60999 use karta hai (28,232 ports).<br><strong>Kyun yaad rakhna:</strong> ye ginti limited hai. Neeche "port exhaustion" mein iska asar dekhenge.` },

    { type: 'h2', text: 'Socket: ek connection ka poora pata' },
    { type: 'callout', tone: 'term', title: 'Naya word: socket', html: `<strong>Ye kya hai:</strong> program ke andar network connection ka ek "handle", jaise file kholne pe file handle milta hai. Program socket mein likhta hai to data jaata hai, socket se padhta hai to data aata hai.<br><strong>Pehchaan:</strong> ek TCP connection ko chaar cheezein milke unique banati hain (<strong>4-tuple</strong>): client IP, client port, server IP, server port. Protocol (TCP/UDP) jod do to 5-tuple.<br><strong>Kyun chahiye:</strong> server ek hi port 443 pe hazaaron users se baat karta hai. 4-tuple se use pata chalta hai kaunsa packet kis user ki baatcheet ka hai.<br><strong>Iske bina:</strong> ek port pe ek hi user se baat ho paati.` },
    { type: 'table', head: ['Connection', 'Client IP', 'Client port', 'Server IP', 'Server port'], rows: [
      ['Riya ka laptop', '49.36.10.20', '40001', '203.0.113.10', '443'],
      ['Riya ka phone (same ghar)', '49.36.10.20', '40002', '203.0.113.10', '443'],
      ['Aman (doosra shehar)', '106.51.7.9', '51007', '203.0.113.10', '443'],
    ]},
    { type: 'p', html: `Teeno ka server wala hissa same hai (<code>203.0.113.10:443</code>). Phir bhi teeno alag connections hain, kyunki 4-tuple ka koi na koi hissa alag hai. Server pe ek <strong>listening socket</strong> 443 pe naye connections ka intezaar karta hai, aur har naye connection ke liye ek alag connection socket ban jaata hai. Isi tarah WhatsApp jaise systems ek machine pe lakhon khule connections rakhte hain: limit port ki nahi, memory aur CPU ki hoti hai.` },
    { type: 'callout', tone: 'warn', title: 'Interview depth: port exhaustion', html: `Ulta case socho. xyz.com ka <strong>load balancer</strong> (ek IP) andar ke <strong>ek</strong> app server (<code>10.0.1.7:8080</code>) se connections kholta hai. Ab 4-tuple mein teen cheezein fix hain (LB ka IP, server IP, server port). Sirf LB ka ephemeral port badal sakta hai. Linux ki default range mein 28,232 ports, to us ek server ke saath max ~28 hazaar connections ek saath. Upar se band hua connection kuch der (TIME_WAIT, aam taur pe 60 s) port ko roke rakhta hai.<br><strong>Ilaaj:</strong> connections reuse karo (keep-alive, pool), backend ke zyada IPs/ports, LB ko kai source IPs do, ya range badhao.` },
    { type: 'h2', text: 'Firewall: kaunsa darwaza khula, kaunsa band' },
    { type: 'p', html: `xyz.com ke server pe database port 5432 pe sun raha hai. Agar ye port internet se khula hai, to duniya bhar ke bots din raat har IP ke common ports try karte rehte hain. Ek kamzor password, aur poora data gaya. Isliye beech mein ek chowkidaar chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: firewall', html: `<strong>Ye kya hai:</strong> niyamon ki ek list jo har aane wale packet ko check karti hai: "kis IP se, kis port pe aa sakta hai". Jo niyam mein nahi, wo gira (drop) diya jaata hai.<br><strong>Kyun chahiye:</strong> sirf wahi darwaze khule rahein jo users ke liye hain (443), baaki sab band.<br><strong>Iske bina:</strong> database, Redis, admin tools: sab bots ke saamne.<br><strong>Example:</strong> cloud mein ise <strong>security group</strong> kehte hain: "port 443 sabke liye; port 5432 sirf app servers ke security group se".` },
    { type: 'p', html: `Chala ke dekho: ghar se request (NAT + firewall), ek ghar ke do devices, aur database port pe hamla.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'lap', label: 'Laptop', sub: '192.168.1.5', x: 90, y: 80, w: 130, kind: 'client', info: 'Ye kya hai: ghar ka laptop. Iska IP private hai: sirf ghar ke WiFi ke andar valid.' },
        { id: 'ph', label: 'Phone', sub: '192.168.1.8', x: 90, y: 200, w: 130, kind: 'client', info: 'Ye kya hai: same ghar ka phone, ek aur private IP. Bahar ki duniya ko laptop aur phone dono ek hi public IP se dikhte hain.' },
        { id: 'rt', label: 'Home router', sub: 'public 49.36.10.20', x: 290, y: 140, w: 160, kind: 'net', info: 'Ye kya hai: ghar ka darwaza. Iske paas ek public IP hai aur NAT table, jo yaad rakhti hai ki kaunsa jawab kis device ka hai.' },
        { id: 'hk', label: 'Attacker', sub: 'internet pe koi', x: 290, y: 290, w: 150, kind: 'threat', hidden: true, info: 'Ye kya hai: internet pe bots, jo din raat har IP ke common ports (22, 5432, 6379...) try karte rehte hain.' },
        { id: 'fw', label: 'Firewall', sub: 'sirf 443 allowed', x: 480, y: 140, w: 140, kind: 'edge', info: 'Ye kya hai: xyz.com ke server ke aage niyamon ki list. Port 443 sabke liye khula. Baaki sab ports bahar se band: drop.' },
        { id: 'web', label: 'Web server', sub: 'port 443', x: 645, y: 80, w: 130, kind: 'server', info: 'Ye kya hai: xyz.com ka web server program, machine 203.0.113.10 pe port 443 pe sun raha hai.' },
        { id: 'db', label: 'PostgreSQL', sub: 'port 5432', x: 645, y: 200, w: 130, kind: 'data', info: 'Ye kya hai: database program, port 5432 pe. Ye sirf andar ke programs (app servers) ke liye hai, internet ke liye nahi.' },
      ],
      edges: [{ a: 'lap', b: 'rt' }, { a: 'ph', b: 'rt' }, { a: 'rt', b: 'fw' }, { a: 'hk', b: 'fw', dashed: true }, { a: 'fw', b: 'web' }, { a: 'fw', b: 'db', dashed: true }],
      scenarios: [
        { name: 'Laptop se xyz.com', steps: [
          { title: 'Laptop packet bhejta hai', text: 'Source mein laptop ka private IP aur OS ka chuna hua ephemeral port (51000) hai. Destination: xyz.com, port 443.', go: 'lap>rt', msg: 'from 192.168.1.5:51000  →  to 203.0.113.10:443' },
          { title: 'Router NAT karta hai', text: 'Router source badal deta hai apne public IP se, aur NAT table mein likh leta hai: "public port 40001 = laptop ka 51000".', focus: ['rt'], set: { rt: { sub: 'NAT: 40001 → laptop' } }, msg: 'from 49.36.10.20:40001  →  to 203.0.113.10:443' },
          { title: 'Firewall check', text: 'Port 443? Allowed. Andar jaane do.', go: 'rt>fw>web', after: { fw: { state: 'ok' } } },
          { title: 'Jawab wapas', text: 'Server jawab bhejta hai 49.36.10.20:40001 pe. Router table dekh ke samajh jaata hai ki ye laptop ka hai.', go: 'res:web>fw>rt>lap', msg: 'to 49.36.10.20:40001  →  NAT  →  192.168.1.5:51000' },
        ]},
        { name: 'Phone aur laptop saath mein', steps: [
          { title: 'Dono ek saath request bhejte hain', text: 'Dono ka bahar wala IP same hoga: 49.36.10.20. Farak sirf port ka.', parallel: true, go: ['lap>rt', 'ph>rt'], set: { rt: { sub: '40001→lap, 40002→ph' } } },
          { title: 'Server ko dono same ghar se dikhte hain', text: 'Server ke liye dono requests ek hi IP se aayin, alag ports se. 4-tuple alag, to do alag connections.', parallel: true, go: ['rt>fw>web', 'rt>fw>web'] },
          { title: 'Router sahi device ko deta hai', text: 'Port number dekh ke router jawab sahi device tak pahunchata hai. Isliye ek public IP pe pura ghar chal jaata hai.', parallel: true, go: ['res:web>fw>rt>lap', 'res:web>fw>rt>ph'] },
        ]},
        { name: 'Database port pe hamla', steps: [
          { title: 'Internet pe koi port 5432 try karta hai', text: 'Bots har server pe common database ports scan karte hain.', show: ['hk'], go: 'lost:hk>fw', after: { fw: { state: 'ok', sub: '5432: DROPPED' } }, msg: 'from 185.x.x.x  →  to 203.0.113.10:5432' },
          { title: 'Firewall ne rok diya', text: 'Database machine pe chal raha hai, lekin bahar se uska darwaza band hai. Isliye databases ko hamesha <strong>private network</strong> mein rakhte hain, aur sirf app servers ko unse baat karne dete hain.', focus: ['db'], set: { db: { state: 'ok', sub: 'safe, private' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "mera IP 192.168.1.5 hai, koi bhi mujhe dhoondh lega"', html: `Galat. Ye private IP hai. Internet ko tumhare router ka public IP dikhta hai, aur NAT ki wajah se bahar se koi seedha tumhare laptop tak nahi aa sakta jab tak tum khud baat shuru na karo. (NAT security ke liye bana nahi tha, ye ek side effect hai. Asli suraksha firewall ka kaam hai.)` },
    { type: 'h2', text: 'DNS records: naam se IP tak ke alag alag parche' },
    { type: 'p', html: `"How the web works" lesson mein dekha tha ki DNS <code>xyz.com</code> ko IP mein badalta hai. Ab thoda andar dekho: DNS ek domain ke liye kai tarah ki jaankari rakhta hai. Har jaankari ek <strong>record</strong> hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: DNS record aur TTL', html: `<strong>Ye kya hai:</strong> DNS mein ek line: "is naam ke liye, is type ki, ye value". Jaise phonebook mein ek naam ke aage ghar ka number, office ka number, email.<br><strong>TTL (time to live):</strong> har record ke saath ek number (seconds mein): "is jawab ko itni der tak yaad (cache) rakh sakte ho".<br><strong>Kyun chahiye:</strong> ek domain ke kai kaam hain: website, email, CDN, verification. Har kaam ka alag record.<br><strong>Iske bina:</strong> email kahan jaaye, www kahan jaaye, IPv6 users kahan jaayein: kisi ko pata nahi.` },
    { type: 'table', head: ['Type', 'Example (xyz.com)', 'Matlab', 'Kab kaam aata hai'], rows: [
      ['A', '<code>xyz.com → 203.0.113.10</code>', 'Naam ka IPv4 address', 'Har website ka basic record'],
      ['AAAA', '<code>xyz.com → 2001:db8::10</code>', 'Naam ka IPv6 address', 'IPv6 users ke liye (dual-stack)'],
      ['CNAME', '<code>www.xyz.com → xyz.com</code><br><code>static.xyz.com → xyz.cdn-provider.net</code>', '"Ye naam doosre naam ka nickname hai, uska IP lo"', 'CDN ya kisi service pe point karna, jinke IP badalte rehte hain'],
      ['MX', '<code>xyz.com → 10 mail.xyz.com</code>', 'Is domain ki email kaunsa server lega (number = priority)', 'Email'],
      ['TXT', '<code>xyz.com → "v=spf1 ..."</code>', 'Koi bhi text', 'Email anti-spam (SPF), domain ki ownership saabit karna'],
      ['NS', '<code>xyz.com → ns1.dns-provider.com</code>', 'Is domain ke records kaunse DNS server ke paas hain', 'Domain kis DNS company pe hai'],
    ]},
    { type: 'code', text: `$ dig xyz.com A
xyz.com.    300    IN    A    203.0.113.10
            ^^^ TTL = 300 s: resolvers 5 minute tak ye jawab cache karenge

$ dig static.xyz.com
static.xyz.com.         3600  IN  CNAME  xyz.cdn-provider.net.
xyz.cdn-provider.net.     60  IN  A      198.51.100.21` },
    { type: 'list', items: [
      `<strong>TTL ka trade-off:</strong> lamba TTL (1 din) = kam DNS queries, tez, lekin IP badla to purana IP ek din tak logon ke paas. Chhota TTL (60 s) = badlav jaldi failta hai, lekin zyada queries. Server shift karne se pehle TTL chhota kar do, shift karo, phir wapas bada.`,
      `<strong>DNS load balancing:</strong> ek naam ke kai A records (kai IPs) de sakte ho. Clients unme se koi bhi chunte hain. Ye Phase 2 mein load balancer lesson mein detail mein aayega.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "xyz.com (bina www) pe bhi CNAME laga do"', html: `Nahi chalta. Domain ke root (apex, jaise <code>xyz.com</code>) pe pehle se NS aur SOA records hote hain, aur CNAME ke saath us naam pe koi aur record nahi ho sakta. Isliye DNS companies "ALIAS / ANAME / CNAME flattening" jaisa feature deti hain jo andar se CNAME ki tarah kaam karta hai lekin bahar A record dikhata hai.` },

    { type: 'h2', text: 'System design mein ye kahan aata hai' },
    { type: 'list', items: [
      `<strong>Private network (VPC):</strong> cloud mein tumhare servers, databases, caches ek private network mein hote hain (jaise <code>10.0.x.x</code>). Bahar se sirf Load Balancer ka public IP dikhta hai. Ye default security design hai.`,
      `<strong>Ek public IP, peeche bahut servers:</strong> users ko ek IP dikhta hai, LB andar ke private IPs pe forward karta hai. Servers badlo, users ko pata bhi nahi chalta.`,
      `<strong>Lakhon connections:</strong> 4-tuple ki wajah se ek server port 443 pe lakhon connections le sakta hai. Limit memory, CPU aur file handles ki hoti hai.`,
      `<strong>Port exhaustion:</strong> LB ya proxy se ek backend tak connections ki limit ephemeral ports se aati hai. Connections reuse karo.`,
      `<strong>IP pe bharosa mat karo:</strong> NAT aur CGNAT ki wajah se ek IP ke peeche ek ghar, ek office, ya hazaaron mobile users ho sakte hain. Rate limit aur ban user ID / API key pe bhi lagao.`,
      `<strong>IPv6 bhi chalao:</strong> India jaise markets mein zyada users IPv6 pe hain. Load balancer, CDN aur DNS (AAAA) dono pe ready rakho.`,
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>Kya public, kya private?</strong> Bahar sirf wahi jo users ko seedha chahiye: load balancer / CDN, port 443 (aur 80 sirf redirect ke liye). App servers, databases, caches, queues: hamesha private IPs pe, firewall (security group) ke peeche, sirf unhi ke liye khule jinhe zarurat hai. Admin access (SSH 22) sirf VPN ya <strong>bastion</strong> (ek akela, kaske band kiya server, jiske through hi andar login hota hai) se.` },
    { type: 'diagram', title: 'IP, NAT, ports aur firewall: poori picture', height: 570,
      groups: [
        { label: 'Ghar (private IPs)', x: 16, y: 44, w: 152, h: 248 },
        { label: 'xyz.com cloud (VPC, private IPs)', x: 330, y: 244, w: 360, h: 316 },
      ],
      nodes: [
        { id: 'lap', label: 'Laptop', sub: '192.168.1.5', x: 92, y: 110, w: 130, kind: 'client', info: 'Ye kya hai: ghar ka laptop, private IP ke saath. Har connection ke liye OS ek ephemeral port chunta hai.' },
        { id: 'ph', label: 'Phone', sub: '192.168.1.8', x: 92, y: 236, w: 130, kind: 'client', info: 'Ye kya hai: same ghar ka phone. Bahar se laptop aur phone dono ek hi public IP se dikhte hain, bas ports alag.' },
        { id: 'rt', label: 'Home router', sub: 'NAT, 49.36.10.20', x: 290, y: 160, w: 160, kind: 'net', info: 'Ye kya hai: ghar ka darwaza, jiske paas ek public IP hai. NAT table se private IP:port ko public IP:port mein badalta hai aur jawab sahi device ko deta hai.' },
        { id: 'dns', label: 'DNS', sub: 'A / AAAA records', x: 290, y: 40, w: 150, kind: 'net', info: 'Ye kya hai: internet ki phonebook. A record xyz.com ka IPv4 deta hai, AAAA IPv6. TTL tak jawab cache hota hai.' },
        { id: 'hk', label: 'Attacker', sub: 'bot, port scan', x: 640, y: 50, w: 140, kind: 'threat', info: 'Ye kya hai: internet pe bots jo har IP ke 22, 5432, 6379 jaise ports try karte hain. Firewall inhe pehle hi gira deta hai.' },
        { id: 'fw', label: 'Firewall', sub: 'sirf 443 khula', x: 510, y: 160, w: 150, kind: 'edge', info: 'Ye kya hai: security group / firewall: niyamon ki list. Internet se sirf port 443 load balancer tak. Baaki sab drop.' },
        { id: 'lb', label: 'Load Balancer', sub: '203.0.113.10:443', x: 510, y: 300, w: 170, kind: 'edge', info: 'Ye kya hai: xyz.com ka ek public pata. DNS ka A record isi ka IP batata hai. Andar ke private servers tak requests baant deta hai.' },
        { id: 'app', label: 'App servers', sub: '10.0.1.x:8080', x: 510, y: 405, w: 150, kind: 'server', info: 'Ye kya hai: asli kaam karne wale servers, sirf private IPs pe. Internet inhe seedha dekh hi nahi sakta. LB se aane wale connections reuse hote hain, taaki port exhaustion na ho.' },
        { id: 'db', label: 'PostgreSQL', sub: '10.0.2.5:5432', x: 420, y: 505, w: 140, kind: 'data', info: 'Ye kya hai: database, private IP aur port 5432. Firewall niyam: sirf app servers ke security group se allowed.' },
        { id: 'redis', label: 'Redis', sub: '10.0.2.9:6379', x: 610, y: 505, w: 130, kind: 'cache', info: 'Ye kya hai: cache, port 6379. Kabhi internet pe khula nahi: khule Redis ko bots minutes mein dhoondh lete hain.' },
      ],
      edges: [
        { a: 'lap', b: 'rt', n: 1 },
        { a: 'ph', b: 'rt' },
        { a: 'rt', b: 'dns', label: 'A record?' },
        { a: 'rt', b: 'fw', n: 2 },
        { a: 'fw', b: 'lb', n: 3 },
        { a: 'lb', b: 'app', n: 4 },
        { a: 'app', b: 'db', n: 5 },
        { a: 'app', b: 'redis' },
        { a: 'hk', b: 'fw', kind: 'bad', dashed: true, label: ':5432 drop' },
      ],
      paths: [
        { name: 'Page kholna', text: 'Laptop DNS se IP leta hai, router NAT karta hai, firewall 443 allow karta hai, LB request private app server tak, phir database.', go: ['lap>rt>dns', 'lap>rt>fw>lb>app>db'] },
        { name: 'Ek ghar, ek public IP', text: 'Laptop aur phone dono router ke public IP se bahar jaate hain. Server ko ek IP dikhta hai, alag ports.', go: ['lap>rt>fw>lb', 'ph>rt>fw>lb'] },
        { name: 'Database pe hamla', text: 'Bot ne port 5432 try kiya. Firewall ne pehle hi gira diya. Database private IP pe hai, internet se dikhta hi nahi.', go: ['hk>fw'] },
        { name: 'Andar ki baat', text: 'App servers private IPs pe database (5432) aur Redis (6379) se baat karte hain. Ye traffic kabhi internet pe nahi jaata.', go: ['lb>app>db', 'app>redis'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>IP = kaunsa computer (layer 3). Port = us computer pe kaunsa program (layer 4). Saath mein: <code>203.0.113.10:443</code>.</li>
      <li>IPv4 = 32 bits, ~4.3 billion, khatam (2011). IPv6 = 128 bits. Aaj dono saath chalte hain (dual-stack); India mein IPv6 bahut aage.</li>
      <li>Private ranges: 10.x, 172.16-31.x, 192.168.x. Sirf andar valid, internet pe nahi dikhte.</li>
      <li>NAT: router private IP:port ko apne public IP:port se badalta hai aur table mein yaad rakhta hai. Bahar se anjaan packet = drop.</li>
      <li>Ek connection = 4-tuple (client IP, client port, server IP, server port). Isliye ek port pe lakhon users. Ulta, ek backend tak connections ephemeral ports se limited.</li>
      <li>Firewall / security group: sirf 443 bahar se. Database, Redis, SSH kabhi internet pe nahi.</li>
      <li>DNS records: A (IPv4), AAAA (IPv6), CNAME (nickname), MX (email), TXT, NS. TTL = kitni der cache.</li>
      <li>Ek IP ke peeche bahut log ho sakte hain (NAT, CGNAT): IP ko "ek user" mat samjho.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Private IP + NAT: ek public IP pe poora ghar ya office, IPv4 ki kami ke bawajood', 'Private network + firewall: database aur cache internet se chhupe', 'Ports aur sockets: ek machine pe kai programs, ek port pe lakhon connections', 'DNS records + TTL: IP badlo, naam wahi; CDN aur email alag jagah point kar sakte ho'], costs: ['NAT ke peeche devices tak bahar se seedha nahi pahunch sakte (peer-to-peer calls ko jugaad chahiye)', 'CGNAT: ek IP pe hazaaron users, IP-based rate limit aur ban galat log pakadte hain', 'Ephemeral ports limited: ek backend tak connections ki hadd', 'Lamba DNS TTL = IP badalne pe purana address der tak cache mein', 'IPv4 + IPv6 dono chalane ka extra kaam'] },
    { type: 'think', questions: [
      { q: 'Office mein 500 employees hain aur sab ek hi public IP se bahar jaate hain. Agar xyz.com "ek IP se max 100 requests/minute" ka rate limit lagaye to kya hoga?', a: 'Poore office ko ek user samjha jayega aur legit log block ho jayenge. Isliye rate limiting aksar IP ke saath user ID ya API key pe bhi hoti hai.' },
      { q: 'Redis server ko public internet pe port 6379 khol ke rakhna kyun khatarnak hai?', a: 'Koi bhi bot dhoondh ke usme data padh, likh ya mita sakta hai. Databases aur caches hamesha private network mein, firewall ke peeche, sirf app servers ke liye.' },
      { q: 'Tumhara load balancer ek hi backend server ko har request pe naya TCP connection kholta hai, aur peak pe "cannot assign requested address" error aane lage. Kya ho raha hai?', a: 'Port exhaustion. LB IP, backend IP aur backend port fix hain, sirf LB ka ephemeral port badalta hai (~28k Linux pe), aur band connections TIME_WAIT mein port roke rehte hain. Ilaaj: keep-alive / connection pool se reuse, backend ke zyada IPs ya ports, ya LB ko kai source IPs.' },
      { q: 'xyz.com naye server pe shift ho raha hai (naya IP). A record ka TTL 86400 (1 din) hai. Shift wale din kya karoge?', a: 'Ek din pehle TTL ko 60-300 s kar do, taaki purane lambe cache khatam ho jaayein. Shift ke din A record badlo: users minutes mein naye IP pe. Kuch der dono servers chalu rakho. Sab theek ho to TTL wapas bada.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Port kya batata hai?', options: ['Kaunsa computer', 'Computer ka kaunsa program', 'Packet kitna bada hai'], answer: 1, explain: 'IP = machine, port = us machine pe chalne wala program.' },
      { q: '192.168.1.5 kaisa IP hai?', options: ['Public', 'Private', 'IPv6'], answer: 1, explain: '192.168.x.x, 10.x.x.x aur 172.16-31.x.x private ranges hain, sirf local network mein valid.' },
      { q: '172.40.1.1 kaisa IP hai?', options: ['Private, kyunki 172 se shuru hai', 'Public, kyunki private range sirf 172.16 se 172.31 tak hai', 'Loopback'], answer: 1, explain: 'Private range 172.16.0.0/12 hai: sirf 172.16.x.x se 172.31.x.x. 172.40 uske bahar hai.' },
      { q: 'Ghar ke saare devices ek public IP se internet kaise use karte hain?', options: ['DNS', 'NAT', 'TLS'], answer: 1, explain: 'Router NAT table mein yaad rakhta hai ki kaunsa public port kis device ka hai.' },
      { q: 'Server port 443 pe ek saath lakhon users se kaise baat karta hai?', options: ['Har user ko alag port milta hai server pe', 'Har connection 4-tuple (client IP, client port, server IP, server port) se alag pehchana jaata hai', 'Nahi kar sakta'], answer: 1, explain: 'Server ka IP:port sabke liye same hai, lekin client IP ya client port alag hai, to har connection unique hai.' },
      { q: 'xyz.com ka IPv6 address kis DNS record mein jaata hai?', options: ['A', 'AAAA', 'MX'], answer: 1, explain: 'A = IPv4, AAAA = IPv6. MX email server batata hai.' },
    ]},
    { type: 'sources', note: 'Address ranges, port ranges aur dates inhi sources se.', items: [
      { title: 'RFC 1918: Address Allocation for Private Internets', publisher: 'IETF', official: true, year: 1996, url: 'https://www.rfc-editor.org/rfc/rfc1918.html', used: 'Private ranges 10/8, 172.16/12, 192.168/16.' },
      { title: 'RFC 6598: IANA-Reserved IPv4 Prefix for Shared Address Space', publisher: 'IETF', official: true, year: 2012, url: 'https://www.rfc-editor.org/rfc/rfc6598.html', used: '100.64.0.0/10 reserved for carrier-grade NAT.' },
      { title: 'RFC 5737: IPv4 Address Blocks Reserved for Documentation', publisher: 'IETF', official: true, year: 2010, url: 'https://www.rfc-editor.org/rfc/rfc5737.html', used: '192.0.2.0/24, 198.51.100.0/24 and 203.0.113.0/24 are for examples only.' },
      { title: 'RFC 6335: IANA Procedures for Service Name and Port Number Registry', publisher: 'IETF', official: true, year: 2011, url: 'https://www.rfc-editor.org/rfc/rfc6335.html', used: 'System ports 0-1023, dynamic/ephemeral range 49152-65535.' },
      { title: 'The IANA IPv4 Address Free Pool is Now Depleted', publisher: 'ARIN', official: true, year: 2011, url: 'https://www.arin.net/vault/announcements/20110203', used: 'The last five /8 blocks were handed to the regional registries on 3 February 2011.' },
      { title: 'Google hits 50% IPv6', publisher: 'APNIC blog', official: true, year: 2026, url: 'https://blog.apnic.net/2026/04/28/google-hits-50-ipv6', used: 'Google IPv6 measurement crossed 50% on 23 April 2026; India and Reliance Jio as large IPv6 deployments.' },
      { title: 'IPv6 deployment', publisher: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/IPv6_deployment', used: 'India IPv6 share of roughly 70%+ in Google measurements.' },
      { title: 'ip-sysctl: ip_local_port_range', publisher: 'Linux kernel documentation', official: true, url: 'https://docs.kernel.org/networking/ip-sysctl.html', used: 'Default local (ephemeral) port range 32768-60999.' },
    ]},
  ],
});
