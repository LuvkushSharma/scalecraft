Lesson.register({
  id: 'crypto-keys',
  title: 'Public key, private key and key exchange',
  minutes: 40,
  summary: `In the last lesson we saw the HTTPS lock. Now we look inside that lock: one shared key (symmetric) vs a pair of keys (public + private), who holds which key, how two strangers create a secret with Diffie-Hellman, how a certificate proves the server is real, and how, after the handshake, the server checks who <em>you</em> are and what you are allowed to do.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Riya is logging in to xyz.com from a cafe WiFi. Anyone in the middle can listen.<br>There are three questions: (1) <strong>How can Riya and xyz.com create a secret</strong> when the person in the middle hears everything? (2) <strong>How does Riya know this is the real xyz.com</strong> and not a fake? (3) <strong>How does xyz.com know this is really Riya</strong>, and what should it let her do?<br>The answers are three tools: a key pair (public key + private key), key exchange (Diffie-Hellman), and certificates. You will run each one yourself with small numbers.` },

    { type: 'h2', text: 'The starting problem: one secret, two people, a spy in the middle' },
    { type: 'p', html: `In the <a href="#/tcp-udp-https">TCP, UDP and HTTPS</a> lesson we saw that HTTPS puts data inside a "lock". But a lock needs a <strong>key</strong>. And that is the real puzzle:` },
    { type: 'list', items: [
      `Riya has never given xyz.com a key before. They are meeting for the first time.`,
      `Every message between them goes over the cafe WiFi. Anyone on the same WiFi (let us call her <strong>Eve</strong>, from "eavesdropper") can read everything.`,
      `If xyz.com sends a key over the network, Eve copies it too. Then the lock is useless.`,
    ]},
    { type: 'p', html: `This whole lesson is about solving this puzzle. First let us look at the simplest way, and see where it breaks.` },

    { type: 'h2', text: 'Symmetric key: one key, both sides have it' },
    { type: 'callout', tone: 'term', title: 'New word: symmetric key', html: `<strong>What it is:</strong> one secret key (a long random number) that both locks the data (<strong>encrypt</strong>) and unlocks it (<strong>decrypt</strong>). Think of a door lock with two identical keys: one with you, one with your friend.<br><strong>Why we need it:</strong> it is very fast. Today's standard, <strong>AES</strong> (Advanced Encryption Standard), can encrypt gigabytes every second, because modern CPUs have special instructions for it.<br><strong>Without it:</strong> encrypting videos, photos and whole web pages would be very slow.<br><strong>Example:</strong> the real data of an HTTPS connection (your feed, videos, password) is encrypted with a symmetric key like AES.` },
    { type: 'p', html: `<strong>Small example (a toy cipher):</strong> key = 3. Move every letter 3 places forward in the alphabet. <code>HELLO</code> becomes <code>KHOOR</code>. The other person, who also has key 3, moves every letter 3 places back and gets <code>HELLO</code> again. Eve only sees <code>KHOOR</code>. (This toy is only for understanding. It has just 26 keys, so Eve can break it in 26 tries. An AES key is 128 or 256 bits long: 2<sup>128</sup> possible keys, which all the computers in the world together cannot try.)` },
    { type: 'callout', tone: 'why', title: 'So what is the problem? Delivering the key', html: `A symmetric key only works when <strong>both sides already have the same key</strong>. Riya and xyz.com are meeting for the first time. How do they share the key?<br>• Send it over the network: Eve copies it. Now she can read everything.<br>• Send it by courier: impossible for millions of users around the world.<br>• And if everyone talks to everyone (a chat app), every pair needs its own key. N people = N×(N−1)/2 keys. Just 1,000 people = <strong>499,500 keys</strong>. One million people = about 500 billion keys.<br>This is called the <strong>key distribution problem</strong>. Solving it needed a completely different idea.` },

    { type: 'h2', text: 'Asymmetric: a lock and key pair' },
    { type: 'p', html: `In the 1970s a brilliant idea appeared: what if the thing that <strong>locks</strong> and the thing that <strong>unlocks</strong> were different?` },
    { type: 'callout', tone: 'analogy', title: 'Think of an open padlock', html: `xyz.com has a special padlock. Anyone can <strong>snap it shut</strong>, without a key. But to <strong>open</strong> it you need a key that only xyz.com has.<br>xyz.com hands out thousands of these open padlocks to everyone. Riya puts her secret in a box, snaps xyz.com's padlock shut, and sends it. Eve also has the same open padlock, but she does not have the key that opens the closed box.<br>Padlock = <strong>public key</strong>. Key = <strong>private key</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: public key and private key (key pair)', html: `<strong>What it is:</strong> a pair of two keys that are linked by maths. One program creates both together (like <code>openssl</code> or <code>ssh-keygen</code>).<br>• <strong>Public key</strong>: give it to everyone. Put it on your website. With it, anyone can lock (encrypt) data for you and check your signature.<br>• <strong>Private key</strong>: never give it to anyone. It stays on the machine that created it. It opens locked data and creates signatures.<br><strong>Why we need it:</strong> now you never have to send the key. You only send the padlock (the public key), and stealing it gives nothing.<br><strong>Without it:</strong> the key distribution problem: every new pair would first need a safe way to deliver a key.<br><strong>Most important point:</strong> getting the private key from the public key is practically impossible. All the security depends on this.` },
    { type: 'p', html: `<strong>Worked example (xyz.com):</strong> xyz.com created a key pair. It gave the public key to everyone. Riya wants to send her coupon code <code>RIYA50</code> secretly. She encrypts it with xyz.com's <strong>public key</strong>: out comes something like <code>9f3a…c1</code>. Eve sees this garbage. Eve also has the public key, but the public key <em>cannot open</em> it. Only xyz.com gets <code>RIYA50</code> back, with its <strong>private key</strong>.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "if you have the public key, you can decrypt"', html: `No. The public key can only <strong>lock</strong>, not open. That is why it is safe to give it to the whole world. A second mistake: "the server sends its private key so the client can decrypt". Never. If a private key leaves its machine even once, treat it as leaked (see the "key leak" section below).` },

    { type: 'h2', text: 'Who holds which key? (the most important table)' },
    { type: 'p', html: `Beginners get confused here the most. Remember one simple rule: <strong>whoever has to prove who they are holds a private key. Whoever has to check holds the public key.</strong>` },
    { type: 'list', items: [
      `<strong>Normal HTTPS:</strong> only the server has to prove "I am the real xyz.com". So the <strong>server's</strong> private key stays secret on its own machine (or load balancer). Its public key is given to every visitor inside a <strong>certificate</strong>. <strong>The browser has no key pair.</strong> The browser only has a list of public keys of a few trusted companies (CAs), which it uses to check certificates.`,
      `<strong>mTLS and SSH:</strong> here the client also has to prove who it is. So <strong>the client also has its own key pair</strong>.`,
    ]},
    { type: 'table', head: ['Where', 'Who holds the private key', 'Who holds the public key', 'What it proves'], rows: [
      ['HTTPS (normal website)', 'Only the xyz.com server / load balancer', 'Everyone (inside the certificate). CA public keys inside the browser', 'The server is real. The user is identified later with a password/passkey'],
      ['mTLS (service to service)', 'Both services, each its own', 'Both look at each other\'s certificate', 'Identity on both sides: "I am the Orders service"'],
      ['SSH (login to a server)', 'On the developer\'s laptop (<code>~/.ssh/id_ed25519</code>). The server also has its own "host key"', 'The developer\'s in the server\'s <code>authorized_keys</code> file. The server\'s in the laptop\'s <code>known_hosts</code>', 'The developer is real, and the server is real too'],
      ['JWT RS256 (login token)', 'Only the Auth service (it signs tokens)', 'Every API service (gets it from a JWKS URL)', 'The token was made by the Auth service and nobody changed it'],
      ['WhatsApp-style end-to-end chat', 'On each user\'s phone (created at install)', 'Stored on the server, other users fetch it from there', 'Only Riya and Aman can read it, not even the server'],
      ['UPI PIN', 'NPCI (secure bank/NPCI systems)', 'NPCI\'s library inside the UPI app on your phone', 'The PIN is not visible on the way, not even to the UPI app'],
    ]},
    { type: 'p', html: `More detail on the last two rows: according to WhatsApp's technical white paper, each phone creates its own key pairs at install time and registers only the <strong>public</strong> keys with the server. The server does not store private authentication secrets for users. In UPI, the PIN is not taken by your UPI app but by an NPCI "Common Library", which encrypts the PIN on the phone with NPCI's RSA <strong>public key</strong>. The public details of this library come from NPCI circulars and a community-written specification; the full internal design is not public.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "in HTTPS the browser also sends its key"', html: `In normal HTTPS the browser has <strong>no private key and no certificate of its own</strong>. The browser's job is only to check. The secret created between the browser and the server (the session key) is new and temporary for each connection (made with Diffie-Hellman, see below). It is not "the browser's key pair". A client has its own long-term key pair only in places like mTLS, SSH and passkeys.` },

    { type: 'h2', text: 'Two jobs of a key pair: lock and signature' },
    { type: 'p', html: `One key pair can do two completely opposite jobs. Understand them separately:` },
    { type: 'compare',
      left: { title: 'Job 1: Encryption (hiding)', html: `<strong>Lock with the public key → only the private key opens it.</strong><br>Anyone can send you a secret, only you can read it.<br><em>Example:</em> Riya locks a coupon code with xyz.com's public key. Only xyz.com can open it.<br><em>Question it answers:</em> "nobody else should read this."` },
      right: { title: 'Job 2: Signature', html: `<strong>Sign with the private key → anyone checks with the public key.</strong><br>Only you can sign, the whole world can check.<br><em>Example:</em> xyz.com signs its login token. Every service checks with the public key that the token is real and nobody changed it.<br><em>Question it answers:</em> "this really came from them, and it was not changed."` },
    },
    { type: 'callout', tone: 'term', title: 'New word: digital signature', html: `<strong>What it is:</strong> a number made from a message and a private key. Anyone with the public key can check that (1) it was made with this private key, and (2) not a single letter of the message has changed.<br><strong>Why we need it:</strong> it answers "did xyz.com really send this?" without sharing any secret.<br><strong>Without it:</strong> anyone could call themselves xyz.com and send a fake certificate, a fake token or a fake software update.<br><strong>Example:</strong> in TLS the server signs the handshake, a CA signs certificates, the Auth service signs JWTs, and your phone's OS checks the signature of app updates.` },
    { type: 'callout', tone: 'term', title: 'New word: hash', html: `<strong>What it is:</strong> a one-way function that turns data of any size into a short, fixed-size "fingerprint" (like SHA-256: always 256 bits). Same input = same hash. Change one letter = a completely different hash. You cannot get the data back from the hash.<br><strong>Why we need it:</strong> signing a 1 GB file directly is slow. So we first compute its hash, then sign only the hash.<br><strong>Without it:</strong> signatures would be very slow.<br><strong>Example:</strong> <code>SHA-256("hello")</code> = <code>2cf24dba…9824</code>. Nobody can "decrypt" this, because there is no key at all.` },
    { type: 'table', head: ['', 'Hashing', 'Encryption', 'Signing'], rows: [
      ['Key?', 'No key', 'Yes (one symmetric key, or public/private)', 'Yes (private signs, public checks)'],
      ['Can you get it back?', 'No, one-way', 'Yes, with the right key', 'The message travels with it; the signature is only checked'],
      ['Question it answers', 'Was the data changed? How do we store passwords safely?', 'Nobody else should read it', 'Who sent it? Was it changed on the way?'],
      ['xyz.com example', 'Passwords stored in the DB as hashes (bcrypt/Argon2)', 'HTTPS data with AES', 'JWT token, certificate, TLS handshake'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "passwords are encrypted and stored in the DB"', html: `No, passwords are <strong>hashed</strong> (with a salt, using a slow function like bcrypt or Argon2; details in the <a href="#/auth-basics">AuthN, AuthZ</a> lesson). If they were encrypted, whoever had the key could read every password. With a hash, even the server does not know the real password; it can only check it. Also, "signing = encrypting with the private key" is not fully true: in RSA the maths looks similar, but in algorithms like Ed25519 signing and encryption are completely different things. Think of them as separate jobs.` },

    { type: 'h2', text: 'Inside RSA: with small numbers' },
    { type: 'p', html: `"You cannot get the private key from the public key": how does this magic work? Let us look at the oldest famous algorithm, <strong>RSA</strong> (1977, named after Rivest, Shamir and Adleman), with small numbers. First two words:` },
    { type: 'callout', tone: 'term', title: 'New word: prime number and mod', html: `<strong>Prime:</strong> a number that divides evenly only by 1 and itself: 2, 3, 5, 7, 11, 13...<br><strong>mod</strong> (modulo): divide and keep only the <strong>remainder</strong>. <code>64 mod 33 = 31</code>, because 64 = 33 × 1 + 31. A clock also works with mod: 10 o\'clock + 5 hours = 3 o\'clock (15 mod 12).<br><strong>Why we need it:</strong> all of RSA\'s maths happens in this "mod" world, where numbers keep going round in a circle. That is why going backwards (finding the private key) becomes very hard.` },
    { type: 'steps', items: [
      { t: 'Pick two secret primes', d: '<code>p = 3</code>, <code>q = 11</code>. Never tell anyone.' },
      { t: 'Compute n (public)', d: '<code>n = p × q = 33</code>. Everyone will see this.' },
      { t: 'Compute φ (secret)', d: '<code>φ = (p−1) × (q−1) = 2 × 10 = 20</code>. You need p and q to compute it.' },
      { t: 'Pick the public exponent e', d: '<code>e = 3</code> (a number that shares no common factor with 20). <strong>Public key = (n=33, e=3)</strong>.' },
      { t: 'Compute the private exponent d', d: 'A d where <code>e × d mod φ = 1</code>. <code>3 × 7 = 21</code>, and <code>21 mod 20 = 1</code>. So <code>d = 7</code>. <strong>Private key = (n=33, d=7)</strong>.' },
      { t: 'Encrypt (with the public key)', d: 'Message m = 4. <code>c = 4³ mod 33 = 64 mod 33 = 31</code>. Eve sees 31.' },
      { t: 'Decrypt (with the private key)', d: '<code>31⁷ mod 33 = 4</code>. The message is back!' },
      { t: 'Sign (with the private key)', d: '<code>s = 4⁷ mod 33 = 16384 mod 33 = 16</code>. Signature = 16.' },
      { t: 'Verify (with the public key)', d: '<code>16³ mod 33 = 4096 mod 33 = 4</code> = the message. The signature is valid. If someone changed the message from 4 to 5, then 4 ≠ 5: caught.' },
    ]},
    { type: 'p', html: `<strong>Why can Eve not break it?</strong> Eve knows n = 33 and e = 3. To find d she needs φ, and for φ she needs p and q, the two prime factors of 33. 33 = 3 × 11 is easy even for a child. But in real RSA, n is <strong>2048 bits</strong> (about 617 digits) or bigger. Nobody has ever found a fast way to find the prime factors of such a big number. Play with it yourself below:` },
    { type: 'custom', render(el) {
      const P = [3, 5, 7, 11, 13, 17, 19, 23], E = [3, 5, 7, 11, 13, 17];
      const mp = (b, e, m) => { let r = 1; b %= m; while (e > 0) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };
      const gcd = (a, b) => b ? gcd(b, a % b) : a;
      const inv = (e, f) => { for (let d = 1; d < f; d++) if (e * d % f === 1) return d; return null; };
      let p = 3, q = 11, e = 3, m = 4, tamper = false;
      el.innerHTML = `<div style="display:grid;gap:10px">
        <div><div style="font-size:14px;margin-bottom:4px">Secret prime <strong>p</strong></div><div class="ck-p" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
        <div><div style="font-size:14px;margin-bottom:4px">Secret prime <strong>q</strong></div><div class="ck-q" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
        <div><div style="font-size:14px;margin-bottom:4px">Public exponent <strong>e</strong> (only values that work with φ)</div><div class="ck-e" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
        <label>Message m = <strong class="ck-mv"></strong> (a number smaller than n)<input type="range" class="ck-m" min="2" value="4"></label></div>
        <div class="stats" style="margin-top:10px"><div class="stat"><span>Public key (n, e)</span><strong class="ck-pub"></strong></div><div class="stat"><span>Private key (n, d)</span><strong class="ck-priv"></strong></div><div class="stat"><span>Encrypted c</span><strong class="ck-c"></strong></div><div class="stat"><span>Signature s</span><strong class="ck-s"></strong></div></div>
        <pre class="ck-out" style="font-family:var(--f-mono);font-size:13px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;white-space:pre-wrap;margin:10px 0"></pre>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small ck-t">Change the message on the way</button></div>
        <div class="calc-note ck-n"></div>`;
      const q$ = s => el.querySelector(s);
      const chips = (box, list, cur, ok, set) => { box.innerHTML = ''; list.forEach(v => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (v === cur ? ' on' : ''); b.textContent = v; b.disabled = !ok(v); if (!ok(v)) b.style.opacity = '.35'; b.onclick = () => { set(v); run(); }; box.appendChild(b); }); };
      const run = () => {
        if (p === q) q = P.find(x => x !== p);
        const n = p * q, f = (p - 1) * (q - 1);
        if (gcd(e, f) !== 1 || e >= f) e = E.find(x => gcd(x, f) === 1 && x < f);
        const d = inv(e, f);
        chips(q$('.ck-p'), P, p, v => true, v => { p = v; });
        chips(q$('.ck-q'), P, q, v => v !== p, v => { q = v; });
        chips(q$('.ck-e'), E, e, v => gcd(v, f) === 1 && v < f, v => { e = v; });
        const r = q$('.ck-m'); r.max = n - 1; if (m > n - 1) m = n - 1; r.value = m; q$('.ck-mv').textContent = m;
        const c = mp(m, e, n), back = mp(c, d, n), s = mp(m, d, n), mm = tamper ? (m + 1) % n : m, chk = mp(s, e, n);
        let tries = 0; for (let k = 2; k <= n; k++) { tries++; if (n % k === 0) break; }
        q$('.ck-pub').textContent = `(${n}, ${e})`; q$('.ck-priv').textContent = `(${n}, ${d})`; q$('.ck-c').textContent = c; q$('.ck-s').textContent = s;
        q$('.ck-out').textContent = `n = ${p} × ${q} = ${n}     φ = ${p - 1} × ${q - 1} = ${f}\n` +
          `d = ${d}, because ${e} × ${d} = ${e * d} and ${e * d} mod ${f} = ${e * d % f}\n\n` +
          `ENCRYPT (public): c = ${m}^${e} mod ${n} = ${c}\nDECRYPT (private): ${c}^${d} mod ${n} = ${back}  ${back === m ? '✓ back to ' + m : '✗'}\n` +
          `Trying to open with the wrong key (e): ${c}^${e} mod ${n} = ${mp(c, e, n)}  ✗ garbage\n\n` +
          `SIGN (private): s = ${m}^${d} mod ${n} = ${s}\nVERIFY (public): ${s}^${e} mod ${n} = ${chk}, message ${tamper ? '(changed) ' : ''}= ${mm}  ${chk === mm ? '✓ genuine' : '✗ signature fails: someone changed it!'}`;
        q$('.ck-t').textContent = tamper ? 'Bring back the real message' : 'Change the message on the way';
        q$('.ck-n').textContent = `Eve only sees (${n}, ${e}). She searches for the factors of ${n}: after ${tries} tries she found ${p < q ? p : q}, and then φ and d too. With small numbers this takes a second. With a 2048-bit n (617 digits), all of today\'s computers together cannot do it. That is why real keys are 2048 bits or bigger.`;
      };
      q$('.ck-m').addEventListener('input', ev => { m = +ev.target.value; run(); });
      q$('.ck-t').onclick = () => { tamper = !tamper; run(); };
      run();
    }},
    { type: 'callout', tone: 'warn', title: 'Real RSA does not work like this', html: `The "textbook RSA" above is only for understanding. In real life: (1) keys are <strong>2048 bits or bigger</strong> (according to NIST, 2048-bit RSA gives about 112-bit security, 3072-bit about 128-bit). (2) The message is not put in directly: random <strong>padding</strong> is added (OAEP for encryption, PSS for signatures), otherwise the same message always gives the same garbage and many attacks open up. (3) Signing is always done on the message\'s <strong>hash</strong>. (4) Today most keys are <strong>elliptic curve</strong> keys (ECDSA, Ed25519): a 256-bit curve key is about as strong as 3072-bit RSA, but smaller and faster. That is why since OpenSSH 9.5 (2023), <code>ssh-keygen</code> creates an Ed25519 key by default.` },

    { type: 'h2', text: 'Key exchange: Diffie-Hellman, making a secret in front of everyone' },
    { type: 'p', html: `Now the real puzzle. Riya and xyz.com need a <strong>shared symmetric key</strong> (because AES is fast). But they cannot send the key. In 1976 Whitfield Diffie and Martin Hellman gave the answer: <strong>do not send the key at all. Let each side build it separately.</strong>` },
    { type: 'callout', tone: 'term', title: 'New word: key exchange (Diffie-Hellman)', html: `<strong>What it is:</strong> a method where two people send only public things, and still both reach the same secret number. Someone listening to everything still cannot build that secret.<br><strong>Why we need it:</strong> so both sides get the AES session key without it ever travelling on the network.<br><strong>Without it:</strong> either the key would travel on the network (Eve copies it), or it would have to be delivered earlier by some safe route (impossible).` },
    { type: 'p', html: `First understand it with paint colours, then with numbers. Imagine that mixing colours is easy, but separating a mixed colour back is very hard:` },
    { type: 'image', src: 'assets/img/crypto-keys/dh.png', maxWidth: 360, alt: 'Diffie-Hellman paint mixing: Alice and Bob start with a common yellow paint, add their own secret colour, send the mix to each other, then add their secret colour again and both end up with the same brown colour', caption: 'Diffie-Hellman with paint. Everyone knows the common colour. Each person adds a secret colour and sends only the mix. The other person\'s mix + your own secret = the same final colour for both. The person in the middle only has the mixes, and separating a mix is assumed to be "expensive".', credit: { text: 'A.J. Han Vinck (original), Flugaal (SVG), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Diffie-Hellman_Key_Exchange.svg', license: 'Public domain' } },
    { type: 'p', html: `Now the same thing with numbers. Mixing paint = <code>g<sup>secret</sup> mod p</code>. Going forward is easy, but getting the secret back from the result (this is called the <strong>discrete logarithm</strong> problem) is practically impossible with big numbers. The same numbers as in the TCP/HTTPS lesson:` },
    { type: 'table', head: ['Step', 'Riya (browser)', 'Everyone can see on the network', 'xyz.com (server)'], rows: [
      ['Public rule (common colour)', '', 'p = 23, g = 5', ''],
      ['Pick a secret (secret colour)', 'a = 6', '', 'b = 15'],
      ['Send the mix', 'A = 5<sup>6</sup> mod 23 = <strong>8</strong>', 'A = 8, B = 19', 'B = 5<sup>15</sup> mod 23 = <strong>19</strong>'],
      ['Other side\'s mix + own secret', 'K = 19<sup>6</sup> mod 23 = <strong>2</strong>', 'Eve has 23, 5, 8, 19. Not K.', 'K = 8<sup>15</sup> mod 23 = <strong>2</strong>'],
    ]},
    { type: 'p', html: `Why did both get 2? Because <code>(g<sup>b</sup>)<sup>a</sup> = (g<sup>a</sup>)<sup>b</sup> = g<sup>ab</sup></code>. Both built the same <code>g<sup>ab</sup></code>, just in a different order. Eve has <code>g<sup>a</sup></code> and <code>g<sup>b</sup></code>, but combining them does not give <code>g<sup>ab</sup></code>. She needs a or b. Try it yourself as Eve below:` },
    { type: 'custom', render(el) {
      const PR = [[23, 5, 6, 15], [47, 5, 19, 33], [227, 5, 150, 101], [2039, 7, 1729, 1200]];
      const mp = (b, e, m) => { let r = 1; b %= m; while (e > 0) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };
      let pi = 0, a = 6, b = 15, eve = false, conn = 1, seed = 2026;
      const rnd = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
      el.innerHTML = `<div style="font-size:14px;margin-bottom:4px">Public prime p (and g)</div><div class="dh-p" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"></div>
        <div class="row2"><label>Riya\'s secret a = <strong class="dh-av"></strong><input type="range" class="dh-a" min="2" value="6"></label><label>xyz.com\'s secret b = <strong class="dh-bv"></strong><input type="range" class="dh-b" min="2" value="15"></label></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:12px 0">
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;background:var(--surface)"><strong>Riya</strong><pre class="dh-r" style="font-family:var(--f-mono);font-size:13px;margin:6px 0 0;white-space:pre-wrap"></pre></div>
          <div style="border:1px dashed var(--amber);border-radius:var(--r-sm);padding:10px;background:var(--surface-2)"><strong>Network (Eve sees everything)</strong><pre class="dh-w" style="font-family:var(--f-mono);font-size:13px;margin:6px 0 0;white-space:pre-wrap"></pre></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;background:var(--surface)"><strong>xyz.com</strong><pre class="dh-s" style="font-family:var(--f-mono);font-size:13px;margin:6px 0 0;white-space:pre-wrap"></pre></div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small primary dh-eve">Be Eve and find a</button><button type="button" class="btn small ghost dh-new">New connection (new secrets)</button></div>
        <div class="calc-note dh-n"></div>`;
      const q$ = s => el.querySelector(s);
      const run = () => {
        const [p, g] = PR[pi];
        q$('.dh-p').innerHTML = '';
        PR.forEach(([pp, gg], k) => { const c = document.createElement('button'); c.type = 'button'; c.className = 'chip' + (k === pi ? ' on' : ''); c.textContent = `p=${pp}, g=${gg}`; c.onclick = () => { pi = k; a = PR[k][2]; b = PR[k][3]; eve = false; run(); }; q$('.dh-p').appendChild(c); });
        [['.dh-a', () => a, v => { a = v; }], ['.dh-b', () => b, v => { b = v; }]].forEach(([s, get, set]) => { const r = q$(s); r.max = p - 2; if (get() > p - 2) set(p - 2); r.value = get(); });
        q$('.dh-av').textContent = a; q$('.dh-bv').textContent = b;
        const A = mp(g, a, p), B = mp(g, b, p), K1 = mp(B, a, p), K2 = mp(A, b, p);
        q$('.dh-r').textContent = `secret a = ${a}\nA = ${g}^${a} mod ${p} = ${A}\nK = ${B}^${a} mod ${p} = ${K1}`;
        q$('.dh-s').textContent = `secret b = ${b}\nB = ${g}^${b} mod ${p} = ${B}\nK = ${A}^${b} mod ${p} = ${K2}`;
        let tries = 0, x = 0; for (let k = 1; k < p; k++) { tries++; if (mp(g, k, p) === A) { x = k; break; } }
        q$('.dh-w').textContent = `p = ${p}, g = ${g}\nA = ${A}  (Riya → xyz.com)\nB = ${B}  (xyz.com → Riya)\nK = ??` + (eve ? `\n\nEve tried ${g}^1, ${g}^2, ...\nAfter ${tries} tries: ${g}^${x} mod ${p} = ${A} → a = ${x}\nK = ${B}^${x} mod ${p} = ${mp(B, x, p)}  (cracked!)` : '');
        q$('.dh-n').textContent = `Connection #${conn}: both keys are ${K1 === K2 ? 'the same: ' + K1 : 'different?!'}. K never travelled on the network. ` + (eve ? `With a small p (${p}), Eve tried numbers one by one and found the secret in ${tries} tries. The number of tries grows with the size of p: at most 22 for p = 23, about 2000 for p = 2039. Real TLS uses the X25519 curve (or a 2048-bit+ group): forget trying one by one (more than 2^250 options), and even the best known attacks need about 2^128 steps (about 2^112 for a 2048-bit group). Not even all the computers in the world together could do it.` : `Press "Be Eve" and see how weak small numbers are.`);
      };
      q$('.dh-a').addEventListener('input', ev => { a = +ev.target.value; eve = false; run(); });
      q$('.dh-b').addEventListener('input', ev => { b = +ev.target.value; eve = false; run(); });
      q$('.dh-eve').onclick = () => { eve = true; run(); };
      q$('.dh-new').onclick = () => { const [p, g] = PR[pi]; do { a = 2 + Math.floor(rnd() * (p - 3)); b = 2 + Math.floor(rnd() * (p - 3)); } while (a < p / 4 || b < p / 4 || mp(g, a * b % (p - 1), p) < 2); conn++; eve = false; run(); };
      run();
    }},
    { type: 'callout', tone: 'term', title: 'New word: ECDHE', html: `<strong>What it is:</strong> today's version of Diffie-Hellman. <strong>EC</strong> = Elliptic Curve: instead of "g<sup>a</sup> mod p", the maths happens on points of a curve, which gives the same security with small numbers (32 bytes). The last <strong>E</strong> = <strong>Ephemeral</strong>, meaning "used once": new secrets a and b for every new connection, thrown away as soon as the work is done.<br><strong>Why we need it:</strong> fast, small, and every connection gets a different key.<br><strong>Without it:</strong> one key would be used for many connections, and one leak would open everything.<br><strong>Example:</strong> the X25519 curve (RFC 7748). Today's browsers and xyz.com's load balancer use this most often in TLS 1.3.` },
    { type: 'callout', tone: 'term', title: 'New word: forward secrecy', html: `<strong>What it is:</strong> a guarantee that if the server's private key is stolen <em>later</em>, conversations recorded <em>earlier</em> still stay locked.<br><strong>Why we need it:</strong> Eve can record all of today's encrypted traffic and keep it, hoping to get the key some day.<br><strong>Without it (the old way):</strong> up to TLS 1.2, "RSA key transport" was common: the browser locked the session key with the server's <strong>public key</strong> and sent it. If the private key leaked next year → Eve opens the old recording → gets the session key → reads all the old data.<br><strong>With ECDHE:</strong> the session key was built from a and b, which were deleted after the connection. The server's private key cannot produce the session key. The private key's only job is to <em>sign</em> ("I am the real xyz.com"), not to hide. That is why TLS 1.3 (RFC 8446) removed RSA key transport completely: every key exchange now gives forward secrecy.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "Diffie-Hellman alone is enough"', html: `No! DH only makes sure that a secret was created with <em>whoever</em> you are talking to. But if Eve sits in the middle and does one DH with Riya and another DH with xyz.com, both sides will create a "secret", with Eve! This is called a <strong>man-in-the-middle</strong> attack. So DH needs one more thing: the server <strong>signs the handshake with its private key</strong>, and the browser checks that signature with the public key from the <strong>certificate</strong>. That is the next section.` },

    { type: 'h2', text: 'Then AES: a session key for the real data' },
    { type: 'p', html: `After the handshake both sides have the same secret K. Now:` },
    { type: 'steps', items: [
      { t: 'Make keys from K', d: 'On both sides, K and all the handshake messages go into a "key derivation" function (HKDF in TLS 1.3), which produces a few <strong>session keys</strong>: one for the browser→server direction, one for server→browser.' },
      { t: 'Data with AES', d: 'Every HTTP request, every image, every piece of video is encrypted with these session keys using <strong>AES-GCM</strong> (or, often on phones, <strong>ChaCha20-Poly1305</strong>). This is symmetric, so it is very fast.' },
      { t: 'A seal on every piece', d: 'AES-GCM does not only hide data; it also adds a tag (like a MAC) to every record. If one bit changes on the way, the tag fails and the record is rejected. This is called <strong>AEAD</strong> (encryption + integrity together).' },
      { t: 'Connection ends, keys end', d: 'When the tab closes, the session keys are deleted from memory. Next connection = new ECDHE = new keys.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Why two kinds of keys? (hybrid encryption)', html: `<strong>Asymmetric</strong> (RSA, ECDSA, ECDHE) is very slow, but it works without meeting first. <strong>Symmetric</strong> (AES) is very fast, but both sides need the key in advance. So we combine them: asymmetric only in the handshake (identity + building the key, a few milliseconds), then all the heavy data with symmetric. Almost every secure system in the world (HTTPS, SSH, WhatsApp, VPN) uses this "hybrid" pattern.` },

    { type: 'h2', text: 'Certificate: the ID card of a public key' },
    { type: 'p', html: `Now the most important question: the browser got the server's public key. <strong>But how does it know this public key belongs to the real xyz.com and not to Eve?</strong> Anyone can create a key pair and say "I am xyz.com". So the public key does not come alone; it comes inside a <strong>certificate</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: certificate (X.509)', html: `<strong>What it is:</strong> a small digital file, like an ID card, that says "this public key belongs to xyz.com", with the <strong>signature</strong> of a trusted company on it. The format is called X.509.<br><strong>Why we need it:</strong> to link a public key and a domain name, in a way nobody can change.<br><strong>Without it:</strong> Eve could send her own public key, call herself xyz.com, and the browser would believe her.` },
    { type: 'table', head: ['Inside the certificate', 'Example (xyz.com)', 'What it is for'], rows: [
      ['Subject / SAN (names)', '<code>xyz.com</code>, <code>www.xyz.com</code>', 'Which domains it is valid for. The browser matches this with the URL'],
      ['Public key', 'An X25519/ECDSA or RSA 2048 public key', 'Used to check the server\'s handshake signature'],
      ['Issuer', '"Shala Intermediate CA"', 'Who signed it. Used to find the next certificate'],
      ['Validity', 'Not before 2026-07-20, not after 2027-01-31', 'How long it is valid. Too old = expired'],
      ['Serial number', '<code>4F2B</code>', 'Used to revoke it if needed'],
      ['Signature', 'Made with the issuer\'s private key', 'Proves the CA wrote all the lines above and nobody changed them'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Certificate Authority (CA) and chain of trust', html: `<strong>What it is:</strong> a <strong>CA</strong> is a company that first checks that the domain really belongs to you (for example "put this file on xyz.com" or "add this record in DNS"), then signs the certificate. Let's Encrypt, DigiCert and Google Trust Services are examples.<br>A CA keeps its most valuable <strong>root</strong> key offline (locked away). Daily signing is done by an <strong>intermediate CA</strong>, whose certificate is signed by the root. So a <strong>chain</strong> forms: xyz.com (leaf) ← intermediate ← root.<br><strong>Why we need it:</strong> the browser does not know millions of websites. It trusts only a few dozen roots, and reaches every website through the chain.<br><strong>Without it:</strong> every browser would have to store every website's public key in advance. Impossible.` },
    { type: 'callout', tone: 'term', title: 'New word: trust store', html: `<strong>What it is:</strong> a list of <strong>root CA public keys</strong> already stored inside your phone's or laptop's OS or browser. It comes with OS and browser updates (Mozilla, Apple, Microsoft and Google run their own lists).<br><strong>Why we need it:</strong> the last end of the chain must be found here. This is the root of trust.<br><strong>Without it:</strong> the browser could not check any certificate.<br><strong>Careful:</strong> if someone adds their own root to your device's trust store (malware, or a "corporate root" on a company laptop), they can open your HTTPS traffic. So never accept an unknown "install this certificate" request.` },
    { type: 'image', src: 'assets/img/crypto-keys/chain.png', alt: 'Chain of trust: the end entity certificate is signed by the intermediate private key, the intermediate is signed by the root CA private key, the root signs itself. Checking goes the other way with public keys', caption: 'Chain of trust. Each certificate carries the signature of the private key above it (its issuer). The browser walks backwards: the leaf\'s signature with the intermediate\'s public key, the intermediate\'s with the root\'s public key, and the root must be found in the trust store.', credit: { text: 'Yuhkih, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Chain_Of_Trust.svg', license: 'CC BY-SA 4.0' } },

    { type: 'p', html: `<strong>How the browser checks a certificate</strong> (on every HTTPS connection, in milliseconds):` },
    { type: 'steps', items: [
      { t: 'Signature chain', d: 'The leaf (xyz.com) signature is checked with the intermediate\'s public key. The intermediate\'s signature is checked with the root\'s public key. If even one letter changed, the hash is different and the signature fails.' },
      { t: 'Is the root in the trust store?', d: 'The root of the chain must be in the browser/OS list. A root that Eve made herself is not in the list.' },
      { t: 'Domain match', d: 'The URL says <code>xyz.com</code>, so the certificate\'s SAN must contain <code>xyz.com</code> (or <code>*.xyz.com</code>). A valid certificate for <code>xyz-offers.com</code> does not work on xyz.com.' },
      { t: 'Date', d: 'Today\'s date must be between "not before" and "not after".' },
      { t: 'Not revoked?', d: 'If the CA has cancelled the certificate (for example after a key leak), the browser must reject it. Browsers use compact lists built from the CAs\' revocation lists (CRLs) for this.' },
      { t: 'Proof of the private key', d: 'The certificate is public, anyone can copy it! So in TLS 1.3 the server <strong>signs</strong> the whole handshake <strong>with its private key</strong> (the CertificateVerify message). The browser checks it with the public key from the certificate. Only the owner of the real private key can do this.' },
    ]},
    { type: 'p', html: `Now be the browser yourself. Below is a small "chain verifier". It uses toy RSA keys (the same maths as above: the root's key has n = 3233, the intermediate's n = 2773) and a toy hash. Pick each case and see which check fails. Today's date is taken as 2026-10-04, and you are opening <code>xyz.com</code>.` },
    { type: 'custom', render(el) {
      const mp = (b, e, m) => { let r = 1; b %= m; while (e > 0) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };
      const H = (s, M) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % M; return h; };
      const K = { 'Shala Root CA': { n: 3233, e: 17, d: 2753 }, 'Shala Intermediate CA': { n: 2773, e: 17, d: 157 }, 'FreeCert Root (Eve)': { n: 3127, e: 3, d: 2011 } };
      const TRUST = ['Shala Root CA'], CRL = ['4F2A'], TODAY = '2026-10-04', HOST = 'xyz.com';
      const body = c => [c.subject, c.names.join(','), c.from, c.to, c.pub, c.serial, c.issuer].join('|');
      const sign = c => { const k = K[c.issuer]; c.sig = mp(H(body(c), k.n), k.d, k.n); return c; };
      const root = sign({ subject: 'Shala Root CA', names: ['Shala Root CA'], from: '2020-01-01', to: '2045-01-01', pub: 'n=3233,e=17', serial: '01', issuer: 'Shala Root CA' });
      const inter = sign({ subject: 'Shala Intermediate CA', names: ['Shala Intermediate CA'], from: '2025-01-01', to: '2030-01-01', pub: 'n=2773,e=17', serial: '1A', issuer: 'Shala Root CA' });
      const leaf = o => Object.assign({ subject: 'xyz.com', names: ['xyz.com', 'www.xyz.com'], from: '2026-07-20', to: '2027-01-31', pub: 'n=3127,e=3', serial: '4F2B', issuer: 'Shala Intermediate CA' }, o);
      const evilRoot = sign({ subject: 'FreeCert Root (Eve)', names: ['FreeCert Root (Eve)'], from: '2026-01-01', to: '2036-01-01', pub: 'n=3127,e=3', serial: 'EE', issuer: 'FreeCert Root (Eve)' });
      const CASES = [
        ['Valid certificate', 'All good: the real xyz.com.', () => [sign(leaf({})), inter, root], false],
        ['Changed (tampered)', 'Eve copied the real certificate, put her own public key inside, and kept the old signature.', () => { const c = sign(leaf({})); c.pub = 'n=9991,e=3'; return [c, inter, root]; }, false],
        ['Expired', 'xyz.com\'s auto-renewal broke. The certificate ended on 2026-09-30.', () => [sign(leaf({ from: '2026-03-20', to: '2026-09-30', serial: '3C11' })), inter, root], false],
        ['Wrong domain', 'Eve has a real, valid certificate for xyz-offers.com. She uses it as if it were xyz.com.', () => [sign(leaf({ subject: 'xyz-offers.com', names: ['xyz-offers.com'], serial: '5B07' })), inter, root], false],
        ['Unknown root', 'Eve created her own "root CA" and used it to sign a certificate for xyz.com.', () => [sign(leaf({ issuer: 'FreeCert Root (Eve)', serial: '77' })), evilRoot], false],
        ['Revoked (key leak)', 'xyz.com\'s old private key leaked. Certificate 4F2A was revoked, but Eve is still using it.', () => [sign(leaf({ serial: '4F2A' })), inter, root], true],
      ];
      let ci = 0;
      el.innerHTML = `<div class="ck-cases" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div><div class="ck-story calc-note" style="margin-bottom:8px"></div>
        <div class="ck-chain" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px"></div>
        <div class="ck-checks" style="margin-top:10px;display:grid;gap:6px"></div><div class="ck-verdict" style="margin-top:10px;padding:10px;border-radius:var(--r-sm);font-weight:600"></div>`;
      const q$ = s => el.querySelector(s);
      const run = () => {
        q$('.ck-cases').innerHTML = '';
        CASES.forEach((c, k) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (k === ci ? ' on' : ''); b.textContent = c[0]; b.onclick = () => { ci = k; run(); }; q$('.ck-cases').appendChild(b); });
        const [, story, make] = CASES[ci], chain = make(), lf = chain[0];
        q$('.ck-story').textContent = story;
        q$('.ck-chain').innerHTML = chain.map((c, i) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface);font-size:13px;font-family:var(--f-mono);line-height:1.5"><div style="font-family:var(--f-body);font-weight:600;margin-bottom:4px">${i === 0 ? 'Leaf' : c.subject === c.issuer ? 'Root' : 'Intermediate'}</div>subject: ${c.subject}<br>names: ${c.names.join(', ')}<br>valid: ${c.from} → ${c.to}<br>public key: ${c.pub}<br>serial: ${c.serial}<br>issuer: ${c.issuer}<br>signature: ${c.sig}</div>`).join('');
        const rows = [];
        for (let i = 0; i < chain.length; i++) {
          const c = chain[i], k = K[c.issuer], h = H(body(c), k.n), v = mp(c.sig, k.e, k.n);
          rows.push([v === h, `Signature of ${i === 0 ? 'the leaf' : c.subject}, checked with the public key of "${c.issuer}": hash = ${h}, signature^${k.e} mod ${k.n} = ${v}`]);
        }
        const top = chain[chain.length - 1];
        rows.push([TRUST.includes(top.subject), `Root "${top.subject}" ${TRUST.includes(top.subject) ? 'is' : 'is NOT'} in the trust store`]);
        rows.push([lf.names.includes(HOST), `Domain: URL ${HOST}, certificate has ${lf.names.join(', ')}`]);
        rows.push([lf.from <= TODAY && TODAY <= lf.to, `Date: today ${TODAY}, valid ${lf.from} → ${lf.to}`]);
        rows.push([!CRL.includes(lf.serial), `Revocation list [${CRL.join(', ')}]: serial ${lf.serial} ${CRL.includes(lf.serial) ? 'FOUND (revoked)' : 'not in it'}`]);
        q$('.ck-checks').innerHTML = rows.map(([ok, t]) => `<div style="display:flex;gap:8px;align-items:flex-start;font-size:14px"><span style="color:${ok ? 'var(--green)' : 'var(--red)'};font-weight:700">${ok ? '✓' : '✗'}</span><span>${t}</span></div>`).join('');
        const fails = rows.filter(r => !r[0]).length, vd = q$('.ck-verdict');
        vd.style.background = fails ? 'var(--surface-2)' : 'var(--accent-soft)'; vd.style.border = '1px solid ' + (fails ? 'var(--red)' : 'var(--green)');
        vd.textContent = fails ? `Browser: "Your connection is not private". ${fails} check failed. The password was never sent.` : 'Browser: lock icon. Next, the handshake signature (CertificateVerify) is checked with this public key, then the login page opens.';
      };
      run();
    }},
    { type: 'callout', tone: 'tip', title: 'One more guard: Certificate Transparency', html: `What if a CA, by mistake (or after being hacked), gives Eve a certificate for xyz.com? To handle this, today every public certificate is written into public, append-only logs (<strong>Certificate Transparency</strong>). Chrome and Safari only accept certificates that are in these logs. xyz.com's security team can monitor these logs to see whether an unknown certificate was created in its name.` },

    { type: 'h2', text: 'Man-in-the-middle: with and without certificate checks' },
    { type: 'p', html: `Now put everything together and run a full TLS 1.3 handshake. Riya is on the cafe WiFi, and Eve is on the same WiFi. Run all five scenarios: the first is normal, the other four are failures. Pay special attention to "Checks turned off": it shows why certificate checking matters.` },
    { type: 'flow', height: 330, title: 'The TLS 1.3 handshake and its attacks',
      nodes: [
        { id: 'b', label: 'Riya\'s browser', sub: 'no key pair', x: 95, y: 90, w: 150, kind: 'client', info: 'What it is: Riya\'s browser. It has no long-term key pair of its own. For each connection it creates a temporary ECDHE secret, and it checks the certificate against the trust store.' },
        { id: 'ts', label: 'Trust store', sub: 'list of root CAs', x: 95, y: 250, w: 150, kind: 'data', info: 'What it is: the public keys of root CAs, already stored in the phone/laptop OS or browser. The last end of the certificate chain must be found here. It is not on the network; it is inside the device.' },
        { id: 'eve', label: 'Eve', sub: 'on the same WiFi', x: 360, y: 250, w: 150, kind: 'threat', info: 'What it is: the attacker in the middle (man-in-the-middle). She can see, block and change packets. She does not have xyz.com\'s private key (unless it leaks).' },
        { id: 's', label: 'xyz.com server', sub: 'private key here', x: 625, y: 90, w: 150, kind: 'server', info: 'What it is: xyz.com\'s load balancer/server. It has the certificate and its private key. The private key never goes on the network: it is only used to sign the handshake.' },
        { id: 'ca', label: 'CA', sub: 'issues certificates', x: 625, y: 250, w: 150, kind: 'edge', info: 'What it is: the Certificate Authority. It gives xyz.com a certificate long before the handshake, and revokes it if the key leaks. It is not part of every handshake.' },
      ],
      edges: [{ a: 'b', b: 's' }, { a: 'b', b: 'ts' }, { a: 'b', b: 'eve' }, { a: 'eve', b: 's' }, { a: 's', b: 'ca' }, { a: 'b', b: 'ca', id: 'rev', dashed: true, hidden: true }],
      scenarios: [
        { name: 'Normal handshake', intro: 'The TCP connection is ready. Now TLS 1.3, in just 1 round trip.', steps: [
          { title: 'ClientHello', text: 'The browser creates a new temporary ECDHE secret <code>a</code> and sends its public part <code>A</code> (the key share). Along with it: "I know TLS 1.3 and these ciphers".', go: 'b>s', msg: 'ClientHello: key_share A, ciphers [AES-128-GCM, CHACHA20-POLY1305]' },
          { title: 'ServerHello + certificate + signature', text: 'The server creates its temporary secret <code>b</code>, sends <code>B</code>, then its certificate, then <strong>CertificateVerify</strong>: a signature with its private key over all the handshake messages so far. Both sides have now computed K = g<sup>ab</sup>.', go: 'res:s>b', msg: 'ServerHello: key_share B\nCertificate: xyz.com (issuer: Shala Intermediate CA)\nCertificateVerify: sig(private key, handshake)\nFinished' },
          { title: 'Chain check', text: 'The browser follows the chain to the trust store: root found. Domain xyz.com matches. Date is fine. Not revoked.', go: ['b>ts', 'res:ts>b'], set: { ts: { state: 'ok' } } },
          { title: 'Signature check', text: 'CertificateVerify is checked with the public key from the certificate: valid. This means the other side really has xyz.com\'s private key. And because the signature also covers A and B, Eve could not have changed them.', focus: ['b'], set: { b: { state: 'ok', sub: 'server is real ✓' } } },
          { title: 'Encrypted data (AES)', text: 'The browser\'s Finished and the first HTTP request are both sent with AES-GCM, using session keys made from K. Eve only sees garbage.', go: ['b>s', 'res:s>b'], msg: 'POST /login  (AES-GCM encrypted)  →  200 OK' },
        ]},
        { name: 'Fake certificate', intro: 'Eve has placed herself in the middle and is pretending to be xyz.com.', steps: [
          { title: 'Eve catches the ClientHello', text: 'The browser\'s message reached Eve. Eve will answer as if she were the server.', go: 'b>eve', set: { eve: { state: 'hot' } } },
          { title: 'Eve sends her own certificate', text: 'Eve does not have xyz.com\'s private key. So she creates her own key pair and sends a certificate signed by her own "FreeCert Root", plus a CertificateVerify made with her key.', go: 'res:eve>b', msg: 'Certificate: xyz.com (issuer: FreeCert Root (Eve))' },
          { title: 'Root not in the trust store', text: 'The browser looks for the chain\'s root in the trust store: not found. A big red page: "Your connection is not private". The password was never sent.', go: ['b>ts', 'bad:ts>b'], set: { b: { state: 'warn', sub: 'fake certificate!' }, ts: { state: 'miss' } } },
        ]},
        { name: 'Checks turned off (bug)', intro: 'A developer turned off certificate checking in the xyz.com mobile app for testing (like verify=False), and that code was released.', steps: [
          { title: 'Eve\'s fake certificate', text: 'Eve again sends her own certificate. The app accepts it without checking.', go: ['b>eve', 'res:eve>b'], set: { eve: { state: 'hot' } }, after: { b: { state: 'warn', sub: 'checks off!' } } },
          { title: 'Two separate tunnels', text: 'Eve did one ECDHE with the app and another with the real xyz.com. Both sides look "secure", but in the middle Eve decrypts and reads everything, then forwards it.', go: ['b>eve>s', 'res:s>eve>b'], msg: 'Eve sees: POST /login {"user":"riya","password":"..."}' },
          { title: 'Lesson', text: 'There was encryption, and still everything was stolen. Key exchange alone is not enough: only the certificate check tells you <strong>who</strong> you built the key with. Never turn off certificate verification; even for testing, add your own test CA to the trust store.', focus: ['eve'], set: { eve: { sub: 'has the password' } } },
        ]},
        { name: 'Expired certificate', intro: 'The cron job that renews xyz.com\'s certificate had been failing for three weeks. Nobody saw the alert.', steps: [
          { title: 'Old certificate', text: 'The server sends the same old certificate whose "not after" date was yesterday.', go: ['b>s', 'res:s>b'], set: { s: { state: 'warn', sub: 'cert expired' } } },
          { title: 'The browser stops', text: 'The signature and chain are all fine, but the date fails. Every user sees a red warning. The site is practically down.', focus: ['b'], set: { b: { state: 'warn', sub: 'expired!' } } },
          { title: 'Fix', text: 'A new certificate from the CA (automatic with the ACME protocol, like Let\'s Encrypt), plus an alert on expiry. The maximum life of public certificates is shrinking (200 days from 2026, 47 days by 2029), so manual renewal simply will not work any more.', go: ['s>ca', 'res:ca>s'], after: { s: { state: 'ok', sub: 'new cert ✓' }, b: { state: 'ok', sub: 'lock ✓' } } },
        ]},
        { name: 'Private key leak', intro: 'xyz.com\'s private key leaked from an old backup, and Eve got it.', steps: [
          { title: 'Eve looks real', text: 'Now Eve has both the real certificate <em>and</em> the real private key. Her CertificateVerify is valid. Chain, domain and date all pass.', go: ['b>eve', 'res:eve>b'], set: { eve: { state: 'hot', sub: 'stolen key' } }, after: { b: { state: 'warn', sub: 'fooled' } } },
          { title: 'Old recordings?', text: 'Eve also recorded last month\'s traffic. Can she open it now? <strong>No</strong>: each connection\'s key was made with ECDHE, not with the private key (forward secrecy). The damage is limited to new connections from now on.', focus: ['eve'] },
          { title: 'Revoke + rotate', text: 'xyz.com immediately: (1) asks the CA to revoke the certificate, (2) creates a <strong>new</strong> key pair, (3) gets a new certificate for the new key. The old key is now useless.', go: ['s>ca', 'res:ca>s'], set: { s: { sub: 'new key ✓' } }, after: { ca: { state: 'ok', sub: 'old one revoked' } } },
          { title: 'Browser revocation check', text: 'The browser\'s revocation list was updated. Eve\'s (old) certificate is now rejected. Careful: this update can take hours or days, which is why short-lived certificates are also a protection.', show: ['rev'], go: ['res:ca>b', 'b>eve', 'res:eve>b'], after: { b: { state: 'ok', sub: 'revoked, caught ✓' }, eve: { state: 'down', sub: 'rejected' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'After the handshake: the server is real. Now who is the user?' },
    { type: 'p', html: `Look carefully at what TLS proved: <strong>"the other side is the real xyz.com"</strong>. That is all. TLS did not say whether Riya or someone else is sitting at the browser. In normal HTTPS, the browser side sent no identity at all. So now a second job starts, with two parts:` },
    { type: 'list', items: [
      `<strong>Authentication (AuthN)</strong>: "who are you?" Give proof (password, passkey, client certificate, SSH key).`,
      `<strong>Authorization (AuthZ)</strong>: "what are you allowed to do?" Checked on every request, after the identity is confirmed.`,
    ]},
    { type: 'p', html: `There are four common ways to prove identity. Look at each one through the key-pair lens: <strong>who holds the secret, and how is it checked</strong>.` },
    { type: 'h3', text: 'Way 1: password, then a session cookie or JWT' },
    { type: 'p', html: `Riya sends her password inside the encrypted TLS tunnel. The server compares it with the password <strong>hash</strong> stored in the DB. If it matches, the server gives her a "pass" so she does not have to send the password with every request. There are two kinds of pass (full detail in the <a href="#/auth-basics">AuthN, AuthZ, JWT, OAuth</a> lesson):` },
    { type: 'list', items: [
      `<strong>Session cookie:</strong> a random ID (<code>sid=8f2c…</code>). The server writes "8f2c = Riya" in its session store. No key pair; just a long random secret that only the browser and the server know.`,
      `<strong>JWT (RS256 / ES256):</strong> a token that says <code>{"sub":"riya","role":"user","exp":...}</code>, with a signature from the <strong>Auth service's private key</strong>. Every service such as Orders or Payments checks it with the Auth service's <strong>public key</strong> (public keys are published at a URL called <strong>JWKS</strong>). No service needs a secret, and no service can make a fake token. It is the same public/private key signature, just on a token instead of a certificate.`,
    ]},
    { type: 'p', html: `<strong>Worked example:</strong> Riya's JWT payload says <code>role: "user"</code>. She opens the token in the browser and writes <code>"admin"</code>. The Orders service checks the signature: the payload changed, so the hash changed, so the signature does not match. <code>401 Unauthorized</code>. The "change the message" button in the RSA widget above showed exactly this.` },
    { type: 'h3', text: 'Way 2: passkeys (WebAuthn), without a password' },
    { type: 'callout', tone: 'term', title: 'New word: passkey (WebAuthn)', html: `<strong>What it is:</strong> a key pair instead of a password. When Riya creates a passkey on xyz.com, her phone (or laptop, or USB security key) creates a new key pair <strong>only for xyz.com</strong>. The private key stays in a secure part of the phone, and the public key goes into xyz.com's DB. At login, a fingerprint/face/PIN unlocks the phone, and the phone signs a <strong>challenge</strong> (a random number) sent by xyz.com. This is the W3C WebAuthn standard.<br><strong>Why we need it:</strong> the server has no secret worth stealing (only a public key). And the passkey is <strong>tied to the domain</strong>: on a fake site like <code>xyz-login.com</code>, the browser will not even use the xyz.com passkey. Phishing almost disappears.<br><strong>Without it:</strong> password reuse, phishing, and the risk of password hashes being cracked if the DB leaks.<br><strong>Careful:</strong> the fingerprint never leaves the phone. It only unlocks the phone's own private key.` },
    { type: 'steps', items: [
      { t: 'Registration (once)', d: 'xyz.com sends a challenge. The phone creates a new key pair and sends the public key + a credential ID to xyz.com. xyz.com writes in the DB: "Riya → this public key".' },
      { t: 'Login: challenge', d: 'xyz.com sends a new random challenge, like <code>7c91…e2</code>. It is new every time, so an old answer cannot be used again (replay).' },
      { t: 'Login: sign', d: 'Riya uses her fingerprint. The phone signs the challenge + xyz.com\'s name (the origin) with the private key.' },
      { t: 'Login: verify', d: 'xyz.com checks the signature with the public key from the DB. Valid → Riya is logged in → session cookie / JWT, the same as Way 1 from here.' },
    ]},
    { type: 'h3', text: 'Ways 3 and 4: the client has its own key pair (mTLS, SSH)' },
    { type: 'p', html: `When the client is a program (the Orders service) or a developer (logging in to a server), the client also keeps its own key pair. In mTLS the client shows its certificate inside the TLS handshake itself. In SSH the developer\'s public key is already written on the server. The full flow of both is in the next section.` },
    { type: 'p', html: `First run the web user\'s journey: password login, an API call with a JWT, passkey login, and two failures.` },
    { type: 'flow', height: 330, title: 'After the handshake: identity and permission',
      nodes: [
        { id: 'u', label: 'Riya\'s phone', sub: 'browser / app', x: 90, y: 170, w: 150, kind: 'client', info: 'What it is: Riya\'s phone. The TLS tunnel is already built. The password, the passkey\'s private key (in the secure chip) and the tokens it receives live here.' },
        { id: 'auth', label: 'Auth service', sub: 'login, signs JWT', x: 345, y: 70, w: 160, kind: 'server', info: 'What it is: the service that handles login. It checks the password/passkey and signs the JWT with its private key. Only this service has that private key (often inside a KMS).' },
        { id: 'db', label: 'Users DB', sub: 'hashes, passkeys', x: 610, y: 70, w: 160, kind: 'data', info: 'What it is: the users table. Password hashes (not the real passwords) and the public keys of passkeys. There is no private key here, so even if it leaks, login secrets are not exposed.' },
        { id: 'api', label: 'Orders service', sub: 'JWT verify, role', x: 345, y: 270, w: 160, kind: 'server', info: 'What it is: an API service. On every request it checks the JWT signature with the Auth service\'s public key (authentication), then decides based on the role (authorization).' },
        { id: 'jw', label: 'JWKS', sub: 'public keys URL', x: 610, y: 270, w: 160, kind: 'cache', info: 'What it is: a URL (like /.well-known/jwks.json) where the Auth service publishes its public keys. Services read and cache them. When the key is rotated, the new key appears here.' },
      ],
      edges: [{ a: 'u', b: 'auth' }, { a: 'auth', b: 'db' }, { a: 'u', b: 'api' }, { a: 'api', b: 'jw' }, { a: 'auth', b: 'jw', dashed: true }],
      scenarios: [
        { name: 'Password login', steps: [
          { title: 'Password, inside the tunnel', text: 'Username + password inside the TLS-encrypted tunnel.', go: 'u>auth', msg: 'POST /login {"user":"riya","password":"••••••"}' },
          { title: 'Compare with the hash', text: 'The Auth service loads Riya\'s bcrypt/Argon2 hash from the DB and compares it with the hash of the password.', go: ['auth>db', 'res:db>auth'], set: { db: { state: 'hit' } } },
          { title: 'Signed JWT', text: 'Match. The Auth service creates a JWT and signs it with its <strong>private key</strong>. It expires in 15 minutes.', go: 'res:auth>u', msg: 'JWT: header.{"sub":"riya","role":"user","exp":...}.signature', after: { u: { state: 'ok', sub: 'logged in ✓' } } },
        ]},
        { name: 'API call with JWT', steps: [
          { title: 'Request with the token', text: 'Riya asks for her orders. The token goes in a header.', go: 'u>api', msg: 'GET /orders  Authorization: Bearer eyJhbGciOiJSUzI1NiIs...' },
          { title: 'Get the public key (cache)', text: 'The Orders service gets the Auth service\'s public key from JWKS. Usually it is already in the cache, so it does not fetch it on every request.', go: ['api>jw', 'res:jw>api'], set: { jw: { state: 'hit' } } },
          { title: 'Signature + expiry + role', text: 'The signature is valid (the Auth service made the token), it has not expired, and the role "user" is allowed to see its own orders. 200 OK.', go: 'res:api>u', msg: '200 OK  [ {order 1042}, {order 1043} ]', set: { api: { state: 'ok' } } },
        ]},
        { name: 'Passkey login', steps: [
          { title: 'Challenge', text: 'Riya taps "Sign in with passkey". The Auth service sends a new random challenge.', go: ['u>auth', 'res:auth>u'], msg: 'challenge: 7c91…e2, rpId: xyz.com' },
          { title: 'Fingerprint, then sign', text: 'The fingerprint unlocked the phone. The phone signs the challenge with the private key made for xyz.com. Neither the fingerprint nor the private key left the phone.', focus: ['u'], set: { u: { state: 'ok', sub: 'signed' } } },
          { title: 'Verify with the public key', text: 'The signature reaches the server. The Auth service loads Riya\'s passkey <strong>public key</strong> from the DB and checks it. Valid → JWT.', go: ['u>auth>db', 'res:db>auth>u'], msg: 'assertion: sig(private key, challenge + xyz.com)  →  OK, JWT issued', after: { u: { sub: 'logged in ✓' } } },
        ]},
        { name: 'Token changed (401)', steps: [
          { title: 'Riya changed her role', text: 'In the token she changed <code>"role":"user"</code> to <code>"admin"</code>. The signature is the old one.', go: 'u>api', msg: 'payload: {"sub":"riya","role":"admin"}  signature: (old)', set: { u: { state: 'warn', sub: 'token changed' } } },
          { title: 'Signature fails', text: 'Checked with the public key: the hash of the new payload does not match the old signature. Making a new signature needs the Auth service\'s private key, which Riya does not have.', go: 'bad:api>u', msg: '401 Unauthorized: invalid signature', set: { api: { state: 'warn', sub: 'signature ✗' } } },
        ]},
        { name: 'Not allowed (403)', steps: [
          { title: 'Real token, big action', text: 'The token is completely real. But Riya is asking for an admin action.', go: 'u>api', msg: 'DELETE /orders/all  (role: user)' },
          { title: 'Authorization fails', text: 'Identity confirmed (authentication passed), but the role "user" does not have this permission (authorization failed). Not 401, but <strong>403 Forbidden</strong>.', go: 'bad:api>u', msg: '403 Forbidden: needs permission orders:delete_all', set: { api: { state: 'warn', sub: 'permission ✗' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Authorization: what you are allowed to do' },
    { type: 'p', html: `Confirming identity does not finish the job. On every request the server asks: <strong>"is this user allowed to do this?"</strong>` },
    { type: 'list', items: [
      `<strong>Roles and permissions:</strong> Riya = <code>user</code> (see her own orders, change her own profile). Aman = <code>support</code> (see anyone's order, but no refunds). Neha = <code>admin</code> (everything). Roles contain small permissions like <code>orders:read_own</code> and <code>orders:refund</code>. This is called <strong>RBAC</strong> (details in the <a href="#/auth-basics">AuthN, AuthZ</a> lesson).`,
      `<strong>Check on every request:</strong> not just once at login. If Aman's role is removed yesterday, his requests must fail from today. That is why JWT expiry is kept short, or permissions are checked again on the server.`,
      `<strong>Only your own data:</strong> check the owner, not just the role: <code>GET /orders/1043</code> only if order 1043 belongs to Riya. Forgetting this is the most common security bug (someone else's data shows up when you change the ID).`,
      `<strong>401 vs 403:</strong> 401 = "we do not know who you are" (no token or a bad token). 403 = "we know who you are, but you are not allowed".`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "we have HTTPS and the user logged in, so everything is safe"', html: `HTTPS only made the road safe and proved the server's identity. Login proved the user's identity. But "should Riya see order 1044 (which is Aman's)?" is a question for neither HTTPS nor login: it is authorization, and you must write it yourself in every API. There are three separate layers: TLS (the road), AuthN (who), AuthZ (what).` },

    { type: 'h2', text: 'SSH and mTLS: when the client also has a key pair' },
    { type: 'h3', text: 'SSH key login' },
    { type: 'p', html: `Neha, a developer at xyz.com, needs to log in to a server. She uses an SSH key instead of a password. Look carefully at who has what, because here <strong>both sides have key pairs</strong>:` },
    { type: 'steps', items: [
      { t: 'Neha creates a key (once)', d: '<code>ssh-keygen -t ed25519</code>. The private key goes on the laptop at <code>~/.ssh/id_ed25519</code> (never shared), the public key at <code>~/.ssh/id_ed25519.pub</code>.' },
      { t: 'Public key on the server', d: 'An admin adds Neha\'s public key as one line in the server\'s <code>~/.ssh/authorized_keys</code> file. This is the list of "let the owners of these public keys in".' },
      { t: 'The server proves itself first', d: 'The server also has its own key pair (the <strong>host key</strong>). As soon as they connect, a key exchange happens and the server signs with its host key. Neha\'s laptop checks <code>~/.ssh/known_hosts</code> to see if this is the same server. The first time, it shows the fingerprint and asks ("trust on first use"). If it changes later, it shows a big warning.' },
      { t: 'Neha\'s proof', d: 'The key exchange created a unique <strong>session identifier</strong> for this connection. The laptop signs this session ID (and the request) with Neha\'s private key. The session ID works as the "challenge": it is new for every connection, so an old signature will not work again.' },
      { t: 'The server verifies', d: 'The server finds Neha\'s public key in <code>authorized_keys</code> and checks the signature. Valid → the shell opens. The private key never went on the network.' },
    ]},
    { type: 'h3', text: 'mTLS: service to service' },
    { type: 'callout', tone: 'term', title: 'New word: mTLS (mutual TLS)', html: `<strong>What it is:</strong> TLS where <strong>both</strong> sides show a certificate. The server says "show me your certificate" (CertificateRequest), and the client sends its certificate + a CertificateVerify made with its private key.<br><strong>Why we need it:</strong> inside xyz.com, the Payments service must know for sure that the call really came from the Orders service, not from some intruder program. Assuming "the internal network is safe" is old thinking.<br><strong>Without it:</strong> an attacker who got inside (or a buggy pod) could call any service.<br><strong>Example:</strong> the services' certificates come from an <strong>internal CA</strong> (the company's own, not in browsers' trust stores). A service mesh (Istio, Linkerd) automatically replaces these certificates every few hours or days.` },
    { type: 'flow', height: 320, title: 'SSH key login and mTLS',
      nodes: [
        { id: 'lap', label: 'Neha\'s laptop', sub: 'id_ed25519 (private)', x: 95, y: 80, w: 160, kind: 'client', info: 'What it is: the developer\'s laptop. The private key is in ~/.ssh/id_ed25519 (locked with a passphrase). known_hosts holds the host public keys of servers.' },
        { id: 'ssh', label: 'App server', sub: 'sshd, authorized_keys', x: 365, y: 80, w: 170, kind: 'server', info: 'What it is: an xyz.com server running the SSH daemon (sshd). authorized_keys holds the allowed public keys. It also has its own host key pair, which it uses to prove its identity.' },
        { id: 'ica', label: 'Internal CA', sub: 'service certs', x: 625, y: 80, w: 150, kind: 'edge', info: 'What it is: xyz.com\'s own CA, only for internal services. It gives each service a short-lived certificate. Every service trusts its root certificate.' },
        { id: 'ord', label: 'Orders service', sub: 'cert + private key', x: 95, y: 240, w: 160, kind: 'server', info: 'What it is: the client service. It has a certificate from the internal CA ("I am orders") and its private key.' },
        { id: 'pay', label: 'Payments', sub: 'only orders allowed', x: 365, y: 240, w: 170, kind: 'server', info: 'What it is: the server service. It asks every caller for a certificate, checks it against the internal CA, then decides by name: only the Orders service may call it (authorization).' },
        { id: 'rg', label: 'Unknown pod', sub: 'no certificate', x: 625, y: 240, w: 150, kind: 'threat', hidden: true, info: 'What it is: an unknown program that got into the cluster (a hacked container or a wrong deploy). It has no certificate from the internal CA.' },
      ],
      edges: [{ a: 'lap', b: 'ssh' }, { a: 'ord', b: 'pay' }, { a: 'ica', b: 'ord', dashed: true }, { a: 'ica', b: 'pay', dashed: true }, { a: 'rg', b: 'pay', hidden: true }],
      scenarios: [
        { name: 'SSH key login', steps: [
          { title: 'Key exchange + host key', text: 'The laptop and the server build a session key with ECDH. The server signs with its host key. The laptop compares it with known_hosts: same server.', go: ['lap>ssh', 'res:ssh>lap'], msg: 'host key ED25519 SHA256:q3Lx…  (matches known_hosts ✓)' },
          { title: 'Signature on the session ID', text: 'The laptop says "I am Neha, this is my public key", and sends a signature over the session ID made with the private key.', go: 'lap>ssh', msg: 'userauth publickey: ssh-ed25519 AAAAC3Nz…  sig(session_id)' },
          { title: 'authorized_keys check', text: 'The server found the key in its list, and the signature is valid. The shell opens.', go: 'res:ssh>lap', msg: 'Welcome to app-server-7', after: { ssh: { state: 'ok' }, lap: { state: 'ok', sub: 'logged in ✓' } } },
        ]},
        { name: 'SSH: unknown key', steps: [
          { title: 'New laptop, new key', text: 'Neha got a new laptop and created a new key, but its public key has not been added to the server yet.', go: 'lap>ssh', msg: 'userauth publickey: ssh-ed25519 AAAAC3Nz…(new)' },
          { title: 'Rejected', text: 'The server did not find this public key in authorized_keys. Even if the signature is valid, it does not matter: this key is not on the "allowed" list.', go: 'bad:ssh>lap', msg: 'Permission denied (publickey).', set: { lap: { state: 'warn', sub: 'key not allowed' } } },
        ]},
        { name: 'SSH: host key changed', steps: [
          { title: 'A different answer from the server', text: 'Neha connects to the same server address, but the host key that arrives is different from the one in known_hosts. Either the server was reinstalled, or someone is in the middle.', go: ['lap>ssh', 'res:ssh>lap'], set: { ssh: { state: 'warn', sub: 'host key differs!' } } },
          { title: 'Stop', text: 'SSH shows a big warning and stops the connection. The right way: confirm the new fingerprint with the admin, then update known_hosts. Do not type "yes" without thinking.', focus: ['lap'], msg: 'WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!', set: { lap: { state: 'warn', sub: 'connection stopped' } } },
        ]},
        { name: 'mTLS: Orders → Payments', steps: [
          { title: 'Certificates in advance', text: 'The internal CA gave certificates to both services (and keeps giving new ones every few hours/days).', go: ['ica>ord', 'ica>pay'], parallel: true },
          { title: 'Certificates on both sides', text: 'Payments sends its certificate and also asks Orders for one. Orders sends its certificate + CertificateVerify (made with its private key).', go: ['ord>pay', 'res:pay>ord'], msg: 'client cert: spiffe://xyz.com/orders  (issuer: Internal CA)' },
          { title: 'Identity + permission', text: 'Payments checks: signed by the internal CA ✓, proof of the private key ✓, the name "orders" is on the allowed list ✓. The request runs.', go: ['ord>pay', 'res:pay>ord'], msg: 'POST /charge  →  200 OK', after: { pay: { state: 'ok' }, ord: { state: 'ok' } } },
        ]},
        { name: 'mTLS: unknown pod', steps: [
          { title: 'A call without a certificate', text: 'An unknown pod calls Payments. It has no certificate from the internal CA.', show: ['rg', 'rg-pay'], go: 'rg>pay', msg: 'POST /charge  (no client certificate)', set: { rg: { state: 'hot' } } },
          { title: 'The handshake itself fails', text: 'Payments asked for a certificate and did not get one (or got one from an unknown CA). The TLS handshake broke right there. The request never even reached the Payments code.', go: 'bad:pay>rg', msg: 'TLS alert: certificate_required', after: { rg: { state: 'down', sub: 'rejected' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Taking care of keys: storage, rotation and leaks' },
    { type: 'p', html: `All the security rests on one thing: <strong>the private key stays private</strong>. The maths almost never breaks; people lose by keeping keys in the wrong place (committed to GitHub, an old backup, a stolen laptop).` },
    { type: 'table', head: ['Where to keep it', 'What it is', 'When it fits'], rows: [
      ['A file, with correct permissions', 'Only the owner can read the key file (<code>chmod 600</code>), a passphrase on the SSH key', 'Developer laptops, small setups'],
      ['Secrets manager', 'A service that stores secrets encrypted and gives them only to allowed apps (AWS Secrets Manager, HashiCorp Vault)', 'App DB passwords, API keys, TLS keys'],
      ['KMS', 'A cloud key service. The key stays inside the KMS; you say "sign/encrypt this data", and the key never comes out', 'JWT signing, data encryption keys'],
      ['HSM', 'Hardware Security Module: a tamper-resistant hardware box where the key is created and can never be taken out', 'CA root keys, bank/UPI keys, payment systems'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: HSM and KMS (in one line)', html: `<strong>HSM</strong> = special safe-like hardware where the private key is created and lives; signing and decrypting also happen inside, and the key is wiped if someone tries to break in. <strong>KMS</strong> = a cloud company's service that uses HSMs inside and gives you the same benefit through an API. <strong>Why:</strong> even if a server is hacked, the attacker cannot copy the key (they can only use it while they are inside). <strong>Without it:</strong> the key is a file, and files get copied.` },
    { type: 'callout', tone: 'term', title: 'New word: key rotation', html: `<strong>What it is:</strong> replacing an old key with a new one in a planned way, <em>before</em> it leaks.<br><strong>Why we need it:</strong> the longer one key is used, the more data depends on it and the more chances there are for a leak. NIST asks you to set a "cryptoperiod" (a lifetime) for every key.<br><strong>Without it:</strong> a 5-year-old key that 30 people have touched, and when it leaks, nobody knows how to replace it.<br><strong>Example:</strong> TLS certificates now renew automatically (ACME). For JWT, the Auth service creates a new key, keeps <em>both</em> public keys (old + new) in JWKS, signs new tokens with the new key, and removes the old public key after the old tokens expire. Each key has a <code>kid</code> (key ID) so a service knows which key to check with.` },
    { type: 'p', html: `<strong>A private key leaked. Now what?</strong> (xyz.com's playbook)` },
    { type: 'steps', items: [
      { t: 'Create a new key', d: 'Do not "reuse" the old key. A new key pair, in the right place (KMS/HSM).' },
      { t: 'Get a new certificate', d: 'A new certificate from the CA for the new public key. Deploy it on the load balancers.' },
      { t: 'Revoke the old one', d: 'Ask the CA to revoke the old certificate. It can take hours or days to reach browsers\' revocation lists. In 2025 Let\'s Encrypt stopped OCSP and kept only CRLs, and certificate lifetimes keep getting shorter: one reason is that revocation cannot be fully trusted.' },
      { t: 'JWT signing key leaked?', d: 'Remove the old public key from JWKS immediately. All its tokens will fail, and users will have to log in again. That pain is fine: otherwise the attacker could create anyone\'s token.' },
      { t: 'SSH key leaked?', d: 'Remove that public key from authorized_keys on every server. Large setups use SSH certificates or central access tools so this can be done in one place.' },
      { t: 'Think about what was exposed', d: 'Because of ECDHE, old TLS sessions are safe (forward secrecy). But data encrypted directly with <em>that</em> key (like backups) is at risk. Check the logs for who used the key and when.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'The future: quantum computers', html: `A large quantum computer, if one is built, could break the maths behind RSA and elliptic curves (factoring, discrete log). So in 2024 NIST published new "post-quantum" standards (for example <strong>ML-KEM</strong> for key exchange, FIPS 203). Browsers like Chrome already combine X25519 + ML-KEM (hybrid) in TLS, so traffic recorded today stays safe tomorrow. Symmetric algorithms like AES are affected less: a bigger key (256 bits) is considered enough.` },
    { type: 'callout', tone: 'why', title: 'Decide: which key, where', html: `• <strong>Browser → xyz.com website:</strong> HTTPS (TLS 1.3, ECDHE). The server has the certificate + private key (on the LB, in a KMS/HSM if possible). Certificates auto-renew (ACME).<br>• <strong>User login:</strong> passkeys first (phishing-proof). If there is a password, hash it + MFA. After login, a session cookie (one app) or JWT (many services).<br>• <strong>JWT checked by many services:</strong> RS256/ES256 (the private key only on the Auth service, the public key from JWKS). With only one service, HS256 also works.<br>• <strong>Service to service (internal):</strong> mTLS, an internal CA, short-lived certificates (service mesh).<br>• <strong>Developers logging in to servers:</strong> SSH Ed25519 keys (with a passphrase), password login turned off. In big setups, SSH certificates / central access.<br>• <strong>Only the sender and receiver may read it (not even the server):</strong> end-to-end encryption, with keys on users\' devices (like WhatsApp).<br>• <strong>Very valuable keys (CA root, payments):</strong> HSM.` },

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'Keys and identity: the whole xyz.com picture', height: 530,
      groups: [
        { label: 'Internet', x: 20, y: 8, w: 680, h: 96 },
        { label: 'xyz.com data center', x: 20, y: 140, w: 680, h: 372 },
      ],
      nodes: [
        { id: 'u', label: 'Riya\'s browser', sub: 'trust store', x: 130, y: 55, w: 150, kind: 'client', info: 'What it is: the user\'s browser. It has no key pair of its own, only the trust store (root CA public keys). A temporary ECDHE secret for each connection. If there is a passkey, its private key is in the phone\'s secure chip.' },
        { id: 'ca', label: 'Public CA', sub: 'Let\'s Encrypt etc.', x: 360, y: 55, w: 150, kind: 'edge', info: 'What it is: an outside Certificate Authority. It checks the domain and signs xyz.com\'s certificate, and revokes it after a leak. Its roots are in browsers\' trust stores.' },
        { id: 'lap', label: 'Neha\'s laptop', sub: 'SSH private key', x: 590, y: 55, w: 150, kind: 'client', info: 'What it is: a developer\'s laptop. The ~/.ssh/id_ed25519 private key is here, and known_hosts holds the servers\' host keys.' },
        { id: 'lb', label: 'Load Balancer', sub: 'TLS cert + key', x: 130, y: 190, w: 150, kind: 'edge', info: 'What it is: the front door of xyz.com. The TLS handshake ends here (TLS termination). The certificate is here, and its private key is here or in a KMS/HSM.' },
        { id: 'kms', label: 'KMS / HSM', sub: 'private keys', x: 360, y: 190, w: 150, kind: 'data', info: 'What it is: the safe for keys. Private keys like the TLS key and the JWT signing key stay inside; services only say "sign this", and the key never comes out. The Auth service can also have JWTs signed here.' },
        { id: 'ssh', label: 'App server', sub: 'sshd, authorized_keys', x: 590, y: 190, w: 170, kind: 'server', info: 'What it is: a server that developers reach with SSH. authorized_keys holds the allowed public keys, and it has its own host key pair.' },
        { id: 'auth', label: 'Auth service', sub: 'login, signs JWT', x: 130, y: 325, w: 150, kind: 'server', info: 'What it is: the login service. It checks the password hash or the passkey signature, then signs the JWT with its private key. Public keys are on JWKS.' },
        { id: 'ord', label: 'Orders service', sub: 'JWT verify, role', x: 360, y: 325, w: 150, kind: 'server', info: 'What it is: an API service. On every request it checks the JWT signature with the public key (AuthN), then the role/owner (AuthZ). It calls Payments over mTLS.' },
        { id: 'pay', label: 'Payments', sub: 'mTLS: orders only', x: 600, y: 325, w: 150, kind: 'server', info: 'What it is: the payments service. It asks every caller for a certificate from the internal CA, and only lets allowed services in.' },
        { id: 'db', label: 'Users DB', sub: 'hashes, passkey keys', x: 130, y: 460, w: 170, kind: 'data', info: 'What it is: the users table: password hashes and the public keys of passkeys. No private keys, so even a leak does not expose login secrets.' },
        { id: 'ica', label: 'Internal CA', sub: 'service certs', x: 475, y: 460, w: 150, kind: 'edge', info: 'What it is: the company\'s own CA. It gives internal services short-lived certificates (often through a service mesh). Browsers do not trust it, only xyz.com\'s services do.' },
      ],
      edges: [
        { a: 'u', b: 'lb', n: 1, label: 'TLS 1.3' },
        { a: 'ca', b: 'lb', dashed: true, label: 'certificate' },
        { a: 'kms', b: 'lb', dashed: true, label: 'sign' },
        { a: 'lb', b: 'auth', n: 2, label: 'login' },
        { a: 'auth', b: 'db', n: 3, label: 'hash check' },
        { a: 'lb', b: 'ord', n: 4, label: 'JWT' },
        { a: 'auth', b: 'ord', dashed: true, label: 'JWKS' },
        { a: 'ord', b: 'pay', n: 5, label: 'mTLS' },
        { a: 'ica', b: 'ord', dashed: true },
        { a: 'ica', b: 'pay', dashed: true },
        { a: 'lap', b: 'ssh', label: 'SSH key' },
      ],
      paths: [
        { name: 'HTTPS handshake', text: 'The browser does ECDHE with the LB. The LB sends the certificate from the CA and signs the handshake with the private key kept in the KMS/HSM. The browser checks the chain up to the trust store.', go: ['u>lb', 'ca>lb', 'kms>lb'] },
        { name: 'User login', text: 'The password (or a passkey signature) goes inside the encrypted tunnel. The Auth service compares it with the hash / public key in the DB and gives back a signed JWT.', go: ['u>lb>auth>db'] },
        { name: 'JWT API call', text: 'The browser calls Orders with the JWT. Orders checks the signature with the Auth service\'s public key (JWKS), then the role.', go: ['u>lb>ord', 'auth>ord'] },
        { name: 'mTLS between services', text: 'The internal CA gave both of them certificates. Orders and Payments both show a certificate.', go: ['ord>pay', 'ica>ord', 'ica>pay'] },
        { name: 'SSH key login', text: 'The laptop compares the server\'s host key with known_hosts, then signs the session ID with its private key. The server checks it against authorized_keys.', go: ['lap>ssh'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Symmetric (AES) = one key, very fast, but hard to deliver. Asymmetric = public key (the padlock, for everyone) + private key (the key, never shared).</li>
      <li>Whoever must prove their identity holds the private key. In normal HTTPS only the server does; the browser has no key pair. In mTLS, SSH and passkeys the client has one too.</li>
      <li>Two jobs: encrypt with public → opens with private. Sign with private → anyone checks with public. A hash = a fingerprint with no key.</li>
      <li>Diffie-Hellman (today ECDHE): send only the mix, both build the same secret. Ephemeral keys = forward secrecy. Then the real data goes with AES.</li>
      <li>DH alone does not stop a man-in-the-middle. The certificate (the CA's signature) + the server's handshake signature show the other side is the real xyz.com.</li>
      <li>Browser checks: chain to the trust store, domain, date, revocation, and proof of the private key (CertificateVerify).</li>
      <li>After TLS: AuthN (password → session/JWT, passkey, client certificate, SSH key), then AuthZ on every request (roles, owner). 401 ≠ 403.</li>
      <li>Keys in a KMS/HSM, automatic rotation. On a leak: new key, new certificate, revoke the old one.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: [
        'Two strangers can create a secret without meeting first (key exchange)',
        'The public key can be given to everyone: the key distribution problem is solved',
        'Signatures guarantee identity and "not changed", without sharing a secret',
        'Forward secrecy: a key leak today does not open yesterday\'s recordings',
        'With passkeys and public-key login, the server keeps no secret worth stealing',
      ],
      costs: [
        'Asymmetric maths is slow: every new connection pays handshake CPU and one round trip',
        'All trust rests on CAs and the trust store; installing a wrong root = everything exposed',
        'Certificates expire: you need renewal automation, otherwise the whole site goes down',
        'Revocation is slow and incomplete; after a leak there are hours or days of risk',
        'Managing keys (KMS/HSM, rotation, access) is separate work and a separate cost',
      ] },
    { type: 'think', questions: [
      { q: 'Riya\'s browser is using HTTPS with xyz.com. Did the TLS handshake tell xyz.com that this is Riya?', a: 'No. Normal HTTPS only proves the server\'s identity. The browser has no certificate or key pair. Riya is identified inside TLS with a password/passkey, and after that with a session cookie or JWT. Only in mTLS does the client also show a certificate inside TLS.' },
      { q: 'Eve copied xyz.com\'s real certificate (it is public anyway). Can she now become xyz.com?', a: 'No. In the handshake the server must send CertificateVerify: a signature over the whole handshake, made with the private key that matches the certificate\'s public key. Eve does not have the private key, so she cannot make a valid signature. Copying the certificate is useless; stealing the private key is the real danger.' },
      { q: 'xyz.com\'s private key leaked today. Eve has TLS 1.3 traffic she recorded last year. Can she read it?', a: 'No, because of forward secrecy. In TLS 1.3 each connection\'s key was made from temporary ECDHE secrets, which were deleted after the connection. The private key only signed. With the old TLS 1.2 "RSA key transport", the session key could be opened with the private key, and everything would be exposed.' },
      { q: 'Your 20 microservices check JWTs. HS256 (one shared secret) or RS256 (a key pair)? Why?', a: 'RS256/ES256. With HS256 every checker needs the same secret, which also lets it create tokens: the secret in 20 places = 20 chances to leak, and any service could make a fake admin token. With RS256 the private key is only on the Auth service, and everyone else can only check with the public key (JWKS).' },
      { q: 'While using SSH you see "REMOTE HOST IDENTIFICATION HAS CHANGED". What do you do?', a: 'Stop. It means the server\'s host key is different from the one in known_hosts: either the server was reinstalled, or someone is in the middle. Confirm the new fingerprint with the admin through another channel (chat, ticket), and only then update known_hosts. Deleting the old line without thinking opens the door to a man-in-the-middle.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'In normal HTTPS, who holds the private key?', options: ['Both the browser and the server', 'Only the server (or its load balancer)', 'The CA, which hands it out on every request'], answer: 1, explain: 'The server\'s private key stays only on its machine. The public key goes to everyone inside the certificate. The browser has no key pair, only a trust store.' },
      { q: 'p = 3, q = 11, e = 3 (so d = 7). What is the signature of message 4?', options: ['31', '16', '4'], answer: 1, explain: 's = 4⁷ mod 33 = 16384 mod 33 = 16. Verify: 16³ mod 33 = 4 = the message. (31 was the encryption: 4³ mod 33.)' },
      { q: 'In Diffie-Hellman (p = 23, g = 5), Eve sees A = 8 and B = 19. What is the shared key, and why can Eve not build it?', options: ['2; she does not have a or b, and finding them is practically impossible with big numbers', '8 × 19 = 152; Eve cannot multiply', '27; Eve does not have p'], answer: 0, explain: '19⁶ mod 23 = 8¹⁵ mod 23 = 2. Building K needs a or b. With a small p, brute force works (you saw it in the widget), but not with real 2048-bit groups or X25519.' },
      { q: 'What gives forward secrecy?', options: ['A bigger RSA key', 'New, temporary (ephemeral) DH secrets for every connection', 'A short certificate expiry'], answer: 1, explain: 'ECDHE secrets are deleted after the connection. Old session keys cannot be recovered from the server\'s long-term private key.' },
      { q: 'A valid token, but the user\'s role does not allow this action. The correct response?', options: ['401 Unauthorized', '403 Forbidden', '200 OK'], answer: 1, explain: 'Identity is confirmed (AuthN passed), permission is missing (AuthZ failed) → 403. 401 is when there is no token or a bad one.' },
      { q: 'In SSH key login, what is stored on the server?', options: ['The user\'s private key', 'The user\'s public key (in authorized_keys)', 'The user\'s password'], answer: 1, explain: 'The server keeps only the public key. The user signs the session ID with the private key, and the server checks with the public key. The private key never leaves the laptop.' },
      { q: 'Why does a passkey not work on a phishing site?', options: ['Because the fingerprint goes to the server', 'Because the passkey is tied to one domain (xyz.com), and the browser does not let another domain use that key', 'Because the passkey password is long'], answer: 1, explain: 'The key pair was made only for xyz.com. On xyz-login.com the browser does not even offer it, and the signature also includes the origin.' },
    ]},
    { type: 'sources', items: [
      { title: 'RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3 (2018)', publisher: 'IETF', official: true, year: 2018, url: 'https://www.rfc-editor.org/rfc/rfc8446', used: 'ClientHello/ServerHello key shares, Certificate, CertificateVerify (signature over the handshake), CertificateRequest for mTLS, removal of static RSA key transport and forward secrecy, keys via HKDF, the certificate_required alert.' },
      { title: 'RFC 7748: Elliptic Curves for Security (2016)', publisher: 'IETF', official: true, year: 2016, url: 'https://www.rfc-editor.org/rfc/rfc7748', used: 'X25519 / X448 key exchange, about a 128-bit security level.' },
      { title: 'RFC 2631: Diffie-Hellman Key Agreement Method (1999)', publisher: 'IETF', official: true, year: 1999, url: 'https://www.rfc-editor.org/rfc/rfc2631', used: 'Classic DH: g^x mod p, the same shared secret on both sides.' },
      { title: 'RFC 4252: The Secure Shell (SSH) Authentication Protocol (2006)', publisher: 'IETF', official: true, year: 2006, url: 'https://www.rfc-editor.org/rfc/rfc4252', used: 'Public key authentication: the signature includes the session identifier.' },
      { title: 'sshd(8) manual: AUTHORIZED_KEYS and SSH_KNOWN_HOSTS file formats', publisher: 'OpenBSD / OpenSSH', official: true, url: 'https://man.openbsd.org/sshd.8', used: 'Allowed public keys in authorized_keys, host keys in known_hosts.' },
      { title: 'OpenSSH 9.5 release notes (2023)', publisher: 'OpenSSH', official: true, year: 2023, url: 'https://www.openssh.com/releasenotes.html', used: 'ssh-keygen now creates an Ed25519 key by default.' },
      { title: 'Web Authentication: An API for accessing Public Key Credentials, Level 3', publisher: 'W3C', official: true, url: 'https://www.w3.org/TR/webauthn-3/', used: 'Passkey registration/login: key pair on the device, public key on the server, signature over a challenge, credentials tied to the relying party (domain).' },
      { title: 'NIST SP 800-57 Part 1 Rev. 5: Recommendation for Key Management (2020)', publisher: 'NIST', official: true, year: 2020, url: 'https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final', used: 'Security strength: RSA 2048 ≈ 112 bits, RSA 3072 / 256-bit ECC ≈ 128 bits; cryptoperiods and the key lifecycle.' },
      { title: 'FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard (2024)', publisher: 'NIST', official: true, year: 2024, url: 'https://csrc.nist.gov/pubs/fips/203/final', used: 'The ML-KEM post-quantum key exchange standard.' },
      { title: 'Key Management Cheat Sheet', publisher: 'OWASP', official: true, url: 'https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html', used: 'Key storage (HSM/KMS), rotation, and what to do when a key is compromised.' },
      { title: 'Ending OCSP Support in 2025 (2024)', publisher: 'Let\'s Encrypt', official: true, year: 2024, url: 'https://letsencrypt.org/2024/12/05/ending-ocsp/', used: 'OCSP shut down, revocation only through CRLs (2025 timeline).' },
      { title: 'WhatsApp Encryption Overview, technical white paper (v9, 2026)', publisher: 'WhatsApp / Meta', official: true, year: 2026, url: 'https://www.whatsapp.com/security/WhatsApp-Security-Whitepaper.pdf', used: 'A Curve25519 identity key pair created at install, only public keys on the server; no private authentication secrets on the server.' },
      { title: 'NPCI UPI Common Library specification (community-written)', publisher: 'librefin-in on GitHub (unofficial)', url: 'https://github.com/librefin-in/cl-specification', used: 'The UPI PIN is entered inside NPCI\'s Common Library and encrypted with NPCI\'s RSA public key. An unofficial source, so only the high-level point was used.' },
    ]},
  ],
});
