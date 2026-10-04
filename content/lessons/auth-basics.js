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
  summary: `Server ko har request pe do sawaal poochhne hote hain: "tum kaun ho?" (authentication) aur "kya tumhe ye karne ki ijazat hai?" (authorization). Is lesson mein: password ko safe kaise rakhte hain, sessions vs JWT (andar se khol ke, tamper karke), revoke karne ki problem, API keys, "Login with Google" yaani OAuth 2.0 + PKCE step by step, OpenID Connect, SSO, aur RBAC se permissions.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Socho xyz.com ek bada school hai. Gate pe guard pehle poochhta hai: <strong>"tum kaun ho? ID card dikhao."</strong> Ye pehchaan hai.<br>Phir andar staff room ke darwaze pe: <strong>"tum student ho, staff room tumhare liye nahi."</strong> Ye ijazat hai.<br>Website pe bhi yahi do sawaal har request pe hote hain. Lekin server ki yaaddasht nahi hoti, to har baar "ID card" kaise dikhayein, chori ho jaaye to kya karein, aur "Login with Google" mein Google tumhara password xyz.com ko diye bina kaise batata hai ki tum kaun ho: ye sab is lesson mein, khud chala ke.` },

    { type: 'h2', text: 'Do alag sawaal' },
    { type: 'compare',
      left: { title: 'Authentication (AuthN)', html: `<strong>"Tum kaun ho?"</strong><br><br>Password, OTP, fingerprint, "Login with Google". Result: "ye Riya hai, user 42".<br><br>Fail hone pe: <code>401 Unauthorized</code>` },
      right: { title: 'Authorization (AuthZ)', html: `<strong>"Tumhe kya karne ki ijazat hai?"</strong><br><br>Riya apni post edit kar sakti hai, kisi aur ki nahi. Admin panel sirf admins ke liye.<br><br>Fail hone pe: <code>403 Forbidden</code>` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: authentication aur authorization', html: `<strong>Ye kya hai:</strong> <strong>Authentication (AuthN)</strong> = pehchaan pakki karna. <strong>Authorization (AuthZ)</strong> = pehchaan ke baad, permission check karna.<br><strong>Kyun chahiye:</strong> bina AuthN ke koi bhi kisi ke naam se kuch bhi kar sakta hai. Bina AuthZ ke har logged-in user admin jaisa hai.<br><strong>Iske bina:</strong> koi bhi Riya ke messages padh le, ya ek normal user sab users delete kar de.<br>Hamesha pehle AuthN, phir AuthZ. Pehchaane bina ijazat ka sawaal hi nahi uthta.` },

    { type: 'h2', text: 'Pehla kaam: password ko safe rakhna' },
    { type: 'p', html: `Riya signup karti hai, password <code>cricket@123</code>. Server ise database mein kaise rakhe? Agar seedha text mein rakha, aur kabhi database leak hua (aisa bade bade companies ke saath hua hai), to har user ka password chor ke haath mein. Aur log ek hi password kai sites pe use karte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: password hashing (aur salt)', html: `<strong>Ye kya hai:</strong> <strong>hash</strong> ek one-way function hai: password andar daalo, ek lamba random-jaisa string bahar. Ulta (hash se password) nikaalna practically namumkin. <strong>Salt</strong> har user ka ek alag random string hai jo hash karne se pehle password mein joda jaata hai, taaki do users ka same password ho to bhi hash alag aaye.<br><strong>Kyun chahiye:</strong> login pe server naye diye password ka hash banata hai aur saved hash se milata hai. Asli password kahin save hi nahi hota.<br><strong>Iske bina:</strong> ek leak = sab passwords public.<br><strong>Kaunsa hash:</strong> password ke liye jaan boojh ke <em>slow</em> hash: <strong>Argon2id</strong> (OWASP ki pehli pasand) ya <strong>bcrypt</strong>. SHA-256 jaisa tez hash password ke liye galat hai: chor ek second mein arabon guess try kar lega.` },
    { type: 'code', text: `
users table
id | email            | password_hash
42 | riya@gmail.com   | $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>
                         ↑ algorithm, settings, salt aur hash: sab ek string mein` },
    { type: 'p', html: `Password ke saath ek doosra factor bhi joda ja sakta hai: phone pe OTP ya authenticator app. Ise <strong>MFA (Multi-Factor Authentication)</strong> kehte hain. Password chori ho bhi jaaye, to bina phone ke login nahi.` },

    { type: 'h2', text: 'Problem: HTTP kuch yaad nahi rakhta' },
    { type: 'p', html: `API lesson mein dekha: HTTP <strong>stateless</strong> hai, har request server ke liye nayi hai. Riya ne login kiya, theek. Agli request (feed kholna) pe server ko kaise pata ki ye wahi Riya hai? Har request pe password to nahi bhejenge (har baar slow hash, aur password baar baar network pe).` },
    { type: 'p', html: `Hal: login ke baad server Riya ko ek <strong>"pass"</strong> deta hai, jo wo har request ke saath dikhati hai. Ye pass do tarah ka ho sakta hai: <strong>session ID</strong> (ek random number, asli jaankari server ke paas) ya <strong>token / JWT</strong> (jaankari pass ke andar hi, server ke sign ke saath).` },
    { type: 'callout', tone: 'term', title: 'Naya word: cookie aur session', html: `<strong>Ye kya hai:</strong> <strong>cookie</strong> ek chhota data hai jo server browser mein rakhwata hai (<code>Set-Cookie</code> header se), aur browser us site ki har request ke saath apne aap wapas bhejta hai. <strong>Session</strong> = server ki taraf ek entry: "session ID abc123 = user 42, login 10:05 baje". Browser ke paas sirf ID hoti hai.<br><strong>Kyun chahiye:</strong> har request pe pehchaan, bina password dobara bheje.<br><strong>Iske bina:</strong> har page pe login.<br><strong>Suraksha ke flags:</strong> <code>HttpOnly</code> (JavaScript cookie padh nahi sakta. Agar koi bura script page pe chal jaaye, jise <strong>XSS</strong> attack kehte hain, wo bhi cookie nahi chura sakta), <code>Secure</code> (sirf HTTPS pe jaaye), <code>SameSite</code> (kisi doosri site se shuru hui request ke saath cookie na jaaye. Isse <strong>CSRF</strong> rukta hai: bura site tumhare logged-in browser se chupke se xyz.com pe request bhejwa de).` },
    { type: 'callout', tone: 'term', title: 'Naya word: token aur JWT', html: `<strong>Ye kya hai:</strong> <strong>token</strong> ek string hai jo "main kaun hoon" ka saboot hai, aur aam taur pe <code>Authorization: Bearer &lt;token&gt;</code> header mein jaata hai. <strong>JWT (JSON Web Token)</strong> sabse common token format hai: jaankari (user id, role, expiry) token ke andar hi likhi hai, aur server ki secret key se <strong>signature</strong> laga hai.<br><strong>Kyun chahiye:</strong> server ko har request pe kisi store mein dekhna nahi padta. Bas signature check karo (thoda maths), aur andar likhi baat pe bharosa karo. Kai services ho to har service khud check kar sakti hai.<br><strong>Iske bina:</strong> har request pe har service ko central session store se poochhna padta.` },

    { type: 'h2', text: 'Session vs JWT, chala ke dekho' },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'b', label: 'Browser / app', sub: 'Riya', x: 90, y: 165, w: 140, kind: 'client', info: 'Ye kya hai: Riya ka browser ya app. Session mein ye sirf ek random session ID (cookie mein) rakhta hai. JWT mein poora signed token rakhta hai.' },
        { id: 's', label: 'xyz.com server', x: 370, y: 165, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ka API server. Har request pe pehchanta hai ki kaun hai: session mein store se poochh ke, JWT mein signature check karke.' },
        { id: 'ss', label: 'Session store', sub: 'Redis', x: 620, y: 80, w: 140, kind: 'cache', info: 'Ye kya hai: RAM wala tez database (Redis) jisme "session ID → user" likha hai. Server har request pe yahan dekhta hai (~1 ms). Logout = yahan se entry delete. Ye gira to sab sessions gaye, isliye ise replicated rakhte hain.' },
        { id: 'db', label: 'Users DB', sub: 'password hashes', x: 620, y: 250, w: 140, kind: 'data', info: 'Ye kya hai: users ki table. Passwords kabhi plain text mein nahi, hamesha Argon2id/bcrypt hash (salt ke saath) mein. Login pe hi yahan aate hain, har request pe nahi.' },
      ],
      edges: [{ a: 'b', b: 's' }, { a: 's', b: 'ss' }, { a: 's', b: 'db' }],
      scenarios: [
        { name: 'Session (cookie)', steps: [
          { title: 'Riya login karti hai', text: 'Email + password HTTPS pe jaata hai. Server DB se hash laake naye password ka hash milata hai.', go: ['b>s', 's>db', 'res:db>s'], msg: 'POST /login { email, password }' },
          { title: 'Server session banata hai', text: 'Ek lamba random ID banaya aur session store mein likha: "abc123 = user 42".', go: 's>ss', after: { ss: { sub: 'abc123 → user 42' } } },
          { title: 'Browser ko cookie milti hai', text: 'Cookie mein sirf random ID hai, koi user info nahi. HttpOnly hone se JavaScript ise padh nahi sakta.', go: 'res:s>b', msg: 'Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax' },
          { title: 'Agli request', text: 'Browser cookie apne aap bhejta hai. Server store mein dekhta hai: abc123 = user 42. Pehchaan gaya.', go: ['b>s>ss', 'res:ss>s>b'], after: { ss: { state: 'hit' } }, msg: 'GET /feed  Cookie: session=abc123' },
          { title: 'Logout ya "sab devices se logout"', text: 'Store se entry delete. Turant, har jagah se bahar. Ye sessions ki sabse badi taakat hai.', go: 's>ss', after: { ss: { state: '', sub: 'abc123 deleted' } } },
        ]},
        { name: 'JWT (token)', steps: [
          { title: 'Login', text: 'Same: password ka hash check.', go: ['b>s', 's>db', 'res:db>s'] },
          { title: 'Server ek signed token banata hai', text: 'Token ke andar hi info likhi hai (user 42, role, expiry), aur server ki secret key se signature laga hai. Store mein kuch save nahi hua.', set: { ss: { state: 'dim' } }, go: 'res:s>b', msg: 'eyJhbGciOi... = { "sub": "42", "role": "user", "exp": +15 min } + signature' },
          { title: 'Agli request', text: 'App token bhejti hai. Server sirf signature verify karta hai (maths, koi DB/Redis call nahi). Signature sahi aur expiry baaki = andar likhi baat pe bharosa.', go: ['b>s', 'res:s>b'], msg: 'Authorization: Bearer eyJhbGciOi...' },
          { title: 'Problem: logout kaise?', text: 'Token apne expiry tak valid hai, server ke paas use "cancel" karne ki koi entry hi nahi. Phone chori hua to token expiry tak chalega. Isliye access token chhota (5-15 min) rakhte hain, aur ek lamba <strong>refresh token</strong> jo server pe store hota hai aur revoke ho sakta hai.', focus: ['s'] },
        ]},
        { name: 'JWT tamper (hacker)', steps: [
          { title: 'Hacker ke paas apna token hai', text: 'Payload sirf base64url hai, koi bhi padh aur badal sakta hai. Hacker ne "role": "user" ko "admin" kar diya, signature wahi purana.', go: 'b>s', set: { ss: { state: 'dim' } }, msg: 'Authorization: Bearer eyJ...{ "role": "admin" }...<purana signature>' },
          { title: 'Server signature dobara banata hai', text: 'Server apni secret key se header + naye payload ka signature banata hai. Wo token wale signature se match nahi karta. Secret ke bina sahi signature banana namumkin.', focus: ['s'], after: { s: { state: 'warn' } } },
          { title: '401: token reject', text: 'Badla hua token turant pakda gaya. Signature data chhupata nahi, lekin badalne nahi deta.', go: 'bad:s>b', msg: 'HTTP/1.1 401 Unauthorized\n{ "error": "invalid signature" }' },
        ]},
        { name: 'Session store down', steps: [
          { title: 'Riya ki normal request', text: 'Cookie ke saath feed maangi.', go: 'b>s', msg: 'GET /feed  Cookie: session=abc123' },
          { title: 'Redis jawab nahi deta', text: 'Session store gir gaya. Server ko pata hi nahi chal sakta ki abc123 kaun hai.', go: 'lost:s>ss', after: { ss: { state: 'down', sub: 'DOWN' } } },
          { title: 'Sab users "logged out"', text: 'Har user ki har request fail (401 ya 503). Sessions ka store ek single point of failure hai, isliye ise replicated Redis (primary + replicas) pe chalaate hain. JWT mein ye problem nahi, kyunki har request pe store chahiye hi nahi.', go: 'bad:s>b', msg: 'HTTP/1.1 503 Service Unavailable' },
        ]},
      ],
    },
    { type: 'h3', text: 'JWT ke andar kya hai' },
    { type: 'p', html: `JWT teen hisson ka hota hai, beech mein dot: <code>header.payload.signature</code>. Pehle do hisse sirf JSON hain jo <strong>base64url</strong> mein likhe gaye (text ko URL-safe characters mein likhne ka tareeka, encryption nahi).` },
    { type: 'code', text: `
header    {"alg":"HS256","typ":"JWT"}                    ← kaunsa signing algorithm
payload   {"sub":"42","name":"Riya","role":"user",
           "iat":1760000000,"exp":1760000900}             ← "claims": kaun, kab bana, kab tak
signature HMAC-SHA256( secret, base64url(header) + "." + base64url(payload) )` },
    { type: 'table', head: ['Claim', 'Matlab'], rows: [
      ['<code>sub</code>', 'Subject: token kiska hai (user id)'],
      ['<code>iat</code>', 'Issued at: kab bana (seconds mein, 1 Jan 1970 se)'],
      ['<code>exp</code>', 'Expiry: iske baad token bekaar. Yahan iat + 900 s = 15 minute'],
      ['<code>iss</code> / <code>aud</code>', 'Issuer: kisne banaya. Audience: kiske liye bana (doosri site ka token yahan na chale)'],
      ['<code>jti</code>', 'Token ka unique id: kisi ek token ko denylist mein daalne ke kaam aata hai'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: signature (HS256 vs RS256)', html: `<strong>Ye kya hai:</strong> signature ek "seal" hai jo sirf secret key wala bana sakta hai. <strong>HS256</strong> mein ek hi secret se sign bhi hota hai aur check bhi (HMAC). <strong>RS256 / ES256</strong> mein private key se sign hota hai, aur public key se koi bhi check kar sakta hai.<br><strong>Kyun chahiye:</strong> agar payload mein ek bhi letter badla, to signature match nahi karega. Isliye server andar likhi baat pe bharosa kar sakta hai.<br><strong>Iske bina:</strong> koi bhi "role": "admin" likh ke admin ban jaata.<br><strong>Kab kaunsa:</strong> ek hi server sign aur check kare to HS256 theek. Kai services check karein (ya Google jaisa bahar ka issuer ho) to RS256/ES256: public keys ek URL (JWKS) pe milti hain, aur secret kisi service ke paas baantna nahi padta.` },
    { type: 'p', html: `Ab khud token banao, padho, aur hacker bano. Neeche ka calculator asli HMAC-SHA256 chalata hai (wahi jo servers use karte hain):` },
    { type: 'custom', render(el) {
      const S = {
        login: 'Login: server token banata hai', role: 'Hacker: role "admin" kar do', resign: 'Hacker: apne guess secret se sign', clock: 'Ghadi +10 min', verify: 'Server verify kare', reset: 'Reset',
        token: 'Token (header . payload . signature)', hdr: 'Header (decoded)', pay: 'Payload (decoded): koi bhi padh sakta hai!', check: 'Server ka check',
        now: m => `Abhi: login ke ${m} min baad`, secret: 'Server secret: sirf server ke paas (tumhe nahi dikhega)',
        noTok: 'Pehle "Login" dabao.', sigRow: (a, b) => `Token wala signature: ${a}…\nServer ne banaya:     ${b}…`,
        ok: (n, r) => `200 OK: ye ${n} hai, role "${r}". Signature match, expiry baaki.`,
        badSig: '401: signature match nahi hua. Token badla gaya hai, reject.', expired: m => `401: token expire ho chuka (${m} min pehle). Refresh token se naya lo.`,
        notes: { login: 'Server ne payload banaya aur apne secret se HMAC-SHA256 signature lagaya. Token 15 min chalega.', role: 'Payload decode karke role badla aur dobara encode kiya. Dekho: payload ka hissa badal gaya, signature wahi purana. Ab "Server verify kare" dabao.', resign: 'Hacker ne secret guess kiya ("guess-123") aur khud signature banaya. Lekin server ka asli secret alag hai. Verify karke dekho.', clock: 'Ghadi aage badhi. 15 min ke baad ye token bekaar ho jaayega, chahe signature sahi ho.', verify: 'Server ne header + payload pe apne secret se signature dobara banaya, aur token wale se milaya. Phir exp dekha.' },
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
    { type: 'callout', tone: 'mistake', html: `<strong>"JWT encrypted hota hai."</strong> Nahi. Payload sirf base64url hai, upar widget mein tumne khud padha. Signature sirf ye guarantee karta hai ki kisi ne badla nahi. Isliye JWT mein password, phone number ya koi secret kabhi mat daalo. (Encrypted tokens ka alag standard hai, JWE, lekin aam login tokens signed hi hote hain.)` },
    { type: 'table', head: ['', 'Session', 'JWT'], rows: [
      ['Server pe state', 'Haan (session store)', 'Nahi (token hi sab kuch)'],
      ['Har request pe lookup', 'Store mein (Redis ~1 ms)', 'Sirf signature check'],
      ['Turant logout / revoke', 'Aasaan: entry delete', 'Mushkil (short expiry + refresh tokens / denylist)'],
      ['Kai services', 'Sabko shared store chahiye', 'Har service khud verify kar sakti hai'],
      ['Size', 'Chhoti ID (~32 chars)', 'Bada (kai sau bytes), har request ke saath'],
      ['Kab achha', 'Web apps, jab turant revoke zaroori ho', 'Mobile apps, APIs, microservices'],
    ]},
    { type: 'h3', text: 'JWT ki sabse badi problem: revoke kaise karein' },
    { type: 'p', html: `Riya ka phone chori ho gaya. Session hota to bas store se entry delete. JWT mein server ke paas koi entry hi nahi, token apne <code>exp</code> tak chalta rahega. Teen tareeke milke is problem ko sambhaalte hain:` },
    { type: 'steps', items: [
      { t: 'Access token chhota rakho', d: '5-15 minute. Chori bhi hua to nuksaan ki khidki chhoti.' },
      { t: 'Refresh token server pe rakho', d: 'Lambi umar ka (din/hafte) token, jo sirf naya access token lene ke kaam aata hai. Ye database/Redis mein store hota hai, isliye logout pe ya "sab devices se logout" pe delete ho sakta hai. Har baar use hone pe naya refresh token do aur purana band (rotation): purana dobara aaye to samjho chori hua.' },
      { t: 'Zaroorat ho to denylist', d: 'Bahut sensitive case mein token ka jti ek chhoti "blocked" list (Redis) mein daalo jab tak wo expire na ho. Lekin dhyaan do: ab har request pe phir se lookup, yaani JWT ka "no lookup" faayda kam.' },
    ]},
    { type: 'callout', tone: 'warn', title: 'JWT ke do classic bugs', html: `<strong>1. Token ko browser ke localStorage mein rakhna:</strong> agar kabhi XSS hua (koi bura script page pe chala), to script localStorage padh ke token chura lega. Browser apps ke liye HttpOnly cookie behtar hai. <strong>2. alg ko token pe chhod dena:</strong> header mein <code>"alg": "none"</code> likh ke signature hata do, aur kuch purani libraries ne ise maan liya! Server ko hamesha khud tay karna chahiye ki kaunsa algorithm aur kaunsi key chalegi; token ki baat nahi maanni.` },

    { type: 'h2', text: 'API keys: programs ke liye pehchaan' },
    { type: 'p', html: `Ab ek partner company ka server xyz.com ka data roz raat ko leta hai. Wahan koi insaan login nahi karta, password nahi daalta. Is program ki pehchaan ke liye <strong>API key</strong> hoti hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: API key', html: `<strong>Ye kya hai:</strong> ek lamba random secret string jo xyz.com ek partner (ya developer) ko deta hai, jaise <code>xyz_live_7Hq2...</code>. Partner har request ke header mein bhejta hai.<br><strong>Kyun chahiye:</strong> program ko pehchanna, uski limits (rate limit, plan) lagaana, aur usage ka bill banana.<br><strong>Iske bina:</strong> pata hi nahi kaunsa partner kitna use kar raha hai, aur kisi ek ko band kaise karein.<br><strong>Kaise rakhein:</strong> database mein password ki tarah sirf <strong>hash</strong> rakho; user ko key sirf ek baar dikhao. Ek pehchaanne layak prefix rakho (Stripe ke secret keys <code>sk_live_</code> se shuru hote hain) taaki galti se GitHub pe daali key scanners pakad lein. Har key ko kam se kam permissions (scopes) do, aur rotate (badalna) aasaan rakho.` },
    { type: 'callout', tone: 'mistake', html: `<strong>"API key mobile app mein daal dete hain."</strong> Nahi. App ka code koi bhi khol ke padh sakta hai, to key public ho jaayegi. API keys server-to-server ke liye hain. Users ke liye login + tokens. Aur API key sirf batati hai <em>kaunsa program</em> hai, <em>kaunsa user</em> nahi.` },
    { type: 'h2', text: 'OAuth 2.0: "Login with Google"' },
    { type: 'p', html: `Tum xyz.com pe "Continue with Google" dabaate ho. xyz.com ko tumhara Google password <strong>kabhi nahi</strong> milta. Phir bhi use pata chal jaata hai ki tum kaun ho. Kaise? Google tumhe pehchanta hai, aur xyz.com ko ek limited, chhoti umar ka "permission slip" deta hai. Is tareeke ka naam <strong>OAuth 2.0</strong> hai, aur ye flow <strong>authorization code flow</strong> kehlata hai. Pehle iske kirdaar samjho:` },
    { type: 'callout', tone: 'term', title: 'Naya word: OAuth 2.0 ke 4 kirdaar', html: `<strong>Ye kya hai:</strong> OAuth 2.0 ek standard hai jisse ek app (xyz.com) tumhari ijazat se kisi doosri jagah (Google) se tumhara thoda data le sake, bina tumhara password jaane. Kirdaar: <strong>Resource owner</strong> = tum (Riya), data ki maalik. <strong>Client</strong> = xyz.com, jo data chahta hai. <strong>Authorization server</strong> = Google ka login server, jo tumhe pehchanta aur ijazat leta hai. <strong>Resource server</strong> = Google ki API jahan data rakha hai.<br><strong>Kyun chahiye:</strong> pehle log apna Gmail password doosri sites ko de dete the (bahut khatarnak). OAuth mein password sirf Google dekhta hai, aur xyz.com ko sirf utni ijazat milti hai jitni tumne di.<br><strong>Iske bina:</strong> har site pe naya password, ya apna asli password doosron ko dena.` },
    { type: 'callout', tone: 'term', title: 'Naya word: scope, authorization code, access token', html: `<strong>Scope</strong> = kitni ijazat maangi: <code>email profile</code> (sirf naam aur email), na ki "saari Gmail". <strong>Authorization code</strong> = Google ka diya ek chhota, ek-baar-use hone wala code jo browser ke through xyz.com tak aata hai. Akela ye kisi kaam ka nahi. <strong>Access token</strong> = asli "permission slip" jisse xyz.com Google API se data le sakta hai. Ye code ke badle mein, server-to-server, milta hai.<br><strong>Kyun do kadam (code, phir token):</strong> browser ka raasta (URLs, history, extensions) utna safe nahi. Wahan sirf bekaar-akela code jaata hai; asli token ek alag, seedhe, HTTPS channel pe.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'u', label: 'Browser', sub: 'Riya', x: 95, y: 170, w: 130, kind: 'client', info: 'Ye kya hai: Riya ka browser (ya phone pe app). Saare redirects isi ke through hote hain. Ye beech ka raasta sabse kam bharose ka hai, isliye ispe sirf code jaata hai, token nahi.' },
        { id: 'x', label: 'xyz.com', sub: 'client app', x: 400, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: OAuth mein xyz.com ko "client" kehte hain. Iske paas Google se mila client ID (aur server pe chhupa client secret) hai. Ye state aur PKCE verifier banata aur yaad rakhta hai.' },
        { id: 'g', label: 'Google', sub: 'auth server', x: 400, y: 280, w: 150, kind: 'net', info: 'Ye kya hai: authorization server. Riya ko pehchanta hai (password, 2FA), consent leta hai, code deta hai, aur code + verifier check karke tokens deta hai.' },
        { id: 'att', label: 'Attacker', sub: 'chor app', x: 640, y: 170, w: 130, kind: 'threat', hidden: true, info: 'Ye kya hai: koi buri app ya website. Shayad phone pe ek nakli app jisne xyz.com jaisa hi link-scheme register kar liya, taaki redirect ka code use mil jaaye.' },
      ],
      edges: [{ a: 'u', b: 'x' }, { a: 'u', b: 'g' }, { a: 'x', b: 'g' }, { a: 'u', b: 'att' }, { a: 'att', b: 'g' }],
      scenarios: [
        { name: 'Login with Google (code + PKCE)', steps: [
          { title: 'Riya "Continue with Google" dabati hai', go: 'u>x', text: 'xyz.com ko Riya ko Google ke paas bhejna hai.' },
          { title: 'xyz.com do secret banata hai, phir redirect', text: 'Ek random <strong>state</strong> (CSRF se bachav) aur ek random <strong>code_verifier</strong>. Verifier apne paas rakhta hai, aur Google ko sirf uska SHA-256 hash (code_challenge) bhejta hai. URL mein client ID, scope aur wapas aane ka address (redirect URI) bhi.', go: 'res:x>u', msg: '302 → accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=xyz\n&scope=openid email profile&redirect_uri=https://xyz.com/callback\n&state=r4nd0m&code_challenge=E9Melhoa...&code_challenge_method=S256' },
          { title: 'Riya Google pe login aur consent', text: 'Password Google pe dala, xyz.com pe nahi. Google poochhta hai: "xyz.com ko tumhara naam aur email dein?" Riya "Allow" dabati hai. Google code_challenge yaad rakh leta hai.', go: ['u>g', 'res:g>u'] },
          { title: 'Google code ke saath wapas bhejta hai', text: 'Browser xyz.com/callback pe aata hai ek ek-baar-use hone wale code ke saath. xyz.com check karta hai ki state wahi hai jo usne bheja tha.', go: 'u>x', msg: 'GET https://xyz.com/callback?code=4/0AY0e...&state=r4nd0m' },
          { title: 'xyz.com server code ko tokens se badalta hai', text: 'Server se server, HTTPS pe. Saath mein code_verifier. Google hash karke dekhta hai: SHA-256(verifier) == pehle mila challenge? Haan. Tab tokens deta hai.', go: ['x>g', 'res:g>x'], msg: 'POST /token { code, code_verifier, client_id, client_secret, redirect_uri }\n→ { access_token, id_token, expires_in: 3599 }' },
          { title: 'Riya logged in', text: 'id_token (ek JWT, Google ka signed) se xyz.com ko pata chala: ye riya@gmail.com hai. xyz.com uska signature Google ki public keys se check karta hai, phir apna session/JWT bana ke Riya ko deta hai.', go: 'res:x>u', set: { x: { state: 'ok', sub: 'Riya logged in' } } },
        ]},
        { name: 'Chori hua code (PKCE bachaata hai)', steps: [
          { title: 'Redirect pe code chori', text: 'Riya ke phone pe ek nakli app ne xyz.com jaisa link register kar rakha tha. Google ka redirect usne pakad liya. Ab chor ke paas code hai.', show: ['att'], go: 'u>att', msg: 'xyzapp://callback?code=4/0AY0e...&state=r4nd0m' },
          { title: 'Chor token maangta hai', text: 'Chor code bhejta hai, lekin uske paas asli code_verifier nahi hai (wo xyz.com app ke andar hi raha, kabhi network pe gaya hi nahi). Wo apna random verifier bhejta hai.', go: 'att>g', msg: 'POST /token { code: 4/0AY0e..., code_verifier: <galat> }' },
          { title: 'Google mana kar deta hai', text: 'SHA-256(chor ka verifier) challenge se match nahi karta. Code bekaar. Isliye RFC 9700 (OAuth security ki best practice) kehta hai ki public clients (mobile/browser apps) ke liye PKCE zaroori hai, aur baaki sab ke liye bhi recommended.', go: 'bad:g>att', after: { att: { state: 'down' } }, msg: '400 { "error": "invalid_grant" }' },
        ]},
        { name: 'CSRF: state match nahi', steps: [
          { title: 'Chor apna hi code bhejwata hai', text: 'Chor ne apne Google account se ek code liya, aur Riya ko ek link bheja jo usse xyz.com/callback pe le jaata hai, chor ke code ke saath.', show: ['att'], go: 'att>u', msg: 'https://xyz.com/callback?code=CHOR_KA_CODE&state=kuch_bhi' },
          { title: 'Riya ka browser link kholta hai', text: 'Agar xyz.com bina soche code use kar le, to Riya chor ke account mein logged in ho jaayegi. Jo bhi wo upload karegi, chor dekh lega.', go: 'u>x' },
          { title: 'State check fail', text: 'xyz.com ne Riya ke session mein rakha state dekha: ye request kabhi xyz.com ne shuru hi nahi ki thi. Reject.', go: 'bad:x>u', after: { x: { state: 'warn' } }, msg: '400 Bad Request: state mismatch' },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'Naya word: PKCE', html: `<strong>Ye kya hai:</strong> PKCE (Proof Key for Code Exchange, bolte hain "pixie") ek chhota sa taala hai. Shuru mein app ek random <strong>code_verifier</strong> banati hai aur chhupa ke rakhti hai. Google ko sirf uska hash (<strong>code_challenge</strong> = SHA-256, base64url) bhejti hai. Token lete waqt asli verifier dikhati hai. Google hash karke milata hai.<br><strong>Kyun chahiye:</strong> mobile app ya browser app mein client secret chhupa nahi sakte (code koi bhi khol ke padh sakta hai). PKCE har login ke liye ek naya "secret" bana deta hai jo sirf usi app ke paas hai.<br><strong>Iske bina:</strong> redirect pe code chori = chor ko tokens.<br><strong>Example:</strong> neeche RFC 7636 ka asli example: verifier <code>dBjftJeZ...</code> ka challenge <code>E9Melhoa...</code> banta hai.` },
    { type: 'custom', render(el) {
      const S = { ver: 'code_verifier (sirf xyz.com app ke paas)', chal: 'code_challenge = base64url(SHA-256(verifier)) → Google ko gaya', newV: 'Naya verifier banao', good: 'xyz.com: sahi verifier se token maango', bad: 'Chor: chura hua code + apna verifier', reset: 'RFC wala example',
        google: 'Google ka check', match: '✓ Match: tokens diye (access_token, id_token)', nomatch: '✗ Match nahi: 400 invalid_grant, code bekaar',
        row: (h, c) => `SHA-256(aaya verifier) = ${h}\nPehle mila challenge   = ${c}`,
        note: 'Challenge se verifier ulta nikaalna namumkin (SHA-256 one-way hai). Isliye challenge sabko dikh bhi jaaye, to bhi chor sahi verifier nahi bana sakta.' };
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
    { type: 'callout', tone: 'why', title: 'Itne steps kyun?', html: `Har step ek attack rokta hai. Password sirf Google dekhta hai. Code browser se guzarta hai, lekin tokens sirf server-to-server channel pe milte hain. <code>state</code> pakka karta hai ki wapas aane wali request wahi hai jo xyz.com ne shuru ki thi (CSRF se bachav). PKCE pakka karta hai ki code wahi le ja sakta hai jisne flow shuru kiya. <code>redirect_uri</code> Google pe pehle se registered hoti hai, taaki code kisi aur address pe na bheja ja sake. Purana "implicit flow" (token seedha URL mein) ab use nahi karna chahiye.` },

    { type: 'h2', text: 'OpenID Connect: OAuth ke upar login' },
    { type: 'p', html: `Ek baat dhyaan se: OAuth 2.0 asal mein <strong>authorization</strong> ke liye bana tha ("xyz.com ko meri Google Photos padhne do"), login ke liye nahi. Access token batata hai "is token se kya kar sakte ho", ye nahi ki "ye kaun hai". Login ke liye iske upar ek patli layer hai: <strong>OpenID Connect (OIDC)</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: OpenID Connect aur ID token', html: `<strong>Ye kya hai:</strong> OIDC OAuth 2.0 ke upar ek standard hai jo login (authentication) jodta hai. Scope mein <code>openid</code> likhte hi Google access token ke saath ek <strong>ID token</strong> bhi deta hai: ek JWT jisme likha hai kaun hai (<code>sub</code>, <code>email</code>, <code>name</code>), kisne banaya (<code>iss</code> = Google), kiske liye (<code>aud</code> = xyz.com ka client ID), aur kab tak (<code>exp</code>).<br><strong>Kyun chahiye:</strong> har company apna alag "login with" tareeka na banaye. Ek standard, har identity provider (Google, Microsoft, Okta) ke saath same code.<br><strong>Iske bina:</strong> access token se user ka andaza lagana, jo galat aur khatarnak hai.<br><strong>Check karna zaroori:</strong> ID token ka signature (Google ki public keys se), <code>iss</code>, <code>aud</code> (ye token xyz.com ke liye hi bana?), aur <code>exp</code>.` },
    { type: 'callout', tone: 'mistake', html: `<strong>"OAuth = login."</strong> Aadha sach. OAuth 2.0 = ijazat dena (authorization). Login = OAuth + OpenID Connect ka ID token. "Login with Google" asal mein OIDC hai, jo OAuth ke authorization code flow pe chalta hai.` },

    { type: 'h2', text: 'SSO: ek login, kai apps' },
    { type: 'p', html: `<strong>Single Sign-On (SSO)</strong>: ek baar company account se login kiya, aur email, chat, HR portal, sab apne aap khul gaye. Ek central <strong>identity provider (IdP)</strong>, jaise Okta, Google Workspace ya Microsoft Entra ID (pehle Azure AD), sab apps ke liye pehchaan karta hai. Har app khud password nahi rakhti, IdP pe bharosa karti hai.` },
    { type: 'list', items: [
      `<strong>OIDC</strong>: naya, JSON/JWT pe, web aur mobile dono ke liye aasaan. Naye apps aksar yahi.`,
      `<strong>SAML</strong>: purana (2000s), XML pe based, abhi bhi bahut saare enterprise apps mein. Idea same: IdP ek signed "assertion" deta hai ki ye user kaun hai.`,
      `<strong>Faayda</strong>: employee chhode to IdP mein ek jagah band karo, saari apps se bahar. MFA bhi ek jagah lagta hai.`,
    ]},
    { type: 'h2', text: 'Authorization kaise hota hai: RBAC' },
    { type: 'p', html: `Pehchaan ho gayi. Ab har action pe sawaal: "kya ye user ye kar sakta hai?" Har user ke liye alag alag permissions likhna (crores users) namumkin. Isliye beech mein <strong>roles</strong> aate hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: RBAC', html: `<strong>Ye kya hai:</strong> RBAC (Role-Based Access Control): users ko <strong>roles</strong> milte hain (user, moderator, admin), aur roles ko <strong>permissions</strong> (post delete, user ban). User ki permissions = uske role ki permissions.<br><strong>Kyun chahiye:</strong> naya moderator banana = bas role dena. Permission badalni ho to ek jagah, role pe.<br><strong>Iske bina:</strong> har user pe haath se permissions, galtiyan, aur "ye access kisne diya?" ka koi jawab nahi.<br><strong>Saath mein ownership:</strong> role kehta hai "users apni post edit kar sakte hain"; code check karta hai ki <em>ye</em> post <em>isi</em> user ki hai. Jab niyam aur complex hon (samay, jagah, department), to <strong>ABAC</strong> (attribute-based) jaise tareeke aate hain.` },
    { type: 'custom', render(el) {
      const S = { who: 'Kaun', what: 'Kya karna hai', check: 'Check karo',
        users: [['Riya', 'user', 42], ['Kabir', 'moderator', 7], ['Aman', 'admin', 1]],
        acts: ['Post 9 padho', 'Post 9 edit karo (Riya ki post)', 'Post 9 delete karo', 'User 99 ko ban karo', 'Admin stats dekho'],
        perm: 'Permission', ok: (c, why) => `${c} OK. ${why}`, no: why => `403 Forbidden. ${why}`,
        why: { role: (r, p) => `Role "${r}" ke paas "${p}" hai.`, own: (p) => `Role ke paas "${p}" hai, aur post 9 isi user ki hai (ownership check pass).`, notOwn: (p, r) => `Role "${r}" ke paas sirf "${p}" hai, lekin post 9 Riya ki hai, iski nahi. Aur "any" wali permission bhi nahi.`, none: (r, p) => `Role "${r}" ke paas "${p}" nahi hai.` } };
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
    { type: 'callout', tone: 'warn', html: `Authorization hamesha <strong>server</strong> pe check karo, har request pe. App mein "Delete" button chhupa dena security nahi hai: koi bhi seedha API call kar sakta hai (<code>curl -X DELETE /api/v1/posts/9</code>). Aur ownership check bhoolna sabse common bug hai: <code>/api/v1/orders/1001</code> ko <code>/1002</code> karke kisi aur ka order dikh jaana. Har user ko utni hi permission do jitni zaroori hai (least privilege).` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Web app (same domain):</strong> server-side session, ID ek <code>HttpOnly; Secure; SameSite</code> cookie mein. Revoke aasaan. <strong>Mobile app, APIs, microservices:</strong> chhote access tokens (JWT, 5-15 min) + server pe rakhe, rotate hone wale refresh tokens. <strong>"Login with Google/Microsoft":</strong> OAuth 2.0 authorization code flow + PKCE, OpenID Connect ke ID token ke saath; implicit flow kabhi nahi. <strong>Company ke andar kai apps:</strong> SSO (OIDC ya SAML) ek IdP ke saath. <strong>Partner servers:</strong> API keys (hash karke rakho) ya OAuth client credentials. <strong>Permissions:</strong> RBAC + ownership check, hamesha server pe. Passwords: Argon2id/bcrypt, aur MFA.` },
    { type: 'diagram', title: 'Auth: poori picture', height: 530,
      groups: [
        { label: 'Clients', x: 10, y: 14, w: 700, h: 92 },
        { label: 'Auth', x: 20, y: 280, w: 180, h: 232 },
        { label: 'Data', x: 270, y: 400, w: 440, h: 112 },
      ],
      nodes: [
        { id: 'br', label: 'Browser', sub: 'session cookie', x: 100, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com website. Login ke baad HttpOnly cookie mein session ID rakhta hai; har request ke saath browser khud bhejta hai.' },
        { id: 'mob', label: 'Mobile app', sub: 'JWT + refresh', x: 300, y: 60, kind: 'client', info: 'Ye kya hai: xyz.com app. Chhota access token (JWT) har request ke Authorization header mein, aur refresh token phone ke secure storage mein.' },
        { id: 'partner', label: 'Partner server', sub: 'API key', x: 560, y: 60, w: 150, kind: 'client', info: 'Ye kya hai: bahar ki company ka program. Koi insaan login nahi karta; API key se pehchaan, apni limits aur scopes ke saath.' },
        { id: 'gw', label: 'API gateway', sub: 'verify token / key', x: 330, y: 200, w: 170, kind: 'edge', info: 'Ye kya hai: sab requests ka darwaza. Har request pe AuthN: cookie ho to session store se poochho, JWT ho to signature + exp check, API key ho to uska hash milao. Fail = 401. Pass = andar "user 42, role user" ke saath bhejo.' },
        { id: 'auth', label: 'Auth service', sub: 'login, tokens', x: 110, y: 330, w: 150, kind: 'server', info: 'Ye kya hai: login ka kaam karne wali service. Password hash check, MFA, Google ke saath OIDC flow (state + PKCE), aur tokens/sessions banana. Refresh tokens rotate karti hai.' },
        { id: 'google', label: 'Google', sub: 'OIDC provider', x: 110, y: 470, w: 150, kind: 'net', info: 'Ye kya hai: bahar ka identity provider. "Login with Google" mein Riya ko pehchanta hai aur xyz.com ko code, phir ID token deta hai. Riya ka password sirf yahin jaata hai.' },
        { id: 'app', label: 'App services', sub: 'RBAC + owner', x: 560, y: 330, w: 160, kind: 'server', info: 'Ye kya hai: feed, posts, admin jaisi services. Har action pe AuthZ: role ke paas permission hai? Ye cheez isi user ki hai? Nahi = 403.' },
        { id: 'redis', label: 'Redis', sub: 'sessions, refresh', x: 360, y: 470, w: 160, kind: 'cache', info: 'Ye kya hai: tez in-memory store. Session ID → user, refresh tokens, aur zaroorat ho to revoked token ids (denylist). Logout = yahan se delete. Replicated rakho, warna ye gira to sab logged out.' },
        { id: 'udb', label: 'Users DB', sub: 'hashes, roles', x: 580, y: 470, w: 150, kind: 'data', info: 'Ye kya hai: users ki table: email, Argon2id/bcrypt password hash, roles, API key hashes. Login pe aur roles dekhne ke liye padhi jaati hai.' },
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
        { name: 'Password login', text: 'Auth service ne DB se hash milaya, phir session/refresh token Redis mein likha aur cookie ya tokens lautaye.', go: ['br>gw>auth>udb', 'auth>redis'] },
        { name: 'Login with Google', text: 'Auth service Google ke saath OIDC flow (state + PKCE) chalati hai, ID token check karke apna session banati hai.', go: ['br>gw>auth>google', 'auth>redis'] },
        { name: 'API call (JWT)', text: 'Gateway ne JWT ka signature aur exp check kiya (koi lookup nahi). App service ne RBAC + ownership check kiya.', go: ['mob>gw>app>udb'] },
        { name: 'Partner (API key)', text: 'Gateway ne API key ka hash milaya, partner ki scopes aur limits lagaayi, phir andar bheja.', go: ['partner>gw>app'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>AuthN = "tum kaun ho?" (fail: 401). AuthZ = "kya allowed hai?" (fail: 403). Pehle AuthN, phir AuthZ.</li>
      <li>Password kabhi plain text mein nahi: Argon2id/bcrypt, salt ke saath. Upar se MFA.</li>
      <li>Session: random ID cookie mein, data server ke store mein. Revoke aasaan, lekin store chahiye (aur replicated).</li>
      <li>JWT: header.payload.signature. Payload koi bhi padh sakta hai; signature badalne nahi deta. Server khud algorithm aur key tay kare.</li>
      <li>JWT revoke mushkil: chhota access token + server pe rakha, rotate hone wala refresh token (+ zaroorat ho to denylist).</li>
      <li>API keys = programs ki pehchaan. Hash karke rakho, scopes do, mobile app mein mat daalo.</li>
      <li>OAuth 2.0 authorization code flow: password sirf Google ko, browser pe sirf code, tokens server-to-server. state = CSRF se bachav, PKCE = chori hua code bekaar.</li>
      <li>OIDC = OAuth + ID token = login. SSO = ek IdP, kai apps. RBAC + ownership, hamesha server pe.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Har request pe pakki pehchaan, bina password baar baar bheje', 'JWT: services bina central lookup ke khud verify kar sakti hain', 'OAuth/OIDC: password sirf identity provider ke paas; users ko naya password yaad nahi rakhna', 'RBAC: permissions ek jagah, roles se', 'SSO: ek jagah se sab apps ka access band'], costs: ['Sessions: har request pe store lookup, store ek single point of failure', 'JWT: revoke mushkil, token bada, galat config (alg none, localStorage) se khatre', 'OAuth flow mein kai steps: state, PKCE, redirect URI, ID token checks, sab sahi karne padte hain', 'Bahar ke IdP pe bharosa: Google down to "Login with Google" down', 'Har endpoint pe AuthZ check bhoolna = data leak'] },
    { type: 'think', questions: [
      { q: 'xyz.com ne JWT ki expiry 30 din rakhi. Riya ka phone chori ho gaya. Kya problem hai aur fix kya?', a: 'Chor 30 din tak Riya ban ke API use kar sakta hai, aur server ke paas token cancel karne ka simple tareeka nahi. Fix: access token 5-15 min, refresh token lamba lekin server pe store aur revoke karne layak, aur rotate hone wala. Logout / "sab devices se logout" pe refresh tokens delete.' },
      { q: 'OAuth mein code ko seedha browser mein hi token se kyun nahi badal lete?', a: 'Kyunki web app ke case mein usme client secret chahiye, aur browser mein rakha secret secret nahi rehta. Token exchange server pe hota hai jahan secret safe hai. Jo apps secret rakh hi nahi sakti (mobile, single-page apps), wo PKCE use karti hain: har login ka naya verifier.' },
      { q: 'Ek user /api/v1/orders/1001 kholta hai (apna order). Phir URL mein 1002 likh deta hai aur kisi aur ka order dikh jaata hai. Kya galti hai?', a: 'AuthN theek tha (user logged in), lekin AuthZ mein ownership check nahi tha. Server ko har request pe dekhna chahiye ki order 1002 isi user ka hai; nahi to 403 (ya 404, taaki ye bhi pata na chale ki order exist karta hai).' },
      { q: 'Ek hacker ne JWT ka payload "role": "admin" kar diya. Server ne use admin maan liya. Kaunsi do galtiyan ho sakti hain?', a: '(1) Server signature verify hi nahi kar raha tha (sirf decode). (2) Server token ke header ka alg maan raha tha, aur hacker ne "alg": "none" likh ke signature hata diya. Fix: hamesha verify, aur algorithm/key server khud tay kare.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Riya logged in hai lekin admin page kholti hai jo uske liye nahi. Status code?', options: ['401', '403', '500'], answer: 1, explain: 'Pehchaan ho chuki (AuthN pass), permission nahi (AuthZ fail).' },
      { q: 'JWT ka payload:', options: ['Encrypted hota hai', 'Sirf encoded hai, koi bhi padh sakta hai', 'Server pe store hota hai'], answer: 1, explain: 'Signature tampering rokta hai, chhupaata nahi.' },
      { q: '"Login with Google" mein xyz.com ko Riya ka Google password:', options: ['Milta hai', 'Kabhi nahi milta', 'Encrypted milta hai'], answer: 1, explain: 'Password sirf Google dekhta hai. xyz.com ko code, phir tokens milte hain.' },
      { q: 'Passwords store karne ke liye sabse sahi?', options: ['Plain text, lekin DB pe password', 'SHA-256 hash', 'Argon2id ya bcrypt, har user ka alag salt'], answer: 2, explain: 'Password hash jaan boojh ke slow hona chahiye. SHA-256 bahut tez hai: chor arabon guesses per second try kar leta hai.' },
      { q: 'PKCE kis attack ko rokta hai?', options: ['Password guessing', 'Redirect pe chori hua authorization code ko token mein badalna', 'DDoS'], answer: 1, explain: 'Token lene ke liye asli code_verifier chahiye, jo sirf usi app ke paas hai jisne flow shuru kiya.' },
      { q: 'Sessions ka JWT pe sabse bada faayda?', options: ['Koi store nahi chahiye', 'Turant revoke (logout) aasaan', 'Token chhota nahi hota'], answer: 1, explain: 'Store se entry delete = turant har jagah se bahar. JWT apne exp tak chalta rehta hai.' },
      { q: 'OpenID Connect OAuth 2.0 mein kya jodta hai?', options: ['Encryption', 'ID token, yaani login (user kaun hai)', 'Rate limiting'], answer: 1, explain: 'OAuth = ijazat (access token). OIDC = pehchaan (ID token, signed JWT).' },
    ]},
    { type: 'sources', note: 'Standards aur security guidance inhi official documents se.', items: [
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
