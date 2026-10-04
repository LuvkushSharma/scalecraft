Lesson.register({
  id: 'proxies',
  title: 'Forward proxy vs reverse proxy',
  minutes: 22,
  summary: `A proxy is a computer in the middle that sends requests on behalf of someone else. A forward proxy works for the clients (an office filter, a cache, privacy). A reverse proxy works for the servers (TLS, load balancing, caching, routing, protection). Load Balancers, NGINX, CDNs and API Gateways are all really reverse proxies.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Sometimes two computers do not talk directly. A third computer sits in the middle: it takes the message, checks it, passes it on, and brings the answer back. This is called a <strong>proxy</strong>.<br>Just remember one question: <strong>whose side is this middle computer on?</strong> If it is on your (the users') side, it is a <strong>forward proxy</strong>. If it is on the website's side, it is a <strong>reverse proxy</strong>.<br>In this lesson you will run both, and understand why we put NGINX or Cloudflare in front of xyz.com.` },

    { type: 'h2', text: 'What is a proxy?' },
    { type: 'callout', tone: 'term', title: 'New word: proxy', html: `<strong>What it is:</strong> a server that sits between the client and the server. The request goes to the proxy first, the proxy sends it on in its own name, and the answer also comes back through the proxy. Both sides feel they are talking to the proxy.<br><strong>Why we need it:</strong> it gives us one place in the middle where checks, caching, changes and logging can happen, without changing the client's or the server's code.<br><strong>Without it:</strong> every client or every server would have to do all of this by itself.<br><strong>Example:</strong> an office web filter (forward), NGINX in front of xyz.com (reverse).` },
    { type: 'p', html: `Normally the browser talks straight to the server. With a proxy, one more "hop" (one more stop) comes in between. The only question is: <strong>whose side is the proxy on, whom does it hide, and whose rules does it apply?</strong>` },
    { type: 'compare',
      left: { title: 'Forward proxy: on the clients\' side', ascii: `
Laptop 1 ─┐
Laptop 2 ─┼─> PROXY ──> Internet sites
Laptop 3 ─┘
(inside the office)` , html: 'Websites see only the proxy, not the laptops inside. The rules are the <strong>office\'s</strong> (what you may open).' },
      right: { title: 'Reverse proxy: on the servers\' side', ascii: `
                ┌─> Server 1
Users ──> PROXY ┼─> Server 2
                └─> Server 3
                (inside xyz.com)` , html: 'Users see only the proxy, not the servers behind it. The rules are the <strong>website\'s</strong> (who may come in, where they go).' },
    },
    { type: 'callout', tone: 'tip', title: 'A trick to tell them apart', html: `Look at <strong>who set up the proxy</strong> and <strong>who configures it</strong>. The office IT put the proxy address into the laptops: forward. The xyz.com team put it in front of their servers, and users do not even know: reverse. The software can be the same (NGINX can be both), but the direction of the job is different.` },

    { type: 'h2', text: 'Forward proxy: on the clients\' side' },
    { type: 'p', html: `<strong>The problem:</strong> a company office has 500 employees. The company wants: (1) some sites to be blocked, (2) all internet traffic to pass through one place so there is a record, (3) if 500 people download the same 300 MB update, the internet bill should not be 500 times bigger, (4) the outside world should not see the laptops inside. Setting all this up on every laptop separately is hard. So a <strong>forward proxy</strong> is placed at the door of the office network, and all laptops go out through it.` },
    { type: 'list', items: [
      `<strong>Filtering:</strong> a rule like "block gaming and malware sites". The proxy looks at the request and answers <code>403</code> right there.`,
      `<strong>Privacy / hiding (anonymity):</strong> websites see the proxy's IP, not the user's. Many people use public proxies for exactly this. (But the proxy itself can see everything: the trust moves to the proxy.)`,
      `<strong>Caching:</strong> if 500 people ask for the same software update, the proxy fetches it from the internet once, and gives it to the other 499 from its own disk.`,
      `<strong>Logging and control:</strong> the company can see what was accessed. For servers too: let production servers go out only through an "egress proxy" that allows only approved domains (like a payment gateway). Then a hacked server cannot send data out.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Squid', html: `<strong>What it is:</strong> an old, open-source forward proxy program, famous for caching and filtering. Schools, offices and ISPs have used it for years.<br><strong>Why it matters here:</strong> when someone says "the office runs Squid", they mean a forward proxy that caches and filters web traffic.<br><strong>Example:</strong> Squid can also run the other way round (reverse, "accelerator" mode), but today NGINX, HAProxy or Envoy are more common as reverse proxies.` },
    { type: 'p', html: `One question: most sites today use HTTPS. How can a proxy filter or cache encrypted traffic? The answer: usually <strong>it cannot</strong>. The browser only tells the proxy "connect me to xyz.com:443" (HTTP's <code>CONNECT</code> method). The proxy builds a <strong>tunnel</strong>, and the TLS inside runs directly between the browser and xyz.com. The proxy only sees the domain name, not the page or the password.` },
    { type: 'callout', tone: 'term', title: 'New word: CONNECT tunnel and TLS inspection', html: `<strong>CONNECT tunnel:</strong> the proxy only moves bytes back and forth, without reading them. This allows domain-level filtering ("block facebook.com"), but not URL-level filtering, and no caching either.<br><strong>TLS inspection (MITM proxy):</strong> some companies put their own "root certificate" on every laptop. Then the proxy can break the TLS in the middle and read it, and then build a new TLS connection onwards. Useful for scanning malware, but a big privacy question, and apps like banking apps (certificate pinning) often refuse it.<br><strong>Why remember it:</strong> "the proxy sees everything" is only half true. With HTTPS it sees only the domain, unless the company's certificate is on the device.` },
    { type: 'p', html: `Run the office forward proxy: a normal HTTPS site, an update from the cache, a blocked site, and what happens when the proxy itself goes down:` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'l1', label: 'Riya\'s laptop', sub: '10.1.0.21', x: 95, y: 80, w: 150, kind: 'client', info: 'What it is: an office laptop. IT put the proxy address in its settings, so all its web traffic goes through the proxy.' },
        { id: 'l2', label: 'Aman\'s laptop', sub: '10.1.0.37', x: 95, y: 220, w: 150, kind: 'client', info: 'What it is: another office laptop, behind the same proxy. Outside sites see both Riya and Aman coming from one IP (the proxy\'s).' },
        { id: 'fp', label: 'Office proxy', sub: 'Squid: filter + cache', x: 310, y: 150, w: 170, kind: 'edge', info: 'What it is: a forward proxy, standing on the office\'s side. It applies rules (which sites are blocked), caches common files, logs everything, and hides the laptops inside from the outside.' },
        { id: 'site', label: 'xyz.com', sub: 'allowed', x: 580, y: 60, w: 150, kind: 'server', info: 'What it is: a normal website. It sees the request coming from the proxy\'s public IP, not from Riya\'s laptop.' },
        { id: 'game', label: 'game-site.com', sub: 'blocked at office', x: 580, y: 150, w: 150, kind: 'threat', info: 'What it is: a site that is blocked by the office rules. The proxy does not let the request out at all.' },
        { id: 'upd', label: 'Update server', sub: '300 MB OS update', x: 580, y: 240, w: 150, kind: 'server', info: 'What it is: the server for an OS or software update. 500 laptops ask for the same file: this is where the proxy cache helps most.' },
      ],
      edges: [{ a: 'l1', b: 'fp' }, { a: 'l2', b: 'fp' }, { a: 'fp', b: 'site' }, { a: 'fp', b: 'game', dashed: true }, { a: 'fp', b: 'upd' }],
      scenarios: [
        { name: 'HTTPS site (tunnel)', steps: [
          { title: 'The laptop asks the proxy: connect me', text: 'It is HTTPS, so the browser only tells the proxy the domain: the CONNECT method.', go: 'l1>fp', msg: 'CONNECT xyz.com:443' },
          { title: 'The proxy builds a tunnel', text: 'Rule check: xyz.com is allowed. The proxy opens a TCP connection to xyz.com and moves bytes back and forth. The TLS inside is between the browser and xyz.com, so the proxy cannot read the page.', go: ['fp>site', 'res:site>fp>l1'], set: { fp: { sub: 'saw: only xyz.com' } } },
          { title: 'What the website saw', text: 'xyz.com saw the request coming from the office proxy\'s public IP. Riya\'s laptop (10.1.0.21) was never seen outside.', focus: ['site'], set: { site: { sub: 'from: office IP' } } },
        ]},
        { name: 'Update from cache', steps: [
          { title: 'Riya asks for the update', text: 'It is not in the proxy cache (a miss). The proxy fetches 300 MB from the internet, gives it to Riya, and keeps it on disk. (Updates are often on URLs that are allowed to be cached.)', go: ['l1>fp>upd', 'res:upd>fp>l1'], after: { fp: { state: 'miss', sub: 'cache: miss → saved' } } },
          { title: 'Aman asks for the same update', text: 'Cache hit! The proxy gives it from its own disk. Not a single byte went over the internet. 500 laptops = 1 download.', go: ['l2>fp', 'res:fp>l2'], set: { upd: { state: 'dim' } }, after: { fp: { state: 'hit', sub: 'cache: hit' } } },
        ]},
        { name: 'Blocked site', steps: [
          { title: 'Aman opens game-site.com', text: 'The request reaches the proxy.', go: 'l2>fp', msg: 'CONNECT game-site.com:443' },
          { title: '403 right at the proxy', text: 'Rule: this site is blocked at the office. The proxy refuses at once. Not a single packet went to game-site.com, and the attempt was written in the log.', go: 'bad:fp>l2', set: { game: { state: 'dim' } }, after: { l2: { state: 'warn' } }, msg: '403 Forbidden (company policy)' },
        ]},
        { name: 'Proxy went down', intro: 'Failure: the office proxy machine crashed.', steps: [
          { title: 'Everyone\'s internet is down', text: 'All laptops went out only through the proxy. With the proxy gone, the whole office lost the web. The proxy became a <strong>single point of failure (SPOF)</strong>.', set: { fp: { state: 'down', sub: 'crashed' } }, go: ['lost:l1>fp', 'lost:l2>fp'] },
          { title: 'The fix', text: 'Keep two or more proxies, and give laptops a list ("if the first does not work, use the second"), for example a PAC file, or put the proxies behind a load balancer. Ask this question for every box in the middle: what happens if it goes down?', focus: ['fp'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'New word: SPOF (single point of failure)', html: `<strong>What it is:</strong> one part of a system whose failure brings the whole system down.<br><strong>Why it matters here:</strong> as soon as you put a proxy in the middle, all traffic depends on it. One proxy = one SPOF.<br><strong>Without it (that is, with redundancy):</strong> two proxies; if one goes down, the other takes over. This is covered in detail in the Phase 1 availability lesson.` },
    { type: 'h2', text: 'Who can see what?' },
    { type: 'p', html: `A proxy "hides" things, but from whom, and what? This is the most confusing part. Change the setup and see who sees what when Riya logs in to xyz.com:` },
    { type: 'custom', render(el) {
      const S = [
        ['direct', 'Direct (no proxy)'], ['fwd', 'Forward proxy (HTTPS tunnel)'], ['mitm', 'Forward proxy + TLS inspection'], ['vpn', 'VPN'], ['rev', 'Reverse proxy (xyz.com\'s NGINX)'],
      ];
      const WHO = ['xyz.com\'s servers', 'The box in the middle', 'Cafe WiFi / ISP'];
      const D = {
        direct: [['Riya\'s IP', 'The full login (TLS ends here)'], ['No box', '—'], ['Riya\'s IP, domain xyz.com', 'No content (encrypted)']],
        fwd: [['The proxy\'s IP (Riya is hidden)', 'The full login (TLS end-to-end)'], ['Riya\'s IP, domain xyz.com', 'No content (only a tunnel)'], ['Talking to the proxy', 'No content']],
        mitm: [['The proxy\'s IP', 'The full login'], ['Riya\'s IP, the full URL', 'EVERYTHING, even the password (TLS is broken and rebuilt at the proxy)'], ['Talking to the proxy', 'No content']],
        vpn: [['The VPN server\'s IP', 'The full login'], ['Riya\'s IP, domains', 'No content (because of HTTPS)'], ['Only "encrypted talk with a VPN"', 'Not even the domain']],
        rev: [['NGINX\'s IP (Riya\'s IP in the X-Forwarded-For header)', 'The full login (from NGINX onwards)'], ['NGINX: Riya\'s IP, the full request', 'Everything (TLS ends here)'], ['Riya\'s IP, domain xyz.com', 'No content (encrypted)']],
      };
      const NOTE = {
        direct: 'Nobody in the middle. The website sees your real (or NAT) IP.',
        fwd: 'Your IP is hidden from the website, but the proxy knows who you are and which sites you open. Trust moved from the website to the proxy.',
        mitm: 'The company\'s certificate is on the laptop, so the proxy can read everything. Useful for malware scanning, worst for privacy.',
        vpn: 'A VPN encrypts all the traffic of the whole device and sends it through one tunnel. The cafe WiFi sees nothing. But the VPN company now sees what the ISP used to see.',
        rev: 'A reverse proxy hides the servers, not the users. Users never see the real IPs of the servers. The servers learn the user\'s IP only from a header (X-Forwarded-For, where the proxy writes the real IP; details below).',
      };
      let k = 'fwd';
      el.innerHTML = `<div class="pv-b" style="display:flex;flex-wrap:wrap;gap:6px">${S.map(([id, n]) => `<button class="chip" data-s="${id}">${n}</button>`).join('')}</div>
        <div style="overflow-x:auto;margin-top:12px"><table style="width:100%;font-size:13px"><thead><tr><th>Who</th><th>Which IP it seems to come from</th><th>Data inside</th></tr></thead><tbody class="pv-rows"></tbody></table></div>
        <div class="calc-note pv-n"></div>`;
      const draw = () => {
        el.querySelectorAll('[data-s]').forEach(b => b.className = 'chip' + (b.dataset.s === k ? ' on' : ''));
        el.querySelector('.pv-rows').innerHTML = D[k].map((r, i) => `<tr><td><strong>${WHO[i]}</strong></td><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
        el.querySelector('.pv-n').textContent = NOTE[k];
      };
      el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { k = b.dataset.s; draw(); });
      draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "a VPN and a forward proxy are the same"', html: `Both talk on your behalf, so they look similar. The difference: a <strong>VPN</strong> encrypts <em>all</em> the traffic of the whole device (every app, every protocol) and sends it through one tunnel, so the local WiFi sees nothing. A <strong>forward proxy</strong> is usually only for the apps you configure (often the browser, web traffic), and the road to the proxy is not necessarily encrypted. And in both cases, it is not the box in the middle that must trust you, it is you who must trust it.` },

    { type: 'h2', text: 'Reverse proxy: on the servers\' side' },
    { type: 'p', html: `Now think from xyz.com's side. Right now there are 10 app servers, and each one's public IP is open on the internet. The problems: keeping and renewing a TLS certificate on every server, security rules on every server, users' connections breaking when a server goes down, and static files (CSS, images) also being served by expensive app servers. The fix: a <strong>reverse proxy</strong> (like NGINX) in front of all of them, and the servers on a private network.` },
    { type: 'callout', tone: 'term', title: 'New word: reverse proxy', html: `<strong>What it is:</strong> a server standing in front of the website's servers. Users think it is the website. It takes the request, does some work (TLS, checks, cache), and passes it on to the right server behind.<br><strong>Why we need it:</strong> all the "common" jobs in one place: encryption, protection, caching, routing. The servers only do business logic.<br><strong>Without it:</strong> every server faces the internet, every server repeats all this work, and changing servers is visible to users.<br><strong>Example:</strong> NGINX, HAProxy, Envoy, AWS ALB, Cloudflare. Load Balancers, CDNs and API Gateways are also forms of it.` },
    { type: 'steps', items: [
      { t: 'TLS termination', d: 'The HTTPS handshake and encryption happen at the proxy. The certificate and private key are in one place. The servers inside do not carry the load of crypto (sensitive systems keep TLS inside too).' },
      { t: 'Load balancing', d: 'Spreading requests across many servers, and taking a dead server out of the line with health checks. A Load Balancer is just a kind of reverse proxy.' },
      { t: 'Caching', d: 'The proxy remembers and serves static files (CSS, JS, images) and some pages itself. The request never reaches the app servers.' },
      { t: 'Compression', d: 'Making text files (HTML, CSS, JS, JSON) smaller with gzip or brotli before sending. A 100 KB JS file often becomes 25-30 KB. Fewer bytes = faster on mobile.' },
      { t: 'Routing', d: '/api to the API servers, /images to the image servers, /admin only from the office IP. The decision is made by looking at the URL, a header or a cookie (layer 7).' },
      { t: 'Security', d: 'The real IPs of the servers stay hidden. Very big or strange requests, bad IPs, or a flood from one client (rate limiting) are stopped right at the proxy. The WAF (below) sits here.' },
      { t: 'Handling slow clients (buffering)', d: 'A user on 2G is sending a request very slowly. The proxy collects the whole request before giving it to the app server, and also takes the answer quickly and then hands it slowly to the user. The app server\'s thread is not stuck on one slow user.' },
      { t: 'Changing the protocol', d: 'HTTP/2 and HTTP/3 outside, old HTTP/1.1 inside. Users get the benefit of the new protocol, and the servers did not have to change.' },
    ]},
    { type: 'callout', tone: 'term', title: 'New word: WAF (Web Application Firewall)', html: `<strong>What it is:</strong> a layer 7 firewall that reads the content inside the HTTP request and catches well-known attacks, like SQL injection in the URL (<code>' OR 1=1 --</code>) or sneaking in a script.<br><strong>Why we need it:</strong> a normal firewall only looks at the IP and port (last lesson). The attack comes in on port 443 and looks like a normal request.<br><strong>Without it:</strong> every bug in the app can be attacked directly.<br><strong>Example:</strong> Cloudflare, AWS WAF, or ModSecurity with NGINX.` },
    { type: 'callout', tone: 'term', title: 'New word: X-Forwarded-For (the real client IP)', html: `<strong>What it is:</strong> to a server behind a reverse proxy, every request seems to come from the proxy's IP. So the proxy adds a header: <code>X-Forwarded-For: 49.36.10.20</code> (or the standard <code>Forwarded</code> header), with the user's real IP in it.<br><strong>Why we need it:</strong> logs, rate limiting and fraud checks all need the user's real IP.<br><strong>Careful:</strong> any client can also send this header itself (a fake one). The server should only trust the part added by its own trusted proxy.` },
    { type: 'p', html: `Now run xyz.com's NGINX: routing by URL, a file from the cache, admin from outside, and what happens when a server dies:` },
    { type: 'flow', height: 350,
      nodes: [
        { id: 'u', label: 'Users', x: 80, y: 170, w: 110, kind: 'client', info: 'What it is: the users of xyz.com. They know only one address for xyz.com, which is really the reverse proxy\'s. They do not know how many servers are behind it.' },
        { id: 'rp', label: 'Reverse proxy', sub: 'NGINX', x: 270, y: 170, w: 150, kind: 'edge', info: 'What it is: the front door of xyz.com. All requests come here. It opens the TLS, serves static files from the cache, applies rules, and sends the rest to the right servers by URL.' },
        { id: 'st', label: 'Static cache', sub: 'CSS, JS, images', x: 270, y: 300, w: 150, kind: 'cache', info: 'What it is: the proxy\'s own disk/memory cache. Files that are the same for everyone come from here: no need to go to an app server.' },
        { id: 'api', label: 'API servers', sub: '/api/*', x: 520, y: 80, w: 140, kind: 'server', info: 'What it is: the servers that do the API work, on private IPs. Only /api requests come here.' },
        { id: 'web', label: 'Web servers', sub: '/*', x: 520, y: 200, w: 140, kind: 'server', info: 'What it is: the servers that build the other pages. The proxy keeps health-checking them.' },
        { id: 'adm', label: 'Admin panel', sub: '/admin', x: 520, y: 310, w: 140, kind: 'server', info: 'What it is: the internal admin tool. Rule: allowed only from the office IP.' },
      ],
      edges: [{ a: 'u', b: 'rp' }, { a: 'rp', b: 'st' }, { a: 'rp', b: 'api' }, { a: 'rp', b: 'web' }, { a: 'rp', b: 'adm', dashed: true }],
      scenarios: [
        { name: 'Routing by URL', steps: [
          { title: 'Request: /api/users/42', text: 'The proxy opens the HTTPS (TLS termination) and reads the URL.', go: 'u>rp', msg: 'GET https://xyz.com/api/users/42' },
          { title: 'Forward to the API servers', text: 'Rule: /api/* → API servers. The proxy adds the <code>X-Forwarded-For</code> header. The call inside can be plain HTTP or internal TLS.', go: ['rp>api', 'res:api>rp>u'] },
          { title: 'Request: /about', text: 'This is a page, so it goes to the web servers. Both times, the user saw the same single address.', go: ['u>rp>web', 'res:web>rp>u'] },
        ]},
        { name: 'Static file from cache', steps: [
          { title: 'Request: /style.css', text: 'This file is the same for everyone.', go: 'u>rp' },
          { title: 'The proxy serves it itself', text: 'The app servers did not even notice. Their CPU is saved for real work. The file was also made smaller with gzip/brotli before sending.', go: ['rp>st', 'res:st>rp>u'], set: { api: { state: 'dim' }, web: { state: 'dim' }, adm: { state: 'dim' } }, after: { st: { state: 'hit' } } },
        ]},
        { name: 'Admin from outside', steps: [
          { title: 'Someone outside opens /admin', text: 'Rule: /admin only from the office IP.', go: 'u>rp', msg: 'GET /admin  from 185.x.x.x' },
          { title: '403 right at the proxy', text: 'The request never even reached the admin server. The proxy is the first wall of protection.', go: 'bad:rp>u', set: { adm: { state: 'ok', sub: 'safe' } }, msg: '403 Forbidden' },
        ]},
        { name: 'A server died', intro: 'Failure: one of the web servers crashed.', steps: [
          { title: 'Health check fails', text: 'Every few seconds the proxy asks each server "are you alive?" (a health check). One web server did not answer. The proxy takes it out of the line.', focus: ['web'], set: { web: { state: 'warn', sub: '1 of 3 down' } } },
          { title: 'Users did not notice', text: 'New requests go to the servers that are still alive. If one request failed halfway and it is safe to run again (like a GET), the proxy retries it on another server.', go: ['u>rp>web', 'res:web>rp>u'] },
          { title: 'If all of them die', text: 'The proxy itself is alive, so it gives a clear error: <code>502 Bad Gateway</code> (the server behind gave a bad answer or none) or <code>504 Gateway Timeout</code> (no answer for too long). When you see these codes, you know at once: the problem is behind the proxy.', set: { web: { state: 'down', sub: 'all down' } }, go: 'bad:rp>u', msg: '502 Bad Gateway' },
        ]},
      ],
    },
    { type: 'p', html: `In NGINX, all of this is a few lines of config. Try to read it; the meaning of each line is in the comment:` },
    { type: 'code', text: `upstream web_servers {              # the group of servers behind
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}
server {
    listen 443 ssl;                    # HTTPS outside
    server_name xyz.com;
    ssl_certificate     /etc/ssl/xyz.crt;   # TLS termination happens here
    ssl_certificate_key /etc/ssl/xyz.key;
    gzip on;                           # compression

    location /api/ { proxy_pass http://10.0.2.20:9000; }  # routing
    location /admin/ { allow 203.0.113.0/24; deny all; proxy_pass http://10.0.3.5:8000; }
    location / {
        proxy_pass http://web_servers;                       # load balancing
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}` },
    { type: 'h2', text: 'Reverse proxy cache: how much load does it save on the servers?' },
    { type: 'p', html: `Move the sliders. Assume one app server can handle 1,000 requests per second (rps). Depending on how much of the static files the proxy cache serves by itself, this is how many servers you need behind it:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Total requests: <strong class="rc-rv"></strong> rps</label><input type="range" class="rc-r" aria-label="Requests per second" min="1000" max="50000" step="1000" value="10000"></div>
          <div><label>Share of static files: <strong class="rc-sv"></strong>%</label><input type="range" class="rc-s" aria-label="Static share" min="0" max="95" step="5" value="70"></div>
          <div><label>Cache hit rate on static: <strong class="rc-hv"></strong>%</label><input type="range" class="rc-h" aria-label="Hit rate" min="0" max="100" step="5" value="95"></div>
        </div>
        <div class="stats"><div class="stat"><span>Served by the proxy cache</span><strong class="rc-c"></strong></div><div class="stat"><span>Reached the app servers</span><strong class="rc-o"></strong></div><div class="stat"><span>Servers (without proxy → with)</span><strong class="rc-n"></strong></div></div>
        <div class="calc-note rc-x"></div>`;
      const PER = 1000;
      const draw = () => {
        const r = +el.querySelector('.rc-r').value, s = +el.querySelector('.rc-s').value, h = +el.querySelector('.rc-h').value;
        const cached = Math.round(r * s / 100 * h / 100), origin = r - cached;
        const n0 = Math.ceil(r / PER), n1 = Math.max(1, Math.ceil(origin / PER));
        el.querySelector('.rc-rv').textContent = r.toLocaleString('en-IN'); el.querySelector('.rc-sv').textContent = s; el.querySelector('.rc-hv').textContent = h;
        el.querySelector('.rc-c').textContent = cached.toLocaleString('en-IN') + ' rps';
        el.querySelector('.rc-o').textContent = origin.toLocaleString('en-IN') + ' rps';
        el.querySelector('.rc-n').textContent = `${n0} → ${n1}`;
        el.querySelector('.rc-x').textContent = `${r} × ${s}% static × ${h}% hit = ${cached} rps end right at the proxy. The remaining ${origin} rps ÷ ${PER} per server = ${n1} servers (${n0} without the proxy). Dynamic requests (login, feed) are not cached, so the bigger the static share, the bigger the gain.`;
      };
      ['.rc-r', '.rc-s', '.rc-h'].forEach(c => el.querySelector(c).oninput = draw); draw();
    }},
    { type: 'p', html: `In the default setting, out of 10,000 rps, the proxy cache itself served <strong>6,650</strong>. Only <strong>3,350</strong> reached the app servers: <strong>4</strong> servers instead of 10. Change the hit rate from 95% to 50% and see how much difference it makes.` },

    { type: 'h2', text: 'All of these are forms of a reverse proxy' },
    { type: 'table', head: ['Name', 'What it really is', 'Special job'], rows: [
      ['Load Balancer (AWS ALB, HAProxy)', 'Reverse proxy', 'Spreading traffic across servers, health checks'],
      ['CDN (Cloudflare, Akamai, CloudFront)', 'Reverse proxies spread all over the world', 'Caching content close to users, absorbing DDoS, WAF'],
      ['API Gateway', 'Reverse proxy', 'Auth, rate limiting, routing to different services'],
      ['NGINX', 'Web server + reverse proxy (can also be a forward proxy)', 'TLS, static files, caching, routing; very fast and light'],
      ['HAProxy', 'L4/L7 load balancer + reverse proxy', 'A huge number of connections, detailed health checks'],
      ['Envoy', 'Reverse proxy, often a "sidecar" next to each service', 'Service mesh, retries, observability (Phase 2 resilience lesson)'],
      ['Squid', 'Mainly a forward proxy (reverse mode too)', 'Office/ISP caching and filtering'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "a load balancer and a reverse proxy are different things"', html: `A load balancer is a <strong>job</strong> (spreading traffic), a reverse proxy is a <strong>place</strong> (in front of the servers). Today most software does both: NGINX is a reverse proxy that also does load balancing. The difference only matters for an L4 load balancer (it only passes TCP packets along and never reads HTTP): it cannot do the full "reverse proxy" job (caching, URL routing).` },
    { type: 'callout', tone: 'why', title: 'Decide', html: `Use a <strong>forward proxy</strong> when you need control over traffic <em>going out from your own users or servers</em>: office filtering, caching, auditing, or egress for production servers (only allowed domains).<br>Use a <strong>reverse proxy</strong> almost always, whenever your site is public: TLS in one place, private servers, load balancing, caching, rate limiting. A small site: one NGINX. A big one: CDN (Cloudflare) → load balancer → NGINX/Envoy → services.<br>Every proxy is an extra hop and a SPOF: keep at least two, and measure the latency.` },
    { type: 'diagram', title: 'Forward and reverse proxy: the full picture', height: 510,
      groups: [
        { label: 'Office', x: 10, y: 20, w: 190, h: 215 },
        { label: 'xyz.com (private network)', x: 468, y: 150, w: 244, h: 345 },
      ],
      nodes: [
        { id: 'lap', label: 'Office laptops', x: 105, y: 75, w: 150, kind: 'client', info: 'What it is: the 500 laptops of the office. All their web traffic goes out through the forward proxy.' },
        { id: 'fp', label: 'Forward proxy', sub: 'Squid: filter, cache', x: 105, y: 190, w: 170, kind: 'edge', info: 'What it is: the proxy on the office\'s side. It blocks sites, caches updates, keeps logs, and hides the laptops\' IPs from the outside. With HTTPS it sees only the domain (CONNECT tunnel).' },
        { id: 'ext', label: 'Outside sites', sub: 'internet', x: 335, y: 105, w: 150, kind: 'server', info: 'What it is: any site on the internet. It sees all 500 office people coming from one IP (the proxy\'s).' },
        { id: 'usr', label: 'Mobile users', x: 105, y: 330, w: 150, kind: 'client', info: 'What it is: the normal users of xyz.com. They only know the name xyz.com, which really points to Cloudflare\'s reverse proxies.' },
        { id: 'bot', label: 'Bot', sub: 'attack / flood', x: 105, y: 450, w: 150, kind: 'threat', info: 'What it is: an attacking program: a flood of requests or SQL injection. The reverse proxy (CDN + WAF) stops it at the very outside.' },
        { id: 'cf', label: 'Cloudflare', sub: 'CDN + WAF', x: 335, y: 330, w: 150, kind: 'edge', info: 'What it is: reverse proxies spread across the world (a CDN). It opens the TLS close to users, serves static files from its cache, and protects with WAF and against DDoS. Only the needed requests are sent on to xyz.com.' },
        { id: 'ng', label: 'NGINX', sub: 'TLS, route, cache', x: 570, y: 330, w: 170, kind: 'edge', info: 'What it is: the reverse proxy in the xyz.com data center. It looks at the URL and sends /api to the API servers and the rest to the web servers. It does health checks and adds X-Forwarded-For.' },
        { id: 'api', label: 'API servers', sub: 'private IPs', x: 570, y: 200, w: 150, kind: 'server', info: 'What it is: the servers that do the /api work. The internet cannot see them directly. Requests come only from NGINX.' },
        { id: 'web', label: 'Web servers', sub: 'private IPs', x: 570, y: 460, w: 150, kind: 'server', info: 'What it is: the servers that build pages. If one dies, NGINX takes it out of the line; if all die, 502.' },
      ],
      edges: [
        { a: 'lap', b: 'fp', n: 1 },
        { a: 'fp', b: 'ext', label: 'CONNECT tunnel' },
        { a: 'fp', b: 'cf', dashed: true },
        { a: 'usr', b: 'cf', n: 2 },
        { a: 'cf', b: 'bot', kind: 'bad', label: 'blocked' },
        { a: 'cf', b: 'ng', n: 3 },
        { a: 'ng', b: 'api', n: 4, label: '/api' },
        { a: 'ng', b: 'web', label: '/' },
      ],
      paths: [
        { name: 'Office going out (forward)', text: 'The laptop\'s request goes through the office proxy: rule check, cache, then through a tunnel to the outside site. The site saw only the proxy\'s IP.', go: ['lap>fp>ext'] },
        { name: 'User to xyz.com (reverse)', text: 'The user reaches Cloudflare (TLS close by), then NGINX, then the API servers by URL. The user never saw the servers.', go: ['usr>cf>ng>api'] },
        { name: 'Bot stopped', text: 'The bot\'s flood or attack was stopped at Cloudflare\'s WAF / rate limit. Nothing reached the xyz.com servers.', go: ['cf>bot'] },
        { name: 'Both proxies on one road', text: 'When an office employee opens xyz.com, the request passes first through the forward proxy (the office\'s), then through the reverse proxies (xyz.com\'s).', go: ['lap>fp>cf>ng>web'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Proxy = a server in the middle that sends requests on behalf of someone else. The question: whose side is it on?</li>
      <li>Forward proxy = on the clients' side (office, school, egress): filtering, caching, logging, hiding the client IP. Example: Squid.</li>
      <li>With HTTPS, a forward proxy usually sees only the domain (CONNECT tunnel), unless there is TLS inspection (the company's certificate).</li>
      <li>Reverse proxy = on the servers' side: TLS termination, load balancing, caching, compression, URL routing, WAF/rate limiting, buffering slow clients, hiding servers. Examples: NGINX, HAProxy, Envoy, Cloudflare.</li>
      <li>Load Balancers, CDNs and API Gateways are all forms of a reverse proxy.</li>
      <li>The server behind gets the user's real IP from the X-Forwarded-For / Forwarded header: trust only what your own proxy added.</li>
      <li>502/504 = the proxy is alive, the server behind it is not. Every proxy is an extra hop and a SPOF: keep two.</li>
      <li>VPN ≠ forward proxy: a VPN encrypts and tunnels all the traffic of the whole device.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Servers are hidden and safe, only the proxy is on the internet', 'TLS, caching and compression in one place', 'Routing by URL; adding/removing servers is invisible to users', 'The cache cuts the load on app servers a lot', 'Filtering, caching and records in one place at the office (forward)'], costs: ['One extra hop, a little latency', 'The proxy itself can become a SPOF (needs redundancy)', 'A wrong config affects the whole site', 'The proxy can see everything: trust moves to it', 'Depending on headers for the real client IP (and they can be faked)'] },
    { type: 'think', questions: [
      { q: 'xyz.com has 10 servers behind it. How many IP addresses does a user\'s browser see?', a: 'Only one (or a few of the CDN\'s): the reverse proxy/load balancer\'s. The user never sees the private IPs of the servers behind it.' },
      { q: 'Name one benefit and one risk of doing TLS termination at the proxy.', a: 'Benefit: the servers\' CPU is saved, certificates are managed in one place, and the proxy can read the request to do routing/caching/WAF. Risk: if the traffic between the proxy and the servers is unencrypted, you have to trust the inside network; sensitive systems keep TLS inside too (re-encryption or mTLS).' },
      { q: 'Your app logs show every user\'s IP as 10.0.0.5, and your IP-based rate limit blocks all users at once. What is wrong?', a: '10.0.0.5 is the IP of the reverse proxy (NGINX/LB). The app should take the real IP from X-Forwarded-For, and trust only the part added by its own trusted proxy (a client can also send this header itself and lie).' },
      { q: 'If production servers are hacked, they could send data out. How would you make this harder with a proxy?', a: 'An egress forward proxy: do not give servers a direct road to the internet (close it with the firewall), only one through a proxy, which allows only approved domains (payment gateway, SMS provider) and logs everything. A hacked server will not be able to send data to unknown places.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'An office proxy that blocks some sites for employees is a:', options: ['Forward proxy', 'Reverse proxy', 'CDN'], answer: 0, explain: 'It works on behalf of the clients.' },
      { q: 'NGINX doing TLS and routing in front of the xyz.com servers is a:', options: ['Forward proxy', 'Reverse proxy', 'DNS'], answer: 1, explain: 'It works on behalf of the servers.' },
      { q: 'What kind of proxy is a Load Balancer?', options: ['Forward', 'Reverse', 'It is not a proxy at all'], answer: 1, explain: 'It takes users\' requests and gives them to servers; it stands on the servers\' side.' },
      { q: 'When opening an HTTPS site, what does a normal forward proxy (without TLS inspection) see?', options: ['The full page and the password', 'Only the domain name (CONNECT xyz.com:443)', 'Nothing at all, not even the IP'], answer: 1, explain: 'The proxy only builds a tunnel. The TLS is between the browser and the site, so the proxy cannot read the content.' },
      { q: 'A user sees "502 Bad Gateway". What does it most likely mean?', options: ['The user\'s internet is down', 'The reverse proxy is alive, but the server behind it did not give a proper answer', 'DNS is wrong'], answer: 1, explain: 'A proxy gives 502/504 when the upstream (the server behind) fails or times out.' },
      { q: 'How does an app behind a reverse proxy get the user\'s real IP?', options: ['From the source IP of the TCP connection', 'From the X-Forwarded-For / Forwarded header that the proxy adds', 'It cannot'], answer: 1, explain: 'The TCP source IP is the proxy\'s. The proxy writes the real IP in a header.' },
    ]},
    { type: 'sources', note: 'Proxy features and headers were checked against these docs.', items: [
      { title: 'What is a reverse proxy? Proxy servers explained', publisher: 'Cloudflare Learning Center', official: true, url: 'https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/', used: 'Forward proxy sits in front of clients, reverse proxy in front of origin servers; load balancing, security, caching benefits.' },
      { title: 'Module ngx_http_proxy_module', publisher: 'NGINX documentation', official: true, url: 'https://nginx.org/en/docs/http/ngx_http_proxy_module.html', used: 'proxy_pass, proxy_set_header with $proxy_add_x_forwarded_for, response buffering, proxy_cache.' },
      { title: 'Squid Web Proxy Cache', publisher: 'Squid project', official: true, url: 'https://www.squid-cache.org/', used: 'Caching forward proxy, also usable as a reverse proxy (accelerator).' },
      { title: 'RFC 9110: HTTP Semantics (CONNECT, 502, 504)', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9110.html', used: 'The CONNECT method creates a tunnel; 502 Bad Gateway and 504 Gateway Timeout come from a gateway or proxy.' },
      { title: 'RFC 7239: Forwarded HTTP Extension', publisher: 'IETF', official: true, year: 2014, url: 'https://www.rfc-editor.org/rfc/rfc7239.html', used: 'Standard Forwarded header for the original client IP; X-Forwarded-For as the older de facto version.' },
      { title: 'What is Envoy', publisher: 'Envoy documentation', official: true, url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/what_is_envoy', used: 'An L4/L7 proxy designed to run as a sidecar next to each service.' },
    ]},
  ],
});
