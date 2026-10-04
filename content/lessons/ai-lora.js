/*
  ai-lora. Worked numbers computed in scratchpad/a3/lora_math.js (column-vector convention h = W0·x, like the LoRA paper):
  W0 = [[0.5,-1,0,2],[1,0.5,-0.5,0],[0,1,1,-1],[-1,0,0.5,1]]   x = [1,2,0,-1]
  B (4x2) = [[0.2,0],[0,0.1],[0.1,-0.2],[-0.1,0.3]]   A (2x4) = [[1,0,-1,0.5],[0,2,1,-1]]   r = 2, alpha = 2 -> s = 1
  BA = [[0.2,0,-0.2,0.1],[0,0.2,0.1,-0.1],[0.1,-0.4,-0.3,0.25],[-0.1,0.6,0.4,-0.35]]
  W0x = [-3.5,2,3,-2]   Ax = [0.5,5]   B(Ax) = [0.1,0.5,-0.95,1.45]
  s=1: W' = [[0.7,-1,-0.2,2.1],[1,0.7,-0.4,-0.1],[0.1,0.6,0.7,-0.75],[-1.1,0.6,0.9,0.65]], h = [-3.4,2.5,2.05,-0.55] (both ways)
  s=2 (alpha=4): h = [-3.3,3,1.1,0.9]
  Init step: A0 = [[0.4,-0.1,0.2,0.1],[-0.2,0.3,0.1,-0.3]], B0 = 0, target t = [-3.4,2.5,2.05,-0.55]
  A0x = [0.1,0.7], g = h - t = [-0.1,-0.5,0.95,-1.45], loss = 1.6325
  dL/dB = g (A0x)^T = [[-0.01,-0.07],[-0.05,-0.35],[0.095,0.665],[-0.145,-1.015]], dL/dA = 0 (because B = 0)
  lr 0.1 -> B1 = [[0.001,0.007],[0.005,0.035],[-0.0095,-0.0665],[0.0145,0.1015]], new h = [-3.495,2.025,2.9525,-1.9275], loss 1.4733
*/
Lesson.register({
  id: 'ai-lora',
  title: 'LoRA aur QLoRA: matrix maths',
  minutes: 30,
  summary: `Poore model ko fine-tune karna bahut mehnga hai. LoRA kehta hai: original weight W ko mat chhuo, uske saath do chhoti matrices B aur A seekho, aur W' = W + B·A use karo. Is lesson mein 4×4 example pe har multiplication haath se karenge, init kaise hota hai dekhenge, aur phir QLoRA (4-bit NF4 base + LoRA) ka maths aur memory samjhenge.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Ek bade model ko apne kaam ke liye thoda badalna hai. Lekin uske arabon numbers ko chhuna bahut mehnga hai.<br>LoRA ka idea: bade model ko bilkul mat chhuo. Uske saath ek chhota sa "add-on" jodo, aur sirf usi ko train karo.<br>Ye add-on itna chhota hai ki ek model ke kai add-ons ban sakte hain, har customer ka ek, aur har ek sirf kuch MB ka.<br>QLoRA ek kadam aage: bade model ko 4-bit mein daba ke rakho, taaki ek hi GPU pe training ho jaaye.<br>Saara maths 4×4 ke chhote numbers se haath se karenge. Har step tum khud check kar sakte ho.` },
    { type: 'h2', text: 'Problem: har customer ke liye 13.5 GB ki copy?' },
    { type: 'p', html: `<a href="#/ai-training-finetuning">Pichhle lesson</a> mein dekha: 7B model ka full fine-tune ~108 GB GPU memory maangta hai (weights + gradients + Adam states), aur har fine-tune ek poori 13.5 GB model file deta hai. Ab xyz.com ke 3 bade business customers hain, aur har ek chahta hai ki xyz Assistant uske brand ke tone mein bole. 3 full copies = 40 GB storage, 3 alag deployments, aur har copy ke liye 108 GB wali training.` },
    { type: 'p', html: `2021 mein Microsoft ke researchers (Hu et al.) ne <strong>LoRA</strong> paper mein ek observation pe kaam kiya: fine-tuning mein weights ka <em>badlaav</em> (ΔW) bahut "simple" hota hai. Usko poori badi matrix ki zaroorat nahi, do patli matrices ka product kaafi hai. Is "simple" ka maths naam hai <strong>low rank</strong>. Usse pehle do basic cheezein: matrix aur matrix × vector.` },
    { type: 'callout', tone: 'term', title: 'Naya word: vector aur matrix', html: `<strong>Ye kya hai:</strong> <strong>Vector</strong> = numbers ki ek line, jaise <code>[1, 2, 0, -1]</code>. Model mein har token ek vector hai. <strong>Matrix</strong> = numbers ki table, rows aur columns mein. "4×4" = 4 rows, 4 columns = 16 numbers. "d×k" = d rows, k columns.<br><strong>Kyun chahiye:</strong> model ki har layer ek matrix hai. Token ka vector is matrix se multiply hota hai aur naya vector banta hai. Model ke saare weights inhi matrices mein rehte hain.<br><strong>Iske bina:</strong> LoRA ka poora idea ("badi matrix ki jagah do patli matrices") samajh hi nahi aayega.` },
    { type: 'p', html: `<strong>Matrix × vector kaise hota hai (2×2 ka chhota example):</strong> matrix ki har row ko vector se "dot" karo: pehla × pehla + doosra × doosra.` },
    { type: 'ascii', text: `[ 1  2 ]   [ 1 ]     row1: 1×1 + 2×1 = 3
[ 3  4 ] · [ 1 ]  =  row2: 3×1 + 4×1 = 7      → [3, 7]

Ek d×k matrix × k numbers wala vector = d numbers wala vector.
Har output number ke liye k multiplications. Kul d × k multiplications.`, caption: 'Bas itna hi. Neeche 4×4 pe yahi rule chalega, har row ke liye 4 multiplications.' },
    { type: 'callout', tone: 'term', title: 'Naya word: rank (aur low-rank)', html: `<strong>Ye kya hai:</strong> ek matrix ki <strong>rank</strong> = usme kitni "sach mein alag" directions hain. Ek 4×4 matrix jiski har row ek hi row ka multiple ho, uski rank 1 hai: 16 numbers dikhte hain, lekin asli information sirf 4 + 4 = 8 numbers mein hai. <strong>Low-rank matrix</strong> = rank uske size se bahut chhoti. Aisi matrix ko do patli matrices ke product se likh sakte hain: (d×r) · (r×k), jahan r chhota hai.<br><strong>Kyun chahiye:</strong> agar fine-tuning ka badlaav low-rank hai, to ek 4096×4096 matrix ke 1.68 crore (16,777,216) numbers ki jagah sirf 65,536 numbers (r = 8) store aur train kar sakte hain.<br><strong>Iske bina:</strong> har badlaav ke liye poori d×k matrix: wahi 108 GB wali problem.` },
    { type: 'p', html: `Rank 1 ka chhota example. Ek column <code>u = [1, 2, 0, -1]</code> aur ek row <code>v = [2, 0, 1, 3]</code>. Inka product u·v ek 4×4 matrix hai, har entry <code>u_i × v_j</code>:` },
    { type: 'ascii', text: `        v =  [ 2   0   1   3 ]
u = 1   ->   [ 2   0   1   3 ]     (1×2, 1×0, 1×1, 1×3)
    2   ->   [ 4   0   2   6 ]     (2×2, 2×0, 2×1, 2×3)
    0   ->   [ 0   0   0   0 ]
   -1   ->   [-2   0  -1  -3 ]

16 numbers, lekin store sirf 8 (u ke 4 + v ke 4).
d = k = 4096 ho to: full = 16,777,216 numbers; rank 1 = 8,192 numbers.` },
    { type: 'h2', text: 'LoRA ka formula' },
    { type: 'p', html: `Transformer ki har linear layer (jaise attention ka W<sub>q</sub>, dekho <a href="#/ai-attention">Self-attention</a>) ek matrix multiply hai: <code>h = W₀ · x</code>. Fine-tuning normally W₀ ko badal ke W₀ + ΔW banata hai. LoRA kehta hai: ΔW ko seedha mat seekho, use do chhoti matrices mein todo:` },
    { type: 'code', text: `W' = W₀ + ΔW          ΔW = s · B · A          s = α / r

h = W' · x = W₀·x + s · B·(A·x)

W₀ : d × k   (frozen, kabhi update nahi)
B  : d × r   ("up" matrix, trainable)
A  : r × k   ("down" matrix, trainable)
r  : rank, jaise 4, 8, 16, 64   (r << d, k)
α  : lora_alpha, ek fixed number (hyperparameter)` },
    { type: 'callout', tone: 'term', title: 'Naya word: frozen, trainable, hyperparameter', html: `<strong>Ye kya hai:</strong> <strong>Frozen</strong> = training mein ye weights nahi badlenge (inka update nahi, inke liye gradients aur Adam states bhi store nahi). <strong>Trainable</strong> = training mein update honge. <strong>Hyperparameter</strong> = number jo hum training se pehle khud chunte hain (r, α, learning rate). Model use seekhta nahi.<br><strong>Kyun chahiye:</strong> LoRA ki saari bachat isi se hai: W₀ frozen, sirf B aur A trainable.<br><strong>Iske bina:</strong> sab trainable = full fine-tuning ki poori memory aur forgetting ka khatra.` },
    { type: 'callout', tone: 'term', title: 'Naya word: adapter', html: `<strong>Ye kya hai:</strong> base model ke saath joda gaya chhota, alag trainable hissa. LoRA mein har chuni hui matrix ke liye ek (B, A) jodi. Saari jodiyan milke ek <strong>adapter file</strong> banti hain.<br><strong>Kyun chahiye:</strong> xyz ke har customer ka apna adapter: ek hi base model, upar se chhota "add-on" lagao ya hatao.<br><strong>Iske bina:</strong> har customer ke liye poora 13.5 GB model alag rakhna padta.<br><strong>Example:</strong> Llama 2 7B, r = 8, sirf W<sub>q</sub> aur W<sub>v</sub> pe: adapter file ~8.4 MB (neeche calculator).` },
    { type: 'p', html: `A input ko k dimensions se sirf r dimensions mein "daba" deta hai (down-projection), aur B use wapas d dimensions mein "phaila" deta hai (up-projection). Beech mein r-size ka patla raasta: yahi bottleneck LoRA ko sasta banata hai.` },
    { type: 'callout', tone: 'tip', title: 'Convention note', html: `LoRA paper column-vector likhta hai (<code>h = W·x</code>). Attention lesson aur PyTorch ka <code>nn.Linear</code> row-vector use karte hain (<code>y = x·Wᵀ</code>). Ye sirf transpose ka farak hai, maths same. Is lesson mein paper wala tareeka.` },
    { type: 'h2', text: 'B aur A banti kaise hain? Initialisation' },
    { type: 'p', html: `Training shuru hone se pehle B aur A mein kuch numbers to daalne padenge. LoRA paper (2021) ka rule:` },
    { type: 'list', items: [
      '<strong>A</strong> = random Gaussian numbers (normal distribution, zero ke aas paas chhote random numbers).',
      '<strong>B</strong> = poori zero.',
      'Isliye shuru mein <strong>ΔW = B·A = 0</strong>. Matlab step 0 pe LoRA wala model bilkul original model jaisa output deta hai. Fine-tuning ek achhe, jaane-pehchaane point se shuru hoti hai.',
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Gaussian (normal) distribution', html: `<strong>Ye kya hai:</strong> random numbers ka aisa pattern jisme zyadatar numbers zero ke paas aate hain, aur bade numbers kam (bell jaisa curve). Ek number σ (standard deviation) batata hai ki numbers kitne phaile hue hain. Jaise σ = 0.1 pe zyadatar numbers -0.2 aur 0.2 ke beech.<br><strong>Kyun chahiye:</strong> A ko chhote, alag alag random numbers chahiye taaki har direction alag seekhe. Trained model ke weights bhi lagbhag isi shape mein hote hain (ye QLoRA mein kaam aayega).<br><strong>Iske bina:</strong> sab numbers same hon to A ki saari rows ek jaisi seekhengi. Bekaar.` },
    { type: 'p', html: `Hugging Face ki <strong>PEFT</strong> library (LoRA ka sabse common Python package) default mein A ko <strong>Kaiming-uniform</strong> se bharti hai (ek range ke andar barabar chance wale random numbers, range layer ke size se tay hoti hai) aur B ko zero, aur <code>init_lora_weights="gaussian"</code> option se paper jaisa Gaussian. Dono mein important baat same: <strong>ek random, ek zero</strong>.` },
    { type: 'h3', text: 'Dono zero kyun nahi? Dono random kyun nahi?' },
    { type: 'table', head: ['Choice', 'Step 0 pe ΔW', 'Kya hoga'], rows: [
      ['A random, B = 0 (LoRA)', '0', 'Output original jaisa. B ka gradient non-zero (A·x se aata hai), to B turant seekhna shuru karti hai. Sahi.'],
      ['A = 0, B = 0', '0', 'B ka gradient A·x pe depend, jo 0 hai. A ka gradient B pe depend, jo 0 hai. Dono gradients zero: <strong>kuch bhi nahi seekhega</strong>.'],
      ['A random, B random', 'random noise', 'Pehle hi step pe model ka output bigad jaata hai. Pre-trained knowledge pe random noise. Training ko pehle ye nuksaan theek karna padega.'],
    ]},
    { type: 'h3', text: 'Pehla training step, haath se (r = 2, s = 1)' },
    { type: 'p', html: `Maan lo ek 4×4 layer hai (asli mein 4096×4096 hoti hai). Ye hain hamare numbers:` },
    { type: 'ascii', text: `W₀ (frozen)                 x            A₀ (random, r×k = 2×4)          B₀ (zero, d×r = 4×2)
[ 0.5  -1    0    2 ]      [ 1 ]        [ 0.4  -0.1   0.2   0.1 ]         [ 0  0 ]
[ 1     0.5 -0.5  0 ]      [ 2 ]        [-0.2   0.3   0.1  -0.3 ]         [ 0  0 ]
[ 0     1    1   -1 ]      [ 0 ]                                          [ 0  0 ]
[-1     0    0.5  1 ]      [-1 ]                                          [ 0  0 ]` },
    { type: 'steps', items: [
      { t: 'W₀·x (har row · x)', d: '<code>row1: 0.5×1 + (-1)×2 + 0×0 + 2×(-1) = 0.5 - 2 + 0 - 2 = -3.5</code><br><code>row2: 1×1 + 0.5×2 + (-0.5)×0 + 0×(-1) = 1 + 1 + 0 + 0 = 2</code><br><code>row3: 0×1 + 1×2 + 1×0 + (-1)×(-1) = 0 + 2 + 0 + 1 = 3</code><br><code>row4: (-1)×1 + 0×2 + 0.5×0 + 1×(-1) = -1 + 0 + 0 - 1 = -2</code><br>W₀·x = [-3.5, 2, 3, -2]' },
      { t: 'A₀·x (r = 2 numbers)', d: '<code>row1: 0.4×1 + (-0.1)×2 + 0.2×0 + 0.1×(-1) = 0.4 - 0.2 + 0 - 0.1 = 0.1</code><br><code>row2: (-0.2)×1 + 0.3×2 + 0.1×0 + (-0.3)×(-1) = -0.2 + 0.6 + 0 + 0.3 = 0.7</code><br>A₀·x = [0.1, 0.7]' },
      { t: 'B₀·(A₀·x)', d: 'B₀ zero hai, to har entry 0×0.1 + 0×0.7 = 0. Output h = W₀·x + 0 = [-3.5, 2, 3, -2]. <strong>Bilkul original model jaisa.</strong>' },
      { t: 'Loss', d: 'Maan lo xyz ke data ke hisaab se sahi output (target) t = [-3.4, 2.5, 2.05, -0.55] hai. Simple loss L = ½ Σ (h - t)². Galti g = h - t = [-0.1, -0.5, 0.95, -1.45]. L = ½ (0.01 + 0.25 + 0.9025 + 2.1025) = <strong>1.6325</strong>.' },
      { t: 'Gradients', d: 'Yaad karo: gradient = "is number ko thoda badhaun to loss kitna badlega" (<a href="#/ai-training-finetuning">pichhla lesson</a>). Formula yaad rakhna zaroori nahi, bas pattern dekho. Chain rule se: <code>dL/dB = s · g · (A₀x)ᵀ</code> aur <code>dL/dA = s · Bᵀ · g · xᵀ</code>.<br>dL/dB (4×2), har entry g_i × (A₀x)_j:<br><code>[-0.1×0.1, -0.1×0.7] = [-0.01, -0.07]</code><br><code>[-0.5×0.1, -0.5×0.7] = [-0.05, -0.35]</code><br><code>[0.95×0.1, 0.95×0.7] = [0.095, 0.665]</code><br><code>[-1.45×0.1, -1.45×0.7] = [-0.145, -1.015]</code><br>dL/dA = Bᵀ·(...) = <strong>0</strong>, kyunki B abhi zero hai. Pehle step pe sirf B seekhti hai.' },
      { t: 'Update (learning rate 0.1)', d: '<code>B₁ = B₀ - 0.1 × dL/dB</code> = [[0.001, 0.007], [0.005, 0.035], [-0.0095, -0.0665], [0.0145, 0.1015]].' },
      { t: 'Naya output', d: 'B₁·(A₀x): row1 = 0.001×0.1 + 0.007×0.7 = 0.0001 + 0.0049 = 0.005; row2 = 0.0005 + 0.0245 = 0.025; row3 = -0.00095 - 0.04655 = -0.0475; row4 = 0.00145 + 0.07105 = 0.0725.<br>h = [-3.5 + 0.005, 2 + 0.025, 3 - 0.0475, -2 + 0.0725] = [-3.495, 2.025, 2.9525, -1.9275]. Loss <strong>1.6325 → 1.4733</strong>. Model target ki taraf chala, aur W₀ ka ek bhi number nahi badla.' },
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "A random hai to model ka output random ho jaayega"', html: `Nahi. Output mein A hamesha B ke through jaata hai (B·A·x). B zero hai to A kuch bhi ho, ΔW zero. Agle steps mein B thoda thoda non-zero hoti hai, aur tab A ko bhi gradient milne lagta hai, to dono saath seekhte hain.` },
    { type: 'h2', text: 'Training ke baad: B·A, merge aur output (do tareeke)' },
    { type: 'p', html: `Bahut saare steps ke baad maan lo B aur A ye ban gaye (r = 2, α = 2, to s = α/r = 1). W₀ aur x wahi purane.` },
    { type: 'ascii', text: `B (4×2)            A (2×4)
[ 0.2   0   ]      [ 1   0  -1   0.5 ]
[ 0     0.1 ]      [ 0   2   1  -1   ]
[ 0.1  -0.2 ]
[-0.1   0.3 ]` },
    { type: 'h3', text: 'Step 1: ΔW = B·A, har entry' },
    { type: 'p', html: `Rule: <code>(BA)[i][j] = B[i][1]×A[1][j] + B[i][2]×A[2][j]</code>. Har entry mein r = 2 multiplications:` },
    { type: 'table', head: ['Row i', 'j = 1', 'j = 2', 'j = 3', 'j = 4'], rows: [
      ['1', '0.2×1 + 0×0 = <strong>0.2</strong>', '0.2×0 + 0×2 = <strong>0</strong>', '0.2×(-1) + 0×1 = <strong>-0.2</strong>', '0.2×0.5 + 0×(-1) = <strong>0.1</strong>'],
      ['2', '0×1 + 0.1×0 = <strong>0</strong>', '0×0 + 0.1×2 = <strong>0.2</strong>', '0×(-1) + 0.1×1 = <strong>0.1</strong>', '0×0.5 + 0.1×(-1) = <strong>-0.1</strong>'],
      ['3', '0.1×1 + (-0.2)×0 = <strong>0.1</strong>', '0.1×0 + (-0.2)×2 = <strong>-0.4</strong>', '0.1×(-1) + (-0.2)×1 = <strong>-0.3</strong>', '0.1×0.5 + (-0.2)×(-1) = <strong>0.25</strong>'],
      ['4', '(-0.1)×1 + 0.3×0 = <strong>-0.1</strong>', '(-0.1)×0 + 0.3×2 = <strong>0.6</strong>', '(-0.1)×(-1) + 0.3×1 = <strong>0.4</strong>', '(-0.1)×0.5 + 0.3×(-1) = <strong>-0.35</strong>'],
    ], caption: '16 entries × 2 multiplications = 32 multiplications. ΔW ki rank sirf 2 hai, chahe wo 4×4 dikhe.' },
    { type: 'h3', text: 'Step 2: merge, W\' = W₀ + s·ΔW' },
    { type: 'ascii', text: `W₀                       + 1 × ΔW                       = W'
[ 0.5  -1    0    2 ]    [ 0.2   0    -0.2   0.1  ]     [ 0.7  -1   -0.2   2.1  ]
[ 1     0.5 -0.5  0 ]  + [ 0     0.2   0.1  -0.1  ]  =  [ 1     0.7 -0.4  -0.1  ]
[ 0     1    1   -1 ]    [ 0.1  -0.4  -0.3   0.25 ]     [ 0.1   0.6  0.7  -0.75 ]
[-1     0    0.5  1 ]    [-0.1   0.6   0.4  -0.35 ]     [-1.1   0.6  0.9   0.65 ]` },
    { type: 'h3', text: 'Step 3, tareeka 1 (merged): h = W\'·x' },
    { type: 'code', text: `row1: 0.7×1 + (-1)×2 + (-0.2)×0 + 2.1×(-1)    = 0.7 - 2 + 0 - 2.1     = -3.4
row2: 1×1 + 0.7×2 + (-0.4)×0 + (-0.1)×(-1)     = 1 + 1.4 + 0 + 0.1     =  2.5
row3: 0.1×1 + 0.6×2 + 0.7×0 + (-0.75)×(-1)     = 0.1 + 1.2 + 0 + 0.75  =  2.05
row4: (-1.1)×1 + 0.6×2 + 0.9×0 + 0.65×(-1)     = -1.1 + 1.2 + 0 - 0.65 = -0.55
h = [-3.4, 2.5, 2.05, -0.55]          (16 multiplications)` },
    { type: 'h3', text: 'Step 3, tareeka 2 (separate adapter): h = W₀·x + s·B·(A·x)' },
    { type: 'code', text: `W₀·x  = [-3.5, 2, 3, -2]                          (pehle nikaala tha, 16 mult)

A·x:  row1: 1×1 + 0×2 + (-1)×0 + 0.5×(-1)  = 1 + 0 + 0 - 0.5 = 0.5
      row2: 0×1 + 2×2 + 1×0 + (-1)×(-1)    = 0 + 4 + 0 + 1   = 5          (8 mult)

B·(Ax): row1: 0.2×0.5 + 0×5      = 0.1
        row2: 0×0.5 + 0.1×5      = 0.5
        row3: 0.1×0.5 + (-0.2)×5 = 0.05 - 1  = -0.95
        row4: (-0.1)×0.5 + 0.3×5 = -0.05 + 1.5 = 1.45                      (8 mult)

h = [-3.5 + 0.1, 2 + 0.5, 3 - 0.95, -2 + 1.45] = [-3.4, 2.5, 2.05, -0.55]   SAME!` },
    { type: 'p', html: `Dono tareekon ka answer bilkul same, kyunki matrix multiplication distribute hoti hai: <code>(W₀ + BA)·x = W₀·x + B·(A·x)</code>. Fark sirf kaam aur memory mein hai:` },
    { type: 'table', head: ['', 'Tareeka 1: merged W\'', 'Tareeka 2: separate B, A'], rows: [
      ['Multiplications (4×4, r=2)', '16', '16 + 8 + 8 = 32'],
      ['Multiplications (4096×4096, r=8)', '16,777,216', '16,777,216 + 65,536 (sirf 0.39% extra)'],
      ['Kab use', 'Deploy/inference: zero extra latency', 'Training (W₀ frozen, sirf A, B ke gradients), aur jab ek base pe kai adapters swap karne hon'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Training mein B·A kabhi bana hi nahi', html: `Training ke time hum tareeka 2 use karte hain: pehle A·x (chhota vector), phir B·(A·x). Poori d×k ΔW matrix kabhi memory mein banti hi nahi. Isliye LoRA training sasti hai. Merge sirf training ke baad ek baar karte hain.` },
    { type: 'h2', text: 'LoRA matrix lab: khud number badlo' },
    { type: 'p', html: `Koi bhi number edit karo (W₀, x, B, A), r aur α badlo. ΔW ke kisi cell pe click karo to uski calculation dikhegi. Output row chuno to dono tareeke multiplication-by-multiplication dikhenge. "Init" dabao to A random (seeded Gaussian) aur B zero ho jaayegi: dekho ΔW poori zero aur output original jaisa.` },
    { type: 'custom', render(el) {
      const DEF = { W: [[0.5, -1, 0, 2], [1, 0.5, -0.5, 0], [0, 1, 1, -1], [-1, 0, 0.5, 1]], x: [1, 2, 0, -1], B: [[0.2, 0], [0, 0.1], [0.1, -0.2], [-0.1, 0.3]], A: [[1, 0, -1, 0.5], [0, 2, 1, -1]] };
      const cp = o => JSON.parse(JSON.stringify(o));
      let S = cp(DEF), r = 2, alpha = 2, seed = 7, ci = 0, cj = 0, row = 0;
      const f = v => { const t = Math.round(v * 10000) / 10000; return String(t === 0 ? 0 : t); };
      const p = v => (v < 0 ? '(' + f(v) + ')' : f(v));
      const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
      const gauss = () => Math.sqrt(-2 * Math.log(rnd())) * Math.cos(2 * Math.PI * rnd());
      const cell = 'padding:3px 6px;border:1px solid var(--line);text-align:right;font:13px var(--f-mono);min-width:44px';
      const inp = (k, i, j, v) => `<td style="${cell};padding:1px"><input data-k="${k}" data-i="${i}" data-j="${j}" type="number" step="0.1" value="${f(v)}" style="width:70px;font:13px var(--f-mono);padding:3px"></td>`;
      const box = (t, inner) => `<div style="display:inline-block;vertical-align:top;margin:0 12px 10px 0"><div style="font-size:13px;color:var(--ink-3);margin-bottom:3px">${t}</div><table style="border-collapse:collapse">${inner}</table></div>`;
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:end">
          <div class="chips" style="padding:0"><button type="button" class="chip lr-r" data-r="1">r = 1</button><button type="button" class="chip lr-r" data-r="2">r = 2</button></div>
          <label style="margin:0">α <input class="lr-a" type="number" step="1" min="1" value="2" style="width:70px"></label>
          <button type="button" class="btn small lr-ex">Trained example</button>
          <button type="button" class="btn small primary lr-init">Init: A random, B = 0</button></div>
        <div style="overflow-x:auto;margin-top:10px"><div class="lr-in" style="min-width:560px"></div><div class="lr-out" style="min-width:560px"></div></div>
        <div class="calc-note lr-cell"></div>
        <div class="chips lr-rows" style="padding:6px 0 0"></div>
        <pre class="ascii lr-calc" style="white-space:pre;overflow-x:auto;font-size:12.5px"></pre>
        <div class="stats"><div class="stat"><span>s = α / r</span><strong class="lr-s"></strong></div><div class="stat"><span>h (merged W'·x)</span><strong class="lr-h1" style="font-size:16px"></strong></div><div class="stat"><span>h (W₀x + s·B(Ax))</span><strong class="lr-h2" style="font-size:16px"></strong></div><div class="stat"><span>Multiplications: merged vs separate</span><strong class="lr-m"></strong></div></div>`;
      const drawIn = () => {
        el.querySelectorAll('.lr-r').forEach(b => b.classList.toggle('on', Number(b.dataset.r) === r));
        el.querySelector('.lr-in').innerHTML =
          box('W₀ (frozen, 4×4)', S.W.map((R, i) => '<tr>' + R.map((v, j) => inp('W', i, j, v)).join('') + '</tr>').join('')) +
          box('x', S.x.map((v, i) => '<tr>' + inp('x', i, 0, v) + '</tr>').join('')) +
          box('B (4×' + r + ')', S.B.map((R, i) => '<tr>' + R.slice(0, r).map((v, j) => inp('B', i, j, v)).join('') + '</tr>').join('')) +
          box('A (' + r + '×4)', S.A.slice(0, r).map((R, i) => '<tr>' + R.map((v, j) => inp('A', i, j, v)).join('') + '</tr>').join(''));
        el.querySelectorAll('.lr-in input').forEach(n => n.addEventListener('input', () => {
          const v = Number(n.value); if (!isFinite(v)) return;
          const k = n.dataset.k, i = +n.dataset.i, j = +n.dataset.j;
          if (k === 'x') S.x[i] = v; else S[k][i][j] = v;
          calc();
        }));
      };
      const calc = () => {
        const s = alpha / r, ks = [...Array(r).keys()];
        const BA = S.W.map((_, i) => [0, 1, 2, 3].map(j => ks.reduce((a, k) => a + S.B[i][k] * S.A[k][j], 0)));
        const Wp = S.W.map((R, i) => R.map((v, j) => v + s * BA[i][j]));
        const W0x = S.W.map(R => R.reduce((a, v, j) => a + v * S.x[j], 0));
        const Ax = ks.map(k => S.A[k].reduce((a, v, j) => a + v * S.x[j], 0));
        const BAx = S.B.map(R => ks.reduce((a, k) => a + R[k] * Ax[k], 0));
        const h1 = Wp.map(R => R.reduce((a, v, j) => a + v * S.x[j], 0));
        const h2 = W0x.map((v, i) => v + s * BAx[i]);
        const hl = 'background:var(--accent-soft);outline:2px solid var(--accent)';
        el.querySelector('.lr-out').innerHTML =
          box('ΔW = B·A (click a cell)', BA.map((R, i) => '<tr>' + R.map((v, j) => `<td data-i="${i}" data-j="${j}" style="${cell};cursor:pointer;${i === ci && j === cj ? hl : ''}">${f(v)}</td>`).join('') + '</tr>').join('')) +
          box("W' = W₀ + s·ΔW", Wp.map((R, i) => '<tr>' + R.map(v => `<td style="${cell};${i === row ? 'background:var(--accent-soft)' : ''}">${f(v)}</td>`).join('') + '</tr>').join(''));
        el.querySelectorAll('.lr-out td[data-i]').forEach(td => td.addEventListener('click', () => { ci = +td.dataset.i; cj = +td.dataset.j; calc(); }));
        el.querySelector('.lr-cell').innerHTML = `ΔW[${ci + 1}][${cj + 1}] = ` + ks.map(k => `B[${ci + 1}][${k + 1}]×A[${k + 1}][${cj + 1}]`).join(' + ') + ' = ' + ks.map(k => p(S.B[ci][k]) + '×' + p(S.A[k][cj])).join(' + ') + ' = <strong>' + f(BA[ci][cj]) + '</strong>';
        el.querySelector('.lr-rows').innerHTML = [0, 1, 2, 3].map(i => `<button type="button" class="chip${i === row ? ' on' : ''}" data-i="${i}">Output row ${i + 1}</button>`).join('');
        el.querySelectorAll('.lr-rows .chip').forEach(b => b.addEventListener('click', () => { row = +b.dataset.i; calc(); }));
        const i = row, X = S.x;
        el.querySelector('.lr-calc').textContent =
          `Tareeka 1 (merged):  h[${i + 1}] = W'[${i + 1}]·x = ` + Wp[i].map((v, j) => p(v) + '×' + p(X[j])).join(' + ') + ' = ' + f(h1[i]) + '\n\n' +
          `Tareeka 2 (separate):\n  (W₀x)[${i + 1}] = ` + S.W[i].map((v, j) => p(v) + '×' + p(X[j])).join(' + ') + ' = ' + f(W0x[i]) + '\n' +
          ks.map(k => `  (Ax)[${k + 1}] = ` + S.A[k].map((v, j) => p(v) + '×' + p(X[j])).join(' + ') + ' = ' + f(Ax[k])).join('\n') + '\n' +
          `  (B·Ax)[${i + 1}] = ` + ks.map(k => p(S.B[i][k]) + '×' + p(Ax[k])).join(' + ') + ' = ' + f(BAx[i]) + '\n' +
          `  h[${i + 1}] = ${f(W0x[i])} + ${f(s)} × ${p(BAx[i])} = ` + f(h2[i]);
        el.querySelector('.lr-s').textContent = f(s);
        el.querySelector('.lr-h1').textContent = '[' + h1.map(f).join(', ') + ']';
        el.querySelector('.lr-h2').textContent = '[' + h2.map(f).join(', ') + ']';
        el.querySelector('.lr-m').textContent = '16 vs ' + (16 + 4 * r + 4 * r);
      };
      el.querySelectorAll('.lr-r').forEach(b => b.addEventListener('click', () => { r = Number(b.dataset.r); ci = Math.min(ci, 3); drawIn(); calc(); }));
      el.querySelector('.lr-a').addEventListener('input', e => { const v = Number(e.target.value); if (v > 0) { alpha = v; calc(); } });
      el.querySelector('.lr-ex').addEventListener('click', () => { S = cp(DEF); drawIn(); calc(); });
      el.querySelector('.lr-init').addEventListener('click', () => {
        S.A = S.A.map(R => R.map(() => Math.round(gauss() * 0.5 * 100) / 100));
        S.B = S.B.map(R => R.map(() => 0));
        drawIn(); calc();
      });
      drawIn(); calc();
    }},
    { type: 'h2', text: 'α / r scaling: ye extra number kyun?' },
    { type: 'callout', tone: 'term', title: 'Naya word: α (lora_alpha) aur scale s', html: `<strong>Ye kya hai:</strong> α ek hyperparameter hai. LoRA ka badlaav ΔW = B·A seedha nahi judta, pehle <code>s = α / r</code> se multiply hota hai. Example: r = 2, α = 2 → s = 1. r = 2, α = 4 → s = 2 (adapter ka asar double).<br><strong>Kyun chahiye:</strong> adapter ka asar kitna tez ho, ye ek knob se control ho jaata hai, aur r badalne pe learning rate dobara dhoondhna nahi padta.<br><strong>Iske bina:</strong> har baar r badalte hi update ka size badal jaata, aur har r ke liye alag learning rate tune karni padti.` },
    { type: 'p', html: `ΔW ko <code>s = α / r</code> se multiply karte hain. Upar wale example mein α = 4 kar do (r = 2): s = 2, ΔW double, aur output <code>[-3.3, 3, 1.1, 0.9]</code> ho jaata hai (lab mein α = 4 likh ke check karo). Toh α ek "volume knob" hai: adapter ki awaaz kitni tez.` },
    { type: 'list', items: [
      '<strong>Kyun r se divide?</strong> r badhane pe B·A mein zyada terms judte hain aur update bada hone lagta hai. α/r se scale karne se alag-alag r try karte waqt learning rate dobara tune nahi karna padta. Paper ne α ko pehle try kiye r ke barabar set karke fix rakha.',
      '<strong>Practice mein</strong> log aksar α = r ya α = 2r rakhte hain (jaise r = 16, α = 32).',
      '<strong>rsLoRA</strong>: bade r pe α/r bahut chhota ho jaata hai aur seekhna slow. Rank-stabilized LoRA <code>α/√r</code> use karta hai (PEFT mein <code>use_rslora=True</code>).',
    ]},
    { type: 'h2', text: 'Kaunsi matrices ko LoRA milta hai?' },
    { type: 'p', html: `Ek Transformer block mein kai linear layers hain: attention mein W<sub>q</sub>, W<sub>k</sub>, W<sub>v</sub>, W<sub>o</sub> (dekho <a href="#/ai-multihead">Multi-head</a>), aur FFN/MLP mein (Llama jaise models mein) teen matrices: <strong>gate</strong> aur <strong>up</strong> (token ke vector ko bada karti hain) aur <strong>down</strong> (wapas chhota karti hai). Har ek pe alag LoRA (apni B, A) laga sakte hain.` },
    { type: 'list', items: [
      '<strong>LoRA paper (2021)</strong>: GPT-3 175B pe sirf W<sub>q</sub> aur W<sub>v</sub> ko adapt kiya. r = 4 pe <strong>checkpoint</strong> (training ke baad save hone wali file) 350 GB se ~35 MB, training ke liye <strong>VRAM</strong> (GPU ki apni memory) 1.2 TB se 350 GB, aur training ~25% fast.',
      '<strong>QLoRA paper (2023)</strong>: full fine-tuning ki quality match karne ke liye <em>saari</em> linear layers pe LoRA zaroori nikla. r ka itna asar nahi tha jitna "kitni layers pe LoRA" ka.',
      '<strong>Aaj ka common default</strong>: saari linear layers (PEFT mein <code>target_modules="all-linear"</code>), r = 8 se 64.',
    ]},
    { type: 'h3', text: 'Calculator: kitne trainable parameters?' },
    { type: 'custom', render(el) {
      const M = { '7': ['Llama 2 7B', 4096, 11008, 32], '13': ['Llama 2 13B', 5120, 13824, 40], '65': ['LLaMA 65B', 8192, 22016, 80] };
      const T = { qv: 'Wq, Wv', qkvo: 'Wq, Wk, Wv, Wo', all: 'Saari linear (attn + MLP)' };
      let m = '7', t = 'qv';
      el.innerHTML = `<div class="chips lp-m" style="padding:0 0 8px">${Object.keys(M).map(k => `<button type="button" class="chip" data-k="${k}">${M[k][0]}</button>`).join('')}</div>
        <div class="chips lp-t" style="padding:0 0 8px">${Object.keys(T).map(k => `<button type="button" class="chip" data-k="${k}">${T[k]}</button>`).join('')}</div>
        <label>Rank r: <strong class="lp-rv"></strong></label><input class="lp-r" type="range" min="0" max="8" step="1" value="3" style="width:100%">
        <div class="stats"><div class="stat"><span>Ek W<sub>q</sub> (d×d): full vs LoRA</span><strong class="lp-one" style="font-size:16px"></strong></div>
        <div class="stat"><span>Model ke total params</span><strong class="lp-tot"></strong></div>
        <div class="stat"><span>LoRA trainable params</span><strong class="lp-l"></strong></div>
        <div class="stat"><span>% of model</span><strong class="lp-p"></strong></div>
        <div class="stat"><span>Adapter file (bf16, 2 B/param)</span><strong class="lp-f"></strong></div></div>
        <div class="calc-note">Formula: ek d×k matrix ke liye LoRA params = r × (d + k). Per layer: attention ki 4 matrices d×d; MLP mein gate aur up d×f, down f×d. Total params = layers × (4d² + 3df) + 2 × vocab(32,000) × d (embeddings + output head). Norms chhote hain, ignore.</div>`;
      const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n.toLocaleString('en-IN');
      const upd = () => {
        const [, d, ff, L] = M[m], r = 2 ** Number(el.querySelector('.lp-r').value);
        const per = t === 'qv' ? 2 * r * 2 * d : t === 'qkvo' ? 4 * r * 2 * d : r * (11 * d + 3 * ff);
        const lora = per * L, tot = L * (4 * d * d + 3 * d * ff) + 2 * 32000 * d;
        el.querySelector('.lp-rv').textContent = r;
        el.querySelector('.lp-one').textContent = fmt(d * d) + ' vs ' + fmt(r * 2 * d);
        el.querySelector('.lp-tot').textContent = fmt(tot);
        el.querySelector('.lp-l').textContent = fmt(lora);
        el.querySelector('.lp-p').textContent = (lora / tot * 100).toFixed(3) + '%';
        el.querySelector('.lp-f').textContent = (lora * 2 / 1e6).toFixed(1) + ' MB';
        el.querySelectorAll('.lp-m .chip').forEach(c => c.classList.toggle('on', c.dataset.k === m));
        el.querySelectorAll('.lp-t .chip').forEach(c => c.classList.toggle('on', c.dataset.k === t));
      };
      el.querySelectorAll('.lp-m .chip').forEach(c => c.addEventListener('click', () => { m = c.dataset.k; upd(); }));
      el.querySelectorAll('.lp-t .chip').forEach(c => c.addEventListener('click', () => { t = c.dataset.k; upd(); }));
      el.querySelector('.lp-r').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `Default dekho: Llama 2 7B, W<sub>q</sub> + W<sub>v</sub>, r = 8 → <strong>4.19M</strong> trainable params, model ka sirf <strong>0.062%</strong>, adapter file <strong>8.4 MB</strong>. Saari linear layers + r = 16 karo to 39.98M (0.593%), file 80 MB. Phir bhi 13.5 GB ke muqable kuch nahi. xyz ke 3 customers = ek base model + 3 chhoti adapter files.` },
    { type: 'h2', text: 'Ek LoRA layer ke andar data ka safar' },
    { type: 'flow', height: 340, title: 'LoRA layer: forward, training, merge',
      nodes: [
        { id: 'x', label: 'Input x', sub: 'k numbers', x: 70, y: 150, w: 110, kind: 'client', info: 'Ye kya hai: pichhli layer se aaya vector (ek token ka hidden state, yaani model ke andar us token ka abhi ka vector). Asli model mein k = 4096 jaisa.' },
        { id: 'w', label: 'W₀ (frozen)', sub: 'd×k, 16.7M', x: 320, y: 60, w: 170, kind: 'data', info: 'Ye kya hai: original pre-trained weight matrix. LoRA training mein ye kabhi update nahi hota, na iske gradients store hote, na Adam states. QLoRA mein ye 4-bit NF4 mein rakha jaata hai.' },
        { id: 'a', label: 'A (down)', sub: 'r×k', x: 250, y: 245, w: 120, kind: 'cache', info: 'Ye kya hai: LoRA ki trainable "down" matrix. x ko k dimensions se r dimensions mein dabata hai. Init: random Gaussian (PEFT default: Kaiming-uniform).' },
        { id: 'b', label: 'B (up)', sub: 'd×r', x: 430, y: 245, w: 120, kind: 'cache', info: 'Ye kya hai: LoRA ki trainable "up" matrix. r dimensions ko wapas d mein phailata hai. Init: zero, isliye shuru mein ΔW = 0.' },
        { id: 'sum', label: 'Sum', sub: 'W₀x + s·BAx', x: 560, y: 150, w: 100, kind: 'server', info: 'Ye kya hai: ek simple jod. Dono raaston ka output jodta hai, adapter wale ko s = α/r se scale karke.' },
        { id: 'out', label: 'Output', sub: 'h', x: 670, y: 150, w: 80, kind: 'client', info: 'Ye kya hai: is layer ka result h, jo agli layer ko jaata hai. Merge ke baad bhi exactly same h milta hai.' },
        { id: 'loss', label: 'Loss + Adam', sub: 'sirf A, B update', x: 620, y: 300, w: 150, kind: 'queue', info: 'Ye kya hai: training ka hissa. Loss nikalta hai, gradients backprop hote hain, aur optimizer sirf A aur B ko update karta hai. Adam states bhi sirf inke liye.' },
      ],
      edges: [{ a: 'x', b: 'w' }, { a: 'x', b: 'a' }, { a: 'a', b: 'b' }, { a: 'w', b: 'sum' }, { a: 'b', b: 'sum' }, { a: 'sum', b: 'out' }, { a: 'out', b: 'loss' }, { a: 'loss', b: 'b' }],
      scenarios: [
        { name: 'Forward (adapter alag)', steps: [
          { title: 'Main raasta', text: 'x frozen W₀ se multiply hota hai, jaise normal model mein.', go: 'x>w>sum', msg: 'W₀·x = [-3.5, 2, 3, -2]' },
          { title: 'Side raasta: down', text: 'Wahi x, A se r numbers mein dabta hai.', go: 'x>a', msg: 'A·x = [0.5, 5]' },
          { title: 'Side raasta: up', text: 'B use wapas 4 (d) numbers mein phailata hai.', go: 'a>b>sum', msg: 'B·(A·x) = [0.1, 0.5, -0.95, 1.45]' },
          { title: 'Jodo', text: 'h = W₀x + s·B(Ax), s = 1.', go: 'sum>out', after: { out: { state: 'ok', sub: 'h ready' } }, msg: 'h = [-3.4, 2.5, 2.05, -0.55]' },
        ]},
        { name: 'Training step', steps: [
          { title: 'Forward', text: 'Upar jaisa forward pass.', go: ['x>w>sum', 'x>a>b>sum'], parallel: true },
          { title: 'Loss', text: 'Output ko target se compare karke loss.', go: 'sum>out>loss', msg: 'loss = 1.6325 (init step example)' },
          { title: 'Gradient sirf adapter tak', text: 'Gradient B tak, phir B ke through A tak. W₀ frozen hai: uska update nahi.', go: 'bad:loss>b>a', set: { w: { state: 'dim', sub: 'no update' } }, after: { a: { state: 'hot', sub: 'updated' }, b: { state: 'hot', sub: 'updated' } } },
          { title: 'Memory ka faayda', text: 'Gradients aur Adam states sirf A, B ke liye: 4096×4096 ki jagah 2 × 8 × 4096 numbers per matrix (r = 8).', focus: ['a', 'b'] },
        ]},
        { name: 'Merge for deploy', steps: [
          { title: 'Ek baar merge', text: 'Training ke baad W\' = W₀ + s·B·A nikaal ke W₀ ki jagah rakh do. A aur B ki ab zaroorat nahi.', set: { w: { label: "W' (merged)", sub: 'W₀ + s·BA', state: 'ok' }, a: { state: 'dim' }, b: { state: 'dim' } }, focus: ['w'] },
          { title: 'Normal model jaisa', text: 'Ab ek hi matrix multiply. Extra latency zero. Output exactly same.', go: 'x>w>sum>out', after: { out: { state: 'ok', sub: 'same h' } }, msg: "W'·x = [-3.4, 2.5, 2.05, -0.55]" },
        ]},
        { name: 'Failure: galat init', intro: 'Agar kisi ne B ko bhi random bhar diya, ya A aur B dono zero.', steps: [
          { title: 'Dono random', text: 'Step 0 pe hi ΔW random noise hai. Model ka output pehle hi step pe badal gaya: pre-trained knowledge pe noise.', set: { b: { state: 'warn', sub: 'random!' } }, go: ['x>a>b>sum', 'sum>out'], after: { out: { state: 'down', sub: 'bigda!' } } },
          { title: 'Dono zero', text: 'Output theek hai, lekin B ka gradient A·x pe aur A ka gradient B pe depend karta hai. Dono zero: gradients zero, training atak gayi.', set: { a: { state: 'down', sub: 'A = 0' }, b: { state: 'down', sub: 'B = 0' }, out: { state: '', sub: 'h' } }, go: 'lost:loss>b' },
          { title: 'Fix', text: 'Ek random (A), ek zero (B). Output original jaisa aur gradient bahta hai.', set: { a: { state: 'ok', sub: 'random' }, b: { state: 'ok', sub: 'zero' } }, go: 'bad:loss>b>a' },
        ]},
      ],
    },
    { type: 'h2', text: 'Merge, unmerge aur adapters ki library' },
    { type: 'p', html: `Kyunki ΔW sirf jodta hai, LoRA ke saath teen useful cheezein milti hain:` },
    { type: 'list', items: [
      '<strong>Merge</strong>: deploy se pehle W\' = W₀ + s·BA. Extra latency zero (PEFT mein <code>merge_and_unload()</code>, jo naya model return karta hai).',
      '<strong>Unmerge / swap</strong>: W\' - s·BA = W₀ wapas. Ek base model memory mein rakho aur customer ke hisaab se adapter badlo: xyz ke 3 customers = 1 base + 3 files of few MB.',
      '<strong>Multi-adapter serving</strong>: bina merge kiye, ek hi GPU pe ek batch ki alag requests alag adapters use kar sakti hain (tareeka 2). vLLM jaise inference servers (LLM ko users ke liye chalane wale open-source programs) ye support karte hain. Thodi extra compute, lekin saikdon adapters ek base pe.',
    ]},
    { type: 'callout', tone: 'warn', title: 'Merge karte waqt dhyaan', html: `Agar base 4-bit quantized hai (QLoRA, neeche), to W₀ + BA ko wapas 4-bit mein daalne pe rounding error aata hai aur adapter ka chhota sa asar kho sakta hai. Common tareeka: adapter ko 16-bit base model mein merge karo, phir chaaho to poore merged model ko quantize karo.` },
    { type: 'h2', text: 'QLoRA: base model ko 4-bit mein daba do' },
    { type: 'p', html: `LoRA ne gradients aur optimizer ki memory bacha li. Lekin frozen base model to phir bhi memory mein chahiye: 65B model bf16 mein = 65 × 2 = ~130 GB. Ek GPU (48 GB ya 80 GB) mein fit nahi. <strong>QLoRA</strong> (Dettmers et al., 2023) ka idea: frozen W₀ ko <strong>4-bit</strong> mein store karo (4 guna chhota), LoRA adapters 16-bit (bf16) mein hi train karo. Paper ke hisaab se 65B model ki fine-tuning ki memory >780 GB se ghat ke <48 GB, aur 16-bit fine-tuning jaisi quality. Isi se unhone <strong>Guanaco</strong> chatbot models train kiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: quantization, bf16, block (chhota intro)', html: `<strong>Ye kya hai:</strong> <strong>Quantization</strong> = numbers ko kam bits mein store karna, thodi precision khoke. 4 bits mein sirf 2⁴ = 16 alag values ho sakti hain. <strong>bf16</strong> = 16-bit float format (1 sign, 8 exponent, 7 mantissa bits). <strong>Block-wise</strong> = weights ko chhote groups (yahan 64) mein baanto, har group ka apna scale.<br><strong>Kyun chahiye:</strong> 16-bit se 4-bit = base model ki memory 4 guna kam. Block se ek bada outlier sirf apne block ko kharab karta hai.<br><strong>Iske bina:</strong> 65B ka frozen base hi ~130 GB: ek GPU mein fit nahi.<br>Poora detail: <a href="#/ai-quantization">Precision aur quantization</a> lesson.` },
    { type: 'p', html: `QLoRA ke teen naye hisse hain, aur ek important rule: <strong>storage dtype 4-bit NF4, compute dtype bf16</strong>. Jab bhi layer chalti hai, us layer ke 4-bit weights ko turant bf16 mein wapas (dequantize) karke normal matrix multiply hota hai. Gradient bhi bf16 mein bahta hai, lekin update sirf LoRA ke A, B ka hota hai.` },
    { type: 'code', text: `QLoRA ek linear layer (paper ka equation, simple notation):

Y(bf16) = X(bf16) · doubleDequant(c₁ fp32, c₂ fp8, W nf4)  +  X(bf16) · L₁(bf16) · L₂(bf16)
          \\______ frozen base, 4-bit se bf16 on-the-fly ____/     \\__ LoRA (A, B) ___/` },
    { type: 'h3', text: '1. NF4 (4-bit NormalFloat)' },
    { type: 'p', html: `Normal int4 mein 16 levels barabar doori pe hote hain (-7 se 7, scale ke saath). Lekin trained weights barabar phaile nahi hote: zyadatar zero ke paas, bell curve jaise (normal distribution). To levels bhi wahi rakho jahan weights zyada hain! NF4 ke 16 levels normal distribution ke <strong>quantiles</strong> se bante hain, taaki har level ke hisse mein lagbhag barabar weights aayein, phir [-1, 1] mein normalize. Exact zero bhi ek level hai (padding/zero weights bina error). 7 negative, 0, aur 8 positive:` },
    { type: 'ascii', text: `index:  0       1       2       3       4       5       6       7
value: -1.0000 -0.6962 -0.5251 -0.3949 -0.2844 -0.1848 -0.0910  0.0000
index:  8       9      10      11      12      13      14      15
value:  0.0796  0.1609  0.2461  0.3379  0.4407  0.5626  0.7230  1.0000

Dekho: zero ke paas levels ghane (0.08 ki doori), kinaron pe door (0.28 ki doori).`, caption: 'NF4 ke 16 values (QLoRA paper Appendix E / bitsandbytes). Humne inhe normal distribution ke quantiles se dobara compute karke match kiya.' },
    { type: 'callout', tone: 'term', title: 'Naya word: quantile', html: `<strong>Ye kya hai:</strong> data ko sort karke barabar hisson mein kaato. Jahan kaat lagi, wo quantiles hain. Jaise 100 numbers ko 4 barabar hisson mein: 25ve, 50ve, 75ve number pe kaat.<br><strong>Kyun chahiye:</strong> agar 4-bit ke 16 levels quantiles pe rakhe, to har level ke hisse mein lagbhag barabar weights aate hain. Koi level khaali nahi baithta.<br><strong>Iske bina (barabar doori wale levels):</strong> kinaron wale levels lagbhag khaali, aur zero ke paas bheed: wahan zyada rounding error.` },
    { type: 'h3', text: 'NF4 worked example (ek chhota block)' },
    { type: 'p', html: `Asli block 64 weights ka hota hai; yahan 8 lete hain: <code>[0.12, -0.05, 0.31, -0.22, 0.02, -0.40, 0.08, 0.17]</code>.` },
    { type: 'steps', items: [
      { t: 'absmax nikalo', d: 'Sabse bada |value| = 0.40. Ye block ka <strong>quantization constant</strong> c hai (fp32 mein store).' },
      { t: 'Normalize: har weight / 0.40', d: '<code>[0.3, -0.125, 0.775, -0.55, 0.05, -1, 0.2, 0.425]</code>. Ab sab [-1, 1] mein.' },
      { t: 'Sabse paas wala NF4 level', d: '0.3 → 0.3379 (index 11); -0.125 → -0.0910 (6); 0.775 → 0.7230 (14); -0.55 → -0.5251 (2); 0.05 → 0.0796 (8); -1 → -1 (0); 0.2 → 0.1609 (9); 0.425 → 0.4407 (12).' },
      { t: 'Store', d: 'Sirf 4-bit indexes: <code>11, 6, 14, 2, 8, 0, 9, 12</code> (binary mein 1011, 0110, 1110, ...) + ek constant 0.40.' },
      { t: 'Dequantize (forward pass ke time)', d: 'level × 0.40: <code>[0.1352, -0.0364, 0.2892, -0.2100, 0.0318, -0.4000, 0.0644, 0.1763]</code>. Asli se error chhota: max 0.0208, mean squared error 0.000171.' },
      { t: 'int4 se compare', d: 'Wahi block int4 (scale 0.4/7) se: MSE 0.000209, max error 0.0243. NF4 behtar. Humne 200 random Gaussian blocks (64 each, seeded) pe bhi check kiya: int4 ka MSE NF4 se ~1.36 guna.' },
    ]},
    { type: 'custom', render(el) {
      const NF = [-1, -0.6961928009986877, -0.5250730514526367, -0.39491748809814453, -0.28444138169288635, -0.18477343022823334, -0.09105003625154495, 0, 0.07958029955625534, 0.16093020141124725, 0.24611230194568634, 0.33791524171829224, 0.44070982933044434, 0.5626170039176941, 0.7229568362236023, 1];
      const DEF = [0.12, -0.05, 0.31, -0.22, 0.02, -0.40, 0.08, 0.17];
      let w = DEF.slice();
      const td = 'padding:3px 6px;border:1px solid var(--line);text-align:right;font:13px var(--f-mono)';
      el.innerHTML = `<div style="font-size:14px;color:var(--ink-2);margin-bottom:6px">8 weights ka block. Koi bhi value badlo, ya ek outlier daalo (jaise 3.0) aur dekho baaki weights ka kya hota hai.</div>
        <div class="nq-in" style="display:flex;flex-wrap:wrap;gap:6px"></div>
        <div style="margin-top:8px"><button type="button" class="btn small ghost nq-reset">Example values</button> <button type="button" class="btn small ghost nq-out">Outlier daalo</button></div>
        <div style="overflow-x:auto;margin-top:10px"><table class="nq-t" style="border-collapse:collapse;min-width:560px"></table></div>
        <div class="stats"><div class="stat"><span>absmax (constant c)</span><strong class="nq-c"></strong></div><div class="stat"><span>NF4 MSE / max error</span><strong class="nq-e1" style="font-size:16px"></strong></div><div class="stat"><span>int4 MSE / max error</span><strong class="nq-e2" style="font-size:16px"></strong></div></div>`;
      const drawIn = () => {
        el.querySelector('.nq-in').innerHTML = w.map((v, i) => `<input data-i="${i}" type="number" step="0.01" value="${v}" style="width:86px;font:13px var(--f-mono)">`).join('');
        el.querySelectorAll('.nq-in input').forEach(n => n.addEventListener('input', () => { const v = Number(n.value); if (isFinite(v)) { w[+n.dataset.i] = v; calc(); } }));
      };
      const calc = () => {
        const c = Math.max(...w.map(Math.abs)) || 1;
        const rows = w.map(v => {
          const z = v / c; let k = 0;
          NF.forEach((q, i) => { if (Math.abs(q - z) < Math.abs(NF[k] - z)) k = i; });
          const dq = NF[k] * c, qi = Math.max(-7, Math.min(7, Math.round(v / (c / 7)))), di = qi * c / 7;
          return { v, z, k, dq, qi, di };
        });
        const st = key => { const e = rows.map(r => r[key] - r.v); return (e.reduce((a, x) => a + x * x, 0) / e.length).toFixed(6) + ' / ' + Math.max(...e.map(Math.abs)).toFixed(4); };
        const line = (lab, fn) => `<tr><th style="${td};text-align:left;font-family:var(--f-body)">${lab}</th>${rows.map(r => `<td style="${td}">${fn(r)}</td>`).join('')}</tr>`;
        el.querySelector('.nq-t').innerHTML = line('w', r => r.v) + line('w / c', r => r.z.toFixed(4)) + line('NF4 index', r => r.k + ' <span style="color:var(--ink-3)">(' + r.k.toString(2).padStart(4, '0') + ')</span>') + line('NF4 level', r => NF[r.k].toFixed(4)) + line('dequant = level×c', r => r.dq.toFixed(4)) + line('int4 q (−7..7)', r => r.qi) + line('int4 dequant', r => r.di.toFixed(4));
        el.querySelector('.nq-c').textContent = c.toFixed(4);
        el.querySelector('.nq-e1').textContent = st('dq');
        el.querySelector('.nq-e2').textContent = st('di');
      };
      el.querySelector('.nq-reset').addEventListener('click', () => { w = DEF.slice(); drawIn(); calc(); });
      el.querySelector('.nq-out').addEventListener('click', () => { w = DEF.slice(); w[5] = 3; drawIn(); calc(); });
      drawIn(); calc();
    }},
    { type: 'p', html: `"Outlier daalo" dabao: absmax 3.0 ho jaata hai, aur baaki chhote weights (0.02, 0.08...) zyadatar ek hi level pe gir jaate hain. Isliye blocks chhote (64) rakhe jaate hain: outlier sirf apne 64 ko kharab kare, poore model ko nahi.` },
    { type: 'h3', text: '2. Double quantization (constants ko bhi daba do)' },
    { type: 'p', html: `Har 64 weights pe ek fp32 constant (32 bits) = <code>32 / 64 = 0.5 bits</code> extra per parameter. 65B model ke liye ye ~4 GB sirf constants! QLoRA ka trick: in constants ko bhi quantize karo.` },
    { type: 'code', text: `Bina DQ:  har 64 weights pe 1 constant (fp32)        = 32/64            = 0.5   bits/param

DQ ke saath:
  level 1 constants c₂ ko 8-bit float (FP8, sirf 8 bit ka float) mein          8/64             = 0.125 bits/param
  har 256 c₂ constants pe ek fp32 constant c₁             32/(64 × 256)    = 0.00195 bits/param
  (c₂ positive hote hain, to quantize se pehle unka mean ghata ke zero ke aas paas laate hain)
  total                                                   0.125 + 0.00195  ≈ 0.127 bits/param

Bachat = 0.5 - 0.127 = 0.373 bits/param
65B model:  65 × 10⁹ × 0.373 / 8 bytes ≈ 3.03 GB bache` },
    { type: 'h3', text: '3. Paged optimizers' },
    { type: 'p', html: `Training mein kabhi kabhi ek lamba sequence aata hai aur memory achanak spike karti hai, aur GPU "out of memory" se crash. QLoRA NVIDIA <strong>unified memory</strong> use karta hai: optimizer states (Adam ke m, v) ko GPU memory full hone pe automatically CPU RAM mein bhej deta hai aur zaroorat pe wapas laata hai, jaise operating system RAM aur disk ke beech pages swap karta hai. Crash ki jagah thoda slow step.` },
    { type: 'callout', tone: 'term', title: 'Naya word: paging', html: `<strong>Ye kya hai:</strong> memory ko fixed-size "pages" mein baantna. Jo page abhi kaam ka nahi, use sasti, badi memory (yahan CPU RAM) mein bhej dena, aur zaroorat pe wapas laana.<br><strong>Kyun chahiye:</strong> GPU memory chhoti aur mehngi hai, CPU RAM badi aur sasti. Kabhi kabhi ke spike ke liye bada GPU khareedna bekaar.<br><strong>Iske bina:</strong> ek lamba example aaya, memory full, training crash ("CUDA out of memory"), ghanton ka kaam gaya.` },
    { type: 'h2', text: 'Memory calculator: full vs LoRA vs QLoRA' },
    { type: 'custom', render(el) {
      const M = { '7': ['Llama 2 7B', 4096, 11008, 32], '13': ['Llama 2 13B', 5120, 13824, 40], '65': ['LLaMA 65B', 8192, 22016, 80] };
      let m = '65', dq = true;
      el.innerHTML = `<div class="chips mc-m" style="padding:0 0 8px">${Object.keys(M).map(k => `<button type="button" class="chip" data-k="${k}">${M[k][0]}</button>`).join('')}</div>
        <label>LoRA rank r (saari linear layers): <strong class="mc-rv"></strong></label><input class="mc-r" type="range" min="2" max="7" step="1" value="6" style="width:100%">
        <label style="display:flex;gap:8px;align-items:center;margin-top:6px"><input class="mc-dq" type="checkbox" checked style="width:auto"> Double quantization (QLoRA)</label>
        <div class="mc-bars" style="margin-top:12px"></div>
        <div class="calc-note">Assumptions: full fine-tune = 16 bytes/param (bf16 weights + grads, fp32 master + Adam m, v). LoRA base = bf16, 2 bytes/param. QLoRA base = 4 bits + constants (0.127 bits DQ ke saath, 0.5 bina). Adapter params = 12 bytes each (bf16 weight + bf16 grad + fp32 Adam m, v). Activations shamil <strong>nahi</strong> (batch aur sequence length pe depend; gradient checkpointing se kam hote hain). 1 GB = 10⁹ bytes.</div>`;
      const upd = () => {
        const [, d, ff, L] = M[m], r = 2 ** Number(el.querySelector('.mc-r').value);
        const P = L * (4 * d * d + 3 * d * ff) + 2 * 32000 * d, ad = r * (11 * d + 3 * ff) * L;
        const rows = [['Full fine-tune', P * 16], ['LoRA (bf16 base)', P * 2 + ad * 12], ['QLoRA (NF4 base)', P * (4 + (dq ? 0.127 : 0.5)) / 8 + ad * 12]];
        const max = rows[0][1];
        el.querySelector('.mc-rv').textContent = r + '  (' + (ad / 1e6).toFixed(1) + 'M adapter params)';
        el.querySelector('.mc-bars').innerHTML = rows.map(([n, b]) => {
          const gb = b / 1e9, fit = gb <= 24 ? '24 GB GPU mein fit' : gb <= 48 ? '48 GB GPU mein fit' : gb <= 80 ? '80 GB GPU mein fit' : Math.ceil(gb / 80) + ' × 80 GB GPU';
          return `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:14px"><span>${n}</span><strong>${gb.toFixed(1)} GB · ${fit}</strong></div>
            <div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.max(1, gb * 1e9 / max * 100).toFixed(1)}%;background:var(--accent)"></div></div></div>`;
        }).join('');
        el.querySelectorAll('.mc-m .chip').forEach(c => c.classList.toggle('on', c.dataset.k === m));
      };
      el.querySelectorAll('.mc-m .chip').forEach(c => c.addEventListener('click', () => { m = c.dataset.k; upd(); }));
      el.querySelector('.mc-r').addEventListener('input', upd);
      el.querySelector('.mc-dq').addEventListener('change', e => { dq = e.target.checked; upd(); });
      upd();
    }},
    { type: 'p', html: `Default (LLaMA 65B, r = 64, saari linear layers, DQ on): full fine-tune ~<strong>1,044.5 GB</strong>, LoRA ~<strong>140.2 GB</strong>, QLoRA ~<strong>43.3 GB</strong>: ek 48 GB GPU mein fit (activations ke liye thodi jagah bachi, aur paged optimizer spikes sambhalta hai). DQ off karo: QLoRA 46.3 GB. Paper ka ">780 GB" figure 12 bytes/param ke hisaab se hai (fp32 master copy ke bina); hamara calculator 16 maanta hai.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion: "QLoRA mein training 4-bit mein hoti hai"', html: `Nahi. 4-bit sirf <strong>storage</strong> hai (frozen W₀ ka). Har matrix multiply bf16 mein hota hai (weights turant dequantize hote hain), aur trainable LoRA weights bf16 mein hain. Isliye QLoRA, LoRA se thoda <em>slow</em> hai (har step pe dequantize ka kaam), lekin memory bahut kam.` },
    { type: 'callout', tone: 'tip', title: 'Code mein kaisa dikhta hai (Hugging Face, sketch)', html: `<code>BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=torch.bfloat16)</code> se base model load, phir <code>LoraConfig(r=16, lora_alpha=32, target_modules="all-linear", lora_dropout=0.05)</code> aur <code>get_peft_model(model, config)</code>. (<code>lora_dropout</code> = training mein adapter ke input ke kuch numbers random se 0 kar dena, taaki adapter ratta na maare.) Paged optimizer ke liye optimizer naam jaise <code>paged_adamw_8bit</code>.` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `• GPU memory kaafi hai aur best quality chahiye, data bada aur task naya domain (naya language, bahut code/maths)? <strong>Full fine-tune</strong>.<br>• Normal case: tone, format, ek narrow task, ya kai customers ke alag adapters? <strong>LoRA</strong> (all-linear, r = 8 se 64, α = r ya 2r).<br>• Model GPU mein bf16 mein fit nahi hota (jaise 33B/65B/70B ek 24-48 GB GPU pe)? <strong>QLoRA</strong>. Thoda slow, quality LoRA ke kareeb.<br>• Deploy: ek hi customer = merge karo (zero latency). Bahut customers = base ek, adapters swap ya multi-adapter serving.<br>• Pehle check karo ki prompt ya RAG se kaam nahi chalta (<a href="#/ai-training-finetuning">Decide ladder</a>).` },
    { type: 'h2', text: 'Poori picture: LoRA aur QLoRA ek nazar mein' },
    { type: 'p', html: `Ek LoRA layer, uski training, deploy, aur QLoRA ke extra hisse, sab ek diagram mein. Buttons dabao.` },
    { type: 'diagram', title: 'LoRA / QLoRA: poori picture', height: 640,
      groups: [
        { label: 'Ek LoRA layer (forward + training)', x: 12, y: 150, w: 694, h: 230 },
        { label: 'Deploy', x: 12, y: 420, w: 480, h: 206 },
      ],
      nodes: [
        { id: 'data', label: 'xyz examples', sub: 'support chats', x: 90, y: 70, kind: 'data', info: 'Ye kya hai: xyz ke customer ke tone mein likhe (sawaal, jawab) examples. Inhi pe adapter train hota hai. Kuch sau se kuch hazaar achhe examples kaafi.' },
        { id: 'nf4', label: 'W₀ in NF4', sub: '4-bit + DQ consts', x: 290, y: 70, w: 150, kind: 'data', info: 'Ye kya hai: QLoRA mein frozen base weight ka storage. Har weight 4-bit NF4 index, har 64 pe ek constant (double quantized). Memory 16-bit se ~4 guna kam.' },
        { id: 'pg', label: 'Paged Adam', sub: 'GPU ↔ CPU RAM', x: 650, y: 70, w: 110, kind: 'queue', info: 'Ye kya hai: QLoRA ka paged optimizer. A, B ke Adam states GPU full hone pe CPU RAM mein chale jaate hain aur zaroorat pe wapas. Spike pe crash ki jagah thoda slow step.' },
        { id: 'x', label: 'Input x', sub: 'k numbers', x: 90, y: 210, kind: 'client', info: 'Ye kya hai: pichhli layer se aaya ek token ka vector. Hamare example mein [1, 2, 0, -1]. Ye dono raaston (W₀ aur A) mein jaata hai.' },
        { id: 'w0', label: 'W₀ · x', sub: 'frozen, bf16', x: 290, y: 210, w: 140, kind: 'server', info: 'Ye kya hai: original layer ka matrix multiply. Weights frozen. QLoRA mein NF4 se bf16 mein turant dequantize hoke yahan multiply hote hain. Example: [-3.5, 2, 3, -2].' },
        { id: 'sum', label: 'Sum', sub: 'W₀x + s·BAx', x: 470, y: 210, kind: 'server', info: 'Ye kya hai: dono raaston ka jod. Adapter wala hissa s = α/r se scale hota hai. Example (s = 1): [-3.4, 2.5, 2.05, -0.55].' },
        { id: 'out', label: 'Output h', sub: 'agli layer', x: 650, y: 210, w: 110, kind: 'client', info: 'Ye kya hai: is layer ka result, jo agli layer mein jaata hai. Merge ke baad bhi bilkul same h milta hai.' },
        { id: 'A', label: 'A (down)', sub: 'r×k, random init', x: 290, y: 330, kind: 'cache', info: 'Ye kya hai: trainable down matrix. x ke k numbers ko r numbers mein dabati hai. Init random (Gaussian ya Kaiming-uniform). Example: A·x = [0.5, 5].' },
        { id: 'B', label: 'B (up)', sub: 'd×r, zero init', x: 470, y: 330, kind: 'cache', info: 'Ye kya hai: trainable up matrix. r numbers ko wapas d mein phailati hai. Init zero, isliye shuru mein ΔW = 0 aur model original jaisa.' },
        { id: 'loss', label: 'Loss + Adam', sub: 'sirf A, B', x: 650, y: 330, w: 110, kind: 'queue', info: 'Ye kya hai: training ka hissa. Output ko target se compare karke loss, phir gradients sirf B aur A tak. Adam states bhi sirf inke liye: memory ki asli bachat yahi.' },
        { id: 'merge', label: 'Merge', sub: "W' = W₀ + s·BA", x: 120, y: 480, w: 150, kind: 'server', info: 'Ye kya hai: training ke baad ek baar ka jod. ΔW = B·A nikaal ke W₀ mein jod do. Ab ek hi matrix, extra latency zero. Quantized base ho to 16-bit base mein merge karo.' },
        { id: 'serve', label: 'xyz Assistant', sub: 'base + adapters', x: 390, y: 570, w: 160, kind: 'client', info: 'Ye kya hai: deploy hua model. Ek customer: merged model. Kai customers: ek base GPU pe aur har request apna chhota adapter (multi-adapter serving).' },
      ],
      edges: [
        { a: 'data', b: 'x', n: 1 },
        { a: 'x', b: 'w0', n: 2 },
        { a: 'x', b: 'A', n: 2 },
        { a: 'nf4', b: 'w0', dashed: true, label: 'dequant' },
        { a: 'w0', b: 'sum', n: 3 },
        { a: 'A', b: 'B', n: 3 },
        { a: 'B', b: 'sum', n: 3 },
        { a: 'sum', b: 'out', n: 4 },
        { a: 'out', b: 'loss', n: 5 },
        { a: 'loss', b: 'B', kind: 'bad', n: 6 },
        { a: 'loss', b: 'pg', dashed: true, via: [[712, 330], [712, 70]] },
        { a: 'w0', b: 'merge', dashed: true, via: [[200, 260]] },
        { a: 'B', b: 'merge', dashed: true },
        { a: 'merge', b: 'serve', n: 7, kind: 'res', label: 'deploy' },
      ],
      paths: [
        { name: 'Forward pass', text: 'x do raaston pe: W₀·x (frozen) aur s·B·(A·x) (adapter). Dono jud ke h. Example: [-3.5, 2, 3, -2] + [0.1, 0.5, -0.95, 1.45] = [-3.4, 2.5, 2.05, -0.55].', go: ['x>w0>sum>out', 'x>A>B>sum'] },
        { name: 'Training step', text: 'Example se forward, loss, phir gradient sirf B aur A tak. W₀ ka koi update nahi, uske liye Adam states bhi nahi.', go: ['data>x>A>B>sum>out>loss', 'loss>B>A'] },
        { name: 'Merge for deploy', text: 'Training ke baad W\' = W₀ + s·B·A ek baar. Ab normal model jaisa ek matrix multiply, latency zero, output same.', go: ['w0>merge', 'B>merge', 'merge>serve'] },
        { name: 'QLoRA', text: 'W₀ 4-bit NF4 mein stored, har layer pe bf16 mein dequantize hoke multiply. Adapter bf16 mein train. Adam states paged: GPU full ho to CPU RAM.', go: ['nf4>w0>sum', 'x>A>B>sum', 'loss>pg'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>LoRA: W₀ frozen, ΔW = s·B·A, B (d×r) aur A (r×k), r bahut chhota. Output h = W₀x + s·B(Ax).</li>
      <li>Init: A random, B zero → shuru mein ΔW = 0. Dono zero = kuch nahi seekhega. Dono random = output bigdega.</li>
      <li>s = α/r ek volume knob hai. Practice mein α = r ya 2r. Bade r pe rsLoRA (α/√r).</li>
      <li>Params per matrix = r × (d + k). 4096×4096, r = 8 → 65,536 (256 guna kam). 7B pe Wq+Wv, r = 8 → 4.19M, file 8.4 MB.</li>
      <li>Merge: W' = W₀ + s·BA, output same, latency zero. Ya ek base + kai adapters swap karo.</li>
      <li>QLoRA: base 4-bit NF4 (storage), compute bf16, block 64, double quantization (0.5 → 0.127 bits/param), paged optimizers.</li>
      <li>Decide: normal case LoRA; model GPU mein fit na ho to QLoRA; naya domain + bada data + kaafi GPU ho to full fine-tune.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Trainable params 0.03% se 2% tak: gradients aur Adam states ki memory bahut kam', 'Adapter files MBs mein: ek base + kai customers', 'Merge ke baad zero extra latency', 'Base frozen: kam forgetting', 'QLoRA: 65B jaisa model ek 48 GB GPU pe fine-tune'], costs: ['Naye domain ya bade data pe full fine-tune se thoda kam seekhta hai', 'r, α, target modules jaise naye hyperparameters', 'Unmerged serving mein thodi extra compute', 'QLoRA: dequantize ki wajah se training slow, aur quantized base mein merge karna tricky', 'Adapter ek specific base model ke liye hai: base badla to dobara train'] },
    { type: 'think', questions: [
      { q: 'd = k = 4096 aur r = 8. Ek matrix ke liye full fine-tune vs LoRA mein kitne trainable numbers? Kitne guna kam?', a: 'Full: 4096 × 4096 = 16,777,216. LoRA: r × (d + k) = 8 × 8192 = 65,536. 256 guna kam (16,777,216 / 65,536 = 256).' },
      { q: 'Training ke baad tumhe ek adapter mila jisme B abhi bhi poori zero hai. Kya hua hoga?', a: 'Shayad A bhi zero se init hua (dono zero = gradient zero), ya learning rate 0 / adapter ka parameter optimizer ko diya hi nahi gaya (frozen reh gaya). Check: trainable params print karo (PEFT mein print_trainable_parameters()).' },
      { q: 'xyz ke 50 customers hain, har ek ka apna LoRA adapter. Merge karke 50 models deploy karein ya ek base + 50 adapters?', a: 'Ek base + adapters. 50 merged models = 50 × poore weights ki memory. Multi-adapter serving mein ek base GPU pe rehta hai aur har request apne customer ka chhota adapter use karti hai. Thodi extra compute, lekin memory aur cost bahut kam. Agar ek customer ka traffic bahut zyada hai, sirf uske liye merged model alag deploy kar sakte ho.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'LoRA mein W₀ (d×k) ke saath B aur A ke shapes kya hain?', options: ['B: k×r, A: r×d', 'B: d×r, A: r×k', 'B: d×d, A: k×k'], answer: 1, explain: 'ΔW = B·A ka shape d×k hona chahiye: (d×r)·(r×k) = d×k.' },
      { q: 'LoRA init mein B ko zero kyun rakhte hain?', options: ['Memory bachane ke liye', 'Taaki step 0 pe ΔW = 0 ho aur model original jaisa output de', 'Taaki A train na ho'], answer: 1, explain: 'B = 0 se ΔW = B·A = 0. A random hai, isliye B ka gradient non-zero hai aur training chalti hai.' },
      { q: 'r = 2, α = 4. Scaling s kya hai, aur ΔW kaise use hota hai?', options: ['s = 0.5, W\' = W₀ + 0.5·BA', 's = 2, W\' = W₀ + 2·BA', 's = 8, W\' = W₀ · 8BA'], answer: 1, explain: 's = α/r = 4/2 = 2. Humare example mein output [-3.3, 3, 1.1, 0.9] ho gaya.' },
      { q: 'Merged (W\'·x) aur separate (W₀x + s·B(Ax)) ke outputs mein kya farak hai?', options: ['Merged zyada accurate hai', 'Output same; merged mein kam multiplications', 'Separate hamesha fast hai'], answer: 1, explain: 'Matrix multiplication distributive hai, to answer same. Merged mein sirf d×k multiplications, extra latency zero.' },
      { q: 'QLoRA mein matrix multiply kis precision mein hota hai?', options: ['4-bit NF4', 'bf16 (weights on-the-fly dequantize)', 'fp32'], answer: 1, explain: 'Storage NF4, compute bf16. Isliye memory kam lekin step thoda slow.' },
      { q: 'Double quantization constants ki memory kitni kar deta hai (block 64)?', options: ['0.5 se 0.127 bits/param', '4 se 2 bits/param', '32 se 8 bits/param'], answer: 0, explain: '32/64 = 0.5 bits → 8/64 + 32/(64·256) ≈ 0.127 bits. 65B pe ~3 GB bachat.' },
    ]},
    { type: 'sources', items: [
      { title: 'LoRA: Low-Rank Adaptation of Large Language Models', publisher: 'Hu et al. (Microsoft), arXiv 2106.09685', year: 2021, url: 'https://arxiv.org/abs/2106.09685', used: 'h = W₀x + BAx, A random Gaussian and B zero init, α/r scaling with α set to the first r tried, Wq and Wv on GPT-3, 350 GB → 35 MB checkpoint, 1.2 TB → 350 GB VRAM, 25% speedup, no extra inference latency after merge.' },
      { title: 'QLoRA: Efficient Finetuning of Quantized LLMs', publisher: 'Dettmers et al., arXiv 2305.14314', year: 2023, url: 'https://arxiv.org/abs/2305.14314', used: 'NF4 construction (quantiles, asymmetric with exact zero), block size 64, double quantization (FP8 c₂, block 256, 0.5 → 0.127 bits, ~3 GB on 65B), paged optimizers via unified memory, NF4 storage + BF16 compute equation, LoRA on all linear layers needed, >780 GB → <48 GB, Guanaco.' },
      { title: 'PEFT LoRA developer guide', publisher: 'Hugging Face docs', official: true, url: 'https://huggingface.co/docs/peft/main/en/developer_guides/lora', used: 'Default init (Kaiming-uniform A, zero B), gaussian option, rsLoRA α/√r, merge_and_unload, target_modules="all-linear".' },
      { title: 'Making LLMs even more accessible with bitsandbytes, 4-bit quantization and QLoRA', publisher: 'Hugging Face blog', year: 2023, url: 'https://huggingface.co/blog/4bit-transformers-bitsandbytes', used: 'BitsAndBytesConfig options (nf4, double quant, bf16 compute dtype).' },
      { title: 'bitsandbytes NF4 code table (create_normal_map)', publisher: 'bitsandbytes (GitHub)', official: true, url: 'https://github.com/bitsandbytes-foundation/bitsandbytes', used: 'The 16 NF4 values; we recomputed them from normal quantiles in a script and matched to 1e-7.' },
      { title: 'LoRA Learns Less and Forgets Less', publisher: 'Biderman et al., arXiv 2405.09673', year: 2024, url: 'https://arxiv.org/abs/2405.09673', used: 'Trade-off: LoRA underperforms full fine-tuning on new domains but forgets less.' },
    ]},
  ],
});
