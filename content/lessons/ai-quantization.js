/*
  ai-quantization. Numbers verified in scratchpad/a3/quant_math.js, fl.js (generic float encoder, checked against Float32Array):
  fp16: max 65504, 0.1 -> 0.0999755859375, 1.001 -> 1.0009765625, 70000 -> Infinity
  bf16: max ~3.39e38, 0.1 -> 0.10009765625, 1.001 -> 1, 70000 -> 70144, spacing at 1 = 0.0078125
  E4M3: max 448, 0.1 -> 0.1015625 ; E5M2: max 57344, 0.1 -> 0.09375
  w = [0.42,-1.27,0.03,0.88,-0.35,2.10,-0.61,0.15]
  sym int8: s = 0.016535, q = 25,-77,2,53,-21,127,-37,9, MSE 0.000011
  sym int4: s = 0.3, q = 1,-4,0,3,-1,7,-2,1, deq 0.3,-1.2,0,0.9,-0.3,2.1,-0.6,0.3, MSE 0.005713, max 0.15
  sym 2-bit: s = 2.1, q = 0,-1,0,0,0,1,0,0, MSE 0.269713
  asym 4-bit: s = 0.224667, zp = 6, q = 8,0,6,10,4,15,3,7, MSE 0.004227
  outlier (w[5] = 25) int4 per-tensor MSE 0.385212 ; group of 4 MSE 0.06525
*/
Lesson.register({
  id: 'ai-quantization',
  title: 'Precision aur quantization (32, 16, 8, 4, 2 bit)',
  minutes: 32,
  summary: `Model ke arabon weights har ek kitni bits mein store hon: 32, 16, 8, 4 ya 2? Kam bits = kam memory aur zyada speed, lekin thodi galti. Is lesson mein float ke bits (sign, exponent, mantissa) khud toggle karoge, quantize/dequantize ka maths scale aur zero-point ke saath haath se karoge, aur calculate karoge ki 7B ya 70B model kis GPU pe fit hoga.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Ek LLM bas arabon numbers ka dher hai. Har number computer memory mein kuch "bits" (0 ya 1) mein rakha jaata hai.<br>Jitni zyada bits, utna sahi number, lekin utni zyada memory. 70B model 16-bit mein 140 GB: ek GPU mein nahi aata.<br>Quantization = har number ko kam bits mein "gol" (round) karke rakhna, jaise 3.14159 ko 3.1 likhna. Memory 4 guna tak kam, model tez, aur thodi si galti.<br>Is lesson mein tum bits khud flip karoge, rounding ka maths haath se karoge, aur dekhoge ki galti kab chhoti rehti hai aur kab model tod deti hai.` },
    { type: 'h2', text: 'Problem: 70B model, 140 GB, ek GPU' },
    { type: 'p', html: `xyz Assistant ab apne servers pe open-weights model chalana chahta hai (data bahar na jaaye, aur API bill kam ho). Team ke paas 24 GB wale GPUs hain. Model ki memory ka simple formula:` },
    { type: 'callout', tone: 'term', title: 'Naya word: bit aur byte', html: `<strong>Ye kya hai:</strong> <strong>bit</strong> = memory ka sabse chhota hissa, sirf 0 ya 1. <strong>Byte</strong> = 8 bits. n bits mein 2ⁿ alag patterns ban sakte hain. 2 bits: 00, 01, 10, 11 = 4 patterns. 4 bits = 16 patterns. 8 bits = 256.<br><strong>Example:</strong> 4 bits <code>0101</code> = 0×8 + 1×4 + 0×2 + 1×1 = <strong>5</strong>.<br><strong>Kyun chahiye:</strong> model ka har weight kuch bits mein rakha jaata hai. "16-bit model" = har weight 16 bits = 2 bytes. Bits kam = memory kam.<br><strong>Iske bina:</strong> "4-bit", "bf16", "int8" jaise naam bas jaadu lagenge. Ye sab bas ye batate hain ki ek number ke liye kitne bits aur unka matlab kya.` },
    { type: 'code', text: `memory (bytes) = parameters × bytes per parameter

7B  model, 16-bit (2 bytes):   7 × 10⁹ × 2 = 14 GB      → 24 GB GPU mein fit
70B model, 16-bit (2 bytes):  70 × 10⁹ × 2 = 140 GB     → 2 × 80 GB GPU bhi kam
70B model,  4-bit (0.5 byte): 70 × 10⁹ × 0.5 = 35 GB    → ek 48 GB GPU mein fit` },
    { type: 'p', html: `Aur sirf memory nahi. Jab LLM ek-ek token generate karta hai, har token ke liye poore weights GPU memory se padhne padte hain. Isliye chhote batch pe speed aksar <em>memory bandwidth</em> se limited hoti hai: weights aadhe bytes ke, to har token lagbhag do guna jaldi (upper bound). Kam bits = kam memory + zyada tokens/sec. Keemat: thodi accuracy. Ye trade-off hi <strong>quantization</strong> hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: precision', html: `<strong>Ye kya hai:</strong> ek number kitni bariki se store hota hai. Zyada bits = zyada bariki. Jaise π ko 3.14159265 likhna (high precision) vs 3.1 likhna (low precision).<br><strong>Kyun chahiye:</strong> har format (32, 16, 8, 4 bit) ki precision alag hai. Ye samjhe bina tum nahi bata paoge ki kitni galti aayegi.<br><strong>Iske bina:</strong> "kam bits = sasta" dikhega, lekin ye nahi ki kitni quality jaayegi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: quantization aur dequantization', html: `<strong>Ye kya hai:</strong> <strong>Quantization</strong> = high-precision numbers (jaise 16-bit) ko kam bits (8, 4, 2) mein map karna. Jaise ek smooth slider ko sirf kuch fixed steps wala bana dena: har value sabse paas wale step pe chali jaati hai. <strong>Dequantization</strong> = us step se wapas lagbhag original number banana.<br><strong>Kyun chahiye:</strong> 70B model ko 140 GB se 35 GB tak laana, taaki ek GPU pe chale aur tez chale.<br><strong>Iske bina:</strong> bade models sirf mehnge multi-GPU servers pe. Laptop pe local model ka sapna bhi nahi.<br><strong>Example:</strong> steps 0.3 ke hon (0, 0.3, 0.6, 0.9...) to 0.88 → 0.9 pe store. Galti 0.02.` },
    { type: 'callout', tone: 'term', title: 'Naya word: memory bandwidth', html: `<strong>Ye kya hai:</strong> GPU har second apni memory se kitne GB padh sakta hai. Jaise ek gaming GPU ~1,000 GB/s.<br><strong>Kyun chahiye:</strong> har naye token ke liye poore weights padhne padte hain. 14 GB weights aur 1,000 GB/s → ek token mein kam se kam 14 ms, yaani max ~71 tokens/sec.<br><strong>Iske bina (samjhe bina):</strong> lagega GPU ki calculation speed hi sab kuch hai, jabki chhote batch pe asli rok memory se padhne ki hai. Isliye 4-bit weights = 4 guna kam padhna = tez jawab.` },
    { type: 'h2', text: 'Bits se numbers: integers' },
    { type: 'p', html: `n bits mein 2ⁿ alag patterns ho sakte hain. Integers (poore numbers, bina decimal) mein har pattern ek poora number hai. "Signed" = negative numbers bhi, isliye aadhe patterns negative ke liye:` },
    { type: 'table', head: ['Format', 'Bits', 'Kitne values', 'Range (signed)'], rows: [
      ['int8', '8', '256', '-128 se 127'],
      ['int4', '4', '16', '-8 se 7'],
      ['int2 / 2-bit', '2', '4', '-2 se 1 (ya 4 custom levels)'],
      ['Ternary ("1.58-bit")', '~1.58', '3', '-1, 0, +1 (log₂3 ≈ 1.58 bits)'],
    ]},
    { type: 'p', html: `Problem: weights jaise 0.42 ya -1.27 integers nahi hain. Integer mein store karne ke liye ek <strong>scale</strong> chahiye (neeche maths hai). Pehle dekhte hain floats kaise bante hain, kyunki training aur 16-bit models floats use karte hain.` },
    { type: 'h2', text: 'Floats andar se: sign, exponent, mantissa' },
    { type: 'callout', tone: 'term', title: 'Naya word: float (floating-point number)', html: `<strong>Ye kya hai:</strong> decimal wale numbers (0.42, -1.27, 70000) ko bits mein rakhne ka tareeka. "Floating" isliye ki decimal point khisak sakta hai: ek hi format mein 0.000001 bhi aur 1,000,000 bhi.<br><strong>Kyun chahiye:</strong> weights, gradients aur activations sab decimal numbers hain, aur unka size bahut alag alag hota hai.<br><strong>Iske bina:</strong> sirf integers hote to 0.42 jaisa weight store hi nahi hota, ya ek fixed decimal jagah pe bade aur chhote dono numbers fit nahi hote.` },
    { type: 'p', html: `<strong>Pehle school wala scientific notation:</strong> 6,500 = 6.5 × 10³. Ek number (6.5) aur ek power (3). Computer bilkul yahi karta hai, bas 10 ki jagah 2 ki power: <code>6.5 = 1.625 × 2²</code>. Power batati hai number kitna bada hai. Aage ka 1.625 batata hai bariki. Float number ko isi tarah teen hisson mein store karta hai, jaise <code>-1.5 × 2³</code>:` },
    { type: 'code', text: `value = (-1)^sign × (1 + mantissa/2^M) × 2^(exponent - bias)

sign      : 1 bit. 0 = positive, 1 = negative
exponent  : E bits. Number kitna BADA ya CHHOTA (range). bias = 2^(E-1) - 1
mantissa  : M bits. Number kitna BAREEK (precision). Aage ka "1." free milta hai

Example fp16, 6.5:  6.5 = 1.625 × 2²
  sign = 0, exponent = 2 + 15 = 17 = 10001, mantissa = 0.625 × 1024 = 640 = 1010000000
  bits = 0 10001 1010000000` },
    { type: 'callout', tone: 'term', title: 'Naya word: exponent, mantissa, bias (range vs precision)', html: `<strong>Ye kya hai:</strong> <strong>Exponent</strong> = 2 ki power wala hissa. Ye decide karta hai number kitna bada/chhota ho sakta hai: yahi <strong>range</strong> hai. <strong>Mantissa</strong> (ya fraction) = aage ka "1.xxx" wala hissa. Ye decide karta hai do paas ke numbers mein kitna kam farak ho sakta hai: yahi <strong>precision</strong> hai. <strong>Bias</strong> = ek fixed number jo stored exponent se ghataya jaata hai, taaki negative powers (bahut chhote numbers) bhi ban sakein.<br><strong>Example (fp16, 6.5):</strong> power 2, bias 15 → stored exponent 17 = <code>10001</code>. Mantissa 0.625 → 0.625 × 1024 = 640.<br><strong>Kyun chahiye:</strong> har format (fp16, bf16, fp8) apne bits exponent aur mantissa mein alag baant-ta hai. Yahi unka asli farak hai.<br><strong>Iske bina:</strong> ye samajh nahi aayega ki fp16 mein 70000 infinity kyun banta hai aur bf16 mein kyun nahi.<br><strong>Do special cases:</strong> exponent ke sab bits 0 = <strong>subnormal</strong> (zero ke bahut paas ke numbers), sab bits 1 = infinity/NaN ("not a number"), format pe depend.` },
    { type: 'image', src: 'assets/img/ai-quantization/float32-layout.svg', maxWidth: 600, alt: '32-bit float ke 32 bits: 1 sign bit, 8 exponent bits, 23 fraction (mantissa) bits, number 0.15625 ke liye', caption: 'Asli fp32 layout: number 0.15625 = 1.25 × 2⁻³. Sign 0 (positive), exponent 01111100 = 124 (124 - 127 = -3), fraction 0100... (0.25). Teeno hisse alag rang mein.', credit: { text: 'Stannered (vectorization), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Float_example.svg', license: 'CC BY-SA 3.0' } },
    { type: 'table', head: ['Format', 'Sign / Exp / Mantissa', 'Bias', 'Max value', '1 ke paas spacing', 'Kahan use'], rows: [
      ['fp32', '1 / 8 / 23', '127', '~3.40 × 10³⁸', '~1.2 × 10⁻⁷', 'Purani default training, optimizer states'],
      ['fp16', '1 / 5 / 10', '15', '65,504', '0.000977', 'Inference, purani mixed-precision training (loss scaling ke saath)'],
      ['bf16 (bfloat16)', '1 / 8 / 7', '127', '~3.39 × 10³⁸', '0.0078', 'Aaj ki default training + inference; fp32 jaisi range'],
      ['fp8 E4M3', '1 / 4 / 3', '7', '448', '0.125', 'H100+ GPUs pe training/inference (weights, activations)'],
      ['fp8 E5M2', '1 / 5 / 2', '15', '57,344', '0.25', 'Gradients (zyada range chahiye)'],
    ], caption: 'Sab numbers humne script se compute kiye. bf16 = fp32 ke upar ke 16 bits; Google ne TPUs ke liye banaya (Google Cloud blog, 2019). FP8 formats NVIDIA, Arm, Intel ke 2022 paper se.' },
    { type: 'h3', text: 'Bit-layout lab' },
    { type: 'p', html: `Format chuno, koi number likho, ya kisi bit pe click karke use flip karo. Dekho number kaise bana, aur us format mein kitni galti aayi. Try: 0.1 har format mein, 70000 fp16 vs bf16 mein, 1.001 bf16 mein, 500 E4M3 mein.` },
    { type: 'custom', render(el) {
      const FM = { fp32: [8, 23, 1, 'fp32'], fp16: [5, 10, 1, 'fp16'], bf16: [8, 7, 1, 'bf16'], e4m3: [4, 3, 0, 'fp8 E4M3'], e5m2: [5, 2, 1, 'fp8 E5M2'] };
      let fk = 'fp16', st = null, typed = 0.1;
      const dec = (e, m, ie, s, E, M) => { const b = 2 ** (e - 1) - 1, x = 2 ** e - 1; if (E === x) { if (ie) return M ? NaN : (s ? -Infinity : Infinity); if (M === 2 ** m - 1) return NaN; } const v = E === 0 ? (M / 2 ** m) * 2 ** (1 - b) : (1 + M / 2 ** m) * 2 ** (E - b); return s ? -v : v; };
      const enc = (e, m, ie, x) => {
        const s = x < 0 ? 1 : 0, a = Math.abs(x), b = 2 ** (e - 1) - 1;
        const mE = ie ? 2 ** e - 2 : 2 ** e - 1, mM = ie ? 2 ** m - 1 : 2 ** m - 2, mx = (1 + mM / 2 ** m) * 2 ** (mE - b);
        let E = 0, M = 0;
        if (a > 0) {
          let ex = Math.floor(Math.log2(a)); if (2 ** ex > a) ex--; if (2 ** (ex + 1) <= a) ex++;
          let be = ex + b, mf = be <= 0 ? a / 2 ** (1 - b) * 2 ** m : (a / 2 ** ex - 1) * 2 ** m; if (be <= 0) be = 0;
          let mi = Math.floor(mf); const fr = mf - mi; if (fr > 0.5 || (fr === 0.5 && mi % 2 === 1)) mi++;
          if (mi === 2 ** m) { mi = 0; be++; } E = be; M = mi;
        }
        if (E > mE || (E === mE && M > mM)) return ie ? { s, E: 2 ** e - 1, M: 0, o: 'overflow → infinity' } : { s, E: mE, M: mM, o: 'range ke bahar → ' + mx + ' pe saturate' };
        return { s, E, M, o: '' };
      };
      el.innerHTML = `<div class="chips bl-f" style="padding:0 0 8px">${Object.keys(FM).map(k => `<button type="button" class="chip" data-k="${k}">${FM[k][3]}</button>`).join('')}</div>
        <label>Number likho <input class="bl-x" type="number" step="any" value="0.1" style="width:160px"></label>
        <div class="bl-bits" style="display:flex;flex-wrap:wrap;gap:3px;margin:12px 0"></div>
        <div style="font-size:13px;color:var(--ink-3)"><span style="color:var(--red)">■</span> sign &nbsp; <span style="color:var(--amber)">■</span> exponent &nbsp; <span style="color:var(--accent)">■</span> mantissa (click = flip)</div>
        <pre class="ascii bl-calc" style="white-space:pre-wrap;font-size:13px"></pre>
        <div class="stats"><div class="stat"><span>Stored value</span><strong class="bl-v" style="font-size:16px;word-break:break-all"></strong></div><div class="stat"><span>Error vs tumhara number</span><strong class="bl-e" style="font-size:16px"></strong></div></div>`;
      const draw = () => {
        const [e, m, ie] = FM[fk], b = 2 ** (e - 1) - 1, v = dec(e, m, ie, st.s, st.E, st.M);
        const bits = [st.s, ...st.E.toString(2).padStart(e, '0').split('').map(Number), ...st.M.toString(2).padStart(m, '0').split('').map(Number)];
        el.querySelector('.bl-bits').innerHTML = bits.map((x, i) => { const c = i === 0 ? 'var(--red)' : i <= e ? 'var(--amber)' : 'var(--accent)'; return `<button type="button" data-i="${i}" style="width:24px;height:30px;padding:0;border-radius:4px;border:2px solid ${c};background:${x ? c : 'var(--surface)'};color:${x ? 'var(--surface)' : 'var(--ink)'};font:600 13px var(--f-mono);cursor:pointer">${x}</button>`; }).join('');
        el.querySelectorAll('.bl-bits button').forEach(btn => btn.addEventListener('click', () => {
          const i = +btn.dataset.i;
          if (i === 0) st.s ^= 1; else if (i <= e) st.E ^= 1 << (e - i); else st.M ^= 1 << (m - (i - e));
          st.o = 'bit flip kiya'; draw();
        }));
        const kind = st.E === 2 ** e - 1 && (ie || st.M === 2 ** m - 1) ? 'special (inf/NaN)' : st.E === 0 ? 'subnormal: 0.mantissa × 2^(1 - bias)' : 'normal';
        el.querySelector('.bl-calc').textContent = `sign = ${st.s}   exponent = ${st.E.toString(2).padStart(e, '0')} = ${st.E}   bias = ${b}   mantissa = ${st.M}/${2 ** m}\n` +
          (kind === 'normal' ? `value = ${st.s ? '-' : '+'}(1 + ${st.M}/${2 ** m}) × 2^(${st.E} - ${b}) = ${st.s ? '-' : '+'}${1 + st.M / 2 ** m} × 2^${st.E - b}` : kind) + (st.o ? `\nNote: ${st.o}` : '');
        el.querySelector('.bl-v').textContent = String(v);
        el.querySelector('.bl-e').textContent = isFinite(v) && isFinite(typed) ? Math.abs(v - typed).toPrecision(3) + (typed ? ' (' + (Math.abs(v - typed) / Math.abs(typed) * 100).toPrecision(3) + '%)' : '') : '—';
        el.querySelectorAll('.bl-f .chip').forEach(c => c.classList.toggle('on', c.dataset.k === fk));
      };
      const set = () => { const [e, m, ie] = FM[fk]; typed = Number(el.querySelector('.bl-x').value) || 0; st = enc(e, m, ie, typed); draw(); };
      el.querySelectorAll('.bl-f .chip').forEach(c => c.addEventListener('click', () => { fk = c.dataset.k; set(); }));
      el.querySelector('.bl-x').addEventListener('input', set); set();
    }},
    { type: 'h2', text: 'Range vs precision: fp16 aur bf16 ki ladai' },
    { type: 'p', html: `Dono 16 bits ke hain, lekin bits alag baante hain:` },
    { type: 'compare',
      left: { title: 'fp16 (5 exp, 10 mantissa)', html: `• Precision zyada: 1.001 → <code>1.0009765625</code> (kareeb)<br>• Range kam: max 65,504. <code>70000 → Infinity</code> (overflow!)<br>• Bahut chhote gradients (jaise 10⁻⁸) zero ho jaate hain (underflow), isliye fp16 training mein <strong>loss scaling</strong> trick chahiye thi` },
      right: { title: 'bf16 (8 exp, 7 mantissa)', html: `• Range fp32 jitni: <code>70000 → 70144</code> (thoda galat, lekin infinity nahi)<br>• Precision kam: <code>1.001 → 1</code> (1 ke baad agla number 1.0078 hai)<br>• fp32 se convert karna aasaan (bas neeche ke 16 bits kaat do), training stable. Isliye aaj LLM training ka default` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: overflow, underflow, loss scaling', html: `<strong>Ye kya hai:</strong> <strong>Overflow</strong> = number format ki max value se bada ho gaya (infinity ya garbage). Jaise fp16 mein 70000. <strong>Underflow</strong> = itna chhota ki zero ban gaya. Jaise fp16 mein 10⁻⁸. <strong>Loss scaling</strong> = fp16 training mein loss ko ek bade number (jaise 1024) se multiply karke chhote gradients ko representable range mein laana, phir update se pehle wapas divide.<br><strong>Kyun chahiye:</strong> training mein ek bhi infinity poore model ko NaN se bhar deti hai, aur zero bane gradients se seekhna ruk jaata hai.<br><strong>Iske bina:</strong> fp16 training beech mein achanak "loss = NaN" pe mar jaati thi. bf16 ne ye jhanjhat khatam ki.` },
    { type: 'p', html: `Google ne apne 2019 ke Cloud TPU blog mein yahi samjhaya: neural networks ke liye <strong>range zyada important</strong> nikli: chhoti precision ki galti training average kar deti hai, lekin ek infinity poori training bigaad deti hai. FP8 mein bhi yahi soch: E4M3 (zyada precision) forward pass ke weights/activations ke liye, E5M2 (zyada range) gradients ke liye. Aur bhi neeche: <strong>FP4 (E2M1)</strong> mein sirf 16 values. Isliye FP4 hamesha ek shared scale ke saath aata hai: jaise <strong>MXFP4</strong> mein 32 numbers ka group ek 8-bit scale share karta hai, to effective 4 + 8/32 = <strong>4.25 bits</strong>/param. OpenAI ke gpt-oss models (2025) ne MoE weights (<strong>MoE</strong> = Mixture of Experts: model ke andar kai "expert" FFN, har token sirf kuch experts use karta hai) MXFP4 mein rakhe, jisse 120B model ek 80 GB GPU pe chal jaata hai.` },
    { type: 'h2', text: 'Integer quantization ka maths: scale aur zero-point' },
    { type: 'p', html: `Ab asli quantization. Hamare paas 8 weights hain (asli mein arabon, lekin maths same):` },
    { type: 'code', text: `w = [0.42, -1.27, 0.03, 0.88, -0.35, 2.10, -0.61, 0.15]` },
    { type: 'p', html: `Formula (affine quantization), har deep learning library mein yahi:` },
    { type: 'code', text: `quantize:    q  = clamp( round(w / scale) + zero_point , q_min , q_max )
dequantize:  ŵ  = scale × (q - zero_point)
error        = ŵ - w

clamp(v, lo, hi) = v ko lo aur hi ke beech rakho` },
    { type: 'callout', tone: 'term', title: 'Naya word: scale aur zero-point', html: `<strong>Ye kya hai:</strong> <strong>Scale</strong> = ek integer step kitne real value ke barabar hai (ek float number, har tensor ya group ka apna). <strong>Zero-point</strong> = wo integer jo real 0.0 ko represent karta hai. Symmetric mein zero-point = 0.<br><strong>Chhota example:</strong> scale = 0.3, zero-point = 0. Real 0.88 → 0.88 / 0.3 = 2.93 → round → q = <strong>3</strong>. Wapas: 3 × 0.3 = <strong>0.9</strong>. Galti 0.02.<br><strong>Kyun chahiye:</strong> integers sirf poore numbers hain (-7..7). Scale unhe weights ki asli range pe "khinch" deta hai.<br><strong>Iske bina:</strong> 0.42 ko int4 mein rakhne ka koi matlab hi nahi: wo 0 ban jaata.` },
    { type: 'callout', tone: 'term', title: 'Naya word: MSE (mean squared error)', html: `<strong>Ye kya hai:</strong> quantization ki galti ka ek number. Har weight ki galti (dequant - asli) ka square lo, phir average. Example: galtiyan 0.1 aur -0.2 → (0.01 + 0.04) / 2 = <strong>0.025</strong>.<br><strong>Kyun chahiye:</strong> alag settings (int8 vs int4, symmetric vs asymmetric) ko ek number se compare kar sakein. Square lene se badi galtiyan zyada "chubhti" hain.<br><strong>Iske bina:</strong> sirf aankh se andaaza: "lagta hai theek hai".` },
    { type: 'callout', tone: 'term', title: 'Naya word: symmetric (absmax) aur asymmetric (min-max)', html: `<strong>Ye kya hai:</strong> scale chunne ke do tareeke. <strong>Symmetric</strong>: sabse bada |value| (<strong>absmax</strong>) lo, aur integer range ko zero ke dono taraf barabar baanto. Zero-point = 0. <strong>Asymmetric</strong>: asli min se max tak ki range ko integers pe failao, aur ek zero-point rakho.<br><strong>Example:</strong> weights -1.27 se 2.10 tak. Symmetric int4: scale = 2.10 / 7 = 0.3, range -2.1..2.1 (neeche -1.27 se -2.1 tak ki jagah bekaar). Asymmetric: range -1.27..2.10, kuch waste nahi.<br><strong>Kyun chahiye:</strong> kam bits mein har level keemti hai. Sahi tareeka = kam galti.<br><strong>Iske bina:</strong> ya to levels waste, ya bina wajah ka extra kaam.` },
    { type: 'h3', text: 'Symmetric (absmax), int8' },
    { type: 'steps', items: [
      { t: 'Scale', d: 'absmax = 2.10. int8 symmetric range -127..127. <code>scale = 2.10 / 127 = 0.016535</code>.' },
      { t: 'Quantize', d: '0.42 / 0.016535 = 25.4 → <strong>25</strong>; -1.27 → -76.8 → <strong>-77</strong>; 0.03 → 1.81 → <strong>2</strong>; 0.88 → 53.2 → <strong>53</strong>; -0.35 → -21.2 → <strong>-21</strong>; 2.10 → <strong>127</strong>; -0.61 → -36.9 → <strong>-37</strong>; 0.15 → 9.07 → <strong>9</strong>.' },
      { t: 'Dequantize', d: '25 × 0.016535 = 0.4134; -77 × 0.016535 = -1.2732; ... Max error 0.0066, mean squared error (MSE) 0.000011. Bahut kam.' },
    ]},
    { type: 'h3', text: 'Symmetric, int4 (sirf -7..7)' },
    { type: 'steps', items: [
      { t: 'Scale', d: '<code>scale = 2.10 / 7 = 0.3</code>. Ab har step 0.3 ka!' },
      { t: 'Quantize', d: '0.42/0.3 = 1.4 → 1; -1.27/0.3 = -4.23 → -4; 0.03/0.3 = 0.1 → 0; 0.88/0.3 = 2.93 → 3; -0.35/0.3 = -1.17 → -1; 2.10/0.3 = 7; -0.61/0.3 = -2.03 → -2; 0.15/0.3 = 0.5 → 1 (round half up). q = <code>[1, -4, 0, 3, -1, 7, -2, 1]</code>.' },
      { t: 'Dequantize', d: 'q × 0.3 = <code>[0.3, -1.2, 0, 0.9, -0.3, 2.1, -0.6, 0.3]</code>. Max error 0.15 (0.15 ka weight 0.3 ban gaya: double!). MSE 0.005713, int8 se ~500 guna zyada.' },
    ]},
    { type: 'h3', text: 'Symmetric, 2-bit: lagbhag sab khatam' },
    { type: 'p', html: `2 bits symmetric mein sirf -1, 0, +1 kaam ke hain (q_max = 1). scale = 2.10. q = <code>[0, -1, 0, 0, 0, 1, 0, 0]</code>, dequant = <code>[0, -2.1, 0, 0, 0, 2.1, 0, 0]</code>. Paanch weights zero ban gaye, MSE 0.269713. Isliye naive 2-bit kaam nahi karta; 2-bit ke liye special methods aur training chahiye (neeche).` },
    { type: 'h3', text: 'Asymmetric (min-max), 4-bit' },
    { type: 'p', html: `Agar values zero ke dono taraf barabar nahi phaili (yahan -1.27 se 2.10), to symmetric range ka ek hissa waste hota hai. Asymmetric unsigned 4-bit (0..15) poori range use karta hai:` },
    { type: 'code', text: `scale      = (max - min) / (15 - 0) = (2.10 - (-1.27)) / 15 = 3.37 / 15 = 0.224667
zero_point = round(0 - min/scale) = round(1.27 / 0.224667) = round(5.65) = 6

0.42  → round(1.87) + 6 = 8        dequant: (8 - 6) × 0.224667  =  0.4493
-1.27 → round(-5.65) + 6 = 0       dequant: (0 - 6) × 0.224667  = -1.3480
2.10  → round(9.35) + 6 = 15       dequant: (15 - 6) × 0.224667 =  2.0220
q = [8, 0, 6, 10, 4, 15, 3, 7]     MSE 0.004227 (symmetric int4: 0.005713)` },
    { type: 'p', html: `Asymmetric ne isi data pe error kam kiya, kyunki ek bhi level waste nahi hua. Keemat: har group ke saath ek extra number (zero-point) store karna, aur matmul (matrix multiplication) mein thoda extra kaam. Activations (jaise ReLU ke baad sab positive; ReLU = negative ko 0 kar dene wala function) ke liye asymmetric aksar better; weights (zero ke aas paas symmetric) ke liye symmetric simple aur kaafi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: per-tensor vs per-group (granularity)', html: `<strong>Ye kya hai:</strong> kitne weights ek hi scale share karte hain. <strong>Per-tensor</strong> = poori matrix ka ek scale. <strong>Per-group</strong> = har chhote group (jaise 4, 64 ya 128 weights) ka apna scale.<br><strong>Kyun chahiye:</strong> ek bada <strong>outlier</strong> (baaki sab se bahut bada ek value) per-tensor scale ko bada kar deta hai, aur baaki sab chhote weights zero pe gir jaate hain. Group mein outlier sirf apne group ko kharab karta hai.<br><strong>Iske bina:</strong> 4-bit pe model toot sakta hai (neeche lab mein khud dekho). Keemat: har group ka scale bhi store karna padta hai (thodi extra memory).` },
    { type: 'h3', text: 'Quantization error lab' },
    { type: 'p', html: `Bits, symmetric/asymmetric, aur per-tensor vs group of 4 badlo. "Outlier" dabao: ek weight 25 ban jaata hai (LLMs mein kuch aise bade outliers sach mein hote hain). Dekho per-tensor mein baaki saare weights ka kya hota hai, aur groups kaise bachate hain.` },
    { type: 'custom', render(el) {
      const DEF = [0.42, -1.27, 0.03, 0.88, -0.35, 2.10, -0.61, 0.15];
      let w = DEF.slice(), bits = 4, mode = 'sym', gran = 't';
      const td = 'padding:3px 6px;border:1px solid var(--line);text-align:right;font:13px var(--f-mono)';
      const chips = (cls, opts, cur) => `<div class="chips ${cls}" style="padding:0 0 8px">` + opts.map(([k, l]) => `<button type="button" class="chip${k === cur ? ' on' : ''}" data-k="${k}">${l}</button>`).join('') + '</div>';
      el.innerHTML = `<div class="qe-c"></div><div class="qe-in" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="margin-top:8px"><button type="button" class="btn small ghost qe-reset">Example values</button> <button type="button" class="btn small ghost qe-out">Outlier: w₆ = 25</button></div>
        <div style="overflow-x:auto;margin-top:10px"><table class="qe-t" style="border-collapse:collapse;min-width:540px"></table></div>
        <div class="stats"><div class="stat"><span>MSE</span><strong class="qe-mse"></strong></div><div class="stat"><span>Max |error|</span><strong class="qe-max"></strong></div><div class="stat"><span>Scale(s)</span><strong class="qe-s" style="font-size:15px"></strong></div><div class="stat"><span>Bits per weight (fp16 scale/zp shamil)</span><strong class="qe-b"></strong></div></div>
        <div class="calc-note">Group of 4 = pehle 4 weights ka ek scale, baaki 4 ka alag. Asli models mein group 32, 64 ya 128 hota hai. Overhead: har group pe ek fp16 scale (16 bits), asymmetric mein ek zero-point bhi (yahan fp16 maana).</div>`;
      const quant = x => {
        if (mode === 'sym') { const qm = 2 ** (bits - 1) - 1, s = Math.max(...x.map(Math.abs)) / qm || 1; return x.map(v => { const q = Math.max(-qm, Math.min(qm, Math.round(v / s))); return { q, d: q * s, s, z: 0 }; }); }
        const qm = 2 ** bits - 1, mn = Math.min(...x, 0), mx = Math.max(...x, 0), s = (mx - mn) / qm || 1, z = Math.round(-mn / s);
        return x.map(v => { const q = Math.max(0, Math.min(qm, Math.round(v / s) + z)); return { q, d: (q - z) * s, s, z }; });
      };
      const drawC = () => {
        el.querySelector('.qe-c').innerHTML = chips('qe-bits', [[8, '8-bit'], [4, '4-bit'], [3, '3-bit'], [2, '2-bit']], bits) + chips('qe-mode', [['sym', 'Symmetric'], ['asym', 'Asymmetric']], mode) + chips('qe-g', [['t', 'Per-tensor (1 scale)'], ['g', 'Group of 4']], gran);
        el.querySelectorAll('.qe-bits .chip').forEach(c => c.onclick = () => { bits = +c.dataset.k; drawC(); calc(); });
        el.querySelectorAll('.qe-mode .chip').forEach(c => c.onclick = () => { mode = c.dataset.k; drawC(); calc(); });
        el.querySelectorAll('.qe-g .chip').forEach(c => c.onclick = () => { gran = c.dataset.k; drawC(); calc(); });
      };
      const drawIn = () => {
        el.querySelector('.qe-in').innerHTML = w.map((v, i) => `<input data-i="${i}" type="number" step="0.01" value="${v}" style="width:86px;font:13px var(--f-mono)">`).join('');
        el.querySelectorAll('.qe-in input').forEach(n => n.addEventListener('input', () => { const v = Number(n.value); if (isFinite(v)) { w[+n.dataset.i] = v; calc(); } }));
      };
      const calc = () => {
        const R = gran === 't' ? quant(w) : [...quant(w.slice(0, 4)), ...quant(w.slice(4))];
        const e = R.map((r, i) => r.d - w[i]), mse = e.reduce((a, x) => a + x * x, 0) / e.length, mxe = Math.max(...e.map(Math.abs));
        const line = (lab, fn) => `<tr><th style="${td};text-align:left;font-family:var(--f-body)">${lab}</th>${R.map((r, i) => `<td style="${td}">${fn(r, i)}</td>`).join('')}</tr>`;
        el.querySelector('.qe-t').innerHTML = line('w', (r, i) => w[i]) + line('q (integer)', r => r.q) + line('ŵ = dequant', r => r.d.toFixed(4)) +
          line('error', (r, i) => `<span style="color:${Math.abs(e[i]) > 0.1 ? 'var(--red)' : 'var(--ink-2)'}">${e[i].toFixed(4)}</span>`);
        const sc = gran === 't' ? [R[0]] : [R[0], R[4]];
        el.querySelector('.qe-mse').textContent = mse.toFixed(6);
        el.querySelector('.qe-max').textContent = mxe.toFixed(4);
        el.querySelector('.qe-s').textContent = sc.map(r => r.s.toFixed(6) + (mode === 'asym' ? ' (zp ' + r.z + ')' : '')).join(' | ');
        const groups = gran === 't' ? 1 : 2;
        el.querySelector('.qe-b').textContent = (bits + groups * (mode === 'asym' ? 32 : 16) / 8).toFixed(2);
      };
      el.querySelector('.qe-reset').addEventListener('click', () => { w = DEF.slice(); drawIn(); calc(); });
      el.querySelector('.qe-out').addEventListener('click', () => { w = DEF.slice(); w[5] = 25; drawIn(); calc(); });
      drawC(); drawIn(); calc();
    }},
    { type: 'p', html: `Outlier ke saath int4 symmetric, per-tensor: scale = 25/7 = 3.57, to baaki saare weights (sab ±1.3 se chhote) <strong>zero</strong> ban jaate hain. MSE 0.385212. Group of 4 karo: outlier sirf doosre group ko kharab karta hai, pehla group apne scale (1.27/7) se theek rehta hai. MSE 0.06525. Lekin bits per weight badhe: 8 weights pe 2 scales. Asli models mein group 128 pe fp16 scale = sirf 16/128 = 0.125 extra bits.` },
    { type: 'h2', text: 'Granularity: kitne weights ek scale share karein?' },
    { type: 'table', head: ['Granularity', 'Ek scale kitne weights pe', 'Accuracy', 'Overhead'], rows: [
      ['Per-tensor', 'Poori matrix (laakhon)', 'Sabse kam (ek outlier sab bigaadta hai)', 'Lagbhag zero'],
      ['Per-channel (per-row)', 'Matrix ki ek row/column', 'Achhi; int8 ke liye standard', 'Bahut kam'],
      ['Per-group / block-wise', '32, 64, 128 weights', 'Sabse achhi; 4-bit aur neeche ke liye zaroori', 'Group 128 + fp16 scale = +0.125 bits; QLoRA block 64 = +0.5 (DQ ke baad 0.127)'],
    ]},
    { type: 'h2', text: 'Kya quantize karein: weights, activations, KV cache' },
    { type: 'list', items: [
      '<strong>Weight-only</strong> (W4A16 jaisa naam: weights 4-bit, activations 16-bit; activations = layers ke beech bahne wale numbers): weights store aur load 4-bit mein, <strong>matmul</strong> (matrix multiplication) se pehle dequantize. Memory aur bandwidth bachta hai. Local/chhote batch inference ka sabse common tareeka.',
      '<strong>Weights + activations</strong> (W8A8, FP8): matmul khud low precision mein, to GPU ke fast int8/fp8 units use hote hain. Bade batch serving mein compute bhi bachta hai. Mushkil: activations mein bade outliers hote hain. LLM.int8() paper (Dettmers et al., 2022) ne dikhaya ki ~6.7B se bade models mein kuch feature dimensions mein bahut bade values aate hain; unhe 16-bit mein alag rakh ke baaki int8 mein karna padta hai.',
      '<strong>KV cache</strong> quantization: lambe context mein KV cache bahut memory leta hai (dekho <a href="#/ai-multihead">KV cache</a>). Use 8-bit ya fp8 mein rakhne se zyada users ya lamba context ek GPU pe.',
    ]},
    { type: 'h2', text: 'PTQ vs QAT' },
    { type: 'compare',
      left: { title: 'PTQ (Post-Training Quantization)', html: `Trained model lo, uske weights ko quantize karo. Training nahi chahiye, ghanton ya minutes mein ho jaata hai. Thoda <strong>calibration data</strong> (kuch sau sample texts) use karke scales ya rounding choose karte hain. 8-bit aur 4-bit pe achha. 3-bit aur neeche quality girne lagti hai. GPTQ, AWQ, bitsandbytes, llama.cpp quants sab PTQ hain.` },
      right: { title: 'QAT (Quantization-Aware Training)', html: `Training (ya fine-tuning) ke time hi forward pass mein "fake quantize" karte hain, taaki model rounding ki galti ke saath jeena seekh le. Mehnga (training chahiye), lekin bahut kam bits pe bhi quality bachti hai. Extreme example: <strong>BitNet b1.58</strong> (2024): weights sirf -1, 0, +1, shuru se aise hi train kiye.` },
    },
    { type: 'callout', tone: 'term', title: 'Naya word: calibration data', html: `<strong>Ye kya hai:</strong> kuch sau representative inputs (jaise xyz ke typical sawaal) jo model mein chala ke naapte hain ki activations ki range kya hai aur kaunse weights sabse important hain.<br><strong>Kyun chahiye:</strong> isse quantizer behtar scale aur rounding chunta hai: important weights ko zyada dhyaan.<br><strong>Iske bina (ya galat data ho to):</strong> agar calibration data asli use se bilkul alag ho (jaise sirf English, jabki users Hinglish bolte hain), quality us asli use pe chupke se gir sakti hai. Neeche diagram ka ek failure yahi hai.` },
    { type: 'h3', text: 'Popular methods, ek-ek line' },
    { type: 'table', head: ['Naam', 'Kya hai', 'Ek line'], rows: [
      ['<strong>GPTQ</strong> (2022)', 'PTQ, weight-only, 3-4 bit', 'Ek-ek column quantize karta hai aur second-order (Hessian: loss ka "mod" kitna tez hai) info se baaki weights ko adjust karta hai taaki layer ka output kam bigde. 175B model ~4 GPU-hours mein.'],
      ['<strong>AWQ</strong> (2023)', 'PTQ, weight-only, 4 bit', 'Activations dekh ke ~1% "salient" weight channels pehchanta hai aur unhe scaling se protect karta hai. Calibration chhota, generalise achha.'],
      ['<strong>bitsandbytes</strong>', 'Library', 'LLM.int8() (outliers 16-bit mein) aur NF4/FP4 4-bit. QLoRA isi pe chalta hai (dekho <a href="#/ai-lora">LoRA lesson</a>, NF4 ka worked example wahan hai).'],
      ['<strong>GGUF</strong> (llama.cpp)', 'File format + quant types', 'Ek file mein weights + metadata, CPU/Mac/laptop pe chalane ke liye. Q8_0, Q4_K_M, Q2_K jaise types: block-wise quants, "K" wale smarter mixed scales.'],
      ['<strong>FP8 / MXFP4</strong>', 'Hardware float formats', 'Naye GPUs (H100, Blackwell) mein inke liye seedhe hardware units; training aur serving dono mein.'],
      ['<strong>BitNet b1.58</strong> (2024)', 'QAT, ternary', 'Weights {-1, 0, +1}: matmul mein multiply ki jagah sirf add/subtract.'],
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: NF4 (yaad dilana)', html: `<strong>Ye kya hai:</strong> ek 4-bit format jiske 16 levels barabar doori pe nahi, balki normal distribution ke quantiles pe hain, kyunki weights bell-curve jaise phaile hote hain.<br><strong>Kyun chahiye:</strong> same 4 bits mein uniform int4 se kam error. QLoRA ka base isi mein store hota hai.<br><strong>Iske bina:</strong> zero ke paas (jahan zyadatar weights hain) levels kam padte, galti zyada.<br>Poora derivation aur worked block <a href="#/ai-lora">LoRA aur QLoRA</a> mein.` },
    { type: 'h2', text: 'xyz Assistant: quantize karke serve karna' },
    { type: 'flow', height: 300, title: 'PTQ pipeline aur kya galat ho sakta hai',
      nodes: [
        { id: 'm', label: 'bf16 model', sub: '7B, 13.5 GB', x: 90, y: 70, w: 140, kind: 'data', info: 'Ye kya hai: trained (ya LoRA merge kiya hua) model, bf16 mein. 6.74B params × 2 bytes ≈ 13.5 GB.' },
        { id: 'cal', label: 'Calibration', sub: 'kuch sau texts', x: 90, y: 240, w: 140, kind: 'client', info: 'Ye kya hai: calibration data, yaani representative sample inputs. Quantizer inhe model mein chala ke dekhta hai kaunse weights/channels important hain aur activations ki range kya hai.' },
        { id: 'q', label: 'Quantizer', sub: 'GPTQ / AWQ', x: 330, y: 150, w: 150, kind: 'server', info: 'Ye kya hai: PTQ tool (jaise GPTQ ya AWQ). Har group (jaise 128 weights) ke liye scale chunta hai aur rounding karta hai, error kam rakhne ki koshish mein.' },
        { id: 'f', label: 'int4 file', sub: '~3.5 GB + scales', x: 580, y: 70, w: 160, kind: 'cache', info: 'Ye kya hai: quantized model file. 4-bit weights + har 128 weights pe ek fp16 scale: 4.125 bits/param. 6.74B × 4.125 / 8 ≈ 3.5 GB.' },
        { id: 'srv', label: 'Inference server', sub: '24 GB GPU', x: 580, y: 240, w: 170, kind: 'server', info: 'Ye kya hai: wo program jo model chala ke users ko jawab deta hai. Weights 4-bit mein load, har matmul se pehle dequantize (weight-only). Bachi memory KV cache aur zyada users ke liye.' },
        { id: 'u', label: 'User', sub: 'xyz app', x: 330, y: 240, w: 120, kind: 'client', info: 'Ye kya hai: xyz Assistant ka user. Use farak nahi padna chahiye ki model 4-bit hai: wahi quality, tez jawab.' },
      ],
      edges: [{ a: 'm', b: 'q' }, { a: 'cal', b: 'q' }, { a: 'q', b: 'f' }, { a: 'f', b: 'srv' }, { a: 'u', b: 'srv' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Model aur calibration', text: 'bf16 model aur ~sau representative sawaal quantizer mein.', go: ['m>q', 'cal>q'], parallel: true },
          { title: 'Quantize', text: 'Group-wise 4-bit, har group ka scale. Calibration se important channels bachaye gaye.', go: 'q>f', after: { f: { state: 'ok' } }, msg: '13.5 GB → ~3.5 GB' },
          { title: 'Load', text: 'Server 3.5 GB load karta hai. 24 GB GPU mein ~20 GB KV cache aur batching ke liye bacha.', go: 'f>srv', after: { srv: { state: 'ok', sub: '3.5 GB used' } } },
          { title: 'Serve', text: 'User sawaal poochhta hai, har token ke liye kam bytes padhne padte hain, jawab tez.', go: ['u>srv', 'res:srv>u'], msg: 'Q: "Video upload fail kyun?"  A: "File 2 GB se badi hai..."' },
        ]},
        { name: 'Failure: per-tensor + outlier', steps: [
          { title: 'Galat setting', text: 'Kisi ne 4-bit per-tensor chun liya. Ek layer mein ek bada outlier weight hai.', set: { q: { sub: '4-bit per-tensor', state: 'warn' } }, go: ['m>q', 'q>f'] },
          { title: 'Chhote weights zero', text: 'Scale outlier ke hisaab se bana, to us layer ke zyadatar weights zero ho gaye (lab mein dekha).', after: { f: { state: 'down', sub: 'bigde weights' } }, focus: ['f'] },
          { title: 'Bakwaas jawab', text: 'Model chalta hai, lekin output repeat ya bematlab.', go: ['f>srv', 'u>srv', 'bad:srv>u'], after: { srv: { state: 'warn', sub: 'quality gir gayi' } } },
          { title: 'Fix', text: 'Group-wise (64/128) scales, ya AWQ/GPTQ jaise outlier-aware method. Aur deploy se pehle eval chalao.', set: { q: { sub: 'group 128', state: 'ok' }, f: { state: 'ok', sub: 'theek' }, srv: { state: 'ok', sub: '24 GB GPU' } } },
        ]},
        { name: 'Failure: 2-bit lalach', steps: [
          { title: 'Aur chhota karo!', text: 'Team ne socha 2-bit = 1.7 GB, laptop pe chalega. Naive PTQ 2-bit kiya.', set: { q: { sub: '2-bit PTQ' } }, go: 'q>f', after: { f: { sub: '~1.8 GB', state: 'warn' } } },
          { title: 'Quality collapse', text: 'Sirf 4 levels per group: bahut weights zero ya galat. Perplexity (model har agle token pe kitna "confused" hai, kam = achha) bahut badh jaati hai, jawab toote hue.', go: ['u>srv', 'bad:srv>u'], after: { srv: { state: 'down', sub: 'gibberish' } } },
          { title: 'Fix', text: 'Bada model ko 2-bit karne se aksar chhota model 4-bit mein behtar. Ya QAT (BitNet jaisa) jahan model kam bits ke saath train hua ho.', set: { srv: { state: '', sub: '24 GB GPU' }, f: { state: 'ok', sub: '4-bit wapas' }, q: { sub: 'GPTQ / AWQ' } } },
        ]},
        { name: 'Failure: calibration mismatch', steps: [
          { title: 'Galat calibration', text: 'Calibration sirf English Wikipedia se. xyz ke users Hinglish mein poochhte hain.', set: { cal: { state: 'warn', sub: 'sirf English' } }, go: 'cal>q' },
          { title: 'Hinglish pe quality giri', text: 'Quantizer ne Hinglish ke liye zaroori channels ko important nahi maana. English benchmark theek, asli users naraz.', go: ['q>f', 'f>srv', 'u>srv', 'bad:srv>u'] },
          { title: 'Fix', text: 'Calibration aur eval set asli traffic jaisa rakho (Hinglish, xyz ke sawaal).', set: { cal: { state: 'ok', sub: 'asli traffic jaisa' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Calculator: kaunsa model, kis precision mein, kahan fit?' },
    { type: 'custom', render(el) {
      const F = [['fp32', 32], ['fp16 / bf16', 16], ['int8 / fp8', 8], ['int4 (group 128, fp16 scale)', 4.125], ['NF4 + double quant', 4.127], ['3-bit (group 128)', 3.125], ['2-bit (group 128)', 2.125], ['Ternary 1.58-bit', 1.58]];
      const BW = [['Laptop', 100], ['Gaming GPU', 1000], ['Datacenter GPU', 3350]];
      let bw = 1000;
      el.innerHTML = `<div class="row2"><div><label>Model size (billion params)</label><input class="mq-p" type="number" min="0.1" step="0.1" value="7"></div>
        <div><label>Memory bandwidth</label><div class="chips mq-bw" style="padding:4px 0 0">${BW.map(([n, v]) => `<button type="button" class="chip" data-v="${v}">${n} (${v.toLocaleString('en-IN')} GB/s)</button>`).join('')}</div></div></div>
        <div class="chips mq-pre" style="padding:8px 0 0"><button type="button" class="chip" data-p="7">7B</button><button type="button" class="chip" data-p="13">13B</button><button type="button" class="chip" data-p="70">70B</button><button type="button" class="chip" data-p="405">405B</button></div>
        <div style="overflow-x:auto;margin-top:10px"><table class="mq-t" style="border-collapse:collapse;width:100%;min-width:520px;font-size:14px"></table></div>
        <div class="calc-note">Sirf weights. KV cache, activations aur runtime ke liye 10-30% extra jagah rakho. Tokens/sec = bandwidth ÷ weights ka size: batch 1 pe ek upper bound (har token ke liye saare weights ek baar padhne padte hain), asli speed isse kam. 1 GB = 10⁹ bytes.</div>`;
      const td = 'padding:5px 8px;border-bottom:1px solid var(--line);text-align:left';
      const upd = () => {
        const P = Math.max(0.1, Number(el.querySelector('.mq-p').value) || 0.1) * 1e9;
        el.querySelector('.mq-t').innerHTML = `<tr><th style="${td}">Format</th><th style="${td}">Bits/param</th><th style="${td}">Weights</th><th style="${td}">Sabse chhota fit</th><th style="${td}">Tokens/s (max)</th></tr>` + F.map(([n, b]) => {
          const gb = P * b / 8 / 1e9, fit = gb < 14 ? "16 GB" : gb < 21 ? "24 GB" : gb < 42 ? "48 GB" : gb < 70 ? '80 GB' : Math.ceil(gb / 70) + ' × 80 GB';
          return `<tr><td style="${td}">${n}</td><td style="${td}">${b}</td><td style="${td}"><strong>${gb.toFixed(1)} GB</strong></td><td style="${td}">${fit}</td><td style="${td}">${(bw / gb).toFixed(1)}</td></tr>`;
        }).join('');
        el.querySelectorAll('.mq-bw .chip').forEach(c => c.classList.toggle('on', +c.dataset.v === bw));
        el.querySelectorAll('.mq-pre .chip').forEach(c => c.classList.toggle('on', +c.dataset.p * 1e9 === P));
      };
      el.querySelectorAll('.mq-bw .chip').forEach(c => c.addEventListener('click', () => { bw = +c.dataset.v; upd(); }));
      el.querySelectorAll('.mq-pre .chip').forEach(c => c.addEventListener('click', () => { el.querySelector('.mq-p').value = c.dataset.p; upd(); }));
      el.querySelector('.mq-p').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `"Fit" mein humne GPU ka ~12.5% (weights < 0.875 × memory) KV cache aur runtime ke liye chhoda. 7B: fp16 14 GB (24 GB GPU), int4 3.6 GB (16 GB laptop GPU mein aaraam se). 70B: fp16 140 GB (2 × 80 GB), int4 36.1 GB (ek 48 GB GPU), 2-bit 18.6 GB (24 GB GPU, lekin quality ka risk). Gaming GPU bandwidth pe 7B: fp16 ~71 tokens/s max, int4 ~277 tokens/s max.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "4-bit model = 4 guna kam smart"', html: `Nahi. Bits sirf ye batate hain ki har weight kitni bariki se store hai. Achhe 4-bit methods (GPTQ, AWQ, NF4, Q4_K_M) pe quality aksar bf16 ke bahut kareeb rehti hai. Asli girawat ~3-bit aur 2-bit pe shuru hoti hai. Aur ulta bhi sach: 70B ka 4-bit version aksar 13B ke bf16 version se behtar hota hai, aur kam memory mein.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "quantize kiya to training bhi 4-bit mein kar lenge"', html: `Inference ke liye quantization aasaan hai. Training mein chhote gradient updates ko itni kam precision mein represent karna mushkil hai, isliye training bf16 (aur optimizer fp32) mein hoti hai. QLoRA mein bhi base sirf 4-bit <em>store</em> hota hai; compute bf16 mein aur trainable LoRA weights bf16 mein.` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• <strong>Training</strong>: bf16 (optimizer states fp32). Naye hardware pe FP8 training agar framework support kare.<br>• <strong>GPU serving, quality sabse zaroori</strong>: bf16, ya FP8/int8 (W8A8) — lagbhag bina nuksaan, ~2× memory bachat.<br>• <strong>Memory tight, ek GPU, chhota batch</strong>: 4-bit weight-only (AWQ/GPTQ, group 128). Default sweet spot.<br>• <strong>Laptop / CPU / Mac</strong>: GGUF Q4_K_M se shuru; RAM bache to Q5/Q6/Q8.<br>• <strong>3-bit / 2-bit</strong>: sirf jab koi aur raasta nahi, aur apne eval pe check karke. Aksar chhota model 4-bit mein behtar.<br>• <strong>Fine-tuning bade model ki, ek GPU pe</strong>: QLoRA (NF4 base + bf16 LoRA).<br>• Hamesha: quantize ke baad apne asli use-case pe eval chalao (Hinglish bhi!).` },
    { type: 'h2', text: 'Poori picture: quantize karo, chhota serve karo' },
    { type: 'p', html: `Upar ka hissa ek baar hota hai (offline). Neeche ka hissa har token pe (runtime). Buttons dabao.` },
    { type: 'diagram', title: 'Quantization: poori picture', height: 590,
      groups: [
        { label: 'Offline: ek baar quantize (PTQ)', x: 10, y: 20, w: 700, h: 262 },
        { label: 'Runtime: har token pe', x: 10, y: 306, w: 700, h: 272 },
      ],
      nodes: [
        { id: 'bf', label: 'bf16 model', sub: '7B, 13.5 GB', x: 90, y: 80, kind: 'data', info: 'Ye kya hai: trained model, har weight 16 bit (2 bytes). 6.74B × 2 bytes ≈ 13.5 GB. Quantization yahin se shuru.' },
        { id: 'cal', label: 'Calibration', sub: 'kuch sau texts', x: 90, y: 200, kind: 'client', info: 'Ye kya hai: xyz ke asli traffic jaise sample sawaal (Hinglish bhi). Quantizer inse dekhta hai kaunse weights/channels important hain aur activations ki range kya hai.' },
        { id: 'qz', label: 'Quantizer', sub: 'GPTQ / AWQ', x: 300, y: 140, w: 150, kind: 'server', info: 'Ye kya hai: PTQ tool. Har group (128 weights) ke liye scale chunta hai: scale = absmax / 7 (symmetric int4), phir q = round(w / scale). Outlier-aware tareeke important weights bachate hain.' },
        { id: 'file', label: 'int4 file', sub: '3.5 GB + scales', x: 540, y: 140, w: 160, kind: 'cache', info: 'Ye kya hai: quantized model. 4-bit integers + har 128 weights pe ek fp16 scale = 4.125 bits/param. 6.74B × 4.125 / 8 ≈ 3.5 GB (13.5 GB se ~4 guna kam).' },
        { id: 'eval', label: 'Eval set', sub: 'asli sawaal', x: 300, y: 236, w: 150, kind: 'queue', info: 'Ye kya hai: test sawaalon ka set (xyz ke asli, Hinglish bhi). Quantize ke baad yahi check karta hai ki quality bachi ya chupke se giri.' },
        { id: 'srv', label: 'Inference server', sub: '24 GB GPU', x: 90, y: 370, w: 150, kind: 'server', info: 'Ye kya hai: wo program jo model chala ke users ko jawab deta hai (jaise vLLM ya llama.cpp). Har layer pe weights padhta, dequantize karta aur multiply karta hai.' },
        { id: 'deq', label: 'Dequantize', sub: 'ŵ = s × (q - z)', x: 330, y: 370, w: 150, kind: 'net', info: 'Ye kya hai: 4-bit integer ko wapas lagbhag original number banana: scale × (q - zero_point). Example: q = 3, scale 0.3 → 0.9 (asli 0.88).' },
        { id: 'vram', label: 'GPU memory', sub: 'int4 + scales', x: 560, y: 370, w: 150, kind: 'data', info: 'Ye kya hai: GPU ki apni memory (VRAM). Weights yahan 4-bit mein rehte hain: har token pe 3.5 GB padhna padta hai, 13.5 GB nahi. Isliye tez.' },
        { id: 'user', label: 'xyz user', sub: 'Hinglish sawaal', x: 90, y: 510, w: 150, kind: 'client', info: 'Ye kya hai: xyz Assistant ka user. Use pata nahi chalna chahiye ki model 4-bit hai: wahi quality, tez jawab.' },
        { id: 'mm', label: 'Matmul (bf16)', sub: 'x · ŵ', x: 330, y: 510, w: 150, kind: 'server', info: 'Ye kya hai: layer ka matrix multiplication. Weight-only quantization (W4A16) mein ye bf16 mein hota hai; dequantized weights activations se multiply hote hain.' },
        { id: 'kv', label: 'KV cache', sub: '~20 GB bachi jagah', x: 560, y: 510, w: 150, kind: 'cache', info: 'Ye kya hai: purane tokens ke K, V ki copy (multi-head lesson). 24 GB GPU mein 3.5 GB weights ke baad ~20 GB bacha: zyada users aur lamba context.' },
      ],
      edges: [
        { a: 'bf', b: 'qz', n: 1 },
        { a: 'cal', b: 'qz', n: 1 },
        { a: 'qz', b: 'file', n: 2 },
        { a: 'qz', b: 'eval', n: 3, label: 'check' },
        { a: 'file', b: 'vram', n: 4, label: 'load' },
        { a: 'user', b: 'srv', n: 5 },
        { a: 'vram', b: 'deq', n: 6 },
        { a: 'deq', b: 'mm', n: 7 },
        { a: 'mm', b: 'srv', n: 8, kind: 'res' },
        { a: 'vram', b: 'kv', dashed: true },
      ],
      paths: [
        { name: 'Quantize weights', text: 'bf16 weights → group-wise scale → q = round(w / scale). 13.5 GB → ~3.5 GB. Phir eval se quality check.', go: ['bf>qz>file', 'qz>eval'] },
        { name: 'Dequantize + matmul', text: 'Har layer pe 4-bit weights GPU memory se padho, ŵ = scale × (q - z) se bf16 banao, phir activations se multiply.', go: ['vram>deq>mm>srv'] },
        { name: 'Calibrate', text: 'Asli traffic jaise sawaal model mein chalao. Quantizer dekhta hai kaunse channels important hain. Galat calibration = chhupi girawat.', go: ['cal>qz>eval'] },
        { name: 'Serve smaller', text: 'Chhoti file GPU mein load, bachi memory KV cache ke liye. User ko tez jawab, kam bytes padhne se.', go: ['file>vram>kv', 'user>srv', 'mm>srv'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Memory = params × bytes per param. 70B: bf16 140 GB, int4 (group 128) ~36 GB.</li>
      <li>Float = sign + exponent (range) + mantissa (precision). fp16 = zyada precision, kam range. bf16 = fp32 jitni range, kam precision: training ka default.</li>
      <li>Quantize: q = round(w / scale) + zero_point. Dequantize: ŵ = scale × (q - zero_point). Symmetric: zero_point = 0.</li>
      <li>Bits kam = galti zyada: int8 MSE 0.000011, int4 0.005713, naive 2-bit 0.269713 (hamare 8 weights pe).</li>
      <li>Outliers per-tensor scale ko bigaadte hain. Group-wise scales (64/128) ya AWQ/GPTQ jaise smart methods bachate hain.</li>
      <li>PTQ = training ke baad, sasta (GPTQ, AWQ, GGUF). QAT = training mein hi quantization (BitNet), mehnga lekin bahut kam bits pe behtar.</li>
      <li>Decide: training bf16; serving 8-bit ya 4-bit weight-only; laptop GGUF Q4_K_M; 2-bit sirf eval ke baad.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Memory 2× (8-bit) se ~4× (4-bit) kam: bada model chhote GPU pe', 'Tokens/sec zyada (kam bytes padhne), chhote batch pe khaas kar', 'Bachi memory KV cache aur zyada users ke liye', 'Laptop/phone pe local models possible', 'Sasta serving'], costs: ['Rounding error: kam bits pe quality girti hai, 2-bit pe tezi se', 'Outliers ke liye group scales, mixed precision ya smart methods chahiye (complexity)', 'Calibration data asli use jaisa na ho to chhupi girawat', 'Har hardware har format tez nahi chalata (FP8 ke liye naye GPU)', 'QAT mehnga; PTQ bahut kam bits pe kamzor'] },
    { type: 'think', questions: [
      { q: 'Ek 13B model int4 (group 128) mein kitni memory lega? 24 GB GPU pe chalega?', a: '13 × 10⁹ × 4.125 / 8 ≈ 6.7 GB. Haan, aaraam se: ~17 GB KV cache, batching aur runtime ke liye bachega.' },
      { q: 'bf16 mein 1 + 0.001 = 1 kyun? Kya isse training mein dikkat hogi?', a: 'bf16 ke 7 mantissa bits hain, to 1 ke paas do numbers ka farak 2⁻⁷ = 0.0078. 0.001 usse chhota hai, round hoke gayab. Isliye optimizer apni master copy fp32 mein rakhta hai: chhote updates fp32 mein jodte hain, phir bf16 copy banate hain.' },
      { q: 'Per-tensor int8 achha chala, lekin per-tensor int4 pe model toot gaya. Kyun?', a: 'int8 mein 255 levels hain, to outlier ke baad bhi step chhota rehta hai. int4 mein sirf 15 levels: outlier ke hisaab se scale bada, aur chhote weights zero ho jaate hain. Fix: group-wise scales (64/128), ya AWQ/GPTQ.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'bf16 aur fp16 dono 16-bit hain. bf16 training mein kyun pasand hai?', options: ['Zyada precision', 'fp32 jitni range (8 exponent bits), to overflow/underflow kam', 'Kam memory'], answer: 1, explain: 'fp16 max 65,504 hai; bf16 ki range fp32 jaisi. Precision kam, lekin training ke liye range zyada important.' },
      { q: 'Symmetric int4, absmax = 2.10. Scale kya hoga, aur 0.88 ka q?', options: ['scale 0.3, q = 3', 'scale 0.14, q = 6', 'scale 2.1, q = 0'], answer: 0, explain: 'scale = 2.10/7 = 0.3. 0.88/0.3 = 2.93 → round → 3. Dequant 0.9.' },
      { q: 'Asymmetric quantization mein zero-point ka kaam?', options: ['Outliers hatana', 'Real 0.0 kis integer pe map ho, taaki range poori use ho', 'Bits kam karna'], answer: 1, explain: 'Range min se max tak shift hoti hai; zero-point batata hai real zero kahan hai.' },
      { q: '70B model ke weights int4 (group 128) mein lagbhag?', options: ['~9 GB', '~36 GB', '~140 GB'], answer: 1, explain: '70 × 10⁹ × 4.125 / 8 ≈ 36.1 GB. 140 GB bf16 hai.' },
      { q: 'GPTQ aur QAT mein main farak?', options: ['GPTQ training ke baad quantize karta hai (PTQ); QAT training ke dauraan quantization simulate karta hai', 'GPTQ sirf 8-bit hai', 'QAT ko calibration data nahi chahiye isliye ye sasta hai'], answer: 0, explain: 'PTQ tez aur sasta; QAT mehnga lekin bahut kam bits pe behtar.' },
    ]},
    { type: 'sources', items: [
      { title: 'FP8 Formats for Deep Learning', publisher: 'Micikevicius et al. (NVIDIA, Arm, Intel), arXiv 2209.05433', year: 2022, url: 'https://arxiv.org/abs/2209.05433', used: 'E4M3 and E5M2 encodings; E4M3 has no infinities (max 448), E5M2 follows IEEE conventions (max 57,344). Max values recomputed in our script.' },
      { title: 'BFloat16: The secret to high performance on Cloud TPUs', publisher: 'Google Cloud blog', official: true, year: 2019, url: 'https://cloud.google.com/blog/products/ai-machine-learning/bfloat16-the-secret-to-high-performance-on-cloud-tpus', used: 'bf16 layout (1/8/7), same range as fp32, why range matters more than precision for training.' },
      { title: 'QLoRA: Efficient Finetuning of Quantized LLMs', publisher: 'Dettmers et al., arXiv 2305.14314', year: 2023, url: 'https://arxiv.org/abs/2305.14314', used: 'Absmax block-wise quantization formula, NF4, double quantization overhead.' },
      { title: 'LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale', publisher: 'Dettmers et al., arXiv 2208.07339', year: 2022, url: 'https://arxiv.org/abs/2208.07339', used: 'Emergent outlier features in large models; mixed-precision decomposition.' },
      { title: 'GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers', publisher: 'Frantar et al., arXiv 2210.17323', year: 2022, url: 'https://arxiv.org/abs/2210.17323', used: 'One-shot weight quantization with approximate second-order info; 3-4 bit; 175B in ~4 GPU-hours.' },
      { title: 'AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration', publisher: 'Lin et al. (MIT), arXiv 2306.00978', year: 2023, url: 'https://arxiv.org/abs/2306.00978', used: 'Protecting ~1% salient weight channels using activation statistics.' },
      { title: 'The Era of 1-bit LLMs: All Large Language Models are in 1.58 Bits (BitNet b1.58)', publisher: 'Ma et al. (Microsoft), arXiv 2402.17764', year: 2024, url: 'https://arxiv.org/abs/2402.17764', used: 'Ternary {-1, 0, +1} weights trained from scratch (QAT extreme).' },
      { title: 'gpt-oss-120b & gpt-oss-20b Model Card', publisher: 'OpenAI, arXiv 2508.10925', year: 2025, url: 'https://arxiv.org/abs/2508.10925', used: 'MoE weights in MXFP4 (4.25 bits/param), 120B fits a single 80 GB GPU.' },
      { title: 'llama.cpp (GGUF format and quantization types)', publisher: 'ggml-org (GitHub)', official: true, url: 'https://github.com/ggml-org/llama.cpp', used: 'GGUF as the single-file format for local inference; Q4_K_M style block quant types.' },
    ]},
  ],
});
