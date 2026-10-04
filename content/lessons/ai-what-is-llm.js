Lesson.register({
  id: 'ai-what-is-llm',
  title: 'LLM kya hai? Next-token prediction',
  minutes: 32,
  summary: `ChatGPT, Claude, Gemini: andar se sab ek hi kaam karte hain. Agla token guess karna, phir uske baad wala, phir uske baad wala. Is lesson mein dekhenge ki ye "guess" numbers se kaise banta hai (logits, softmax, sampling), model baar baar loop kyun chalata hai, aur wo confidently galat kyun bol deta hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tumhare phone ka keyboard "Good" ke baad "morning" suggest karta hai. Kyunki usne dekha hai ki log aksar yahi likhte hain.<br>ChatGPT jaisa <strong>LLM</strong> bhi yahi karta hai, bas bahut bade level pe. Wo ek baar mein sirf <strong>agla chhota tukda</strong> guess karta hai. Phir use jodta hai, aur phir agla guess karta hai. Isi tarah poora answer banta hai.<br>Is lesson mein hum dekhenge: ye guess numbers se kaise banta hai, model kai options mein se ek kaise chunta hai, aur wo kabhi kabhi poore confidence se galat kyun bol deta hai.` },

    { type: 'h2', text: 'Problem: xyz.com ka support bot fail ho raha hai' },
    { type: 'p', html: `xyz.com ek video platform hai. Roz hazaaron users support pe likhte hain: "video upload nahi ho raha", "password bhool gaya", "Premium cancel kaise karun". Abhi ek <strong>rule-based bot</strong> hai: code mein <code>if message contains "upload"</code> jaise rules.` },
    { type: 'p', html: `Dikkat: log ek hi baat hazaar tareeke se likhte hain. "Video atak gaya 99% pe", "mera clip chadh hi nahi raha", "upload stuck bro". Har naye phrase ke liye naya rule? Hindi, Hinglish, typos? Rules ki list kabhi khatam nahi hoti, aur bot aadhe sawaalon pe "Sorry, samajh nahi aaya" bolta hai.` },
    { type: 'p', html: `Humein aisa kuch chahiye jo <em>language</em> samjhe, rules nahi. Yahin se <strong>xyz Assistant</strong> ki kahaani shuru hoti hai: pehle ek chatbot (ye lesson), phir help docs se answer dene wala (RAG), phir tools chalane wala agent.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Probability (chance)', html: `<strong>Ye kya hai:</strong> koi cheez hone ka chance, 0 se 1 ke beech ka number (ya 0% se 100%). Sikka uchhalo: heads ki probability 0.5 = 50%.<br><strong>Kyun chahiye:</strong> model kabhi pakka nahi jaanta ki aage kya aayega. Wo har option ko ek chance deta hai: "login" 50%, "app" 23%...<br><strong>Iske bina:</strong> model sirf ek fixed jawab de paata, aur "kitna pakka hai" ye bata hi nahi paata.` },
    { type: 'callout', tone: 'term', title: 'Naya word: LLM (Large Language Model)', html: `<strong>Ye kya hai:</strong> ek program jo ab tak ka text dekh ke batata hai ki aage kaunsa text aane ki kitni probability hai. <strong>Large</strong> isliye kyunki isme arabon (billions) numbers hote hain, aur ye internet jitne bade text pe seekhta hai. ChatGPT ke andar GPT model hai, Claude ke andar Claude model: dono LLM hain.<br><strong>Kyun chahiye:</strong> log ek hi baat hazaar tareeke se likhte hain. LLM ne itna text dekha hai ki wo typos, Hinglish aur naye phrases bhi samajh leta hai, bina ek bhi rule likhe.<br><strong>Iske bina:</strong> xyz.com ko har phrase ke liye haath se rule likhna padta, aur list kabhi khatam nahi hoti.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Token', html: `<strong>Ye kya hai:</strong> text ka chhota tukda jise model ek unit maanta hai. Kabhi poora word (" video"), kabhi word ka hissa ("upload" + "ing"), kabhi sirf "?". English mein average 1 token ≈ 4 characters.<br><strong>Kyun chahiye:</strong> model ko pieces ki ek fixed list chahiye jinke beech wo chun sake. Letters bahut chhote hain (sequence bahut lamba), poore words bahut zyada hain (list kabhi khatam nahi). Tokens beech ka raasta hain.<br><strong>Iske bina:</strong> model ke paas "agla kya aayega" ke options ki koi fixed list hi nahi hoti.<br>Poori detail agle lesson mein: <a href="#/ai-tokenization">Tokens aur tokenization</a>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Vocabulary (vocab)', html: `<strong>Ye kya hai:</strong> un saare tokens ki fixed list jo ek model jaanta hai. Jaise ek dictionary, jisme har token ka ek number (token ID) hai. Aaj ke models ki list mein ~30 hazaar se ~2 lakh tokens hote hain.<br><strong>Kyun chahiye:</strong> "agla token" hamesha isi list mein se chuna jaata hai. Model har step pe is list ke <em>har</em> token ko ek score deta hai.<br><strong>Iske bina:</strong> model ko pata hi nahi hota ki wo kin options mein se chun raha hai.` },

    { type: 'h2', text: 'LLM ka ek hi kaam: agla token guess karo' },
    { type: 'p', html: `Sunne mein ajeeb lagega, lekin LLM ka poora kaam itna hi hai: <strong>ab tak ka text do, wo agle token ke liye har possible token ki probability batata hai</strong>. Bas. Lamba answer? Wo isi chhote kaam ko baar baar dohrane se banta hai.` },
    { type: 'ascii', text: `Input (prompt):  "xyz.com pe video upload karne ke liye pehle"

LLM ka output (agle token ke liye):
   " login"     50.6 %   ██████████████████████████
   " app"       22.8 %   ████████████
   " account"   15.3 %   ████████
   " Wi-Fi"      6.9 %   ████
   " button"     4.2 %   ██
   " cricket"    0.3 %   ▏
   ... (baaki ~1 lakh tokens, sab bahut chhote)`, caption: 'Asli model har token ke liye number deta hai. Yahan sirf 6 dikhaye hain (ye numbers samjhane ke liye banaye gaye hain).' },
    { type: 'p', html: `Model ne ye kahan se seekha? Training mein usne arabon sentences dekhe jahan "upload karne ke liye pehle" ke baad aksar "login" aaya. Usne koi rule nahi likha, bas patterns ko apne numbers mein "yaad" kar liya. Isliye ye typos aur Hinglish bhi samajh leta hai: training text mein wo sab bhi tha.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"LLM ke andar database hai jisme answers rakhe hain." Nahi. Koi table nahi hai jisme "Q: upload kaise? A: login karo" likha ho. Sirf arabon numbers (weights) hain jo milke probabilities nikalte hain. Isliye LLM kabhi kabhi ekdum believable lekin galat answer bana deta hai: wo "dhoondh" nahi raha, "bana" raha hai.` },

    { type: 'h2', text: 'Parameters aur weights: model ke andar kya hai?' },
    { type: 'p', html: `Model ko ek bahut bade function ki tarah socho: <code>f(text) → probabilities</code>. Is function ke andar arabon <strong>knobs</strong> hain. Har knob ek decimal number hai jaise <code>0.0213</code> ya <code>-1.47</code>. Input text numbers mein badalta hai, aur ye numbers knobs se multiply aur add hote hote output tak pahunchte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Parameters / Weights', html: `<strong>Ye kya hai:</strong> model ke andar ka ek seekha hua number, jaise <code>0.0213</code>. Ek "knob" jo thoda ghumaya ja sakta hai. "7B model" matlab ~7 billion (700 crore) parameters. <strong>Parameter</strong> aur <strong>weight</strong> almost same cheez ke do naam hain.<br><strong>Kyun chahiye:</strong> model ki saari "samajh" inhi numbers mein hai. Training ka matlab hi hai in numbers ko itna adjust karna ki agla-token guess sahi aane lage.<br><strong>Iske bina:</strong> model ek khaali formula hai. Wo kuch bhi sensible guess nahi kar sakta.` },
    { type: 'p', html: `Size ka andaaza: OpenAI ka GPT-3 (2020 ka paper) 175 billion parameters ka tha. Har parameter agar 2 bytes (16-bit) mein rakho to <code>175 × 10^9 × 2 = 350 GB</code> sirf weights ke liye. 32-bit mein 700 GB. Itna bada model ek laptop pe nahi chalta. Wo kai <strong>GPUs</strong> pe chalta hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: GPU', html: `<strong>Ye kya hai:</strong> Graphics Processing Unit. Ek chip jo hazaaron chhote calculations <em>ek saath</em> karti hai. Pehle games ke graphics ke liye bani thi. Iski apni tez memory hoti hai (<strong>VRAM</strong>).<br><strong>Kyun chahiye:</strong> LLM ka kaam zyadatar "bahut saare numbers ko multiply karke jodo" hai. Ye kaam GPU ek saath kar deta hai. Weights GPU ki memory mein load rehte hain.<br><strong>Iske bina:</strong> normal CPU pe bada model ek answer mein minutes laga deta.<br><strong>Example:</strong> NVIDIA H100 GPU mein 80 GB memory hai. 350 GB weights ke liye kam se kam 5 aise GPUs chahiye. Bits kam karke model chhota karna <a href="#/ai-quantization">quantization</a> lesson mein.` },
    { type: 'image', src: 'assets/img/ai-what-is-llm/h100.jpg', alt: 'Chaar NVIDIA H100 graphics cards ek line mein rakhe hue, sunehri metal body ke saath', caption: 'Chaar NVIDIA H100 GPU cards. Har card mein 80 GB memory hai. Bade LLMs aise kai cards pe ek saath chalte hain, kyunki weights ek card mein fit nahi hote.', credit: { text: '极客湾Geekerwan, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:NVIDIA_H100_(%E6%9E%81%E5%AE%A2%E6%B9%BEGeekerwan)_004.png', license: 'CC BY 3.0' } },
    { type: 'table', head: ['Cheez', 'Simple matlab', 'Example'], rows: [
      ['Architecture', 'Function ka design: kaunse steps, kis order mein (jaise kisi machine ka blueprint)', 'Transformer (A2 phase mein poora banayenge)'],
      ['Parameters / weights', 'Design ke andar ke seekhe hue numbers', 'GPT-3: 175B, Llama 3: 8B aur 70B'],
      ['Checkpoint / model file', 'Weights ko disk pe save kiya hua', 'Kai GB ki .safetensors files'],
      ['Vocabulary', 'Saare tokens ki fixed list jo model jaanta hai', 'GPT-4o ka tokenizer: ~2 lakh tokens'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Zyada parameters = hamesha better?', html: `Aam taur pe zyada parameters = zyada patterns yaad rakhne ki capacity. Lekin data ki quality, training ka tareeka aur fine-tuning bhi utna hi matter karte hain. Aaj ke kai 8B models purane 175B GPT-3 se behtar answers dete hain.` },

    { type: 'h2', text: 'Andar ka pipeline: logits → softmax → probabilities' },
    { type: 'p', html: `Model seedha percentages nahi deta. Andar teen kadam hote hain: pehle har token ka ek <strong>score</strong> (logit), phir un scores ko <strong>percentages</strong> mein badalna (softmax), phir unme se <strong>ek token chunna</strong> (sampling). Ek ek karke dekhte hain.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Logits', html: `<strong>Ye kya hai:</strong> model ki aakhri layer vocabulary ke <em>har</em> token ko ek raw score deti hai. Inhe logits kehte hain. Logit koi bhi number ho sakta hai: 4.0, -1.0, 12.7. Bada logit = model ko wo token zyada pasand. Ye abhi probability nahi hai: negative ho sakta hai, aur total 1 nahi hota.<br><strong>Kyun chahiye:</strong> model ke andar ka maths seedha scores hi nikaal sakta hai. Scores ko compare karna aasaan hai: jiska score bada, wo aage.<br><strong>Iske bina:</strong> model kisi bhi token ko "kitna pasand" hai, ye bata hi nahi paata.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Softmax', html: `<strong>Ye kya hai:</strong> ek formula jo kisi bhi numbers ki list ko probabilities mein badal deta hai: sab positive, aur total 100%. Har score ka <code>e^score</code> lo (<code>e</code> ek fixed number hai ≈ 2.718), phir sabke total se divide karo: <code>p_i = e^(z_i) / Σ e^(z_j)</code>. Yahan <code>z_i</code> = token i ka logit, aur <code>Σ</code> = "sab ko jodo".<br><strong>Kyun chahiye:</strong> token chunne ke liye humein chances chahiye jo jud ke 100% banein. Exponent ki wajah se bade scores aur bade ho jaate hain, chhote dab jaate hain. Isse model ka "favourite" saaf dikhta hai.<br><strong>Iske bina:</strong> negative scores ka chance kya hoga? Total kya hoga? Logits se seedha random choice nahi ho sakti.` },
    { type: 'p', html: `Upar wale example ke numbers haath se nikaalte hain. Logits: login 4.0, app 3.2, account 2.8, Wi-Fi 2.0, button 1.5, cricket -1.0. Har ek ka <code>e^z</code> nikaalo, sab jodo (107.81), phir har ek ko total se divide karo:` },
    { type: 'table', head: ['Token', 'Logit z', 'e^z', 'Probability = e^z / 107.81'], rows: [
      ['" login"', '4.0', '54.60', '50.6%'],
      ['" app"', '3.2', '24.53', '22.8%'],
      ['" account"', '2.8', '16.44', '15.3%'],
      ['" Wi-Fi"', '2.0', '7.39', '6.9%'],
      ['" button"', '1.5', '4.48', '4.2%'],
      ['" cricket"', '-1.0', '0.37', '0.3%'],
      ['<strong>Total</strong>', '', '<strong>107.81</strong>', '<strong>100%</strong>'],
    ], caption: 'Logit mein 0.8 ka farq (4.0 vs 3.2) probability mein 2x se zyada ka farq bana deta hai. Ye softmax ka exponent hai.' },
    { type: 'p', html: `Ab sawaal: in probabilities mein se <em>ek</em> token kaise chunein? Yahin <strong>sampling</strong> aata hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Sampling', html: `<strong>Ye kya hai:</strong> probabilities ke hisaab se random choice. Socho ek spinner (ghoomne wala pahiya) jisme "login" ka hissa aadha hai aur "button" ka bahut patla. Ghumao: zyadatar "login" aayega, kabhi kabhi "button".<br><strong>Kyun chahiye:</strong> agar hamesha top token hi lo to answers robotic aur repetitive ho jaate hain. Thodi randomness se text natural lagta hai.<br><strong>Iske bina:</strong> same sawaal pe hamesha ek hi jawab, aur lambe text mein model ek hi line dohrane lagta hai.<br>Isliye ChatGPT pe same sawaal do baar poocho to answer thoda alag aa sakta hai.` },
    { type: 'p', html: `Token chunne ke chaar mashhoor tareeke hain: <strong>greedy</strong>, <strong>temperature</strong>, <strong>top-k</strong> aur <strong>top-p</strong>. Har ek ko alag se, numbers ke saath dekhte hain. Hum wahi 6 tokens use karenge (login 50.6%, app 22.8%, account 15.3%, Wi-Fi 6.9%, button 4.2%, cricket 0.3%).` },

    { type: 'h3', text: '1) Greedy: hamesha sabse upar wala' },
    { type: 'callout', tone: 'term', title: 'Naya word: Greedy decoding', html: `<strong>Ye kya hai:</strong> koi random choice nahi. Har step pe sirf wo token lo jiski probability sabse zyada hai. "Greedy" = lalchi: abhi jo sabse achha dikhe, wahi uthao.<br><strong>Kyun chahiye:</strong> same input pe hamesha same output. Facts, code, JSON, support answers ke liye achha.<br><strong>Iske bina:</strong> jahan exact repeatable answer chahiye (jaise tests mein), wahan har baar alag output aata.` },
    { type: 'p', html: `<strong>Worked example:</strong> sabse bada 50.6% (" login") hai, to " login" hi chuna jaayega. 100 baar chalao, 100 baar " login". Baaki 49.4% wale tokens ko kabhi mauka nahi milta.<br><strong>Faayda:</strong> predictable, debug karna aasaan. <strong>Nuksaan:</strong> lambe text mein boring, aur kabhi kabhi ek hi line baar baar dohrata hai (2019 ke Holtzman paper ne ye repetition dikhaya). Har step ka "best" milke poore answer ka best ho, zaroori nahi.` },

    { type: 'h3', text: '2) Temperature: randomness ka knob' },
    { type: 'callout', tone: 'term', title: 'Naya word: Temperature (T)', html: `<strong>Ye kya hai:</strong> softmax se pehle har logit ko ek number T se divide karna: <code>p_i = e^(z_i/T) / Σ e^(z_j/T)</code>. T chhota (jaise 0.5) = scores ke beech farq bada = top token aur aage. T bada (jaise 2) = farq chhota = chhote tokens ko bhi chance.<br><strong>Kyun chahiye:</strong> ek hi knob se tay karo ki model kitna "safe" ya kitna "creative" bole. Support bot ke liye kam, story ya naam suggest karne ke liye zyada.<br><strong>Iske bina:</strong> model ki probabilities jaisi hain waisi hi rehtin. Kaam ke hisaab se adjust karne ka koi tareeka nahi.` },
    { type: 'table', head: ['Token', 'Logit z', 'T = 0.5: z/T → p', 'T = 1: p', 'T = 2: z/T → p'], rows: [
      ['" login"', '4.0', '8.00 → 75.9%', '50.6%', '2.00 → 33.8%'],
      ['" app"', '3.2', '6.40 → 15.3%', '22.8%', '1.60 → 22.7%'],
      ['" account"', '2.8', '5.60 → 6.9%', '15.3%', '1.40 → 18.6%'],
      ['" Wi-Fi"', '2.0', '4.00 → 1.4%', '6.9%', '1.00 → 12.4%'],
      ['" button"', '1.5', '3.00 → 0.5%', '4.2%', '0.75 → 9.7%'],
      ['" cricket"', '-1.0', '-2.00 → 0.0%', '0.3%', '-0.50 → 2.8%'],
    ], caption: 'T = 0.5 pe e^(z/T) ka total 3928.05 hai, T = 2 pe 21.84. Phir har token ka e^(z/T) us total se divide hota hai.' },
    { type: 'p', html: `<strong>Padho:</strong> T = 0.5 pe login 50.6% se badh ke 75.9% ho gaya. T = 2 pe ghat ke 33.8%, aur bekaar " cricket" 0.3% se badh ke 2.8%. T jitna chhota hota jaata hai, utna greedy jaisa banta hai. Isliye <strong>T = 0 ko practically greedy maana jaata hai</strong> (0 se divide nahi kar sakte, to APIs isse "hamesha top token" maanti hain).<br><strong>Faayda:</strong> ek simple knob. <strong>Nuksaan:</strong> T bada karne se achhe aur bekaar dono tokens ko chance milta hai. Bekaar tokens ko poori tarah hataane ke liye top-k ya top-p chahiye.` },

    { type: 'h3', text: '3) Top-k: sirf top k tokens ki list' },
    { type: 'callout', tone: 'term', title: 'Naya word: Top-k sampling', html: `<strong>Ye kya hai:</strong> tokens ko bade se chhote order mein lagao. Sirf upar ke k tokens rakho, baaki ko 0 kar do. Phir bache hue tokens ko dobara scale karo taaki total 100% ho (<strong>renormalize</strong>), aur unme se random chuno. Ye tareeka 2018 ke Fan et al. story-generation paper se popular hua.<br><strong>Kyun chahiye:</strong> " cricket" jaise bilkul bekaar tokens kabhi chune hi na jaayein, phir bhi top ke kuch tokens mein variety rahe.<br><strong>Iske bina:</strong> 2 lakh tokens ki lambi poonch (tail) mein se kabhi kabhi koi ajeeb token aa jaata hai, aur answer bhatak jaata hai.` },
    { type: 'p', html: `<strong>Worked example, k = 2:</strong> login 50.6% aur app 22.8% bache. Total = 73.4%. Renormalize: login = 50.6 ÷ 73.4 = <strong>69.0%</strong>, app = 22.8 ÷ 73.4 = <strong>31.0%</strong>. <strong>k = 3:</strong> total 88.6%, to login 57.1%, app 25.7%, account 17.2%.<br><strong>Faayda:</strong> simple, bekaar tail kat jaati hai. <strong>Nuksaan:</strong> k fixed hai. Jab model bahut pakka ho (ek token 99%), tab bhi k tokens rakhta hai. Jab model confused ho (50 achhe options), tab bhi sirf k rakhta hai.` },

    { type: 'h3', text: '4) Top-p (nucleus): itne tokens jitne milke p tak pahunchein' },
    { type: 'callout', tone: 'term', title: 'Naya word: Top-p (nucleus sampling)', html: `<strong>Ye kya hai:</strong> tokens ko bade se chhote order mein lagao aur unki probability jodte jao (<strong>cumulative</strong>). Jaise hi total p (jaise 0.9 = 90%) tak pahunche ya paar kare, ruk jao. Sirf utne tokens rakho, renormalize karo, phir random chuno. Ye idea 2019 ke Holtzman et al. paper se aaya. Bache hue group ko "nucleus" kehte hain.<br><strong>Kyun chahiye:</strong> list ki lambaai apne aap badalti hai. Model pakka ho to 1-2 tokens bachte hain, confused ho to zyada.<br><strong>Iske bina (sirf top-k):</strong> har situation mein same fixed k, jo kabhi zyada aur kabhi kam padta hai.` },
    { type: 'table', head: ['Token', 'p', 'Cumulative', 'p = 0.9 pe?'], rows: [
      ['" login"', '50.6%', '50.6%', 'rakho (abhi 90 se kam)'],
      ['" app"', '22.8%', '73.4%', 'rakho (abhi 90 se kam)'],
      ['" account"', '15.3%', '88.6%', 'rakho (abhi 90 se kam)'],
      ['" Wi-Fi"', '6.9%', '95.5%', 'rakho (yahan 90 paar hua, ruk jao)'],
      ['" button"', '4.2%', '', 'hata do'],
      ['" cricket"', '0.3%', '', 'hata do'],
    ], caption: 'Top-p = 0.9 pe 4 tokens bache. Renormalize (÷ 95.5%): login 53.0%, app 23.8%, account 16.0%, Wi-Fi 7.2%.' },
    { type: 'p', html: `Agar p = 0.5 hota to sirf login bachta (50.6% ne hi 50 paar kar diya): greedy jaisa. p = 0.7 pe 2 tokens, p = 0.8 pe 3.<br><strong>Faayda:</strong> model ke confidence ke hisaab se khud adjust hota hai. <strong>Nuksaan:</strong> ek aur knob samajhna padta hai. Aur top-p bhi galat facts nahi rokta, sirf bekaar tail kaatta hai.` },
    { type: 'callout', tone: 'tip', title: 'Asli APIs mein ye saath chalte hain', html: `Order aam taur pe ye hota hai: <strong>logits → ÷ T → softmax → top-k cut → top-p cut → renormalize → random pick</strong>. Har provider sab knobs nahi deta: kuch sirf temperature aur top-p dete hain. Aam salah: ek waqt pe ek hi knob badlo (temperature <em>ya</em> top-p), dono nahi.` },
    { type: 'p', html: `Pehle har tareeke ko akele chala ke dekho. Mode chuno, knob ghumao, aur table mein andar ka hisaab dekho. "20 baar sample karo" dabao: seed 42 se 20 random picks hote hain, taaki dikhe ki probabilities asal mein kaise behave karti hain.` },
    { type: 'custom', render(el) {
      const C = [[' login', 4.0], [' app', 3.2], [' account', 2.8], [' Wi-Fi', 2.0], [' button', 1.5], [' cricket', -1.0]];
      const NM = { greedy: 'Greedy', temp: 'Temperature', topk: 'Top-k', topp: 'Top-p' };
      const CT = { temp: ['Temperature T', 1, 20, 1, v => (v / 10).toFixed(1)], topk: ['k (kitne tokens rakhein)', 1, 6, 1, v => String(v)], topp: ['p (kitna total chahiye)', 5, 100, 5, v => (v / 100).toFixed(2)] };
      const val = { temp: 5, topk: 2, topp: 90 };
      let mode = 'greedy';
      el.innerHTML = `<div class="chips" style="margin-bottom:10px">${Object.keys(NM).map(m => `<button type="button" class="chip sMode${m === mode ? ' on' : ''}" data-m="${m}">${NM[m]}</button>`).join('')}</div>
        <div class="sCtl" style="margin-bottom:8px"></div>
        <div style="overflow-x:auto"><table class="sTab"></table></div>
        <div class="calc-note sNote"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="btn small primary sDraw">20 baar sample karo (seed 42)</button></div>
        <div class="sOut" style="font-family:var(--f-mono);font-size:13px;word-break:break-word"></div>`;
      const q = s => el.querySelector(s);
      const pc = x => (x * 100).toFixed(1) + '%';
      const nm = i => C[i][0].trim();
      const soft = T => { const e = C.map(c => Math.exp(c[1] / T)); const s = e.reduce((a, b) => a + b, 0); return { e, s, p: e.map(x => x / s) }; };
      let f = [];
      const calc = () => {
        const v = val[mode];
        if (mode === 'greedy') {
          const p = soft(1).p, m = p.indexOf(Math.max(...p));
          f = p.map((x, i) => i === m ? 1 : 0);
          return { head: ['Token', 'Logit', 'Probability', 'Chuna?'], rows: C.map((c, i) => [nm(i), c[1].toFixed(1), pc(p[i]), i === m ? 'haan, hamesha' : 'kabhi nahi']), note: `Sabse badi probability " ${nm(m)}" (${pc(p[m])}) ki hai. Greedy koi random choice nahi karta: har baar yahi token.` };
        }
        if (mode === 'temp') {
          const T = v / 10, r = soft(T);
          f = r.p;
          return { head: ['Token', 'Logit z', 'z ÷ T', 'e^(z/T)', 'Probability'], rows: C.map((c, i) => [nm(i), c[1].toFixed(1), (c[1] / T).toFixed(2), r.e[i].toFixed(2), pc(r.p[i])]), note: `T = ${T.toFixed(1)}: saare e^(z/T) ka total = ${r.s.toFixed(2)}. Har token ki probability = uska e^(z/T) ÷ ${r.s.toFixed(2)}. ` + (T < 1 ? 'T 1 se kam hai: top token aur dominant.' : T > 1 ? 'T 1 se zyada hai: distribution chapta, chhote tokens ko bhi chance.' : 'T = 1: model ki asli probabilities.') };
        }
        const p = soft(1).p;
        if (mode === 'topk') {
          const k = v, mass = p.slice(0, k).reduce((a, b) => a + b, 0);
          f = p.map((x, i) => i < k ? x / mass : 0);
          return { head: ['Rank', 'Token', 'p', 'Rakha?', 'Naya p'], rows: C.map((c, i) => [String(i + 1), nm(i), pc(p[i]), i < k ? 'haan' : 'hata diya', i < k ? pc(f[i]) : '0%']), note: `Top ${k} tokens ka total = ${pc(mass)}. Har bache token ka naya p = purana p ÷ ${pc(mass)}, taaki total phir 100% ho.` };
        }
        const P = v / 100; let cum = 0, n = 0; const cu = [];
        for (let i = 0; i < p.length; i++) { cum += p[i]; cu.push(cum); if (n === 0 && cum >= P - 1e-9) n = i + 1; }
        const mass = cu[n - 1];
        f = p.map((x, i) => i < n ? x / mass : 0);
        return { head: ['Token', 'p', 'Cumulative', 'Rakha?', 'Naya p'], rows: C.map((c, i) => [nm(i), pc(p[i]), pc(cu[i]), i < n ? 'haan' : 'hata diya', i < n ? pc(f[i]) : '0%']), note: `p = ${P.toFixed(2)}: upar se jodte gaye. ${n} tokens pe total ${pc(mass)} hua (${(P * 100).toFixed(0)}% ya usse zyada), wahin ruk gaye. Phir ÷ ${pc(mass)} se renormalize.` };
      };
      const draw = () => {
        const c = CT[mode];
        q('.sCtl').innerHTML = c ? `<label>${c[0]}: <strong class="sV">${c[4](val[mode])}</strong></label><input class="sR" type="range" min="${c[1]}" max="${c[2]}" step="${c[3]}" value="${val[mode]}">` : '<div class="calc-note">Greedy mein koi knob nahi hai.</div>';
        if (c) q('.sR').addEventListener('input', e => { val[mode] = Number(e.target.value); q('.sV').textContent = c[4](val[mode]); table(); });
        table();
      };
      const table = () => {
        const r = calc();
        q('.sTab').innerHTML = `<thead><tr>${r.head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${r.rows.map((row, i) => `<tr style="${f[i] > 0 ? '' : 'color:var(--ink-3)'}">${row.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody>`;
        q('.sNote').textContent = r.note;
        q('.sOut').innerHTML = '';
      };
      q('.sDraw').onclick = () => {
        let s = 42; for (let w = 0; w < 3; w++) s = s * 16807 % 2147483647;
        const cnt = C.map(() => 0), seq = [];
        for (let d = 0; d < 20; d++) {
          s = s * 16807 % 2147483647; const r = s / 2147483647;
          let acc = 0, pick = f.length - 1; while (pick > 0 && f[pick] === 0) pick--;
          for (let i = 0; i < f.length; i++) { acc += f[i]; if (f[i] > 0 && r < acc) { pick = i; break; } }
          cnt[pick]++; seq.push(nm(pick));
        }
        q('.sOut').innerHTML = `<div>${seq.join(' · ')}</div><div class="calc-note">Ginti: ${C.map((c, i) => cnt[i] ? `${nm(i)} ×${cnt[i]}` : '').filter(Boolean).join(', ')}</div>`;
      };
      el.querySelectorAll('.sMode').forEach(b => b.onclick = () => { mode = b.dataset.m; el.querySelectorAll('.sMode').forEach(x => x.classList.toggle('on', x === b)); draw(); });
      draw();
    }},
    { type: 'p', html: `Seed 42 ke 20 picks dekho. <strong>Greedy</strong>: login ×20. <strong>Temperature 0.5</strong>: login ×15, app ×4, account ×1. <strong>Temperature 2</strong>: login sirf ×9, aur bekaar " cricket" bhi ek baar aa gaya. <strong>Top-k = 2</strong>: sirf login (×14) aur app (×6), baaki kabhi nahi. <strong>Top-p = 0.9</strong>: login ×12, account ×4, app ×3, Wi-Fi ×1; button aur cricket kabhi nahi. Probabilities "chance" hain, guarantee nahi: 20 picks mein login 53.0% ki jagah 60% aaya. Jitne zyada picks, utna asli probability ke paas.` },
    { type: 'p', html: `Ab sab knobs ek saath. Temperature, top-k aur top-p badlo aur dekho kaunse tokens bachte hain aur unki probability kitni hoti hai:` },
    { type: 'custom', render(el) {
      const C = [[' login', 4.0], [' app', 3.2], [' account', 2.8], [' Wi-Fi', 2.0], [' button', 1.5], [' cricket', -1.0]];
      el.innerHTML = `<div class="calc-note" style="margin-bottom:8px">Prompt: <code>xyz.com pe video upload karne ke liye pehle ___</code></div>
        <div class="row2">
          <div><label>Temperature: <strong class="tv">1.0</strong></label><input class="tT" type="range" min="0" max="20" step="1" value="10"></div>
          <div><label>Top-k: <strong class="kv">6</strong></label><input class="tK" type="range" min="1" max="6" step="1" value="6"></div>
          <div><label>Top-p: <strong class="pv">1.00</strong></label><input class="tP" type="range" min="10" max="100" step="5" value="100"></div>
        </div>
        <div class="bars" style="display:grid;gap:6px;margin:12px 0"></div>
        <div class="stats">
          <div class="stat"><span>Tokens jo bache</span><strong class="sk"></strong></div>
          <div class="stat"><span>Top token ka chance</span><strong class="st"></strong></div>
          <div class="stat"><span>Mode</span><strong class="sm"></strong></div>
        </div>
        <div class="calc-note cn"></div>`;
      const q = s => el.querySelector(s);
      const upd = () => {
        const T = Number(q('.tT').value) / 10, k = Number(q('.tK').value), tp = Number(q('.tP').value) / 100;
        q('.tv').textContent = T.toFixed(1); q('.kv').textContent = k; q('.pv').textContent = tp.toFixed(2);
        let p;
        if (T === 0) { const m = Math.max(...C.map(c => c[1])); p = C.map(c => c[1] === m ? 1 : 0); }
        else { const e = C.map(c => Math.exp(c[1] / T)); const s = e.reduce((a, b) => a + b, 0); p = e.map(x => x / s); }
        const order = p.map((v, i) => i).sort((a, b) => p[b] - p[a]);
        const kept = new Set(); let cum = 0;
        for (const i of order.slice(0, k)) { kept.add(i); cum += p[i]; if (cum >= tp - 1e-9) break; }
        const tot = [...kept].reduce((a, i) => a + p[i], 0);
        const f = p.map((v, i) => kept.has(i) ? v / tot : 0);
        q('.bars').innerHTML = C.map((c, i) => {
          const w = (f[i] * 100).toFixed(1);
          return `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <code style="min-width:84px">${c[0].trim()}</code>
            <div style="flex:1;min-width:120px;height:14px;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden">
              <div style="height:100%;width:${w}%;background:${kept.has(i) ? 'var(--accent)' : 'var(--line-2)'}"></div></div>
            <span style="min-width:150px;font-family:var(--f-mono);font-size:13px;color:${kept.has(i) ? 'var(--ink)' : 'var(--ink-3)'}">logit ${c[1].toFixed(1)} → ${kept.has(i) ? w + '%' : 'hata diya'}</span></div>`;
        }).join('');
        q('.sk').textContent = kept.size + ' / 6';
        q('.st').textContent = (f[order[0]] * 100).toFixed(1) + '%';
        q('.sm').textContent = T === 0 ? 'Greedy' : 'Sampling';
        q('.cn').textContent = T === 0 ? 'T = 0: koi randomness nahi, hamesha " login". Same prompt = same answer.'
          : T < 1 ? 'T < 1: distribution nukila. Top token aur zyada dominant, answers predictable.'
          : T > 1 ? 'T > 1: distribution chapta. " cricket" jaise bekaar tokens ko bhi chance milne lagta hai, answers creative lekin bhatak sakte hain.'
          : 'T = 1: model ki asli probabilities, bina badlav.';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'p', html: `Kuch numbers jo widget mein dikhenge: T = 1 pe login 50.6%. T = 0.5 pe login 75.9% aur cricket ~0%. T = 2 pe login sirf 33.8% aur cricket 2.8% tak badh jaata hai. Top-p = 0.90 pe pehle teen tokens milke 88.6% hain (90 se kam), isliye chautha (Wi-Fi) bhi rakha jaata hai: 4 tokens bachte hain. Top-k = 2 pe login 69.0% aur app 31.0%.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Temperature 0 kar diya, ab model sach bolega." Nahi. Temperature sirf <em>randomness</em> kam karta hai, <em>knowledge</em> nahi badhata. Agar model ka sabse pasandida token hi galat hai, T = 0 us galat answer ko har baar same tarah dohrayega. Aur kai APIs mein T = 0 pe bhi output 100% identical guaranteed nahi hota (GPU par floating point maths aur batching ki wajah se chhote farq).` },

    { type: 'h2', text: 'Autoregressive loop: ek token, phir agla, phir agla' },
    { type: 'p', html: `Ek token mil gaya. Poora answer kaise banega? Simple: chuna hua token prompt ke end mein jod do, aur poora text dobara model ko do. Model ab agla token guess karega. Ye loop tab tak chalta hai jab tak (1) model ek special <strong>end token</strong> na chun le, ya (2) <code>max_tokens</code> limit na aa jaaye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Autoregressive', html: `<strong>Ye kya hai:</strong> apne hi pichle output ko agle step ka input banana. "Auto" (khud) + "regressive" (pichhli values se aage predict karna). Jaise tum ek sentence likhte waqt har naya word pichhle words padh ke chunte ho.<br><strong>Kyun chahiye:</strong> model ek baar mein sirf ek token de sakta hai. Lamba answer banane ka yahi tareeka hai: ek token, use jodo, phir agla.<br><strong>Iske bina:</strong> model sirf ek token ka answer de paata. Aur har naya token pichhle tokens se juda na hota, to sentence ka matlab nahi banta.` },
    { type: 'callout', tone: 'term', title: 'Naya word: End token aur max_tokens', html: `<strong>Ye kya hai:</strong> <strong>end token</strong> vocabulary ka ek special token hai jiska matlab hai "answer khatam". <strong>max_tokens</strong> ek setting hai jo developer deta hai: "zyada se zyada itne tokens banana".<br><strong>Kyun chahiye:</strong> loop ko kahin rukna hai. Model khud end token chun ke rukta hai. max_tokens ek safety limit hai, taaki model ghanton tak likhta na rahe aur bill na badhe.<br><strong>Iske bina:</strong> loop kabhi na rukta, ya kabhi kabhi bahut lamba (aur mehenga) chalta.<br><strong>Example:</strong> API batati hai ki kyun ruka: <code>finish_reason: "stop"</code> (end token mila) ya <code>"length"</code> (max_tokens poore, answer beech mein kata).` },
    { type: 'steps', items: [
      { t: 'Prompt → tokens', d: 'Text ko token IDs mein todo (tokenizer).' },
      { t: 'Forward pass', d: 'Saare tokens model se guzarte hain, aakhri position pe har vocab token ka logit milta hai.' },
      { t: 'Softmax + sampling', d: 'Temperature/top-k/top-p lagao, ek token chuno.' },
      { t: 'Append', d: 'Naya token sequence mein jodo. Agar app streaming kar raha hai to ye token turant user ko bhej do.' },
      { t: 'Repeat ya stop', d: 'End token mila ya max_tokens poore? Ruk jao. Warna step 2 pe wapas.' },
    ]},
    { type: 'p', html: `Neeche ek chhota sa <em>nakli</em> model hai (sirf ~25 tokens jaanta hai, probabilities humne likhi hain). Lekin loop bilkul asli jaisa hai. "Agla token" dabao aur har step pe dekho: probabilities, random number, aur chuna hua token.` },
    { type: 'custom', render(el) {
      const M = { '<s>': [[' Pehle', .55], [' Upload', .30], [' Shayad', .15]],
        ' Pehle': [[' login', .70], [' app', .20], [' restart', .10]], ' Upload': [[' button', .80], [' karo', .20]],
        ' Shayad': [[' internet', .60], [' server', .40]], ' login': [[' karo', .75], [' kijiye', .25]],
        ' app': [[' update', .65], [' kholo', .35]], ' restart': [[' karo', .90], [' kijiye', .10]],
        ' button': [[' dabao', .85], [' dhoondo', .15]], ' internet': [[' slow', .70], [' band', .30]],
        ' server': [[' down', .60], [' busy', .40]], ' phir': [[' upload', .55], [' try', .45]],
        ' upload': [[' karo', 1]], ' try': [[' karo', 1]], '.': [['<end>', 1]] };
      ['karo', 'kijiye', 'kholo', 'update', 'dabao', 'dhoondo', 'slow', 'band', 'down', 'busy'].forEach(w => { M[' ' + w] = [[' phir', .40], ['.', .60]]; });
      const adj = (d, T) => {
        if (T === 0) { const m = Math.max(...d.map(x => x[1])); let done = false; return d.map(x => { const v = (!done && x[1] === m) ? 1 : 0; if (v) done = true; return [x[0], v]; }); }
        const e = d.map(x => Math.pow(x[1], 1 / T)); const s = e.reduce((a, b) => a + b, 0); return d.map((x, i) => [x[0], e[i] / s]);
      };
      el.innerHTML = `<div class="calc-note" style="margin-bottom:8px">User: <code>Video upload nahi ho raha, kya karun?</code> → Assistant:</div>
        <div class="row2">
          <div><label>Temperature: <strong class="gtv">1.0</strong></label><input class="gT" type="range" min="0" max="20" step="5" value="10"></div>
          <div><label>Seed (random ka starting number)</label><input class="gS" type="number" value="42" min="1" step="1"></div>
          <div><label>max_tokens: <strong class="gmv">12</strong></label><input class="gM" type="range" min="2" max="12" step="1" value="12"></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
          <button type="button" class="btn small primary gN">Agla token</button>
          <button type="button" class="btn small ghost gA">Poora generate</button>
          <button type="button" class="btn small ghost gR">Reset</button></div>
        <div class="gOut" style="font-family:var(--f-mono);padding:10px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface-2);min-height:44px;word-break:break-word"></div>
        <div class="gStep" style="margin-top:10px;overflow-x:auto"></div>
        <div class="stats"><div class="stat"><span>Tokens bane</span><strong class="gC"></strong></div><div class="stat"><span>finish_reason</span><strong class="gF"></strong></div></div>`;
      const q = s => el.querySelector(s);
      let st;
      const reset = () => {
        let s = Math.floor(Math.abs(Number(q('.gS').value) || 1)) % 2147483647; if (s <= 0) s += 2147483646;
        for (let w = 0; w < 3; w++) s = s * 16807 % 2147483647;
        st = { s, last: '<s>', out: [], done: '' }; q('.gStep').innerHTML = ''; draw();
      };
      const draw = () => {
        q('.gOut').innerHTML = st.out.map((t, i) => `<span style="background:${i === st.out.length - 1 ? 'var(--accent-soft)' : 'transparent'};border-radius:4px">${t.replace(/ /g, '&nbsp;')}</span>`).join('') || '<span style="color:var(--ink-3)">(abhi khaali)</span>';
        q('.gC').textContent = st.out.length; q('.gF').textContent = st.done || '...';
        q('.gN').disabled = q('.gA').disabled = !!st.done;
      };
      const step = () => {
        if (st.done) return;
        const T = Number(q('.gT').value) / 10, max = Number(q('.gM').value);
        if (st.out.length >= max) { st.done = 'length (max_tokens)'; draw(); return; }
        const d = adj(M[st.last], T);
        st.s = st.s * 16807 % 2147483647; const r = st.s / 2147483647;
        let c = 0, pick = d[d.length - 1][0];
        for (const [t, p] of d) { c += p; if (r < c) { pick = t; break; } }
        q('.gStep').innerHTML = `<table><thead><tr><th>Agla token</th><th>Probability (T=${T.toFixed(1)})</th><th>Cumulative</th></tr></thead><tbody>` +
          (() => { let cc = 0; return d.map(([t, p]) => { cc += p; return `<tr style="${t === pick ? 'font-weight:700;color:var(--accent-ink)' : ''}"><td><code>${t.replace('<', '&lt;').replace('>', '&gt;')}</code></td><td>${(p * 100).toFixed(1)}%</td><td>${(cc * 100).toFixed(1)}%</td></tr>`; }).join(''); })() +
          `</tbody></table><div class="calc-note">Random number r = ${r.toFixed(3)}. Pehla token jiska cumulative r se bada hai, wahi chuna gaya: <code>${pick.replace('<', '&lt;').replace('>', '&gt;')}</code></div>`;
        if (pick === '<end>') st.done = 'stop (end token)'; else { st.out.push(pick); st.last = pick; if (st.out.length >= max && M[pick]) { /* agle click pe length */ } }
        draw();
      };
      q('.gN').onclick = step;
      q('.gA').onclick = () => { let g = 0; while (!st.done && g++ < 40) step(); };
      q('.gR').onclick = reset;
      ['.gT', '.gS', '.gM'].forEach(s => q(s).addEventListener('input', () => { q('.gtv').textContent = (Number(q('.gT').value) / 10).toFixed(1); q('.gmv').textContent = q('.gM').value; reset(); }));
      reset();
    }},
    { type: 'p', html: `Try karo: <strong>T = 0</strong> pe koi bhi seed do, answer hamesha "Pehle login karo." aata hai (greedy). <strong>T = 1, seed 7</strong> pe "Pehle app update phir try karo." aata hai: same model, alag random number, alag answer. <strong>T = 1.5, seed 28</strong> pe model "phir try karo phir try karo" ke chakkar mein phans jaata hai aur 12 tokens pe <code>max_tokens</code> use beech mein kaat deta hai (finish_reason = length). Asli APIs bhi yahi <code>finish_reason</code> batate hain.` },
    { type: 'callout', tone: 'why', title: 'Isliye streaming hoti hai', html: `ChatGPT words ek ek karke kyun dikhata hai? Kyunki model sach mein ek ek token hi banata hai. Poora answer banne ka wait karne ki jagah app har token aate hi screen pe bhej deta hai. Pehla token kitni jaldi aaya (<strong>TTFT</strong>, time to first token) aur phir kitne tokens per second aaye: yahi do numbers LLM app ki "speed" hain. Lamba answer = zyada loops = zyada time aur zyada paisa.` },

    { type: 'h2', text: 'xyz Assistant v1: request ka poora safar' },
    { type: 'p', html: `xyz.com apna model khud train nahi karega (bahut mehenga). Wo ek LLM provider ki <strong>API</strong> use karega (API = ek program ka doosre program se baat karne ka tay tareeka; <a href="#/what-is-api">API lesson</a> dekho): app server prompt bhejta hai, provider ke GPUs pe model chalta hai, tokens wapas aate hain. Har box pe click karke uska role padho, phir scenarios chalao.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Inference', html: `<strong>Ye kya hai:</strong> trained model ko use karke output nikaalna. Weights badalte nahi, sirf padhe jaate hain. Jab bhi tum ChatGPT se kuch poochte ho, wo inference hai. Iske ulat <strong>training</strong> mein weights badalte hain (neeche detail).<br><strong>Kyun chahiye:</strong> model ek baar ban gaya, ab crores users ke sawaalon pe use chalana hai. Yahi inference hai.<br><strong>Iske bina:</strong> trained model bas disk pe padi ek badi file hai, kisi kaam ki nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: System prompt', html: `<strong>Ye kya hai:</strong> model ko diye gaye "background instructions", jo user nahi, app ka developer likhta hai. Jaise: "Tum xyz.com ke support assistant ho. Chhota aur polite jawab do."<br><strong>Kyun chahiye:</strong> model ko pata chale ki wo kaun hai, kis tone mein bole, aur kya na kare.<br><strong>Iske bina:</strong> model ek general chatbot ki tarah bolega: kabhi lamba, kabhi off-topic. Detail: <a href="#/ai-prompts">Prompts</a> lesson.` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'u', label: 'User', sub: 'xyz app', x: 80, y: 110, w: 124, kind: 'client', info: 'Ye kya hai: xyz.com ka user, jo app ke chat box mein sawaal likhta hai. Isi ke liye poora system bana hai. Use answer token-by-token aata (stream hota) dikhta hai.' },
        { id: 'app', label: 'xyz server', sub: 'prompt banata hai', x: 270, y: 110, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ka apna backend server. Ye beech mein isliye hai kyunki API key aur system prompt user ke phone pe nahi rakh sakte. User ke message ke saath ek system prompt jodta hai ("Tum xyz.com ke support assistant ho..."), settings lagata hai (model, temperature, max_tokens), API key ke saath provider ko bhejta hai, aur jawab user tak stream karta hai. Retries, timeouts aur logging bhi yahin.' },
        { id: 'api', label: 'LLM API', sub: 'provider gateway', x: 470, y: 110, w: 140, kind: 'edge', meter: true, load: 30, info: 'Ye kya hai: LLM provider (jaise OpenAI, Anthropic, Google) ka public darwaza, ek URL (jaise /v1/messages ya /v1/chat/completions). xyz.com ko apne GPUs nahi khareedne padte, isliye ye API use hoti hai. Kaam: API key check, rate limits (requests/min, tokens/min), billing ke liye token counting, aur request ko kisi free GPU server tak bhejna.' },
        { id: 'gpu', label: 'Model', sub: 'GPU pe weights', x: 636, y: 110, w: 132, kind: 'data', info: 'Ye kya hai: provider ke GPU servers, jinki memory mein model ke weights load hain. Asli "sochne" ka kaam yahin hota hai. Yahan tokenizer text ko tokens banata hai, phir autoregressive loop chalta hai: forward pass → logits → softmax → sample → append. Har naya token turant wapas stream hota hai.' },
        { id: 'docs', label: 'Help docs', sub: 'xyz ki asli policy', x: 470, y: 240, w: 160, kind: 'data', hidden: true, info: 'Ye kya hai: xyz.com ke asli help articles: refund policy, upload limits. Model ne inhe training mein kabhi nahi dekha. Inhe prompt mein daalna = grounding. Ye RAG ka idea hai, A4 phase mein poora banayenge.' },
      ],
      edges: [{ a: 'u', b: 'app' }, { a: 'app', b: 'api' }, { a: 'api', b: 'gpu' }, { id: 'e-docs', a: 'app', b: 'docs', hidden: true }],
      scenarios: [
        { name: 'Happy path (streaming)', steps: [
          { title: 'User ka sawaal', text: 'User likhta hai: "Video upload nahi ho raha, kya karun?"', go: 'u>app', msg: 'POST /chat  { "message": "Video upload nahi ho raha, kya karun?" }' },
          { title: 'Prompt banaya', text: 'Server system prompt + user message jod ke API ko bhejta hai. Temperature kam (0.3) kyunki support answers stable chahiye.', go: 'app>api', msg: '{ model, max_tokens: 300, temperature: 0.3,\n  system: "Tum xyz.com ke support assistant ho...",\n  messages: [{ role: "user", content: "Video upload..." }], stream: true }' },
          { title: 'Tokenize + pehla forward pass', text: 'API request ko GPU tak bhejti hai. Prompt tokens mein badalta hai aur saare prompt tokens ek saath model se guzarte hain (isko <strong>prefill</strong> kehte hain: poora prompt ek hi baar mein padhna). Pehla output token nikla.', go: 'api>gpu', after: { gpu: { state: 'hot', sub: 'token 1: " Pehle"' } } },
          { title: 'Token by token stream', text: 'Har naya token turant wapas bhejta hai, aur loop agla token banane lagta hai. User ko text "type" hota dikhta hai.', go: ['evt:gpu>api>app>u'], msg: 'event: " Pehle"\nevent: " login"\nevent: " karo"\n...', after: { gpu: { sub: 'loop chal raha' } } },
          { title: 'Stop', text: 'Model ne end token chuna. API batati hai kitne tokens lage (billing) aur kyun ruka.', go: 'res:gpu>api>app>u', after: { gpu: { state: 'ok', sub: 'done' } }, msg: '{ stop_reason / finish_reason: "stop",\n  usage: { input_tokens: 412, output_tokens: 58 } }' },
        ]},
        { name: 'Hallucination', intro: 'User xyz.com ki ek specific policy poochta hai jo model ne kabhi padhi hi nahi.', steps: [
          { title: 'Policy ka sawaal', text: '"xyz Premium ka refund kitne din mein aata hai?"', go: 'u>app>api>gpu', msg: 'Refund kitne din mein?' },
          { title: 'Model "bana" deta hai', text: 'Model ke paas xyz.com ki policy nahi hai. Lekin training mein usne hazaaron companies ke "refund 5-7 working days" wale pages dekhe hain. Sabse probable tokens wahi hain, to wo confidently wahi likh deta hai.', set: { gpu: { state: 'warn', sub: '"7 din" (guess!)' } }, go: 'res:gpu>api>app>u', msg: 'Assistant: "Refund 7 working days mein aa jaata hai."' },
          { title: 'Asli policy alag thi', text: 'xyz.com ki asli policy 14 din hai. Answer fluent tha, confident tha, aur galat tha. Model ne jhooth nahi bola: usne bas "sabse probable text" banaya. Ise <strong>hallucination</strong> kehte hain.', focus: ['gpu'], set: { u: { state: 'warn', sub: 'galat info mili' } } },
          { title: 'Fix ka idea: grounding', text: 'Server pehle xyz ke help docs se sahi paragraph nikaale aur prompt mein daal de: "Sirf neeche diye text se answer do, na pata ho to bolo pata nahi." Ab model ke paas copy karne layak sahi text hai. Isko <strong>grounding</strong> kehte hain, aur iska system RAG hai.', show: ['docs', 'e-docs'], go: ['app>docs', 'res:docs>app'], set: { gpu: { state: '', sub: 'GPU pe weights' }, u: { state: '', sub: 'xyz app' } }, after: { docs: { state: 'ok', sub: 'refund: 14 din' } } },
        ]},
        { name: 'Rate limit (429)', steps: [
          { title: 'Traffic spike', text: 'Ek viral video ke baad hazaaron users ek saath chat karte hain.', flood: { paths: ['u>app>api'], n: 14 }, after: { api: { load: 100, state: 'hot', sub: 'limit full' } } },
          { title: 'API mana karti hai', text: 'xyz ka account per-minute token limit cross kar gaya. API <code>429 Too Many Requests</code> lautati hai (429 = "bahut zyada requests, thoda ruko"; <a href="#/rate-limiting">rate limiting</a> lesson). Model tak request pahunchi hi nahi.', go: 'bad:api>app', msg: 'HTTP 429  { "error": "rate_limit_exceeded" }\nretry-after: 20' },
          { title: 'Server ka sahi jawab', text: 'Achha server turant retry ki baarish nahi karta (isse aur bura hota). Wo <em>exponential backoff</em> se retry karta hai: pehle 1 second ruko, phir 2, phir 4 (<a href="#/resilience">resilience</a> lesson), aur tab tak user ko polite message dikhata hai. Lambe samay ke liye: zyada limit kharido, chhote prompts, ya sasta/chhota model as fallback.', go: 'res:app>u', after: { api: { load: 60, state: '', sub: 'provider gateway' } }, msg: 'Assistant: "Abhi bahut log chat kar rahe hain, 20 second mein try karo."' },
        ]},
        { name: 'max_tokens cutoff', steps: [
          { title: 'Chhoti limit', text: 'Developer ne paisa bachane ke liye <code>max_tokens: 20</code> rakh diya. User ne lamba troubleshooting guide maanga.', go: 'u>app>api>gpu', msg: '{ max_tokens: 20, ... }' },
          { title: 'Beech mein kat gaya', text: 'Model ka answer abhi khatam nahi hua tha, lekin 20 tokens poore. Loop wahin ruk gaya. User ko adhoora sentence mila.', set: { gpu: { state: 'warn', sub: '20/20 tokens' } }, go: 'res:gpu>api>app>u', msg: '"Pehle app update karo, phir Settings mein jaake Storage permission on karo, phir"\nfinish_reason: "length"' },
          { title: 'Fix', text: 'Server ko <code>finish_reason</code> check karna chahiye. "length" aaya to limit badhao, ya model se "continue" karwao, ya prompt mein bolo "5 points se zyada mat likho".', focus: ['app'], set: { gpu: { state: '', sub: 'GPU pe weights' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'LLM hallucinate kyun karta hai?' },
    { type: 'callout', tone: 'term', title: 'Naya word: Hallucination', html: `<strong>Ye kya hai:</strong> model ka aisa answer jo fluent aur confident lage, lekin galat ya bana hua ho: nakli refund policy, nakli research paper, nakli function name.<br><strong>Kyun samajhna zaroori hai:</strong> model "sach dhoondhta" nahi, "probable text banata" hai. Ye uski banawat ka hissa hai, koi chhota bug nahi.<br><strong>Iska nuksaan:</strong> user galat info pe bharosa kar leta hai (galat refund date, galat code), aur xyz.com ka naam kharab hota hai.` },
    { type: 'list', items: [
      `<strong>Kaam hi "probable text" banana hai.</strong> Training ka goal tha "agla token sahi guess karo", "sirf sach bolo" nahi. Ek believable sentence aur ek sach sentence model ke liye ek jaise dikh sakte hain.`,
      `<strong>Rare facts weak hote hain.</strong> Jo fact training text mein hazaar baar aaya (Paris France ki capital hai) wo pakka yaad. Jo ek-do baar aaya (kisi chhote startup ke founder ka birthday) wo dhundhla. Dhundhle fact pe model milta-julta kuch bana deta hai.`,
      `<strong>Knowledge cutoff.</strong> Model ne ek date tak ka data dekha. Uske baad ki cheezein (xyz.com ka naya Premium plan) use pata hi nahi.`,
      `<strong>Guess karne ka inaam.</strong> OpenAI ke 2025 ke paper "Why Language Models Hallucinate" ka argument: zyadatar benchmarks sahi answer ko point dete hain aur "pata nahi" ko zero. Exam ki tarah, guess karna "pata nahi" bolne se zyada score deta hai, to models guess karna seekh jaate hain.`,
      `<strong>Ek galat token, phir uspe aur.</strong> Autoregressive loop mein ek baar galat token chun liya, to agle tokens us galti ko sach maan ke aage badhte hain.`,
    ]},
    { type: 'table', head: ['Fix', 'Kaise madad karta hai', 'Lesson'], rows: [
      ['Grounding / RAG', 'Sahi documents prompt mein daalo, model unse answer de', '<a href="#/ai-rag">RAG</a>'],
      ['Tools', 'Order status jaisi cheez model guess na kare, API se pooche', '<a href="#/ai-agents">Agents</a>'],
      ['"Pata nahi" bolne ki permission', 'Prompt: "Docs mein na ho to clearly bolo ki pata nahi"', '<a href="#/ai-prompts">Prompts</a>'],
      ['Citations + evals', 'Har claim ka source dikhao, aur test sets pe galtiyan naapo', '<a href="#/ai-agent-patterns">Evals</a>'],
    ]},

    { type: 'h2', text: 'Training vs inference' },
    { type: 'callout', tone: 'term', title: 'Naya word: Training', html: `<strong>Ye kya hai:</strong> model ke weights ko dheere dheere sudhaarna, taaki uske guess sahi aane lagein. Jaise practice tests: galti dekho, thoda sudhaaro, phir agla test.<br><strong>Kyun chahiye:</strong> shuru mein weights random hote hain aur model bakwaas bolta hai. Training hi use language sikhati hai.<br><strong>Iske bina:</strong> koi samajhdaar model hi nahi hota. Inference ke liye kuch hota hi nahi.` },
    { type: 'p', html: `Ab tak humne model ko <em>use</em> kiya (inference). Lekin weights aaye kahan se? <strong>Training</strong> se. Training mein model ko asli text ka tukda dikhate hain, usse agla token guess karwate hain, aur jitna galat tha utna weights ko thoda sa sudhaar dete hain. Ye arabon baar dohraya jaata hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Loss', html: `<strong>Ye kya hai:</strong> model kitna galat tha, uska ek number. Chhota loss = achha. <strong>Kyun chahiye:</strong> "kitna galat" naape bina pata hi nahi chalega ki weights kis taraf sudhaarne hain. <strong>Iske bina:</strong> training andhere mein teer chalane jaisi hogi.<br>LLM training mein loss = <code>-ln(p)</code> (ln = natural log, ek maths function: p jitna chhota, -ln(p) utna bada), jahan p wo probability hai jo model ne <em>sahi</em> agle token ko di. Sahi token ko 90% diya → loss 0.105 (chhota, badhiya). 50% → 0.693. 10% → 2.303. 1% → 4.605 (bahut bura). Training ka poora kaam is average loss ko neeche laana hai. Weights ko kis direction mein badlein, ye <strong>gradient descent</strong> naam ka tareeka batata hai: har weight ke liye dekho ki use thoda badhane se loss badhta hai ya ghatta hai, phir use loss ghatane wali taraf thoda sa khiskao.` },
    { type: 'compare',
      left: { title: 'Training', html: `• Weights <strong>badalte</strong> hain<br>• Trillions of tokens ka text<br>• Hazaaron GPUs, hafte-mahine, crores-arabon rupaye<br>• Ek baar (ya kabhi kabhi) hota hai<br>• Output: model file (weights)<br>• Model banane wali companies karti hain` },
      right: { title: 'Inference', html: `• Weights sirf <strong>padhe</strong> jaate hain (frozen)<br>• Ek prompt, kuch hazaar tokens<br>• Ek ya kuch GPUs, milliseconds-seconds<br>• Har user request pe, crores baar<br>• Output: generated tokens<br>• xyz.com jaise apps API se karte hain` },
    },
    { type: 'p', html: `Training ke bhi stages hain: pehle <strong>pre-training</strong> (internet text pe agla token, isse "base model" banta hai jo sirf text aage badhata hai), phir <strong>fine-tuning</strong> (instructions follow karna, chat karna, safe rehna). Base model ko "Video upload kaise karein?" do to wo shayad aur sawaal hi likh de; chat model jawab deta hai. Detail: <a href="#/ai-training-finetuning">Pre-training, fine-tuning, RLHF</a>.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Main chat mein model ko sikha dunga, wo yaad rakhega." Nahi. Chat karna inference hai, weights nahi badalte. Model ko jo "yaad" lagta hai wo bas isliye kyunki purani baatein har baar prompt (context) mein dobara bheji jaati hain. Nayi chat = sab bhool gaya. Ye <a href="#/ai-context">context window</a> lesson mein.` },

    { type: 'callout', tone: 'tip', title: 'Decide: LLM lagayein ya simple code?', html: `• <strong>Simple code/rules</strong>: jab input fixed format mein ho aur answer exactly sahi chahiye (balance, tax, order status lookup). Sasta, fast, 100% predictable.<br>• <strong>LLM</strong>: jab input free-form language ho (har koi alag tareeke se likhe), ya output naturally likha hua text ho (summary, reply, explanation).<br>• <strong>Dono</strong>: LLM sawaal samjhe, code/database asli fact laaye (tools/RAG). Zyadatar real apps yahi karte hain.<br>• <strong>Temperature</strong>: facts, code, JSON, support → 0 se 0.3. Brainstorm, story, naam suggest karna → 0.7 se 1.0.` },

    { type: 'h2', text: 'Poori picture' },
    { type: 'diagram', title: 'LLM: poori picture, ek nazar mein', height: 600,
      groups: [
        { label: 'xyz.com', x: 20, y: 8, w: 680, h: 104 },
        { label: 'LLM provider (inference, har request pe)', x: 20, y: 140, w: 680, h: 300 },
        { label: 'Training (pehle hi ho chuki, offline)', x: 20, y: 470, w: 680, h: 118 },
      ],
      nodes: [
        { id: 'u', label: 'User', sub: 'chat box', x: 110, y: 60, w: 150, kind: 'client', info: 'Ye kya hai: xyz.com ka user jo sawaal likhta hai. Use answer token-by-token aata dikhta hai (streaming).' },
        { id: 'app', label: 'xyz server', sub: 'system prompt jodta', x: 360, y: 60, w: 150, kind: 'server', info: 'Ye kya hai: xyz.com ka backend. System prompt aur settings (temperature, max_tokens) jodta hai, API key rakhta hai, finish_reason check karta hai, aur zaroorat ho to help docs se sahi text laata hai.' },
        { id: 'docs', label: 'Help docs', sub: 'asli policy', x: 610, y: 60, w: 150, kind: 'data', info: 'Ye kya hai: xyz.com ke asli help articles. Model ne inhe training mein nahi dekha. Inka sahi paragraph prompt mein daalna = grounding, jo hallucination kam karta hai (RAG lesson).' },
        { id: 'api', label: 'LLM API', sub: 'key, limits, bill', x: 110, y: 200, w: 150, kind: 'edge', info: 'Ye kya hai: provider ka darwaza. API key check, rate limit (429), token gin ke bill, aur request ko kisi free GPU tak bhejna.' },
        { id: 'tok', label: 'Tokenizer', sub: 'text → token IDs', x: 360, y: 200, w: 150, kind: 'queue', info: 'Ye kya hai: text ko tokens mein todne wala program. Har token ka vocabulary mein ek number (ID) hai. Model sirf ye numbers dekhta hai.' },
        { id: 'gpu', label: 'Model (weights)', sub: 'GPU pe forward pass', x: 610, y: 200, w: 150, kind: 'server', info: 'Ye kya hai: GPU memory mein rakhe arabon weights. Saare tokens inse guzarte hain (forward pass), aur aakhri position pe har vocab token ka ek score nikalta hai.' },
        { id: 'soft', label: 'Logits → softmax', sub: 'har token ka %', x: 610, y: 370, w: 150, kind: 'cache', info: 'Ye kya hai: logits = har token ka raw score. Softmax inhe probabilities banata hai (sab positive, total 100%). Temperature yahin, softmax se pehle, lagta hai.' },
        { id: 'samp', label: 'Sampler', sub: 'T, top-k, top-p', x: 350, y: 370, w: 150, kind: 'queue', info: 'Ye kya hai: probabilities mein se ek token chunne wala hissa. Greedy (hamesha top), ya temperature/top-k/top-p ke saath random. Chuna hua token stream hota hai aur input mein jud ke loop dobara chalta hai.' },
        { id: 'data', label: 'Training text', sub: 'internet, books, code', x: 110, y: 530, w: 160, kind: 'data', info: 'Ye kya hai: trillions tokens ka text. Model isi pe "agla token guess karo" ki practice karta hai. Isme jo nahi tha (xyz ki policy, kal ki news), wo model ko pata nahi.' },
        { id: 'train', label: 'Training loop', sub: 'loss ghatao', x: 360, y: 530, w: 150, kind: 'server', info: 'Ye kya hai: guess karo, loss (-ln p) naapo, gradient descent se weights thoda sudhaaro, repeat. Hazaaron GPUs, hafte-mahine. Output: weights ki file. Chat karne se ye dobara nahi chalta.' },
      ],
      edges: [
        { a: 'u', b: 'app', n: 1, label: 'sawaal' },
        { a: 'app', b: 'api', n: 2, label: 'prompt' },
        { a: 'api', b: 'tok', n: 3, label: 'text' },
        { a: 'tok', b: 'gpu', n: 4, label: 'IDs' },
        { a: 'gpu', b: 'soft', n: 5, label: 'logits' },
        { a: 'soft', b: 'samp', n: 6, label: 'chances' },
        { a: 'samp', b: 'tok', kind: 'evt', dashed: true, label: 'append, repeat' },
        { a: 'samp', b: 'api', kind: 'res', n: 7, label: 'token stream', via: [[110, 370]] },
        { a: 'app', b: 'docs', dashed: true, label: 'grounding' },
        { a: 'data', b: 'train', label: 'practice' },
        { a: 'train', b: 'gpu', dashed: true, label: 'weights', via: [[480, 530], [480, 290]] },
      ],
      paths: [
        { name: 'Prompt se tokens', text: 'User ka sawaal xyz server pe system prompt ke saath judta hai, API tak jaata hai, aur tokenizer use token IDs mein todta hai.', go: ['u>app>api>tok'] },
        { name: 'Agla token chunna', text: 'IDs model se guzarte hain, har vocab token ka logit nikalta hai, softmax use % banata hai, sampler ek token chunta hai, aur wo token input mein jud ke loop phir chalta hai.', go: ['tok>gpu>soft>samp', 'samp>tok'] },
        { name: 'Answer stream', text: 'Har chuna hua token turant API se server aur user tak jaata hai. End token ya max_tokens pe loop rukta hai.', go: ['samp>api>app>u'] },
        { name: 'Hallucination aur grounding', text: 'Bina docs ke model "sabse probable" text banata hai, jo galat ho sakta hai. Server help docs se sahi paragraph prompt mein daale to answer us text se bandh jaata hai.', go: ['app>docs', 'app>api>tok>gpu'] },
        { name: 'Training (pehle)', text: 'Training text pe agla-token practice, loss ghatate hue weights bante hain. Wahi weights GPU pe load hote hain. Inference mein ye badalte nahi.', go: ['data>train>gpu'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>LLM ka ek hi kaam: ab tak ke text ke baad <strong>agle token</strong> ki probability batana. Lamba answer isi kaam ko loop mein chalane se banta hai (autoregressive).</li>
      <li>Model ke andar arabon <strong>weights</strong> (parameters) hain. 175B × 2 bytes = 350 GB, isliye bade models kai GPUs pe chalte hain.</li>
      <li>Pipeline: <strong>logits</strong> (raw score) → <strong>softmax</strong> (%, total 100) → <strong>sampling</strong> (ek token chuno).</li>
      <li>Greedy = hamesha top. Temperature = randomness ka knob (chhota T = pakka, bada T = creative). Top-k = sirf top k. Top-p = utne tokens jitne milke p tak pahunchein.</li>
      <li>Loop rukta hai end token pe (<code>finish_reason: stop</code>) ya <code>max_tokens</code> pe (<code>length</code>, answer kat sakta hai).</li>
      <li>Hallucination = confident lekin galat answer. Model probable text banata hai, facts lookup nahi karta. Ilaaj: grounding (RAG), tools, evals. Temperature 0 ilaaj nahi.</li>
      <li>Training weights badalti hai (mehengi, ek baar). Inference sirf padhti hai (har request). Chat se model kuch "seekhta" nahi.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['Free-form language samajhta hai: typos, Hinglish, hazaar tareeke ka phrasing, bina rules likhe', 'Ek hi model bahut kaam kar leta hai: answer, summary, translation, code', 'xyz.com ko model train nahi karna padta, API se din mein shuru', 'Streaming se user ko turant kuch dikhne lagta hai'],
      costs: ['Hallucination: confident galat answers, khaas kar rare ya private facts pe', 'Non-deterministic: same sawaal, alag answer (sampling)', 'Har token ka paisa aur time; lamba answer = mehenga aur slow', 'Knowledge cutoff: nayi ya private info nahi pata jab tak prompt mein na do', 'Provider pe dependency: rate limits, outages, price changes'] },

    { type: 'think', questions: [
      { q: 'xyz.com ko "aaj tumhare account mein kitne videos hain?" ka answer chahiye. Kya sirf LLM se poochhna kaafi hai?', a: 'Nahi. Ye private aur live data hai jo model ne kabhi dekha hi nahi. Model koi bhi probable number bana dega (hallucination). Sahi tareeka: server database se count nikaale (ya model ko ek tool de jo ye count laaye), aur LLM sirf us number ko achhi bhasha mein bole. Yahi agents ka idea hai.' },
      { q: 'Ek developer kehta hai "temperature 0 rakh do, phir model kabhi galat nahi bolega". Tum kya jawab doge?', a: 'Temperature 0 sirf randomness hataata hai (greedy: hamesha top token). Agar model ka top token hi galat fact hai to wo har baar wahi galat fact bolega, bas consistently. Correctness ke liye grounding (RAG), tools aur evals chahiye. Aur kai APIs pe T = 0 pe bhi output kabhi kabhi thoda alag aa sakta hai.' },
      { q: 'Model 200 token ka answer deta hai. Pehla token 0.5 second mein aaya aur phir 50 tokens/second. User ko poora answer kitni der mein milega? Agar answer 2x lamba ho?', a: 'Roughly 0.5 + 200/50 = 4.5 second. 400 tokens pe 0.5 + 8 = 8.5 second. Output tokens ek ek karke bante hain, isliye lambe answers seedha slow (aur mehenge) hote hain. Isliye support bots ko chhota likhne bolte hain.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'LLM ek step mein exactly kya output karta hai?', options: ['Poora answer ek saath', 'Agle token ke liye har vocabulary token ka score (logits), jinse probabilities banti hain', 'Database se matching answer'], answer: 1, explain: 'Har forward pass ek hi position ke liye saare tokens ke logits deta hai. Softmax unhe probabilities banata hai, sampling ek token chunta hai. Poora answer loop se banta hai.' },
      { q: 'Logits [2, 1, 0] pe temperature 0.5 lagaya. Kya hoga?', options: ['Top token ki probability badhegi', 'Sab tokens ki probability barabar ho jaayegi', 'Top token ki probability ghategi'], answer: 0, explain: 'T < 1 se logits [4, 2, 0] ho jaate hain, farq badh jaata hai, softmax ke baad top token aur dominant. (T=1 pe top ≈ 66.5%, T=0.5 pe ≈ 86.7%.)' },
      { q: 'Top-p = 0.9 aur probabilities [0.5, 0.3, 0.15, 0.05]. Kitne tokens bachenge?', options: ['1', '2', '3'], answer: 2, explain: '0.5 → 0.8 (abhi 0.9 se kam) → 0.95 (0.9 cross). Teen tokens bachte hain, chautha (5%) hata diya jaata hai.' },
      { q: 'Probabilities [50.6%, 22.8%, 15.3%, ...] pe top-k = 2 lagaya. Renormalize ke baad pehle token ka chance?', options: ['50.6%', '69.0%', '100%'], answer: 1, explain: 'Sirf top 2 bache: total 50.6 + 22.8 = 73.4%. Naya chance = 50.6 ÷ 73.4 = 69.0%. Doosre ka 31.0%. Total phir 100%.' },
      { q: 'API ne answer diya aur finish_reason = "length" hai. Matlab?', options: ['Model ne apni marzi se answer khatam kiya', 'max_tokens limit pe answer beech mein kat gaya', 'Prompt bahut chhota tha'], answer: 1, explain: '"length" = output token limit poori ho gayi. Answer adhoora ho sakta hai. "stop" = model ne khud end token chuna.' },
      { q: 'Chat mein user ne model ko apna naam bataya. Kal nayi chat mein model ko naam yaad nahi. Kyun?', options: ['Model ke weights chat se nahi badalte, purani chat context mein nahi bheji gayi', 'Model ka server restart hua', 'Temperature zyada tha'], answer: 0, explain: 'Chat = inference. Weights frozen hain. "Memory" sirf tab lagti hai jab app purani baatein dobara prompt mein bheje.' },
    ]},
    { type: 'sources', items: [
      { title: 'Language Models are Few-Shot Learners (GPT-3)', publisher: 'Brown et al., OpenAI (arXiv)', url: 'https://arxiv.org/abs/2005.14165', year: 2020, used: '175B parameters wala example; scale se capability badhna.' },
      { title: 'The Curious Case of Neural Text Degeneration', publisher: 'Holtzman et al. (arXiv, ICLR 2020)', url: 'https://arxiv.org/abs/1904.09751', year: 2019, used: 'Top-p (nucleus) sampling ka idea, aur greedy decoding mein repetition ki problem.' },
      { title: 'Hierarchical Neural Story Generation', publisher: 'Fan, Lewis, Dauphin (arXiv)', url: 'https://arxiv.org/abs/1805.04833', year: 2018, used: 'Top-k sampling.' },
      { title: 'Why Language Models Hallucinate', publisher: 'Kalai, Nachum, Vempala, Zhang, OpenAI', url: 'https://openai.com/index/why-language-models-hallucinate/', year: 2025, used: 'Evaluations guessing ko inaam dete hain, isliye models guess karte hain.' },
      { title: 'What are tokens and how to count them?', publisher: 'OpenAI Help Center', url: 'https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them', year: 2025, used: '1 token ≈ 4 characters ≈ 3/4 word (English) ka rule of thumb.' },
      { title: 'Transformers Explained | Simple Explanation of Transformers', publisher: 'codebasics (YouTube)', url: 'https://www.youtube.com/watch?v=ZhAz268Hdpw', used: 'Learner ka reference video: GPT next-word prediction ka intuition. Transformer ke andar ki detail A2 phase mein.' },
    ]},
  ],
});
