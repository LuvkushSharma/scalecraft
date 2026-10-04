(function () {
  /* Tiny SHA-256 + HMAC + base64url, pure JS so the widgets work offline and give the same bytes everywhere (checked against node's crypto). */
  const utf8 = s => Array.from(new TextEncoder().encode(s));
  const sha256 = bytes => {
    const K = [], H = [];
    const isP = n => { for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };
    const frac = x => ((x - Math.floor(x)) * 4294967296) >>> 0;
    for (let n = 2, i = 0; i < 64; n++) if (isP(n)) { if (i < 8) H.push(frac(Math.pow(n, 1 / 2))); K.push(frac(Math.pow(n, 1 / 3))); i++; }
    const m = bytes.slice(), bl = bytes.length * 8;
    m.push(0x80); while (m.length % 64 !== 56) m.push(0);
    for (let i = 7; i >= 0; i--) m.push(Math.floor(bl / Math.pow(2, i * 8)) & 255);
    const rr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < m.length; o += 64) {
      const w = [];
      for (let i = 0; i < 64; i++) {
        if (i < 16) w[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
        else { const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) >>> 0; });
    }
    const out = []; H.forEach(v => out.push(v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255)); return out;
  };
  const hmac = (keyStr, msgStr) => {
    let k = utf8(keyStr); if (k.length > 64) k = sha256(k); while (k.length < 64) k.push(0);
    const ip = k.map(b => b ^ 0x36), op = k.map(b => b ^ 0x5c);
    return sha256(op.concat(sha256(ip.concat(utf8(msgStr)))));
  };
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const b64url = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 3) { const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0); s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '') + (i + 2 < bytes.length ? B64[n & 63] : ''); } return s; };
  const unb64url = s => { const out = []; let buf = 0, bits = 0; for (const ch of s) { const v = B64.indexOf(ch); if (v < 0) continue; buf = (buf << 6) | v; bits += 6; if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); } } return new TextDecoder().decode(new Uint8Array(out)); };

