/*
  ai-quantization (English twin). Same numbers as the Hinglish file (scratchpad/a3/quant_math.js, fl.js).
*/
Lesson.register({
  id: 'ai-quantization',
  title: 'Precision and quantization (32, 16, 8, 4, 2 bit)',
  minutes: 32,
  summary: `How many bits should each of a model's billions of weights use: 32, 16, 8, 4 or 2? Fewer bits = less memory and more speed, but a little error. In this lesson you will toggle the bits of a float (sign, exponent, mantissa) yourself, do the quantize/dequantize maths by hand with a scale and zero-point, and calculate which GPU a 7B or 70B model will fit on.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `An LLM is just a huge pile of billions of numbers. Each number is kept in computer memory as some "bits" (0 or 1).<br>More bits means a more exact number, but also more memory. A 70B model in 16-bit is 140 GB: it does not fit on one GPU.<br>Quantization = storing each number in fewer bits by "rounding" it, like writing 3.14159 as 3.1. Up to 4 times less memory, a faster model, and a small error.<br>In this lesson you will flip bits yourself, do the rounding maths by hand, and see when the error stays small and when it breaks the model.` },
    { type: 'h2', text: 'Problem: a 70B model, 140 GB, one GPU' },
    { type: 'p', html: `xyz Assistant now wants to run an open-weights model on its own servers (so data does not leave, and the API bill is lower). The team has GPUs with 24 GB. The simple formula for a model's memory:` },
    { type: 'callout', tone: 'term', title: 'New word: bit and byte', html: `<strong>What it is:</strong> a <strong>bit</strong> = the smallest piece of memory, just 0 or 1. A <strong>byte</strong> = 8 bits. n bits can make 2ⁿ different patterns. 2 bits: 00, 01, 10, 11 = 4 patterns. 4 bits = 16 patterns. 8 bits = 256.<br><strong>Example:</strong> the 4 bits <code>0101</code> = 0×8 + 1×4 + 0×2 + 1×1 = <strong>5</strong>.<br><strong>Why we need it:</strong> every weight of a model is kept in some number of bits. "16-bit model" = each weight is 16 bits = 2 bytes. Fewer bits = less memory.<br><strong>Without it:</strong> names like "4-bit", "bf16" and "int8" would feel like magic. All of them just say how many bits one number uses and what those bits mean.` },
    { type: 'code', text: `memory (bytes) = parameters × bytes per parameter

7B  model, 16-bit (2 bytes):   7 × 10⁹ × 2 = 14 GB      → fits a 24 GB GPU
70B model, 16-bit (2 bytes):  70 × 10⁹ × 2 = 140 GB     → even 2 × 80 GB GPUs are not enough
70B model,  4-bit (0.5 byte): 70 × 10⁹ × 0.5 = 35 GB    → fits one 48 GB GPU` },
    { type: 'p', html: `And it is not only memory. When an LLM generates tokens one by one, the whole set of weights must be read from GPU memory for every token. So at small batch sizes the speed is often limited by <em>memory bandwidth</em>: with weights half the bytes, each token comes roughly twice as fast (an upper bound). Fewer bits = less memory + more tokens/sec. The price: a little accuracy. This trade-off is what <strong>quantization</strong> is about.` },
    { type: 'callout', tone: 'term', title: 'New word: precision', html: `<strong>What it is:</strong> how finely a number is stored. More bits = finer detail. Like writing π as 3.14159265 (high precision) vs 3.1 (low precision).<br><strong>Why we need it:</strong> each format (32, 16, 8, 4 bit) has a different precision. Without understanding this you cannot tell how much error there will be.<br><strong>Without it:</strong> you will see "fewer bits = cheaper", but not how much quality you lose.` },
    { type: 'callout', tone: 'term', title: 'New word: quantization and dequantization', html: `<strong>What it is:</strong> <strong>Quantization</strong> = mapping high-precision numbers (like 16-bit) onto fewer bits (8, 4, 2). Like turning a smooth slider into one with only a few fixed steps: every value moves to the nearest step. <strong>Dequantization</strong> = turning that step back into a number close to the original.<br><strong>Why we need it:</strong> to bring a 70B model from 140 GB down to 35 GB, so it runs on one GPU and runs faster.<br><strong>Without it:</strong> big models only on expensive multi-GPU servers. A local model on a laptop would not even be a dream.<br><strong>Example:</strong> if the steps are 0.3 apart (0, 0.3, 0.6, 0.9...), then 0.88 is stored as 0.9. Error 0.02.` },
    { type: 'callout', tone: 'term', title: 'New word: memory bandwidth', html: `<strong>What it is:</strong> how many GB per second a GPU can read from its memory. For example a gaming GPU does ~1,000 GB/s.<br><strong>Why we need it:</strong> for every new token the whole set of weights must be read. 14 GB of weights at 1,000 GB/s → at least 14 ms per token, so at most ~71 tokens/sec.<br><strong>Without it (if you do not understand it):</strong> you will think the GPU's calculation speed is everything, when at small batch sizes the real limit is reading from memory. That is why 4-bit weights = 4 times less reading = faster answers.` },
    { type: 'h2', text: 'From bits to numbers: integers' },
    { type: 'p', html: `n bits can make 2ⁿ different patterns. In integers (whole numbers, no decimal point) each pattern is one whole number. "Signed" = negative numbers too, so half the patterns are for negatives:` },
    { type: 'table', head: ['Format', 'Bits', 'How many values', 'Range (signed)'], rows: [
      ['int8', '8', '256', '-128 to 127'],
      ['int4', '4', '16', '-8 to 7'],
      ['int2 / 2-bit', '2', '4', '-2 to 1 (or 4 custom levels)'],
      ['Ternary ("1.58-bit")', '~1.58', '3', '-1, 0, +1 (log₂3 ≈ 1.58 bits)'],
    ]},
    { type: 'p', html: `Problem: weights like 0.42 or -1.27 are not integers. To store them as integers we need a <strong>scale</strong> (the maths is below). First let us see how floats are built, because training and 16-bit models use floats.` },
    { type: 'h2', text: 'Floats from the inside: sign, exponent, mantissa' },
    { type: 'callout', tone: 'term', title: 'New word: float (floating-point number)', html: `<strong>What it is:</strong> a way to keep numbers with decimals (0.42, -1.27, 70000) in bits. "Floating" because the decimal point can move: the same format can hold 0.000001 and also 1,000,000.<br><strong>Why we need it:</strong> weights, gradients and activations are all decimal numbers, and their sizes vary a lot.<br><strong>Without it:</strong> with only integers, a weight like 0.42 could not be stored at all, or one fixed decimal position could not fit both big and small numbers.` },
    { type: 'p', html: `<strong>First, school-style scientific notation:</strong> 6,500 = 6.5 × 10³. One number (6.5) and one power (3). A computer does exactly this, just with powers of 2 instead of 10: <code>6.5 = 1.625 × 2²</code>. The power tells how big the number is. The 1.625 in front gives the fine detail. A float stores a number in three parts like this, for example <code>-1.5 × 2³</code>:` },
    { type: 'code', text: `value = (-1)^sign × (1 + mantissa/2^M) × 2^(exponent - bias)

sign      : 1 bit. 0 = positive, 1 = negative
exponent  : E bits. How BIG or SMALL the number is (range). bias = 2^(E-1) - 1
mantissa  : M bits. How FINE the number is (precision). The leading "1." comes for free

Example fp16, 6.5:  6.5 = 1.625 × 2²
  sign = 0, exponent = 2 + 15 = 17 = 10001, mantissa = 0.625 × 1024 = 640 = 1010000000
  bits = 0 10001 1010000000` },
    { type: 'callout', tone: 'term', title: 'New word: exponent, mantissa, bias (range vs precision)', html: `<strong>What it is:</strong> the <strong>exponent</strong> = the power-of-2 part. It decides how big or small a number can be: this is the <strong>range</strong>. The <strong>mantissa</strong> (or fraction) = the "1.xxx" part in front. It decides how small the gap between two neighbouring numbers can be: this is the <strong>precision</strong>. The <strong>bias</strong> = a fixed number subtracted from the stored exponent, so that negative powers (very small numbers) can also be made.<br><strong>Example (fp16, 6.5):</strong> power 2, bias 15 → stored exponent 17 = <code>10001</code>. Mantissa 0.625 → 0.625 × 1024 = 640.<br><strong>Why we need it:</strong> each format (fp16, bf16, fp8) splits its bits between exponent and mantissa differently. That is their real difference.<br><strong>Without it:</strong> you will not understand why 70000 becomes infinity in fp16 but not in bf16.<br><strong>Two special cases:</strong> all exponent bits 0 = <strong>subnormal</strong> (numbers very close to zero), all bits 1 = infinity/NaN ("not a number"), depending on the format.` },
    { type: 'image', src: 'assets/img/ai-quantization/float32-layout.svg', maxWidth: 600, alt: 'The 32 bits of a 32-bit float: 1 sign bit, 8 exponent bits, 23 fraction (mantissa) bits, for the number 0.15625', caption: 'A real fp32 layout: the number 0.15625 = 1.25 × 2⁻³. Sign 0 (positive), exponent 01111100 = 124 (124 - 127 = -3), fraction 0100... (0.25). Each of the three parts has its own colour.', credit: { text: 'Stannered (vectorization), Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Float_example.svg', license: 'CC BY-SA 3.0' } },
    { type: 'table', head: ['Format', 'Sign / Exp / Mantissa', 'Bias', 'Max value', 'Spacing near 1', 'Where it is used'], rows: [
      ['fp32', '1 / 8 / 23', '127', '~3.40 × 10³⁸', '~1.2 × 10⁻⁷', 'The old default for training, optimizer states'],
      ['fp16', '1 / 5 / 10', '15', '65,504', '0.000977', 'Inference, older mixed-precision training (with loss scaling)'],
      ['bf16 (bfloat16)', '1 / 8 / 7', '127', '~3.39 × 10³⁸', '0.0078', 'Today\'s default for training + inference; range like fp32'],
      ['fp8 E4M3', '1 / 4 / 3', '7', '448', '0.125', 'Training/inference on H100+ GPUs (weights, activations)'],
      ['fp8 E5M2', '1 / 5 / 2', '15', '57,344', '0.25', 'Gradients (need more range)'],
    ], caption: 'We computed all the numbers with a script. bf16 = the top 16 bits of fp32; Google made it for TPUs (Google Cloud blog, 2019). The FP8 formats come from a 2022 paper by NVIDIA, Arm and Intel.' },
    { type: 'h3', text: 'Bit-layout lab' },
    { type: 'p', html: `Pick a format, type any number, or click any bit to flip it. See how the number is built, and how much error that format adds. Try: 0.1 in every format, 70000 in fp16 vs bf16, 1.001 in bf16, 500 in E4M3.` },
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
        if (E > mE || (E === mE && M > mM)) return ie ? { s, E: 2 ** e - 1, M: 0, o: 'overflow → infinity' } : { s, E: mE, M: mM, o: 'out of range → ' + mx + ' (saturated)' };
        return { s, E, M, o: '' };
      };
      el.innerHTML = `<div class="chips bl-f" style="padding:0 0 8px">${Object.keys(FM).map(k => `<button type="button" class="chip" data-k="${k}">${FM[k][3]}</button>`).join('')}</div>
        <label>Type a number <input class="bl-x" type="number" step="any" value="0.1" style="width:160px"></label>
        <div class="bl-bits" style="display:flex;flex-wrap:wrap;gap:3px;margin:12px 0"></div>
        <div style="font-size:13px;color:var(--ink-3)"><span style="color:var(--red)">■</span> sign &nbsp; <span style="color:var(--amber)">■</span> exponent &nbsp; <span style="color:var(--accent)">■</span> mantissa (click = flip)</div>
        <pre class="ascii bl-calc" style="white-space:pre-wrap;font-size:13px"></pre>
        <div class="stats"><div class="stat"><span>Stored value</span><strong class="bl-v" style="font-size:16px;word-break:break-all"></strong></div><div class="stat"><span>Error vs your number</span><strong class="bl-e" style="font-size:16px"></strong></div></div>`;
      const draw = () => {
        const [e, m, ie] = FM[fk], b = 2 ** (e - 1) - 1, v = dec(e, m, ie, st.s, st.E, st.M);
        const bits = [st.s, ...st.E.toString(2).padStart(e, '0').split('').map(Number), ...st.M.toString(2).padStart(m, '0').split('').map(Number)];
        el.querySelector('.bl-bits').innerHTML = bits.map((x, i) => { const c = i === 0 ? 'var(--red)' : i <= e ? 'var(--amber)' : 'var(--accent)'; return `<button type="button" data-i="${i}" style="width:24px;height:30px;padding:0;border-radius:4px;border:2px solid ${c};background:${x ? c : 'var(--surface)'};color:${x ? 'var(--surface)' : 'var(--ink)'};font:600 13px var(--f-mono);cursor:pointer">${x}</button>`; }).join('');
        el.querySelectorAll('.bl-bits button').forEach(btn => btn.addEventListener('click', () => {
          const i = +btn.dataset.i;
          if (i === 0) st.s ^= 1; else if (i <= e) st.E ^= 1 << (e - i); else st.M ^= 1 << (m - (i - e));
          st.o = 'a bit was flipped'; draw();
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
    { type: 'h2', text: 'Range vs precision: the fight between fp16 and bf16' },
    { type: 'p', html: `Both are 16 bits, but they split the bits differently:` },
    { type: 'compare',
      left: { title: 'fp16 (5 exp, 10 mantissa)', html: `• More precision: 1.001 → <code>1.0009765625</code> (close)<br>• Less range: max 65,504. <code>70000 → Infinity</code> (overflow!)<br>• Very small gradients (like 10⁻⁸) become zero (underflow), so fp16 training needed the <strong>loss scaling</strong> trick` },
      right: { title: 'bf16 (8 exp, 7 mantissa)', html: `• Range as big as fp32: <code>70000 → 70144</code> (a little off, but not infinity)<br>• Less precision: <code>1.001 → 1</code> (the next number after 1 is 1.0078)<br>• Easy to convert from fp32 (just cut off the lower 16 bits), stable training. That is why it is today's default for LLM training` },
    },
    { type: 'callout', tone: 'term', title: 'New word: overflow, underflow, loss scaling', html: `<strong>What it is:</strong> <strong>Overflow</strong> = the number got bigger than the format's max value (infinity or garbage). Like 70000 in fp16. <strong>Underflow</strong> = so small that it became zero. Like 10⁻⁸ in fp16. <strong>Loss scaling</strong> = in fp16 training, multiply the loss by a big number (like 1024) to bring small gradients into the representable range, then divide back before the update.<br><strong>Why we need it:</strong> in training, a single infinity fills the whole model with NaN, and gradients that became zero stop the learning.<br><strong>Without it:</strong> fp16 training would suddenly die halfway with "loss = NaN". bf16 ended this trouble.` },
    { type: 'p', html: `Google explained exactly this in its 2019 Cloud TPU blog: for neural networks <strong>range turned out to matter more</strong>: training averages out small precision errors, but one infinity ruins the whole training. FP8 follows the same thinking: E4M3 (more precision) for the weights/activations of the forward pass, E5M2 (more range) for gradients. Going even lower: <strong>FP4 (E2M1)</strong> has only 16 values. So FP4 always comes with a shared scale: for example in <strong>MXFP4</strong> a group of 32 numbers shares one 8-bit scale, so the effective size is 4 + 8/32 = <strong>4.25 bits</strong>/param. OpenAI's gpt-oss models (2025) kept their MoE weights (<strong>MoE</strong> = Mixture of Experts: many "expert" FFNs inside the model, and each token uses only a few of them) in MXFP4, which lets the 120B model run on one 80 GB GPU.` },
    { type: 'h2', text: 'The maths of integer quantization: scale and zero-point' },
    { type: 'p', html: `Now real quantization. We have 8 weights (really billions, but the maths is the same):` },
    { type: 'code', text: `w = [0.42, -1.27, 0.03, 0.88, -0.35, 2.10, -0.61, 0.15]` },
    { type: 'p', html: `The formula (affine quantization), the same in every deep learning library:` },
    { type: 'code', text: `quantize:    q  = clamp( round(w / scale) + zero_point , q_min , q_max )
dequantize:  ŵ  = scale × (q - zero_point)
error        = ŵ - w

clamp(v, lo, hi) = keep v between lo and hi` },
    { type: 'callout', tone: 'term', title: 'New word: scale and zero-point', html: `<strong>What it is:</strong> the <strong>scale</strong> = how much real value one integer step is worth (a float number, one per tensor or group). The <strong>zero-point</strong> = the integer that stands for the real 0.0. In symmetric quantization the zero-point = 0.<br><strong>Small example:</strong> scale = 0.3, zero-point = 0. Real 0.88 → 0.88 / 0.3 = 2.93 → round → q = <strong>3</strong>. Back: 3 × 0.3 = <strong>0.9</strong>. Error 0.02.<br><strong>Why we need it:</strong> integers are only whole numbers (-7..7). The scale "stretches" them over the real range of the weights.<br><strong>Without it:</strong> storing 0.42 in int4 would make no sense: it would just become 0.` },
    { type: 'callout', tone: 'term', title: 'New word: MSE (mean squared error)', html: `<strong>What it is:</strong> one number for the quantization error. Take each weight's error (dequant - original), square it, then average. Example: errors 0.1 and -0.2 → (0.01 + 0.04) / 2 = <strong>0.025</strong>.<br><strong>Why we need it:</strong> so we can compare different settings (int8 vs int4, symmetric vs asymmetric) with one number. Squaring makes big errors "hurt" more.<br><strong>Without it:</strong> only a guess by eye: "looks fine to me".` },
    { type: 'callout', tone: 'term', title: 'New word: symmetric (absmax) and asymmetric (min-max)', html: `<strong>What it is:</strong> two ways to choose the scale. <strong>Symmetric</strong>: take the biggest |value| (the <strong>absmax</strong>), and split the integer range equally on both sides of zero. Zero-point = 0. <strong>Asymmetric</strong>: spread the real range from min to max over the integers, and keep a zero-point.<br><strong>Example:</strong> weights from -1.27 to 2.10. Symmetric int4: scale = 2.10 / 7 = 0.3, range -2.1..2.1 (the space from -1.27 down to -2.1 is wasted). Asymmetric: range -1.27..2.10, nothing wasted.<br><strong>Why we need it:</strong> with few bits every level is precious. The right method = less error.<br><strong>Without it:</strong> either wasted levels, or extra work for no reason.` },
    { type: 'h3', text: 'Symmetric (absmax), int8' },
    { type: 'steps', items: [
      { t: 'Scale', d: 'absmax = 2.10. The int8 symmetric range is -127..127. <code>scale = 2.10 / 127 = 0.016535</code>.' },
      { t: 'Quantize', d: '0.42 / 0.016535 = 25.4 → <strong>25</strong>; -1.27 → -76.8 → <strong>-77</strong>; 0.03 → 1.81 → <strong>2</strong>; 0.88 → 53.2 → <strong>53</strong>; -0.35 → -21.2 → <strong>-21</strong>; 2.10 → <strong>127</strong>; -0.61 → -36.9 → <strong>-37</strong>; 0.15 → 9.07 → <strong>9</strong>.' },
      { t: 'Dequantize', d: '25 × 0.016535 = 0.4134; -77 × 0.016535 = -1.2732; ... Max error 0.0066, mean squared error (MSE) 0.000011. Very small.' },
    ]},
    { type: 'h3', text: 'Symmetric, int4 (only -7..7)' },
    { type: 'steps', items: [
      { t: 'Scale', d: '<code>scale = 2.10 / 7 = 0.3</code>. Now each step is 0.3!' },
      { t: 'Quantize', d: '0.42/0.3 = 1.4 → 1; -1.27/0.3 = -4.23 → -4; 0.03/0.3 = 0.1 → 0; 0.88/0.3 = 2.93 → 3; -0.35/0.3 = -1.17 → -1; 2.10/0.3 = 7; -0.61/0.3 = -2.03 → -2; 0.15/0.3 = 0.5 → 1 (round half up). q = <code>[1, -4, 0, 3, -1, 7, -2, 1]</code>.' },
      { t: 'Dequantize', d: 'q × 0.3 = <code>[0.3, -1.2, 0, 0.9, -0.3, 2.1, -0.6, 0.3]</code>. Max error 0.15 (the weight 0.15 became 0.3: double!). MSE 0.005713, ~500 times more than int8.' },
    ]},
    { type: 'h3', text: 'Symmetric, 2-bit: almost everything is lost' },
    { type: 'p', html: `In symmetric 2 bits only -1, 0, +1 are useful (q_max = 1). scale = 2.10. q = <code>[0, -1, 0, 0, 0, 1, 0, 0]</code>, dequant = <code>[0, -2.1, 0, 0, 0, 2.1, 0, 0]</code>. Five weights became zero, MSE 0.269713. That is why naive 2-bit does not work; 2-bit needs special methods and training (below).` },
    { type: 'h3', text: 'Asymmetric (min-max), 4-bit' },
    { type: 'p', html: `If the values are not spread equally on both sides of zero (here -1.27 to 2.10), part of the symmetric range is wasted. Asymmetric unsigned 4-bit (0..15) uses the whole range:` },
    { type: 'code', text: `scale      = (max - min) / (15 - 0) = (2.10 - (-1.27)) / 15 = 3.37 / 15 = 0.224667
zero_point = round(0 - min/scale) = round(1.27 / 0.224667) = round(5.65) = 6

0.42  → round(1.87) + 6 = 8        dequant: (8 - 6) × 0.224667  =  0.4493
-1.27 → round(-5.65) + 6 = 0       dequant: (0 - 6) × 0.224667  = -1.3480
2.10  → round(9.35) + 6 = 15       dequant: (15 - 6) × 0.224667 =  2.0220
q = [8, 0, 6, 10, 4, 15, 3, 7]     MSE 0.004227 (symmetric int4: 0.005713)` },
    { type: 'p', html: `On this same data, asymmetric gave less error, because not a single level was wasted. The price: one extra number (the zero-point) stored with each group, and a little extra work in the matmul (matrix multiplication). For activations (for example all positive after ReLU; ReLU = a function that turns negatives into 0) asymmetric is often better; for weights (spread symmetrically around zero) symmetric is simple and enough.` },
    { type: 'callout', tone: 'term', title: 'New word: per-tensor vs per-group (granularity)', html: `<strong>What it is:</strong> how many weights share one scale. <strong>Per-tensor</strong> = one scale for the whole matrix. <strong>Per-group</strong> = each small group (like 4, 64 or 128 weights) has its own scale.<br><strong>Why we need it:</strong> one big <strong>outlier</strong> (a value much bigger than all the rest) makes the per-tensor scale big, and all the other small weights fall to zero. In a group, the outlier spoils only its own group.<br><strong>Without it:</strong> the model can break at 4-bit (see it yourself in the lab below). The price: each group's scale must also be stored (a little extra memory).` },
    { type: 'h3', text: 'Quantization error lab' },
    { type: 'p', html: `Change the bits, symmetric/asymmetric, and per-tensor vs group of 4. Press "Outlier": one weight becomes 25 (LLMs really do have some big outliers like this). See what happens to all the other weights with per-tensor, and how groups save them.` },
    { type: 'custom', render(el) {
      const DEF = [0.42, -1.27, 0.03, 0.88, -0.35, 2.10, -0.61, 0.15];
      let w = DEF.slice(), bits = 4, mode = 'sym', gran = 't';
      const td = 'padding:3px 6px;border:1px solid var(--line);text-align:right;font:13px var(--f-mono)';
      const chips = (cls, opts, cur) => `<div class="chips ${cls}" style="padding:0 0 8px">` + opts.map(([k, l]) => `<button type="button" class="chip${k === cur ? ' on' : ''}" data-k="${k}">${l}</button>`).join('') + '</div>';
      el.innerHTML = `<div class="qe-c"></div><div class="qe-in" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="margin-top:8px"><button type="button" class="btn small ghost qe-reset">Example values</button> <button type="button" class="btn small ghost qe-out">Outlier: w₆ = 25</button></div>
        <div style="overflow-x:auto;margin-top:10px"><table class="qe-t" style="border-collapse:collapse;min-width:540px"></table></div>
        <div class="stats"><div class="stat"><span>MSE</span><strong class="qe-mse"></strong></div><div class="stat"><span>Max |error|</span><strong class="qe-max"></strong></div><div class="stat"><span>Scale(s)</span><strong class="qe-s" style="font-size:15px"></strong></div><div class="stat"><span>Bits per weight (incl. fp16 scale/zp)</span><strong class="qe-b"></strong></div></div>
        <div class="calc-note">Group of 4 = one scale for the first 4 weights, a separate one for the other 4. Real models use groups of 32, 64 or 128. Overhead: one fp16 scale (16 bits) per group, plus a zero-point for asymmetric (assumed fp16 here).</div>`;
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
    { type: 'p', html: `With the outlier, int4 symmetric, per-tensor: scale = 25/7 = 3.57, so all the other weights (all smaller than ±1.3) become <strong>zero</strong>. MSE 0.385212. Switch to groups of 4: the outlier spoils only the second group, and the first group stays fine with its own scale (1.27/7). MSE 0.06525. But the bits per weight went up: 2 scales for 8 weights. In real models an fp16 scale per group of 128 = only 16/128 = 0.125 extra bits.` },
    { type: 'h2', text: 'Granularity: how many weights should share one scale?' },
    { type: 'table', head: ['Granularity', 'Weights per scale', 'Accuracy', 'Overhead'], rows: [
      ['Per-tensor', 'The whole matrix (millions)', 'The lowest (one outlier spoils everything)', 'Almost zero'],
      ['Per-channel (per-row)', 'One row/column of the matrix', 'Good; the standard for int8', 'Very small'],
      ['Per-group / block-wise', '32, 64, 128 weights', 'The best; needed for 4-bit and below', 'Group 128 + fp16 scale = +0.125 bits; QLoRA block 64 = +0.5 (0.127 after DQ)'],
    ]},
    { type: 'h2', text: 'What to quantize: weights, activations, KV cache' },
    { type: 'list', items: [
      '<strong>Weight-only</strong> (a name like W4A16: weights 4-bit, activations 16-bit; activations = the numbers flowing between layers): weights are stored and loaded in 4-bit, and dequantized before the <strong>matmul</strong> (matrix multiplication). Saves memory and bandwidth. The most common way for local / small-batch inference.',
      '<strong>Weights + activations</strong> (W8A8, FP8): the matmul itself runs in low precision, so the GPU\'s fast int8/fp8 units are used. For big-batch serving it saves compute too. The hard part: activations have big outliers. The LLM.int8() paper (Dettmers et al., 2022) showed that models bigger than ~6.7B have very large values in a few feature dimensions; those must be kept separately in 16-bit and the rest done in int8.',
      '<strong>KV cache</strong> quantization: with long context the KV cache takes a lot of memory (see <a href="#/ai-multihead">KV cache</a>). Keeping it in 8-bit or fp8 allows more users or longer context on one GPU.',
    ]},
    { type: 'h2', text: 'PTQ vs QAT' },
    { type: 'compare',
      left: { title: 'PTQ (Post-Training Quantization)', html: `Take a trained model and quantize its weights. No training needed; it is done in hours or minutes. A little <strong>calibration data</strong> (a few hundred sample texts) is used to choose the scales or the rounding. Good at 8-bit and 4-bit. At 3-bit and below the quality starts to drop. GPTQ, AWQ, bitsandbytes and llama.cpp quants are all PTQ.` },
      right: { title: 'QAT (Quantization-Aware Training)', html: `During training (or fine-tuning), "fake quantize" in the forward pass, so the model learns to live with the rounding error. Expensive (it needs training), but quality survives even at very few bits. An extreme example: <strong>BitNet b1.58</strong> (2024): weights only -1, 0, +1, trained like that from the start.` },
    },
    { type: 'callout', tone: 'term', title: 'New word: calibration data', html: `<strong>What it is:</strong> a few hundred representative inputs (like xyz\'s typical questions) that are run through the model to measure the range of the activations and which weights matter most.<br><strong>Why we need it:</strong> with it the quantizer picks better scales and rounding: more care for the important weights.<br><strong>Without it (or with the wrong data):</strong> if the calibration data is very different from the real use (for example only English, while users speak Hinglish), quality can quietly drop on that real use. One failure in the diagram below shows exactly this.` },
    { type: 'h3', text: 'Popular methods, one line each' },
    { type: 'table', head: ['Name', 'What it is', 'In one line'], rows: [
      ['<strong>GPTQ</strong> (2022)', 'PTQ, weight-only, 3-4 bit', 'Quantizes one column at a time and uses second-order (Hessian: how sharply the loss curves) info to adjust the remaining weights so the layer\'s output changes less. A 175B model in ~4 GPU-hours.'],
      ['<strong>AWQ</strong> (2023)', 'PTQ, weight-only, 4 bit', 'Looks at the activations to find the ~1% "salient" (most important) weight channels and protects them with scaling. Small calibration set, generalizes well.'],
      ['<strong>bitsandbytes</strong>', 'Library', 'LLM.int8() (outliers in 16-bit) and NF4/FP4 4-bit. QLoRA runs on it (see the <a href="#/ai-lora">LoRA lesson</a>, which has the NF4 worked example).'],
      ['<strong>GGUF</strong> (llama.cpp)', 'File format + quant types', 'Weights + metadata in one file, for running on CPU/Mac/laptop. Types like Q8_0, Q4_K_M, Q2_K: block-wise quants; the "K" ones use smarter mixed scales.'],
      ['<strong>FP8 / MXFP4</strong>', 'Hardware float formats', 'New GPUs (H100, Blackwell) have hardware units built for them; used in both training and serving.'],
      ['<strong>BitNet b1.58</strong> (2024)', 'QAT, ternary', 'Weights {-1, 0, +1}: the matmul needs only adds/subtracts instead of multiplies.'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: NF4 (a reminder)', html: `<strong>What it is:</strong> a 4-bit format whose 16 levels are not equally spaced, but sit at the quantiles of the normal distribution, because weights are spread like a bell curve.<br><strong>Why we need it:</strong> less error than uniform int4 in the same 4 bits. QLoRA\'s base is stored in it.<br><strong>Without it:</strong> near zero (where most weights are) there would be too few levels, and more error.<br>The full derivation and a worked block are in <a href="#/ai-lora">LoRA and QLoRA</a>.` },
    { type: 'h2', text: 'xyz Assistant: quantize, then serve' },
    { type: 'flow', height: 300, title: 'The PTQ pipeline and what can go wrong',
      nodes: [
        { id: 'm', label: 'bf16 model', sub: '7B, 13.5 GB', x: 90, y: 70, w: 140, kind: 'data', info: 'What it is: the trained (or LoRA-merged) model, in bf16. 6.74B params × 2 bytes ≈ 13.5 GB.' },
        { id: 'cal', label: 'Calibration', sub: 'a few 100 texts', x: 90, y: 240, w: 140, kind: 'client', info: 'What it is: calibration data, meaning representative sample inputs. The quantizer runs them through the model to see which weights/channels are important and what range the activations have.' },
        { id: 'q', label: 'Quantizer', sub: 'GPTQ / AWQ', x: 330, y: 150, w: 150, kind: 'server', info: 'What it is: a PTQ tool (like GPTQ or AWQ). It picks a scale for each group (like 128 weights) and does the rounding, trying to keep the error low.' },
        { id: 'f', label: 'int4 file', sub: '~3.5 GB + scales', x: 580, y: 70, w: 160, kind: 'cache', info: 'What it is: the quantized model file. 4-bit weights + one fp16 scale per 128 weights: 4.125 bits/param. 6.74B × 4.125 / 8 ≈ 3.5 GB.' },
        { id: 'srv', label: 'Inference server', sub: '24 GB GPU', x: 580, y: 240, w: 170, kind: 'server', info: 'What it is: the program that runs the model and answers users. Weights are loaded in 4-bit and dequantized before each matmul (weight-only). The memory left over goes to the KV cache and more users.' },
        { id: 'u', label: 'User', sub: 'xyz app', x: 330, y: 240, w: 120, kind: 'client', info: 'What it is: a user of xyz Assistant. It should make no difference to them that the model is 4-bit: the same quality, faster answers.' },
      ],
      edges: [{ a: 'm', b: 'q' }, { a: 'cal', b: 'q' }, { a: 'q', b: 'f' }, { a: 'f', b: 'srv' }, { a: 'u', b: 'srv' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Model and calibration', text: 'The bf16 model and ~a hundred representative questions go into the quantizer.', go: ['m>q', 'cal>q'], parallel: true },
          { title: 'Quantize', text: 'Group-wise 4-bit, a scale for each group. Calibration helped protect the important channels.', go: 'q>f', after: { f: { state: 'ok' } }, msg: '13.5 GB → ~3.5 GB' },
          { title: 'Load', text: 'The server loads 3.5 GB. On a 24 GB GPU ~20 GB is left for the KV cache and batching.', go: 'f>srv', after: { srv: { state: 'ok', sub: '3.5 GB used' } } },
          { title: 'Serve', text: 'The user asks a question; fewer bytes must be read for each token, so the answer is faster.', go: ['u>srv', 'res:srv>u'], msg: 'Q: "Why does my video upload fail?"  A: "The file is bigger than 2 GB..."' },
        ]},
        { name: 'Failure: per-tensor + outlier', steps: [
          { title: 'Wrong setting', text: 'Someone chose 4-bit per-tensor. One layer has one big outlier weight.', set: { q: { sub: '4-bit per-tensor', state: 'warn' } }, go: ['m>q', 'q>f'] },
          { title: 'Small weights become zero', text: 'The scale was set by the outlier, so most weights in that layer became zero (we saw this in the lab).', after: { f: { state: 'down', sub: 'broken weights' } }, focus: ['f'] },
          { title: 'Nonsense answers', text: 'The model runs, but the output repeats or makes no sense.', go: ['f>srv', 'u>srv', 'bad:srv>u'], after: { srv: { state: 'warn', sub: 'quality dropped' } } },
          { title: 'Fix', text: 'Group-wise (64/128) scales, or an outlier-aware method like AWQ/GPTQ. And run evals before deploying.', set: { q: { sub: 'group 128', state: 'ok' }, f: { state: 'ok', sub: 'fine' }, srv: { state: 'ok', sub: '24 GB GPU' } } },
        ]},
        { name: 'Failure: 2-bit greed', steps: [
          { title: 'Make it even smaller!', text: 'The team thought 2-bit = 1.7 GB, it will run on a laptop. They did naive 2-bit PTQ.', set: { q: { sub: '2-bit PTQ' } }, go: 'q>f', after: { f: { sub: '~1.8 GB', state: 'warn' } } },
          { title: 'Quality collapse', text: 'Only 4 levels per group: many weights are zero or wrong. Perplexity (how "confused" the model is about each next token; lower = better) shoots up, and the answers are broken.', go: ['u>srv', 'bad:srv>u'], after: { srv: { state: 'down', sub: 'gibberish' } } },
          { title: 'Fix', text: 'A smaller model in 4-bit is often better than a big model in 2-bit. Or QAT (like BitNet), where the model was trained with few bits.', set: { srv: { state: '', sub: '24 GB GPU' }, f: { state: 'ok', sub: 'back to 4-bit' }, q: { sub: 'GPTQ / AWQ' } } },
        ]},
        { name: 'Failure: calibration mismatch', steps: [
          { title: 'Wrong calibration', text: 'Calibration came only from English Wikipedia. xyz\'s users ask in Hinglish.', set: { cal: { state: 'warn', sub: 'English only' } }, go: 'cal>q' },
          { title: 'Quality dropped on Hinglish', text: 'The quantizer did not treat the channels needed for Hinglish as important. English benchmarks look fine, real users are unhappy.', go: ['q>f', 'f>srv', 'u>srv', 'bad:srv>u'] },
          { title: 'Fix', text: 'Keep the calibration and eval sets like the real traffic (Hinglish, xyz\'s questions).', set: { cal: { state: 'ok', sub: 'like real traffic' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Calculator: which model, at which precision, fits where?' },
    { type: 'custom', render(el) {
      const F = [['fp32', 32], ['fp16 / bf16', 16], ['int8 / fp8', 8], ['int4 (group 128, fp16 scale)', 4.125], ['NF4 + double quant', 4.127], ['3-bit (group 128)', 3.125], ['2-bit (group 128)', 2.125], ['Ternary 1.58-bit', 1.58]];
      const BW = [['Laptop', 100], ['Gaming GPU', 1000], ['Datacenter GPU', 3350]];
      let bw = 1000;
      el.innerHTML = `<div class="row2"><div><label>Model size (billion params)</label><input class="mq-p" type="number" min="0.1" step="0.1" value="7"></div>
        <div><label>Memory bandwidth</label><div class="chips mq-bw" style="padding:4px 0 0">${BW.map(([n, v]) => `<button type="button" class="chip" data-v="${v}">${n} (${v.toLocaleString('en-IN')} GB/s)</button>`).join('')}</div></div></div>
        <div class="chips mq-pre" style="padding:8px 0 0"><button type="button" class="chip" data-p="7">7B</button><button type="button" class="chip" data-p="13">13B</button><button type="button" class="chip" data-p="70">70B</button><button type="button" class="chip" data-p="405">405B</button></div>
        <div style="overflow-x:auto;margin-top:10px"><table class="mq-t" style="border-collapse:collapse;width:100%;min-width:520px;font-size:14px"></table></div>
        <div class="calc-note">Weights only. Keep 10-30% extra space for the KV cache, activations and the runtime. Tokens/sec = bandwidth ÷ size of the weights: an upper bound at batch 1 (every token has to read all the weights once); the real speed is lower. 1 GB = 10⁹ bytes.</div>`;
      const td = 'padding:5px 8px;border-bottom:1px solid var(--line);text-align:left';
      const upd = () => {
        const P = Math.max(0.1, Number(el.querySelector('.mq-p').value) || 0.1) * 1e9;
        el.querySelector('.mq-t').innerHTML = `<tr><th style="${td}">Format</th><th style="${td}">Bits/param</th><th style="${td}">Weights</th><th style="${td}">Smallest GPU that fits</th><th style="${td}">Tokens/s (max)</th></tr>` + F.map(([n, b]) => {
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
    { type: 'p', html: `For "fit" we left ~12.5% of the GPU (weights < 0.875 × memory) for the KV cache and the runtime. 7B: fp16 14 GB (a 24 GB GPU), int4 3.6 GB (easily on a 16 GB laptop GPU). 70B: fp16 140 GB (2 × 80 GB), int4 36.1 GB (one 48 GB GPU), 2-bit 18.6 GB (a 24 GB GPU, but with a quality risk). For 7B at gaming-GPU bandwidth: fp16 ~71 tokens/s max, int4 ~277 tokens/s max.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "a 4-bit model = 4 times less smart"', html: `No. The bits only say how finely each weight is stored. With good 4-bit methods (GPTQ, AWQ, NF4, Q4_K_M) the quality often stays very close to bf16. The real drop starts at ~3-bit and 2-bit. And the opposite is also true: a 4-bit version of a 70B model is often better than a bf16 version of a 13B model, and uses less memory.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "we quantized, so we will also train in 4-bit"', html: `Quantization is easy for inference. In training, small gradient updates are hard to represent at such low precision, so training happens in bf16 (with the optimizer in fp32). Even in QLoRA the base is only <em>stored</em> in 4-bit; the compute is in bf16 and the trainable LoRA weights are in bf16.` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• <strong>Training</strong>: bf16 (optimizer states fp32). FP8 training on new hardware if the framework supports it.<br>• <strong>GPU serving where quality matters most</strong>: bf16, or FP8/int8 (W8A8): almost no loss, ~2× memory saving.<br>• <strong>Tight memory, one GPU, small batch</strong>: 4-bit weight-only (AWQ/GPTQ, group 128). The default sweet spot.<br>• <strong>Laptop / CPU / Mac</strong>: start with GGUF Q4_K_M; if RAM is left over, Q5/Q6/Q8.<br>• <strong>3-bit / 2-bit</strong>: only when there is no other way, and after checking on your own eval. A smaller model in 4-bit is often better.<br>• <strong>Fine-tuning a big model on one GPU</strong>: QLoRA (NF4 base + bf16 LoRA).<br>• Always: after quantizing, run evals on your real use case (Hinglish too!).` },
    { type: 'h2', text: 'The whole picture: quantize, then serve smaller' },
    { type: 'p', html: `The top part happens once (offline). The bottom part happens for every token (runtime). Press the buttons.` },
    { type: 'diagram', title: 'Quantization: the whole picture', height: 590,
      groups: [
        { label: 'Offline: quantize once (PTQ)', x: 10, y: 20, w: 700, h: 262 },
        { label: 'Runtime: for every token', x: 10, y: 306, w: 700, h: 272 },
      ],
      nodes: [
        { id: 'bf', label: 'bf16 model', sub: '7B, 13.5 GB', x: 90, y: 80, kind: 'data', info: 'What it is: the trained model, each weight 16 bits (2 bytes). 6.74B × 2 bytes ≈ 13.5 GB. Quantization starts here.' },
        { id: 'cal', label: 'Calibration', sub: 'a few 100 texts', x: 90, y: 200, kind: 'client', info: 'What it is: sample questions like xyz\'s real traffic (Hinglish too). With them the quantizer sees which weights/channels are important and what range the activations have.' },
        { id: 'qz', label: 'Quantizer', sub: 'GPTQ / AWQ', x: 300, y: 140, w: 150, kind: 'server', info: 'What it is: the PTQ tool. It picks a scale for each group (128 weights): scale = absmax / 7 (symmetric int4), then q = round(w / scale). Outlier-aware methods protect the important weights.' },
        { id: 'file', label: 'int4 file', sub: '3.5 GB + scales', x: 540, y: 140, w: 160, kind: 'cache', info: 'What it is: the quantized model. 4-bit integers + one fp16 scale per 128 weights = 4.125 bits/param. 6.74B × 4.125 / 8 ≈ 3.5 GB (~4 times less than 13.5 GB).' },
        { id: 'eval', label: 'Eval set', sub: 'real questions', x: 300, y: 236, w: 150, kind: 'queue', info: 'What it is: a set of test questions (xyz\'s real ones, Hinglish too). After quantizing, it checks whether the quality survived or quietly dropped.' },
        { id: 'srv', label: 'Inference server', sub: '24 GB GPU', x: 90, y: 370, w: 150, kind: 'server', info: 'What it is: the program that runs the model and answers users (like vLLM or llama.cpp). At each layer it reads the weights, dequantizes them and multiplies.' },
        { id: 'deq', label: 'Dequantize', sub: 'ŵ = s × (q - z)', x: 330, y: 370, w: 150, kind: 'net', info: 'What it is: turning a 4-bit integer back into a number close to the original: scale × (q - zero_point). Example: q = 3, scale 0.3 → 0.9 (the original was 0.88).' },
        { id: 'vram', label: 'GPU memory', sub: 'int4 + scales', x: 560, y: 370, w: 150, kind: 'data', info: 'What it is: the GPU\'s own memory (VRAM). The weights live here in 4-bit: each token needs 3.5 GB to be read, not 13.5 GB. That is why it is faster.' },
        { id: 'user', label: 'xyz user', sub: 'Hinglish question', x: 90, y: 510, w: 150, kind: 'client', info: 'What it is: a user of xyz Assistant. They should not notice that the model is 4-bit: the same quality, faster answers.' },
        { id: 'mm', label: 'Matmul (bf16)', sub: 'x · ŵ', x: 330, y: 510, w: 150, kind: 'server', info: 'What it is: the layer\'s matrix multiplication. In weight-only quantization (W4A16) it happens in bf16; the dequantized weights are multiplied with the activations.' },
        { id: 'kv', label: 'KV cache', sub: '~20 GB free space', x: 560, y: 510, w: 150, kind: 'cache', info: 'What it is: a copy of the K, V of earlier tokens (multi-head lesson). On a 24 GB GPU, ~20 GB is left after 3.5 GB of weights: more users and longer context.' },
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
        { name: 'Quantize weights', text: 'bf16 weights → group-wise scale → q = round(w / scale). 13.5 GB → ~3.5 GB. Then a quality check with the eval set.', go: ['bf>qz>file', 'qz>eval'] },
        { name: 'Dequantize + matmul', text: 'At each layer, read the 4-bit weights from GPU memory, make bf16 with ŵ = scale × (q - z), then multiply with the activations.', go: ['vram>deq>mm>srv'] },
        { name: 'Calibrate', text: 'Run questions like the real traffic through the model. The quantizer sees which channels are important. Wrong calibration = a hidden drop in quality.', go: ['cal>qz>eval'] },
        { name: 'Serve smaller', text: 'Load the small file onto the GPU, and the leftover memory goes to the KV cache. The user gets faster answers because fewer bytes are read.', go: ['file>vram>kv', 'user>srv', 'mm>srv'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Memory = params × bytes per param. 70B: bf16 140 GB, int4 (group 128) ~36 GB.</li>
      <li>Float = sign + exponent (range) + mantissa (precision). fp16 = more precision, less range. bf16 = range like fp32, less precision: the default for training.</li>
      <li>Quantize: q = round(w / scale) + zero_point. Dequantize: ŵ = scale × (q - zero_point). Symmetric: zero_point = 0.</li>
      <li>Fewer bits = more error: int8 MSE 0.000011, int4 0.005713, naive 2-bit 0.269713 (on our 8 weights).</li>
      <li>Outliers spoil a per-tensor scale. Group-wise scales (64/128) or smart methods like AWQ/GPTQ save the day.</li>
      <li>PTQ = after training, cheap (GPTQ, AWQ, GGUF). QAT = quantization during training (BitNet), expensive but better at very few bits.</li>
      <li>Decide: training in bf16; serving in 8-bit or 4-bit weight-only; laptop GGUF Q4_K_M; 2-bit only after evals.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Memory 2× (8-bit) to ~4× (4-bit) smaller: a big model on a small GPU', 'More tokens/sec (fewer bytes to read), especially at small batch sizes', 'The memory saved goes to the KV cache and more users', 'Local models on laptops/phones become possible', 'Cheaper serving'], costs: ['Rounding error: quality drops with fewer bits, fast at 2-bit', 'Outliers need group scales, mixed precision or smart methods (complexity)', 'If calibration data does not match the real use, there is a hidden drop', 'Not every piece of hardware runs every format fast (FP8 needs new GPUs)', 'QAT is expensive; PTQ is weak at very few bits'] },
    { type: 'think', questions: [
      { q: 'How much memory will a 13B model need in int4 (group 128)? Will it run on a 24 GB GPU?', a: '13 × 10⁹ × 4.125 / 8 ≈ 6.7 GB. Yes, easily: ~17 GB will be left for the KV cache, batching and the runtime.' },
      { q: 'Why is 1 + 0.001 = 1 in bf16? Will this cause trouble in training?', a: 'bf16 has 7 mantissa bits, so near 1 the gap between two numbers is 2⁻⁷ = 0.0078. 0.001 is smaller than that, so it rounds away and vanishes. That is why the optimizer keeps its master copy in fp32: small updates are added in fp32, and then the bf16 copy is made.' },
      { q: 'Per-tensor int8 worked well, but the model broke with per-tensor int4. Why?', a: 'int8 has 255 levels, so even after an outlier the step stays small. int4 has only 15 levels: the scale grows to fit the outlier, and the small weights become zero. Fix: group-wise scales (64/128), or AWQ/GPTQ.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'bf16 and fp16 are both 16-bit. Why is bf16 preferred for training?', options: ['More precision', 'Range as big as fp32 (8 exponent bits), so less overflow/underflow', 'Less memory'], answer: 1, explain: 'fp16\'s max is 65,504; bf16\'s range is like fp32. Less precision, but for training range matters more.' },
      { q: 'Symmetric int4, absmax = 2.10. What is the scale, and the q of 0.88?', options: ['scale 0.3, q = 3', 'scale 0.14, q = 6', 'scale 2.1, q = 0'], answer: 0, explain: 'scale = 2.10/7 = 0.3. 0.88/0.3 = 2.93 → round → 3. Dequant 0.9.' },
      { q: 'What is the job of the zero-point in asymmetric quantization?', options: ['Removing outliers', 'Saying which integer the real 0.0 maps to, so the whole range is used', 'Reducing the bits'], answer: 1, explain: 'The range is shifted to go from min to max; the zero-point says where the real zero is.' },
      { q: 'The weights of a 70B model in int4 (group 128) are roughly?', options: ['~9 GB', '~36 GB', '~140 GB'], answer: 1, explain: '70 × 10⁹ × 4.125 / 8 ≈ 36.1 GB. 140 GB is bf16.' },
      { q: 'The main difference between GPTQ and QAT?', options: ['GPTQ quantizes after training (PTQ); QAT simulates quantization during training', 'GPTQ is only 8-bit', 'QAT needs no calibration data, so it is cheaper'], answer: 0, explain: 'PTQ is fast and cheap; QAT is expensive but better at very few bits.' },
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
