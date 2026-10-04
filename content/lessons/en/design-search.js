Lesson.register({
  id: 'design-search',
  title: 'Google Search',
  minutes: 45,
  summary: `How do the right results come back in less than one second, out of hundreds of billions of pages? Crawl → index → doc-sharded inverted index → scatter-gather → ranking, plus the fight for caching, freshness and tail latency. Every piece is first explained in plain words, then at interview depth.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `You type "cricket score" into Google, and in less than half a second you get 10 good links. But the internet has billions of pages. Google cannot read all of them every time you search: that would take years.<br>So Google reads all the pages ahead of time, in the background, and builds a huge "word → pages" register. When your query arrives, it simply opens the register.<br>The register is so big that it is split across thousands of computers. In this lesson we will see: how pages are collected, how the register is built, how thousands of computers work together to give one answer, and why one slow computer can make the whole answer slow.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think for 5 minutes: the "word → pages" register is so big that it must be split across thousands of machines. Would you split it by <em>words</em> (machine 1 gets the words from a to m) or by <em>pages</em> (machine 1 gets the first 10 million pages)? When a query arrives, how many machines must you talk to? And what if just one of them is slow?` },
    { type: 'p', html: `This lesson builds on the <a href="#/search">Search and inverted index</a> lesson (tokenization and BM25 are explained there in detail). For the crawler, see the <a href="#/design-crawler">Web crawler</a> lesson. The focus here: what changes when the index does not fit on one machine, but lives on thousands. Anything that did not come up before is explained here first, in plain words.` },
    { type: 'callout', tone: 'warn', title: 'What is public and what is not', html: `The inside of today's Google Search is not fully public. What we know comes from Google's papers and talks, and many of them are old: the Brin &amp; Page paper (1998), "Web Search for a Planet" (2003), GFS (2003), MapReduce (2004), Bigtable (2006), Jeff Dean's WSDM talk (2009), "The Tail at Scale" (2013), and Google's official "How Search works" pages. This lesson gives the year everywhere. Today's system has moved beyond all of these (for example, GFS has been replaced by Colossus, according to a 2021 Google Cloud blog post).` },

    { type: 'h2', text: 'The basics first: the three jobs of a search engine' },
    { type: 'p', html: `Every web search engine, small or as big as Google, does three jobs. The first two run all the time in the background. The third happens when you press the search button.` },
    { type: 'steps', items: [
      { t: 'Crawl: collect pages', d: 'Travel around the internet and download web pages. Like someone opening every page of every website and keeping a copy.' },
      { t: 'Index: store pages in a shape that is easy to search', d: 'Pull the words out of each page and build a register: which word appears on which pages.' },
      { t: 'Serve: answer the query', d: 'Look up the user\'s words in the register, put the matching pages in order from best to worst (ranking), and show 10 results.' },
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Crawler (Googlebot)', html: `<strong>What it is:</strong> a program that downloads web pages, reads the links on those pages, and then downloads the pages behind those links too. Google's crawler is called <strong>Googlebot</strong>.<br><strong>Why we need it:</strong> if Google has no copy of a page, how can it search inside it? Websites do not hand their pages to Google by themselves (a sitemap file can only give a list).<br><strong>Without it:</strong> the search engine has nothing to read. And if the crawler does not bring new pages quickly, today's news will never show up in search.` },
    { type: 'callout', tone: 'term', title: 'New word: Index and inverted index', html: `<strong>What it is:</strong> think of the index at the back of a book: "Photosynthesis: page 12, 45". An inverted index is exactly that, but for the whole web: <strong>each word → the list of pages that contain it</strong>. This list is called a <strong>posting list</strong>.<br><strong>Why we need it:</strong> when a query arrives, reading billions of pages one by one is impossible. Look the word up in the index, and you have the list.<br><strong>Without it:</strong> every query would scan the whole web. Days instead of 1 second.<br>The opposite, a <strong>forward index</strong>, is page → its words (like what is written on each page of a book). The inverted index is built by "flipping" the forward index, which is why it is called "inverted".` },
    { type: 'callout', tone: 'term', title: 'New word: docID', html: `<strong>What it is:</strong> a small number given to each page (document), like 1, 2, 3...<br><strong>Why we need it:</strong> posting lists store small numbers instead of long URLs ("https://www.xyz.com/blog/caching-strategies"). Numbers are small, and fast to compare and sort.<br><strong>Without it:</strong> the index would be many times bigger and slower.` },
    { type: 'p', html: `Build a tiny inverted index yourself. Below are 4 tiny web pages. Press "Index next page" and watch how the posting list of each word grows. Then pick a query.` },
    { type: 'custom', render(el) {
      const pages = ['Cricket score live', 'How to choose a cricket bat', 'Live news today', 'Cricket news and score'];
      const toks = pages.map(p => p.toLowerCase().split(/[^a-z]+/).filter(Boolean));
      const queries = ['cricket score', 'live cricket', 'news', 'cricket bat score'];
      let done = 0, qi = 0;
      el.innerHTML = `<div class="dsx-pages" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px;margin-bottom:8px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button type="button" class="btn small primary dsx-next">Index next page</button><button type="button" class="btn small ghost dsx-all">Index all</button><button type="button" class="btn small ghost dsx-reset">Reset</button></div>
        <div class="dsx-ix" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:4px 12px;font-family:var(--f-mono);font-size:12.5px;min-height:40px"></div>
        <div style="margin-top:10px;font-size:13px">Pick a query:</div>
        <div class="dsx-q" style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0"></div>
        <div class="stats"><div class="stat"><span>Matching pages</span><strong class="dsx-m"></strong></div><div class="stat"><span>Entries read from the index</span><strong class="dsx-r"></strong></div><div class="stat"><span>Without an index: words to read</span><strong class="dsx-s"></strong></div></div>
        <div class="calc-note dsx-note"></div>`;
      const q = s => el.querySelector(s);
      q('.dsx-q').innerHTML = queries.map((x, i) => `<button type="button" class="chip dsx-qb" data-i="${i}">${x}</button>`).join('');
      const build = () => { const ix = {}; for (let d = 0; d < done; d++) toks[d].forEach(w => { ix[w] = ix[w] || []; if (!ix[w].includes(d + 1)) ix[w].push(d + 1); }); return ix; };
      const show = () => {
        const ix = build(), qw = queries[qi].split(' ');
        q('.dsx-pages').innerHTML = pages.map((p, d) => `<div style="border:1px solid ${d < done ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:6px 8px;font-size:13px;background:var(--surface)"><strong>doc ${d + 1}</strong>${d < done ? ' ✓' : ''}<br>${p}</div>`).join('');
        const words = Object.keys(ix).sort();
        q('.dsx-ix').innerHTML = words.length ? words.map(w => `<div style="${qw.includes(w) ? 'color:var(--accent-ink);background:var(--accent-soft);border-radius:4px;padding:0 4px' : ''}">${w} → [${ix[w].join(', ')}]</div>`).join('') : '<div style="color:var(--ink-3)">The index is empty for now.</div>';
        el.querySelectorAll('.dsx-qb').forEach((b, i) => b.classList.toggle('on', i === qi));
        const lists = qw.map(w => ix[w] || []);
        const match = lists.reduce((a, l) => a.filter(x => l.includes(x)));
        const read = lists.reduce((s, l) => s + l.length, 0), scan = toks.slice(0, done).reduce((s, t) => s + t.length, 0);
        q('.dsx-m').textContent = match.length ? match.map(x => 'doc ' + x).join(', ') : 'none';
        q('.dsx-r').textContent = read;
        q('.dsx-s').textContent = scan;
        q('.dsx-note').textContent = done < 4 ? `${done} of 4 pages are indexed so far. A page that is not indexed can never be found by search: that is why indexing new pages quickly (freshness) matters.`
          : `"${queries[qi]}": take the posting list of each word (${qw.map((w, i) => w + ' → [' + lists[i].join(', ') + ']').join(', ')}). The docIDs that are in ALL lists are the answer (this is called the intersection). With the index we read only ${read} entries; without it we would read ${scan} words. On 4 pages the difference is small; on billions of pages it is the difference between "1 second" and "many days".`;
      };
      q('.dsx-next').addEventListener('click', () => { if (done < 4) done++; show(); });
      q('.dsx-all').addEventListener('click', () => { done = 4; show(); });
      q('.dsx-reset').addEventListener('click', () => { done = 0; show(); });
      el.querySelectorAll('.dsx-qb').forEach(b => b.addEventListener('click', () => { qi = +b.dataset.i; show(); }));
      show();
    }},
    { type: 'p', html: `Notice: the answer to "cricket score" is doc 1 and doc 4. But which one do we show first? Both pages contain both words. That is the question of <strong>ranking</strong>, which comes later in this lesson. One more thing: the real Google can hold billions of docIDs in the list of a single word. That does not fit on one machine. That is where all the difficulty begins.` },
    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Give a query ("how to learn system design"), get ranked results: title, URL, snippet (1-2 lines of the page that contain your words)<br>• Understand the query even with wrong spelling ("sistem dizain")<br>• New content shows up quickly (today's news)<br>• Autocomplete<br><br><strong>Out of scope:</strong> ads, image/video search, AI answers` },
      right: { title: 'Non-functional', html: `• Latency (how long the answer takes): the full answer within ~0.2 s (the 2009 talk gave an average query latency of &lt;0.2 s)<br>• Very high QPS (queries per second), from all over the world<br>• A very large index: according to Google's "How Search works" pages, hundreds of billions of pages and more than 100,000,000 GB<br>• Still answer when some machines are slow or down<br>• Freshness (how soon a new page appears in search): minutes, not months` },
    },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `First, two new words, because the napkin maths depends on them.` },
    { type: 'callout', tone: 'term', title: 'New word: Shard', html: `<strong>What it is:</strong> one piece of a big set of data, kept on one machine (or a group of machines). Like splitting a thick dictionary into 26 thin books, one for each letter.<br><strong>Why we need it:</strong> Google's index does not fit in the memory or disk of any single computer. It must be cut into pieces and spread over thousands of machines.<br><strong>Without it:</strong> one machine, which can neither hold that much data nor handle that many queries. Details: <a href="#/sharding">Sharding lesson</a>.` },
    { type: 'callout', tone: 'term', title: 'New word: Replica (replication)', html: `<strong>What it is:</strong> another exact copy of the same shard, on a different machine. Replication = making copies.<br><strong>Why we need it:</strong> two reasons. (1) Machines break all the time: if one copy is gone, another one does the work. (2) One copy cannot handle that many queries: 3 copies = roughly 3 times as many queries.<br><strong>Without it:</strong> one machine dies, and that part of the index is gone: some pages will never appear in search. Details: <a href="#/replication">Replication lesson</a>.` },
    { type: 'p', html: `Now assume (these are assumptions, not Google's numbers): 100 billion pages in the index, ~10 KB of indexed text + metadata per page, and an inverted index that is ~30% of the raw text. Then:` },
    { type: 'code', text: `
Raw text:        100 × 10^9 pages × 10 KB      = 1,000 TB  = 1 PB
Inverted index:  ~30% of that                   ≈ 300 TB
RAM of one machine:  assume 256 GB
Shards (to keep it in memory):  300 TB / 256 GB  ≈ 1,200 shards
Replicas per shard (for QPS + failures): × 3 or more  →  ~3,600+ machines

Conclusion: one query needs answers from ~1,200 machines. And the answer within 200 ms.` },
    { type: 'p', html: `The real numbers will be different, but the shape is the same: <strong>one query, thousands of machines</strong>. The 2003 paper "Web Search for a Planet" (Barroso, Dean, Hölzle) said that a single Google query reads hundreds of megabytes of data on average and uses tens of billions of CPU cycles. Sending one query to thousands of machines is called <strong>fan-out</strong>. All the hard problems in this lesson come from this fan-out.` },

    { type: 'image', src: 'assets/img/design-search/dalles-datacenter.jpg', alt: 'A very large building without windows, with a wooden Google sign and two bicycles in front', caption: 'One of Google\'s data centers, in The Dalles, Oregon (USA). The machines behind "one query, thousands of machines" live in buildings like this. From outside it is just a big building; inside are thousands of server racks, plus power and cooling.', credit: { text: 'Lambtron, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Google_data_center.jpg', license: 'CC BY-SA 4.0' } },

    { type: 'h2', text: 'The beginning: Google in 1998' },
    { type: 'p', html: `The 1998 paper by Brin and Page ("The Anatomy of a Large-Scale Hypertextual Web Search Engine") still explains the skeleton of the design. That prototype had ~24 million pages (147 GB). These were the pieces (each with its job in plain words):` },
    { type: 'list', items: [
      '<strong>URLserver + crawlers</strong>: the URLserver kept a "what to download next" list and gave URLs to the crawlers. According to the paper, there were 3-4 crawlers, each keeping ~300 connections open at the same time, reaching 100+ pages/second at peak. DNS lookup (finding a website\'s IP address from its name) was such a big bottleneck that each crawler kept its own DNS cache.',
      '<strong>Storeserver → repository</strong>: downloaded pages were compressed and kept in a big store (the repository). Each page got a <strong>docID</strong>.',
      '<strong>Indexer</strong>: parsed each page (separating text and links from the HTML) and pulled out a "hit" for every word (the word, its position on the page, font size, capital letters or not). These hits went into files called "barrels": this was the forward index (doc → words). All links and their <strong>anchor text</strong> went into a separate file.',
      '<strong>Sorter</strong>: sorted the forward index again by word to build the <strong>inverted index</strong> (word → docs).',
      '<strong>PageRank</strong>: a number for the importance of each page, computed from the web of links (the graph).',
      '<strong>Searcher</strong>: read the posting lists of the query words, matched and ranked. According to the paper, most queries took between 1 and 10 seconds, and there was no query caching yet.',
    ]},
    { type: 'callout', tone: 'term', title: 'New word: Anchor text', html: `<strong>What it is:</strong> the clickable text of a link. For example, a blog says "<u>best Hindi dictionary</u>" and that text is a link to some page.<br><strong>Why we need it:</strong> if 1,000 pages link to one page with the text "best Hindi dictionary", other people are describing that page, even if the page itself does not contain those words. This can be a more trustworthy signal than the page\'s own text.<br><strong>Without it:</strong> you only see the page\'s own text. A page that lies about itself, or has little text (for example, only an image), gets ranked wrongly.` },
    { type: 'image', src: 'assets/img/design-search/first-server-1999.jpg', maxWidth: 360, alt: 'An old rack with many open PC motherboards and hard disks stacked on top of each other, with network cables all around', caption: 'Google\'s first production server rack (around 1999), at the Computer History Museum. Instead of expensive big servers: cheap, ordinary PC boards stacked on top of each other. The thinking was: machines will break, so the software must learn to handle failures. You will see this same thinking later in GFS, MapReduce and replicas.', credit: { text: 'Steve Jurvetson, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Google%E2%80%99s_First_Production_Server.jpg', license: 'CC BY 2.0' } },
    { type: 'p', html: `What changed between 1999 and 2009? According to Jeff Dean\'s 2009 WSDM talk: documents went from ~70 million to many billions, queries per day grew ~1000×, index update latency (the time for a new page to reach the index) went <strong>from months to minutes</strong>, and average query latency went from &lt;1 s to &lt;0.2 s. He said the system had 7 big revisions in 10 years, and the lesson was: design for ~10× growth, but plan to rewrite before ~100×.` },
    { type: 'h2', text: 'Step 3: indexing pipeline (offline)' },
    { type: 'p', html: `Search has two completely separate parts: <strong>indexing</strong> (in the background, reading the web and building the index) and <strong>serving</strong> (answering the query). Indexing first. Before you look at the diagram, understand each of its pieces one by one. Each piece is there because something broke without it.` },
    { type: 'callout', tone: 'term', title: 'New word: URL frontier', html: `<strong>What it is:</strong> the crawler\'s "to-do list": all the URLs that still need to be downloaded, with a priority. In the 1998 Google, the URLserver did this job.<br><strong>Why we need it:</strong> the web has billions of URLs and the crawler\'s speed is limited. Which page should come first (a news site\'s homepage, or a 10-year-old page)? And if you send 1,000 requests to one website at the same time, that site can go down, so the speed limit for each site (politeness) is also controlled here.<br><strong>Without it:</strong> the crawler would fetch random pages, important new pages would arrive late, and small websites would get too much load. Details: <a href="#/design-crawler">Web crawler lesson</a>.` },
    { type: 'p', html: `According to Google\'s Search Central docs, Googlebot finds most new pages through links on pages it already knows, and through sitemaps. An algorithm decides which sites to crawl, how often, and how many pages. Pages are also <strong>rendered</strong> in a recent version of Chrome, which means their JavaScript is run, so that content added by JavaScript is also seen.` },
    { type: 'callout', tone: 'term', title: 'New word: GFS (and today, Colossus)', html: `<strong>What it is:</strong> the Google File System. It joins the disks of thousands of cheap machines into one very large file system. A big file is cut into 64 MB pieces (chunks), and by default every chunk has 3 copies on different machines. One "master" machine remembers where each chunk is (GFS paper, 2003).<br><strong>Why we need it:</strong> the crawled web is petabytes in size. It does not fit on any one disk, and cheap machines (see the photo above) die every day.<br><strong>Without it:</strong> when a disk dies, its data is gone. And every team would have to track by itself which machine holds which file.<br><strong>Today:</strong> according to the Google Cloud blog (2021), GFS has been replaced by its successor, <strong>Colossus</strong>. The idea is the same: many machines, one large reliable storage system.` },
    { type: 'callout', tone: 'term', title: 'New word: Bigtable (and "Webtable")', html: `<strong>What it is:</strong> a very large table-like database at Google, which keeps its files on GFS. Each row has a key, rows are kept sorted by key, and one cell can hold several versions (with timestamps) (Bigtable paper, 2006).<br><strong>Why we need it:</strong> the information about each page (HTML, title, links pointing to it) must be updated <em>one page at a time</em>, whenever that page is crawled again. GFS is good for big files, but it was not built for "change only this one page\'s row".<br><strong>Without it:</strong> when one page changes, you rewrite a whole big file. Index updates would take hours or days, not minutes.<br><strong>Example:</strong> the paper\'s "Webtable": the row key is the reversed URL (<code>com.cnn.www</code>), so that all pages of one site sit close together in sorted order. The <code>contents:</code> column holds several versions of the page, and the <code>anchor:</code> columns hold anchor text from other sites.` },
    { type: 'callout', tone: 'term', title: 'New word: MapReduce', html: `<strong>What it is:</strong> a simple way to run one big batch job on thousands of machines. The programmer writes only two small functions. <strong>Map</strong>: from each input (for example, one page), produce small (key, value) pairs. <strong>Reduce</strong>: collect all values with the same key and make one answer. The system does everything else (splitting the data, choosing machines, re-running the work of a dead machine) (MapReduce paper, 2004).<br><strong>Why we need it:</strong> parsing billions of pages, finding duplicates, counting links: on one machine that is years of work.<br><strong>Without it:</strong> every team would have to write its own code to split work across 1,000 machines and to handle crashes. A lot of difficult, buggy code.<br><strong>Example:</strong> the inverted index itself is a MapReduce. Map: from doc 1 "Cricket score live", produce (cricket, 1), (score, 1), (live, 1). Reduce: collect all docIDs for the key "cricket" into the sorted list [1, 2, 4]. The same thing the widget above built.` },
    { type: 'callout', tone: 'term', title: 'New word: Dedupe and canonical page', html: `<strong>What it is:</strong> dedupe = removing duplicates. The same content can live at several URLs (<code>xyz.com/page</code> and <code>xyz.com/page?ref=fb</code>). According to Google\'s docs, indexing groups similar pages into a cluster and picks the most representative page as the <strong>canonical</strong> one.<br><strong>Why we need it:</strong> indexing the same page 5 times wastes space.<br><strong>Without it:</strong> a bigger index, and the same page shows up 3 times in the results under different URLs.` },
    { type: 'p', html: `According to the 2009 talk, this infrastructure stood on three foundations: <strong>GFS</strong> (big storage), <strong>MapReduce</strong> (easy batch jobs on a thousand machines) and <strong>Bigtable</strong> (updating each document\'s information online, so documents are updated in minutes, not hours). Now look at the whole pipeline together. Click each box to read its job.` },
    { type: 'flow', title: 'Indexing: from the web to the index', height: 320,
      nodes: [
        { id: 'fr', label: 'URL frontier', sub: 'to-do list', x: 80, y: 75, w: 128, kind: 'queue', info: 'What it is: the crawler\'s to-do list of URLs to download, with priorities. Why: this is where we decide which page comes first (a news homepage first, an old page later) and how fast to visit each site. Newly found links come back here.' },
        { id: 'cr', label: 'Crawlers', sub: 'Googlebot', x: 245, y: 75, w: 136, kind: 'server', info: 'What it is: programs that take a URL from the frontier and download the page. According to Google\'s Search Central docs, new pages are found through links on known pages and through sitemaps, and pages are also rendered with a recent Chrome (to run JavaScript). Details: <a href="#/design-crawler">Web crawler lesson</a>.' },
        { id: 'bt', label: 'Bigtable', sub: 'page store (webtable)', x: 425, y: 75, w: 160, kind: 'data', info: 'What it is: a big database with one row per page. The Bigtable paper (2006) example "Webtable": row key = reversed URL (com.cnn.www), so the pages of one site sit close together; the "contents:" column keeps several versions of the page (with timestamps), and the "anchor:" columns keep anchor text from other sites. Bigtable keeps its files on GFS (GFS 2003: 64 MB chunks, 3 copies by default; today Colossus replaces GFS).' },
        { id: 'mr', label: 'MapReduce', sub: 'parse, dedupe, links', x: 625, y: 75, w: 170, kind: 'server', info: 'What it is: batch jobs that run on thousands of machines. The work here: parse HTML, pull out words, group duplicate pages and pick a canonical one, pull out links and anchor text. According to the MapReduce paper (2004), Google rewrote its production indexing system on MapReduce; the code for one phase went from ~3,800 lines of C++ to ~700 lines.' },
        { id: 'pr', label: 'PageRank', sub: 'link signals', x: 610, y: 250, w: 150, kind: 'server', info: 'What it is: a calculation repeated again and again (iterative) over the whole link graph, which gives a number for the importance of each page. Why: one signal to bring good pages to the top out of millions of matches. Try it yourself in the widget below.' },
        { id: 'ix', label: 'Index builder', sub: 'word → docIDs', x: 370, y: 250, w: 160, kind: 'server', info: 'What it is: the job that builds the inverted index. This is the MapReduce paper\'s own example: map emits (word, docID) pairs from each document, reduce sorts the docIDs of each word into a posting list. It also attaches each document\'s signals (PageRank, language, quality).' },
        { id: 'sh', label: 'Index shards', sub: 'by docID, replicated', x: 120, y: 250, w: 180, kind: 'data', info: 'What it is: the pieces of the full index. The index is split by documents: each shard has the complete mini-index of some documents. Each shard has several copies (replicas). Serving machines load them into memory. Why it is split this way is covered in Step 4.' },
      ],
      edges: [{ a: 'fr', b: 'cr' }, { a: 'cr', b: 'bt' }, { a: 'bt', b: 'mr' }, { a: 'mr', b: 'pr' }, { a: 'mr', b: 'ix' }, { a: 'pr', b: 'ix' }, { a: 'ix', b: 'sh' }],
      scenarios: [
        { name: 'New page', steps: [
          { title: 'URL from the frontier', text: 'The frontier gives the crawler the next URL: a new blog post on xyz.com.', go: 'fr>cr', msg: 'next: https://www.xyz.com/blog/caching' },
          { title: 'Crawl and store', text: 'The crawler downloads the page. A new version of the contents (with a timestamp) is written into its row in Bigtable.', go: 'cr>bt', msg: 'row "com.xyz.www/blog/caching"  contents:@t1 = <html>...' },
          { title: 'Process', text: 'MapReduce jobs parse the page: words, title, links, anchor text. The URLs of new links found on the page go back to the frontier, to be crawled.', go: ['bt>mr', 'evt:mr>bt>cr>fr'] },
          { title: 'Signals', text: 'The link graph is updated, and link-based signals like PageRank are computed again.', go: 'mr>pr>ix' },
          { title: 'Into the index', text: 'Words → docID posting lists. This page becomes part of one shard (chosen by docID).', go: ['mr>ix', 'ix>sh'], after: { sh: { state: 'ok', sub: 'new version' } } },
        ]},
        { name: 'Duplicate page', steps: [
          { title: 'Same content, different URL', text: 'xyz.com/page?ref=fb and xyz.com/page have the same content. According to Google\'s docs, indexing groups similar pages into a cluster and picks the most representative one as canonical.', go: 'bt>mr', after: { mr: { state: 'warn', sub: 'duplicate cluster' } } },
          { title: 'Index only the canonical', text: 'The duplicate is not indexed separately: a smaller index, and the same page does not appear twice in the results.', go: 'mr>ix', after: { mr: { state: '', sub: 'parse, dedupe, links' } } },
        ]},
        { name: 'Failure: worker died', steps: [
          { title: 'Machine crash', text: 'In a job that runs on thousands of machines, some machines dying is normal (remember, cheap machines).', set: { mr: { state: 'down', sub: 'worker died' } } },
          { title: 'Task runs again', text: 'According to the MapReduce paper, the master pings the workers again and again; the tasks of a dead worker run again on another machine. The programmer does not have to write this code at all. The job is a little late, but complete.', set: { mr: { state: 'ok', sub: 'task re-run' } }, go: 'mr>ix' },
        ]},
        { name: 'Freshness: batch vs continuous', steps: [
          { title: 'The old way', text: 'According to the 2009 talk, in 1998-99 the index was updated about once a month. According to Google\'s 2010 Caffeine post, even the later system updated its main layer every few weeks, analysing the whole web each time.', set: { sh: { state: 'warn', sub: 'weeks old' } }, focus: ['sh'] },
          { title: 'Caffeine (2010): small pieces, all the time', text: 'Process the web in small pieces and update the index continuously. According to Google, 50% fresher results. A new page reaches the index in minutes.', go: 'fr>cr>bt>mr>ix>sh', after: { sh: { state: 'ok', sub: 'minutes old' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'PageRank: links = votes, but not every vote is equal' },
    { type: 'p', html: `Problem: 10 million pages match "cricket score". All of them contain both words. Which one do we show first? The big idea of the 1998 paper: treat the web\'s <strong>links</strong> as votes. When page B links to page A, B is saying "A is worth a look".` },
    { type: 'callout', tone: 'term', title: 'New word: PageRank', html: `<strong>What it is:</strong> a number for the importance of each page, based on which pages link to it. Two rules: (1) a vote from an important page is worth more, (2) if a page links to 100 places, each of its links is light (its vote is split 100 ways).<br><strong>Why we need it:</strong> matching words is not enough. Millions of pages contain the same words. We need a signal that says which page can be trusted, and that the page cannot write about itself.<br><strong>Without it:</strong> search engines before 1998 mostly just counted words. Any page could write "cricket cricket cricket" 100 times and reach the top.` },
    { type: 'p', html: `The paper\'s formula, in a simple form:` },
    { type: 'code', text: `
PR(A) = (1 - d)/N  +  d × [ PR(T1)/C(T1) + ... + PR(Tn)/C(Tn) ]

T1..Tn  = the pages that link to A
C(T)    = the number of links going out of T
d       = damping factor; paper: "We usually set d to 0.85"
N       = total number of pages` },
    { type: 'callout', tone: 'term', title: 'New word: Random surfer, damping factor', html: `<strong>What it is:</strong> the paper\'s intuition. A user keeps clicking random links (the random surfer). At each step there is an 85% chance they click a link (this 0.85 is the damping factor d), and a 15% chance they get bored and jump to any random page. After a long time, the share of time they spend on each page = its PageRank.<br><strong>Why we need it:</strong> the 15% jump (1 - d) is needed so the surfer does not get "stuck" in a loop or on a page with no links.<br><strong>Without it:</strong> two pages that only link to each other would pull in and keep all the rank, and the calculation would never settle properly. (The paper wrote the formula with (1 - d); here we use the version divided by N, in which all ranks add up to 1.)` },
    { type: 'p', html: `This formula cannot be solved in one go, because the rank of A depends on B and the rank of B depends on A. So we <strong>iterate</strong> (repeat again and again): give everyone the same rank, apply the formula, then apply it again to the new numbers. After some rounds the numbers stop changing (they settle). Try it yourself. A ticked box = the page in that row links to the page in that column:` },
    { type: 'custom', render(el) {
      const names = ['A xyz.com', 'B blog', 'C news', 'D forum', 'E new'], N = 5, d = 0.85;
      const start = [[1, 2], [2], [0], [2, 0], [2]];
      let L, r, it;
      let grid = '<div style="display:grid;grid-template-columns:72px repeat(5,minmax(30px,1fr));gap:4px;align-items:center;font-size:13px;max-width:340px"><span style="font-size:11px;color:var(--ink-3)">from ↓ / to →</span>' + names.map(n => `<strong style="text-align:center">${n[0]}</strong>`).join('');
      for (let i = 0; i < N; i++) { grid += `<span>${names[i]}</span>`; for (let j = 0; j < N; j++) grid += i === j ? '<span style="text-align:center;color:var(--ink-3)">·</span>' : `<input type="checkbox" class="pr-c" data-i="${i}" data-j="${j}" style="justify-self:center;width:18px;height:18px">`; }
      el.innerHTML = grid + `</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button type="button" class="btn small primary pr-1">1 iteration</button><button type="button" class="btn small ghost pr-50">+50 iterations</button><button type="button" class="btn small ghost pr-r">Reset links</button></div>
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
        el.querySelector('.pr-note').textContent = it === 0 ? 'Iteration 0: everyone has the same 0.200. Now press "1 iteration".' : `Iteration ${it}. On top: ${names[top]} (${inc(top)} incoming links). ` + (L.some(l => !l.length) ? 'Some page has no outgoing links (a dead end): its rank is shared equally among all pages, otherwise the surfer would get stuck there.' : 'Pages that no one links to get only the random-jump share: 0.15/5 = 0.030.');
      };
      boxes.forEach(b => { b.checked = start[+b.dataset.i].includes(+b.dataset.j); b.addEventListener('change', restart); });
      el.querySelector('.pr-1').addEventListener('click', () => { step(); show(); });
      el.querySelector('.pr-50').addEventListener('click', () => { for (let k = 0; k < 50; k++) step(); show(); });
      el.querySelector('.pr-r').addEventListener('click', () => { boxes.forEach(b => { b.checked = start[+b.dataset.i].includes(+b.dataset.j); }); restart(); });
      restart();
    }},
    { type: 'p', html: `Try this: (1) Press "+50": C (news) settles at ~0.38 and A at ~0.37. A gets only <em>one</em> link (from C), yet it is far above B, because C itself is important. (2) Now tick C → E and press +50 again: the new page E goes from 0.030 to ~0.21. Reset, then tick D → E: E reaches only ~0.04. One link from an important page is worth more than many links from unimportant pages.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "Google still ranks only by PageRank"', html: `PageRank was one signal in 1998, not the whole ranking. Today Google\'s "How Search works" pages talk about "hundreds of factors": the meaning of the query, relevance, quality (which also looks at whether other prominent sites link to that content: the PageRank idea), usability, and context (location, language). And because of link spam (buying links with money), trusting links alone is dangerous.` },
    { type: 'h2', text: 'Step 4: how do we split the index? By document vs by word' },
    { type: 'p', html: `A 300 TB index will not fit on one machine, so we need <a href="#/sharding">sharding</a>. The question: what do we split by? There are two ways. First, understand them with the 4 pages from above and 2 machines:` },
    { type: 'compare',
      left: { title: 'By document (doc-partitioned)', html: `Machine 1 has the <em>complete</em> mini-index of doc 1 and doc 2:<br><code>cricket → [1, 2]</code>, <code>score → [1]</code>, <code>live → [1]</code>...<br>Machine 2 has the one for doc 3 and doc 4:<br><code>cricket → [4]</code>, <code>score → [4]</code>, <code>news → [3, 4]</code>...<br><br>The query "cricket score" goes to <strong>both</strong> machines. Machine 1 says "doc 1", machine 2 says "doc 4". The server above joins the two answers.` },
      right: { title: 'By word (term-partitioned)', html: `Machine 1 has the words from a to m, for <em>all</em> docs:<br><code>cricket → [1, 2, 4]</code>, <code>live → [1, 3]</code>...<br>Machine 2 has n to z:<br><code>score → [1, 4]</code>, <code>news → [3, 4]</code>...<br><br>For the query "cricket score", get the cricket list from machine 1 and the score list from machine 2. Then bring the <strong>full lists</strong> to one place and intersect them: [1, 4].` },
    },
    { type: 'p', html: `With 4 pages both look fine. The difference shows on the real web, when the list of one word holds billions of docIDs. Jeff Dean\'s 2009 talk compares the two directly:` },
    { type: 'table', head: ['', 'By document (doc-partitioned)', 'By word (term-partitioned)'], rows: [
      ['Each shard holds', 'The complete mini-index of some documents (all words)', 'The posting lists of some words (for all documents)'],
      ['Where the query goes', 'To every shard (scatter-gather)', 'Only to the shards that hold the query words (K words → at most K shards)'],
      ['Network', 'Small: each shard sends only its own top results', 'Very large: big posting lists must be brought to one place and intersected (think of the list for "the")'],
      ['Per-doc info (PageRank, snippet data)', 'Easy: everything about a doc is on one shard', 'Hard: a doc\'s data is scattered'],
      ['Weakness', 'Every query touches every shard: fan-out, tail latency', 'The shard of a popular word gets hot (very busy); the load is uneven'],
    ], caption: 'The conclusion of the 2009 talk: in Google\'s environment, by-document made more sense.' },
    { type: 'p', html: `Feel it with numbers. The widget below assumes 100 billion docs, and also assumes what % of docs contain each word ("the" 60%, "cricket" 0.5%, "score" 2%, "pythagoras" 0.001%, "theorem" 0.01%). For by-word we are smart: send the smaller list to the machine with the bigger list, and assume each docID is only 1 byte after compression. For by-document, each shard sends its top 10 results, 12 bytes per result (docID + score).` },
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
        const rows = [['Machines contacted', S.toLocaleString('en-IN') + ' (all)', w.length + ' (only the word machines)'],
          ['Network data per query', fmt(docNet), fmt(wordNet)],
          ['Local work per shard', Math.round((f[0] + f[1]) * D / S).toLocaleString('en-IN') + ' entries', 'on 1 machine: ' + Math.round(Math.min(...f) * D).toLocaleString('en-IN') + '+ entries'],
          ['Hot spot', 'No, work is spread evenly', 'The "' + hotW + '" machine is busy on every such query']];
        q('.dsp-t').innerHTML = rows.map(r => `<tr>${r.map((c, j) => `<td style="padding:4px;border-bottom:1px solid var(--line);${j ? 'font-family:var(--f-mono)' : ''}">${c}</td>`).join('')}</tr>`).join('');
        el.querySelectorAll('.dsp-q .chip').forEach((b, i) => b.classList.toggle('on', i === qi));
        el.querySelectorAll('.dsp-s .chip').forEach((b, i) => b.classList.toggle('on', i === si));
        const r = wordNet / docNet;
        q('.dsp-note').textContent = r >= 10 ? `By-word had to send ${fmt(wordNet)} over the network, by-document only ${fmt(docNet)}: about ${Math.round(r).toLocaleString('en-IN')} times more. And that is for every query. This is why Google chose by-document, even though every query must go to all ${S.toLocaleString('en-IN')} shards.`
          : `With rare words ("pythagoras theorem") the network cost of by-word is also small (${fmt(wordNet)} vs ${fmt(docNet)}), and it talks to only 2 machines. But web search sees common words all the time, and one design has to work for all queries.`;
      };
      el.querySelectorAll('.dsp-q .chip').forEach(b => b.addEventListener('click', () => { qi = +b.dataset.i; show(); }));
      el.querySelectorAll('.dsp-s .chip').forEach(b => b.addEventListener('click', () => { si = +b.dataset.i; show(); }));
      show();
    }},
    { type: 'p', html: `For "the cricket" with 1,000 shards: by-document sends only 120 KB, by-word sends 500 MB (~4,000 times more). This shows the point of the 2009 talk in numbers. By-document has a different cost: every query touches <em>every</em> shard. That cost is called scatter-gather.` },
    { type: 'callout', tone: 'term', title: 'New word: Scatter-gather', html: `<strong>What it is:</strong> sending one request to many machines at the same time (<strong>scatter</strong> = spread out), then collecting and combining all their answers (<strong>gather</strong> = collect). Like a class teacher asking every group at once "which is your group\'s best project?", then looking at all the answers to pick the top 3 of the whole class.<br><strong>Why we need it:</strong> in a doc-partitioned index, each shard has only some of the docs. The best result can be on any shard, so we must ask all of them. Each shard returns its local top-k (its top k results, for example the top 10) from its own docs, and the server above merges them into the global top-k.<br><strong>Without it:</strong> either you ask only some shards and miss good results, or you pay the heavy network cost of by-word partitioning.` },
    { type: 'p', html: `According to "Web Search for a Planet" (2003), each shard held a <strong>random subset</strong> of documents (random, so that every shard gets an equal amount of work). Each shard had a pool of machines (replicas), and a load balancer (LB) picked one machine from each pool for every query. If a replica goes down, the LB avoids it: a little less capacity, but no part of the index is missing. A query had two phases: (1) a list of ranked docIDs from the <strong>index servers</strong>, (2) the title, URL and query-specific snippet for those docIDs from the <strong>doc servers</strong>.` },
    { type: 'h2', text: 'Step 5: query path (serving)' },
    { type: 'p', html: `Now, what happens when you press search. Together, the machines that do this work are called <strong>query servers</strong>, or the serving system. First, each piece:` },
    { type: 'callout', tone: 'term', title: 'New word: Frontend web server (GWS)', html: `<strong>What it is:</strong> the server your browser talks to directly. At Google it was called the Google Web Server (GWS). According to "Web Search for a Planet" (2003), DNS sent you to a nearby data center, and a load balancer there sent you to one GWS.<br><strong>Why we need it:</strong> someone has to be the "manager" of the whole query: get the spelling fixed, check the cache, ask the index for results, and finally build the HTML page.<br><strong>Without it:</strong> the browser would have to talk to thousands of machines by itself. Impossible.` },
    { type: 'callout', tone: 'term', title: 'New word: Root, parent, leaf servers', html: `<strong>What it is:</strong> machines arranged like a tree. The <strong>root</strong> at the top, <strong>parents</strong> in the middle, <strong>leaves</strong> at the bottom. Each leaf holds one shard of the index in memory. The root gives the query to the parents, and each parent gives it to its leaves. The answers travel back up, getting merged at every level (the 2004 design, from the 2009 talk).<br><strong>Why we need it:</strong> if the root alone talked to 1,000+ leaves directly, its network and CPU would give up. Parents share the work: each parent combines the answers of, say, 30 leaves and sends up only its own top results.<br><strong>Without it:</strong> one machine carries thousands of connections and has to merge thousands of answers.` },
    { type: 'callout', tone: 'term', title: 'New word: Result cache', html: `<strong>What it is:</strong> a memory of ready answers for recent queries. Did someone just search "ipl score"? Its answer is stored, so return it right away. Details: <a href="#/caching">Caching lesson</a>.<br><strong>Why we need it:</strong> people search for the same things again and again. According to the 2009 talk, the hit rate of Google\'s cache servers (the % of queries answered from the cache) was usually 30-60%.<br><strong>Without it:</strong> every query, however popular, would go all the way to thousands of leaves. Many times more machines would be needed.` },
    { type: 'callout', tone: 'term', title: 'New word: Doc servers and snippet', html: `<strong>What it is:</strong> leaves return only docIDs and scores (like "d17, 0.91"). The user needs a title, a URL and a <strong>snippet</strong> (1-2 lines of the page that contain the query words). Doc servers keep copies of the pages, and they produce these from a docID + the query.<br><strong>Why we need it:</strong> the snippet depends on the query, so it cannot be prepared ahead of time. And this work is needed only for the top 10, not for all matches.<br><strong>Without it:</strong> the results would show only numbers, or the leaves would also have to keep whole pages in memory.` },
    { type: 'p', html: `The diagram leaves out the parent layer and shows two leaf shards; in reality there are thousands. Run every scenario, especially the failure ones.` },
    { type: 'flow', title: 'The journey of one query', height: 330,
      nodes: [
        { id: 'gws', label: 'Frontend', sub: 'GWS', x: 80, y: 170, w: 124, kind: 'server', info: 'What it is: the Google Web Server, which the browser talks to. According to "Web Search for a Planet" (2003), DNS sends the user to a nearby cluster, and inside the cluster a hardware load balancer (LB) sends them to one GWS. The GWS coordinates the query (including side calls like spell check and ads) and builds the HTML.' },
        { id: 'cache', label: 'Cache servers', sub: 'results + snippets', x: 262, y: 55, w: 150, kind: 'cache', info: 'What it is: a memory of ready answers for recent queries. According to the 2009 talk, cache servers cached both index results and snippets, with a hit rate of usually 30-60%. Popular queries are often also expensive (common words, many docs), so the cache saves a lot of work.' },
        { id: 'root', label: 'Root', sub: 'scatter + merge', x: 292, y: 170, w: 140, kind: 'server', info: 'What it is: the top server of the serving tree. It sends the query to all leaf shards (parent servers form a tree in between), merges everyone\'s local top results into the global top-k, and runs the final ranking (the more expensive ML) only on these top candidates.' },
        { id: 's1', label: 'Leaf shard 1', sub: 'one part of docs', x: 535, y: 55, w: 150, kind: 'data', info: 'What it is: a leaf server that holds one shard of the index in memory (2009 talk: the index has been served from memory since early 2001). It intersects posting lists within its own docs and returns local top results with cheap scoring. Why: each leaf does only its own part, so all of them finish quickly in parallel.' },
        { id: 's2', label: 'Leaf shard 2', sub: 'replica A', x: 535, y: 150, w: 150, kind: 'data', info: 'What it is: one copy (replica A) of the second shard. Every shard has several replicas (for capacity and for failures).' },
        { id: 's2b', label: 'Shard 2', sub: 'replica B', x: 535, y: 245, w: 150, kind: 'data', hidden: true, info: 'What it is: the second copy of shard 2, with exactly the same data. It takes over for a slow or dead replica.' },
        { id: 'docs', label: 'Doc servers', sub: 'title + snippet', x: 292, y: 285, w: 150, kind: 'server', info: 'What it is: the servers that keep copies of the pages. Give them a docID + the query, and get back the title and a snippet around the query words. These are also sharded by docID and replicated (in both the 2003 paper and the 2009 talk).' },
      ],
      edges: [{ a: 'gws', b: 'cache' }, { a: 'gws', b: 'root' }, { a: 'root', b: 's1' }, { a: 'root', b: 's2' }, { a: 'root', b: 's2b', id: 'rb', hidden: true }, { a: 'root', b: 'docs' }],
      scenarios: [
        { name: 'Cache hit', intro: 'A popular query: someone just asked the same thing.', steps: [
          { title: 'Query arrives', text: 'A user searched "ipl score".', go: 'gws>cache', msg: 'q = "ipl score", lang = hi-IN' },
          { title: 'HIT', text: 'The results + snippets are in the cache. Not one of the thousands of leaf machines was touched.', go: 'res:cache>gws', after: { cache: { state: 'hit' }, root: { state: 'dim' } } },
        ]},
        { name: 'Scatter-gather', steps: [
          { title: 'Cache MISS', text: 'A rare query.', go: ['gws>cache', 'bad:cache>gws'], after: { cache: { state: 'miss' } }, msg: 'q = "caching strategies in simple english"' },
          { title: 'Scatter', text: 'The root sends the query to every shard (in reality to thousands of leaves, through parent servers).', go: ['gws>root'] },
          { title: 'Each shard: local top-k', text: 'Each leaf searches its own docs and sends back its top results (docID, score), not the whole posting list.', parallel: true, go: ['root>s1', 'root>s2'] },
          { title: 'Gather + merge', text: 'The root merges everyone\'s answers into the global top 10, and runs the expensive final ranking only on those.', parallel: true, go: ['res:s1>root', 'res:s2>root'], msg: 'shard1: [(0.91, d17), (0.84, d3)]  shard2: [(0.88, d902), ...]' },
          { title: 'Snippets', text: 'The title and snippet for the top 10 docIDs come from the doc servers.', go: ['root>docs', 'res:docs>root'] },
          { title: 'Answer', text: 'The GWS builds the HTML, and the result also goes into the cache.', go: ['res:root>gws', 'gws>cache'], after: { cache: { state: '' } } },
        ]},
        { name: 'Slow shard: hedged request', steps: [
          { title: 'One replica is stuck', text: 'Replica A of shard 2 is stuck, because of some other job, or a GC pause (the program stopping for a moment to clean up its memory). Everything else is ready, and everyone is waiting for it.', set: { s2: { state: 'hot', sub: 'stuck' } }, parallel: true, go: ['root>s1', 'root>s2'] },
          { title: 'Shard 1 is back', text: 'Shard 1 answered in normal time. No answer from shard 2.', go: 'res:s1>root' },
          { title: 'Hedge: ask the other copy', text: 'After a short wait (say, the shard\'s p95 latency, which is the time in which 95 out of 100 answers arrive), the root sends the same request to replica B too. This is called a hedged request: a backup request. Whichever answers first wins; the other is cancelled.', show: ['s2b', 'rb'], go: ['root>s2b', 'res:s2b>root'], after: { s2b: { state: 'ok' } } },
          { title: 'The benefit', text: 'A Google benchmark in the Tail at Scale paper (2013): when reading 1,000 keys spread over 100 servers, hedging after 10 ms brought the 99.9th percentile from 1,800 ms down to 74 ms, with only 2% extra requests.', set: { s2: { state: 'dim', sub: 'cancelled' } }, focus: ['root'] },
        ]},
        { name: 'Replica down', steps: [
          { title: 'Machine gone', text: 'The machine of replica A of shard 2 died.', set: { s2: { state: 'down', sub: 'DOWN' } }, show: ['s2b', 'rb'] },
          { title: 'LB uses the other copy', text: 'According to the 2003 paper, the LB avoids the dead replica. A little less capacity, but no part of the index is missing. The cluster manager (software that looks after the machines) repairs or replaces the machine.', parallel: true, go: ['root>s1', 'root>s2b'] },
          { title: 'Normal answer', text: 'The user noticed nothing.', parallel: true, go: ['res:s1>root', 'res:s2b>root'] },
        ]},
        { name: 'Query of death: canary', steps: [
          { title: 'A strange query', text: 'A query hits an untested code path that crashes the leaf. If it went straight to thousands of leaves, all of them would go down together.', focus: ['root'], msg: 'q = "<very strange input>"' },
          { title: 'Try one first (canary)', text: 'According to the Tail at Scale paper, some Google IR (information retrieval, which means search) systems first send the query to 1-2 leaves. This is called a canary request: test on a small part first, then on everything. Here the canary leaf crashed.', go: 'root>s1', after: { s1: { state: 'down', sub: 'crashed' } } },
          { title: 'Do not send it to the rest', text: 'The root marks the query as dangerous and does not send it to the other leaves. One machine fell, not the whole cluster. A little extra latency (one extra round trip) buys protection from a big outage.', set: { s2: { state: 'ok', sub: 'saved' } }, go: 'bad:root>gws' },
        ]},
        { name: 'Good enough results', steps: [
          { title: 'One shard is very slow', text: 'Shard 2 and its replica are both slow (say, a network problem).', set: { s2: { state: 'hot', sub: 'very slow' } }, parallel: true, go: ['root>s1', 'lost:root>s2'] },
          { title: 'Answer without it', text: 'Tail at Scale paper: in big search systems, once enough leaves have answered, it is better to return slightly incomplete ("good-enough") results. According to the paper, the chance that one particular leaf holds the best result is less than 1 in 1,000, and important docs are replicated on several leaves.', go: ['res:s1>root', 'res:root>gws'] },
        ]},
      ],
    },

    { type: 'h2', text: 'Deep dive 1: fan-out and tail latency' },
    { type: 'p', html: `The hidden enemy of scatter-gather: the root cannot answer until the <strong>slowest</strong> shard has answered. Like a class group photo: everyone is ready, but if one child is late, the photo is late.` },
    { type: 'callout', tone: 'term', title: 'New word: Tail latency (p50, p99)', html: `<strong>What it is:</strong> line up 100 requests from fastest to slowest. <strong>p50</strong> = the time of the middle (50th) request: "how long it usually takes". <strong>p99</strong> = the time of the 99th request: "how long the worst 1% wait". These bad requests are the "tail", which is why it is called tail latency. Details: <a href="#/latency-throughput">Latency lesson</a>.<br><strong>Why we need it:</strong> the average can look fine while a few users in every 100 wait 1 second. On a site like Google, even 1% is tens of millions of people.<br><strong>Without it (looking only at the average):</strong> you would never see the fan-out problem, because it hides inside the average.` },
    { type: 'callout', tone: 'term', title: 'New word: Hedged request', html: `<strong>What it is:</strong> send the first request to one replica; if it has not answered after a short delay (usually the expected p95 latency, which is the time of the 95th request), send the same request to another replica too. Use whichever answers first, and cancel the rest. It is called "hedge" because it is a backup bet next to the first one.<br><strong>Why we need it:</strong> instead of waiting for a slow replica, get the answer from its copy.<br><strong>Without it:</strong> every slow machine makes the whole query slow.<br>This is only safe when the request is <strong>read-only/idempotent</strong>, which means running it twice does no harm (a search query is like that). The paper also gives a variant, <strong>tied requests</strong>: send to both replicas, and whichever starts the work first cancels the other.` },
    { type: 'p', html: `First, one query, 8 shards, and one slow shard. Click any shard to make it the slow one, and try three ways: (1) wait for everyone, (2) hedge, (3) <strong>good-enough</strong>: set a time limit (timeout), and answer with the results of the shards that arrived by then.` },
    { type: 'custom', render(el) {
      const A = [12, 9, 15, 11, 8, 13, 10, 14], B = [10, 12, 9, 13, 11, 8, 12, 10], SLOW = 900, HD = 20, TO = 50, MERGE = 2;
      const MODES = ['Wait for everyone', 'Hedge (replica B after 20 ms)', 'Good-enough (50 ms timeout)'];
      let slow = 4, mode = 0;
      el.innerHTML = `<div class="dsg-m" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div>
        <div class="dsg-rows" style="display:grid;gap:5px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0"><button type="button" class="btn small ghost dsg-none">No slow shard</button></div>
        <div class="stats"><div class="stat"><span>Total query time</span><strong class="dsg-t"></strong></div><div class="stat"><span>Extra requests</span><strong class="dsg-x"></strong></div><div class="stat"><span>Docs searched</span><strong class="dsg-c"></strong></div></div>
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
          const tag = mode === 1 && r.lat[i] > HD ? ` (hedge: B ${B[i]} ms)` : mode === 2 && !r.used[i] ? ' (skipped)' : '';
          const col = i === slow ? 'var(--red)' : 'var(--accent)';
          return `<button type="button" data-i="${i}" style="display:flex;gap:8px;align-items:center;font-size:12.5px;background:none;border:0;padding:0;color:var(--ink);cursor:pointer;text-align:left;width:100%"><span style="flex:0 0 58px">Shard ${i + 1}</span><span style="flex:1;background:var(--surface-2);border-radius:4px;height:12px;position:relative"><span style="position:absolute;left:0;top:0;bottom:0;width:${Math.min(100, x / scale * 100).toFixed(1)}%;border-radius:4px;background:${col};opacity:${mode === 2 && !r.used[i] ? 0.35 : 1}"></span></span><span style="flex:0 0 120px;font-family:var(--f-mono)">${x} ms${tag}</span></button>`;
        }).join('');
        el.querySelectorAll('.dsg-rows button').forEach(b => b.addEventListener('click', () => { slow = +b.dataset.i; show(); }));
        const n = r.used.filter(Boolean).length;
        q('.dsg-t').textContent = r.finish + ' ms';
        q('.dsg-x').textContent = r.extra + ' of 8 (' + (r.extra / 8 * 100).toFixed(1) + '%)';
        q('.dsg-c').textContent = (n / 8 * 100).toFixed(1) + '%';
        q('.dsg-note').textContent = slow < 0 ? `No shard is slow: the query takes ${r.finish} ms (slowest normal shard 15 ms + merge 2 ms). All three ways are the same here.`
          : mode === 0 ? `7 shards answered within 15 ms, but the root kept waiting for the ${SLOW} ms shard. Total = slowest shard + merge = ${r.finish} ms. Without the slow shard this query takes 17 ms; one slow shard made the whole query about 50 times slower.`
          : mode === 1 ? `No answer within 20 ms, so the root asked the same question to the other copy of shard ${slow + 1} (replica B) as well. B answered in ${B[slow]} ms, so the total is ${HD} + ${B[slow]} + ${MERGE} (merge) = ${r.finish} ms. Cost: only 1 extra request, and the results are complete.`
          : `The root waited 50 ms and answered with the shards that had arrived: ${r.finish} ms. Cost: the docs of shard ${slow + 1} (${(100 / 8).toFixed(1)}%) were not searched at all for this query.`;
      };
      el.querySelectorAll('.dsg-m .chip').forEach(b => b.addEventListener('click', () => { mode = +b.dataset.i; show(); }));
      q('.dsg-none').addEventListener('click', () => { slow = -1; show(); });
      show();
    }},
    { type: 'p', html: `The real Google has thousands of shards, not 8. Even if each leaf is "99% fast", out of a thousand leaves some leaf will almost always be slow. Now try it at a bigger scale. Each leaf normally takes ~5-20 ms, but sometimes (a GC pause, the disk, another job running on the same machine) it takes 1 second:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Shards (fan-out N): <strong class="ta-nv"></strong></label><input class="ta-n" type="range" min="0" max="6" value="2"></div>
          <div><label>How often one leaf takes 1 s</label><select class="ta-p"><option value="0.01">1 in 100</option><option value="0.001">1 in 1,000</option><option value="0.0001">1 in 10,000</option></select></div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0"><button type="button" class="chip ta-h">Hedged requests: OFF</button></div>
        <div class="stats">
          <div class="stat"><span>Queries that take &gt;500 ms</span><strong class="ta-slow"></strong></div>
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
        q('.ta-f').textContent = (f * 100).toFixed(1) + '%' + (hedge ? ' (without hedging)' : '');
        q('.ta-p99').textContent = pc(0.5).toFixed(0) + ' / ' + pc(0.99).toFixed(0) + ' ms';
        q('.ta-x').textContent = hedge ? '+' + (extra / (Q * N) * 100).toFixed(1) + '%' : '0%';
        q('.ta-h').textContent = 'Hedged requests: ' + (hedge ? 'ON (after 14 ms)' : 'OFF');
        q('.ta-h').classList.toggle('on', hedge);
        q('.ta-note').textContent = hedge
          ? (slow < 0.02 ? `If a leaf has not answered within 14 ms (~p95 of a normal leaf), its request also goes to another replica. Both copies being slow at the same time is very rare, so slow queries almost disappear, at a cost of only ~5-6% extra requests.` : `Hedging helped a lot (from ${(f * 100).toFixed(0)}% to ${(slow * 100).toFixed(1)}%), but with such a large fan-out, both copies being slow (~p² per leaf) also happens again and again. More tricks are needed here: good-enough results, tied requests, and finding and fixing the cause of slow machines.`)
          : `${N.toLocaleString('en-IN')} shards, each slow only ${(p * 100).toFixed(2)}% of the time: still ${(slow * 100).toFixed(1)}% of queries are slow. The bigger the fan-out, the worse it gets. (The simulation runs ${Q} queries with a fixed seed, so it gives the same result every time.)`;
      };
      q('.ta-n').addEventListener('input', run); q('.ta-p').addEventListener('input', run);
      q('.ta-h').addEventListener('click', () => { hedge = !hedge; run(); });
      run();
    }},

    { type: 'p', html: `At the default setting (100 shards, 1 in 100) ~62% of queries are slow, and the formula says 63.4%. This is the same example as in the 2013 paper "The Tail at Scale" by Dean and Barroso: if each of 100 servers is slow 1% of the time, 63% of user requests take more than 1 second. And with "1 in 10,000" and 2,000 shards: ~1 in 5 queries are slow, and the paper also says "almost one in five". Turn hedging ON: slow queries drop to ~0-1%, at a cost of only ~5% extra requests.` },
    { type: 'callout', tone: 'mistake', title: 'Beginner mistake: "send every request to two places, and the tail is gone"', html: `If you send every request to two places right away, the load doubles, and more load itself makes latency worse. The trick is to send the second request only when the first is <em>already slow</em> (after p95), so only ~5% of requests are doubled. And hedging does not fix the slow machine: you still need monitoring to find the cause (GC, a noisy neighbour, which means another heavy job running on the same machine, a bad disk).` },
    { type: 'p', html: `Other tricks from the Tail at Scale paper that apply directly to search: <strong>micro-partitions</strong> (many more partitions than machines, so load can be moved in small pieces), <strong>selective replication</strong> (according to the paper, Google\'s web search kept extra copies of popular and important documents in several partitions), <strong>canary requests</strong> and <strong>good-enough</strong> results (both in the diagram above).` },
    { type: 'h2', text: 'Deep dive 2: ranking, cheap first, expensive later' },
    { type: 'callout', tone: 'term', title: 'New word: Ranking and ranking signal', html: `<strong>What it is:</strong> ranking = putting the matching pages in "most useful first" order. Each page gets a score. The things the score is made from are called <strong>signals</strong>: how well the words match (like the <a href="#/search">BM25</a> score), how important the page is (PageRank), how new the page is, whether it works on mobile.<br><strong>Why we need it:</strong> users mostly look only at the first 10 results. Picking the right 10 out of millions of matches is the real product.<br><strong>Without it:</strong> results in any order: the first link is an old forum post from 2009, and the real answer is on page 40.` },
    { type: 'p', html: `Problem: each shard can have millions of matching docs. Running a heavy <strong>ML model</strong> (a big formula learned from data that gives a score, but is expensive to run) on all of them is impossible. So ranking works like a <strong>funnel</strong> (wide at the top, narrow at the bottom): many docs come in at the top, fewer survive each stage, and the expensive work happens only on the last few docs. This is the general industry approach; the exact details of Google\'s stages are not public. With assumed numbers:` },
    { type: 'code', text: `
Stage 1  each leaf: intersect posting lists    → 10,000 matches per leaf  (cheap score: BM25 + PageRank)
Stage 2  each leaf: local top-k                → sends top 100 per leaf
Stage 3  root (through parents) merges         → 1,000 leaves × 100 = 100,000 → top 1,000
Stage 4  root: expensive ML re-rank            → only on 1,000 docs
Stage 5  final page                            → top 10 + snippets (from the doc servers)

(These numbers are assumptions. The point: the expensive model ran on 1,000 docs, not on 10 million.)` },
    { type: 'steps', items: [
      { t: 'Retrieval (on the leaf)', d: 'Intersect the posting lists and use cheap scoring (a text match like BM25 + static quality, which means the page\'s own quality independent of the query, such as PageRank). The 1998 paper also had a limit: the searcher stopped after finding 40,000 matching docs, to keep the response time bounded.' },
      { t: 'Local top-k', d: 'Each leaf sends only its top few hundred. A benefit of numbering docs by quality when giving docIDs (2009 talk: "better docs get smaller docIDs"): good docs come early in the posting list and are found quickly.' },
      { t: 'Merge + re-rank (on the root)', d: 'More expensive signals and ML models on thousands of candidates.' },
      { t: 'Final page', d: 'Diversity (not 10 results from the same site), snippets, a freshness boost if the query is news-like.' },
    ]},
    { type: 'p', html: `Modern signals (for awareness only): Google\'s "How Search works" pages list the big ranking factors: the <strong>meaning</strong> of the query (spelling, synonyms), <strong>relevance</strong> (keywords + aggregated, anonymised interaction data), <strong>quality</strong> (expertise, authoritativeness, trustworthiness; also links from other prominent sites), <strong>usability</strong> (mobile friendly, speed) and <strong>context</strong> (location, language, settings). According to a 2022 Google blog post, there are also AI systems: RankBrain (2015, the first deep learning system), neural matching (2018), BERT (2019, in both ranking and retrieval). And according to Google, hundreds of thousands of experiments run every year to improve ranking.` },

    { type: 'h2', text: 'Deep dive 3: caching and freshness' },
    { type: 'callout', tone: 'term', title: 'New word: Freshness', html: `<strong>What it is:</strong> when a page changes or a new page appears, how long it takes to show up in search results. The shorter the time, the "fresher" the index.<br><strong>Why we need it:</strong> for "ipl score" or "today\'s news", yesterday\'s answer is useless. But the answer for "pythagoras theorem" does not change for years.<br><strong>Without it:</strong> if the whole index were built once a month (as it was in 1998-99), you would find nothing about today\'s match, today\'s news, or a new product.` },
    { type: 'p', html: `Caching and freshness pull in opposite directions: the longer you keep the cache, the older the answer may be. How Google handled both (according to the 2009 talk and the 2010 blog post):` },
    { type: 'list', items: [
      '<strong>Result cache</strong>: according to the 2009 talk, a hit rate of 30-60%, depending on the query mix, personalization (different results for each user) and how often the index is updated. The benefit: for a query answered from the cache, thousands of leaves did no work at all. There is also a warning: after an index update or a cache flush there is a big latency spike and a drop in capacity (a cold cache), so flush slowly.',
      '<strong>Pair cache</strong> (1999-2000 era): computing ahead of time the intersection of the posting lists of words that often come together ("new" + "york").',
      '<strong>Index in memory</strong>: as replicas grew, the total RAM became big enough to hold the whole index in memory (early 2001). Both throughput (queries per second) and the tail got better, but now every query touched thousands of machines, and a "query of death" could bring them all down at once.',
      '<strong>Tiers for freshness</strong> (separate layers): according to the 2009 talk, there were several retrieval systems: one for sub-second updates (fewer docs), and one for many more docs but with daily updates. A query asks both and merges. In "Universal Search" (2007), a super root combined results from separate indexes such as web, news, images and video.',
      '<strong>Caffeine (2010)</strong>: according to Google, 50% fresher results; hundreds of thousands of pages processed in parallel every second; ~100 million GB of storage in one database. An online store like Bigtable made it possible to update per-document information in minutes.',
      '<strong>Crawl freshness</strong>: according to Google\'s docs, crawlers learn how often a page changes and come back accordingly. A news site every few minutes, an old Wikipedia article less often.',
    ]},
    { type: 'callout', tone: 'warn', html: `Another difficulty for the cache: results are personal and location-based (the answer to "cricket academy near me" is different in Delhi and in Pune). The cache key includes parts like language/region, and the more personalization, the lower the hit rate. That is why the talk said the hit rate depends on "the level of personalization".` },
    { type: 'p', html: `Autocomplete is a separate system (prefix → top suggestions, tries + precomputed top-k): see the <a href="#/design-typeahead">Search autocomplete lesson</a>. Spell correction is also a separate service that runs with the query (in the 2003 paper\'s diagram, the spell checker is a separate box next to the GWS).` },

    { type: 'h2', text: 'Failures and bottlenecks' },
    { type: 'table', head: ['What happened', 'Effect', 'Protection (source)'], rows: [
      ['One leaf replica is slow', 'The tail of every query gets worse', 'Hedged/tied requests (Tail at Scale, 2013)'],
      ['One replica is down', 'Less capacity for that shard', 'LB uses another replica; the cluster manager (software that looks after the machines) replaces it (2003 paper)'],
      ['Query of death', 'Thousands of leaves crash together', 'Canary requests (Tail at Scale, 2013)'],
      ['One shard did not answer', 'Results slightly incomplete', 'Good-enough results + extra copies of important docs (2013)'],
      ['Index update / cache flush', 'Cold cache: latency spike, capacity drop', 'Slow rollout, cache warm-up (2009 talk)'],
      ['Bit errors and crashes on machines (indexing)', 'Corrupt or incomplete index', 'Checksums (a small fingerprint of the data that catches corruption), MapReduce task re-execution (2009 talk, 2004 paper)'],
      ['The index kept growing', 'Every shard gets slower', 'More shards + compression (2009 talk: a block format made the index ~30% smaller) + index in memory'],
    ]},

    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Separate the two pipelines', d: 'Offline indexing (crawl → store → parse/dedupe/links → PageRank → inverted index build) and online serving (cache → root → leaves → merge → snippets).' },
      { t: 'Decide the partitioning', d: 'By document: each shard is independent, little network, per-doc data is easy; the cost: every query goes to every shard (fan-out).' },
      { t: 'The tail of fan-out', d: '1-(1-p)^N; hedged/tied requests, canaries, good-enough results, replicas.' },
      { t: 'Ranking funnel', d: 'Cheap on the leaf (BM25 + static quality), expensive ML on the root; PageRank is one signal, not the whole ranking.' },
      { t: 'Cache + freshness', d: 'Result cache (30-60% hits, 2009), tiers: a small real-time index + a big daily index, incremental indexing (updating only the changed parts instead of rebuilding everything; Caffeine 2010).' },
      { t: 'Be honest', d: '"This is based on papers from 2003-2013; Google\'s system today has moved on (Colossus instead of GFS, models like BERT)."' },
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Index bigger than one machine?</strong> Partition by document, replicate every shard, scatter-gather the query. <strong>Large fan-out?</strong> Treat tail latency as a first-class problem: hedge (only on idempotent reads), good-enough results with timeouts. <strong>Ranking expensive?</strong> Funnel: cheap retrieval on everything, expensive ML only on the top candidates. <strong>Need freshness?</strong> Incremental updates + a small real-time tier instead of batch rebuilds.` },
    { type: 'diagram', title: 'Google Search: the whole picture', height: 700,
      caption: 'The top part runs all the time in the background; the bottom part runs for every query. What connects them: the index shards. This is a simplified picture based on public papers from 1998-2013.',
      groups: [
        { label: 'Crawl & index (background, always on)', x: 8, y: 8, w: 704, h: 322 },
        { label: 'Search query (every query, ~0.2 s)', x: 24, y: 345, w: 688, h: 347 },
      ],
      nodes: [
        { id: 'fr', label: 'URL frontier', sub: 'what to crawl', x: 90, y: 72, w: 140, kind: 'queue', info: 'The crawler\'s to-do list: which URLs to download next, with what priority, and how fast to visit each site. Newly found links come here.' },
        { id: 'cr', label: 'Googlebot', sub: 'crawlers', x: 300, y: 72, w: 130, kind: 'server', info: 'Programs that download pages. They take a URL from the frontier, fetch the page (rendering it with Chrome when needed), and store it in Bigtable.' },
        { id: 'web', label: 'The web', sub: 'websites, sitemaps', x: 580, y: 72, w: 170, kind: 'net', info: 'Websites all over the world. Not part of Google: the crawler asks them for pages. With a sitemap file, a website can say which pages it has.' },
        { id: 'gfs', label: 'GFS → Colossus', sub: 'files, 3 copies', x: 90, y: 180, w: 140, kind: 'data', info: 'One big file system made from the disks of thousands of machines (GFS paper 2003: 64 MB chunks, 3 copies by default). According to the Google Cloud blog (2021), Colossus replaces it today.' },
        { id: 'bt', label: 'Bigtable', sub: 'webtable: each page', x: 300, y: 180, w: 160, kind: 'data', info: 'A big database with one row per page (Bigtable paper 2006). The row key is the reversed URL, with several versions of the page and its anchor text. It lets one page\'s information be updated in minutes. Its files live on GFS.' },
        { id: 'mr', label: 'MapReduce', sub: 'parse, dedupe, links', x: 560, y: 180, w: 170, kind: 'server', info: 'Batch jobs on thousands of machines (MapReduce paper 2004): pull words and links out of HTML, remove duplicate pages and pick the canonical one. The work of a dead machine runs again by itself.' },
        { id: 'ib', label: 'Index builder', sub: 'word → docIDs', x: 300, y: 280, w: 160, kind: 'server', info: 'Builds the inverted index: for each word, the sorted list of docIDs that contain it. Each doc\'s signals (PageRank, language, quality) come along too. It splits the index into shards by docID and hands them to the leaves.' },
        { id: 'pr', label: 'PageRank', sub: 'link signals', x: 560, y: 280, w: 150, kind: 'server', info: 'An iterative calculation over the link graph: a link from an important page is worth more. One of many ranking signals (the big idea of the 1998 paper).' },
        { id: 'user', label: 'User', sub: 'browser / app', x: 100, y: 410, w: 120, kind: 'client', info: 'You. You send a query ("cricket score") and get back a page with 10 results. DNS sends you to a nearby Google data center.' },
        { id: 'gws', label: 'Frontend (GWS)', sub: 'spell, parse, HTML', x: 335, y: 410, w: 160, kind: 'server', info: 'The manager of the query: gets the spelling fixed, checks the cache first, asks the root for results on a miss, and finally builds the HTML page.' },
        { id: 'cache', label: 'Result cache', sub: '30-60% hits (2009)', x: 575, y: 410, w: 160, kind: 'cache', info: 'Ready answers for recent queries. According to the 2009 talk, the hit rate was 30-60%. On a hit, thousands of leaves are not touched at all. Personalization and freshness lower its hit rate.' },
        { id: 'root', label: 'Root + parents', sub: 'scatter, merge, rank', x: 335, y: 520, w: 170, kind: 'server', info: 'The top part of the serving tree. It sends the query to all leaves (scatter), combines their local top results (gather), and runs the expensive ML re-rank only on the top candidates. It hedges for slow leaves and uses canaries against crashing queries.' },
        { id: 'docs', label: 'Doc servers', sub: 'title + snippet', x: 575, y: 520, w: 160, kind: 'server', info: 'For the top 10 docIDs, they produce the title, URL and a snippet with the query words. These are also sharded by docID and replicated.' },
        { id: 'l1', label: 'Leaf shard 1', sub: 'replicas A, B', x: 200, y: 630, w: 150, kind: 'data', info: 'One shard of the index in memory, with several copies (replicas). It intersects posting lists within its own docs, applies a cheap score, and sends back its local top-k.' },
        { id: 'l2', label: 'Leaf shard N', sub: '...thousands', x: 460, y: 630, w: 150, kind: 'data', info: 'The other shards. In reality thousands, each with a random part of the docs. Every query goes to every shard, so the slowest shard decides the time of the whole query.' },
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
        { name: 'Crawl & index', text: 'Frontier → Googlebot fetches the page → Bigtable (files on GFS/Colossus) → MapReduce parses, dedupes, extracts links (new links go back to the frontier) → PageRank → index builder → shards loaded onto the leaves.', go: ['fr>cr>web', 'cr>bt>mr>pr>ib', 'mr>ib', 'bt>gfs', 'mr>fr', 'ib>l1'] },
        { name: 'Search query', text: '1 query reaches the GWS → 2 check the cache → 3 on a miss, go to the root → 4 the root scatters to all leaves, gathers the local top-k, merges + ML re-rank → 5 snippets from the doc servers → page goes to the user (and into the cache).', go: ['user>gws>cache', 'gws>root>l1', 'root>l2', 'root>docs'] },
        { name: 'Cache hit', text: 'A popular query: the GWS found a ready answer in the cache. The root and thousands of leaves did no work.', go: ['user>gws>cache'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Search = two separate pipelines: <strong>crawl + index</strong> in the background, and <strong>serve</strong> for every query.</li>
      <li>Inverted index: word → a posting list of docIDs. A query = intersecting the lists + ranking.</li>
      <li>The foundations of indexing (2003-2006 papers): GFS (today Colossus) for storage, Bigtable for per-page rows, MapReduce for batch jobs.</li>
      <li>Split the index <strong>by document</strong>: little network, independent shards; the cost: every query goes to every shard (scatter-gather).</li>
      <li>The enemy of fan-out is tail latency: 1-(1-p)^N. The cures: replicas, hedged/tied requests, good-enough results, canaries.</li>
      <li>Ranking funnel: a cheap score on the leaf (BM25 + PageRank), expensive ML on the root only for the top candidates.</li>
      <li>The result cache (30-60% hits, 2009) saves a lot of work; for freshness, incremental indexing (Caffeine 2010) and a small real-time tier.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Doc-partitioning: independent shards, little network, easy to add more', 'Replicas: both capacity and failure tolerance', 'Hedged requests: much lower tail latency, only ~5% extra load', 'Result cache: 30-60% of queries without touching the leaves (2009)', 'Ranking funnel: heavy ML only on a few candidates', 'Incremental indexing: fresh results in minutes'],
      costs: ['Every query touches every shard: thousands of machines, tail risk', 'Index in memory: a very big RAM bill', 'Hedging adds a little extra load; safe only for idempotent requests', 'Good-enough results: sometimes the best result is missed', 'A cold start after a cache flush; personalization lowers the hit rate', 'Incremental index: global signals like PageRank need an online approximation (2009 talk)'],
    },
    { type: 'think', questions: [
      { q: 'If the index had been sharded by word, what would happen to a query like "the cricket"?', a: 'The posting list for "the" covers almost every document: it is huge. It would have to be sent from one shard to another to intersect with the "cricket" list: a lot of network. And the "the" shard would be hot on every query. With doc-partitioning, each shard does this intersection locally for its own docs and sends only its top results.' },
      { q: 'Why should a hedged request not be used on a payment API, but is fine for search?', a: 'With hedging, the same request may run twice. A search query is read-only: running it twice costs only a little extra CPU. A payment running twice could take the money twice. Use it on write requests only when there is protection like an <a href="#/pagination-idempotency">idempotency key</a>.' },
      { q: 'Should the result cache TTL (how long a cached answer counts as valid) be long or short?', a: 'A long TTL = more hits, but old results (bad for news queries). A short one = fresh, but more load on the leaves. In practice: set it by query type (a short TTL for trending, news-like queries, a long one for "pythagoras theorem"), and invalidate the affected entries when the index updates. Also be careful: never flush the whole cache at once, or you get a cold-cache spike.' },
    ]},

    { type: 'quiz', questions: [
      { q: 'An inverted index has cricket → [1, 2, 4] and score → [1, 4]. What is the answer to the query "cricket score"?', options: ['[1, 2, 4]', '[1, 4]', '[1, 2, 4, 1, 4]', '[2]'], answer: 1, explain: 'We need docs that have both words, so we take the intersection of the two lists: the docIDs that are in both, which are 1 and 4. This is what happened in the widget above.' },
      { q: 'According to the 2009 talk, how did Google find it better to shard the index?', options: ['By word: each shard holds some words', 'By document: each shard holds the complete index of some docs', 'By user location', 'No sharding, one big machine'], answer: 1, explain: 'By doc: shards process queries independently, network traffic is small, per-doc info is easy. The cost: every query goes to every shard.' },
      { q: 'Each leaf is slow 1% of the time, and a query goes to 100 leaves. How many queries are slow?', options: ['~1%', '~10%', '~63%', '100%'], answer: 2, explain: '1 - 0.99^100 ≈ 0.634. The exact example from the Tail at Scale paper.' },
      { q: 'When is a hedged request sent?', options: ['Right away with every request', 'When the first request has not answered after about the expected p95 time', 'Only when a server is down', 'On a cache miss'], answer: 1, explain: 'By waiting a little before hedging, only the slow requests (≈5%) are doubled, so the load grows very little.' },
      { q: 'In PageRank, page A gets one link from a very important page. What happens?', options: ['Nothing, only the number of links matters', 'A\'s rank goes up a lot, because the vote of an important page is heavy', 'A\'s rank goes down', 'Only the anchor text changes'], answer: 1, explain: 'The weight of a vote = the PageRank of the linking page ÷ its number of outgoing links. In the widget, C → E moved E from 0.03 to ~0.21.' },
      { q: 'What problem does a "canary request" prevent?', options: ['A slow shard', 'A strange query that crashes all leaf servers at once', 'A cache miss', 'Spelling mistakes'], answer: 1, explain: 'Try 1-2 leaves first; if they crash or hang, the query is never sent to the other thousands.' },
    ]},
    { type: 'sources', note: 'The internal design of today\'s Google Search is not fully public. This lesson is based on these papers/talks (with their years) and Google\'s official pages; points described as the "general approach" are industry practice.', items: [
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
