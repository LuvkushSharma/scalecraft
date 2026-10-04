Lesson.register({
  id: 'crypto-keys',
  title: 'Public key, private key aur key exchange',
  minutes: 40,
  summary: `Pichhle lesson mein HTTPS ka taala dekha. Ab us taale ke andar jhaankte hain: ek chaabi (symmetric) vs chaabi ki jodi (public + private), kiske paas kaunsi key hoti hai, Diffie-Hellman se do anjaan log ek secret kaise banate hain, certificate kaise saabit karta hai ki server asli hai, aur handshake ke baad server kaise pakka karta hai ki <em>tum</em> kaun ho aur tumhe kya karne ki ijazat hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Riya cafe ke WiFi se xyz.com pe login kar rahi hai. Beech mein koi bhi sun sakta hai.<br>Teen sawaal hain: (1) <strong>Riya aur xyz.com ek secret kaise banayein</strong>, jab beech wala sab sun raha hai? (2) <strong>Riya kaise jaane ki saamne asli xyz.com hai</strong>, koi nakli nahi? (3) <strong>xyz.com kaise jaane ki ye sach mein Riya hai</strong>, aur use kya karne do?<br>Jawab teen auzaar hain: chaabi ki jodi (public key + private key), key exchange (Diffie-Hellman), aur certificate. Har ek ko tum chhote numbers se khud chala ke dekhoge.` },

    { type: 'h2', text: 'Shuru ki problem: ek secret, do log, beech mein jasoos' },
    { type: 'p', html: `<a href="#/tcp-udp-https">TCP, UDP aur HTTPS</a> lesson mein humne dekha ki HTTPS data ko "taale" mein band karta hai. Lekin taala lagane ke liye <strong>chaabi</strong> chahiye. Aur yahi asli paheli hai:` },
    { type: 'list', items: [
      `Riya ne xyz.com ko pehle kabhi chaabi nahi di. Dono pehli baar mil rahe hain.`,
      `Unke beech ka har message cafe ke WiFi se jaata hai. Same WiFi pe baitha koi bhi (chalo use <strong>Eve</strong> bulaate hain, "eavesdropper" se) sab padh sakta hai.`,
      `Agar xyz.com chaabi network pe bheje, to Eve bhi copy kar legi. Phir taala bekaar.`,
    ]},
    { type: 'p', html: `Is lesson ka poora safar isi paheli ko suljhaana hai. Pehle sabse seedha tareeka dekhte hain, aur dekhte hain wo kahan toot-ta hai.` },

    { type: 'h2', text: 'Symmetric key: ek hi chaabi, dono ke paas' },
    { type: 'callout', tone: 'term', title: 'Naya word: symmetric key', html: `<strong>Ye kya hai:</strong> ek hi secret key (ek lamba random number) jisse data band bhi hota hai (<strong>encrypt</strong>) aur khulta bhi hai (<strong>decrypt</strong>). Jaise ghar ka ek taala jiski do bilkul same chaabiyan hon: ek tumhare paas, ek dost ke paas.<br><strong>Kyun chahiye:</strong> ye bahut tez hai. Aaj ka standard <strong>AES</strong> (Advanced Encryption Standard) har second gigabytes encrypt kar deta hai, kyunki aaj ke CPUs mein iske liye alag se instructions bani hain.<br><strong>Iske bina:</strong> video, photos, poori web pages encrypt karna bahut slow hota.<br><strong>Example:</strong> HTTPS connection ka asli data (tumhara feed, video, password) AES jaisi symmetric key se hi encrypt hota hai.` },
    { type: 'p', html: `<strong>Chhota example (khilona cipher):</strong> key = 3. Har letter ko alphabet mein 3 aage khiskao. <code>HELLO</code> ban jaata hai <code>KHOOR</code>. Doosri taraf wala, jiske paas bhi key 3 hai, har letter 3 peeche khiskata hai aur <code>HELLO</code> wapas paa leta hai. Eve ko <code>KHOOR</code> dikhta hai. (Ye khilona sirf samajhne ke liye hai. 26 keys hi hain, Eve 26 try mein tod degi. AES ki key 128 ya 256 bit ki hoti hai: 2<sup>128</sup> possible keys, jo saare computers mil ke bhi try nahi kar sakte.)` },
    { type: 'callout', tone: 'why', title: 'To problem kya hai? Chaabi pahunchaana', html: `Symmetric key tabhi kaam karti hai jab <strong>dono ke paas pehle se same key ho</strong>. Riya aur xyz.com pehli baar mil rahe hain. Key bhejein kaise?<br>• Network pe bheja: Eve ne copy kar li. Ab wo sab padh sakti hai.<br>• Courier se bheja: duniya ke crore users ke liye impossible.<br>• Aur agar sab log aapas mein baat karein (chat app), to har jodi ko alag key chahiye. N log = N×(N−1)/2 keys. Sirf 1,000 log = <strong>4,99,500 keys</strong>. 10 lakh log = lagbhag 50,000 crore keys.<br>Isse <strong>key distribution problem</strong> kehte hain. Ise suljhaane ke liye ek bilkul alag idea chahiye tha.` },

    { type: 'h2', text: 'Asymmetric: taala aur chaabi ki jodi' },
    { type: 'p', html: `1970s mein ek kamaal ka idea aaya: kya ho agar <strong>band karne wali cheez</strong> aur <strong>kholne wali cheez</strong> alag alag hon?` },
    { type: 'callout', tone: 'analogy', title: 'Khula taala (padlock) socho', html: `xyz.com ke paas ek special taala hai. Ye taala koi bhi <strong>dabaa ke band</strong> kar sakta hai, bina chaabi ke. Lekin <strong>kholne</strong> ke liye ek chaabi chahiye, jo sirf xyz.com ke paas hai.<br>xyz.com aise hazaron khule taale sabko baant deta hai. Riya ek dibbe mein apna secret rakhti hai, xyz.com ka taala daba ke band karti hai, aur bhej deti hai. Eve ke paas bhi wahi khula taala hai, lekin band dibba kholne ki chaabi nahi.<br>Taala = <strong>public key</strong>. Chaabi = <strong>private key</strong>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: public key aur private key (key pair)', html: `<strong>Ye kya hai:</strong> do keys ki ek jodi, jo maths se aapas mein judi hain. Dono ek saath ek hi program banata hai (jaise <code>openssl</code> ya <code>ssh-keygen</code>).<br>• <strong>Public key</strong>: sabko de do. Website pe daal do. Isse koi bhi tumhare liye data band (encrypt) kar sakta hai, aur tumhare dastakhat (signature) check kar sakta hai.<br>• <strong>Private key</strong>: kabhi kisi ko nahi. Usi machine pe rehti hai jisne banayi. Isse band data khulta hai, aur dastakhat bante hain.<br><strong>Kyun chahiye:</strong> ab chaabi bhejni hi nahi padti. Sirf taala (public key) bheja jaata hai, aur use chura lene se kuch nahi milta.<br><strong>Iske bina:</strong> key distribution problem: har nayi jodi ke liye pehle kisi safe raaste se key pahunchaani padti.<br><strong>Sabse zaroori baat:</strong> public key se private key nikaalna practically impossible hai. Poori security isi pe tiki hai.` },
    { type: 'p', html: `<strong>Worked example (xyz.com):</strong> xyz.com ne ek key pair banaya. Public key sabko di. Riya ko apna coupon code <code>RIYA50</code> chupa ke bhejna hai. Wo use xyz.com ki <strong>public key</strong> se encrypt karti hai: kuch aisa nikalta hai <code>9f3a…c1</code>. Eve ko ye kachra dikhta hai. Eve ke paas bhi public key hai, lekin public key se ye <em>khul nahi sakta</em>. Sirf xyz.com apni <strong>private key</strong> se <code>RIYA50</code> wapas paata hai.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "public key hai to koi bhi decrypt kar lega"', html: `Nahi. Public key sirf <strong>band</strong> kar sakti hai, kholna nahi. Isliye use poori duniya ko dene mein koi dar nahi. Doosri galti: "private key server bhej deta hai taaki client decrypt kar sake". Kabhi nahi. Private key ek baar bhi machine se bahar gayi, to use leak maano (neeche "key leak" section).` },

    { type: 'h2', text: 'Kiske paas kaunsi key? (sabse zaroori table)' },
    { type: 'p', html: `Beginners yahin sabse zyada uljhte hain. Ek seedha niyam yaad rakho: <strong>jisko apni pehchaan saabit karni hai, uske paas private key hoti hai. Jisko check karna hai, uske paas public key.</strong>` },
    { type: 'list', items: [
      `<strong>Normal HTTPS:</strong> sirf server ko saabit karna hai ki "main asli xyz.com hoon". To <strong>server</strong> ki private key uski apni machine (ya load balancer) pe secret rehti hai. Uski public key <strong>certificate</strong> ke andar har aane wale ko di jaati hai. <strong>Browser ke paas koi key pair nahi hota.</strong> Browser ke paas sirf kuch bharosemand companies (CAs) ki public keys ki list hoti hai, jisse wo certificate check karta hai.`,
      `<strong>mTLS aur SSH:</strong> yahan client ko bhi saabit karna hai ki wo kaun hai. To <strong>client ke paas bhi apna key pair</strong> hota hai.`,
    ]},
    { type: 'table', head: ['Jagah', 'Private key kiske paas', 'Public key kiske paas', 'Kya saabit hota hai'], rows: [
      ['HTTPS (normal website)', 'Sirf xyz.com server / load balancer', 'Sabke paas (certificate mein). Browser mein CAs ki public keys', 'Server asli hai. User ki pehchaan baad mein password/passkey se'],
      ['mTLS (service se service)', 'Dono services, har ek ki apni', 'Dono ek doosre ka certificate dekhte hain', 'Dono taraf ki pehchaan: "main Orders service hoon"'],
      ['SSH (server pe login)', 'Developer ke laptop pe (<code>~/.ssh/id_ed25519</code>). Server ki apni "host key" bhi', 'Server ki <code>authorized_keys</code> file mein developer ki. Laptop ki <code>known_hosts</code> mein server ki', 'Developer asli hai, aur server bhi asli hai'],
      ['JWT RS256 (login token)', 'Sirf Auth service (token sign karti hai)', 'Har API service (JWKS URL se leti hai)', 'Token Auth service ne hi banaya, kisi ne badla nahi'],
      ['WhatsApp jaisa end-to-end chat', 'Har user ke phone pe (install pe banti hai)', 'Server pe store, wahan se doosre users lete hain', 'Sirf Riya aur Aman padh sakte hain, server bhi nahi'],
      ['UPI PIN', 'NPCI ke paas (bank/NPCI ke secure systems)', 'Tumhare phone ki UPI app ke andar NPCI ki library', 'PIN raaste mein ya UPI app ko bhi nahi dikhta'],
    ]},
    { type: 'p', html: `Last do rows thoda detail: WhatsApp ke technical whitepaper ke hisaab se har phone install ke time pe apne key pairs banata hai aur sirf <strong>public</strong> keys server pe register karta hai. Server user ke liye private authentication secrets store nahi karta. UPI mein PIN tumhari UPI app nahi, balki NPCI ki ek "Common Library" leti hai jo phone pe hi PIN ko NPCI ki RSA <strong>public key</strong> se encrypt karti hai. Is library ki public details NPCI ke circulars aur ek community-written specification se aati hain; poora internal design public nahi hai.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "HTTPS mein browser bhi apni key bhejta hai"', html: `Normal HTTPS mein browser ke paas <strong>na private key hoti hai na apna certificate</strong>. Browser ka kaam sirf check karna hai. Browser aur server ke beech jo secret banta hai (session key), wo har connection ke liye naya, temporary hota hai (Diffie-Hellman se, neeche). Wo "browser ka key pair" nahi hai. Client ka apna pakka key pair sirf mTLS, SSH, passkeys jaisi jagahon pe hota hai.` },

    { type: 'h2', text: 'Key pair ke do kaam: taala aur dastakhat' },
    { type: 'p', html: `Ek hi key pair do bilkul ulte kaam kar sakta hai. Dono ko alag samjho:` },
    { type: 'compare',
      left: { title: 'Kaam 1: Encryption (chupaana)', html: `<strong>Public key se band karo → sirf private key khole.</strong><br>Koi bhi tumhe secret bhej sakta hai, sirf tum padh sakte ho.<br><em>Example:</em> Riya coupon code xyz.com ki public key se band karti hai. Sirf xyz.com khol sakta hai.<br><em>Sawaal jo hal hota hai:</em> "koi aur na padhe."` },
      right: { title: 'Kaam 2: Signature (dastakhat)', html: `<strong>Private key se sign karo → koi bhi public key se check kare.</strong><br>Sirf tum sign kar sakte ho, saari duniya check kar sakti hai.<br><em>Example:</em> xyz.com apne login token pe sign karta hai. Har service public key se check karti hai ki token asli hai aur kisi ne badla nahi.<br><em>Sawaal jo hal hota hai:</em> "ye sach mein isi ne bheja, aur badla nahi gaya."` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: digital signature', html: `<strong>Ye kya hai:</strong> ek number jo message aur private key se banta hai. Public key wala check kar sakta hai ki (1) ye isi private key se bana, aur (2) message mein ek bhi letter nahi badla.<br><strong>Kyun chahiye:</strong> "ye sach mein xyz.com ne bheja?" ka jawab, bina koi secret baante.<br><strong>Iske bina:</strong> koi bhi khud ko xyz.com bata ke nakli certificate, nakli token, nakli software update bhej deta.<br><strong>Example:</strong> TLS mein server handshake pe sign karta hai, CA certificate pe sign karti hai, Auth service JWT pe sign karti hai, phone ka OS app updates ka signature check karta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: hash', html: `<strong>Ye kya hai:</strong> ek one-way function jo kisi bhi size ke data ko ek chhote, fixed size ke "fingerprint" mein badal deta hai (jaise SHA-256: hamesha 256 bit). Same input = same hash. Ek letter badla = bilkul alag hash. Hash se wapas data nahi nikal sakta.<br><strong>Kyun chahiye:</strong> 1 GB ki file pe seedha sign karna slow hai. Isliye pehle uska hash nikalte hain, phir sirf hash pe sign karte hain.<br><strong>Iske bina:</strong> signatures bahut slow hote.<br><strong>Example:</strong> <code>SHA-256("hello")</code> = <code>2cf24dba…9824</code>. Ise koi "decrypt" nahi kar sakta, kyunki koi key hai hi nahi.` },
    { type: 'table', head: ['', 'Hashing', 'Encryption', 'Signing'], rows: [
      ['Key?', 'Koi key nahi', 'Haan (symmetric ek, ya public/private)', 'Haan (private sign, public check)'],
      ['Wapas aa sakta hai?', 'Nahi, one-way', 'Haan, sahi key se', 'Message to saath hi jaata hai; signature sirf check hota hai'],
      ['Sawaal jo hal karta hai', 'Data badla kya? Password safe kaise rakhein?', 'Koi aur padh na sake', 'Kisne bheja? Raaste mein badla kya?'],
      ['xyz.com example', 'Passwords DB mein hash (bcrypt/Argon2) karke', 'HTTPS ka data AES se', 'JWT token, certificate, TLS handshake'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "password encrypt karke DB mein rakhte hain"', html: `Nahi, passwords ko <strong>hash</strong> karte hain (salt ke saath, slow function jaise bcrypt ya Argon2; details <a href="#/auth-basics">AuthN, AuthZ</a> lesson mein). Encrypt kiya hota to jiske paas key hai wo sab passwords padh leta. Hash ke saath server bhi asli password nahi jaanta, sirf check kar sakta hai. Aur "signing = private key se encryption" bhi poora sach nahi: RSA mein maths milta-julta dikhta hai, lekin Ed25519 jaise algorithms mein signing aur encryption bilkul alag cheezein hain. Inhe alag kaam samjho.` },

    { type: 'h2', text: 'RSA andar se: chhote numbers ke saath' },
    { type: 'p', html: `"Public key se private key nahi nikalti": ye jaadu kaise? Sabse purana famous algorithm <strong>RSA</strong> (1977, Rivest-Shamir-Adleman ke naam pe) dekhte hain, chhote numbers ke saath. Pehle do words:` },
    { type: 'callout', tone: 'term', title: 'Naya word: prime number aur mod', html: `<strong>Prime:</strong> wo number jo sirf 1 aur khud se poora bhaag hota hai: 2, 3, 5, 7, 11, 13...<br><strong>mod</strong> (modulo): bhaag do aur sirf <strong>bacha hua</strong> (remainder) rakho. <code>64 mod 33 = 31</code>, kyunki 64 = 33 × 1 + 31. Ghadi bhi mod se chalti hai: 10 baje + 5 ghante = 3 baje (15 mod 12).<br><strong>Kyun chahiye:</strong> RSA ka saara hisaab "mod" wali duniya mein hota hai, jahan numbers ek ghere mein ghoomte rehte hain. Isi wajah se ulta chalna (private key nikaalna) bahut mushkil ho jaata hai.` },
    { type: 'steps', items: [
      { t: 'Do secret primes chuno', d: '<code>p = 3</code>, <code>q = 11</code>. Ye kisi ko nahi batane.' },
      { t: 'n nikaalo (public)', d: '<code>n = p × q = 33</code>. Ye sabko dikhega.' },
      { t: 'φ nikaalo (secret)', d: '<code>φ = (p−1) × (q−1) = 2 × 10 = 20</code>. Ise nikaalne ke liye p aur q chahiye.' },
      { t: 'Public exponent e chuno', d: '<code>e = 3</code> (aisa number jiska 20 ke saath koi common factor na ho). <strong>Public key = (n=33, e=3)</strong>.' },
      { t: 'Private exponent d nikaalo', d: 'Aisa d jisme <code>e × d mod φ = 1</code>. <code>3 × 7 = 21</code>, aur <code>21 mod 20 = 1</code>. To <code>d = 7</code>. <strong>Private key = (n=33, d=7)</strong>.' },
      { t: 'Encrypt (public key se)', d: 'Message m = 4. <code>c = 4³ mod 33 = 64 mod 33 = 31</code>. Eve ko 31 dikhta hai.' },
      { t: 'Decrypt (private key se)', d: '<code>31⁷ mod 33 = 4</code>. Message wapas mil gaya!' },
      { t: 'Sign (private key se)', d: '<code>s = 4⁷ mod 33 = 16384 mod 33 = 16</code>. Signature = 16.' },
      { t: 'Verify (public key se)', d: '<code>16³ mod 33 = 4096 mod 33 = 4</code> = message. Dastakhat sahi. Agar kisi ne message 4 se 5 kiya, to 4 ≠ 5: pakda gaya.' },
    ]},
    { type: 'p', html: `<strong>Eve kyun nahi tod sakti?</strong> Eve ko n = 33 aur e = 3 pata hai. d nikaalne ke liye use φ chahiye, aur φ ke liye p aur q, yaani 33 ke do prime tukde. 33 = 3 × 11 to bachcha bhi nikaal lega. Lekin asli RSA mein n <strong>2048 bit</strong> (lagbhag 617 digits) ya usse bada hota hai. Itne bade number ke prime tukde dhoondhne ka koi tez tareeka aaj tak kisi ko nahi pata. Neeche khud khelo:` },
    { type: 'custom', render(el) {
      const P = [3, 5, 7, 11, 13, 17, 19, 23], E = [3, 5, 7, 11, 13, 17];
      const mp = (b, e, m) => { let r = 1; b %= m; while (e > 0) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };
      const gcd = (a, b) => b ? gcd(b, a % b) : a;
      const inv = (e, f) => { for (let d = 1; d < f; d++) if (e * d % f === 1) return d; return null; };
      let p = 3, q = 11, e = 3, m = 4, tamper = false;
      el.innerHTML = `<div style="display:grid;gap:10px">
        <div><div style="font-size:14px;margin-bottom:4px">Secret prime <strong>p</strong></div><div class="ck-p" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
        <div><div style="font-size:14px;margin-bottom:4px">Secret prime <strong>q</strong></div><div class="ck-q" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
        <div><div style="font-size:14px;margin-bottom:4px">Public exponent <strong>e</strong> (sirf wahi jo φ ke saath chalein)</div><div class="ck-e" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>
        <label>Message m = <strong class="ck-mv"></strong> (n se chhota number)<input type="range" class="ck-m" min="2" value="4"></label></div>
        <div class="stats" style="margin-top:10px"><div class="stat"><span>Public key (n, e)</span><strong class="ck-pub"></strong></div><div class="stat"><span>Private key (n, d)</span><strong class="ck-priv"></strong></div><div class="stat"><span>Encrypted c</span><strong class="ck-c"></strong></div><div class="stat"><span>Signature s</span><strong class="ck-s"></strong></div></div>
        <pre class="ck-out" style="font-family:var(--f-mono);font-size:13px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;white-space:pre-wrap;margin:10px 0"></pre>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small ck-t">Raaste mein message badlo</button></div>
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
          `d = ${d}, kyunki ${e} × ${d} = ${e * d} aur ${e * d} mod ${f} = ${e * d % f}\n\n` +
          `ENCRYPT (public): c = ${m}^${e} mod ${n} = ${c}\nDECRYPT (private): ${c}^${d} mod ${n} = ${back}  ${back === m ? '✓ wapas ' + m : '✗'}\n` +
          `Galat key se kholne ki koshish (e se): ${c}^${e} mod ${n} = ${mp(c, e, n)}  ✗ kachra\n\n` +
          `SIGN (private): s = ${m}^${d} mod ${n} = ${s}\nVERIFY (public): ${s}^${e} mod ${n} = ${chk}, message ${tamper ? '(badla hua) ' : ''}= ${mm}  ${chk === mm ? '✓ asli' : '✗ signature fail: kisi ne badla!'}`;
        q$('.ck-t').textContent = tamper ? 'Asli message wapas lao' : 'Raaste mein message badlo';
        q$('.ck-n').textContent = `Eve ko sirf (${n}, ${e}) dikhta hai. Wo ${n} ke tukde dhoondhti hai: ${tries} koshish mein ${p < q ? p : q} mil gaya, phir φ aur d bhi. Chhote numbers mein ye second ka kaam hai. 2048-bit n (617 digits) ke saath aaj ke saare computers mil ke bhi nahi kar sakte. Isliye asli keys 2048 bit ya usse badi hoti hain.`;
      };
      q$('.ck-m').addEventListener('input', ev => { m = +ev.target.value; run(); });
      q$('.ck-t').onclick = () => { tamper = !tamper; run(); };
      run();
    }},
    { type: 'callout', tone: 'warn', title: 'Asli duniya mein RSA aise nahi chalta', html: `Upar ka "textbook RSA" sirf samajhne ke liye hai. Asli mein: (1) keys <strong>2048 bit ya badi</strong> (NIST ke hisaab se 2048-bit RSA lagbhag 112-bit security deta hai, 3072-bit lagbhag 128-bit). (2) Message seedha nahi daalte: random <strong>padding</strong> lagate hain (encryption ke liye OAEP, signature ke liye PSS), warna same message hamesha same kachra banta aur kai attacks khulte. (3) Sign hamesha message ke <strong>hash</strong> pe hota hai. (4) Aaj zyada tar <strong>elliptic curve</strong> keys chalti hain (ECDSA, Ed25519): 256-bit curve key ≈ 3072-bit RSA jitni mazboot, lekin chhoti aur tez. Isliye OpenSSH 9.5 (2023) se <code>ssh-keygen</code> by default Ed25519 key banata hai.` },

    { type: 'h2', text: 'Key exchange: Diffie-Hellman, sabke saamne secret banana' },
    { type: 'p', html: `Ab asli paheli. Riya aur xyz.com ko ek <strong>shared symmetric key</strong> chahiye (kyunki AES tez hai). Lekin key bhej nahi sakte. 1976 mein Whitfield Diffie aur Martin Hellman ne jawab diya: <strong>key bhejo hi mat. Dono taraf usse alag alag bana lo.</strong>` },
    { type: 'callout', tone: 'term', title: 'Naya word: key exchange (Diffie-Hellman)', html: `<strong>Ye kya hai:</strong> ek tareeka jisme do log sirf public cheezein bhejte hain, aur phir bhi dono ek hi secret number pe pahunchte hain. Sunne wala sab sun ke bhi wo secret nahi bana sakta.<br><strong>Kyun chahiye:</strong> AES ki session key dono ke paas aa jaaye, bina network pe jaaye.<br><strong>Iske bina:</strong> ya to key network pe bhejni padti (Eve copy karti), ya pehle se kisi safe raaste se deni padti (impossible).` },
    { type: 'p', html: `Pehle rangon se samjho, phir numbers se. Socho rang milana aasan hai, lekin mile hue rang ko wapas alag karna bahut mushkil:` },
    { type: 'image', src: 'assets/img/crypto-keys/dh.png', maxWidth: 360, alt: 'Diffie-Hellman paint mixing: Alice aur Bob ek common peela rang lete hain, apna secret rang milate hain, mix ek doosre ko bhejte hain, phir apna secret rang dobara milate hain aur dono ke paas same bhoora rang aa jaata hai', caption: 'Rang wala Diffie-Hellman. Common rang sabko pata hai. Har ek apna secret rang milata hai aur sirf mix bhejta hai. Doosre ka mix + apna secret = dono ke paas same aakhri rang. Beech wale ke paas sirf mix hain, aur mix ko alag karna "mehenga" maana gaya hai.', credit: { text: 'A.J. Han Vinck (original), Flugaal (SVG), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Diffie-Hellman_Key_Exchange.svg', license: 'Public domain' } },
    { type: 'p', html: `Ab wahi kaam numbers se. Rang milana = <code>g<sup>secret</sup> mod p</code>. Ye aage chalana aasan hai, lekin result se secret wapas nikaalna (isse <strong>discrete logarithm</strong> problem kehte hain) bade numbers pe practically impossible hai. Wahi numbers jo TCP/HTTPS lesson mein the:` },
    { type: 'table', head: ['Step', 'Riya (browser)', 'Network pe sab dekh sakte hain', 'xyz.com (server)'], rows: [
      ['Public niyam (common rang)', '', 'p = 23, g = 5', ''],
      ['Secret chuno (secret rang)', 'a = 6', '', 'b = 15'],
      ['Mix bhejo', 'A = 5<sup>6</sup> mod 23 = <strong>8</strong>', 'A = 8, B = 19', 'B = 5<sup>15</sup> mod 23 = <strong>19</strong>'],
      ['Doosre ka mix + apna secret', 'K = 19<sup>6</sup> mod 23 = <strong>2</strong>', 'Eve ke paas 23, 5, 8, 19. K nahi.', 'K = 8<sup>15</sup> mod 23 = <strong>2</strong>'],
    ]},
    { type: 'p', html: `Dono ko 2 kyun mila? Kyunki <code>(g<sup>b</sup>)<sup>a</sup> = (g<sup>a</sup>)<sup>b</sup> = g<sup>ab</sup></code>. Dono ne same <code>g<sup>ab</sup></code> banaya, bas alag order mein. Eve ke paas <code>g<sup>a</sup></code> aur <code>g<sup>b</sup></code> hain, lekin unhe jod ke <code>g<sup>ab</sup></code> nahi banta. Use a ya b chahiye. Neeche Eve ban ke try karo:` },
    { type: 'custom', render(el) {
      const PR = [[23, 5, 6, 15], [47, 5, 19, 33], [227, 5, 150, 101], [2039, 7, 1729, 1200]];
      const mp = (b, e, m) => { let r = 1; b %= m; while (e > 0) { if (e & 1) r = r * b % m; b = b * b % m; e >>= 1; } return r; };
      let pi = 0, a = 6, b = 15, eve = false, conn = 1, seed = 2026;
      const rnd = () => { seed = seed * 16807 % 2147483647; return seed / 2147483647; };
      el.innerHTML = `<div style="font-size:14px;margin-bottom:4px">Public prime p (aur g)</div><div class="dh-p" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"></div>
        <div class="row2"><label>Riya ka secret a = <strong class="dh-av"></strong><input type="range" class="dh-a" min="2" value="6"></label><label>xyz.com ka secret b = <strong class="dh-bv"></strong><input type="range" class="dh-b" min="2" value="15"></label></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin:12px 0">
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;background:var(--surface)"><strong>Riya</strong><pre class="dh-r" style="font-family:var(--f-mono);font-size:13px;margin:6px 0 0;white-space:pre-wrap"></pre></div>
          <div style="border:1px dashed var(--amber);border-radius:var(--r-sm);padding:10px;background:var(--surface-2)"><strong>Network (Eve sab dekhti hai)</strong><pre class="dh-w" style="font-family:var(--f-mono);font-size:13px;margin:6px 0 0;white-space:pre-wrap"></pre></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;background:var(--surface)"><strong>xyz.com</strong><pre class="dh-s" style="font-family:var(--f-mono);font-size:13px;margin:6px 0 0;white-space:pre-wrap"></pre></div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small primary dh-eve">Eve ban ke a dhoondho</button><button type="button" class="btn small ghost dh-new">Naya connection (naye secrets)</button></div>
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
        q$('.dh-w').textContent = `p = ${p}, g = ${g}\nA = ${A}  (Riya → xyz.com)\nB = ${B}  (xyz.com → Riya)\nK = ??` + (eve ? `\n\nEve: ${g}^1, ${g}^2, ... try kiye.\n${tries} koshish mein ${g}^${x} mod ${p} = ${A} → a = ${x}\nK = ${B}^${x} mod ${p} = ${mp(B, x, p)}  (pakdi gayi!)` : '');
        q$('.dh-n').textContent = `Connection #${conn}: dono ki key ${K1 === K2 ? 'same: ' + K1 : 'alag?!'}. Network pe K kabhi nahi gaya. ` + (eve ? `Chhote p (${p}) mein Eve ne ek-ek number try karke ${tries} koshish mein secret dhoondh liya. Kitni koshish lag sakti hain, wo p ke size ke saath badhta hai: p = 23 pe zyada se zyada 22, p = 2039 pe lagbhag 2000. Asli TLS mein X25519 curve (ya 2048-bit+ group) hota hai: ek-ek try karna to bhool jao (2^250 se zyada options), sabse achhe known attacks ko bhi lagbhag 2^128 kadam chahiye (2048-bit group pe lagbhag 2^112). Duniya ke saare computers mil ke bhi nahi.` : `"Eve ban ke" dabao aur dekho chhote numbers kitne kamzor hain.`);
      };
      q$('.dh-a').addEventListener('input', ev => { a = +ev.target.value; eve = false; run(); });
      q$('.dh-b').addEventListener('input', ev => { b = +ev.target.value; eve = false; run(); });
      q$('.dh-eve').onclick = () => { eve = true; run(); };
      q$('.dh-new').onclick = () => { const [p, g] = PR[pi]; do { a = 2 + Math.floor(rnd() * (p - 3)); b = 2 + Math.floor(rnd() * (p - 3)); } while (a < p / 4 || b < p / 4 || mp(g, a * b % (p - 1), p) < 2); conn++; eve = false; run(); };
      run();
    }},

    { type: 'callout', tone: 'term', title: 'Naya word: ECDHE', html: `<strong>Ye kya hai:</strong> Diffie-Hellman ka aaj wala version. <strong>EC</strong> = Elliptic Curve: "g<sup>a</sup> mod p" ki jagah ek curve ke points pe hisaab, jisse chhote numbers (32 bytes) mein utni hi security milti hai. <strong>E</strong> (aakhri wala) = <strong>Ephemeral</strong>, yaani "ek baar ka": har naye connection pe naye secrets a aur b, kaam khatam hote hi phenk diye.<br><strong>Kyun chahiye:</strong> tez, chhota, aur har connection ki key alag.<br><strong>Iske bina:</strong> ek hi key bahut saare connections pe chalti, ek leak = sab khula.<br><strong>Example:</strong> X25519 curve (RFC 7748). Aaj ke browsers aur xyz.com ka load balancer TLS 1.3 mein yahi sabse zyada use karte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: forward secrecy', html: `<strong>Ye kya hai:</strong> guarantee ki agar server ki private key <em>baad mein</em> chori ho jaaye, tab bhi <em>pehle</em> ki recorded baatein nahi khulengi.<br><strong>Kyun chahiye:</strong> Eve aaj ka saara encrypted traffic record karke rakh sakti hai, is umeed mein ki kabhi key haath lagegi.<br><strong>Iske bina (purana tareeka):</strong> TLS 1.2 tak "RSA key transport" chalta tha: browser session key ko server ki <strong>public key</strong> se band karke bhejta tha. Agle saal private key leak hui → Eve ne purani recording kholi → session key nikli → saara purana data padh liya.<br><strong>ECDHE ke saath:</strong> session key a aur b se bani thi, jo connection ke baad mit gaye. Server ki private key se session key nikalti hi nahi. Private key ka kaam sirf <em>sign</em> karna hai ("main asli xyz.com hoon"), chupaana nahi. Isliye TLS 1.3 (RFC 8446) ne RSA key transport hata hi diya: har key exchange ab forward secrecy deta hai.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "Diffie-Hellman akela kaafi hai"', html: `Nahi! DH sirf ye pakka karta hai ki <em>jisse</em> tum baat kar rahe ho, uske saath secret ban gaya. Lekin agar Eve beech mein baith ke Riya se ek DH aur xyz.com se doosra DH kar le, to dono taraf "secret" ban jaayega, Eve ke saath! Isse <strong>man-in-the-middle</strong> kehte hain. Isliye DH ke saath ek aur cheez chahiye: server <strong>apni private key se handshake pe sign karta hai</strong>, aur browser us signature ko <strong>certificate</strong> wali public key se check karta hai. Wo agle section mein.` },

    { type: 'h2', text: 'Phir AES: asli data ke liye session key' },
    { type: 'p', html: `Handshake ke baad dono ke paas same secret K hai. Ab:` },
    { type: 'steps', items: [
      { t: 'K se keys banao', d: 'Dono taraf K aur handshake ke saare messages ko ek "key derivation" function (TLS 1.3 mein HKDF) mein daal ke kuch <strong>session keys</strong> banti hain: ek browser→server direction ke liye, ek server→browser ke liye.' },
      { t: 'Data AES se', d: 'Har HTTP request, har image, har video tukda in session keys se <strong>AES-GCM</strong> (ya phones pe aksar <strong>ChaCha20-Poly1305</strong>) se encrypt hota hai. Ye symmetric hai, isliye bahut tez.' },
      { t: 'Har tukde pe seal', d: 'AES-GCM sirf chupaata nahi, har record pe ek tag (MAC jaisa) bhi lagata hai. Raaste mein ek bit badla to tag fail, record reject. Isse <strong>AEAD</strong> (encryption + integrity ek saath) kehte hain.' },
      { t: 'Connection khatam, keys khatam', d: 'Tab band hua, session keys memory se mit gayin. Agla connection = naya ECDHE = nayi keys.' },
    ]},
    { type: 'callout', tone: 'why', title: 'Do tarah ki keys kyun? (hybrid encryption)', html: `<strong>Asymmetric</strong> (RSA, ECDSA, ECDHE) bahut slow hai, lekin bina pehle mile kaam karta hai. <strong>Symmetric</strong> (AES) bahut tez hai, lekin dono ke paas pehle se key chahiye. To dono ko milate hain: asymmetric sirf handshake mein (pehchaan + key banana, kuch milliseconds), phir saara bhaari data symmetric se. Duniya ka lagbhag har secure system (HTTPS, SSH, WhatsApp, VPN) yahi "hybrid" pattern use karta hai.` },

    { type: 'h2', text: 'Certificate: public key ka ID card' },
    { type: 'p', html: `Ab sabse zaroori sawaal: browser ko server ki public key mili. <strong>Lekin kaise pata ki ye public key asli xyz.com ki hai, Eve ki nahi?</strong> Koi bhi key pair bana ke bol sakta hai "main xyz.com hoon". Isliye public key akeli nahi aati, ek <strong>certificate</strong> ke andar aati hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: certificate (X.509)', html: `<strong>Ye kya hai:</strong> ek chhoti digital file, jaise ID card, jisme likha hai "ye public key xyz.com ki hai", aur us pe kisi bharosemand company ka <strong>signature</strong> hai. Format ka naam X.509 hai.<br><strong>Kyun chahiye:</strong> public key aur domain naam ko jodne ke liye, aisa jod jo koi badal na sake.<br><strong>Iske bina:</strong> Eve apni public key bhej ke khud ko xyz.com bata deti, aur browser maan leta.` },
    { type: 'table', head: ['Certificate ke andar', 'Example (xyz.com)', 'Kis kaam ka'], rows: [
      ['Subject / SAN (naam)', '<code>xyz.com</code>, <code>www.xyz.com</code>', 'Kis domain ke liye valid hai. Browser yahi URL se milata hai'],
      ['Public key', 'X25519/ECDSA ya RSA 2048 ki public key', 'Isi se server ka handshake signature check hoga'],
      ['Issuer', '"Shala Intermediate CA"', 'Kisne sign kiya. Isi se agla certificate dhoondha jaata hai'],
      ['Validity', 'Not before 2026-07-20, not after 2027-01-31', 'Kab tak valid. Purana = expired'],
      ['Serial number', '<code>4F2B</code>', 'Revoke karna ho to isi number se'],
      ['Signature', 'Issuer ki private key se bana', 'Saabit karta hai ki upar ki saari lines CA ne hi likhin, kisi ne badli nahi'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Certificate Authority (CA) aur chain of trust', html: `<strong>Ye kya hai:</strong> <strong>CA</strong> ek company jo pehle check karti hai ki domain sach mein tumhara hai (jaise "xyz.com pe ye file rakho" ya "DNS mein ye record daalo"), phir certificate pe sign karti hai. Let's Encrypt, DigiCert, Google Trust Services examples hain.<br>CA apni sabse keemti <strong>root</strong> key ko offline (taale mein) rakhti hai. Roz ka signing ek <strong>intermediate CA</strong> karta hai, jiska certificate root ne sign kiya hai. To ek <strong>chain</strong> banti hai: xyz.com (leaf) ← intermediate ← root.<br><strong>Kyun chahiye:</strong> browser crore websites ko nahi jaanta. Wo bas kuch dozen roots pe bharosa karta hai, aur chain ke through har website tak pahunch jaata hai.<br><strong>Iske bina:</strong> har browser ko har website ki public key pehle se rakhni padti. Impossible.` },
    { type: 'callout', tone: 'term', title: 'Naya word: trust store', html: `<strong>Ye kya hai:</strong> tumhare phone/laptop ke OS ya browser ke andar pehle se rakhi <strong>root CAs ki public keys</strong> ki list. Ye OS aur browser update ke saath aati hai (jaise Mozilla, Apple, Microsoft, Google apni lists chalate hain).<br><strong>Kyun chahiye:</strong> chain ka aakhri sira yahin milna chahiye. Yahi bharose ki jad hai.<br><strong>Iske bina:</strong> browser kisi bhi certificate ko check nahi kar paata.<br><strong>Dhyaan:</strong> agar koi tumhare device ke trust store mein apna root daal de (malware, ya company laptop pe "corporate root"), to wo tumhara HTTPS traffic khol sakta hai. Isliye anjaan "certificate install karo" kabhi mat karo.` },
    { type: 'image', src: 'assets/img/crypto-keys/chain.png', alt: 'Chain of trust: end entity certificate ko intermediate ki private key sign karti hai, intermediate ko root CA ki private key, root khud ko sign karta hai. Verify ulti disha mein public keys se hota hai', caption: 'Chain of trust. Har certificate pe uske upar wale (issuer) ki private key ka signature hai. Browser ulta chalta hai: leaf ka signature intermediate ki public key se, intermediate ka root ki public key se, aur root trust store mein milna chahiye.', credit: { text: 'Yuhkih, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Chain_Of_Trust.svg', license: 'CC BY-SA 4.0' } },

    { type: 'p', html: `<strong>Browser certificate ko kaise check karta hai</strong> (har HTTPS connection pe, milliseconds mein):` },
    { type: 'steps', items: [
      { t: 'Signature chain', d: 'Leaf (xyz.com) ka signature intermediate ki public key se check. Intermediate ka signature root ki public key se check. Ek bhi letter badla ho to hash alag aayega aur signature fail.' },
      { t: 'Root trust store mein?', d: 'Chain ka root browser/OS ki list mein hona chahiye. Eve ka khud banaya root list mein nahi hota.' },
      { t: 'Domain match', d: 'URL mein <code>xyz.com</code> hai, to certificate ke SAN mein <code>xyz.com</code> (ya <code>*.xyz.com</code>) hona chahiye. <code>xyz-offers.com</code> ka valid certificate xyz.com pe nahi chalega.' },
      { t: 'Date', d: 'Aaj ki date "not before" aur "not after" ke beech honi chahiye.' },
      { t: 'Revoke to nahi hua?', d: 'Agar CA ne certificate cancel kiya hai (jaise key leak hone pe), to browser use reject kare. Browsers iske liye CAs ki revocation lists (CRL) se banayi apni compact lists use karte hain.' },
      { t: 'Private key ka saboot', d: 'Certificate to public hai, koi bhi copy kar sakta hai! Isliye TLS 1.3 mein server poore handshake pe apni <strong>private key se sign</strong> karta hai (CertificateVerify message). Browser certificate wali public key se check karta hai. Sirf asli private key wala ye kar sakta hai.' },
    ]},
    { type: 'p', html: `Ab khud browser bano. Neeche ek chhota "chain verifier" hai. Isme khilona RSA keys hain (upar wale jaisa hisaab: root ki key n = 3233, intermediate ki n = 2773), aur ek khilona hash. Har case chuno aur dekho kaunsa check fail hota hai. Aaj ki date 2026-10-04 maani hai, aur tum <code>xyz.com</code> khol rahe ho.` },
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
        ['Sahi certificate', 'Sab theek: asli xyz.com.', () => [sign(leaf({})), inter, root], false],
        ['Badla hua (tampered)', 'Eve ne asli certificate copy karke andar ki public key apni daal di, signature wahi purana rakha.', () => { const c = sign(leaf({})); c.pub = 'n=9991,e=3'; return [c, inter, root]; }, false],
        ['Expired', 'xyz.com ki auto-renewal toot gayi. Certificate 2026-09-30 ko khatam ho gaya.', () => [sign(leaf({ from: '2026-03-20', to: '2026-09-30', serial: '3C11' })), inter, root], false],
        ['Galat domain', 'Eve ke paas xyz-offers.com ka asli, valid certificate hai. Wo use xyz.com ke naam pe chalati hai.', () => [sign(leaf({ subject: 'xyz-offers.com', names: ['xyz-offers.com'], serial: '5B07' })), inter, root], false],
        ['Anjaan root', 'Eve ne apna khud ka "root CA" banaya aur usse xyz.com ka certificate sign kiya.', () => [sign(leaf({ issuer: 'FreeCert Root (Eve)', serial: '77' })), evilRoot], false],
        ['Revoked (key leak)', 'xyz.com ki purani private key leak hui. Certificate 4F2A revoke ho gaya, lekin Eve wahi chala rahi hai.', () => [sign(leaf({ serial: '4F2A' })), inter, root], true],
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
          rows.push([v === h, `${i === 0 ? 'Leaf' : c.subject} ka signature, "${c.issuer}" ki public key se: hash = ${h}, signature^${k.e} mod ${k.n} = ${v}`]);
        }
        const top = chain[chain.length - 1];
        rows.push([TRUST.includes(top.subject), `Root "${top.subject}" trust store mein ${TRUST.includes(top.subject) ? 'hai' : 'NAHI hai'}`]);
        rows.push([lf.names.includes(HOST), `Domain: URL ${HOST}, certificate mein ${lf.names.join(', ')}`]);
        rows.push([lf.from <= TODAY && TODAY <= lf.to, `Date: aaj ${TODAY}, valid ${lf.from} → ${lf.to}`]);
        rows.push([!CRL.includes(lf.serial), `Revocation list [${CRL.join(', ')}] mein serial ${lf.serial} ${CRL.includes(lf.serial) ? 'MILA (revoked)' : 'nahi hai'}`]);
        q$('.ck-checks').innerHTML = rows.map(([ok, t]) => `<div style="display:flex;gap:8px;align-items:flex-start;font-size:14px"><span style="color:${ok ? 'var(--green)' : 'var(--red)'};font-weight:700">${ok ? '✓' : '✗'}</span><span>${t}</span></div>`).join('');
        const fails = rows.filter(r => !r[0]).length, vd = q$('.ck-verdict');
        vd.style.background = fails ? 'var(--surface-2)' : 'var(--accent-soft)'; vd.style.border = '1px solid ' + (fails ? 'var(--red)' : 'var(--green)');
        vd.textContent = fails ? `Browser: "Your connection is not private". ${fails} check fail. Password kabhi nahi bheja gaya.` : 'Browser: lock icon. Ab handshake ka signature (CertificateVerify) is public key se check hoga, phir login page khulega.';
      };
      run();
    }},

    { type: 'callout', tone: 'tip', title: 'Ek aur pehra: Certificate Transparency', html: `Agar koi CA galti se (ya hack hoke) Eve ko xyz.com ka certificate de de to? Iske liye aaj har public certificate ek public, sirf-jodo-mitao-nahi wale log mein likha jaata hai (<strong>Certificate Transparency</strong>). Chrome aur Safari aise certificates hi maante hain jo in logs mein hon. xyz.com ki security team in logs ko monitor karke dekh sakti hai ki uske naam pe koi anjaan certificate to nahi bana.` },

    { type: 'h2', text: 'Man-in-the-middle: certificate check ke saath aur bina' },
    { type: 'p', html: `Ab sab jod ke poora TLS 1.3 handshake chalao. Riya cafe ke WiFi pe hai, aur Eve same WiFi pe. Paanchon scenarios chalao: pehla normal, baaki chaar failure. Khaaskar "check band" wala dekho: wahi dikhata hai ki certificate check kyun zaroori hai.` },
    { type: 'flow', height: 330, title: 'TLS 1.3 handshake aur uske hamle',
      nodes: [
        { id: 'b', label: 'Riya ka browser', sub: 'koi key pair nahi', x: 95, y: 90, w: 150, kind: 'client', info: 'Ye kya hai: Riya ka browser. Iske paas apna koi pakka key pair nahi hai. Har connection pe ek temporary ECDHE secret banata hai, aur certificate ko trust store se check karta hai.' },
        { id: 'ts', label: 'Trust store', sub: 'root CAs ki list', x: 95, y: 250, w: 150, kind: 'data', info: 'Ye kya hai: phone/laptop ke OS ya browser mein pehle se rakhi root CAs ki public keys. Certificate chain ka aakhri sira yahin milna chahiye. Ye network pe nahi hai, device ke andar hai.' },
        { id: 'eve', label: 'Eve', sub: 'same WiFi pe', x: 360, y: 250, w: 150, kind: 'threat', info: 'Ye kya hai: beech ka attacker (man-in-the-middle). Sab packets dekh sakti hai, rok sakti hai, badal sakti hai. Uske paas xyz.com ki private key nahi hai (jab tak leak na ho).' },
        { id: 's', label: 'xyz.com server', sub: 'private key yahin', x: 625, y: 90, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ka load balancer/server. Iske paas certificate aur uski private key hai. Private key kabhi network pe nahi jaati: sirf handshake pe sign karne ke kaam aati hai.' },
        { id: 'ca', label: 'CA', sub: 'certificate deti', x: 625, y: 250, w: 150, kind: 'edge', info: 'Ye kya hai: Certificate Authority. Handshake se kaafi pehle xyz.com ko certificate deti hai, aur key leak hone pe use revoke karti hai. Har handshake mein beech mein nahi aati.' },
      ],
      edges: [{ a: 'b', b: 's' }, { a: 'b', b: 'ts' }, { a: 'b', b: 'eve' }, { a: 'eve', b: 's' }, { a: 's', b: 'ca' }, { a: 'b', b: 'ca', id: 'rev', dashed: true, hidden: true }],
      scenarios: [
        { name: 'Normal handshake', intro: 'TCP connection ban chuka hai. Ab TLS 1.3, sirf 1 round trip mein.', steps: [
          { title: 'ClientHello', text: 'Browser ek naya temporary ECDHE secret <code>a</code> banata hai aur uska public hissa <code>A</code> (key share) bhejta hai. Saath mein: "main TLS 1.3 aur ye ciphers jaanta hoon".', go: 'b>s', msg: 'ClientHello: key_share A, ciphers [AES-128-GCM, CHACHA20-POLY1305]' },
          { title: 'ServerHello + certificate + signature', text: 'Server apna temporary secret <code>b</code> banata hai, <code>B</code> bhejta hai, phir apna certificate, phir <strong>CertificateVerify</strong>: ab tak ke saare handshake messages pe private key se signature. Dono ab K = g<sup>ab</sup> nikaal chuke hain.', go: 'res:s>b', msg: 'ServerHello: key_share B\nCertificate: xyz.com (issuer: Shala Intermediate CA)\nCertificateVerify: sig(private key, handshake)\nFinished' },
          { title: 'Chain check', text: 'Browser chain ko trust store tak le jaata hai: root mila. Domain xyz.com match. Date theek. Revoke nahi.', go: ['b>ts', 'res:ts>b'], set: { ts: { state: 'ok' } } },
          { title: 'Signature check', text: 'Certificate wali public key se CertificateVerify check: sahi. Matlab saamne wale ke paas sach mein xyz.com ki private key hai. Aur kyunki signature mein A aur B bhi shaamil hain, Eve unhe badal nahi sakti thi.', focus: ['b'], set: { b: { state: 'ok', sub: 'server asli ✓' } } },
          { title: 'Encrypted data (AES)', text: 'Browser ka Finished aur pehli HTTP request, dono K se bani session keys se AES-GCM mein. Eve ko sirf kachra dikhta hai.', go: ['b>s', 'res:s>b'], msg: 'POST /login  (AES-GCM encrypted)  →  200 OK' },
        ]},
        { name: 'Nakli certificate', intro: 'Eve beech mein aa gayi aur xyz.com hone ka naatak kar rahi hai.', steps: [
          { title: 'Eve ne ClientHello pakda', text: 'Browser ka message Eve tak gaya. Eve khud server ban ke jawab degi.', go: 'b>eve', set: { eve: { state: 'hot' } } },
          { title: 'Eve apna certificate bhejti hai', text: 'Eve ke paas xyz.com ki private key nahi. To wo apna key pair bana ke apne khud ke "FreeCert Root" se sign kiya certificate bhejti hai, aur apni key se CertificateVerify.', go: 'res:eve>b', msg: 'Certificate: xyz.com (issuer: FreeCert Root (Eve))' },
          { title: 'Trust store mein root nahi', text: 'Browser chain ke root ko trust store mein dhoondhta hai: nahi mila. Bada laal page: "Your connection is not private". Password kabhi nahi gaya.', go: ['b>ts', 'bad:ts>b'], set: { b: { state: 'warn', sub: 'nakli certificate!' }, ts: { state: 'miss' } } },
        ]},
        { name: 'Check band (bug)', intro: 'Ek developer ne testing ke liye xyz.com ki mobile app mein certificate check band kar diya (jaise verify=False) aur wahi code release ho gaya.', steps: [
          { title: 'Eve ka nakli certificate', text: 'Eve phir se apna certificate bhejti hai. App bina check kiye maan leti hai.', go: ['b>eve', 'res:eve>b'], set: { eve: { state: 'hot' } }, after: { b: { state: 'warn', sub: 'check band!' } } },
          { title: 'Do alag tunnels', text: 'Eve ne app ke saath ek ECDHE kiya aur asli xyz.com ke saath doosra. Dono taraf "secure" lagta hai, lekin beech mein Eve sab decrypt karke padh rahi hai, aur aage bhej rahi hai.', go: ['b>eve>s', 'res:s>eve>b'], msg: 'Eve dekhti hai: POST /login {"user":"riya","password":"..."}' },
          { title: 'Sabak', text: 'Encryption tha, phir bhi sab chori. Key exchange akela kaafi nahi: <strong>kisse</strong> key banayi, wo certificate check se hi pata chalta hai. Certificate verification kabhi band mat karo, testing mein bhi apna test CA trust store mein daalo.', focus: ['eve'], set: { eve: { sub: 'password mil gaya' } } },
        ]},
        { name: 'Expired certificate', intro: 'xyz.com ka certificate renew karne wala cron job teen hafte se fail ho raha tha. Kisi ne alert nahi dekha.', steps: [
          { title: 'Purana certificate', text: 'Server wahi purana certificate bhejta hai jiski "not after" date kal thi.', go: ['b>s', 'res:s>b'], set: { s: { state: 'warn', sub: 'cert expired' } } },
          { title: 'Browser rok deta hai', text: 'Signature aur chain sab sahi, lekin date fail. Har user ko laal warning. Site practically band.', focus: ['b'], set: { b: { state: 'warn', sub: 'expired!' } } },
          { title: 'Fix', text: 'CA se naya certificate (ACME protocol se automatic, jaise Let\'s Encrypt), aur expiry pe alert. Public certificates ki max umar ghat rahi hai (2026 se 200 din, 2029 tak 47 din), isliye manual renewal ab chalega hi nahi.', go: ['s>ca', 'res:ca>s'], after: { s: { state: 'ok', sub: 'naya cert ✓' }, b: { state: 'ok', sub: 'lock ✓' } } },
        ]},
        { name: 'Private key leak', intro: 'Ek purane backup se xyz.com ki private key leak ho gayi, aur Eve ke haath lag gayi.', steps: [
          { title: 'Eve asli jaisi dikhti hai', text: 'Ab Eve ke paas asli certificate <em>aur</em> asli private key, dono hain. Uska CertificateVerify sahi banta hai. Chain, domain, date sab pass.', go: ['b>eve', 'res:eve>b'], set: { eve: { state: 'hot', sub: 'chori ki key' } }, after: { b: { state: 'warn', sub: 'dhokha ho gaya' } } },
          { title: 'Purani recordings?', text: 'Eve ne pichhle mahine ka traffic bhi record kiya tha. Kya ab wo khulega? <strong>Nahi</strong>: har connection ki key ECDHE se bani thi, private key se nahi (forward secrecy). Nuksaan sirf aage ke naye connections tak.', focus: ['eve'] },
          { title: 'Revoke + rotate', text: 'xyz.com turant: (1) CA ko bolta hai certificate revoke karo, (2) <strong>naya</strong> key pair banata hai, (3) naye key ke liye naya certificate leta hai. Purani key ab bekaar.', go: ['s>ca', 'res:ca>s'], set: { s: { sub: 'nayi key ✓' } }, after: { ca: { state: 'ok', sub: 'purana revoked' } } },
          { title: 'Browser revocation check', text: 'Browser ki revocation list update hui. Eve ka (purana) certificate ab reject. Dhyaan: ye update kuch ghante/din le sakta hai, isliye chhote lifetime wale certificates bhi ek suraksha hain.', show: ['rev'], go: ['res:ca>b', 'b>eve', 'res:eve>b'], after: { b: { state: 'ok', sub: 'revoked pakda ✓' }, eve: { state: 'down', sub: 'reject' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Handshake ke baad: server asli hai. Ab user kaun hai?' },
    { type: 'p', html: `Dhyaan se dekho TLS ne kya saabit kiya: <strong>"saamne asli xyz.com hai"</strong>. Bas. TLS ne ye nahi bataya ki browser pe Riya baithi hai ya koi aur. Normal HTTPS mein browser ki taraf se koi pehchaan nahi gayi. To ab doosra kaam shuru hota hai, jiske do hisse hain:` },
    { type: 'list', items: [
      `<strong>Authentication (AuthN)</strong>: "tum kaun ho?" Saboot do (password, passkey, client certificate, SSH key).`,
      `<strong>Authorization (AuthZ)</strong>: "tumhe kya karne ki ijazat hai?" Pehchaan pakki hone ke baad, har request pe check.`,
    ]},
    { type: 'p', html: `Pehchaan saabit karne ke chaar aam tareeke hain. Har ek ko key pair ki nazar se dekho: <strong>secret kiske paas, check kaise hota hai</strong>.` },
    { type: 'h3', text: 'Tareeka 1: password, phir session cookie ya JWT' },
    { type: 'p', html: `Riya encrypted TLS tunnel ke andar password bhejti hai. Server DB mein rakhe password ke <strong>hash</strong> se milata hai. Sahi hai to server ek "pass" deta hai taaki har request pe password na bhejna pade. Do tarah ke pass (poori detail <a href="#/auth-basics">AuthN, AuthZ, JWT, OAuth</a> lesson mein):` },
    { type: 'list', items: [
      `<strong>Session cookie:</strong> ek random ID (<code>sid=8f2c…</code>). Server apne session store mein likhta hai "8f2c = Riya". Koi key pair nahi; bas ek lamba random secret jo sirf browser aur server jaante hain.`,
      `<strong>JWT (RS256 / ES256):</strong> ek token jisme likha hai <code>{"sub":"riya","role":"user","exp":...}</code>, aur us pe <strong>Auth service ki private key</strong> ka signature. Orders, Payments jaisi har service Auth service ki <strong>public key</strong> se check karti hai (public keys ek URL pe milti hain jise <strong>JWKS</strong> kehte hain). Kisi service ko secret nahi chahiye, aur koi service nakli token bana bhi nahi sakti. Wahi public key / private key wala dastakhat, bas certificate ki jagah token pe.`,
    ]},
    { type: 'p', html: `<strong>Worked example:</strong> Riya ka JWT payload <code>role: "user"</code>. Wo browser mein token kholke <code>"admin"</code> likh deti hai. Orders service signature check karti hai: payload badla, to hash badla, to signature match nahi. <code>401 Unauthorized</code>. Upar RSA widget mein "message badlo" button ne yahi dikhaya tha.` },
    { type: 'h3', text: 'Tareeka 2: passkeys (WebAuthn), bina password ke' },
    { type: 'callout', tone: 'term', title: 'Naya word: passkey (WebAuthn)', html: `<strong>Ye kya hai:</strong> password ki jagah ek key pair. Jab Riya xyz.com pe passkey banati hai, uska phone (ya laptop, ya USB security key) ek naya key pair banata hai <strong>sirf xyz.com ke liye</strong>. Private key phone ke secure hisse mein rehti hai, public key xyz.com ke DB mein jaati hai. Login pe fingerprint/face/PIN se phone ka taala khulta hai, aur phone xyz.com ke bheje <strong>challenge</strong> (ek random number) pe sign karta hai. Ye W3C ka WebAuthn standard hai.<br><strong>Kyun chahiye:</strong> server ke paas chori karne layak koi secret hai hi nahi (sirf public key). Aur passkey <strong>domain se bandhi</strong> hai: nakli site <code>xyz-login.com</code> pe browser xyz.com wali passkey use hi nahi karega. Phishing lagbhag khatam.<br><strong>Iske bina:</strong> password reuse, phishing, aur DB leak hone pe password hashes crack hone ka khatra.<br><strong>Dhyaan:</strong> fingerprint kabhi phone se bahar nahi jaata. Wo sirf phone ki apni private key ka taala kholta hai.` },
    { type: 'steps', items: [
      { t: 'Registration (ek baar)', d: 'xyz.com ek challenge bhejta hai. Phone naya key pair banata hai, public key + ek credential ID xyz.com ko bhejta hai. xyz.com DB mein likhta hai: "Riya → ye public key".' },
      { t: 'Login: challenge', d: 'xyz.com ek naya random challenge bhejta hai, jaise <code>7c91…e2</code>. Har baar naya, taaki purana jawab dobara chala na sake (replay).' },
      { t: 'Login: sign', d: 'Riya fingerprint lagati hai. Phone challenge + xyz.com ka naam (origin) pe private key se sign karta hai.' },
      { t: 'Login: verify', d: 'xyz.com DB wali public key se signature check karta hai. Sahi → Riya logged in → session cookie / JWT, aage wahi Tareeka 1 jaisa.' },
    ]},
    { type: 'h3', text: 'Tareeka 3 aur 4: client ke paas apna key pair (mTLS, SSH)' },
    { type: 'p', html: `Jab client ek program ho (Orders service) ya developer ho (server pe login), to client bhi apna key pair rakhta hai. mTLS mein client TLS handshake ke andar hi apna certificate dikhata hai. SSH mein developer ki public key server pe pehle se likhi hoti hai. Dono ka poora flow agle section mein.` },
    { type: 'p', html: `Pehle web user ka safar chalao: password login, JWT se API call, passkey login, aur do failures.` },
    { type: 'flow', height: 330, title: 'Handshake ke baad: pehchaan aur ijazat',
      nodes: [
        { id: 'u', label: 'Riya ka phone', sub: 'browser / app', x: 90, y: 170, w: 150, kind: 'client', info: 'Ye kya hai: Riya ka phone. TLS tunnel pehle se bana hua hai. Password, passkey ki private key (secure chip mein), aur mile hue token yahin rehte hain.' },
        { id: 'auth', label: 'Auth service', sub: 'login, JWT sign', x: 345, y: 70, w: 160, kind: 'server', info: 'Ye kya hai: login sambhalne wali service. Password/passkey check karti hai aur apni private key se JWT pe sign karti hai. Ye private key sirf isi ke paas (aksar KMS mein).' },
        { id: 'db', label: 'Users DB', sub: 'hash, passkey keys', x: 610, y: 70, w: 160, kind: 'data', info: 'Ye kya hai: users ki table. Password ka hash (asli password nahi) aur passkeys ki public keys. Isme koi private key nahi, isliye leak hone pe bhi login secrets nahi khulte.' },
        { id: 'api', label: 'Orders service', sub: 'JWT verify, role', x: 345, y: 270, w: 160, kind: 'server', info: 'Ye kya hai: ek API service. Har request pe JWT ka signature Auth service ki public key se check karti hai (authentication), phir role dekh ke faisla (authorization).' },
        { id: 'jw', label: 'JWKS', sub: 'public keys URL', x: 610, y: 270, w: 160, kind: 'cache', info: 'Ye kya hai: ek URL (jaise /.well-known/jwks.json) jahan Auth service apni public keys rakhti hai. Services inhe padh ke cache kar leti hain. Key rotate ho to nayi key yahin aa jaati hai.' },
      ],
      edges: [{ a: 'u', b: 'auth' }, { a: 'auth', b: 'db' }, { a: 'u', b: 'api' }, { a: 'api', b: 'jw' }, { a: 'auth', b: 'jw', dashed: true }],
      scenarios: [
        { name: 'Password login', steps: [
          { title: 'Password, tunnel ke andar', text: 'TLS se encrypted tunnel mein username + password.', go: 'u>auth', msg: 'POST /login {"user":"riya","password":"••••••"}' },
          { title: 'Hash se milao', text: 'Auth service DB se Riya ka bcrypt/Argon2 hash laati hai aur password ka hash milati hai.', go: ['auth>db', 'res:db>auth'], set: { db: { state: 'hit' } } },
          { title: 'Signed JWT', text: 'Match. Auth service JWT banati hai aur apni <strong>private key</strong> se sign karti hai. 15 minute ki expiry.', go: 'res:auth>u', msg: 'JWT: header.{"sub":"riya","role":"user","exp":...}.signature', after: { u: { state: 'ok', sub: 'logged in ✓' } } },
        ]},
        { name: 'JWT se API call', steps: [
          { title: 'Token ke saath request', text: 'Riya apne orders maangti hai. Token header mein jaata hai.', go: 'u>api', msg: 'GET /orders  Authorization: Bearer eyJhbGciOiJSUzI1NiIs...' },
          { title: 'Public key lo (cache)', text: 'Orders service JWKS se Auth ki public key leti hai. Aksar ye pehle se cache mein hoti hai, har request pe nahi jaana padta.', go: ['api>jw', 'res:jw>api'], set: { jw: { state: 'hit' } } },
          { title: 'Signature + expiry + role', text: 'Signature sahi (token Auth ne hi banaya), expiry baaki, role "user" ko apne orders dekhne ki ijazat hai. 200 OK.', go: 'res:api>u', msg: '200 OK  [ {order 1042}, {order 1043} ]', set: { api: { state: 'ok' } } },
        ]},
        { name: 'Passkey login', steps: [
          { title: 'Challenge', text: 'Riya "Sign in with passkey" dabati hai. Auth service ek naya random challenge bhejti hai.', go: ['u>auth', 'res:auth>u'], msg: 'challenge: 7c91…e2, rpId: xyz.com' },
          { title: 'Fingerprint, phir sign', text: 'Fingerprint se phone ka taala khula. Phone xyz.com wali private key se challenge pe sign karta hai. Fingerprint aur private key phone se bahar nahi gaye.', focus: ['u'], set: { u: { state: 'ok', sub: 'sign kiya' } } },
          { title: 'Public key se verify', text: 'Signature server pe. Auth service DB se Riya ki passkey <strong>public key</strong> laati hai aur check karti hai. Sahi → JWT.', go: ['u>auth>db', 'res:db>auth>u'], msg: 'assertion: sig(private key, challenge + xyz.com)  →  OK, JWT issued', after: { u: { sub: 'logged in ✓' } } },
        ]},
        { name: 'Token badla (401)', steps: [
          { title: 'Riya ne role badla', text: 'Token mein <code>"role":"user"</code> ko <code>"admin"</code> kar diya. Signature wahi purana.', go: 'u>api', msg: 'payload: {"sub":"riya","role":"admin"}  signature: (purana)', set: { u: { state: 'warn', sub: 'token badla' } } },
          { title: 'Signature fail', text: 'Public key se check: naye payload ka hash purane signature se match nahi. Nayi signature banane ke liye Auth ki private key chahiye, jo Riya ke paas nahi.', go: 'bad:api>u', msg: '401 Unauthorized: invalid signature', set: { api: { state: 'warn', sub: 'signature ✗' } } },
        ]},
        { name: 'Ijazat nahi (403)', steps: [
          { title: 'Asli token, bada kaam', text: 'Token bilkul asli hai. Lekin Riya ek admin wala kaam maang rahi hai.', go: 'u>api', msg: 'DELETE /orders/all  (role: user)' },
          { title: 'Authorization fail', text: 'Pehchaan pakki (authentication pass), lekin role "user" ko ye permission nahi (authorization fail). 401 nahi, <strong>403 Forbidden</strong>.', go: 'bad:api>u', msg: '403 Forbidden: needs permission orders:delete_all', set: { api: { state: 'warn', sub: 'permission ✗' } } },
        ]},
      ],
    },

    { type: 'h3', text: 'Authorization: tum kya kar sakte ho' },
    { type: 'p', html: `Pehchaan pakki hone se kaam khatam nahi hota. Har request pe server poochta hai: <strong>"kya is user ko ye kaam karne ki ijazat hai?"</strong>` },
    { type: 'list', items: [
      `<strong>Roles aur permissions:</strong> Riya = <code>user</code> (apne orders dekho, apni profile badlo). Aman = <code>support</code> (kisi ka order dekho, refund nahi). Neha = <code>admin</code> (sab). Roles ke andar chhote permissions hote hain jaise <code>orders:read_own</code>, <code>orders:refund</code>. Isse <strong>RBAC</strong> kehte hain (detail <a href="#/auth-basics">AuthN, AuthZ</a> lesson mein).`,
      `<strong>Har request pe check:</strong> login ke time ek baar nahi. Kal Aman ka role hata to aaj se uski requests fail honi chahiye. Isliye JWT ki expiry chhoti rakhte hain, ya permissions server pe dobara dekhte hain.`,
      `<strong>Apna data hi:</strong> sirf role nahi, malik bhi check karo: <code>GET /orders/1043</code> tabhi jab order 1043 Riya ka ho. Ise bhoolna sabse common security bug hai (doosre ka data ID badal ke dikh jaana).`,
      `<strong>401 vs 403:</strong> 401 = "tum kaun ho, pata nahi" (token nahi ya galat). 403 = "pata hai tum kaun ho, lekin ijazat nahi".`,
    ]},
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "HTTPS hai aur login ho gaya, to sab safe"', html: `HTTPS ne sirf raasta safe kiya aur server ki pehchaan di. Login ne user ki pehchaan di. Lekin "Riya ko order 1044 (jo Aman ka hai) dekhne do?" ye sawaal na HTTPS ka hai na login ka: ye authorization hai, aur har API pe khud likhna padta hai. Teen alag parde hain: TLS (raasta), AuthN (kaun), AuthZ (kya).` },

    { type: 'h2', text: 'SSH aur mTLS: jab client ke paas bhi key pair ho' },
    { type: 'h3', text: 'SSH key login' },
    { type: 'p', html: `xyz.com ki developer Neha ko ek server pe login karna hai. Password ki jagah SSH key. Kiske paas kya hai, dhyaan se dekho, kyunki yahan <strong>dono taraf key pairs</strong> hain:` },
    { type: 'steps', items: [
      { t: 'Neha key banati hai (ek baar)', d: '<code>ssh-keygen -t ed25519</code>. Private key laptop pe <code>~/.ssh/id_ed25519</code> (kabhi share nahi), public key <code>~/.ssh/id_ed25519.pub</code>.' },
      { t: 'Public key server pe', d: 'Admin Neha ki public key server ki <code>~/.ssh/authorized_keys</code> file mein ek line ki tarah daal deta hai. Ye list hai: "in public keys walon ko andar aane do".' },
      { t: 'Server ki pehchaan pehle', d: 'Server ka bhi apna key pair hai (<strong>host key</strong>). Connect karte hi key exchange hota hai aur server host key se sign karta hai. Neha ka laptop <code>~/.ssh/known_hosts</code> mein dekhta hai ki ye wahi server hai. Pehli baar fingerprint dikhata hai aur poochta hai ("trust on first use"). Baad mein badla to bada warning.' },
      { t: 'Neha ka saboot', d: 'Key exchange ne is connection ka ek unique <strong>session identifier</strong> banaya hai. Laptop is session ID (aur request) pe Neha ki private key se sign karta hai. Ye session ID hi "challenge" ka kaam karta hai: har connection pe naya, isliye purana signature dobara nahi chalega.' },
      { t: 'Server verify karta hai', d: 'Server <code>authorized_keys</code> mein Neha ki public key dhoondhta hai aur signature check karta hai. Sahi → shell khul gaya. Private key kabhi network pe nahi gayi.' },
    ]},
    { type: 'h3', text: 'mTLS: service se service' },
    { type: 'callout', tone: 'term', title: 'Naya word: mTLS (mutual TLS)', html: `<strong>Ye kya hai:</strong> TLS jisme <strong>dono</strong> taraf certificate dikhate hain. Server bolta hai "certificate dikhao" (CertificateRequest), aur client apna certificate + apni private key se CertificateVerify bhejta hai.<br><strong>Kyun chahiye:</strong> xyz.com ke andar Payments service ko pakka pata hona chahiye ki call sach mein Orders service ne ki, koi ghus-paithiya program nahi. "Andar ka network safe hai" maan lena purani soch hai.<br><strong>Iske bina:</strong> andar ghusa ek attacker (ya bug wala pod) kisi bhi service ko call kar sakta.<br><strong>Example:</strong> services ke certificates ek <strong>internal CA</strong> deta hai (company ka apna, browsers ke trust store mein nahi). Service mesh (Istio, Linkerd) ye certificates har kuch ghanton/dinon mein apne aap badalte rehte hain.` },
    { type: 'flow', height: 320, title: 'SSH key login aur mTLS',
      nodes: [
        { id: 'lap', label: 'Neha ka laptop', sub: 'id_ed25519 (private)', x: 95, y: 80, w: 160, kind: 'client', info: 'Ye kya hai: developer ka laptop. Private key ~/.ssh/id_ed25519 mein (passphrase se band). known_hosts mein servers ki host public keys.' },
        { id: 'ssh', label: 'App server', sub: 'sshd, authorized_keys', x: 365, y: 80, w: 170, kind: 'server', info: 'Ye kya hai: xyz.com ka ek server jispe SSH daemon (sshd) chalta hai. authorized_keys mein allowed public keys. Iska apna host key pair bhi hai jisse ye apni pehchaan deta hai.' },
        { id: 'ica', label: 'Internal CA', sub: 'service certs', x: 625, y: 80, w: 150, kind: 'edge', info: 'Ye kya hai: xyz.com ka apna CA, sirf andar ki services ke liye. Har service ko chhote lifetime ka certificate deta hai. Har service iska root certificate trust karti hai.' },
        { id: 'ord', label: 'Orders service', sub: 'cert + private key', x: 95, y: 240, w: 160, kind: 'server', info: 'Ye kya hai: client service. Iske paas internal CA ka diya certificate ("main orders hoon") aur uski private key hai.' },
        { id: 'pay', label: 'Payments', sub: 'sirf orders allowed', x: 365, y: 240, w: 170, kind: 'server', info: 'Ye kya hai: server service. Har aane wale se certificate maangti hai, internal CA se check karti hai, phir naam dekh ke faisla: sirf Orders service call kar sakti hai (authorization).' },
        { id: 'rg', label: 'Anjaan pod', sub: 'koi cert nahi', x: 625, y: 240, w: 150, kind: 'threat', hidden: true, info: 'Ye kya hai: cluster mein ghusa ek anjaan program (hack hua container ya galat deploy). Iske paas internal CA ka certificate nahi.' },
      ],
      edges: [{ a: 'lap', b: 'ssh' }, { a: 'ord', b: 'pay' }, { a: 'ica', b: 'ord', dashed: true }, { a: 'ica', b: 'pay', dashed: true }, { a: 'rg', b: 'pay', hidden: true }],
      scenarios: [
        { name: 'SSH key login', steps: [
          { title: 'Key exchange + host key', text: 'Laptop aur server ECDH se session key banate hain. Server host key se sign karta hai. Laptop known_hosts se milata hai: wahi server.', go: ['lap>ssh', 'res:ssh>lap'], msg: 'host key ED25519 SHA256:q3Lx…  (known_hosts mein match ✓)' },
          { title: 'Session ID pe signature', text: 'Laptop bolta hai "main Neha, ye meri public key", aur session ID pe private key se signature bhejta hai.', go: 'lap>ssh', msg: 'userauth publickey: ssh-ed25519 AAAAC3Nz…  sig(session_id)' },
          { title: 'authorized_keys check', text: 'Server ko key list mein mili, signature sahi. Shell khul gaya.', go: 'res:ssh>lap', msg: 'Welcome to app-server-7', after: { ssh: { state: 'ok' }, lap: { state: 'ok', sub: 'logged in ✓' } } },
        ]},
        { name: 'SSH: anjaan key', steps: [
          { title: 'Nayi laptop, nayi key', text: 'Neha ne naya laptop liya aur nayi key banayi, lekin uski public key abhi server pe nahi daali.', go: 'lap>ssh', msg: 'userauth publickey: ssh-ed25519 AAAAC3Nz…(nayi)' },
          { title: 'Reject', text: 'Server ko ye public key authorized_keys mein nahi mili. Signature sahi hai to bhi kya: ye key "allowed" list mein hi nahi.', go: 'bad:ssh>lap', msg: 'Permission denied (publickey).', set: { lap: { state: 'warn', sub: 'key allowed nahi' } } },
        ]},
        { name: 'SSH: host key badli', steps: [
          { title: 'Server ka jawab alag', text: 'Neha same server address pe connect karti hai, lekin jo host key aayi wo known_hosts wali se alag hai. Ya to server dobara install hua, ya koi beech mein hai.', go: ['lap>ssh', 'res:ssh>lap'], set: { ssh: { state: 'warn', sub: 'host key alag!' } } },
          { title: 'Ruk jao', text: 'SSH bada warning dikha ke connection rok deta hai. Sahi tareeka: admin se naya fingerprint confirm karo, tab known_hosts update karo. Aankh band karke "yes" mat dabao.', focus: ['lap'], msg: 'WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!', set: { lap: { state: 'warn', sub: 'connection roka' } } },
        ]},
        { name: 'mTLS: Orders → Payments', steps: [
          { title: 'Certificates pehle se', text: 'Internal CA ne dono services ko certificates diye hain (aur kuch ghante/din mein naye deta rehta hai).', go: ['ica>ord', 'ica>pay'], parallel: true },
          { title: 'Dono taraf certificate', text: 'Payments apna certificate bhejta hai aur Orders se bhi maangta hai. Orders apna certificate + CertificateVerify (apni private key se) bhejta hai.', go: ['ord>pay', 'res:pay>ord'], msg: 'client cert: spiffe://xyz.com/orders  (issuer: Internal CA)' },
          { title: 'Pehchaan + ijazat', text: 'Payments check karta hai: internal CA ka sign ✓, private key ka saboot ✓, naam "orders" allowed list mein ✓. Request chalti hai.', go: ['ord>pay', 'res:pay>ord'], msg: 'POST /charge  →  200 OK', after: { pay: { state: 'ok' }, ord: { state: 'ok' } } },
        ]},
        { name: 'mTLS: anjaan pod', steps: [
          { title: 'Bina certificate call', text: 'Ek anjaan pod Payments ko call karta hai. Uske paas internal CA ka certificate nahi.', show: ['rg', 'rg-pay'], go: 'rg>pay', msg: 'POST /charge  (koi client certificate nahi)', set: { rg: { state: 'hot' } } },
          { title: 'Handshake hi fail', text: 'Payments ne certificate maanga, mila nahi (ya kisi anjaan CA ka mila). TLS handshake wahin toot gaya. Request Payments ke code tak pahunchi hi nahi.', go: 'bad:pay>rg', msg: 'TLS alert: certificate_required', after: { rg: { state: 'down', sub: 'reject' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Keys ko sambhalna: storage, rotation, aur leak' },
    { type: 'p', html: `Poori security ek hi cheez pe tiki hai: <strong>private key private rahe</strong>. Maths lagbhag kabhi nahi tootta; log keys ko galat jagah rakh ke haar jaate hain (GitHub pe commit, purana backup, laptop chori).` },
    { type: 'table', head: ['Kahan rakhein', 'Kya hai', 'Kab theek'], rows: [
      ['File, sahi permissions', 'Key file sirf owner padh sake (<code>chmod 600</code>), SSH key pe passphrase', 'Developer laptop, chhote setups'],
      ['Secrets manager', 'Ek service jo secrets encrypt karke rakhti hai aur sirf allowed apps ko deti hai (AWS Secrets Manager, HashiCorp Vault)', 'App ke DB passwords, API keys, TLS keys'],
      ['KMS', 'Cloud ki key service. Key KMS ke andar rehti hai; tum "is data ko sign/encrypt karo" bolte ho, key kabhi bahar nahi aati', 'JWT signing, data encryption keys'],
      ['HSM', 'Hardware Security Module: ek tamper-resistant hardware box jisme key banti hai aur kabhi bahar nahi nikal sakti', 'CA root keys, bank/UPI keys, payment systems'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: HSM aur KMS (ek line mein)', html: `<strong>HSM</strong> = ek special tijori jaisa hardware jiske andar private key banti aur rehti hai; sign/decrypt bhi andar hi hota hai, aur kholne ki koshish pe key mit jaati hai. <strong>KMS</strong> = cloud company ki service jo andar HSMs use karke tumhe ye suvidha ek API se deti hai. <strong>Kyun:</strong> server hack ho tab bhi attacker key copy nahi kar sakta (sirf jab tak andar hai tab tak use kar sakta hai). <strong>Iske bina:</strong> key ek file hai, aur file copy ho jaati hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: key rotation', html: `<strong>Ye kya hai:</strong> purani key ko planned tareeke se nayi key se badalna, leak hone se <em>pehle</em>.<br><strong>Kyun chahiye:</strong> jitni lambi ek key chalti hai, utna zyada data uspe tika hai aur utne zyada mauke leak ke. NIST har key ki ek "cryptoperiod" (umar) tay karne ko kehta hai.<br><strong>Iske bina:</strong> 5 saal purani key, jise 30 log chhoo chuke hain, aur leak hone pe use badalna kisi ko aata hi nahi.<br><strong>Example:</strong> TLS certificates ab automatic renew hote hain (ACME). JWT ke liye Auth service nayi key banati hai, JWKS mein <em>dono</em> (purani + nayi) public keys rakhti hai, naye tokens nayi key se sign karti hai, aur purane tokens expire hone ke baad purani public key hata deti hai. Har key ka ek <code>kid</code> (key ID) hota hai taaki service jaane kaunsi key se check kare.` },
    { type: 'p', html: `<strong>Private key leak ho gayi. Ab kya?</strong> (xyz.com ka playbook)` },
    { type: 'steps', items: [
      { t: 'Nayi key banao', d: 'Purani key ko "dobara use" nahi karna. Naya key pair, sahi jagah (KMS/HSM) mein.' },
      { t: 'Naya certificate lo', d: 'Nayi public key ke liye CA se naya certificate. Load balancers pe deploy.' },
      { t: 'Purana revoke karo', d: 'CA ko bolo purana certificate revoke kare. Browsers ki revocation lists mein aane mein kuch ghante/din lag sakte hain. Let\'s Encrypt ne 2025 mein OCSP band karke sirf CRLs rakhe, aur certificates ki umar chhoti hoti ja rahi hai: ek wajah yahi hai ki revocation pe poora bharosa nahi kiya ja sakta.' },
      { t: 'JWT signing key leak?', d: 'JWKS se purani public key turant hatao. Uske saare tokens fail honge, users ko dobara login karna padega. Ye dard theek hai: warna attacker kisi ka bhi token bana sakta tha.' },
      { t: 'SSH key leak?', d: 'Har server ki authorized_keys se wo public key hatao. Bade setups SSH certificates ya central access tools use karte hain taaki ye ek jagah se ho.' },
      { t: 'Kya khula, ye socho', d: 'ECDHE ki wajah se purane TLS sessions safe (forward secrecy). Lekin jo data <em>us</em> key se seedha encrypt hua tha (jaise backups), wo khatre mein. Logs dekho, kis ne kab key use ki.' },
    ]},
    { type: 'callout', tone: 'tip', title: 'Aage ki duniya: quantum computers', html: `Ek bada quantum computer, agar bana, to RSA aur elliptic curve wale maths (factoring, discrete log) tod sakta hai. Isliye NIST ne 2024 mein naye "post-quantum" standards nikaale (jaise key exchange ke liye <strong>ML-KEM</strong>, FIPS 203). Chrome jaise browsers TLS mein abhi se X25519 + ML-KEM ko saath mila ke (hybrid) use karte hain, taaki aaj record kiya traffic kal bhi safe rahe. AES jaise symmetric algorithms pe asar kam hai: badi key (256 bit) kaafi maani jaati hai.` },
    { type: 'callout', tone: 'why', title: 'Decide: kaunsi key, kahan', html: `• <strong>Browser → xyz.com website:</strong> HTTPS (TLS 1.3, ECDHE). Server ke paas certificate + private key (LB pe, KMS/HSM mein ho sake to). Certificate auto-renew (ACME).<br>• <strong>User login:</strong> passkeys pehli pasand (phishing-proof). Password ho to hash + MFA. Login ke baad session cookie (ek app) ya JWT (kai services).<br>• <strong>JWT kai services check karein:</strong> RS256/ES256 (private key sirf Auth service pe, public JWKS se). Sirf ek service ho to HS256 bhi chalega.<br>• <strong>Service se service (andar):</strong> mTLS, internal CA, chhote certificates (service mesh).<br>• <strong>Developers ka server login:</strong> SSH Ed25519 keys (passphrase ke saath), password login band. Bade setup mein SSH certificates / central access.<br>• <strong>Sirf bhejne aur paane wala padh sake (server bhi nahi):</strong> end-to-end encryption, keys users ke devices pe (WhatsApp jaisa).<br>• <strong>Bahut keemti keys (CA root, payments):</strong> HSM.` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'Keys aur pehchaan: xyz.com ki poori picture', height: 530,
      groups: [
        { label: 'Internet', x: 20, y: 8, w: 680, h: 96 },
        { label: 'xyz.com data center', x: 20, y: 140, w: 680, h: 372 },
      ],
      nodes: [
        { id: 'u', label: 'Riya ka browser', sub: 'trust store', x: 130, y: 55, w: 150, kind: 'client', info: 'Ye kya hai: user ka browser. Iske paas apna key pair nahi, sirf trust store (root CAs ki public keys). Har connection pe temporary ECDHE secret. Passkey ho to uski private key phone ke secure chip mein.' },
        { id: 'ca', label: 'Public CA', sub: 'Let\'s Encrypt etc.', x: 360, y: 55, w: 150, kind: 'edge', info: 'Ye kya hai: bahar ki Certificate Authority. Domain check karke xyz.com ke certificate pe sign karti hai, aur leak hone pe revoke karti hai. Iske roots browsers ke trust store mein hain.' },
        { id: 'lap', label: 'Neha ka laptop', sub: 'SSH private key', x: 590, y: 55, w: 150, kind: 'client', info: 'Ye kya hai: developer ka laptop. ~/.ssh/id_ed25519 private key yahin, aur known_hosts mein servers ki host keys.' },
        { id: 'lb', label: 'Load Balancer', sub: 'TLS cert + key', x: 130, y: 190, w: 150, kind: 'edge', info: 'Ye kya hai: xyz.com ka darwaza. TLS handshake yahin khatam hota hai (TLS termination). Certificate yahan, aur uski private key yahan ya KMS/HSM mein.' },
        { id: 'kms', label: 'KMS / HSM', sub: 'private keys', x: 360, y: 190, w: 150, kind: 'data', info: 'Ye kya hai: keys ki tijori. TLS key, JWT signing key jaisi private keys andar rehti hain; services sirf "sign karo" bolti hain, key bahar nahi aati. Auth service bhi JWT yahin se sign karwa sakti hai.' },
        { id: 'ssh', label: 'App server', sub: 'sshd, authorized_keys', x: 590, y: 190, w: 170, kind: 'server', info: 'Ye kya hai: ek server jispe developers SSH se aate hain. authorized_keys mein allowed public keys, aur apna host key pair.' },
        { id: 'auth', label: 'Auth service', sub: 'login, JWT sign', x: 130, y: 325, w: 150, kind: 'server', info: 'Ye kya hai: login wali service. Password hash ya passkey signature check karti hai, phir private key se JWT sign karti hai. Public keys JWKS pe.' },
        { id: 'ord', label: 'Orders service', sub: 'JWT verify, role', x: 360, y: 325, w: 150, kind: 'server', info: 'Ye kya hai: API service. Har request pe JWT ka signature public key se check (AuthN), phir role/owner check (AuthZ). Payments ko mTLS se call karti hai.' },
        { id: 'pay', label: 'Payments', sub: 'mTLS: sirf orders', x: 600, y: 325, w: 150, kind: 'server', info: 'Ye kya hai: payments service. Har caller se internal CA ka certificate maangti hai, aur sirf allowed services ko andar aane deti hai.' },
        { id: 'db', label: 'Users DB', sub: 'hash, passkey pubkeys', x: 130, y: 460, w: 170, kind: 'data', info: 'Ye kya hai: users ki table: password hashes aur passkeys ki public keys. Koi private key nahi, isliye leak pe bhi login secrets nahi khulte.' },
        { id: 'ica', label: 'Internal CA', sub: 'service certs', x: 475, y: 460, w: 150, kind: 'edge', info: 'Ye kya hai: company ka apna CA. Andar ki services ko chhote lifetime ke certificates deta hai (aksar service mesh ke through). Browsers isse trust nahi karte, sirf xyz.com ki services.' },
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
        { name: 'HTTPS handshake', text: 'Browser LB se ECDHE karta hai. LB CA ka diya certificate bhejta hai aur KMS/HSM wali private key se handshake pe sign karta hai. Browser chain ko trust store tak check karta hai.', go: ['u>lb', 'ca>lb', 'kms>lb'] },
        { name: 'User login', text: 'Encrypted tunnel ke andar password (ya passkey signature). Auth service DB ke hash / public key se milati hai aur signed JWT deti hai.', go: ['u>lb>auth>db'] },
        { name: 'JWT API call', text: 'Browser JWT ke saath Orders ko call karta hai. Orders Auth ki public key (JWKS) se signature check karti hai, phir role.', go: ['u>lb>ord', 'auth>ord'] },
        { name: 'mTLS between services', text: 'Internal CA ne dono ko certificates diye. Orders aur Payments dono taraf certificate dikhate hain.', go: ['ord>pay', 'ica>ord', 'ica>pay'] },
        { name: 'SSH key login', text: 'Laptop server ki host key known_hosts se milata hai, phir session ID pe apni private key se sign karta hai. Server authorized_keys se check karta hai.', go: ['lap>ssh'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Symmetric (AES) = ek chaabi, bahut tez, lekin pahunchaana mushkil. Asymmetric = public key (taala, sabko) + private key (chaabi, kabhi share nahi).</li>
      <li>Jisko pehchaan saabit karni hai, private key uske paas. Normal HTTPS mein sirf server ke paas; browser ke paas koi key pair nahi. mTLS, SSH, passkeys mein client ke paas bhi.</li>
      <li>Do kaam: public se encrypt → private se khule. Private se sign → public se koi bhi check kare. Hash = bina key ka fingerprint.</li>
      <li>Diffie-Hellman (aaj ECDHE): sirf mix bhejo, dono same secret banao. Ephemeral keys = forward secrecy. Phir asli data AES se.</li>
      <li>DH akela man-in-the-middle nahi rokta. Certificate (CA ka signature) + server ka handshake signature batata hai ki saamne asli xyz.com hai.</li>
      <li>Browser check: chain trust store tak, domain, date, revocation, aur private key ka saboot (CertificateVerify).</li>
      <li>TLS ke baad: AuthN (password → session/JWT, passkey, client cert, SSH key) phir har request pe AuthZ (roles, owner). 401 ≠ 403.</li>
      <li>Keys KMS/HSM mein, rotation automatic. Leak pe: nayi key, naya cert, purana revoke.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: [
        'Bina pehle mile do anjaan log ek secret bana lete hain (key exchange)',
        'Public key sabko de sakte ho: key distribution problem khatam',
        'Signatures se pehchaan aur "badla nahi gaya" ki guarantee, bina secret baante',
        'Forward secrecy: aaj ki key leak se kal ki recordings nahi khulti',
        'Passkeys aur public-key login se server pe chori layak secret hi nahi rehta',
      ],
      costs: [
        'Asymmetric maths slow hai: har naye connection pe handshake ka CPU aur ek round trip',
        'Poora bharosa CAs aur trust store pe tika hai; galat root install = sab khula',
        'Certificates expire hote hain: renewal automation chahiye, warna poori site band',
        'Revocation dheema aur adhoora hai; leak ke baad kuch ghante/din ka khatra',
        'Keys sambhalna (KMS/HSM, rotation, access) ek alag kaam aur kharcha hai',
      ] },
    { type: 'think', questions: [
      { q: 'Riya ka browser xyz.com ke saath HTTPS kar raha hai. Kya xyz.com ko TLS handshake se pata chal gaya ki ye Riya hai?', a: 'Nahi. Normal HTTPS sirf server ki pehchaan deta hai. Browser ke paas koi certificate ya key pair nahi. Riya ki pehchaan TLS ke andar password/passkey se hoti hai, uske baad session cookie ya JWT se. Sirf mTLS mein client bhi TLS ke andar certificate dikhata hai.' },
      { q: 'Eve ne xyz.com ka asli certificate copy kar liya (wo to public hai). Kya wo ab xyz.com ban sakti hai?', a: 'Nahi. Handshake mein server ko CertificateVerify bhejna padta hai: poore handshake pe certificate wali public key ki private key se signature. Eve ke paas private key nahi, to wo sahi signature nahi bana sakti. Certificate copy karna bekaar hai; private key chori hi asli khatra hai.' },
      { q: 'xyz.com ki private key aaj leak hui. Eve ke paas pichhle saal ka recorded TLS 1.3 traffic hai. Kya wo padh sakti hai?', a: 'Nahi, forward secrecy ki wajah se. TLS 1.3 mein har connection ki key ECDHE ke temporary secrets se bani thi, jo connection ke baad mit gaye. Private key sirf sign karti thi. Purane TLS 1.2 "RSA key transport" mein session key private key se khulti thi, wahan sab khul jaata.' },
      { q: 'Tumhare 20 microservices JWT check karte hain. HS256 (ek shared secret) ya RS256 (key pair)? Kyun?', a: 'RS256/ES256. HS256 mein check karne wale ko bhi wahi secret chahiye, jisse wo token bana bhi sakta hai: 20 jagah secret = 20 jagah leak ka khatra, aur koi bhi service nakli admin token bana sakti hai. RS256 mein private key sirf Auth service pe, baaki sab public key (JWKS) se sirf check kar sakte hain.' },
      { q: 'SSH karte waqt "REMOTE HOST IDENTIFICATION HAS CHANGED" aaya. Kya karoge?', a: 'Ruko. Matlab server ki host key known_hosts wali se alag hai: ya server reinstall hua, ya koi beech mein hai. Admin se doosre raaste (chat, ticket) se naya fingerprint confirm karo, tabhi known_hosts update karo. Bina soche purani line delete karna man-in-the-middle ko darwaza kholna hai.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Normal HTTPS mein private key kiske paas hoti hai?', options: ['Browser aur server dono ke paas', 'Sirf server (ya uske load balancer) ke paas', 'CA ke paas, wo har request pe deti hai'], answer: 1, explain: 'Server ki private key sirf uski machine pe. Public key certificate mein sabko jaati hai. Browser ke paas koi key pair nahi, sirf trust store.' },
      { q: 'p = 3, q = 11, e = 3 (toh d = 7). Message 4 ka signature kya hoga?', options: ['31', '16', '4'], answer: 1, explain: 's = 4⁷ mod 33 = 16384 mod 33 = 16. Verify: 16³ mod 33 = 4 = message. (31 to encryption tha: 4³ mod 33.)' },
      { q: 'Diffie-Hellman (p = 23, g = 5) mein Eve ko A = 8 aur B = 19 dikhte hain. Shared key kya hai, aur Eve use kyun nahi bana sakti?', options: ['2; uske paas a ya b nahi, aur bade numbers pe unhe nikaalna practically impossible', '8 × 19 = 152; Eve ko multiply karna nahi aata', '27; Eve ke paas p nahi'], answer: 0, explain: '19⁶ mod 23 = 8¹⁵ mod 23 = 2. K banane ke liye a ya b chahiye. Chhote p pe brute force ho jaata hai (widget mein dekha), asli 2048-bit ya X25519 pe nahi.' },
      { q: 'Forward secrecy kis cheez se milti hai?', options: ['Badi RSA key se', 'Har connection pe naye, temporary (ephemeral) DH secrets se', 'Certificate ki chhoti expiry se'], answer: 1, explain: 'ECDHE ke secrets connection ke baad mit jaate hain. Server ki long-term private key se purani session keys nikal hi nahi sakti.' },
      { q: 'Valid token, lekin user ka role is kaam ki ijazat nahi deta. Sahi response?', options: ['401 Unauthorized', '403 Forbidden', '200 OK'], answer: 1, explain: 'Pehchaan pakki hai (AuthN pass), ijazat nahi (AuthZ fail) → 403. 401 tab jab token hi nahi ya galat.' },
      { q: 'SSH key login mein server pe kya store hota hai?', options: ['User ki private key', 'User ki public key (authorized_keys mein)', 'User ka password'], answer: 1, explain: 'Server sirf public key rakhta hai. User session ID pe private key se sign karta hai, server public key se check karta hai. Private key laptop se kabhi bahar nahi jaati.' },
      { q: 'Passkey phishing site pe kyun kaam nahi karti?', options: ['Kyunki fingerprint server pe jaata hai', 'Kyunki passkey ek domain (xyz.com) se bandhi hai, aur browser doosre domain ko wo key use nahi karne deta', 'Kyunki passkey ka password lamba hota hai'], answer: 1, explain: 'Key pair sirf xyz.com ke liye bana tha. xyz-login.com pe browser use offer hi nahi karta, aur signature mein origin bhi shaamil hai.' },
    ]},
    { type: 'sources', items: [
      { title: 'RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3 (2018)', publisher: 'IETF', official: true, year: 2018, url: 'https://www.rfc-editor.org/rfc/rfc8446', used: 'ClientHello/ServerHello key shares, Certificate, CertificateVerify (handshake pe signature), mTLS ke liye CertificateRequest, static RSA key transport hataana aur forward secrecy, HKDF se keys, certificate_required alert.' },
      { title: 'RFC 7748: Elliptic Curves for Security (2016)', publisher: 'IETF', official: true, year: 2016, url: 'https://www.rfc-editor.org/rfc/rfc7748', used: 'X25519 / X448 key exchange, lagbhag 128-bit security level.' },
      { title: 'RFC 2631: Diffie-Hellman Key Agreement Method (1999)', publisher: 'IETF', official: true, year: 1999, url: 'https://www.rfc-editor.org/rfc/rfc2631', used: 'Classic DH: g^x mod p, dono taraf same shared secret.' },
      { title: 'RFC 4252: The Secure Shell (SSH) Authentication Protocol (2006)', publisher: 'IETF', official: true, year: 2006, url: 'https://www.rfc-editor.org/rfc/rfc4252', used: 'Public key authentication: signature mein session identifier shaamil hota hai.' },
      { title: 'sshd(8) manual: AUTHORIZED_KEYS and SSH_KNOWN_HOSTS file formats', publisher: 'OpenBSD / OpenSSH', official: true, url: 'https://man.openbsd.org/sshd.8', used: 'authorized_keys mein allowed public keys, known_hosts mein host keys.' },
      { title: 'OpenSSH 9.5 release notes (2023)', publisher: 'OpenSSH', official: true, year: 2023, url: 'https://www.openssh.com/releasenotes.html', used: 'ssh-keygen ab by default Ed25519 key banata hai.' },
      { title: 'Web Authentication: An API for accessing Public Key Credentials, Level 3', publisher: 'W3C', official: true, url: 'https://www.w3.org/TR/webauthn-3/', used: 'Passkey registration/login: device pe key pair, server pe public key, challenge pe signature, credential ka relying party (domain) se bandhna.' },
      { title: 'NIST SP 800-57 Part 1 Rev. 5: Recommendation for Key Management (2020)', publisher: 'NIST', official: true, year: 2020, url: 'https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final', used: 'Security strength: RSA 2048 ≈ 112 bit, RSA 3072 / 256-bit ECC ≈ 128 bit; cryptoperiod aur key lifecycle.' },
      { title: 'FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard (2024)', publisher: 'NIST', official: true, year: 2024, url: 'https://csrc.nist.gov/pubs/fips/203/final', used: 'ML-KEM post-quantum key exchange standard.' },
      { title: 'Key Management Cheat Sheet', publisher: 'OWASP', official: true, url: 'https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html', used: 'Keys ki storage (HSM/KMS), rotation, compromise hone pe kya karna.' },
      { title: 'Ending OCSP Support in 2025 (2024)', publisher: 'Let\'s Encrypt', official: true, year: 2024, url: 'https://letsencrypt.org/2024/12/05/ending-ocsp/', used: 'OCSP band, sirf CRLs se revocation (2025 timeline).' },
      { title: 'WhatsApp Encryption Overview, technical white paper (v9, 2026)', publisher: 'WhatsApp / Meta', official: true, year: 2026, url: 'https://www.whatsapp.com/security/WhatsApp-Security-Whitepaper.pdf', used: 'Install pe Curve25519 identity key pair, sirf public keys server pe; server pe private authentication secrets nahi.' },
      { title: 'NPCI UPI Common Library specification (community-written)', publisher: 'librefin-in on GitHub (unofficial)', url: 'https://github.com/librefin-in/cl-specification', used: 'UPI PIN NPCI ki Common Library ke andar daala jaata hai aur NPCI ki RSA public key se encrypt hota hai. Unofficial source, isliye sirf high-level baat li.' },
    ]},
  ],
});
