Lesson.register({
  id: 'welcome',
  title: 'Is course ko kaise use karein',
  minutes: 7,
  summary: `Scalecraft mein swagat hai! Ye course tumhe ek simple website (xyz.com) se shuru karke Uber, Hotstar aur ChatGPT jaise systems tak le jayega. Har naya component tabhi aayega jab koi problem usse maange. Yahan dekho ki site kaise chalani hai.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Badi apps (YouTube, Uber, WhatsApp) crores logon ko ek saath kaise sambhalti hain? Ye course yahi sikhata hai, bilkul zero se.<br><br>Koi ratta nahi. Har cheez tum <strong>chalake dekhoge</strong>: diagrams mein request ko chalte hue, widgets mein numbers badal ke, aur quiz mein khud ko check karke.` },

    { type: 'h2', text: 'Scalecraft mein do tracks hain' },
    { type: 'p', html: `Sidebar ke upar do tabs hain. Ek click se track badlo:` },
    { type: 'table', head: ['Track', 'Kya seekhoge', 'Kahan se shuru'], rows: [
      ['<strong>System Design</strong>', 'Servers, databases, caches, queues se lekar Uber, Hotstar, WhatsApp jaise asli systems tak', 'Phase 1: "System design kya hai?"'],
      ['<strong>AI Agents</strong>', 'LLM kya hai, Transformer andar se, training, prompts, RAG, aur aakhir mein agents banana', 'A1: "LLM basics"'],
    ]},

    { type: 'h2', text: 'Hinglish ya English: tumhari marzi' },
    { type: 'p', html: `Header mein <strong>English</strong> button hai. Dabao, aur har lesson simple English mein khul jayega: same diagrams, same widgets, same quiz. Wapas Hinglish ke liye wahi button phir dabao. Tumhari choice yaad rakhi jaati hai.` },

    { type: 'h2', text: 'Is course ka ek hi rule' },
    { type: 'p', html: `System design ko boxes yaad karne ka subject mat samjho. Har box kisi problem ki wajah se aata hai. Isliye har lesson isi order mein chalta hai:` },
    { type: 'ascii', text: `
Current architecture
        ↓
Naya problem aaya
        ↓
Current architecture kyun fail hua
        ↓
Naya solution (naya component)
        ↓
Updated architecture
        ↓
Trade-offs: kya mila, kya chukaya` },
    { type: 'p', html: `Poore course mein ek hi example chalega: <strong>xyz.com</strong>, ek generic website jo shuru mein ek laptop pe chalti hai aur dheere dheere crores users wali app ban jaati hai.` },

    { type: 'h2', text: 'Har lesson ke andar kya milega' },
    { type: 'table', head: ['Hissa', 'Kya hai', 'Kaise use karo'], rows: [
      ['Seedhi baat', 'Lesson ki problem, bachchon wali bhasha mein, bina jargon', 'Sabse pehle padho, 30 second'],
      ['Naya word cards', 'Har naye component ka card: <em>Ye kya hai / Kyun chahiye / Iske bina</em>', 'Teeno line samajh aayein tabhi aage badho'],
      ['Interactive diagram', 'Request ko boxes ke beech chalte hue dekho', '"Next step" dabao, failure scenarios zaroor chalao'],
      ['Widgets', 'Calculators aur simulators', 'Slider aur buttons badlo, numbers ko mehsoos karo'],
      ['Socho', 'Sawaal jinke answer chhupe hain', 'Pehle khud socho, phir answer kholo'],
      ['Poora design, ek nazar mein', 'Lesson ke end mein ek bada diagram', 'Raaste ke buttons dabao, har box pe click karo'],
      ['Yaad rakho', '5-8 points ka recap', 'Kal dobara padho, 1 minute'],
      ['Quiz', '3-6 sawaal, har ek ka explanation', 'Galat hua to explanation padho'],
    ]},

    { type: 'h2', text: 'Diagram kaise chalayein: yahin try karo' },
    { type: 'p', html: `Ye ek chhota practice diagram hai. Upar se scenario chuno, phir <strong>Next step</strong> dabate jao. Kisi bhi box pe click karo to uska kaam neeche explain hoga. <strong>Auto play</strong> se sab apne aap chalega.` },
    { type: 'flow', title: 'Practice: ek request ka safar', height: 290,
      nodes: [
        { id: 'u', label: 'Tum', sub: 'browser', x: 100, y: 110, w: 130, kind: 'client', info: 'Ye kya hai: tum, apne browser ya app ke saath. Har kahani yahin se shuru hoti hai: tum ek request bhejte ho.' },
        { id: 's', label: 'Server', sub: 'xyz.com', x: 360, y: 110, w: 130, kind: 'server', info: 'Ye kya hai: xyz.com ka computer. Ye request leta hai, kaam karta hai, aur jawab bhejta hai.' },
        { id: 'c', label: 'Cache', sub: 'fast memory', x: 360, y: 230, w: 130, kind: 'cache', info: 'Ye kya hai: ek fast memory jahan baar baar maangi jaane wali cheezein rakhi jaati hain. Server pehle yahin dekhta hai.' },
        { id: 'd', label: 'Database', sub: 'permanent data', x: 620, y: 110, w: 130, kind: 'data', info: 'Ye kya hai: data ka permanent ghar. Cache mein na mile to server yahan se laata hai.' },
      ],
      edges: [{ a: 'u', b: 's' }, { a: 's', b: 'c' }, { a: 's', b: 'd' }],
      scenarios: [
        { name: 'Normal request', intro: 'Tum xyz.com pe ek post kholte ho.', steps: [
          { title: 'Request jaati hai', text: 'Orange dot = request. Ye tumse server tak jaati hai.', go: 'u>s', msg: 'GET /post/42' },
          { title: 'Server cache dekhta hai', text: 'Cache mein ye post nahi mili. Isko <strong>cache miss</strong> kehte hain.', go: 's>c', after: { c: { state: 'miss' } } },
          { title: 'Server database se laata hai', text: 'Database ke paas asli data hai. Green dot = jawab wapas.', go: ['s>d', 'res:d>s'] },
          { title: 'Jawab tum tak', text: 'Post tumhari screen pe. Ab "Database down" scenario chalao.', go: 'res:s>u', msg: '200 OK: post #42' },
        ]},
        { name: 'Database down', intro: 'Is baar database band hai.', steps: [
          { title: 'Request jaati hai', text: 'Sab normal shuru hua.', go: ['u>s', 's>c'], after: { c: { state: 'miss' } } },
          { title: 'Database jawab nahi deta', text: 'Red dot = fail. Box laal ho gaya: wo DOWN hai.', go: 'bad:s>d', after: { d: { state: 'down', sub: 'DOWN' } } },
          { title: 'Tumhe error', text: 'Server batata hai ki abhi page nahi ban sakta. Har lesson mein aise failure scenarios hain. Wahi asli system design hai: jab kuch toote tab kya ho?', go: 'res:s>u', msg: '503 Service Unavailable' },
        ]},
      ],
    },
    { type: 'table', head: ['Box ka colour', 'Kya hai', 'Examples'], rows: [
      ['Indigo', 'User / client', 'Browser, mobile app'],
      ['Teal', 'Network helpers', 'DNS, CDN, WiFi'],
      ['Blue', 'Traffic ka entry point', 'Load Balancer, API Gateway'],
      ['Grey', 'Application server', 'Server 1, Server 2'],
      ['Orange', 'Cache', 'Redis'],
      ['Violet', 'Database / storage', 'PostgreSQL, S3'],
      ['Pink', 'Queue / stream', 'Kafka, SQS'],
    ]},
    { type: 'table', head: ['Chalta hua dot', 'Matlab'], rows: [
      ['Orange dot', 'Request ja rahi hai'],
      ['Green dot', 'Response wapas aa raha hai'],
      ['Red dot', 'Request fail / packet kho gaya'],
      ['Violet dot', 'Event (Kafka/queue message)'],
    ]},

    { type: 'h2', text: 'Aakhri diagram: poora design, ek nazar mein' },
    { type: 'p', html: `Har lesson ke end mein ek bada diagram hota hai jo poore design ko ek saath dikhata hai. Arrows pe numbers order batate hain. Upar ke buttons ek raasta highlight karte hain, aur <strong>Bada karo</strong> se diagram poori screen pe khulta hai. Neeche chhota sa example:` },
    { type: 'diagram', title: 'Example: xyz.com ka chhota design', height: 300,
      nodes: [
        { id: 'u', label: 'Tum', sub: 'browser', x: 100, y: 110, w: 130, kind: 'client', info: 'Ye kya hai: user. Request yahin se shuru hoti hai.' },
        { id: 's', label: 'Server', sub: 'xyz.com', x: 360, y: 110, w: 130, kind: 'server', info: 'Ye kya hai: xyz.com ka computer jo request ka kaam karta hai.' },
        { id: 'c', label: 'Cache', sub: 'fast memory', x: 360, y: 240, w: 130, kind: 'cache', info: 'Ye kya hai: fast memory. Server pehle yahin dekhta hai.' },
        { id: 'd', label: 'Database', sub: 'permanent data', x: 620, y: 110, w: 130, kind: 'data', info: 'Ye kya hai: data ka permanent ghar. Cache miss pe yahan aate hain.' },
      ],
      edges: [
        { a: 'u', b: 's', n: 1, label: 'request' },
        { a: 's', b: 'c', n: 2, label: 'pehle yahan' },
        { a: 's', b: 'd', n: 3, label: 'miss pe' },
      ],
      paths: [
        { name: 'Cache hit', text: 'Cache mein mil gaya: database tak jaane ki zarurat nahi. Fast.', go: ['u>s>c'] },
        { name: 'Cache miss', text: 'Cache mein nahi mila: server database se laata hai. Thoda slow.', go: ['u>s>c', 's>d'] },
      ],
    },
    { type: 'p', html: `Iske neeche hamesha <strong>Yaad rakho</strong> box hota hai: lesson ke sabse zaroori 5-8 points.` },

    { type: 'h2', text: 'Roadmap: System Design' },
    { type: 'p', html: `8 phases hain. Phase 1 se 3 vocabulary banate hain (words aur building blocks), 4 se 7 judgment (kab kya use karein), aur phase 8 mein hum asli apps ko khol ke dekhte hain. Kisi bhi phase par click karo.` },
    { type: 'roadmap' },
    { type: 'h3', text: 'Doosra track: AI Agents' },
    { type: 'p', html: `Sidebar ke upar <strong>AI Agents</strong> tab kholo. Wahan LLM ke basics se shuru karke Transformer (attention haath se calculate karke), LoRA aur quantization ki maths, prompts aur context engineering, RAG, aur aakhir mein agents, harness aur frameworks hain, ek interactive Harness playground ke saath.` },
    { type: 'roadmap', track: 'ai' },

    { type: 'h2', text: 'Har lesson kaise padhein' },
    { type: 'steps', items: [
      { t: 'Seedhi baat aur Naya word cards pehle', d: 'Jab tak "Ye kya hai / Kyun chahiye / Iske bina" teeno line samajh na aayein, aage mat badho.' },
      { t: 'Diagram chalao', d: 'Scenario chuno, "Next step" dabao, aur request ko ek-ek box se guzarte hue dekho. Kisi box par click karoge to uska kaam explain hoga.' },
      { t: 'Failure scenario zaroor try karo', d: 'Server down, DNS down, cache down. System design asli mein yahi hai: jab kuch toot jaye tab kya hota hai.' },
      { t: 'Widgets ke saath khelo', d: 'Number badlo aur dekho kya hota hai. Lesson ka text bata deta hai kaunsa setting try karna hai.' },
      { t: '"Socho" questions pe ruko', d: 'Answer kholne se pehle khud socho, chahe galat ho. Wahi learning hai.' },
      { t: 'Kagaz pe khud draw karo, phir Mark as complete', d: 'Lesson ke baad aakhri diagram memory se banao. Agar 2 minute mein kisi dost ko samjha sako, tab neeche "Mark as complete" dabao. Sidebar mein tumhari progress bar badhegi.' },
    ]},

    { type: 'h2', text: 'Baaki kaam ki cheezein' },
    { type: 'list', items: [
      '<strong>Search:</strong> sidebar ke upar search box mein topic likho (cache, kafka, uber).',
      '<strong>Progress:</strong> "Mark as complete" dabaye hue lessons sidebar mein tick ho jaate hain. Ye tumhare browser mein yaad rehta hai.',
      '<strong>Dark mode:</strong> header mein chaand wala button.',
      '<strong>Listen:</strong> har lesson mein Listen button hai jo text padh ke sunata hai. Travel mein kaam aata hai.',
      '<strong>Save offline:</strong> header mein ye button dabao. Saare ready lessons (Hinglish aur English dono) phone mein save ho jayenge, internet ke bina bhi khulenge.',
      '<strong>App jaisa:</strong> phone pe browser menu se "Add to Home screen" karoge to ye app ki tarah khulega.',
    ]},
    { type: 'callout', tone: 'tip', title: 'Roz kitna?', html: `Din ka lagbhag ek ghanta kaafi hai. Ek lesson padho, diagram kagaz pe banao, quiz do. Phase 8 (asli systems) tak pahunchne ka wait mat karo: Phase 2 ke beech se hi chhote designs try karna shuru kar do.` },
    { type: 'p', html: `Ab chalo, pehla lesson: <a href="#/what-is-system-design">System design kya hai?</a>` },
  ],
});
