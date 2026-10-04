Lesson.register({
  id: 'ip-and-ports',
  title: 'IP addresses and ports',
  minutes: 22,
  summary: `An IP address tells you "which computer". A port tells you "which program on that computer". Together they form the exact address of every conversation on the internet. Also in this lesson: IPv4 vs IPv6, private vs public IPs, NAT, sockets, firewalls and DNS records.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Every message on the internet needs an address, or it will not reach anywhere.<br>The address has two parts: <strong>which computer</strong> (the IP address) and <strong>which program on that computer</strong> (the port). Like the address of a building and the flat number inside it.<br>In this lesson we will see: what addresses look like, why they ran out, how 10 phones in one home use the internet through one address (NAT), and how we keep the database door of a server closed to outsiders (the firewall).` },

    { type: 'h2', text: 'IP address: the address of a computer' },
    { type: 'callout', tone: 'term', title: 'Remember: IP address', html: `<strong>What it is:</strong> a number address for every computer (or network card) on the internet, like <code>203.0.113.10</code>.<br><strong>Why we need it:</strong> a packet must know where to go, and where the reply should come back to.<br><strong>Without it:</strong> there is no way to send data, like a letter with no address.<br><strong>Example:</strong> in earlier lessons, DNS turned <code>xyz.com</code> into <code>203.0.113.10</code>. That is the IP of the xyz.com server.` },
    { type: 'p', html: `Every packet on the internet has two IPs on its label: the <strong>source IP</strong> (where it came from) and the <strong>destination IP</strong> (where it is going). On the way, routers only look at the destination and push the packet towards the next router. This is the job of layer 3 (remember the layers from the last lesson).` },
    { type: 'callout', tone: 'term', title: 'New word: router', html: `<strong>What it is:</strong> a machine that moves packets from one network towards another. Each router has a "map" (a routing table): "send packets for 203.x that way".<br><strong>Why we need it:</strong> your phone and the xyz.com server are not joined by a direct wire. In between, 10-20 routers pass the packet from hand to hand.<br><strong>Without it:</strong> only computers on the same network could talk to each other. There would be no internet.<br><strong>Example:</strong> your home WiFi router joins your home network to the ISP's network.` },

    { type: 'h2', text: 'IPv4 vs IPv6: why did addresses run out?' },
    { type: 'p', html: `<code>203.0.113.10</code> is an <strong>IPv4</strong> address: 4 numbers, each from 0 to 255. Why 255? Because each number is written with <strong>8 bits</strong> (8 zeros-or-ones), and 8 bits can make 256 different numbers (0 to 255). 4 × 8 = <strong>32 bits</strong>. Total possible addresses: 2<sup>32</sup> = about <strong>4.3 billion</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: bit', html: `<strong>What it is:</strong> the smallest piece of information in a computer: 0 or 1. 8 bits = 1 byte.<br><strong>Why it matters here:</strong> the more bits an address has, the more different addresses you can make. Each extra bit doubles the count.<br><strong>Example:</strong> 3 bits can make 8 different things (000, 001, ... 111). 32 bits can make 4.3 billion.` },
    { type: 'p', html: `In the 1980s, 4.3 billion seemed like a lot. Today the world has far more devices than that: phones, laptops, TVs, cameras and servers. So the addresses ran out: on 3 February 2011, IANA (which hands out the world's addresses) gave its last IPv4 blocks to the regions. Two fixes came out of this: (1) <strong>private IPs + NAT</strong>, which runs in every home today, and (2) <strong>IPv6</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: IPv6', html: `<strong>What it is:</strong> the new version of IP, where an address is <strong>128 bits</strong> long. It is written as 8 parts, each in hexadecimal (0-9 and a-f), like <code>2001:db8:0:0:0:0:0:1</code>. A run of zeros is shortened to <code>::</code>: <code>2001:db8::1</code>.<br><strong>Why we need it:</strong> 2<sup>128</sup> addresses is so many that every device can have its own public address, without the NAT workaround.<br><strong>Without it:</strong> we would have to buy IPv4 addresses for new users (they sell at a high price), and the problems of NAT would grow.<br><strong>Example:</strong> in Google's measurement, on 23 April 2026, 50% of users came over IPv6 for the first time. India is far ahead here (about 70%+), because new networks like Jio used IPv6 from the start.` },
    { type: 'table', head: ['', 'IPv4', 'IPv6'], rows: [
      ['What it looks like', '<code>203.0.113.10</code>', '<code>2001:db8::8a2e:370:7334</code>'],
      ['Size', '32 bits', '128 bits'],
      ['How many possible', '~4.3 billion (ran out)', '~3.4 × 10<sup>38</sup> (practically will never run out)'],
      ['Needs NAT?', 'Almost always', 'Usually not'],
      ['DNS record', 'A record', 'AAAA record (comes below)'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "IPv6 came, so IPv4 is switched off"', html: `No. IPv4 and IPv6 cannot talk to each other directly (they are different "languages"). So today most servers and phones run <strong>dual-stack</strong>: they keep both addresses. Your phone tries IPv6 first, and if that does not work, IPv4. xyz.com should also be reachable on both, or some users will not reach you.` },
    { type: 'p', html: `Type any IPv4 address below (or press a button). See what it looks like in bits, and what type it is. We will explain the types in the next section:` },
    { type: 'custom', render(el) {
      const PRE = ['192.168.1.5', '10.0.2.15', '172.20.0.3', '172.40.1.1', '8.8.8.8', '127.0.0.1', '100.72.5.9', '203.0.113.10'];
      el.innerHTML = `<label>IPv4 address</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><input type="text" class="ip-in" value="192.168.1.5" aria-label="IPv4 address" style="max-width:200px;font-family:var(--f-mono)"></div>
        <div class="ip-pre" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${PRE.map(p => `<button class="chip" data-ip="${p}">${p}</button>`).join('')}</div>
        <div class="ip-bits" style="font-family:var(--f-mono);font-size:13px;margin-top:12px;display:flex;flex-wrap:wrap;gap:6px 14px"></div>
        <div class="stats"><div class="stat"><span>Type</span><strong class="ip-t"></strong></div><div class="stat"><span>Visible on the internet?</span><strong class="ip-v"></strong></div></div>
        <div class="calc-note ip-n"></div>`;
      const classify = o => {
        const [a, b, c] = o;
        if (a === 10) return ['Private', 'No', 'RFC 1918 private range 10.0.0.0/8 (10.x.x.x). For networks inside homes, offices and the cloud. Internet routers do not pass it along.'];
        if (a === 172 && b >= 16 && b <= 31) return ['Private', 'No', 'RFC 1918 private range 172.16.0.0/12: only 172.16.x.x to 172.31.x.x. Careful: 172.40 is not in it.'];
        if (a === 192 && b === 168) return ['Private', 'No', 'RFC 1918 private range 192.168.0.0/16. Most home WiFi routers give out these.'];
        if (a === 127) return ['Loopback', 'No', '127.x.x.x = "this same computer" (localhost). The packet never leaves the computer. Developers use it to test a server on their own laptop.'];
        if (a === 100 && b >= 64 && b <= 127) return ['Shared (CGNAT)', 'No', '100.64.0.0/10: the ISP\'s own private range. Mobile networks put thousands of customers behind one public IP (carrier-grade NAT, explained below).'];
        if (a === 169 && b === 254) return ['Link-local', 'No', '169.254.x.x: nobody gave the device an address (DHCP failed), so it made one up itself. It usually means: something is wrong with the network.'];
        if ((a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)) return ['Documentation', 'No (reserved)', 'This range is reserved only for examples and books, so that an example never hits a real server. That is why xyz.com uses 203.0.113.10 in this course.'];
        if (a === 0 || a >= 224) return ['Special', 'No', '0.x, 224-239 (multicast) and 240+ are reserved for special jobs.'];
        return ['Public', 'Yes', 'A public address: only one device in the whole world has it (or one NAT router / load balancer). Internet routers can find it from anywhere.'];
      };
      const draw = () => {
        const s = el.querySelector('.ip-in').value.trim(), parts = s.split('.');
        const o = parts.map(Number);
        const ok = parts.length === 4 && parts.every(p => /^\d{1,3}$/.test(p)) && o.every(n => n <= 255);
        if (!ok) { el.querySelector('.ip-bits').textContent = ''; el.querySelector('.ip-t').textContent = 'Invalid'; el.querySelector('.ip-v').textContent = '—'; el.querySelector('.ip-n').textContent = 'IPv4 has 4 numbers, each from 0 to 255, with dots between them.'; return; }
        el.querySelector('.ip-bits').innerHTML = o.map(n => `<span><strong>${n}</strong> = ${n.toString(2).padStart(8, '0')}</span>`).join('') + `<span style="color:var(--ink-3)">(4 × 8 = 32 bits)</span>`;
        const [t, v, n] = classify(o);
        el.querySelector('.ip-t').textContent = t; el.querySelector('.ip-v').textContent = v; el.querySelector('.ip-n').textContent = n;
        el.querySelectorAll('[data-ip]').forEach(b => b.className = 'chip' + (b.dataset.ip === s ? ' on' : ''));
      };
      el.querySelector('.ip-in').oninput = draw;
      el.querySelectorAll('[data-ip]').forEach(b => b.onclick = () => { el.querySelector('.ip-in').value = b.dataset.ip; draw(); });
      draw();
    }},
    { type: 'h2', text: 'Private IP, public IP and NAT' },
    { type: 'p', html: `Your home WiFi has a laptop, a phone and a TV. The internet company (ISP) gave you only <strong>one</strong> public IP. So what address do the devices inside get?` },
    { type: 'callout', tone: 'term', title: 'New word: public IP and private IP', html: `<strong>What it is:</strong> a <strong>public IP</strong> is unique on the whole internet: only one place in the world has it. A <strong>private IP</strong> is valid only inside one small network (a home, an office, a cloud). Three ranges are reserved for private use: <code>10.x.x.x</code>, <code>172.16-31.x.x</code> and <code>192.168.x.x</code>.<br><strong>Why we need it:</strong> millions of homes can all have <code>192.168.1.5</code> with no problem, because it is never seen on the internet. This saves the few IPv4 addresses left.<br><strong>Without it:</strong> every phone, TV and smart bulb would need its own public IPv4, and those ran out long ago.` },
    { type: 'p', html: `But one question: the laptop's address is private, so where should the xyz.com server send its reply? If it sends to <code>192.168.1.5</code>, internet routers have no idea where that is. The answer is <strong>NAT</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: NAT (Network Address Translation)', html: `<strong>What it is:</strong> on every packet going out, the home router removes the private IP and port and writes <strong>its own public IP and a new port</strong>. It also writes a line in a table (the NAT table): "public port 40001 = the laptop's 51000". When the reply comes, it looks at the table and hands it to the right device.<br><strong>Why we need it:</strong> so a whole home (or office) can use the internet through one public IP.<br><strong>Without it:</strong> devices with private IPs could not talk to the internet at all.<br><strong>Side effect:</strong> if a new packet comes from outside and there is no entry for it in the table, the router does not know who to give it to, so it drops it. That is why nobody outside can reach your laptop directly.` },
    { type: 'p', html: `Try it yourself. Send requests from the devices and watch the NAT table fill up. Then send the server's replies, and one "unknown" packet too:` },
    { type: 'custom', render(el) {
      const DEV = { lap: ['Laptop', '192.168.1.5'], ph: ['Phone', '192.168.1.8'], tv: ['TV', '192.168.1.12'] };
      const DST = { lap: 'xyz.com 203.0.113.10:443', ph: 'xyz.com 203.0.113.10:443', tv: 'video site 198.51.100.7:443' };
      const PUB = '49.36.10.20';
      el.innerHTML = `<div style="font-size:13px;color:var(--ink-3)">Go out:</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 10px">
          <button class="btn small" data-o="lap">Laptop → xyz.com</button><button class="btn small" data-o="ph">Phone → xyz.com</button><button class="btn small" data-o="tv">TV → video site</button></div>
        <div style="font-size:13px;color:var(--ink-3)">Come in (replies):</div>
        <div class="nat-in" style="display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 10px"></div>
        <div style="overflow-x:auto"><table style="width:100%;font-size:13px"><thead><tr><th>Public port</th><th>Device inside</th><th>Where it went</th></tr></thead><tbody class="nat-rows"></tbody></table></div>
        <div class="calc-note nat-log" style="font-family:var(--f-mono);font-size:12.5px"></div>
        <button class="btn small ghost nat-reset">Reset</button>`;
      let rows = [], next = 40001, sport = 51000, log = '';
      const draw = () => {
        el.querySelector('.nat-rows').innerHTML = rows.length ? rows.map(r => `<tr><td><code>${PUB}:${r.pp}</code></td><td>${DEV[r.d][0]} <code>${DEV[r.d][1]}:${r.sp}</code></td><td>${DST[r.d]}</td></tr>`).join('') : `<tr><td colspan="3" style="color:var(--ink-3)">The table is empty. Send a request from above.</td></tr>`;
        el.querySelector('.nat-in').innerHTML = rows.map(r => `<button class="btn small" data-i="${r.pp}">Reply → port ${r.pp}</button>`).join('') + `<button class="btn small" data-i="40099" style="border-color:var(--red)">Unknown packet → port 40099</button>`;
        el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
          const pp = +b.dataset.i, r = rows.find(x => x.pp === pp);
          log = r ? `IN : ${PUB}:${pp} → found in table → ${DEV[r.d][0]} ${DEV[r.d][1]}:${r.sp}. Delivered ✓`
            : `IN : ${PUB}:${pp} → no entry in table → who gets it? DROP ✗ (nobody outside can come straight in)`;
          draw();
        });
        el.querySelector('.nat-log').textContent = log || 'The log shows up here.';
      };
      el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
        const d = b.dataset.o; sport += 7;
        const r = { d, sp: sport, pp: next++ }; rows.push(r);
        log = `OUT: ${DEV[d][1]}:${r.sp} → NAT → ${PUB}:${r.pp} → ${DST[d]}  (the server only sees ${PUB})`;
        draw();
      });
      el.querySelector('.nat-reset').onclick = () => { rows = []; next = 40001; sport = 51000; log = ''; draw(); };
      draw();
    }},
    { type: 'p', html: `Both the laptop and the phone opened xyz.com: to the server, both requests came from <strong>the same IP</strong> (<code>49.36.10.20</code>), only with different ports (40001, 40002). The router looks at the port and gives the reply to the right device. And the unknown packet on port 40099 was dropped, because nobody inside had started that conversation.` },
    { type: 'callout', tone: 'term', title: 'New word: CGNAT (carrier-grade NAT)', html: `<strong>What it is:</strong> one more NAT on top of NAT, at the ISP level. A mobile network gives even your phone a private-like address (often in the <code>100.64.x.x</code> range), and thousands of customers share one public IP.<br><strong>Why:</strong> ISPs are short of IPv4 too.<br><strong>Effect on system design:</strong> xyz.com may see thousands of real users coming from one IP. So rate limiting or banning on the idea that "one IP = one user" is dangerous.` },
    { type: 'h2', text: 'Port: which program inside the computer?' },
    { type: 'p', html: `Many programs can run on the xyz.com server at the same time: a web server, a database, a cache. The packet reached the machine. Now which program should get it? This is what a <strong>port</strong> is for.` },
    { type: 'callout', tone: 'term', title: 'New word: port', html: `<strong>What it is:</strong> a number from 0 to 65535 that identifies one program inside a machine. TCP and UDP (layer 4) write the port on the packet label. A server program "listens" on a port, which means packets that come to that port go to it.<br><strong>Why we need it:</strong> one machine, one IP, but many programs. The port says which program the packet belongs to.<br><strong>Without it:</strong> only one network program could run on a machine.<br><strong>Example:</strong> the IP address is the address of a building, the port is the flat number inside. A courier needs both.` },
    { type: 'table', head: ['Port', 'Who listens', 'Should it be open to the internet?'], rows: [
      ['443', 'HTTPS (web server)', 'Yes'],
      ['80', 'HTTP (often only to redirect to HTTPS)', 'Yes'],
      ['53', 'DNS (UDP, and TCP for big answers)', 'Only on a DNS server'],
      ['22', 'SSH (remote login to the server)', 'No, only from the office/VPN'],
      ['5432', 'PostgreSQL database', 'Never'],
      ['6379', 'Redis', 'Never'],
      ['8080', 'App server (inside, behind the load balancer)', 'No'],
    ]},
    { type: 'p', html: `IP + port together make a full address, like <code>203.0.113.10:443</code>. We do not type the port in the browser address bar, because <code>https://</code> already means the default port 443. Ports 0-1023 are "well-known": famous services usually run on them, and on Linux you need special permission to open them.` },
    { type: 'callout', tone: 'term', title: 'New word: ephemeral port', html: `<strong>What it is:</strong> a "temporary" port on the client side. When your browser makes a connection, the OS picks a free port by itself (like 51007), and takes it back as soon as the connection closes.<br><strong>How many:</strong> the IANA range is 49152-65535. Linux uses 32768-60999 by default (28,232 ports).<br><strong>Why remember it:</strong> this count is limited. We will see its effect below in "port exhaustion".` },

    { type: 'h2', text: 'Socket: the full address of one connection' },
    { type: 'callout', tone: 'term', title: 'New word: socket', html: `<strong>What it is:</strong> a "handle" for a network connection inside a program, like the handle you get when you open a file. When the program writes to the socket, data goes out. When it reads from the socket, data comes in.<br><strong>Identity:</strong> four things together make one TCP connection unique (the <strong>4-tuple</strong>): client IP, client port, server IP, server port. Add the protocol (TCP/UDP) and it is a 5-tuple.<br><strong>Why we need it:</strong> a server talks to thousands of users on the same port 443. The 4-tuple tells it which packet belongs to which user's conversation.<br><strong>Without it:</strong> one port could talk to only one user.` },
    { type: 'table', head: ['Connection', 'Client IP', 'Client port', 'Server IP', 'Server port'], rows: [
      ['Riya\'s laptop', '49.36.10.20', '40001', '203.0.113.10', '443'],
      ['Riya\'s phone (same home)', '49.36.10.20', '40002', '203.0.113.10', '443'],
      ['Aman (another city)', '106.51.7.9', '51007', '203.0.113.10', '443'],
    ]},
    { type: 'p', html: `The server part is the same for all three (<code>203.0.113.10:443</code>). Still, all three are different connections, because some part of the 4-tuple is different. On the server, one <strong>listening socket</strong> waits on 443 for new connections, and a separate connection socket is made for each new connection. This is how systems like WhatsApp keep millions of open connections on one machine: the limit is not the port, it is memory and CPU.` },
    { type: 'callout', tone: 'warn', title: 'Interview depth: port exhaustion', html: `Think of the opposite case. The xyz.com <strong>load balancer</strong> (one IP) opens connections to <strong>one</strong> app server inside (<code>10.0.1.7:8080</code>). Now three things in the 4-tuple are fixed (the LB IP, the server IP, the server port). Only the LB's ephemeral port can change. The default Linux range has 28,232 ports, so at most ~28 thousand connections to that one server at the same time. On top of that, a closed connection keeps its port busy for a while (TIME_WAIT, usually 60 s).<br><strong>Fix:</strong> reuse connections (keep-alive, pool), give the backend more IPs/ports, give the LB several source IPs, or widen the range.` },
    { type: 'h2', text: 'Firewall: which door is open, which is closed' },
    { type: 'p', html: `On the xyz.com server, the database listens on port 5432. If this port is open to the internet, bots from all over the world try the common ports of every IP, day and night. One weak password, and all the data is gone. So we need a guard in between.` },
    { type: 'callout', tone: 'term', title: 'New word: firewall', html: `<strong>What it is:</strong> a list of rules that checks every incoming packet: "from which IP, to which port, may it come in". Anything not allowed by a rule is dropped.<br><strong>Why we need it:</strong> so only the doors meant for users stay open (443), and everything else is closed.<br><strong>Without it:</strong> the database, Redis and admin tools are all in front of the bots.<br><strong>Example:</strong> in the cloud this is called a <strong>security group</strong>: "port 443 for everyone; port 5432 only from the app servers' security group".` },
    { type: 'p', html: `Run it: a request from home (NAT + firewall), two devices from one home, and an attack on the database port.` },
    { type: 'flow', height: 340,
      nodes: [
        { id: 'lap', label: 'Laptop', sub: '192.168.1.5', x: 90, y: 80, w: 130, kind: 'client', info: 'What it is: the laptop at home. Its IP is private: valid only inside the home WiFi.' },
        { id: 'ph', label: 'Phone', sub: '192.168.1.8', x: 90, y: 200, w: 130, kind: 'client', info: 'What it is: a phone in the same home, with another private IP. To the outside world, the laptop and the phone both appear with one public IP.' },
        { id: 'rt', label: 'Home router', sub: 'public 49.36.10.20', x: 290, y: 140, w: 160, kind: 'net', info: 'What it is: the front door of the home. It has one public IP and a NAT table, which remembers which reply belongs to which device.' },
        { id: 'hk', label: 'Attacker', sub: 'someone online', x: 290, y: 290, w: 150, kind: 'threat', hidden: true, info: 'What it is: bots on the internet that try the common ports (22, 5432, 6379...) of every IP, day and night.' },
        { id: 'fw', label: 'Firewall', sub: 'only 443 allowed', x: 480, y: 140, w: 140, kind: 'edge', info: 'What it is: a list of rules in front of the xyz.com server. Port 443 is open to everyone. All other ports are closed from outside: drop.' },
        { id: 'web', label: 'Web server', sub: 'port 443', x: 645, y: 80, w: 130, kind: 'server', info: 'What it is: the xyz.com web server program, listening on port 443 on the machine 203.0.113.10.' },
        { id: 'db', label: 'PostgreSQL', sub: 'port 5432', x: 645, y: 200, w: 130, kind: 'data', info: 'What it is: the database program, on port 5432. It is only for programs inside (app servers), not for the internet.' },
      ],
      edges: [{ a: 'lap', b: 'rt' }, { a: 'ph', b: 'rt' }, { a: 'rt', b: 'fw' }, { a: 'hk', b: 'fw', dashed: true }, { a: 'fw', b: 'web' }, { a: 'fw', b: 'db', dashed: true }],
      scenarios: [
        { name: 'Laptop to xyz.com', steps: [
          { title: 'The laptop sends a packet', text: 'The source has the laptop\'s private IP and an ephemeral port picked by the OS (51000). The destination: xyz.com, port 443.', go: 'lap>rt', msg: 'from 192.168.1.5:51000  →  to 203.0.113.10:443' },
          { title: 'The router does NAT', text: 'The router replaces the source with its own public IP, and writes in the NAT table: "public port 40001 = the laptop\'s 51000".', focus: ['rt'], set: { rt: { sub: 'NAT: 40001 → laptop' } }, msg: 'from 49.36.10.20:40001  →  to 203.0.113.10:443' },
          { title: 'Firewall check', text: 'Port 443? Allowed. Let it in.', go: 'rt>fw>web', after: { fw: { state: 'ok' } } },
          { title: 'The reply comes back', text: 'The server sends its reply to 49.36.10.20:40001. The router looks at the table and understands it belongs to the laptop.', go: 'res:web>fw>rt>lap', msg: 'to 49.36.10.20:40001  →  NAT  →  192.168.1.5:51000' },
        ]},
        { name: 'Phone and laptop together', steps: [
          { title: 'Both send a request at the same time', text: 'Both will have the same outside IP: 49.36.10.20. The only difference is the port.', parallel: true, go: ['lap>rt', 'ph>rt'], set: { rt: { sub: '40001→lap, 40002→ph' } } },
          { title: 'To the server, both come from one home', text: 'For the server, both requests came from one IP, from different ports. The 4-tuples are different, so these are two separate connections.', parallel: true, go: ['rt>fw>web', 'rt>fw>web'] },
          { title: 'The router hands each reply to the right device', text: 'By looking at the port number, the router delivers each reply to the right device. This is how a whole home runs on one public IP.', parallel: true, go: ['res:web>fw>rt>lap', 'res:web>fw>rt>ph'] },
        ]},
        { name: 'Attack on the database port', steps: [
          { title: 'Someone on the internet tries port 5432', text: 'Bots scan every server for common database ports.', show: ['hk'], go: 'lost:hk>fw', after: { fw: { state: 'ok', sub: '5432: DROPPED' } }, msg: 'from 185.x.x.x  →  to 203.0.113.10:5432' },
          { title: 'The firewall stopped it', text: 'The database runs on the machine, but its door is closed from outside. That is why databases are always kept on a <strong>private network</strong>, and only app servers are allowed to talk to them.', focus: ['db'], set: { db: { state: 'ok', sub: 'safe, private' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "my IP is 192.168.1.5, anyone can find me"', html: `Wrong. That is a private IP. The internet sees your router's public IP, and because of NAT, nobody outside can reach your laptop directly unless you start the conversation yourself. (NAT was not built for security, this is a side effect. Real protection is the firewall's job.)` },
    { type: 'h2', text: 'DNS records: different notes from a name to an IP' },
    { type: 'p', html: `In the "How the web works" lesson we saw that DNS turns <code>xyz.com</code> into an IP. Now look a little deeper: DNS keeps several kinds of information for one domain. Each piece of information is a <strong>record</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: DNS record and TTL', html: `<strong>What it is:</strong> one line in DNS: "for this name, of this type, this value". Like a phonebook that lists, next to one name, a home number, an office number and an email.<br><strong>TTL (time to live):</strong> a number (in seconds) with every record: "you may remember (cache) this answer for this long".<br><strong>Why we need it:</strong> one domain has many jobs: the website, email, the CDN, verification. Each job has its own record.<br><strong>Without it:</strong> nobody would know where email should go, where www should go, or where IPv6 users should go.` },
    { type: 'table', head: ['Type', 'Example (xyz.com)', 'Meaning', 'When it is used'], rows: [
      ['A', '<code>xyz.com → 203.0.113.10</code>', 'The IPv4 address of the name', 'The basic record of every website'],
      ['AAAA', '<code>xyz.com → 2001:db8::10</code>', 'The IPv6 address of the name', 'For IPv6 users (dual-stack)'],
      ['CNAME', '<code>www.xyz.com → xyz.com</code><br><code>static.xyz.com → xyz.cdn-provider.net</code>', '"This name is a nickname of another name, use that one\'s IP"', 'Pointing to a CDN or a service whose IPs keep changing'],
      ['MX', '<code>xyz.com → 10 mail.xyz.com</code>', 'Which server takes email for this domain (the number = priority)', 'Email'],
      ['TXT', '<code>xyz.com → "v=spf1 ..."</code>', 'Any text', 'Email anti-spam (SPF), proving you own the domain'],
      ['NS', '<code>xyz.com → ns1.dns-provider.com</code>', 'Which DNS servers hold the records of this domain', 'Which DNS company the domain is with'],
    ]},
    { type: 'code', text: `$ dig xyz.com A
xyz.com.    300    IN    A    203.0.113.10
            ^^^ TTL = 300 s: resolvers will cache this answer for 5 minutes

$ dig static.xyz.com
static.xyz.com.         3600  IN  CNAME  xyz.cdn-provider.net.
xyz.cdn-provider.net.     60  IN  A      198.51.100.21` },
    { type: 'list', items: [
      `<strong>The TTL trade-off:</strong> a long TTL (1 day) = fewer DNS queries, faster, but if the IP changes, people keep the old IP for up to a day. A short TTL (60 s) = changes spread quickly, but more queries. Before moving a server, make the TTL short, move, then make it long again.`,
      `<strong>DNS load balancing:</strong> you can give one name several A records (several IPs). Clients pick any one of them. This comes in detail in Phase 2, in the load balancer lesson.`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "put a CNAME on xyz.com (without www) too"', html: `That does not work. The root of a domain (the apex, like <code>xyz.com</code>) already has NS and SOA records, and a name with a CNAME cannot have any other record. So DNS companies offer a feature like "ALIAS / ANAME / CNAME flattening", which works like a CNAME inside but shows an A record to the outside.` },

    { type: 'h2', text: 'Where this shows up in system design' },
    { type: 'list', items: [
      `<strong>Private network (VPC):</strong> in the cloud, your servers, databases and caches sit in a private network (like <code>10.0.x.x</code>). From outside, only the public IP of the Load Balancer is visible. This is the default security design.`,
      `<strong>One public IP, many servers behind it:</strong> users see one IP, and the LB forwards to private IPs inside. Change servers, and users do not even notice.`,
      `<strong>Millions of connections:</strong> because of the 4-tuple, a server can take millions of connections on port 443. The limit is memory, CPU and file handles.`,
      `<strong>Port exhaustion:</strong> the number of connections from an LB or proxy to one backend is limited by ephemeral ports. Reuse connections.`,
      `<strong>Do not trust an IP:</strong> because of NAT and CGNAT, one IP may hide one home, one office, or thousands of mobile users. Apply rate limits and bans on user ID / API key too.`,
      `<strong>Run IPv6 too:</strong> in markets like India, most users are on IPv6. Keep the load balancer, the CDN and DNS (AAAA) ready for both.`,
    ]},
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>What is public, what is private?</strong> Outside, only what users need directly: the load balancer / CDN, port 443 (and 80 only for the redirect). App servers, databases, caches and queues: always on private IPs, behind a firewall (security group), open only to those who need them. Admin access (SSH 22) only through a VPN or a <strong>bastion host</strong> (one single, tightly locked server that is the only way to log in to the inside).` },
    { type: 'diagram', title: 'IP, NAT, ports and firewall: the full picture', height: 570,
      groups: [
        { label: 'Home (private IPs)', x: 16, y: 44, w: 152, h: 248 },
        { label: 'xyz.com cloud (VPC, private IPs)', x: 330, y: 244, w: 360, h: 316 },
      ],
      nodes: [
        { id: 'lap', label: 'Laptop', sub: '192.168.1.5', x: 92, y: 110, w: 130, kind: 'client', info: 'What it is: the laptop at home, with a private IP. For each connection, the OS picks an ephemeral port.' },
        { id: 'ph', label: 'Phone', sub: '192.168.1.8', x: 92, y: 236, w: 130, kind: 'client', info: 'What it is: a phone in the same home. From outside, the laptop and the phone both appear with one public IP, only the ports differ.' },
        { id: 'rt', label: 'Home router', sub: 'NAT, 49.36.10.20', x: 290, y: 160, w: 160, kind: 'net', info: 'What it is: the front door of the home, which has one public IP. With its NAT table it turns private IP:port into public IP:port and hands each reply to the right device.' },
        { id: 'dns', label: 'DNS', sub: 'A / AAAA records', x: 290, y: 40, w: 150, kind: 'net', info: 'What it is: the phonebook of the internet. The A record gives the IPv4 of xyz.com, AAAA the IPv6. The answer is cached until the TTL ends.' },
        { id: 'hk', label: 'Attacker', sub: 'bot, port scan', x: 640, y: 50, w: 140, kind: 'threat', info: 'What it is: bots on the internet that try ports like 22, 5432 and 6379 on every IP. The firewall drops them first.' },
        { id: 'fw', label: 'Firewall', sub: 'only 443 open', x: 510, y: 160, w: 150, kind: 'edge', info: 'What it is: a security group / firewall: a list of rules. From the internet, only port 443 to the load balancer. Everything else is dropped.' },
        { id: 'lb', label: 'Load Balancer', sub: '203.0.113.10:443', x: 510, y: 300, w: 170, kind: 'edge', info: 'What it is: the one public address of xyz.com. The DNS A record gives its IP. It spreads requests to the private servers inside.' },
        { id: 'app', label: 'App servers', sub: '10.0.1.x:8080', x: 510, y: 405, w: 150, kind: 'server', info: 'What it is: the servers that do the real work, only on private IPs. The internet cannot see them directly. Connections from the LB are reused, so there is no port exhaustion.' },
        { id: 'db', label: 'PostgreSQL', sub: '10.0.2.5:5432', x: 420, y: 505, w: 140, kind: 'data', info: 'What it is: the database, with a private IP and port 5432. Firewall rule: allowed only from the app servers\' security group.' },
        { id: 'redis', label: 'Redis', sub: '10.0.2.9:6379', x: 610, y: 505, w: 130, kind: 'cache', info: 'What it is: the cache, on port 6379. Never open to the internet: bots find an open Redis within minutes.' },
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
        { name: 'Open a page', text: 'The laptop gets the IP from DNS, the router does NAT, the firewall allows 443, the LB sends the request to a private app server, then to the database.', go: ['lap>rt>dns', 'lap>rt>fw>lb>app>db'] },
        { name: 'One home, one public IP', text: 'The laptop and the phone both go out through the router\'s public IP. The server sees one IP, with different ports.', go: ['lap>rt>fw>lb', 'ph>rt>fw>lb'] },
        { name: 'Attack on the database', text: 'A bot tried port 5432. The firewall dropped it first. The database is on a private IP and cannot be seen from the internet.', go: ['hk>fw'] },
        { name: 'Talk inside', text: 'App servers talk to the database (5432) and Redis (6379) on private IPs. This traffic never goes to the internet.', go: ['lb>app>db', 'app>redis'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>IP = which computer (layer 3). Port = which program on that computer (layer 4). Together: <code>203.0.113.10:443</code>.</li>
      <li>IPv4 = 32 bits, ~4.3 billion, ran out (2011). IPv6 = 128 bits. Today both run side by side (dual-stack); India is far ahead on IPv6.</li>
      <li>Private ranges: 10.x, 172.16-31.x, 192.168.x. Valid only inside, never seen on the internet.</li>
      <li>NAT: the router swaps private IP:port for its own public IP:port and remembers it in a table. An unknown packet from outside = drop.</li>
      <li>One connection = a 4-tuple (client IP, client port, server IP, server port). So one port can serve millions of users. The other way round, connections to one backend are limited by ephemeral ports.</li>
      <li>Firewall / security group: only 443 from outside. The database, Redis and SSH are never on the internet.</li>
      <li>DNS records: A (IPv4), AAAA (IPv6), CNAME (nickname), MX (email), TXT, NS. TTL = how long to cache.</li>
      <li>Many people can be behind one IP (NAT, CGNAT): do not treat an IP as "one user".</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Private IP + NAT: a whole home or office on one public IP, despite the IPv4 shortage', 'Private network + firewall: the database and cache are hidden from the internet', 'Ports and sockets: many programs on one machine, millions of connections on one port', 'DNS records + TTL: change the IP, keep the name; point the CDN and email to different places'], costs: ['Devices behind NAT cannot be reached directly from outside (peer-to-peer calls need workarounds)', 'CGNAT: thousands of users on one IP, so IP-based rate limits and bans catch the wrong people', 'Ephemeral ports are limited: a cap on connections to one backend', 'A long DNS TTL = after an IP change, the old address stays cached for a long time', 'The extra work of running both IPv4 and IPv6'] },
    { type: 'think', questions: [
      { q: 'An office has 500 employees and they all go out through one public IP. If xyz.com sets a rate limit of "max 100 requests/minute from one IP", what will happen?', a: 'The whole office will be treated as one user, and real people will be blocked. That is why rate limiting is often done on user ID or API key as well as IP.' },
      { q: 'Why is it dangerous to keep a Redis server open on the public internet on port 6379?', a: 'Any bot can find it and read, write or delete its data. Databases and caches always stay in a private network, behind a firewall, only for app servers.' },
      { q: 'Your load balancer opens a new TCP connection to the same backend server for every request, and at peak you start getting "cannot assign requested address" errors. What is happening?', a: 'Port exhaustion. The LB IP, the backend IP and the backend port are fixed, so only the LB\'s ephemeral port changes (~28k on Linux), and closed connections keep their ports busy in TIME_WAIT. The fix: reuse with keep-alive / a connection pool, more backend IPs or ports, or several source IPs for the LB.' },
      { q: 'xyz.com is moving to a new server (a new IP). The TTL of the A record is 86400 (1 day). What will you do on moving day?', a: 'One day before, set the TTL to 60-300 s, so the old long caches run out. On moving day, change the A record: users reach the new IP within minutes. Keep both servers running for a while. When all is fine, make the TTL long again.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'What does a port tell you?', options: ['Which computer', 'Which program on the computer', 'How big the packet is'], answer: 1, explain: 'IP = the machine, port = the program running on that machine.' },
      { q: 'What kind of IP is 192.168.1.5?', options: ['Public', 'Private', 'IPv6'], answer: 1, explain: '192.168.x.x, 10.x.x.x and 172.16-31.x.x are private ranges, valid only on a local network.' },
      { q: 'What kind of IP is 172.40.1.1?', options: ['Private, because it starts with 172', 'Public, because the private range is only 172.16 to 172.31', 'Loopback'], answer: 1, explain: 'The private range is 172.16.0.0/12: only 172.16.x.x to 172.31.x.x. 172.40 is outside it.' },
      { q: 'How do all the devices in a home use the internet through one public IP?', options: ['DNS', 'NAT', 'TLS'], answer: 1, explain: 'The router remembers in its NAT table which public port belongs to which device.' },
      { q: 'How does a server talk to millions of users on port 443 at the same time?', options: ['Each user gets a separate port on the server', 'Each connection is told apart by its 4-tuple (client IP, client port, server IP, server port)', 'It cannot'], answer: 1, explain: 'The server IP:port is the same for everyone, but the client IP or client port is different, so every connection is unique.' },
      { q: 'Which DNS record holds the IPv6 address of xyz.com?', options: ['A', 'AAAA', 'MX'], answer: 1, explain: 'A = IPv4, AAAA = IPv6. MX tells you the email server.' },
    ]},
    { type: 'sources', note: 'Address ranges, port ranges and dates come from these sources.', items: [
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