Lesson.register({
  id: 'auth-basics',
  title: 'AuthN, AuthZ, JWT, OAuth',
  minutes: 34,
  summary: `On every request the server must ask two questions: "who are you?" (authentication) and "are you allowed to do this?" (authorization). In this lesson: how to keep passwords safe, sessions vs JWT (opened up and tampered with), the problem of revoking, API keys, "Login with Google" (OAuth 2.0 + PKCE) step by step, OpenID Connect, SSO, and permissions with RBAC.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine xyz.com is a big school. At the gate, the guard first asks: <strong>"who are you? Show your ID card."</strong> That is identity.<br>Then, at the staff-room door: <strong>"you are a student, the staff room is not for you."</strong> That is permission.<br>A website asks the same two questions on every request. But a server has no memory. So how do you show the "ID card" every time, what do you do if it is stolen, and in "Login with Google", how does Google tell xyz.com who you are without giving it your password? All of this is in this lesson, and you will run it yourself.` },

    { type: 'h2', text: 'Two different questions' },
    { type: 'compare',
      left: { title: 'Authentication (AuthN)', html: `<strong>"Who are you?"</strong><br><br>Password, OTP, fingerprint, "Login with Google". Result: "this is Riya, user 42".<br><br>On failure: <code>401 Unauthorized</code>` },
      right: { title: 'Authorization (AuthZ)', html: `<strong>"What are you allowed to do?"</strong><br><br>Riya can edit her own post, not someone else's. The admin panel is only for admins.<br><br>On failure: <code>403 Forbidden</code>` },
    },
    { type: 'callout', tone: 'term', title: 'New word: authentication and authorization', html: `<strong>What it is:</strong> <strong>Authentication (AuthN)</strong> = making sure of someone's identity. <strong>Authorization (AuthZ)</strong> = after identity, checking permission.<br><strong>Why we need it:</strong> without AuthN, anyone can do anything in anyone's name. Without AuthZ, every logged-in user is like an admin.<br><strong>Without it:</strong> anyone could read Riya's messages, or a normal user could delete all users.<br>Always AuthN first, then AuthZ. Without knowing who you are, the question of permission does not even come up.` },

    { type: 'h2', text: 'First job: keep the password safe' },
    { type: 'p', html: `Riya signs up with the password <code>cricket@123</code>. How should the server keep it in the database? If it is stored as plain text and the database ever leaks (this has happened to very big companies), every user's password is in the thief's hands. And people use the same password on many sites.` },
    { type: 'callout', tone: 'term', title: 'New word: password hashing (and salt)', html: `<strong>What it is:</strong> a <strong>hash</strong> is a one-way function: put a password in, get a long random-looking string out. Going backwards (from the hash to the password) is practically impossible. A <strong>salt</strong> is a different random string for each user, added to the password before hashing, so that two users with the same password still get different hashes.<br><strong>Why we need it:</strong> at login, the server hashes the password it was just given and compares it with the saved hash. The real password is never saved anywhere.<br><strong>Without it:</strong> one leak = all passwords public.<br><strong>Which hash:</strong> for passwords, a hash that is <em>slow</em> on purpose: <strong>Argon2id</strong> (OWASP's first choice) or <strong>bcrypt</strong>. A fast hash like SHA-256 is wrong for passwords: a thief can try billions of guesses per second.` },
    { type: 'code', text: `
users table
id | email            | password_hash
42 | riya@gmail.com   | $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
                         ↑ algorithm, settings, salt and hash: all in one string` },
    { type: 'p', html: `A second factor can be added to the password: an OTP on the phone or an authenticator app. This is called <strong>MFA (Multi-Factor Authentication)</strong>. Even if the password is stolen, nobody can log in without the phone.` },

    { type: 'h2', text: 'The problem: HTTP remembers nothing' },
    { type: 'p', html: `In the API lesson we saw that HTTP is <strong>stateless</strong>: every request is new to the server. Riya logged in, fine. On the next request (opening the feed), how does the server know it is the same Riya? We will not send the password with every request (a slow hash every time, and the password travelling over the network again and again).` },
    { type: 'p', html: `The fix: after login, the server gives Riya a <strong>"pass"</strong>, which she shows with every request. This pass can be of two kinds: a <strong>session ID</strong> (a random number; the real information stays with the server) or a <strong>token / JWT</strong> (the information is inside the pass itself, with the server's signature).` },
    { type: 'callout', tone: 'term', title: 'New word: cookie and session', html: `<strong>What it is:</strong> a <strong>cookie</strong> is a small piece of data that the server asks the browser to keep (with the <code>Set-Cookie</code> header), and the browser automatically sends it back with every request to that site. A <strong>session</strong> = an entry on the server side: "session ID abc123 = user 42, logged in at 10:05". The browser only has the ID.<br><strong>Why we need it:</strong> identity on every request, without sending the password again.<br><strong>Without it:</strong> a login on every page.<br><strong>Safety flags:</strong> <code>HttpOnly</code> (JavaScript cannot read the cookie. If a bad script runs on the page, which is called an <strong>XSS</strong> attack, it still cannot steal the cookie), <code>Secure</code> (only sent over HTTPS), <code>SameSite</code> (the cookie is not sent with a request that started on another site. This stops <strong>CSRF</strong>: a bad site secretly making your logged-in browser send a request to xyz.com).` },
    { type: 'callout', tone: 'term', title: 'New word: token and JWT', html: `<strong>What it is:</strong> a <strong>token</strong> is a string that proves "who I am", usually sent in the <code>Authorization: Bearer &lt;token&gt;</code> header. A <strong>JWT (JSON Web Token)</strong> is the most common token format: the information (user id, role, expiry) is written inside the token itself, and it carries a <strong>signature</strong> made with the server's secret key.<br><strong>Why we need it:</strong> the server does not need to look anything up in a store on every request. It just checks the signature (a bit of maths) and trusts what is written inside. With many services, each service can check it by itself.<br><strong>Without it:</strong> every service would have to ask a central session store on every request.` },

    { type: 'h2', text: 'Session vs JWT: run them and see' },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'b', label: 'Browser / app', sub: 'Riya', x: 90, y: 165, w: 140, kind: 'client', info: 'What it is: Riya\'s browser or app. With a session it keeps only a random session ID (in a cookie). With JWT it keeps the whole signed token.' },
        { id: 's', label: 'xyz.com server', x: 370, y: 165, w: 150, kind: 'server', info: 'What it is: the xyz.com API server. On every request it works out who is asking: with a session, by asking the store; with a JWT, by checking the signature.' },
        { id: 'ss', label: 'Session store', sub: 'Redis', x: 620, y: 80, w: 140, kind: 'cache', info: 'What it is: a fast in-memory database (Redis) that holds "session ID → user". The server looks here on every request (~1 ms). Logout = delete the entry here. If it goes down, all sessions are gone, so it is kept replicated.' },
        { id: 'db', label: 'Users DB', sub: 'password hashes', x: 620, y: 250, w: 140, kind: 'data', info: 'What it is: the users table. Passwords are never plain text, always an Argon2id/bcrypt hash (with a salt). It is used at login, not on every request.' },
      ],
      edges: [{ a: 'b', b: 's' }, { a: 's', b: 'ss' }, { a: 's', b: 'db' }],
      scenarios: [
        { name: 'Session (cookie)', steps: [
          { title: 'Riya logs in', text: 'Email + password go over HTTPS. The server fetches the hash from the DB and compares it with the hash of the new password.', go: ['b>s', 's>db', 'res:db>s'], msg: 'POST /login { email, password }' },
          { title: 'The server creates a session', text: 'It made a long random ID and wrote in the session store: "abc123 = user 42".', go: 's>ss', after: { ss: { sub: 'abc123 → user 42' } } },
          { title: 'The browser gets a cookie', text: 'The cookie holds only the random ID, no user information. Because it is HttpOnly, JavaScript cannot read it.', go: 'res:s>b', msg: 'Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax' },
          { title: 'The next request', text: 'The browser sends the cookie by itself. The server looks in the store: abc123 = user 42. Recognised.', go: ['b>s>ss', 'res:ss>s>b'], after: { ss: { state: 'hit' } }, msg: 'GET /feed  Cookie: session=abc123' },
          { title: 'Logout, or "log out of all devices"', text: 'Delete the entry from the store. At once, logged out everywhere. This is the biggest strength of sessions.', go: 's>ss', after: { ss: { state: '', sub: 'abc123 deleted' } } },
        ]},
        { name: 'JWT (token)', steps: [
          { title: 'Login', text: 'The same: check the password hash.', go: ['b>s', 's>db', 'res:db>s'] },
          { title: 'The server makes a signed token', text: 'The information is written inside the token (user 42, role, expiry), and it carries a signature made with the server\'s secret key. Nothing was saved in the store.', set: { ss: { state: 'dim' } }, go: 'res:s>b', msg: 'eyJhbGciOi... = { "sub": "42", "role": "user", "exp": +15 min } + signature' },
          { title: 'The next request', text: 'The app sends the token. The server only verifies the signature (maths, no DB/Redis call). Correct signature and not expired = trust what is written inside.', go: ['b>s', 'res:s>b'], msg: 'Authorization: Bearer eyJhbGciOi...' },
          { title: 'The problem: how to log out?', text: 'The token stays valid until it expires; the server has no entry it could "cancel". If the phone is stolen, the token keeps working until expiry. So the access token is kept short (5-15 min), together with a long-lived <strong>refresh token</strong> that is stored on the server and can be revoked.', focus: ['s'] },
        ]},
        { name: 'JWT tamper (hacker)', steps: [
          { title: 'The hacker has their own token', text: 'The payload is only base64url; anyone can read and change it. The hacker changed "role": "user" to "admin", and kept the old signature.', go: 'b>s', set: { ss: { state: 'dim' } }, msg: 'Authorization: Bearer eyJ...{ "role": "admin" }...<old signature>' },
          { title: 'The server makes the signature again', text: 'With its secret key, the server makes the signature of the header + the new payload. It does not match the signature in the token. Without the secret, making a correct signature is impossible.', focus: ['s'], after: { s: { state: 'warn' } } },
          { title: '401: token rejected', text: 'The changed token was caught at once. The signature does not hide the data, but it does not let anyone change it.', go: 'bad:s>b', msg: 'HTTP/1.1 401 Unauthorized\n{ "error": "invalid signature" }' },
        ]},
        { name: 'Session store down', steps: [
          { title: 'Riya\'s normal request', text: 'She asked for the feed, with the cookie.', go: 'b>s', msg: 'GET /feed  Cookie: session=abc123' },
          { title: 'Redis does not answer', text: 'The session store went down. The server has no way to find out who abc123 is.', go: 'lost:s>ss', after: { ss: { state: 'down', sub: 'DOWN' } } },
          { title: 'Every user is "logged out"', text: 'Every request of every user fails (401 or 503). The session store is a single point of failure, so it runs on replicated Redis (a primary + replicas). JWT does not have this problem, because no store is needed on each request.', go: 'bad:s>b', msg: 'HTTP/1.1 503 Service Unavailable' },
        ]},
      ],
    },
    { type: 'h3', text: 'What is inside a JWT' },
    { type: 'p', html: `A JWT has three parts, with dots in between: <code>header.payload.signature</code>. The first two parts are just JSON written in <strong>base64url</strong> (a way to write text in URL-safe characters; it is not encryption).` },
    { type: 'code', text: `
header    {"alg":"HS256","typ":"JWT"}                    ← which signing algorithm
payload   {"sub":"42","name":"Riya","role":"user",
           "iat":1760000000,"exp":1760000900}             ← "claims": who, when made, valid until
signature HMAC-SHA256( secret, base64url(header) + "." + base64url(payload) )` },
    { type: 'table', head: ['Claim', 'Meaning'], rows: [
      ['<code>sub</code>', 'Subject: whose token it is (user id)'],
      ['<code>iat</code>', 'Issued at: when it was made (in seconds, since 1 Jan 1970)'],
      ['<code>exp</code>', 'Expiry: after this the token is useless. Here iat + 900 s = 15 minutes'],
      ['<code>iss</code> / <code>aud</code>', 'Issuer: who made it. Audience: who it was made for (so a token for another site does not work here)'],
      ['<code>jti</code>', 'The token\'s unique id: useful for putting one token on a denylist'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: signature (HS256 vs RS256)', html: `<strong>What it is:</strong> a signature is a "seal" that only the holder of the secret key can make. In <strong>HS256</strong>, the same secret both signs and checks (HMAC). In <strong>RS256 / ES256</strong>, a private key signs, and anyone can check with the public key.<br><strong>Why we need it:</strong> if even one letter of the payload changes, the signature will not match. So the server can trust what is written inside.<br><strong>Without it:</strong> anyone could write "role": "admin" and become an admin.<br><strong>When to use which:</strong> if one server both signs and checks, HS256 is fine. If many services check (or an outside issuer like Google signs), use RS256/ES256: the public keys are published at a URL (JWKS), and no secret has to be shared with any service.` },
    { type: 'p', html: `Now make a token yourself, read it, and play the hacker. The calculator below runs real HMAC-SHA256 (the same one servers use):` },
    { type: 'custom', render(el) {
      const S = {
        login: 'Login: the server makes a token', role: 'Hacker: change role to "admin"', resign: 'Hacker: sign with a guessed secret', clock: 'Clock +10 min', verify: 'Server verifies', reset: 'Reset',
        token: 'Token (header . payload . signature)', hdr: 'Header (decoded)', pay: 'Payload (decoded): anyone can read this!', check: 'The server\'s check',
        now: m => `Now: ${m} min after login`, secret: 'Server secret: only the server has it (you will not see it)',
        noTok: 'First press "Login".', sigRow: (a, b) => `Signature in the token: ${a}…\nServer made:            ${b}…`,
        ok: (n, r) => `200 OK: this is ${n}, role "${r}". The signature matches, not expired.`,
        badSig: '401: the signature does not match. The token was changed; rejected.', expired: m => `401: the token has expired (${m} min ago). Get a new one with the refresh token.`,
        notes: { login: 'The server built the payload and added an HMAC-SHA256 signature with its secret. The token is valid for 15 min.', role: 'The payload was decoded, the role changed, and it was encoded again. Look: the payload part changed, the signature is the old one. Now press "Server verifies".', resign: 'The hacker guessed a secret ("guess-123") and made a signature. But the server\'s real secret is different. Verify and see.', clock: 'The clock moved forward. After 15 min this token becomes useless, even if the signature is correct.', verify: 'The server made the signature again over header + payload with its secret, and compared it with the one in the token. Then it checked exp.' },
      };
      const SECRET = 'xyz-server-secret-2026', T0 = 1760000000;
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="btn small primary jw-login">${S.login}</button><button type="button" class="btn small jw-role">${S.role}</button><button type="button" class="btn small jw-resign">${S.resign}</button><button type="button" class="btn small jw-clock">${S.clock}</button><button type="button" class="btn small primary jw-verify">${S.verify}</button><button type="button" class="btn small ghost jw-reset">${S.reset}</button></div>
        <div style="font-size:13px;color:var(--ink-3);margin-top:10px"><span class="jw-now"></span> · ${S.secret}</div>
        <div style="font-size:13px;color:var(--ink-3);margin-top:8px">${S.token}</div><div class="jw-tok" style="font:12.5px/1.5 var(--f-mono);word-break:break-all;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;margin-top:4px;min-height:24px"></div>
        <div class="row2" style="margin-top:8px"><div><div style="font-size:13px;color:var(--ink-3)">${S.hdr}</div><pre class="jw-h" style="white-space:pre-wrap;font:12.5px/1.5 var(--f-mono);margin:4px 0"></pre></div><div><div style="font-size:13px;color:var(--ink-3)">${S.pay}</div><pre class="jw-p" style="white-space:pre-wrap;font:12.5px/1.5 var(--f-mono);margin:4px 0"></pre></div></div>
        <div style="font-size:13px;color:var(--ink-3)">${S.check}</div><pre class="jw-res" style="white-space:pre-wrap;font:12.5px/1.5 var(--f-mono);background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;margin-top:4px;min-height:24px"></pre><div class="calc-note jw-note"></div>`;
      const q = c => el.querySelector(c);
      let tok, now;
      const enc = o => b64url(utf8(JSON.stringify(o)));
      const sign = (h, p, key) => b64url(hmac(key, h + '.' + p));
      const draw = (res, note) => {
        q('.jw-now').textContent = S.now(Math.round((now - T0) / 60));
        if (!tok) { q('.jw-tok').innerHTML = ''; q('.jw-h').textContent = ''; q('.jw-p').textContent = ''; }
        else {
          const [h, p, s] = tok.split('.');
          q('.jw-tok').innerHTML = `<span style="color:var(--accent)">${h}</span>.<span style="color:var(--violet)">${p}</span>.<span style="color:var(--amber)">${s}</span>`;
          q('.jw-h').textContent = JSON.stringify(JSON.parse(unb64url(h)), null, 1);
          q('.jw-p').textContent = JSON.stringify(JSON.parse(unb64url(p)), null, 1);
        }
        q('.jw-res').textContent = res || ''; q('.jw-note').textContent = note || '';
      };
      const reset = () => { tok = null; now = T0; draw('', S.noTok); };
      const need = () => { if (!tok) { draw('', S.noTok); return false; } return true; };
      q('.jw-login').onclick = () => { const h = enc({ alg: 'HS256', typ: 'JWT' }), p = enc({ sub: '42', name: 'Riya', role: 'user', iat: now, exp: now + 900 }); tok = h + '.' + p + '.' + sign(h, p, SECRET); draw('', S.notes.login); };
      q('.jw-role').onclick = () => { if (!need()) return; const [h, p, s] = tok.split('.'); const o = JSON.parse(unb64url(p)); o.role = 'admin'; tok = h + '.' + enc(o) + '.' + s; draw('', S.notes.role); };
      q('.jw-resign').onclick = () => { if (!need()) return; const [h, p] = tok.split('.'); tok = h + '.' + p + '.' + sign(h, p, 'guess-123'); draw('', S.notes.resign); };
      q('.jw-clock').onclick = () => { now += 600; draw('', S.notes.clock); };
      q('.jw-verify').onclick = () => {
        if (!need()) return; const [h, p, s] = tok.split('.'); const mine = sign(h, p, SECRET); const o = JSON.parse(unb64url(p));
        let r = S.sigRow(s.slice(0, 16), mine.slice(0, 16)) + '\n\n';
        if (mine !== s) r += S.badSig; else if (now >= o.exp) r += S.expired(Math.round((now - o.exp) / 60)); else r += S.ok(o.name, o.role);
        draw(r, S.notes.verify);
      };
      q('.jw-reset').onclick = reset;
      reset();
    }},
    { type: 'callout', tone: 'mistake', html: `<strong>"A JWT is encrypted."</strong> No. The payload is only base64url; you read it yourself in the widget above. The signature only guarantees that nobody changed it. So never put a password, a phone number or any secret in a JWT. (Encrypted tokens have a separate standard, JWE, but normal login tokens are only signed.)` },
    { type: 'table', head: ['', 'Session', 'JWT'], rows: [
      ['State on the server', 'Yes (session store)', 'No (the token is everything)'],
      ['Lookup on every request', 'In the store (Redis ~1 ms)', 'Only a signature check'],
      ['Instant logout / revoke', 'Easy: delete the entry', 'Hard (short expiry + refresh tokens / denylist)'],
      ['Many services', 'All need a shared store', 'Each service can verify by itself'],
      ['Size', 'A small ID (~32 chars)', 'Big (several hundred bytes), with every request'],
      ['Good for', 'Web apps, when instant revoke matters', 'Mobile apps, APIs, microservices'],
    ]},
    { type: 'h3', text: 'The biggest JWT problem: how to revoke' },
    { type: 'p', html: `Riya's phone was stolen. With a session, we would just delete the entry from the store. With a JWT, the server has no entry at all; the token keeps working until its <code>exp</code>. Three methods together handle this problem:` },
    { type: 'steps', items: [
      { t: 'Keep the access token short', d: '5-15 minutes. Even if it is stolen, the window of damage is small.' },
      { t: 'Keep the refresh token on the server', d: 'A long-lived token (days/weeks), used only to get a new access token. It is stored in a database/Redis, so it can be deleted on logout or "log out of all devices". Every time it is used, give a new refresh token and stop the old one (rotation): if the old one comes back, it was stolen.' },
      { t: 'A denylist if needed', d: 'In very sensitive cases, put the token\'s jti on a small "blocked" list (Redis) until it expires. But note: now there is a lookup on every request again, so the "no lookup" benefit of JWT shrinks.' },
    ]},
    { type: 'callout', tone: 'warn', title: 'Two classic JWT bugs', html: `<strong>1. Keeping the token in the browser's localStorage:</strong> if there is ever an XSS (a bad script runs on the page), the script reads localStorage and steals the token. For browser apps an HttpOnly cookie is better. <strong>2. Letting the token choose the alg:</strong> write <code>"alg": "none"</code> in the header and drop the signature, and some old libraries accepted it! The server must always decide by itself which algorithm and which key are allowed; it must not believe the token.` },

    { type: 'h2', text: 'API keys: identity for programs' },
    { type: 'p', html: `Now a partner company's server fetches xyz.com data every night. No person logs in there, no one types a password. To identify this program there is an <strong>API key</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: API key', html: `<strong>What it is:</strong> a long random secret string that xyz.com gives to a partner (or developer), like <code>xyz_live_7Hq2...</code>. The partner sends it in a header with every request.<br><strong>Why we need it:</strong> to identify the program, apply its limits (rate limit, plan), and bill its usage.<br><strong>Without it:</strong> there is no way to know which partner uses how much, or how to block just one of them.<br><strong>How to keep it:</strong> store only the <strong>hash</strong> in the database, like a password; show the key to the user only once. Use a recognisable prefix (Stripe's secret keys start with <code>sk_live_</code>) so that scanners can catch a key pushed to GitHub by mistake. Give each key the fewest permissions (scopes) possible, and keep rotating (changing) it easy.` },
    { type: 'callout', tone: 'mistake', html: `<strong>"Let's put the API key inside the mobile app."</strong> No. Anyone can open and read an app's code, so the key becomes public. API keys are for server-to-server use. For users: login + tokens. Also, an API key only says <em>which program</em> it is, not <em>which user</em>.` },

    { type: 'h2', text: 'OAuth 2.0: "Login with Google"' },
    { type: 'p', html: `You press "Continue with Google" on xyz.com. xyz.com <strong>never</strong> gets your Google password. Still, it finds out who you are. How? Google recognises you, and gives xyz.com a limited, short-lived "permission slip". This method is called <strong>OAuth 2.0</strong>, and this flow is called the <strong>authorization code flow</strong>. First, meet its characters:` },
    { type: 'callout', tone: 'term', title: 'New word: the 4 roles in OAuth 2.0', html: `<strong>What it is:</strong> OAuth 2.0 is a standard that lets one app (xyz.com), with your permission, get a little of your data from another place (Google), without knowing your password. The roles: <strong>Resource owner</strong> = you (Riya), the owner of the data. <strong>Client</strong> = xyz.com, which wants the data. <strong>Authorization server</strong> = Google's login server, which recognises you and asks for permission. <strong>Resource server</strong> = Google's API, where the data is kept.<br><strong>Why we need it:</strong> people used to give their Gmail password to other sites (very dangerous). With OAuth, only Google sees the password, and xyz.com gets only as much permission as you gave.<br><strong>Without it:</strong> a new password for every site, or giving your real password to others.` },
    { type: 'callout', tone: 'term', title: 'New word: scope, authorization code, access token', html: `<strong>Scope</strong> = how much permission is asked for: <code>email profile</code> (only name and email), not "all of Gmail". <strong>Authorization code</strong> = a short, single-use code from Google that travels to xyz.com through the browser. On its own it is useless. <strong>Access token</strong> = the real "permission slip" that lets xyz.com fetch data from Google's API. It is given in exchange for the code, server to server.<br><strong>Why two steps (code, then token):</strong> the browser path (URLs, history, extensions) is not very safe. Only the useless-on-its-own code goes that way; the real token comes over a separate, direct HTTPS channel.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'Browser', sub: 'Riya', x: 95, y: 170, w: 130, kind: 'client', info: 'What it is: Riya\'s browser (or an app on her phone). All redirects pass through it. This path in the middle is the least trusted, so only the code goes over it, never the token.' },
        { id: 'x', label: 'xyz.com', sub: 'client app', x: 400, y: 60, w: 150, kind: 'server', info: 'What it is: in OAuth, xyz.com is called the "client". It has a client ID from Google (and a client secret hidden on its server). It makes and remembers the state and the PKCE verifier.' },
        { id: 'g', label: 'Google', sub: 'auth server', x: 400, y: 280, w: 150, kind: 'net', info: 'What it is: the authorization server. It recognises Riya (password, 2FA), asks for consent, gives the code, and gives tokens after checking the code + verifier.' },
        { id: 'att', label: 'Attacker', sub: 'thief app', x: 640, y: 170, w: 130, kind: 'threat', hidden: true, info: 'What it is: a bad app or website. Maybe a fake app on the phone that registered the same link scheme as xyz.com, so that it receives the redirect\'s code.' },
      ],
      edges: [{ a: 'u', b: 'x' }, { a: 'u', b: 'g' }, { a: 'x', b: 'g' }, { a: 'u', b: 'att' }, { a: 'att', b: 'g' }],
      scenarios: [
        { name: 'Login with Google (code + PKCE)', steps: [
          { title: 'Riya presses "Continue with Google"', go: 'u>x', text: 'xyz.com must send Riya to Google.' },
          { title: 'xyz.com makes two secrets, then redirects', text: 'A random <strong>state</strong> (protection against CSRF) and a random <strong>code_verifier</strong>. It keeps the verifier, and sends Google only its SHA-256 hash (the code_challenge). The URL also has the client ID, the scope and the address to come back to (redirect URI).', go: 'res:x>u', msg: '302 → accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=xyz\n&scope=openid email profile&redirect_uri=https://xyz.com/callback\n&state=r4nd0m&code_challenge=E9Melhoa...&code_challenge_method=S256' },
          { title: 'Riya logs in on Google and gives consent', text: 'The password was typed on Google, not on xyz.com. Google asks: "Give xyz.com your name and email?" Riya presses "Allow". Google remembers the code_challenge.', go: ['u>g', 'res:g>u'] },
          { title: 'Google sends her back with a code', text: 'The browser comes to xyz.com/callback with a single-use code. xyz.com checks that the state is the same one it sent.', go: 'u>x', msg: 'GET https://xyz.com/callback?code=4/0AY0e...&state=r4nd0m' },
          { title: 'The xyz.com server swaps the code for tokens', text: 'Server to server, over HTTPS. Along with the code_verifier. Google hashes it and checks: SHA-256(verifier) == the challenge it got earlier? Yes. Then it gives the tokens.', go: ['x>g', 'res:g>x'], msg: 'POST /token { code, code_verifier, client_id, client_secret, redirect_uri }\n→ { access_token, id_token, expires_in: 3599 }' },
          { title: 'Riya is logged in', text: 'From the id_token (a JWT signed by Google), xyz.com learns: this is riya@gmail.com. xyz.com checks its signature with Google\'s public keys, then creates its own session/JWT and gives it to Riya.', go: 'res:x>u', set: { x: { state: 'ok', sub: 'Riya logged in' } } },
        ]},
        { name: 'A stolen code (PKCE saves us)', steps: [
          { title: 'The code is stolen on the redirect', text: 'A fake app on Riya\'s phone had registered a link like xyz.com\'s. It caught Google\'s redirect. Now the thief has the code.', show: ['att'], go: 'u>att', msg: 'xyzapp://callback?code=4/0AY0e...&state=r4nd0m' },
          { title: 'The thief asks for tokens', text: 'The thief sends the code, but does not have the real code_verifier (it stayed inside the xyz.com app and never went over the network). It sends its own random verifier.', go: 'att>g', msg: 'POST /token { code: 4/0AY0e..., code_verifier: <wrong> }' },
          { title: 'Google refuses', text: 'SHA-256(the thief\'s verifier) does not match the challenge. The code is useless. This is why RFC 9700 (the best practice for OAuth security) says PKCE is required for public clients (mobile/browser apps), and recommended for everyone else too.', go: 'bad:g>att', after: { att: { state: 'down' } }, msg: '400 { "error": "invalid_grant" }' },
        ]},
        { name: 'CSRF: state does not match', steps: [
          { title: 'The thief pushes their own code', text: 'The thief got a code from their own Google account, and sent Riya a link that takes her to xyz.com/callback with the thief\'s code.', show: ['att'], go: 'att>u', msg: 'https://xyz.com/callback?code=THIEF_CODE&state=anything' },
          { title: 'Riya\'s browser opens the link', text: 'If xyz.com used the code without thinking, Riya would be logged into the thief\'s account. Whatever she uploads, the thief would see.', go: 'u>x' },
          { title: 'The state check fails', text: 'xyz.com looked at the state kept in Riya\'s session: xyz.com never started this request. Rejected.', go: 'bad:x>u', after: { x: { state: 'warn' } }, msg: '400 Bad Request: state mismatch' },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'New word: PKCE', html: `<strong>What it is:</strong> PKCE (Proof Key for Code Exchange, said "pixie") is a small lock. At the start the app makes a random <strong>code_verifier</strong> and keeps it hidden. It sends Google only its hash (the <strong>code_challenge</strong> = SHA-256, base64url). When getting the token, it shows the real verifier. Google hashes it and compares.<br><strong>Why we need it:</strong> a mobile app or a browser app cannot hide a client secret (anyone can open and read the code). PKCE makes a new "secret" for each login that only that app has.<br><strong>Without it:</strong> a code stolen on the redirect = tokens for the thief.<br><strong>Example:</strong> below is the real example from RFC 7636: the verifier <code>dBjftJeZ...</code> gives the challenge <code>E9Melhoa...</code>.` },
    { type: 'custom', render(el) {
      const S = { ver: 'code_verifier (only the xyz.com app has it)', chal: 'code_challenge = base64url(SHA-256(verifier)) → sent to Google', newV: 'Make a new verifier', good: 'xyz.com: ask for tokens with the right verifier', bad: 'Thief: stolen code + own verifier', reset: 'The RFC example',
        google: 'Google\'s check', match: '✓ Match: tokens given (access_token, id_token)', nomatch: '✗ No match: 400 invalid_grant, the code is useless',
        row: (h, c) => `SHA-256(verifier received) = ${h}\nChallenge received earlier = ${c}`,
        note: 'Getting the verifier back from the challenge is impossible (SHA-256 is one-way). So even if everyone sees the challenge, a thief cannot make the right verifier.' };
      const RFC = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
      const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
      let seed = 20261004, ver, chal;
      const rnd = () => { seed = seed * 16807 % 2147483647; return seed; };
      const mk = () => { let s = ''; for (let i = 0; i < 43; i++) s += AL[rnd() % AL.length]; return s; };
      const ch = v => b64url(sha256(utf8(v)));
      el.innerHTML = `<div style="font-size:13px;color:var(--ink-3)">${S.ver}</div><div class="pk-v" style="font:12.5px var(--f-mono);word-break:break-all;margin:4px 0 8px"></div>
        <div style="font-size:13px;color:var(--ink-3)">${S.chal}</div><div class="pk-c" style="font:12.5px var(--f-mono);word-break:break-all;margin:4px 0 8px;color:var(--accent)"></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px"><button type="button" class="btn small primary pk-good">${S.good}</button><button type="button" class="btn small pk-bad">${S.bad}</button><button type="button" class="btn small pk-new">${S.newV}</button><button type="button" class="btn small ghost pk-reset">${S.reset}</button></div>
        <div style="font-size:13px;color:var(--ink-3);margin-top:10px">${S.google}</div><pre class="pk-res" style="white-space:pre-wrap;word-break:break-all;font:12.5px/1.5 var(--f-mono);background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;margin-top:4px;min-height:24px"></pre><div class="calc-note">${S.note}</div>`;
      const q = c => el.querySelector(c);
      const set = v => { ver = v; chal = ch(v); q('.pk-v').textContent = ver; q('.pk-c').textContent = chal; q('.pk-res').textContent = ''; };
      const check = v => { const h = ch(v); q('.pk-res').textContent = S.row(h, chal) + '\n\n' + (h === chal ? S.match : S.nomatch); };
      q('.pk-good').onclick = () => check(ver);
      q('.pk-bad').onclick = () => check(mk());
      q('.pk-new').onclick = () => set(mk());
      q('.pk-reset').onclick = () => set(RFC);
      set(RFC);
    }},
    { type: 'callout', tone: 'why', title: 'Why so many steps?', html: `Each step stops an attack. Only Google sees the password. The code passes through the browser, but tokens are given only on the server-to-server channel. <code>state</code> makes sure that the request coming back is the one xyz.com started (protection against CSRF). PKCE makes sure that only the one who started the flow can use the code. The <code>redirect_uri</code> is registered with Google in advance, so the code cannot be sent to some other address. The old "implicit flow" (the token directly in the URL) should no longer be used.` },
    { type: 'h2', text: 'OpenID Connect: login on top of OAuth' },
    { type: 'p', html: `Note this carefully: OAuth 2.0 was really built for <strong>authorization</strong> ("let xyz.com read my Google Photos"), not for login. An access token says "what you can do with this token", not "who this is". For login there is a thin layer on top of it: <strong>OpenID Connect (OIDC)</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: OpenID Connect and the ID token', html: `<strong>What it is:</strong> OIDC is a standard on top of OAuth 2.0 that adds login (authentication). As soon as the scope includes <code>openid</code>, Google gives an <strong>ID token</strong> along with the access token: a JWT that says who it is (<code>sub</code>, <code>email</code>, <code>name</code>), who made it (<code>iss</code> = Google), who it is for (<code>aud</code> = xyz.com's client ID), and until when (<code>exp</code>).<br><strong>Why we need it:</strong> so that every company does not invent its own "login with" method. One standard, the same code for every identity provider (Google, Microsoft, Okta).<br><strong>Without it:</strong> guessing the user from the access token, which is wrong and dangerous.<br><strong>Must check:</strong> the ID token's signature (with Google's public keys), <code>iss</code>, <code>aud</code> (was this token made for xyz.com?), and <code>exp</code>.` },
    { type: 'callout', tone: 'mistake', html: `<strong>"OAuth = login."</strong> Only half true. OAuth 2.0 = giving permission (authorization). Login = OAuth + the ID token of OpenID Connect. "Login with Google" is really OIDC, running on OAuth's authorization code flow.` },

    { type: 'h2', text: 'SSO: one login, many apps' },
    { type: 'p', html: `<strong>Single Sign-On (SSO)</strong>: you log in once with your company account, and email, chat and the HR portal all open by themselves. One central <strong>identity provider (IdP)</strong>, like Okta, Google Workspace or Microsoft Entra ID (formerly Azure AD), handles identity for all the apps. No app keeps passwords itself; each one trusts the IdP.` },
    { type: 'list', items: [
      `<strong>OIDC</strong>: newer, based on JSON/JWT, easy for both web and mobile. New apps usually use this.`,
      `<strong>SAML</strong>: older (2000s), based on XML, still in many enterprise apps. The idea is the same: the IdP gives a signed "assertion" saying who this user is.`,
      `<strong>The benefit</strong>: when an employee leaves, switch them off in one place in the IdP, and they are out of every app. MFA is also set up in one place.`,
    ]},

    { type: 'h2', text: 'How authorization works: RBAC' },
    { type: 'p', html: `Identity is done. Now on every action the question is: "can this user do this?" Writing separate permissions for every user (crores of users) is impossible. So <strong>roles</strong> come in between.` },
    { type: 'callout', tone: 'term', title: 'New word: RBAC', html: `<strong>What it is:</strong> RBAC (Role-Based Access Control): users get <strong>roles</strong> (user, moderator, admin), and roles get <strong>permissions</strong> (delete a post, ban a user). A user's permissions = their role's permissions.<br><strong>Why we need it:</strong> making a new moderator = just giving the role. To change a permission, change it in one place, on the role.<br><strong>Without it:</strong> permissions set by hand on every user, mistakes, and no answer to "who gave this access?".<br><strong>Plus ownership:</strong> the role says "users can edit their own post"; the code checks that <em>this</em> post belongs to <em>this</em> user. When rules get more complex (time, place, department), methods like <strong>ABAC</strong> (attribute-based) come in.` },
    { type: 'custom', render(el) {
      const S = { who: 'Who', what: 'What to do', check: 'Check',
        users: [['Riya', 'user', 42], ['Kabir', 'moderator', 7], ['Aman', 'admin', 1]],
        acts: ['Read post 9', 'Edit post 9 (Riya\'s post)', 'Delete post 9', 'Ban user 99', 'See admin stats'],
        perm: 'Permission', ok: (c, why) => `${c} OK. ${why}`, no: why => `403 Forbidden. ${why}`,
        why: { role: (r, p) => `Role "${r}" has "${p}".`, own: (p) => `The role has "${p}", and post 9 belongs to this user (ownership check passed).`, notOwn: (p, r) => `Role "${r}" only has "${p}", but post 9 is Riya's, not this user's. And it has no "any" permission either.`, none: (r, p) => `Role "${r}" does not have "${p}".` } };
      const P = ['read:post', 'edit:own_post', 'delete:own_post', 'edit:any_post', 'delete:any_post', 'ban:user', 'view:admin'];
      const ROLE = { user: ['read:post', 'edit:own_post', 'delete:own_post'], moderator: ['read:post', 'edit:own_post', 'delete:own_post', 'delete:any_post', 'ban:user'], admin: P.slice() };
      // action → [permission if acting on any post / generally, own-variant or null]
      const NEED = [['read:post', null], ['edit:any_post', 'edit:own_post'], ['delete:any_post', 'delete:own_post'], ['ban:user', null], ['view:admin', null]];
      const POST9_AUTHOR = 42;
      const sel = (cls, opts) => `<select class="${cls}" style="width:100%;margin-top:4px;padding:6px;border-radius:var(--r-sm);border:1px solid var(--line-2);background:var(--surface);color:var(--ink)">${opts.map((o, i) => `<option value="${i}">${o}</option>`).join('')}</select>`;
      el.innerHTML = `<div class="row2"><div><label>${S.who}</label>${sel('rb-u', S.users.map(u => `${u[0]} (${u[1]})`))}</div><div><label>${S.what}</label>${sel('rb-a', S.acts)}</div></div>
        <div style="margin-top:10px"><button type="button" class="btn small primary rb-go">${S.check}</button></div>
        <div class="rb-res" style="margin-top:10px;font-weight:700"></div><div class="rb-tab" style="overflow-x:auto;margin-top:8px"></div>`;
      const q = c => el.querySelector(c);
      const decide = (ui, ai) => {
        const [, role, id] = S.users[ui], [any, own] = NEED[ai], has = ROLE[role];
        if (has.includes(any)) return { ok: true, used: any, why: S.why.role(role, any) };
        if (own && has.includes(own)) return POST9_AUTHOR === id ? { ok: true, used: own, why: S.why.own(own) } : { ok: false, used: own, why: S.why.notOwn(own, role) };
        return { ok: false, used: any, why: S.why.none(role, any) };
      };
      const draw = () => {
        const ui = +q('.rb-u').value, ai = +q('.rb-a').value, r = decide(ui, ai), role = S.users[ui][1];
        q('.rb-res').innerHTML = `<span style="color:${r.ok ? 'var(--green)' : 'var(--red)'}">${r.ok ? S.ok('200', r.why) : S.no(r.why)}</span>`;
        const td = 'padding:3px 8px;border-bottom:1px solid var(--line);font:12px var(--f-mono);text-align:center';
        q('.rb-tab').innerHTML = `<table style="border-collapse:collapse"><tr><th style="${td};text-align:left">${S.perm}</th>${Object.keys(ROLE).map(k => `<th style="${td};${k === role ? 'color:var(--accent)' : ''}">${k}</th>`).join('')}</tr>${P.map(p => `<tr><td style="${td};text-align:left;${p === r.used ? 'font-weight:700;color:var(--accent)' : ''}">${p}</td>${Object.keys(ROLE).map(k => `<td style="${td};${k === role && p === r.used ? 'background:var(--accent-soft)' : ''}">${ROLE[k].includes(p) ? '✓' : '·'}</td>`).join('')}</tr>`).join('')}</table>`;
      };
      q('.rb-go').onclick = draw; q('.rb-u').onchange = draw; q('.rb-a').onchange = draw; draw();
    }},
    { type: 'callout', tone: 'warn', html: `Always check authorization on the <strong>server</strong>, on every request. Hiding the "Delete" button in the app is not security: anyone can call the API directly (<code>curl -X DELETE /api/v1/posts/9</code>). And forgetting the ownership check is the most common bug: change <code>/api/v1/orders/1001</code> to <code>/1002</code> and someone else's order shows up. Give each user only as much permission as they need (least privilege).` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Web app (same domain):</strong> a server-side session, with the ID in an <code>HttpOnly; Secure; SameSite</code> cookie. Easy to revoke. <strong>Mobile apps, APIs, microservices:</strong> short access tokens (JWT, 5-15 min) + refresh tokens that are kept on the server and rotated. <strong>"Login with Google/Microsoft":</strong> OAuth 2.0 authorization code flow + PKCE, with OpenID Connect's ID token; never the implicit flow. <strong>Many apps inside a company:</strong> SSO (OIDC or SAML) with one IdP. <strong>Partner servers:</strong> API keys (stored as hashes) or OAuth client credentials. <strong>Permissions:</strong> RBAC + ownership checks, always on the server. Passwords: Argon2id/bcrypt, plus MFA.` },
    { type: 'diagram', title: 'Auth: the whole picture', height: 530,
      groups: [
        { label: 'Clients', x: 10, y: 14, w: 700, h: 92 },
        { label: 'Auth', x: 20, y: 280, w: 180, h: 232 },
        { label: 'Data', x: 270, y: 400, w: 440, h: 112 },
      ],
      nodes: [
        { id: 'br', label: 'Browser', sub: 'session cookie', x: 100, y: 60, kind: 'client', info: 'What it is: the xyz.com website. After login it keeps the session ID in an HttpOnly cookie; the browser sends it with every request by itself.' },
        { id: 'mob', label: 'Mobile app', sub: 'JWT + refresh', x: 300, y: 60, kind: 'client', info: 'What it is: the xyz.com app. A short access token (JWT) in the Authorization header of every request, and the refresh token in the phone\'s secure storage.' },
        { id: 'partner', label: 'Partner server', sub: 'API key', x: 560, y: 60, w: 150, kind: 'client', info: 'What it is: an outside company\'s program. No person logs in; it is identified by an API key, with its own limits and scopes.' },
        { id: 'gw', label: 'API gateway', sub: 'verify token / key', x: 330, y: 200, w: 170, kind: 'edge', info: 'What it is: the door for all requests. AuthN on every request: with a cookie, ask the session store; with a JWT, check the signature + exp; with an API key, compare its hash. Fail = 401. Pass = send it inside with "user 42, role user".' },
        { id: 'auth', label: 'Auth service', sub: 'login, tokens', x: 110, y: 330, w: 150, kind: 'server', info: 'What it is: the service that does the login work. Password hash check, MFA, the OIDC flow with Google (state + PKCE), and creating tokens/sessions. It rotates refresh tokens.' },
        { id: 'google', label: 'Google', sub: 'OIDC provider', x: 110, y: 470, w: 150, kind: 'net', info: 'What it is: the outside identity provider. In "Login with Google" it recognises Riya and gives xyz.com a code, then an ID token. Riya\'s password goes only here.' },
        { id: 'app', label: 'App services', sub: 'RBAC + owner', x: 560, y: 330, w: 160, kind: 'server', info: 'What it is: services like feed, posts and admin. AuthZ on every action: does the role have the permission? Does this thing belong to this user? No = 403.' },
        { id: 'redis', label: 'Redis', sub: 'sessions, refresh', x: 360, y: 470, w: 160, kind: 'cache', info: 'What it is: a fast in-memory store. Session ID → user, refresh tokens, and if needed, revoked token ids (denylist). Logout = delete from here. Keep it replicated, or everyone is logged out when it goes down.' },
        { id: 'udb', label: 'Users DB', sub: 'hashes, roles', x: 580, y: 470, w: 150, kind: 'data', info: 'What it is: the users table: email, Argon2id/bcrypt password hash, roles, API key hashes. Read at login and to look up roles.' },
      ],
      edges: [
        { a: 'br', b: 'gw', n: 1 },
        { a: 'mob', b: 'gw' },
        { a: 'partner', b: 'gw', label: 'API key' },
        { a: 'gw', b: 'auth', label: '/login' },
        { a: 'gw', b: 'app', n: 2, label: 'user 42, role' },
        { a: 'gw', b: 'redis', label: 'session?' },
        { a: 'auth', b: 'google', dashed: true, label: 'OIDC' },
        { a: 'auth', b: 'redis' },
        { a: 'auth', b: 'udb' },
        { a: 'app', b: 'udb', n: 3 },
      ],
      paths: [
        { name: 'Password login', text: 'The auth service compared the hash from the DB, then wrote the session/refresh token in Redis and returned a cookie or tokens.', go: ['br>gw>auth>udb', 'auth>redis'] },
        { name: 'Login with Google', text: 'The auth service runs the OIDC flow with Google (state + PKCE), checks the ID token, and creates its own session.', go: ['br>gw>auth>google', 'auth>redis'] },
        { name: 'API call (JWT)', text: 'The gateway checked the JWT\'s signature and exp (no lookup). The app service checked RBAC + ownership.', go: ['mob>gw>app>udb'] },
        { name: 'Partner (API key)', text: 'The gateway compared the API key\'s hash, applied the partner\'s scopes and limits, then sent it inside.', go: ['partner>gw>app'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>AuthN = "who are you?" (fail: 401). AuthZ = "what is allowed?" (fail: 403). AuthN first, then AuthZ.</li>
      <li>Never store passwords as plain text: Argon2id/bcrypt, with a salt. Add MFA on top.</li>
      <li>Session: a random ID in a cookie, the data in the server's store. Easy to revoke, but it needs a store (and a replicated one).</li>
      <li>JWT: header.payload.signature. Anyone can read the payload; the signature stops changes. The server decides the algorithm and key itself.</li>
      <li>JWT revoke is hard: a short access token + a refresh token kept on the server and rotated (+ a denylist if needed).</li>
      <li>API keys = identity for programs. Store them as hashes, give scopes, never put them in a mobile app.</li>
      <li>OAuth 2.0 authorization code flow: the password only to Google, only the code through the browser, tokens server to server. state = protection against CSRF, PKCE = a stolen code is useless.</li>
      <li>OIDC = OAuth + ID token = login. SSO = one IdP, many apps. RBAC + ownership, always on the server.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['A sure identity on every request, without sending the password again and again', 'JWT: services can verify by themselves, without a central lookup', 'OAuth/OIDC: the password stays only with the identity provider; users do not need to remember a new password', 'RBAC: permissions in one place, through roles', 'SSO: switch off access to all apps from one place'], costs: ['Sessions: a store lookup on every request, and the store is a single point of failure', 'JWT: hard to revoke, a big token, and dangers from wrong config (alg none, localStorage)', 'Many steps in the OAuth flow: state, PKCE, redirect URI, ID token checks, all must be done right', 'Trusting an outside IdP: if Google is down, "Login with Google" is down', 'Forgetting the AuthZ check on any endpoint = a data leak'] },
    { type: 'think', questions: [
      { q: 'xyz.com set the JWT expiry to 30 days. Riya\'s phone was stolen. What is the problem, and what is the fix?', a: 'The thief can use the API as Riya for 30 days, and the server has no simple way to cancel the token. The fix: access tokens of 5-15 min, and a long refresh token that is stored on the server, can be revoked, and is rotated. On logout / "log out of all devices", delete the refresh tokens.' },
      { q: 'In OAuth, why not swap the code for the token right in the browser?', a: 'Because for a web app that needs the client secret, and a secret kept in the browser does not stay secret. The token exchange happens on the server, where the secret is safe. Apps that cannot keep a secret at all (mobile, single-page apps) use PKCE: a new verifier for every login.' },
      { q: 'A user opens /api/v1/orders/1001 (their own order). Then they type 1002 in the URL and see someone else\'s order. What is the mistake?', a: 'AuthN was fine (the user was logged in), but AuthZ had no ownership check. On every request the server must check that order 1002 belongs to this user; if not, 403 (or 404, so it does not even reveal that the order exists).' },
      { q: 'A hacker changed a JWT payload to "role": "admin". The server accepted them as admin. What two mistakes could cause this?', a: '(1) The server was not verifying the signature at all (only decoding). (2) The server trusted the alg in the token header, and the hacker wrote "alg": "none" and removed the signature. The fix: always verify, and let the server choose the algorithm/key itself.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Riya is logged in but opens an admin page that is not for her. Status code?', options: ['401', '403', '500'], answer: 1, explain: 'Identity is known (AuthN passed), permission is not there (AuthZ failed).' },
      { q: 'A JWT\'s payload:', options: ['Is encrypted', 'Is only encoded; anyone can read it', 'Is stored on the server'], answer: 1, explain: 'The signature stops tampering; it does not hide anything.' },
      { q: 'In "Login with Google", Riya\'s Google password:', options: ['Is given to xyz.com', 'Is never given to xyz.com', 'Is given to xyz.com encrypted'], answer: 1, explain: 'Only Google sees the password. xyz.com gets a code, then tokens.' },
      { q: 'The best way to store passwords?', options: ['Plain text, but with a password on the DB', 'A SHA-256 hash', 'Argon2id or bcrypt, with a different salt per user'], answer: 2, explain: 'A password hash must be slow on purpose. SHA-256 is very fast: a thief can try billions of guesses per second.' },
      { q: 'Which attack does PKCE stop?', options: ['Password guessing', 'Turning an authorization code stolen on the redirect into a token', 'DDoS'], answer: 1, explain: 'Getting a token needs the real code_verifier, which only the app that started the flow has.' },
      { q: 'The biggest advantage of sessions over JWT?', options: ['No store is needed', 'Instant revoke (logout) is easy', 'The token is not small'], answer: 1, explain: 'Delete the entry from the store = logged out everywhere at once. A JWT keeps working until its exp.' },
      { q: 'What does OpenID Connect add to OAuth 2.0?', options: ['Encryption', 'An ID token, meaning login (who the user is)', 'Rate limiting'], answer: 1, explain: 'OAuth = permission (access token). OIDC = identity (ID token, a signed JWT).' },
    ]},
    { type: 'sources', note: 'Standards and security guidance come from these official documents.', items: [
      { title: 'RFC 7519: JSON Web Token (JWT)', publisher: 'IETF', official: true, year: 2015, url: 'https://www.rfc-editor.org/rfc/rfc7519.html', used: 'JWT structure and registered claims: iss, sub, aud, exp, iat, jti.' },
      { title: 'RFC 6749: The OAuth 2.0 Authorization Framework', publisher: 'IETF', official: true, year: 2012, url: 'https://www.rfc-editor.org/rfc/rfc6749.html', used: 'Roles (resource owner, client, authorization server, resource server), authorization code grant, state parameter, scope.' },
      { title: 'RFC 7636: Proof Key for Code Exchange (PKCE)', publisher: 'IETF', official: true, year: 2015, url: 'https://www.rfc-editor.org/rfc/rfc7636.html', used: 'code_verifier, S256 code_challenge; the example verifier/challenge pair used in our widget (Appendix B).' },
      { title: 'RFC 9700: Best Current Practice for OAuth 2.0 Security', publisher: 'IETF', official: true, year: 2025, url: 'https://www.rfc-editor.org/rfc/rfc9700.html', used: 'PKCE required for public clients and recommended for all, implicit grant should not be used, password grant must not be used, refresh token rotation.' },
      { title: 'OpenID Connect Core 1.0', publisher: 'OpenID Foundation', official: true, url: 'https://openid.net/specs/openid-connect-core-1_0.html', used: 'ID token claims and validation (signature, iss, aud, exp, nonce), openid scope.' },
      { title: 'Password Storage Cheat Sheet', publisher: 'OWASP', official: true, url: 'https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html', used: 'Argon2id first choice (19 MiB, 2 iterations, 1 parallelism), bcrypt with work factor 10+, salting.' },
      { title: 'JSON Web Token Cheat Sheet', publisher: 'OWASP', official: true, url: 'https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_Cheat_Sheet.html', used: 'alg none attack, token storage and revocation (denylist) concerns.' },
      { title: 'RFC 6265: HTTP State Management Mechanism (Cookies)', publisher: 'IETF', official: true, year: 2011, url: 'https://www.rfc-editor.org/rfc/rfc6265.html', used: 'Set-Cookie, HttpOnly and Secure attributes.' },
      { title: 'Using OAuth 2.0 to Access Google APIs / OpenID Connect', publisher: 'Google for Developers', official: true, url: 'https://developers.google.com/identity/openid-connect/openid-connect', used: 'Google authorization endpoint, openid email profile scopes, code exchange returning access_token and id_token, validating the ID token.' },
    ]},
  ],
});
})();
