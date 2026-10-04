Lesson.register({
  id: 'design-search',
  title: 'Google Search',
  minutes: 45,
  summary: `Hundreds of billions (das-hazaaron crore) pages mein se ek second se bhi kam mein sahi results kaise aate hain? Crawl → index → doc-sharded inverted index → scatter-gather → ranking, plus caching, freshness aur tail latency ki ladaai. Har piece pehle aasaan bhasha mein, phir interview depth.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Tum Google pe "cricket score" likhte ho aur aadhe second se kam mein 10 achhe links aa jaate hain. Lekin internet pe arbon pages hain. Google har baar saare pages padh nahi sakta: usme saalon lag jaayenge.<br>Isliye Google pehle se, background mein, saare pages padh ke ek bahut bada "word → pages" register bana ke rakhta hai. Query aane pe wo bas register kholta hai.<br>Register itna bada hai ki hazaaron computers mein baanta hua hai. Is lesson mein dekhenge: pages kaise laaye jaate hain, register kaise banta hai, hazaaron computers milke ek jawab kaise dete hain, aur ek slow computer poore jawab ko slow kyun kar deta hai.` },
    { type: 'callout', tone: 'tip', title: 'Pehle khud try karo', html: `5 minute socho: "word → pages" wala register itna bada hai ki hazaaron machines pe baantna padega. Usko <em>words</em> ke hisaab se baantoge (machine 1 ke paas a-se-m words) ya <em>pages</em> ke hisaab se (machine 1 ke paas pehle 1 crore pages)? Query aane pe kitni machines se baat karni padegi? Aur agar unme se ek bhi slow ho gayi to?` },
    { type: 'p', html: `Ye lesson <a href="#/search">Search aur inverted index</a> lesson ke upar banta hai (tokenization, BM25 wahan detail mein hain) aur crawler ke liye <a href="#/design-crawler">Web crawler</a> lesson dekho. Yahan focus: jab index ek machine mein nahi, hazaaron mein ho, tab kya badalta hai. Jo cheez pehle nahi aayi, wo yahan pehle aasaan bhasha mein samjhaayi gayi hai.` },
    { type: 'callout', tone: 'warn', title: 'Kya public hai, kya nahi', html: `Google Search ka aaj ka andar ka design poori tarah public nahi hai. Jo pata hai wo Google ke papers aur talks se hai, jinme se kai purane hain: Brin &amp; Page ka paper (1998), "Web Search for a Planet" (2003), GFS (2003), MapReduce (2004), Bigtable (2006), Jeff Dean ka WSDM talk (2009), "The Tail at Scale" (2013), aur Google ke official "How Search works" pages. Is lesson mein har jagah saal likha hai. Aaj ka system in sab se aage badh chuka hai (jaise GFS ki jagah Colossus aa chuka hai, Google Cloud blog 2021 ke mutabik).` },

    { type: 'h2', text: 'Pehle basics: search engine ke teen kaam' },
    { type: 'p', html: `Koi bhi web search engine, chhota ho ya Google jitna bada, teen kaam karta hai. Pehle do kaam background mein lagatar chalte hain. Teesra kaam tab hota hai jab tum search button dabate ho.` },
    { type: 'steps', items: [
      { t: 'Crawl: pages laana', d: 'Internet pe ghoom ghoom ke web pages download karna. Jaise koi har website ka har page kholke uski copy rakh le.' },
      { t: 'Index: pages ko dhoondhne layak shape mein rakhna', d: 'Har page ke words nikaal ke ek register banana: kaunsa word kaunse pages mein hai.' },
      { t: 'Serve: query ka jawab dena', d: 'User ke words register mein dekhna, matching pages ko achhe se bure order mein lagana (ranking), aur 10 results dikhana.' },
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Crawler (Googlebot)', html: `<strong>Ye kya hai:</strong> ek program jo web pages download karta hai, un pages ke links padhta hai, aur phir un links wale pages bhi download karta hai. Google ke crawler ka naam <strong>Googlebot</strong> hai.<br><strong>Kyun chahiye:</strong> Google ke paas pages ki copy hi nahi hogi to wo unme dhoondhega kaise? Koi website khud aake Google ko apne pages nahi deti (sitemap file se bas list de sakti hai).<br><strong>Iske bina:</strong> search engine ke paas kuch padhne ko nahi. Aur agar crawler naye pages jaldi nahi laata, to aaj ki news search mein dikhegi hi nahi.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Index aur Inverted index', html: `<strong>Ye kya hai:</strong> kitaab ke peeche wala index yaad karo: "Photosynthesis: page 12, 45". Inverted index bilkul wahi hai, bas poore web ke liye: <strong>har word → un pages ki list jinme wo word hai</strong>. Is list ko <strong>posting list</strong> kehte hain.<br><strong>Kyun chahiye:</strong> query aane pe arbon pages ko ek ek padhna impossible hai. Index mein seedha word dhoondho, list mil gayi.<br><strong>Iske bina:</strong> har query pe poora web scan. 1 second ki jagah din lagenge.<br>Ulta wala, <strong>forward index</strong>, hota hai page → uske words (jaise kitaab ke har page pe kya likha hai). Inverted index forward index ko "palat" ke banta hai, isliye naam "inverted".` },
    { type: 'callout', tone: 'term', title: 'Naya word: docID', html: `<strong>Ye kya hai:</strong> har page (document) ko diya gaya ek chhota number, jaise 1, 2, 3...<br><strong>Kyun chahiye:</strong> posting list mein lambe URLs ("https://www.xyz.com/blog/caching-strategies") ki jagah chhote numbers rakhe jaate hain. Numbers chhote hain, compare aur sort karna fast hai.<br><strong>Iske bina:</strong> index kai guna bada aur slow.` },
    { type: 'p', html: `Khud ek chhota sa inverted index banao. Neeche 4 chhote web pages hain. "Agla page index karo" dabao aur dekho har word ki posting list kaise badhti hai. Phir ek query chuno.` },
    { type: 'custom', render(el) {
      const pages = ['Cricket score live', 'How to choose a cricket bat', 'Live news today', 'Cricket news and score'];
      const toks = pages.map(p => p.toLowerCase().split(/[^a-z]+/).filter(Boolean));
      const queries = ['cricket score', 'live cricket', 'news', 'cricket bat score'];
      let done = 0, qi = 0;
      el.innerHTML = `<div class="dsx-pages" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;margin-bottom:8px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button type="button" class="btn small primary dsx-next">Agla page index karo</button><button type="button" class="btn small ghost dsx-all">Sab index karo</button><button type="button" class="btn small ghost dsx-reset">Reset</button></div>
        <div class="dsx-ix" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px 12px;font-family:var(--f-mono);font-size:12.5px;min-height:40px"></div>
        <div style="margin-top:10px;font-size:13px">Query chuno:</div>
        <div class="dsx-q" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"></div>
        <div class="stats"><div class="stat"><span>Matching pages</span><strong class="dsx-m"></strong></div><div class="stat"><span>Index se padhi entries</span><strong class="dsx-r"></strong></div><div class="stat"><span>Bina index: padhne pade words</span><strong class="dsx-s"></strong></div></div>
        <div class="calc-note dsx-note"></div>`;
      const q = s => el.querySelector(s);
      q('.dsx-q').innerHTML = queries.map((x, i) => `<button type="button" class="chip dsx-qb" data-i="${i}">${x}</button>`).join('');
      const build = () => { const ix = {}; for (let d = 0; d < done; d++) toks[d].forEach(w => { ix[w] = ix[w] || []; if (!ix[w].includes(d + 1)) ix[w].push(d + 1); }); return ix; };
      const show = () => {
        const ix = build(), qw = queries[qi].split(' ');
        q('.dsx-pages').innerHTML = pages.map((p, d) => `<div style="border:1px solid ${d < done ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:6px 8px;font-size:13px;background:var(--surface)"><strong>doc ${d + 1}</strong>${d < done ? ' ✓' : ''}<br>${p}</div>`).join('');
        const words = Object.keys(ix).sort();
        q('.dsx-ix').innerHTML = words.length ? words.map(w => `<div style="${qw.includes(w) ? 'color:var(--accent-ink);background:var(--accent-soft);border-radius:4px;padding:0 4px' : ''}">${w} → [${ix[w].join(', ')}]</div>`).join('') : '<div style="color:var(--ink-3)">Index abhi khaali hai.</div>';
        el.querySelectorAll('.dsx-qb').forEach((b, i) => b.classList.toggle('on', i === qi));
        const lists = qw.map(w => ix[w] || []);
        const match = lists.reduce((a, l) => a.filter(x => l.includes(x)));
        const read = lists.reduce((s, l) => s + l.length, 0), scan = toks.slice(0, done).reduce((s, t) => s + t.length, 0);
        q('.dsx-m').textContent = match.length ? match.map(x => 'doc ' + x).join(', ') : 'koi nahi';
        q('.dsx-r').textContent = read;
        q('.dsx-s').textContent = scan;
        q('.dsx-note').textContent = done < 4 ? `Abhi ${done} of 4 pages index hue hain. Jo page index nahi hua, wo search mein mil hi nahi sakta: isiliye naye pages ko jaldi index karna (freshness) zaroori hai.`
          : `"${queries[qi]}": har word ki posting list nikaalo (${qw.map((w, i) => w + ' → [' + lists[i].join(', ') + ']').join(', ')}) aur jo docIDs SAB lists mein hain wahi jawab (isko intersection kehte hain). Index se sirf ${read} entries padhi, bina index ${scan} words padhne padte. 4 pages pe farak chhota hai; arbon pages pe yahi farak "1 second" vs "kai din" hai.`;
      };
      q('.dsx-next').addEventListener('click', () => { if (done < 4) done++; show(); });
      q('.dsx-all').addEventListener('click', () => { done = 4; show(); });
      q('.dsx-reset').addEventListener('click', () => { done = 0; show(); });
      el.querySelectorAll('.dsx-qb').forEach(b => b.addEventListener('click', () => { qi = +b.dataset.i; show(); }));
      show();
    }},
    { type: 'p', html: `Dhyaan do: query "cricket score" ka jawab doc 1 aur doc 4 hai. Lekin pehle kaunsa dikhayein? Dono mein dono words hain. Yahi <strong>ranking</strong> ka sawaal hai, jo is lesson mein aage aayega. Aur ek baat: asli Google ek word ki list mein arbon docIDs rakh sakta hai. Ek machine mein ye nahi aata. Wahin se saari mushkil shuru hoti hai.` },
    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Query do ("system design kaise seekhein"), ranked results lo: title, URL, snippet (page ka 1-2 line ka tukda jisme tumhare words hain)<br>• Spelling galat ho to bhi samjho ("sistem dizain")<br>• Naya content jaldi dikhe (aaj ki news)<br>• Autocomplete<br><br><strong>Out of scope:</strong> ads, images/video search, AI answers` },
      right: { title: 'Non-functional', html: `• Latency (jawab aane mein kitna time): poora jawab ~0.2 s ke andar (2009 talk mein average query latency &lt;0.2 s bataya gaya)<br>• Bahut zyada QPS (queries per second), poori duniya se<br>• Index bahut bada: Google ke "How Search works" pages ke mutabik hundreds of billions (das-hazaaron crore) pages, 100,000,000 GB se zyada<br>• Kuch machines slow/down hon to bhi jawab aaye<br>• Freshness (naya page kitni jaldi search mein aaye): minutes, mahine nahi` },
    },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Pehle do naye words, kyunki napkin maths inhi pe tika hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Shard', html: `<strong>Ye kya hai:</strong> ek bade data ka ek tukda, jo ek machine (ya machines ke ek group) ke paas rehta hai. Jaise ek moti dictionary ko 26 patli kitaabon mein baant do, har akshar ki ek.<br><strong>Kyun chahiye:</strong> Google ka index kisi ek computer ki memory ya disk mein aata hi nahi. Tukde karke hazaaron machines mein rakhna padta hai.<br><strong>Iske bina:</strong> ek machine, jo na itna data rakh sakti hai, na itni queries jhel sakti hai. Detail: <a href="#/sharding">Sharding lesson</a>.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Replica (replication)', html: `<strong>Ye kya hai:</strong> same shard ki ek aur bilkul same copy, doosri machine pe. Replication = copies banana.<br><strong>Kyun chahiye:</strong> do wajah. (1) Machines kharab hoti rehti hain: ek copy gayi to doosri kaam karegi. (2) Ek copy itni queries nahi jhel sakti: 3 copies = lagbhag 3 guna queries.<br><strong>Iske bina:</strong> ek machine mari, aur index ka wo hissa gayab: kuch pages kabhi search mein nahi aayenge. Detail: <a href="#/replication">Replication lesson</a>.` },
    { type: 'p', html: `Ab maan lo (ye assumptions hain, Google ke numbers nahi): index mein 100 billion pages, har page ka indexed text + metadata ~10 KB, aur inverted index raw text ka ~30%. To:` },
    { type: 'code', text: `
Raw text:        100 × 10^9 pages × 10 KB      = 1,000 TB  = 1 PB
Inverted index:  ~30% of that                   ≈ 300 TB
Ek machine RAM:  maan lo 256 GB
Shards (memory mein rakhna ho to):  300 TB / 256 GB  ≈ 1,200 shards
Har shard ke replicas (QPS + failures ke liye): × 3 ya zyada  →  ~3,600+ machines

Conclusion: ek query ko ~1,200 machines se jawab chahiye. Aur jawab 200 ms mein.` },
    { type: 'p', html: `Asli numbers isse alag honge, lekin shape yahi hai: <strong>ek query, hazaaron machines</strong>. 2003 ke paper "Web Search for a Planet" (Barroso, Dean, Hölzle) ne likha tha ki ek Google query average mein sau-sau megabytes (hundreds of MB) data padhti hai aur das-das billion (tens of billions) CPU cycles leti hai. Ek query ko hazaaron machines pe bhejna <strong>fan-out</strong> kehlata hai. Is lesson ki saari mushkilein isi fan-out se aati hain.` },

    { type: 'image', src: 'assets/img/design-search/dalles-datacenter.jpg', alt: 'Ek bahut badi, bina khidkiyon wali building, aage Google ka lakdi ka board aur do cycles', caption: 'The Dalles, Oregon (USA) mein Google ka ek data center. "Ek query, hazaaron machines" wali machines aisi buildings mein hoti hain. Bahar se sirf ek badi building; andar hazaaron server racks, bijli aur cooling ka intezaam.', credit: { text: 'Lambtron, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Google_data_center.jpg', license: 'CC BY-SA 4.0' } },

    { type: 'h2', text: 'Shuruaat: 1998 ka Google' },
    { type: 'p', html: `Brin aur Page ka 1998 paper ("The Anatomy of a Large-Scale Hypertextual Web Search Engine") aaj bhi design ki skeleton samjhaata hai. Us prototype mein ~24 million pages (147 GB) the. Pieces ye the (har piece ke saath uska kaam aasaan bhasha mein):` },
    { type: 'list', items: [
      '<strong>URLserver + crawlers</strong>: URLserver ek "aage kya download karna hai" wali list rakhta tha aur crawlers ko URLs deta tha. Paper ke mutabik 3-4 crawlers, har ek ~300 connections ek saath khule rakhta tha, peak pe 100+ pages/second. DNS lookup (website ke naam se uska IP address nikaalna) itna bada bottleneck tha ki har crawler apna DNS cache rakhta tha.',
      '<strong>Storeserver → repository</strong>: downloaded pages compress karke ek bade store (repository) mein. Har page ko ek <strong>docID</strong> milta.',
      '<strong>Indexer</strong>: page parse karta (HTML se text aur links alag karna) aur har word ka "hit" nikaalta (word, page pe position, font size, capital letters ya nahi). Ye hits "barrels" naam ki files mein jaate: ye forward index tha (doc → words). Saath mein saare links aur unka <strong>anchor text</strong> alag file mein.',
      '<strong>Sorter</strong>: forward index ko word ke hisaab se dobara sort karke <strong>inverted index</strong> banata (word → docs).',
      '<strong>PageRank</strong>: links ke jaal (graph) se har page ki importance ka number.',
      '<strong>Searcher</strong>: query ke words ki posting lists padh ke match karta aur rank karta. Paper ke mutabik zyada tar queries 1 se 10 second leti thi, aur abhi koi query caching nahi thi.',
    ]},
    { type: 'callout', tone: 'term', title: 'Naya word: Anchor text', html: `<strong>Ye kya hai:</strong> link ka clickable text. Jaise kisi blog pe likha ho "<u>best Hindi dictionary</u>" aur wo text kisi page ka link ho.<br><strong>Kyun chahiye:</strong> agar 1,000 pages "best Hindi dictionary" text se ek page ko link karte hain, to doosre log us page ke baare mein bata rahe hain, chahe page pe khud wo words na hon. Ye page ke apne text se zyada bharose layak signal ho sakta hai.<br><strong>Iske bina:</strong> sirf page ka apna text dekhoge. Jo page apne baare mein jhooth bole, ya jisme text kam ho (jaise sirf image), wo galat rank hoga.` },
    { type: 'image', src: 'assets/img/design-search/first-server-1999.jpg', maxWidth: 360, alt: 'Ek purana rack jisme bahut saare khule PC motherboards aur hard disks ek ke upar ek lage hain, chaaron taraf network cables', caption: 'Google ka pehla production server rack (lagbhag 1999), Computer History Museum mein. Mehenge bade servers ki jagah sasti, aam PC boards ek ke upar ek. Soch ye thi: machines kharab hongi hi, isliye software ko failures jhelna seekhna hoga. Yahi soch aage GFS, MapReduce aur replicas mein dikhegi.', credit: { text: 'Steve Jurvetson, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Google%E2%80%99s_First_Production_Server.jpg', license: 'CC BY 2.0' } },
    { type: 'p', html: `1999 se 2009 ke beech kya badla? Jeff Dean ke 2009 WSDM talk ke mutabik: documents ~70 million se kai billion, queries per day ~1000×, index update latency (naya page index mein aane ka time) <strong>mahino se minutes</strong>, aur average query latency &lt;1 s se &lt;0.2 s. Unhone kaha ki 10 saal mein system ke 7 bade revisions hue, aur sabak: ~10× growth ke liye design karo, lekin ~100× se pehle rewrite ki planning rakho.` },
    { type: 'h2', text: 'Step 3: indexing pipeline (offline)' },
    { type: 'p', html: `Search ke do bilkul alag hisse hain: <strong>indexing</strong> (background mein, web padh ke index banana) aur <strong>serving</strong> (query ka jawab dena). Pehle indexing. Diagram dekhne se pehle, iske har piece ko ek ek karke samjho. Har piece isliye aaya kyunki uske bina kuch toot raha tha.` },
    { type: 'callout', tone: 'term', title: 'Naya word: URL frontier', html: `<strong>Ye kya hai:</strong> crawler ki "to-do list": wo saare URLs jo abhi download karne baaki hain, priority ke saath. 1998 wale Google mein ye kaam URLserver karta tha.<br><strong>Kyun chahiye:</strong> web pe arbon URLs hain aur crawler ki speed limited. Kaunsa page pehle laayein (news site ka homepage, ya 10 saal purana page)? Aur ek hi website pe ek saath 1,000 requests bhej di to wo site gir sakti hai, isliye har site ki speed limit (politeness) bhi yahin se control hoti hai.<br><strong>Iske bina:</strong> crawler random pages laata, important naye pages late aate, aur chhoti websites pe zyada load jaata. Detail: <a href="#/design-crawler">Web crawler lesson</a>.` },
    { type: 'p', html: `Google ke Search Central docs ke mutabik Googlebot ko naye pages zyada tar pehle se jaane pages ke links aur sitemaps se milte hain. Ek algorithm tay karta hai ki kaunsi site kitni baar aur kitne pages crawl ho. Pages ek recent Chrome version mein <strong>render</strong> bhi hote hain, yaani unka JavaScript chalaya jaata hai, taaki jo content JavaScript se aata hai wo bhi dikhe.` },
    { type: 'callout', tone: 'term', title: 'Naya word: GFS (aur aaj Colossus)', html: `<strong>Ye kya hai:</strong> Google File System. Hazaaron sasti machines ki disks ko jodke ek bahut bada "ek hi" file system. Badi file 64 MB ke tukdon (chunks) mein tootti hai, aur har chunk ki by default 3 copies alag alag machines pe hoti hain. Ek "master" machine yaad rakhti hai ki kaunsa chunk kahan hai (GFS paper, 2003).<br><strong>Kyun chahiye:</strong> crawl kiya hua web petabytes mein hai. Ye kisi ek disk mein nahi aata, aur sasti machines (upar wali photo) roz marti hain.<br><strong>Iske bina:</strong> ek disk mari to data gaya. Aur har team ko khud likhna padta ki file kis machine pe hai.<br><strong>Aaj:</strong> Google Cloud blog (2021) ke mutabik GFS ki jagah ab uska successor <strong>Colossus</strong> hai. Idea wahi: bahut saari machines, ek bada reliable storage.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Bigtable (aur "Webtable")', html: `<strong>Ye kya hai:</strong> Google ka ek bahut bada table-jaisa database, jo apni files GFS pe rakhta hai. Har row ka ek key hota hai, rows key ke order mein sorted rehti hain, aur ek cell ke kai versions (timestamp ke saath) rakh sakte hain (Bigtable paper, 2006).<br><strong>Kyun chahiye:</strong> har page ki jaankari (HTML, title, us pe aane wale links) ko <em>ek page ke level pe</em> update karna hai, jab bhi wo page dobara crawl ho. GFS badi files ke liye achha hai, lekin "sirf is ek page ki row badlo" wala kaam uske liye nahi bana.<br><strong>Iske bina:</strong> ek page badla to poori badi file dobara likho. Index update ghanton ya dinon mein hota, minutes mein nahi.<br><strong>Example:</strong> paper ka "Webtable": row key ulta URL hai (<code>com.cnn.www</code>), taaki ek hi site ke saare pages paas paas sorted rahein. <code>contents:</code> column mein page ke kai versions, aur <code>anchor:</code> columns mein doosri sites ka anchor text.` },
    { type: 'callout', tone: 'term', title: 'Naya word: MapReduce', html: `<strong>Ye kya hai:</strong> hazaaron machines pe ek bada batch kaam chalane ka simple tareeka. Programmer sirf do chhote functions likhta hai. <strong>Map</strong>: har input (jaise ek page) se chhote (key, value) pairs nikaalo. <strong>Reduce</strong>: same key wale saare values ikattha karke ek jawab banao. Baaki sab (data baantna, machines chunna, mari machine ka kaam dobara chalana) system khud karta hai (MapReduce paper, 2004).<br><strong>Kyun chahiye:</strong> arbon pages parse karna, duplicate dhoondhna, links ginna: ek machine pe ye saalon ka kaam hai.<br><strong>Iske bina:</strong> har team ko khud likhna padta ki 1,000 machines mein kaam kaise baantein aur crash hone pe kya karein. Bahut saara mushkil, bug-bhara code.<br><strong>Example:</strong> inverted index khud ek MapReduce hai. Map: doc 1 "Cricket score live" se (cricket, 1), (score, 1), (live, 1). Reduce: "cricket" key ke saare docIDs ikattha karke sorted list [1, 2, 4]. Wahi jo upar widget mein bana.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Dedupe aur canonical page', html: `<strong>Ye kya hai:</strong> dedupe = duplicate hatana. Ek hi content kai URLs pe ho sakta hai (<code>xyz.com/page</code> aur <code>xyz.com/page?ref=fb</code>). Google ke docs ke mutabik indexing mein milte-julte pages ka ek group (cluster) banta hai aur unme se sabse representative page ko <strong>canonical</strong> chuna jaata hai.<br><strong>Kyun chahiye:</strong> same page ko 5 baar index karna jagah ki barbaadi hai.<br><strong>Iske bina:</strong> index bada, aur results mein same page 3 baar alag URLs se dikhega.` },
    { type: 'p', html: `2009 talk ke mutabik is infra ki teen buniyaad thi: <strong>GFS</strong> (bada storage), <strong>MapReduce</strong> (hazaar machines pe batch jobs aasaani se) aur <strong>Bigtable</strong> (har document ki jaankari online update karna, taaki docs ghanton nahi, minutes mein update hon). Ab poora pipeline ek saath dekho. Har box pe click karke uska kaam padho.` },
    { type: 'flow', title: 'Indexing: web se index tak', height: 320,
      nodes: [
        { id: 'fr', label: 'URL frontier', sub: 'to-do list', x: 80, y: 75, w: 128, kind: 'queue', info: 'Ye kya hai: crawler ki to-do list, un URLs ki jo abhi download karne hain, priority ke saath. Kyun: kaunsa page pehle aaye (news homepage pehle, purana page baad mein) aur kisi ek site pe kitni speed se jaayein, ye yahin tay hota hai. Naye mile links yahin wapas aate hain.' },
        { id: 'cr', label: 'Crawlers', sub: 'Googlebot', x: 245, y: 75, w: 136, kind: 'server', info: 'Ye kya hai: programs jo frontier se URL lekar page download karte hain. Google ke Search Central docs ke mutabik naye pages pehle se jaane pages ke links aur sitemaps se milte hain, aur pages recent Chrome se render bhi hote hain (JavaScript chalane ke liye). Detail: <a href="#/design-crawler">Web crawler lesson</a>.' },
        { id: 'bt', label: 'Bigtable', sub: 'page store (webtable)', x: 425, y: 75, w: 160, kind: 'data', info: 'Ye kya hai: har page ki ek row wala bada database. Bigtable paper (2006) ka example "Webtable": row key = ulta URL (com.cnn.www), taaki ek site ke pages paas paas sorted rahein; "contents:" column mein page ke kai versions (timestamp ke saath), "anchor:" columns mein doosri sites ka anchor text. Bigtable apni files GFS pe rakhta hai (GFS 2003: 64 MB chunks, default 3 copies; aaj GFS ki jagah Colossus).' },
        { id: 'mr', label: 'MapReduce', sub: 'parse, dedupe, links', x: 625, y: 75, w: 170, kind: 'server', info: 'Ye kya hai: hazaaron machines pe chalne wale batch jobs. Yahan kaam: HTML parse, words nikaalna, duplicate pages ka cluster banake ek canonical chunna, links aur anchor text nikaalna. MapReduce paper (2004) ke mutabik Google ne apna production indexing system MapReduce pe dobara likha; ek phase ka code ~3,800 lines C++ se ~700 lines ho gaya.' },
        { id: 'pr', label: 'PageRank', sub: 'link signals', x: 610, y: 250, w: 150, kind: 'server', info: 'Ye kya hai: poore link graph pe chalne wala ek baar-baar dohraya jaane wala (iterative) calculation, jo har page ki importance ka number deta hai. Kyun: ek query ke crore matches mein se achhe pages upar laane ke liye ek signal. Neeche widget mein khud chala ke dekho.' },
        { id: 'ix', label: 'Index builder', sub: 'word → docIDs', x: 370, y: 250, w: 160, kind: 'server', info: 'Ye kya hai: wo job jo inverted index banata hai. MapReduce paper ka khud ka example: map har document se (word, docID) pairs nikaale, reduce har word ke docIDs sort karke posting list bana de. Saath mein har doc ke signals (PageRank, language, quality) bhi jodta hai.' },
        { id: 'sh', label: 'Index shards', sub: 'by docID, replicated', x: 120, y: 250, w: 180, kind: 'data', info: 'Ye kya hai: poore index ke tukde. Index ko documents ke hisaab se baanta jaata hai: har shard ke paas kuch docs ka poora mini-index. Har shard ki kai copies (replicas). Serving machines inhe memory mein load karti hain. Kyun aise baante, ye Step 4 mein.' },
      ],
      edges: [{ a: 'fr', b: 'cr' }, { a: 'cr', b: 'bt' }, { a: 'bt', b: 'mr' }, { a: 'mr', b: 'pr' }, { a: 'mr', b: 'ix' }, { a: 'pr', b: 'ix' }, { a: 'ix', b: 'sh' }],
      scenarios: [
        { name: 'Naya page', steps: [
          { title: 'Frontier se URL', text: 'Frontier ne crawler ko agla URL diya: xyz.com ka naya blog post.', go: 'fr>cr', msg: 'next: https://www.xyz.com/blog/caching' },
          { title: 'Crawl aur store', text: 'Crawler ne page download kiya. Bigtable mein uski row mein contents ka naya version (timestamp ke saath) likha gaya.', go: 'cr>bt', msg: 'row "com.xyz.www/blog/caching"  contents:@t1 = <html>...' },
          { title: 'Process', text: 'MapReduce jobs page parse karte hain: words, title, links, anchor text. Page pe mile naye links ke URLs wapas frontier mein, crawl hone ke liye.', go: ['bt>mr', 'evt:mr>bt>cr>fr'] },
          { title: 'Signals', text: 'Link graph update hota hai, PageRank jaise link-based signals dobara compute.', go: 'mr>pr>ix' },
          { title: 'Index mein', text: 'Words → docID posting lists. Ye page kisi ek shard ka hissa banega (docID ke hisaab se).', go: ['mr>ix', 'ix>sh'], after: { sh: { state: 'ok', sub: 'naya version' } } },
        ]},
        { name: 'Duplicate page', steps: [
          { title: 'Same content, alag URL', text: 'xyz.com/page?ref=fb aur xyz.com/page ka content same hai. Google docs ke mutabik indexing mein similar pages ka cluster banta hai aur sabse representative ko canonical chuna jaata hai.', go: 'bt>mr', after: { mr: { state: 'warn', sub: 'duplicate cluster' } } },
          { title: 'Sirf canonical index', text: 'Duplicate ko alag index nahi kiya: index chhota, aur results mein same page do baar nahi.', go: 'mr>ix', after: { mr: { state: '', sub: 'parse, dedupe, links' } } },
        ]},
        { name: 'Failure: worker mara', steps: [
          { title: 'Machine crash', text: 'Hazaaron machines wale job mein kuch machines ka marna normal hai (yaad hai, sasti machines).', set: { mr: { state: 'down', sub: 'worker died' } } },
          { title: 'Task dobara', text: 'MapReduce paper ke mutabik master workers ko baar baar ping karta hai; mare hue worker ke tasks kisi aur machine pe dobara chalte hain. Programmer ko ye code likhna hi nahi padta. Job thoda late, lekin pura.', set: { mr: { state: 'ok', sub: 'task re-run' } }, go: 'mr>ix' },
        ]},
        { name: 'Freshness: batch vs continuous', steps: [
          { title: 'Purana tareeka', text: '2009 talk ke mutabik 1998-99 mein index ~mahine mein ek baar update hota tha. Google ke 2010 Caffeine post ke mutabik baad ke system mein bhi main layer har kuch hafte mein update hoti thi, aur har baar poore web ka analysis.', set: { sh: { state: 'warn', sub: 'hafton purana' } }, focus: ['sh'] },
          { title: 'Caffeine (2010): chhote tukde, lagatar', text: 'Web ko chhote tukdon mein process karke index ko lagatar update. Google ke mutabik 50% fresher results. Naya page minutes mein index tak.', go: 'fr>cr>bt>mr>ix>sh', after: { sh: { state: 'ok', sub: 'minutes purana' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'PageRank: links = votes, lekin har vote barabar nahi' },
    { type: 'p', html: `Problem: "cricket score" ke liye 1 crore pages match karte hain. Sab mein dono words hain. Kaunsa pehle dikhayein? 1998 paper ka bada idea: web ke <strong>links</strong> ko votes maano. Jab page B page A ko link karta hai, to B keh raha hai "A dekhne layak hai".` },
    { type: 'callout', tone: 'term', title: 'Naya word: PageRank', html: `<strong>Ye kya hai:</strong> har page ki importance ka ek number, jo is baat se nikalta hai ki kaun kaun se pages use link karte hain. Do rules: (1) important page ka vote zyada keemti, (2) jo page 100 jagah link karta hai, uska har link halka (uska vote 100 mein baant gaya).<br><strong>Kyun chahiye:</strong> words match karna kaafi nahi. Lakhon pages mein same words hain. Kaunsa page bharose layak hai, ye batane ke liye ek signal chahiye jo page khud apne baare mein na likh sake.<br><strong>Iske bina:</strong> 1998 se pehle ke search engines zyada tar sirf words ginte the. Koi bhi page "cricket cricket cricket" 100 baar likh ke upar aa jaata.` },
    { type: 'p', html: `Paper ka formula, simple roop mein:` },
    { type: 'code', text: `
PR(A) = (1 - d)/N  +  d × [ PR(T1)/C(T1) + ... + PR(Tn)/C(Tn) ]

T1..Tn  = wo pages jo A ko link karte hain
C(T)    = T se bahar jaane wale links ki ginti
d       = damping factor; paper: "We usually set d to 0.85"
N       = total pages` },
    { type: 'callout', tone: 'term', title: 'Naya word: Random surfer, damping factor', html: `<strong>Ye kya hai:</strong> paper ka intuition. Ek user random links pe click karta ja raha hai (random surfer). Har step pe 85% chance wo kisi link pe click karega (ye 0.85 hi damping factor d hai), 15% chance bore hoke kisi bhi random page pe chala jaayega. Lambe time ke baad wo kis page pe kitna time bitata hai = PageRank.<br><strong>Kyun chahiye:</strong> wo 15% wala jump (1 - d) isliye zaroori hai taaki surfer kisi loop ya bina-link wale page mein "phans" na jaaye.<br><strong>Iske bina:</strong> do pages jo sirf ek doosre ko link karte hain, saara rank kheench ke rakh lete, aur calculation kabhi theek se settle na hota. (Paper ne formula (1 - d) ke saath likha tha; yahan /N wala normalized version hai jisme saare ranks ka sum 1 hota hai.)` },
    { type: 'p', html: `Ye formula ek baar mein solve nahi hota, kyunki A ka rank B pe depend karta hai aur B ka A pe. Isliye <strong>iterate</strong> karo (baar baar dohraao): sabko barabar rank do, formula lagao, naye numbers pe phir formula lagao. Kuch rounds baad numbers badalna band kar dete hain (settle ho jaate hain). Khud karo. Box tick karo = row wala page column wale page ko link karta hai:` },
    { type: 'custom', render(el) {
      const names = ['A xyz.com', 'B blog', 'C news', 'D forum', 'E naya'], N = 5, d = 0.85;
      const start = [[1, 2], [2], [0], [2, 0], [2]];
      let L, r, it;
      let grid = '<div style="display:grid;grid-template-columns:72px repeat(5,minmax(30px,1fr));gap:4px;align-items:center;font-size:13px;max-width:340px"><span style="font-size:11px;color:var(--ink-3)">se ↓ / ko →</span>' + names.map(n => `<strong style="text-align:center">${n[0]}</strong>`).join('');
      for (let i = 0; i < N; i++) { grid += `<span>${names[i]}</span>`; for (let j = 0; j < N; j++) grid += i === j ? '<span style="text-align:center;color:var(--ink-3)">·</span>' : `<input type="checkbox" class="pr-c" data-i="${i}" data-j="${j}" style="justify-self:center;width:18px;height:18px">`; }
      el.innerHTML = grid + `</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="btn small primary pr-1">1 iteration</button><button type="button" class="btn small ghost pr-50">+50 iterations</button><button type="button" class="btn small ghost pr-r">Links reset</button></div>
        <div class="pr-bars" style="display:grid;gap:6px"></div>
        <div class="calc-note pr-note"></div>`;
      const boxes = [...el.querySelectorAll('.pr-c')];
      const readLinks = () => { L = Array.from({ length: N }, () => []); boxes.forEach(b => { if (b.checked) L[+b.dataset.i].push(+b.dataset.j); }); };
      const restart = () => { readLinks(); r = Array(N).fill(1 / N); it = 0; show(); };
      const step = () => { const n = Array(N).fill((1 - d) / N);
        for (let i = 0; i < N; i++) { if (!L[i].length) for (let j = 0; j < N; j++) n[j] += d * r[i] / N; else L[i].forEach(j => { n[j] += d * r[i] / L[i].length; }); }
        r = n; it++; };
      const show = () => {
        const mx = Math.max(...r), top = r.indexOf(mx);
        el.querySelector('.pr-bars').innerHTML = r.map((v, i) => `<div style="display:flex;gap:8px;align-items:center;font-size:13px"><span style="flex:0 0 84px">${names[i]}</span><div style="flex:1;background:var(--surface-2);border-radius:4px;height:14px"><div style="width:${(v * 100).toFixed(1)}%;height:100%;border-radius:4px;background:${i === top ? 'var(--accent)' : 'var(--ink-3)'}"></div></div><span style="flex:0 0 48px;font-family:var(--f-mono)">${v.toFixed(3)}</span></div>`).join('');
        const inc = i => L.filter(l => l.includes(i)).length;
        el.querySelector('.pr-note').textContent = it === 0 ? 'Iteration 0: sabko barabar 0.200. Ab "1 iteration" dabao.' : `Iteration ${it}. Sabse upar: ${names[top]} (${inc(top)} incoming links). ` + (L.some(l => !l.length) ? 'Kisi page se koi link bahar nahi jaata (dead end): uska rank sab pages mein barabar baant diya jaata hai, warna surfer wahan phans jaata.' : 'Jin pages pe koi link nahi aata, unhe sirf random jump wala hissa milta hai: 0.15/5 = 0.030.');
      };
      boxes.forEach(b => { b.checked = start[+b.dataset.i].includes(+b.dataset.j); b.addEventListener('change', restart); });
      el.querySelector('.pr-1').addEventListener('click', () => { step(); show(); });
      el.querySelector('.pr-50').addEventListener('click', () => { for (let k = 0; k < 50; k++) step(); show(); });
      el.querySelector('.pr-r').addEventListener('click', () => { boxes.forEach(b => { b.checked = start[+b.dataset.i].includes(+b.dataset.j); }); restart(); });
      restart();
    }},
    { type: 'p', html: `Try karo: (1) "+50" dabao: C (news) ~0.38 aur A ~0.37 pe settle hote hain. A ko sirf <em>ek</em> link aata hai (C se), phir bhi wo B se kaafi upar hai, kyunki C khud important hai. (2) Ab C → E tick karo aur phir +50: naya page E 0.030 se ~0.21 pe chala jaata hai. Reset karke D → E tick karo: E sirf ~0.04. Ek important page ka link, kai unimportant pages ke links se zyada keemti hai.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "Google aaj bhi sirf PageRank se rank karta hai"', html: `PageRank 1998 ka ek signal tha, poori ranking nahi. Google ke "How Search works" pages aaj "hundreds of factors" ki baat karte hain: query ka matlab, relevance, quality (jisme ye bhi dekha jaata hai ki doosri prominent sites us content ko link karti hain ya nahi: PageRank wala idea), usability, aur context (location, language). Aur link spam (paise deke links khareedna) ki wajah se sirf links pe bharosa khatarnak hai.` },
    { type: 'h2', text: 'Step 4: index ko kaise baantein? By document vs by word' },
    { type: 'p', html: `300 TB index ek machine mein nahi aayega, to <a href="#/sharding">sharding</a> karni hai. Sawaal: tukde kis cheez ke hisaab se karein? Do tareeke hain. Pehle upar wale 4 pages aur 2 machines se samjho:` },
    { type: 'compare',
      left: { title: 'By document (doc-partitioned)', html: `Machine 1 ke paas doc 1 aur doc 2 ka <em>poora</em> mini-index:<br><code>cricket → [1, 2]</code>, <code>score → [1]</code>, <code>live → [1]</code>...<br>Machine 2 ke paas doc 3 aur doc 4 ka:<br><code>cricket → [4]</code>, <code>score → [4]</code>, <code>news → [3, 4]</code>...<br><br>Query "cricket score" <strong>dono</strong> machines pe jaati hai. Machine 1 bolti hai "doc 1", machine 2 bolti hai "doc 4". Upar wala server dono jawab jod deta hai.` },
      right: { title: 'By word (term-partitioned)', html: `Machine 1 ke paas a se m tak ke words, <em>saare</em> docs ke liye:<br><code>cricket → [1, 2, 4]</code>, <code>live → [1, 3]</code>...<br>Machine 2 ke paas n se z:<br><code>score → [1, 4]</code>, <code>news → [3, 4]</code>...<br><br>Query "cricket score" ke liye machine 1 se cricket ki list, machine 2 se score ki list. Phir <strong>poori lists</strong> ek jagah laake intersect karo: [1, 4].` },
    },
    { type: 'p', html: `4 pages pe dono theek lagte hain. Asli web pe farak dikhta hai, jab ek word ki list mein arbon docIDs hon. Jeff Dean ke 2009 talk mein dono ka seedha comparison hai:` },
    { type: 'table', head: ['', 'By document (doc-partitioned)', 'By word (term-partitioned)'], rows: [
      ['Har shard mein', 'Kuch documents ka poora mini-index (saare words)', 'Kuch words ki posting lists (saare documents ke liye)'],
      ['Query kahan jaati hai', 'Har shard pe (scatter-gather)', 'Sirf un shards pe jinke paas query ke words hain (K words → max K shards)'],
      ['Network', 'Chhota: har shard sirf apne top results bhejta hai', 'Bahut zyada: bade posting lists ek jagah laake intersect karne padte hain ("the" ki list socho)'],
      ['Per-doc info (PageRank, snippet data)', 'Aasaan, doc ka sab kuch ek shard pe', 'Mushkil, doc ka data bikhra hua'],
      ['Kamzori', 'Har query har shard ko chhooti hai: fan-out, tail latency', 'Popular word ka shard hot (bahut busy); load barabar nahi'],
    ], caption: '2009 talk ka nateeja: Google ke environment mein by-document zyada sense banata tha.' },
    { type: 'p', html: `Numbers se feel karo. Neeche wale widget mein maan lo 100 billion docs hain, aur har word kitne % docs mein aata hai wo bhi maana hua hai ("the" 60%, "cricket" 0.5%, "score" 2%, "pythagoras" 0.001%, "theorem" 0.01%). By-word mein hum smart bano: chhoti list ko badi list wali machine pe bhejo, aur maan lo compression ke baad har docID sirf 1 byte. By-document mein har shard top 10 results bhejta hai, har result 12 bytes (docID + score).` },
    { type: 'custom', render(el) {
      const D = 100e9, F = { the: 0.6, cricket: 0.005, score: 0.02, pythagoras: 0.00001, theorem: 0.0001 };
      const QS = ['the cricket', 'cricket score', 'pythagoras theorem'], SS = [10, 100, 1000];
      let qi = 0, si = 2;
      const fmt = b => b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : b >= 1e3 ? (b / 1e3).toFixed(1) + ' KB' : b.toFixed(0) + ' B';
      el.innerHTML = `<div style="font-size:13px">Query:</div><div class="dsp-q" style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 8px"></div>
        <div style="font-size:13px">Shards:</div><div class="dsp-s" style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 8px"></div>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="text-align:left;padding:4px;border-bottom:1px solid var(--line)"></th><th style="text-align:left;padding:4px;border-bottom:1px solid var(--line)">By document</th><th style="text-align:left;padding:4px;border-bottom:1px solid var(--line)">By word</th></tr></thead><tbody class="dsp-t"></tbody></table></div>
        <div class="calc-note dsp-note"></div>`;
      const q = s => el.querySelector(s);
      q('.dsp-q').innerHTML = QS.map((x, i) => `<button type="button" class="chip" data-i="${i}">${x}</button>`).join('');
      q('.dsp-s').innerHTML = SS.map((x, i) => `<button type="button" class="chip" data-i="${i}">${x.toLocaleString('en-IN')}</button>`).join('');
      const show = () => {
        const S = SS[si], w = QS[qi].split(' '), f = w.map(x => F[x]);
        const docNet = S * 10 * 12, wordNet = Math.min(...f) * D * 1;
        const hotW = w[f.indexOf(Math.max(...f))];
        const rows = [['Machines jinse baat hui', S.toLocaleString('en-IN') + ' (sab)', w.length + ' (sirf words wali)'],
          ['Network data per query', fmt(docNet), fmt(wordNet)],
          ['Har shard ka local kaam', Math.round((f[0] + f[1]) * D / S).toLocaleString('en-IN') + ' entries', '1 machine pe ' + Math.round(Math.min(...f) * D).toLocaleString('en-IN') + '+ entries'],
          ['Hot spot', 'Nahi, kaam barabar baanta', '"' + hotW + '" wali machine har aisi query pe busy']];
        q('.dsp-t').innerHTML = rows.map(r => `<tr>${r.map((c, j) => `<td style="padding:4px;border-bottom:1px solid var(--line);${j ? 'font-family:var(--f-mono)' : ''}">${c}</td>`).join('')}</tr>`).join('');
        el.querySelectorAll('.dsp-q .chip').forEach((b, i) => b.classList.toggle('on', i === qi));
        el.querySelectorAll('.dsp-s .chip').forEach((b, i) => b.classList.toggle('on', i === si));
        const r = wordNet / docNet;
        q('.dsp-note').textContent = r >= 10 ? `By-word mein ${fmt(wordNet)} network pe bhejna pada, by-document mein sirf ${fmt(docNet)}: lagbhag ${Math.round(r).toLocaleString('en-IN')} guna zyada. Aur ye har query pe. Isiliye Google ne by-document chuna, chahe har query ko saare ${S.toLocaleString('en-IN')} shards pe jaana pade.`
          : `Rare words ("pythagoras theorem") ke saath by-word ka network kharcha bhi chhota hai (${fmt(wordNet)} vs ${fmt(docNet)}), aur sirf 2 machines se baat. Lekin web search mein common words bahut aate hain, aur ek design sab queries ke liye chahiye.`;
      };
      el.querySelectorAll('.dsp-q .chip').forEach(b => b.addEventListener('click', () => { qi = +b.dataset.i; show(); }));
      el.querySelectorAll('.dsp-s .chip').forEach(b => b.addEventListener('click', () => { si = +b.dataset.i; show(); }));
      show();
    }},
    { type: 'p', html: `"the cricket" aur 1,000 shards pe: by-document sirf 120 KB bhejta hai, by-word 500 MB (~4,000 guna). Ye 2009 talk wali baat ko numbers mein dikhata hai. By-document ka kharcha alag hai: har query <em>har</em> shard ko chhooti hai. Isi kharche ka naam hai scatter-gather.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Scatter-gather', html: `<strong>Ye kya hai:</strong> ek request ko kai machines pe ek saath bhejna (<strong>scatter</strong> = bikherna), aur sabke jawab ikattha karke jodna (<strong>gather</strong> = ikattha karna). Jaise class teacher har group se ek saath poochhe "tumhare group ka sabse achha project kaunsa?", phir sab jawab dekh ke poori class ka top 3 chune.<br><strong>Kyun chahiye:</strong> doc-partitioned index mein har shard ke paas sirf kuch docs hain. Best result kisi bhi shard mein ho sakta hai, isliye sabse poochhna padta hai. Har shard apne docs mein se local top-k (top k results, jaise top 10) deta hai, upar wala server sabko merge karke global top-k banata hai.<br><strong>Iske bina:</strong> ya to sirf kuch shards se poochho aur achhe results miss karo, ya by-word partitioning ka bhaari network kharcha uthao.` },
    { type: 'p', html: `"Web Search for a Planet" (2003) ke mutabik har shard mein documents ka ek <strong>random subset</strong> hota tha (random isliye, taaki har shard pe kaam barabar ho). Har shard ke liye machines ka ek pool (replicas) hota tha, aur ek load balancer har query ke liye har pool se ek machine chunta tha. Ek replica gir jaaye to LB use avoid karta hai: capacity thodi kam, lekin index ka koi hissa gayab nahi. Query ke do phase the: (1) <strong>index servers</strong> se ranked docIDs ki list, (2) <strong>doc servers</strong> se un docIDs ke title, URL aur query-specific snippet.` },
    { type: 'h2', text: 'Step 5: query path (serving)' },
    { type: 'p', html: `Ab jab tum search dabate ho, tab kya hota hai. Ismein jo machines kaam karti hain unhe milake <strong>query servers</strong> ya serving system kehte hain. Pehle har piece:` },
    { type: 'callout', tone: 'term', title: 'Naya word: Frontend web server (GWS)', html: `<strong>Ye kya hai:</strong> wo server jisse tumhara browser seedha baat karta hai. Google mein iska naam Google Web Server (GWS) tha. "Web Search for a Planet" (2003) ke mutabik DNS tumhe paas wale data center pe bhejta tha, aur wahan ka load balancer kisi ek GWS pe.<br><strong>Kyun chahiye:</strong> kisi ko poori query ka "manager" banna padega: spelling theek karwana, cache dekhna, index se results mangwana, aur aakhir mein HTML page banana.<br><strong>Iske bina:</strong> browser ko khud hazaaron machines se baat karni padti. Impossible.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Root, parent, leaf servers', html: `<strong>Ye kya hai:</strong> machines ka ek ped (tree). Sabse upar <strong>root</strong>, beech mein <strong>parents</strong>, neeche <strong>leaves</strong>. Har leaf ke paas index ka ek shard memory mein. Root query ko parents ko deta hai, har parent apne leaves ko. Jawab ulta upar aate hain, har level pe merge hote hue (2009 talk mein 2004 ka design).<br><strong>Kyun chahiye:</strong> root akela 1,000+ leaves se seedhe baat kare to uska network aur CPU jawab de dega. Parents kaam baant lete hain: har parent maan lo 30 leaves ke jawab jodke sirf apna top bhejta hai.<br><strong>Iske bina:</strong> ek machine pe hazaaron connections aur hazaaron jawab merge karne ka bojh.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Result cache', html: `<strong>Ye kya hai:</strong> haal hi ki queries ke tayyar jawab ki memory. "ipl score" abhi kisi ne poochha tha? Uska jawab rakha hai, seedha de do. Detail: <a href="#/caching">Caching lesson</a>.<br><strong>Kyun chahiye:</strong> log same cheezein baar baar search karte hain. 2009 talk ke mutabik Google ke cache servers ka hit rate (kitne % queries cache se hi jawab pa gayi) aam taur pe 30-60% tha.<br><strong>Iske bina:</strong> har query, chahe kitni bhi popular ho, hazaaron leaves tak jaati. Kai guna zyada machines chahiye.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Doc servers aur snippet', html: `<strong>Ye kya hai:</strong> leaves sirf docIDs aur scores dete hain (jaise "d17, 0.91"). User ko title, URL aur <strong>snippet</strong> (page ki 1-2 line jisme query ke words hain) chahiye. Doc servers ke paas pages ki copy hoti hai, aur wo docID + query lekar ye nikaal dete hain.<br><strong>Kyun chahiye:</strong> snippet query pe depend karta hai, isliye pehle se tayyar nahi rakh sakte. Aur ye kaam sirf top 10 ke liye karna hai, saare matches ke liye nahi.<br><strong>Iske bina:</strong> results mein sirf numbers dikhte, ya leaves ko poore pages bhi memory mein rakhne padte.` },
    { type: 'p', html: `Diagram mein parent layer chhod di hai aur do leaf shards dikhaaye hain; asli mein hazaaron. Har scenario chala ke dekho, khaaskar failure wale.` },
    { type: 'flow', title: 'Ek query ka safar', height: 330,
      nodes: [
        { id: 'gws', label: 'Frontend', sub: 'GWS', x: 80, y: 170, w: 124, kind: 'server', info: 'Ye kya hai: Google Web Server, jisse browser baat karta hai. "Web Search for a Planet" (2003) ke mutabik DNS user ko paas wale cluster pe bhejta hai, cluster ke andar hardware LB kisi GWS pe. GWS query execution coordinate karta hai (spell check, ads jaise side calls bhi) aur HTML banata hai.' },
        { id: 'cache', label: 'Cache servers', sub: 'results + snippets', x: 262, y: 55, w: 150, kind: 'cache', info: 'Ye kya hai: haal ki queries ke tayyar jawab ki memory. 2009 talk ke mutabik cache servers index results aur snippets dono cache karte the, hit rate aam taur pe 30-60%. Popular queries aksar mehengi bhi hoti hain (common words, bahut saare docs), to cache bahut kaam bachata hai.' },
        { id: 'root', label: 'Root', sub: 'scatter + merge', x: 292, y: 170, w: 140, kind: 'server', info: 'Ye kya hai: serving tree ka sabse upar wala server. Query ko saare leaf shards pe bhejta hai (beech mein parent servers ek tree banate hain), sabke local top results merge karke global top-k banata hai, aur final ranking (zyada mehenga ML) sirf in top candidates pe chalata hai.' },
        { id: 's1', label: 'Leaf shard 1', sub: 'docs ka 1 hissa', x: 535, y: 55, w: 150, kind: 'data', info: 'Ye kya hai: ek leaf server, jiske paas index ka ek shard memory mein hai (2009 talk: early 2001 se index memory mein serve hone laga). Apne docs mein posting lists intersect karke, sasti scoring se local top results deta hai. Kyun: har leaf sirf apne hisse ka kaam kare, to sab parallel mein jaldi khatam.' },
        { id: 's2', label: 'Leaf shard 2', sub: 'replica A', x: 535, y: 150, w: 150, kind: 'data', info: 'Ye kya hai: doosre shard ki ek copy (replica A). Har shard ke kai replicas hain (capacity aur failures ke liye).' },
        { id: 's2b', label: 'Shard 2', sub: 'replica B', x: 535, y: 245, w: 150, kind: 'data', hidden: true, info: 'Ye kya hai: shard 2 ki doosri copy, bilkul same data. Slow ya down replica ki jagah kaam aati hai.' },
        { id: 'docs', label: 'Doc servers', sub: 'title + snippet', x: 292, y: 285, w: 150, kind: 'server', info: 'Ye kya hai: wo servers jinke paas pages ki copy hai. docID + query do, title aur query ke words ke aas paas ka snippet lo. Ye bhi docID se sharded aur replicated (2003 paper aur 2009 talk dono mein).' },
      ],
      edges: [{ a: 'gws', b: 'cache' }, { a: 'gws', b: 'root' }, { a: 'root', b: 's1' }, { a: 'root', b: 's2' }, { a: 'root', b: 's2b', id: 'rb', hidden: true }, { a: 'root', b: 'docs' }],
      scenarios: [
        { name: 'Cache hit', intro: 'Popular query, kisi ne abhi abhi same cheez poochhi thi.', steps: [
          { title: 'Query aayi', text: 'User ne "ipl score" search kiya.', go: 'gws>cache', msg: 'q = "ipl score", lang = hi-IN' },
          { title: 'HIT', text: 'Results + snippets cache mein hain. Hazaaron leaf machines ko chhua hi nahi.', go: 'res:cache>gws', after: { cache: { state: 'hit' }, root: { state: 'dim' } } },
        ]},
        { name: 'Scatter-gather', steps: [
          { title: 'Cache MISS', text: 'Rare query.', go: ['gws>cache', 'bad:cache>gws'], after: { cache: { state: 'miss' } }, msg: 'q = "caching strategies hinglish"' },
          { title: 'Scatter', text: 'Root query ko har shard pe bhejta hai (asli mein parent servers ke through hazaaron leaves).', go: ['gws>root'] },
          { title: 'Har shard local top-k', text: 'Har leaf apne docs mein dhoondhta hai aur apne top results (docID, score) bhejta hai, poori posting list nahi.', parallel: true, go: ['root>s1', 'root>s2'] },
          { title: 'Gather + merge', text: 'Root sabke jawab merge karke global top 10 nikaalta hai, aur unhi pe mehenga final ranking chalata hai.', parallel: true, go: ['res:s1>root', 'res:s2>root'], msg: 'shard1: [(0.91, d17), (0.84, d3)]  shard2: [(0.88, d902), ...]' },
          { title: 'Snippets', text: 'Top 10 docIDs ke liye doc servers se title aur snippet.', go: ['root>docs', 'res:docs>root'] },
          { title: 'Jawab', text: 'GWS HTML banata hai, aur result cache mein bhi chala jaata hai.', go: ['res:root>gws', 'gws>cache'], after: { cache: { state: '' } } },
        ]},
        { name: 'Slow shard: hedged request', steps: [
          { title: 'Ek replica atka', text: 'Shard 2 ka replica A kisi aur job ki wajah se, ya GC pause (program ka memory saaf karne ke liye kuch der ruk jaana) mein atka hai. Baaki sab ready, sab iska wait kar rahe hain.', set: { s2: { state: 'hot', sub: 'atka hua' } }, parallel: true, go: ['root>s1', 'root>s2'] },
          { title: 'Shard 1 aa gaya', text: 'Shard 1 normal time mein aa gaya. Shard 2 ka koi jawab nahi.', go: 'res:s1>root' },
          { title: 'Hedge: doosri copy se poochho', text: 'Thodi der (maan lo shard ka p95 latency jitna, yaani itna time jisme 100 mein se 95 jawab aa jaate hain) wait ke baad root wahi request replica B ko bhi bhejta hai. Isse hedged request kehte hain: ek backup request. Jo pehle aaye wo jeeta; doosra cancel.', show: ['s2b', 'rb'], go: ['root>s2b', 'res:s2b>root'], after: { s2b: { state: 'ok' } } },
          { title: 'Faayda', text: 'Tail at Scale paper (2013) ka Google benchmark: 100 servers pe 1,000 keys padhne mein 10 ms ke baad hedge karne se 99.9th percentile 1,800 ms se 74 ms, sirf 2% extra requests ke saath.', set: { s2: { state: 'dim', sub: 'cancelled' } }, focus: ['root'] },
        ]},
        { name: 'Replica down', steps: [
          { title: 'Machine gayi', text: 'Shard 2 ka replica A ki machine mar gayi.', set: { s2: { state: 'down', sub: 'DOWN' } }, show: ['s2b', 'rb'] },
          { title: 'LB doosri copy pe', text: '2003 paper ke mutabik LB down replica ko avoid karta hai. Capacity thodi kam, lekin index ka koi hissa gayab nahi. Cluster manager machine ko theek ya replace karta hai.', parallel: true, go: ['root>s1', 'root>s2b'] },
          { title: 'Normal jawab', text: 'User ko kuch pata nahi chala.', parallel: true, go: ['res:s1>root', 'res:s2b>root'] },
        ]},
        { name: 'Query of death: canary', steps: [
          { title: 'Ajeeb query', text: 'Ek query kisi untested code path ko chhooti hai jo leaf ko crash kar deti hai. Agar ye seedhe hazaaron leaves pe gayi, to sab ek saath girenge.', focus: ['root'], msg: 'q = "<bahut ajeeb input>"' },
          { title: 'Pehle ek pe try (canary)', text: 'Tail at Scale paper ke mutabik Google ke kuch IR (information retrieval, yaani search) systems pehle query ko 1-2 leaves pe bhejte hain. Isse canary request kehte hain: pehle chhote se hisse pe aazmaao, phir sab pe. Yahan canary leaf crash ho gaya.', go: 'root>s1', after: { s1: { state: 'down', sub: 'crashed' } } },
          { title: 'Baaki ko mat bhejo', text: 'Root query ko dangerous mark karke baaki leaves pe nahi bhejta. Ek machine giri, poora cluster nahi. Thoda latency (ek extra round trip) ka kharcha, bade outage se bachav.', set: { s2: { state: 'ok', sub: 'bach gaya' } }, go: 'bad:root>gws' },
        ]},
        { name: 'Good enough results', steps: [
          { title: 'Ek shard bahut slow', text: 'Shard 2 aur uski replica dono slow (maan lo network issue).', set: { s2: { state: 'hot', sub: 'bahut slow' } }, parallel: true, go: ['root>s1', 'lost:root>s2'] },
          { title: 'Bina uske jawab do', text: 'Tail at Scale paper: bade search systems mein kaafi leaves ka jawab aa jaaye to thode incomplete ("good-enough") results dena behtar hai. Paper ke mutabik kisi ek leaf ke paas best result hone ka chance 1,000 mein 1 se bhi kam hai, aur important docs kai leaves pe replicate hote hain.', go: ['res:s1>root', 'res:root>gws'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 1: fan-out aur tail latency' },
    { type: 'p', html: `Scatter-gather ka chhupa hua dushman: root tab tak jawab nahi de sakta jab tak <strong>sabse slow</strong> shard jawab na de. Jaise class ka group photo: sab ready hain, lekin ek bachcha late hai to photo late.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Tail latency (p50, p99)', html: `<strong>Ye kya hai:</strong> 100 requests ko fast se slow order mein lagao. <strong>p50</strong> = beech wali (50th) request ka time: "aam taur pe kitna". <strong>p99</strong> = 99th request ka time: "sabse bure 1% ko kitna". Ye bure wale requests "tail" (poonchh) hain, isliye naam tail latency. Detail: <a href="#/latency-throughput">Latency lesson</a>.<br><strong>Kyun chahiye:</strong> average achha dikh sakta hai jabki har 100 mein se kuch users ko 1 second wait karna pade. Google jaisi site pe 1% bhi crore log hain.<br><strong>Iske bina (sirf average dekha to):</strong> fan-out wali problem dikhegi hi nahi, kyunki wo average mein chhup jaati hai.` },
    { type: 'callout', tone: 'term', title: 'Naya word: Hedged request', html: `<strong>Ye kya hai:</strong> pehli request ek replica ko bhejo; agar wo ek chhoti si der (aam taur pe expected p95 latency, yaani 95th request ka time) ke baad bhi na aaye, to wahi request doosri replica ko bhi bhej do. Jo pehle aaye wo use karo, baaki cancel. Naam "hedge" isliye: ek ke saath doosra backup daav.<br><strong>Kyun chahiye:</strong> slow replica ka wait karne ki jagah, uski copy se jawab le lo.<br><strong>Iske bina:</strong> har slow machine poori query ko slow karti hai.<br> Ye tabhi safe hai jab request <strong>read-only/idempotent</strong> ho, yaani do baar chalne pe bhi koi nuksaan na ho (search query aisi hi hai). Paper ek variant bhi deta hai, <strong>tied requests</strong>: dono replicas ko bhejo, aur jo pehle kaam shuru kare wo doosre ko cancel kar de.` },
    { type: 'p', html: `Pehle ek query, 8 shards, aur ek slow shard. Kisi bhi shard pe click karke use slow banao, aur teen tareeke try karo: (1) sabka wait karo, (2) hedge karo, (3) <strong>good-enough</strong>: ek time limit (timeout) rakho, aur jo shards us time tak aa gaye unhi ke results se jawab de do.` },
    { type: 'custom', render(el) {
      const A = [12, 9, 15, 11, 8, 13, 10, 14], B = [10, 12, 9, 13, 11, 8, 12, 10], SLOW = 900, HD = 20, TO = 50, MERGE = 2;
      const MODES = ['Sabka wait karo', 'Hedge (20 ms ke baad replica B)', 'Good-enough (50 ms timeout)'];
      let slow = 4, mode = 0;
      el.innerHTML = `<div class="dsg-m" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div>
        <div class="dsg-rows" style="display:grid;gap:5px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button type="button" class="btn small ghost dsg-none">Koi slow nahi</button></div>
        <div class="stats"><div class="stat"><span>Query ka total time</span><strong class="dsg-t"></strong></div><div class="stat"><span>Extra requests</span><strong class="dsg-x"></strong></div><div class="stat"><span>Docs jinme dhoondha</span><strong class="dsg-c"></strong></div></div>
        <div class="calc-note dsg-note"></div>`;
      const q = s => el.querySelector(s);
      q('.dsg-m').innerHTML = MODES.map((m, i) => `<button type="button" class="chip" data-i="${i}">${m}</button>`).join('');
      const calc = () => {
        const lat = A.map((t, i) => i === slow ? SLOW : t);
        let t = lat.slice(), extra = 0, used = lat.map(() => true), finish;
        if (mode === 1) t = lat.map((x, i) => x > HD ? (extra++, Math.min(x, HD + B[i])) : x);
        if (mode === 2) { used = lat.map(x => x <= TO); finish = (used.every(Boolean) ? Math.max(...lat) : TO) + MERGE; }
        else finish = Math.max(...t) + MERGE;
        return { lat, t, extra, used, finish };
      };
      const show = () => {
        const r = calc(), scale = Math.max(...r.t, 60);
        el.querySelectorAll('.dsg-m .chip').forEach((b, i) => b.classList.toggle('on', i === mode));
        q('.dsg-rows').innerHTML = r.t.map((x, i) => {
          const tag = mode === 1 && r.lat[i] > HD ? ` (hedge: B ${B[i]} ms)` : mode === 2 && !r.used[i] ? ' (chhod diya)' : '';
          const col = i === slow ? 'var(--red)' : 'var(--accent)';
          return `<button type="button" data-i="${i}" style="display:flex;gap:8px;align-items:center;font-size:12.5px;background:none;border:0;padding:0;color:var(--ink);cursor:pointer;text-align:left;width:100%"><span style="flex:0 0 58px">Shard ${i + 1}</span><span style="flex:1;background:var(--surface-2);border-radius:4px;height:12px;position:relative"><span style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100, x / scale * 100).toFixed(1)}%;border-radius:4px;background:${col};opacity:${mode === 2 && !r.used[i] ? 0.35 : 1}"></span></span><span style="flex:0 0 120px;font-family:var(--f-mono)">${x} ms${tag}</span></button>`;
        }).join('');
        el.querySelectorAll('.dsg-rows button').forEach(b => b.addEventListener('click', () => { slow = +b.dataset.i; show(); }));
        const n = r.used.filter(Boolean).length;
        q('.dsg-t').textContent = r.finish + ' ms';
        q('.dsg-x').textContent = r.extra + ' of 8 (' + (r.extra / 8 * 100).toFixed(1) + '%)';
        q('.dsg-c').textContent = (n / 8 * 100).toFixed(1) + '%';
        q('.dsg-note').textContent = slow < 0 ? `Koi shard slow nahi: query ${r.finish} ms mein (sabse slow normal shard 15 ms + merge 2 ms). Teeno tareeke yahan same hain.`
          : mode === 0 ? `7 shards 15 ms ke andar aa gaye, lekin root ${SLOW} ms wale shard ka wait karta raha. Total = sabse slow shard + merge = ${r.finish} ms. Bina slow shard ke ye query 17 ms leti; ek slow shard ne poori query lagbhag 50 guna slow kar di.`
          : mode === 1 ? `20 ms tak jawab nahi aaya, to root ne wahi sawaal shard ${slow + 1} ki doosri copy (replica B) se bhi poochh liya. B ne ${B[slow]} ms mein jawab diya, to total ${HD} + ${B[slow]} + ${MERGE} (merge) = ${r.finish} ms. Kharcha: sirf 1 extra request, aur results poore.`
          : `Root ne 50 ms tak wait kiya aur jo shards aa gaye unke saath jawab de diya: ${r.finish} ms. Kharcha: shard ${slow + 1} ke docs (${(100 / 8).toFixed(1)}%) is query mein dhoondhe hi nahi gaye.`;
      };
      el.querySelectorAll('.dsg-m .chip').forEach(b => b.addEventListener('click', () => { mode = +b.dataset.i; show(); }));
      q('.dsg-none').addEventListener('click', () => { slow = -1; show(); });
      show();
    }},
    { type: 'p', html: `Asli Google mein 8 nahi, hazaaron shards hain. Har leaf "99% fast" ho tab bhi, hazaar leaves mein se koi na koi to slow hoga hi. Ab ise bade scale pe chala ke dekho. Har leaf normally ~5-20 ms leta hai, lekin kabhi kabhi (GC pause, disk, same machine pe chal raha koi doosra job) 1 second:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Shards (fan-out N): <strong class="ta-nv"></strong></label><input class="ta-n" type="range" min="0" max="6" value="2"></div>
          <div><label>Ek leaf kitni baar 1 s leta hai</label><select class="ta-p"><option value="0.01">100 mein 1</option><option value="0.001">1,000 mein 1</option><option value="0.0001">10,000 mein 1</option></select></div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0"><button type="button" class="chip ta-h">Hedged requests: OFF</button></div>
        <div class="stats">
          <div class="stat"><span>Queries jo &gt;500 ms leti hain</span><strong class="ta-slow"></strong></div>
          <div class="stat"><span>Formula 1-(1-p)^N</span><strong class="ta-f"></strong></div>
          <div class="stat"><span>Query p50 / p99</span><strong class="ta-p99"></strong></div>
          <div class="stat"><span>Extra requests (hedging)</span><strong class="ta-x"></strong></div>
        </div>
        <div class="calc-note ta-note"></div>`;
      const q = s => el.querySelector(s), NS = [1, 10, 100, 300, 1000, 2000, 5000];
      let hedge = false;
      const run = () => {
        const N = NS[Number(q('.ta-n').value)], p = Number(q('.ta-p').value), Q = N >= 1000 ? 400 : 1000;
        let seed = 12345; const u = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const leaf = () => u() < p ? 1000 + u() * 200 : 5 + -Math.log(u()) * 3; // normal: ~5-20 ms, outlier ~1 s
        const D = 14; // hedge delay ≈ p95 of a normal leaf (5 + 3·ln 20 ≈ 14 ms)
        const lat = []; let extra = 0;
        for (let k = 0; k < Q; k++) { let m = 0;
          for (let i = 0; i < N; i++) { let t = leaf(); if (hedge && t > D) { extra++; t = Math.min(t, D + leaf()); } if (t > m) m = t; }
          lat.push(m); }
        lat.sort((a, b) => a - b);
        const pc = x => lat[Math.min(Q - 1, Math.floor(x * Q))], slow = lat.filter(x => x > 500).length / Q;
        const f = 1 - Math.pow(1 - p, N);
        q('.ta-nv').textContent = N.toLocaleString('en-IN');
        q('.ta-slow').textContent = (slow * 100).toFixed(1) + '%';
        q('.ta-f').textContent = (f * 100).toFixed(1) + '%' + (hedge ? ' (bina hedge)' : '');
        q('.ta-p99').textContent = pc(0.5).toFixed(0) + ' / ' + pc(0.99).toFixed(0) + ' ms';
        q('.ta-x').textContent = hedge ? '+' + (extra / (Q * N) * 100).toFixed(1) + '%' : '0%';
        q('.ta-h').textContent = 'Hedged requests: ' + (hedge ? 'ON (14 ms ke baad)' : 'OFF');
        q('.ta-h').classList.toggle('on', hedge);
        q('.ta-note').textContent = hedge
          ? (slow < 0.02 ? `Jo leaf 14 ms (normal leaf ka ~p95) mein nahi aaya, uski request doosri replica ko bhi. Dono copies ka ek saath slow hona bahut rare hai, isliye slow queries lagbhag khatam, sirf ~5-6% extra requests ke kharche pe.` : `Hedging ne bahut sudhaara (${(f * 100).toFixed(0)}% se ${(slow * 100).toFixed(1)}%), lekin itne bade fan-out pe dono copies ka slow hona (har leaf pe ~p²) bhi baar baar ho jaata hai. Yahan aur tricks chahiye: good-enough results, tied requests, aur slow machines ki wajah dhoondh ke theek karna.`)
          : `${N.toLocaleString('en-IN')} shards, har ek sirf ${(p * 100).toFixed(2)}% baar slow: phir bhi ${(slow * 100).toFixed(1)}% queries slow. Fan-out jitna bada, utna bura. (Simulation ${Q} queries ka, seeded, isliye har baar same.)`;
      };
      q('.ta-n').addEventListener('input', run); q('.ta-p').addEventListener('input', run);
      q('.ta-h').addEventListener('click', () => { hedge = !hedge; run(); });
      run();
    }},

    { type: 'p', html: `Default setting (100 shards, 100 mein 1) pe ~62% queries slow aati hain, formula 63.4% kehta hai. Yahi example Dean aur Barroso ke 2013 paper "The Tail at Scale" mein hai: 100 servers mein se har ek ka 1% slow, to 63% user requests 1 second se zyada. Aur "10,000 mein 1" pe 2,000 shards rakho: ~1 in 5 queries slow, paper bhi "almost one in five" kehta hai. Hedging ON karo: slow queries ~0-1%, aur kharcha sirf ~5% extra requests.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner confusion: "har request do jagah bhej do, tail khatam"', html: `Har request turant do jagah bhejoge to load seedha 2×, aur zyada load se khud latency badhegi. Trick ye hai ki doosri request sirf tab jaaye jab pehli <em>already slow</em> ho (p95 ke baad), to sirf ~5% requests double hoti hain. Aur hedge karne se slow machine theek nahi hoti: monitoring se wajah (GC, noisy neighbour, yaani same machine pe chalta koi doosra bhaari job, kharab disk) dhoondhna phir bhi zaroori hai.` },
    { type: 'p', html: `Tail at Scale paper ki baaki tricks jo search pe seedhi lagti hain: <strong>micro-partitions</strong> (machines se kahin zyada chhote partitions, taaki load ko chhote tukdon mein shift kar sako), <strong>selective replication</strong> (paper ke mutabik Google ka web search popular aur important documents ki extra copies kai partitions mein rakhta tha), <strong>canary requests</strong> aur <strong>good-enough</strong> results (dono upar diagram mein).` },
    { type: 'h2', text: 'Deep dive 2: ranking, sasta pehle, mehenga baad mein' },
    { type: 'callout', tone: 'term', title: 'Naya word: Ranking aur ranking signal', html: `<strong>Ye kya hai:</strong> ranking = matching pages ko "sabse kaam ka pehle" order mein lagana. Har page ko ek score milta hai. Score jin cheezon se banta hai unhe <strong>signals</strong> kehte hain: words kitne achhe match hue (jaise <a href="#/search">BM25</a> score), page kitna important hai (PageRank), page kitna naya hai, mobile pe chalta hai ya nahi.<br><strong>Kyun chahiye:</strong> user zyada tar pehle 10 results hi dekhta hai. Lakhon matches mein se sahi 10 chunna hi asli product hai.<br><strong>Iske bina:</strong> results kisi bhi order mein: pehla link kisi 2009 ke purane forum ka, asli jawab page 40 pe.` },
    { type: 'p', html: `Problem: har shard ke paas lakhon matching docs ho sakte hain. Sab pe bhaari <strong>ML model</strong> (data se seekha hua ek bada formula jo score deta hai, lekin chalne mein mehenga) chalana impossible. Isliye ranking ek <strong>funnel</strong> (kuppi: upar chaudi, neeche patli) ki tarah hota hai: upar se bahut saare aate hain, har stage pe kam bachte hain, aur mehenga kaam sirf aakhri thode docs pe. Ye general industry approach hai; Google ke stages ki exact detail public nahi. Maan lo wale numbers ke saath:` },
    { type: 'code', text: `
Stage 1  har leaf: posting lists intersect     → 10,000 matches per leaf  (sasta score: BM25 + PageRank)
Stage 2  har leaf: local top-k                 → top 100 per leaf  bheje
Stage 3  root (parents ke through) merge       → 1,000 leaves × 100 = 1,00,000 → top 1,000
Stage 4  root: mehenga ML re-rank              → sirf 1,000 docs pe
Stage 5  final page                            → top 10 + snippets (doc servers se)

(Numbers "maan lo" hain. Point: mehenga model 1 crore docs pe nahi, sirf 1,000 pe chala.)` },
    { type: 'steps', items: [
      { t: 'Retrieval (leaf pe)', d: 'Posting lists intersect karo, sasti scoring (BM25 jaisa text match + static quality, yaani query se alag page ki apni quality, jaise PageRank). 1998 paper mein bhi limit thi: 40,000 matching docs milte hi searcher ruk jaata tha, taaki response time bandha rahe.' },
      { t: 'Local top-k', d: 'Har leaf sirf apne top kuch sau bhejta hai. Docs ko docID mein quality order se number dene ka faayda (2009 talk: "better docs ko chhote docIDs"): achhe docs posting list mein pehle aate hain, jaldi mil jaate hain.' },
      { t: 'Merge + re-rank (root pe)', d: 'Hazaaron candidates pe zyada mehenge signals aur ML models.' },
      { t: 'Final page', d: 'Diversity (ek hi site ke 10 results nahi), snippets, freshness boost agar query news jaisi ho.' },
    ]},
    { type: 'p', html: `Modern signals (sirf awareness): Google ke "How Search works" pages ranking ke bade factors bataate hain: query ka <strong>matlab</strong> (spelling, synonyms), <strong>relevance</strong> (keywords + aggregated, anonymised interaction data), <strong>quality</strong> (expertise, authoritativeness, trustworthiness; doosri prominent sites ke links bhi), <strong>usability</strong> (mobile friendly, speed) aur <strong>context</strong> (location, language, settings). Google ke 2022 blog ke mutabik AI systems bhi hain: RankBrain (2015, pehla deep learning system), neural matching (2018), BERT (2019, ranking aur retrieval dono mein). Aur Google ke mutabik ranking ko behtar karne ke liye har saal lakhon (hundreds of thousands) experiments chalte hain.` },

    { type: 'h2', text: 'Deep dive 3: caching aur freshness' },
    { type: 'callout', tone: 'term', title: 'Naya word: Freshness', html: `<strong>Ye kya hai:</strong> koi page badla ya naya bana, to wo kitni der mein search results mein dikhta hai. Jitna kam time, utna "fresh" index.<br><strong>Kyun chahiye:</strong> "ipl score" ya "aaj ki news" pe kal ka jawab bekaar hai. Lekin "pythagoras theorem" ka jawab saalon nahi badalta.<br><strong>Iske bina:</strong> agar poora index mahine mein ek baar banta (1998-99 mein aisa hi tha), to aaj ka match, aaj ki news, naya product: kuch nahi milta.` },
    { type: 'p', html: `Caching aur freshness ek doosre ke ulte kheenchte hain: cache jitna lamba rakho, jawab utna purana ho sakta hai. Google ne dono ko kaise sambhala (2009 talk aur 2010 blog ke mutabik):` },
    { type: 'list', items: [
      '<strong>Result cache</strong>: 2009 talk ke mutabik hit rate 30-60%, query mix, personalization (har user ke hisaab se alag results) aur index update ki frequency pe depend. Faayda: jo query cache se nikli, uske liye hazaaron leaves ko kaam hi nahi karna pada. Warning bhi: index update ya cache flush ke baad bada latency spike aur capacity drop (cold cache), isliye flush dheere dheere.',
      '<strong>Pair cache</strong> (1999-2000 era): aksar saath aane wale words ("new" + "york") ki posting lists ka intersection pehle se nikaal ke rakhna.',
      '<strong>Index memory mein</strong>: replicas badhte gaye to total RAM itni ho gayi ki poora index memory mein aa gaya (early 2001). Throughput (ek second mein kitni queries) aur tail dono behtar, lekin ab har query 1000s machines chhooti hai, aur "query of death" sab ko ek saath gira sakti thi.',
      '<strong>Freshness ke liye tiers</strong> (alag alag layers): 2009 talk ke mutabik kai retrieval systems the: ek sub-second updates ke liye (kam docs), ek bahut zyada docs ke liye lekin daily updates. Query dono se poochh ke merge. 2007 ke "Universal Search" mein ek super root web, news, images, video jaise alag indexes se results milata tha.',
      '<strong>Caffeine (2010)</strong>: Google ke mutabik 50% fresher results; har second lakhon (hundreds of thousands) pages parallel mein process; ~100 million GB storage ek database mein. Bigtable jaise online store ne per-document info ko minutes mein update karna possible banaya.',
      '<strong>Crawl freshness</strong>: Google ke docs ke mutabik crawlers seekhte hain ki koi page kitni baar badalta hai, aur us hisaab se dobara aate hain. News site har kuch minute, purana Wikipedia article kam.',
    ]},
    { type: 'callout', tone: 'warn', html: `Cache ki ek aur mushkil: results personal aur location-based hain ("cricket academy near me" query ka jawab Delhi aur Pune mein alag). Cache key mein language/region jaise hisse aate hain, aur jitni zyada personalization, utna kam hit rate. Isliye talk mein hit rate "personalization ke level" pe depend bataya gaya.` },
    { type: 'p', html: `Autocomplete alag system hai (prefix → top suggestions, tries + precomputed top-k): <a href="#/design-typeahead">Search autocomplete lesson</a>. Spell correction bhi alag service hai jo query ke saath chalti hai (2003 paper ke diagram mein spell checker GWS ke saath alag box hai).` },

    { type: 'h2', text: 'Failures aur bottlenecks' },
    { type: 'table', head: ['Kya hua', 'Asar', 'Bachaav (source)'], rows: [
      ['Ek leaf replica slow', 'Har query ka tail kharab', 'Hedged/tied requests (Tail at Scale, 2013)'],
      ['Ek replica down', 'Us shard ki capacity kam', 'LB doosri replica pe; cluster manager (machines ki dekhbhaal wala software) replace karta hai (2003 paper)'],
      ['Query of death', 'Hazaaron leaves ek saath crash', 'Canary requests (Tail at Scale, 2013)'],
      ['Ek shard ka jawab nahi aaya', 'Results thode incomplete', 'Good-enough results + important docs ki extra copies (2013)'],
      ['Index update / cache flush', 'Cold cache: latency spike, capacity drop', 'Dheere dheere rollout, cache warm-up (2009 talk)'],
      ['Machines pe bit errors, crashes (indexing)', 'Corrupt ya adhoora index', 'Checksums (data ka chhota fingerprint jisse corruption pakdi jaaye), MapReduce task re-execution (2009 talk, 2004 paper)'],
      ['Index badhta gaya', 'Har shard slow', 'Aur shards + compression (2009 talk: block format se index ~30% chhota) + memory mein index'],
    ]},

    { type: 'h2', text: 'Interview mein kaise bolein' },
    { type: 'steps', items: [
      { t: 'Do pipelines alag karo', d: 'Offline indexing (crawl → store → parse/dedupe/links → PageRank → inverted index build) aur online serving (cache → root → leaves → merge → snippets).' },
      { t: 'Partitioning decide karo', d: 'By document: har shard independent, network kam, per-doc data aasaan; kharcha: har query har shard pe (fan-out).' },
      { t: 'Fan-out ka tail', d: '1-(1-p)^N; hedged/tied requests, canaries, good-enough results, replicas.' },
      { t: 'Ranking funnel', d: 'Leaf pe sasta (BM25 + static quality), root pe mehenga ML; PageRank ek signal hai, poori ranking nahi.' },
      { t: 'Cache + freshness', d: 'Result cache (30-60% hit, 2009), tiers: real-time chhota index + bada daily index, incremental indexing (poora dobara banane ki jagah sirf badle hisse update karna; Caffeine 2010).' },
      { t: 'Honest bano', d: '"Ye 2003-2013 ke papers pe based hai; aaj Google ka system aage badh chuka hai (GFS ki jagah Colossus, BERT jaise models)."' },
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Index ek machine se bada?</strong> Doc-partition karo, har shard replicate karo, query scatter-gather. <strong>Fan-out bada?</strong> Tail latency ko first-class problem maano: hedge (sirf idempotent reads pe), timeouts ke saath good-enough results. <strong>Ranking mehenga?</strong> Funnel: sasta retrieval sab pe, mehenga ML sirf top candidates pe. <strong>Freshness chahiye?</strong> Batch rebuild ki jagah incremental updates + chhota real-time tier.` },
    { type: 'diagram', title: 'Google Search: poori picture', height: 700,
      caption: 'Upar ka hissa background mein lagatar chalta hai; neeche ka hissa har query pe. Dono ko jodne wali cheez: index shards. Ye 1998-2013 ke public papers pe based simplified picture hai.',
      groups: [
        { label: 'Crawl & index (background mein, lagatar)', x: 8, y: 8, w: 704, h: 322 },
        { label: 'Search query (har query pe, ~0.2 s)', x: 24, y: 345, w: 688, h: 347 },
      ],
      nodes: [
        { id: 'fr', label: 'URL frontier', sub: 'kya crawl karna', x: 90, y: 72, w: 140, kind: 'queue', info: 'Crawler ki to-do list: kaunse URLs abhi download karne hain, kis priority se, aur har site pe kitni speed se. Naye mile links yahin aate hain.' },
        { id: 'cr', label: 'Googlebot', sub: 'crawlers', x: 300, y: 72, w: 130, kind: 'server', info: 'Pages download karne wale programs. Frontier se URL lete hain, page laate hain (zaroorat ho to Chrome se render karke), aur Bigtable mein rakhte hain.' },
        { id: 'web', label: 'The web', sub: 'websites, sitemaps', x: 580, y: 72, w: 170, kind: 'net', info: 'Duniya bhar ki websites. Google ka hissa nahi: crawler inse pages maangta hai. Sitemap file se website bata sakti hai ki uske paas kaunse pages hain.' },
        { id: 'gfs', label: 'GFS → Colossus', sub: 'files, 3 copies', x: 90, y: 180, w: 140, kind: 'data', info: 'Hazaaron machines ki disks ko jodke ek bada file system (GFS paper 2003: 64 MB chunks, default 3 copies). Google Cloud blog (2021) ke mutabik aaj iski jagah Colossus hai.' },
        { id: 'bt', label: 'Bigtable', sub: 'webtable: har page', x: 300, y: 180, w: 160, kind: 'data', info: 'Har page ki ek row wala bada database (Bigtable paper 2006). Row key ulta URL, page ke kai versions, aur anchor text. Isse ek page ki jaankari minutes mein update ho sakti hai. Files GFS pe.' },
        { id: 'mr', label: 'MapReduce', sub: 'parse, dedupe, links', x: 560, y: 180, w: 170, kind: 'server', info: 'Hazaaron machines pe batch jobs (MapReduce paper 2004): HTML se words aur links nikaalna, duplicate pages hata ke canonical chunna. Mari machine ka kaam apne aap dobara chalta hai.' },
        { id: 'ib', label: 'Index builder', sub: 'word → docIDs', x: 300, y: 280, w: 160, kind: 'server', info: 'Inverted index banata hai: har word ke liye un docIDs ki sorted list jinme wo word hai. Har doc ke signals (PageRank, language, quality) bhi saath. Index ko docID ke hisaab se shards mein baant ke leaves ko deta hai.' },
        { id: 'pr', label: 'PageRank', sub: 'link signals', x: 560, y: 280, w: 150, kind: 'server', info: 'Links ke graph pe iterative calculation: important pages ka link zyada keemti. Ranking ke kai signals mein se ek (1998 paper ka bada idea).' },
        { id: 'user', label: 'User', sub: 'browser / app', x: 100, y: 410, w: 120, kind: 'client', info: 'Tum. Query bhejte ho ("cricket score") aur 10 results ka page wapas paate ho. DNS tumhe paas wale Google data center pe bhejta hai.' },
        { id: 'gws', label: 'Frontend (GWS)', sub: 'spell, parse, HTML', x: 335, y: 410, w: 160, kind: 'server', info: 'Query ka manager: spelling theek karwata hai, pehle cache dekhta hai, miss pe root se results mangwata hai, aur aakhir mein HTML page banata hai.' },
        { id: 'cache', label: 'Result cache', sub: '30-60% hits (2009)', x: 575, y: 410, w: 160, kind: 'cache', info: 'Haal ki queries ke tayyar jawab. 2009 talk ke mutabik hit rate 30-60%. Hit pe hazaaron leaves ko chhoona hi nahi padta. Personalization aur freshness iska hit rate kam karte hain.' },
        { id: 'root', label: 'Root + parents', sub: 'scatter, merge, rank', x: 335, y: 520, w: 170, kind: 'server', info: 'Serving tree ka upar wala hissa. Query ko saare leaves pe bhejta hai (scatter), local top results jodta hai (gather), mehenga ML re-rank sirf top candidates pe. Slow leaf pe hedge, crash-wali query pe canary.' },
        { id: 'docs', label: 'Doc servers', sub: 'title + snippet', x: 575, y: 520, w: 160, kind: 'server', info: 'Top 10 docIDs ke liye title, URL aur query ke words wala snippet nikaalte hain. Ye bhi docID se sharded aur replicated hain.' },
        { id: 'l1', label: 'Leaf shard 1', sub: 'replicas A, B', x: 200, y: 630, w: 150, kind: 'data', info: 'Index ka ek shard memory mein, kai copies (replicas) ke saath. Apne docs mein posting lists intersect karke sasta score lagata hai aur local top-k bhejta hai.' },
        { id: 'l2', label: 'Leaf shard N', sub: '...hazaaron', x: 460, y: 630, w: 150, kind: 'data', info: 'Baaki shards. Asli mein hazaaron, har ek ke paas docs ka ek random hissa. Har query har shard pe jaati hai, isliye sabse slow shard poori query ka time tay karta hai.' },
      ],
      edges: [
        { a: 'fr', b: 'cr', label: 'next URL' },
        { a: 'cr', b: 'web', label: 'fetch', both: true },
        { a: 'cr', b: 'bt' },
        { a: 'bt', b: 'gfs', dashed: true },
        { a: 'bt', b: 'mr', label: 'pages' },
        { a: 'mr', b: 'fr', kind: 'evt', label: 'new links', via: [[560, 126], [470, 126], [380, 126], [90, 126]] },
        { a: 'mr', b: 'pr' },
        { a: 'mr', b: 'ib' },
        { a: 'pr', b: 'ib' },
        { a: 'ib', b: 'l1', kind: 'evt', dashed: true, via: [[200, 337], [14, 337], [14, 630]] },
        { a: 'user', b: 'gws', n: 1, label: 'query', both: true },
        { a: 'gws', b: 'cache', n: 2 },
        { a: 'gws', b: 'root', n: 3, label: 'cache miss' },
        { a: 'root', b: 'l1', n: 4, label: 'scatter' },
        { a: 'root', b: 'l2' },
        { a: 'root', b: 'docs', n: 5 },
      ],
      paths: [
        { name: 'Crawl & index', text: 'Frontier → Googlebot page laata hai → Bigtable (files GFS/Colossus pe) → MapReduce parse, dedupe, links (naye links wapas frontier mein) → PageRank → index builder → shards leaves pe load.', go: ['fr>cr>web', 'cr>bt>mr>pr>ib', 'mr>ib', 'bt>gfs', 'mr>fr', 'ib>l1'] },
        { name: 'Search query', text: '1 query GWS pe → 2 cache dekho → 3 miss to root → 4 root sab leaves pe scatter, local top-k gather, merge + ML re-rank → 5 doc servers se snippets → page user ko (aur cache mein).', go: ['user>gws>cache', 'gws>root>l1', 'root>l2', 'root>docs'] },
        { name: 'Cache hit', text: 'Popular query: GWS ko cache mein tayyar jawab mil gaya. Root aur hazaaron leaves ko kaam hi nahi.', go: ['user>gws>cache'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
      <li>Search = do alag pipelines: background mein <strong>crawl + index</strong>, aur har query pe <strong>serve</strong>.</li>
      <li>Inverted index: word → docIDs ki posting list. Query = lists ka intersection + ranking.</li>
      <li>Indexing ki buniyaad (2003-2006 papers): GFS (aaj Colossus) storage, Bigtable per-page rows, MapReduce batch jobs.</li>
      <li>Index ko <strong>by document</strong> baanto: network kam, shards independent; kharcha: har query har shard pe (scatter-gather).</li>
      <li>Fan-out ka dushman tail latency: 1-(1-p)^N. Ilaaj: replicas, hedged/tied requests, good-enough results, canary.</li>
      <li>Ranking funnel: leaf pe sasta score (BM25 + PageRank), root pe mehenga ML sirf top candidates pe.</li>
      <li>Result cache (30-60% hits, 2009) bahut kaam bachata hai; freshness ke liye incremental indexing (Caffeine 2010) aur chhota real-time tier.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Doc-partitioning: shards independent, network kam, add karna aasaan', 'Replicas: capacity bhi, failure tolerance bhi', 'Hedged requests: tail latency bahut kam, sirf ~5% extra load', 'Result cache: 30-60% queries bina leaves ke (2009)', 'Ranking funnel: bhaari ML sirf thode candidates pe', 'Incremental indexing: minutes mein fresh results'],
      costs: ['Har query har shard ko chhooti hai: hazaaron machines, tail risk', 'Index memory mein: RAM ka bahut bada bill', 'Hedging se thoda extra load; sirf idempotent requests pe safe', 'Good-enough results: kabhi kabhi best result miss', 'Cache flush pe cold start; personalization se hit rate kam', 'Incremental index: PageRank jaise global signals ka online approximation chahiye (2009 talk)'],
    },
    { type: 'think', questions: [
      { q: 'Index ko word ke hisaab se shard kiya hota to "the cricket" jaisi query ka kya hota?', a: '"the" ki posting list almost har document mein hai: bahut badi. Use ek shard se doosre tak bhej ke "cricket" ki list se intersect karna padta: bahut network. Aur "the" wala shard har query pe hot. Doc-partitioning mein har shard apne docs ke liye ye intersection locally kar leta hai aur sirf top results bhejta hai.' },
      { q: 'Hedged request payment API pe kyun nahi lagani chahiye, search pe kyun theek hai?', a: 'Hedge mein same request do baar chal sakti hai. Search query read-only hai: do baar chale to bas thoda extra CPU. Payment do baar chala to paisa do baar kat sakta hai. Write requests pe sirf tab jab <a href="#/pagination-idempotency">idempotency key</a> jaisa protection ho.' },
      { q: 'Result cache ka TTL (ek cached jawab kitni der tak valid maana jaaye) lamba rakhein ya chhota?', a: 'Lamba TTL = zyada hits, lekin purane results (news queries pe bura). Chhota = fresh, lekin zyada load leaves pe. Practical: query type ke hisaab se (news jaisi trending query chhota TTL, "pythagoras theorem" lamba), aur index update hone pe affected entries invalidate. Saath mein dhyaan: ek saath poora cache flush mat karo, warna cold cache spike.' },
    ]},

    { type: 'quiz', questions: [
      { q: 'Inverted index mein cricket → [1, 2, 4] aur score → [1, 4] hai. Query "cricket score" ka jawab?', options: ['[1, 2, 4]', '[1, 4]', '[1, 2, 4, 1, 4]', '[2]'], answer: 1, explain: 'Dono words wale docs chahiye, to dono lists ka intersection: jo docIDs dono mein hain, yaani 1 aur 4. Upar wale widget mein yahi hua.' },
      { q: 'Google ne (2009 talk ke mutabik) index ko kis tarah shard karna behtar paaya?', options: ['By word: har shard kuch words', 'By document: har shard kuch docs ka poora index', 'By user location', 'Shard hi nahi kiya, ek badi machine'], answer: 1, explain: 'By doc: shards independent query process karte hain, network traffic chhota, per-doc info aasaan. Kharcha: har query har shard pe.' },
      { q: 'Har leaf 1% baar slow hai, query 100 leaves pe jaati hai. Kitni queries slow?', options: ['~1%', '~10%', '~63%', '100%'], answer: 2, explain: '1 - 0.99^100 ≈ 0.634. Tail at Scale paper ka exact example.' },
      { q: 'Hedged request kab bheji jaati hai?', options: ['Har request ke saath turant', 'Jab pehli request expected p95 jitni der ke baad bhi na aaye', 'Sirf jab server down ho', 'Jab cache miss ho'], answer: 1, explain: 'Thoda wait karke hedge karne se sirf slow requests (≈5%) double hoti hain, load mein bahut kam izafa.' },
      { q: 'PageRank mein page A ko kisi bahut important page ka ek link milta hai. Usse kya hota hai?', options: ['Kuch nahi, sirf links ki ginti matter karti hai', 'A ka rank kaafi badhta hai, kyunki important page ka vote bhaari hai', 'A ka rank kam hota hai', 'Sirf anchor text badalta hai'], answer: 1, explain: 'Vote ka wazan linking page ke PageRank ÷ uske outgoing links. Widget mein C → E ne E ko 0.03 se ~0.21 kar diya.' },
      { q: '"Canary request" kis problem ko rokta hai?', options: ['Slow shard', 'Ek ajeeb query jo saare leaf servers ko ek saath crash kar de', 'Cache miss', 'Spelling mistakes'], answer: 1, explain: 'Pehle 1-2 leaves pe try; wo crash/hang ho to baaki hazaaron pe query bheji hi nahi jaati.' },
    ]},
    { type: 'sources', note: 'Google Search ka aaj ka internal design poora public nahi hai. Ye lesson in papers/talks (saal ke saath) aur Google ke official pages pe based hai; "general approach" likhi baatein industry practice hain.', items: [
      { title: 'The Anatomy of a Large-Scale Hypertextual Web Search Engine', publisher: 'Sergey Brin, Lawrence Page (Stanford), WWW7', year: 1998, official: true, url: 'http://infolab.stanford.edu/~backrub/google.html', used: 'Architecture (URLserver, crawlers, storeserver, repository, indexer, barrels, sorter, searcher), hits, anchor text, PageRank formula with d = 0.85, 24M pages / 147 GB, 1-10 s queries, 40,000-match cutoff, crawler numbers.' },
      { title: 'Web Search for a Planet: The Google Cluster Architecture', publisher: 'Barroso, Dean, Hölzle, IEEE Micro', year: 2003, official: true, url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/googlecluster-ieee.pdf', used: 'Query reads hundreds of MB / tens of billions of cycles, DNS + LB to GWS, index shards of random doc subsets with replica pools, two phases (index servers, doc servers), spell checker box.' },
      { title: 'Challenges in Building Large-Scale Information Retrieval Systems (WSDM keynote)', publisher: 'Jeff Dean, Google', year: 2009, official: true, url: 'https://static.googleusercontent.com/media/research.google.com/en//people/jeff/WSDM09-keynote.pdf', used: '1999 vs 2009 numbers, doc vs word partitioning, cache servers 30-60% hit rate, monthly index updates, pair cache, in-memory index (2001), root/parent/leaf (2004), Universal Search (2007), GFS/MapReduce/Bigtable roles, tiers for freshness, ~30% smaller block index.' },
      { title: 'The Tail at Scale', publisher: 'Jeffrey Dean, Luiz André Barroso, Communications of the ACM', year: 2013, official: true, url: 'https://www.barroso.org/publications/TheTailAtScale.pdf', used: '63% with 100 servers at 1%, ~1 in 5 with 2,000 servers at 1 in 10,000, hedged requests (1,800 ms → 74 ms with 2% more requests), tied requests, micro-partitions, selective replication, canary requests, good-enough results.' },
      { title: 'The Google File System (SOSP)', publisher: 'Ghemawat, Gobioff, Leung, Google', year: 2003, official: true, url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/gfs-sosp2003.pdf', used: 'Single master + chunkservers, 64 MB chunks, 3 replicas by default.' },
      { title: 'MapReduce: Simplified Data Processing on Large Clusters (OSDI)', publisher: 'Dean, Ghemawat, Google', year: 2004, official: true, url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf', used: 'Inverted index as a map/reduce example, production indexing rewritten on MapReduce (3,800 → 700 lines for one phase), fault tolerance by re-execution.' },
      { title: 'Bigtable: A Distributed Storage System for Structured Data (OSDI)', publisher: 'Chang et al., Google', year: 2006, official: true, url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/bigtable-osdi06.pdf', used: 'Webtable: reversed-URL row keys, contents: with timestamps, anchor: column family.' },
      { title: 'Our new search index: Caffeine', publisher: 'Official Google Blog', year: 2010, official: true, url: 'https://googleblog.blogspot.com/2010/06/our-new-search-index-caffeine.html', used: 'Old layered index updated every couple of weeks vs continuous updates, 50% fresher, scale numbers.' },
      { title: 'How Search works (organizing information, ranking results)', publisher: 'Google', official: true, url: 'https://www.google.com/search/howsearchworks/how-search-works/', used: 'Index covers hundreds of billions of pages and >100,000,000 GB, crawl re-visit learning, ranking factors (meaning, relevance, quality, usability, context), freshness for news queries.' },
      { title: 'In-depth guide to how Google Search works', publisher: 'Google Search Central docs', official: true, url: 'https://developers.google.com/search/docs/fundamentals/how-search-works', used: 'Crawling (links, sitemaps, rendering with Chrome), indexing (duplicate clusters, canonical), serving.' },
      { title: 'How AI powers great search results', publisher: 'Google Keyword blog (Pandu Nayak)', year: 2022, official: true, url: 'https://blog.google/products/search/how-ai-powers-great-search-results/', used: 'RankBrain (2015), neural matching (2018), BERT (2019) in ranking and retrieval.' },
      { title: 'Colossus under the hood: a peek into Google\'s scalable storage system', publisher: 'Google Cloud blog', year: 2021, official: true, url: 'https://cloud.google.com/blog/products/storage-data-transfer/a-peek-behind-colossus-googles-file-system', used: 'Colossus is the successor to GFS.' },
    ]},
  ],
});
