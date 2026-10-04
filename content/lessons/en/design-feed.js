Lesson.register({
  id: 'design-feed',
  title: 'Instagram / Twitter feed',
  minutes: 45,
  summary: `When you open the app, you should see the latest posts of the people you follow: within 200 ms, for 20 crore users. And when a celebrity with 10 crore followers posts, the system must not fall over. We will build a feed from zero: building the feed list in advance (push) or while reading (pull), a mix of both (hybrid), caches, ranking and a cursor for scrolling.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Open Instagram and you get a long list of posts from top to bottom: your friends' photos, a creator's video. Was this list made in advance, or is it being made right now? If the app had to find and join the posts of a hundred people every time, it would be slow. If every post had to update the lists of crores of people, one celebrity post would shake the whole system. In this lesson we will see when and how a feed is built, how the "good" posts come to the top, and how the next posts arrive while scrolling without repeating any.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper for 10 minutes: Riya follows 300 people. When she opens the app, she should see their latest posts. When will you build this list: when someone posts, or when Riya opens the app? And what if someone has 10 crore followers? Then compare with this lesson.` },
    { type: 'p', html: `In the previous lesson (<a href="#/design-whatsapp">WhatsApp</a>) we saw group fan-out: one message, a hundred or a thousand phones. A feed is the big brother of that problem: one post, <strong>crores</strong> of followers. And a feed adds a new twist: users want the most <em>interesting</em> posts at the top, not only the latest. This lesson is based on Twitter's "Timelines at Scale" talk (2013), the recommendation algorithm Twitter open-sourced in 2023, and posts from Instagram/Meta.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• A user posts (text, photo, video)<br>• Follow / unfollow<br>• Home feed: posts from the people you follow, in newest-first or ranked order<br>• Keep scrolling, and older posts load (pagination)<br><br><strong>Out of scope:</strong> comments, DMs, search, ads, Explore/Reels recommendations (we will only look at the idea of ranking)` },
      right: { title: 'Non-functional', html: `• The feed loads fast: ~200 ms<br>• Very read-heavy: people post little and scroll a lot<br>• A slightly old feed is fine: a new post may appear a few seconds late (<strong>eventual consistency</strong>)<br>• Even a celebrity's post must not bring the system down<br>• High availability: an empty feed is also bad` },
    },
    { type: 'callout', tone: 'term', title: 'New word: eventual consistency', html: `<strong>What it is:</strong> "in the end, everything will be correct". When Aman posts, the post does not appear in Riya's feed at once, but it surely arrives within a few seconds.<br><strong>Why we need it:</strong> updating crores of feeds at the same instant is very expensive. A small delay is fine.<br><strong>Without it:</strong> every post would have to lock and update all feeds together: a very slow system. Details in the <a href="#/consistency">Consistency</a> lesson.` },

    { type: 'h2', text: 'Step 2: feed basics, from zero' },
    { type: 'p', html: `Before drawing any diagram, let us understand the small parts. We are building a photo-sharing app on xyz.com.` },
    { type: 'h3', text: '2a. Feed, timeline and follower graph' },
    { type: 'callout', tone: 'term', title: 'New words: home feed, user timeline', html: `<strong>Home feed:</strong> <strong>What it is:</strong> the list of posts you see when you open the app, from all the people you follow. <strong>Why we need it:</strong> it is the main page of the app, the page opened most often.<br><strong>User timeline:</strong> <strong>What it is:</strong> all the posts of one person, newest first (their profile). <strong>Why we need it:</strong> a home feed is really a mix of these user timelines.<br><strong>Without it:</strong> the user would have to open every friend's profile one by one.` },
    { type: 'callout', tone: 'term', title: 'New word: follower graph', html: `<strong>What it is:</strong> the list of "who follows whom", like "riya → aman" (Riya follows Aman). It answers two questions: "whom does Riya follow?" and "who are Aman's followers?".<br><strong>Why we need it:</strong> to build a feed, we must know whose posts to show to whom.<br><strong>Without it:</strong> there can be no feed at all.<br><strong>Careful:</strong> this graph is not even. Most people have a few hundred followers, but some accounts have crores. Like the picture below: a few big circles (many connections), the rest small.` },
    { type: 'image', src: 'assets/img/design-feed/social-graph.jpg', maxWidth: 560, alt: 'A social network graph: hundreds of small circles (people) with thin lines between them, and a few big circles in the middle with very many connections', caption: 'The graph of a real social network (people of the League of Nations, from a research project). Each circle is a person, each line a relationship. The big circles in the middle are "hubs" with many connections. In a feed, these hubs are the celebrities, and they will become the biggest problem.', credit: { text: 'Martin Grandjean, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Social_Network_Analysis_Visualization.png', license: 'CC BY-SA 3.0' } },
    { type: 'h3', text: '2b. When do we build the feed? Two roads' },
    { type: 'p', html: `Riya follows Aman, Dev and a film star. Riya's feed = the posts of these three, newest first. This list can be built at two moments: when Riya opens the feed (while reading), or when someone posts (while writing).` },
    { type: 'callout', tone: 'term', title: 'New word: fan-out', html: `<strong>What it is:</strong> taking one post to many followers. From one to many, like the air from a fan.<br><strong>Fan-out on read (pull):</strong> write the post only into the author's timeline. When Riya opens her feed, read everyone's timelines at that moment and join them.<br><strong>Fan-out on write (push):</strong> as soon as a post is made, put its ID into every follower's own ready list. When Riya opens her feed, she just reads her list.<br><strong>Why this matters:</strong> the work happens either at posting time or at reading time. Which moment is cheaper is the real question of feed design.` },
    { type: 'callout', tone: 'term', title: 'New word: feed cache (Redis list)', html: `<strong>What it is:</strong> a ready list for each user, in memory (like Redis), holding only post IDs, newest first: <code>feed:riya = [907, 905, 880, ...]</code>.<br><strong>Why we need it:</strong> with push, the feed is already built; reading it is one list read, in milliseconds.<br><strong>Without it:</strong> every feed open would have to find and join a hundred timelines.<br><strong>Why "cache":</strong> it is not the real data; the real posts are in the database. If the list is lost, it can be built again.` },
    { type: 'callout', tone: 'term', title: 'New word: celebrity problem', html: `<strong>What it is:</strong> with push, one post = as many writes as there are followers. For a normal user (200 followers), 200 small writes is no problem. But one post from a star with 10 crore followers = 10 crore writes.<br><strong>Why it matters:</strong> one such post jams the queue for minutes, and everyone else's posts are late too.<br><strong>The fix (details later):</strong> <em>hybrid</em>: push for normal users, pull for celebrities.` },
    { type: 'p', html: `Try it on a tiny xyz.com. Riya follows Aman, Dev and Star. Change the mode, make people post, and count how many writes each post caused and how much work Riya's feed open needed:` },
    { type: 'custom', render(el) {
      const FOL = { Aman: ['Riya', 'Zoya'], Dev: ['Riya', 'Kabir', 'Meera'], Star: ['Riya', 'Zoya', 'Kabir', 'Meera'] };
      const READERS = ['Riya', 'Zoya', 'Kabir', 'Meera'], RIYA_FOLLOWS = ['Aman', 'Dev', 'Star'];
      let mode, next, tl, lists, wTot, log, shown;
      const reset = () => { next = 901; tl = { Aman: [], Dev: [], Star: [] }; lists = {}; READERS.forEach(r => lists[r] = []); wTot = 0; log = ['Start: no posts.']; shown = null; };
      el.innerHTML = `<div class="chips fdm-mode" style="padding:0"><button type="button" class="chip on" data-m="push">Push (on write)</button><button type="button" class="chip" data-m="pull">Pull (on read)</button><button type="button" class="chip" data-m="hyb">Hybrid</button></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
          <button type="button" class="btn small" data-a="Aman">Aman posts (2 followers)</button>
          <button type="button" class="btn small" data-a="Dev">Dev posts (3 followers)</button>
          <button type="button" class="btn small" data-a="Star">Star posts (celebrity)</button>
          <button type="button" class="btn small primary fdm-open">Riya opens feed</button>
          <button type="button" class="btn small ghost fdm-reset">Reset</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px" class="fdm-boxes"></div>
        <div class="stats"><div class="stat"><span>Writes caused by posts so far</span><strong class="fdm-w"></strong></div><div class="stat"><span>Reads for Riya's feed open</span><strong class="fdm-r"></strong></div></div>
        <div class="calc-note fdm-log" style="max-height:140px;overflow:auto"></div>`;
      const q = s => el.querySelector(s);
      const pushes = a => mode === 'push' || (mode === 'hyb' && a !== 'Star');
      const draw = () => {
        const box = (t, items, note) => `<div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px;background:var(--surface-2)"><strong style="font-size:14px">${t}</strong><div style="font-family:var(--f-mono);font-size:13px;margin-top:4px;word-break:break-word">${items.length ? items.join(', ') : '<span style="color:var(--ink-3)">' + (note || 'empty') + '</span>'}</div></div>`;
        q('.fdm-boxes').innerHTML = Object.keys(tl).map(a => box(`Timeline: ${a}`, tl[a].map(x => x.id))).join('') +
          READERS.map(r => box(`feed:${r.toLowerCase()} (list)`, lists[r].map(x => x.id), mode === 'pull' ? 'pull: no list is built' : 'empty')).join('') +
          box('What Riya sees', shown ? shown.map(x => x.a + ' ' + x.id) : [], 'feed not opened yet');
        q('.fdm-w').textContent = wTot;
        q('.fdm-r').textContent = shown ? shown.reads : '-';
        q('.fdm-log').innerHTML = log.slice(-5).map(x => '• ' + x).join('<br>');
      };
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        const a = b.dataset.a, p = { a, id: next++ };
        tl[a].unshift(p); let w = 1;
        if (pushes(a)) { FOL[a].forEach(r => lists[r].unshift(p)); w += FOL[a].length; }
        wTot += w;
        log.push(`${a} made post ${p.id}: ${w} write${w > 1 ? 's' : ''} (1 own timeline${pushes(a) ? ' + ' + FOL[a].length + ' follower lists' : ', follower lists not touched'}).${a === 'Star' && pushes(a) ? ' In the real world this would be 10 crore writes!' : ''}`);
        draw();
      });
      q('.fdm-open').onclick = () => {
        let items, reads;
        if (mode === 'push') { items = lists.Riya.slice(); reads = 1; }
        else if (mode === 'pull') { items = RIYA_FOLLOWS.flatMap(a => tl[a]); reads = RIYA_FOLLOWS.length; }
        else { items = lists.Riya.concat(tl.Star); reads = 2; }
        items = items.sort((x, y) => y.id - x.id).slice(0, 6);
        shown = items; shown.reads = reads;
        log.push(mode === 'push' ? 'Riya: read only her ready list (1 read). The cheapest.' : mode === 'pull' ? `Riya: read ${RIYA_FOLLOWS.length} timelines and merged them. In the real world, 300 follows = 300 reads, on every feed open.` : 'Riya: her own list (Aman\'s and Dev\'s posts) + Star\'s timeline = 2 reads, then merge.');
        draw();
      };
      el.querySelectorAll('.fdm-mode .chip').forEach(c => c.onclick = () => { el.querySelectorAll('.fdm-mode .chip').forEach(x => x.classList.toggle('on', x === c)); mode = c.dataset.m; reset(); log = [`Mode: ${c.textContent}. Everything reset.`]; draw(); });
      q('.fdm-reset').onclick = () => { reset(); draw(); };
      mode = 'push'; reset(); draw();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Push is always best, because reading is cheap." Only while followers are few. With push, one post from Star causes as many writes as Star has followers. And "pull is always best, because writing is cheap" is also wrong: every feed open reads a hundred timelines, and reads are 50 times more than writes. That is why real systems run a <strong>hybrid</strong>.` },
    { type: 'h2', text: 'Step 3: napkin maths' },
    { type: 'p', html: `The roadmap's worked example: 200M daily users, each user posts 2 times and views 100 posts per day. Change the numbers and see (these are assumed numbers):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="fd-dau">Daily active users (millions)</label><input id="fd-dau" type="number" value="200" min="1" step="1"></div>
          <div><label for="fd-ppd">Posts per user per day</label><input id="fd-ppd" type="number" value="2" min="0.1" step="0.1"></div>
          <div><label for="fd-vpd">Posts viewed per user per day</label><input id="fd-vpd" type="number" value="100" min="1" step="1"></div>
          <div><label for="fd-fol">Average followers</label><input id="fd-fol" type="number" value="200" min="1" step="1"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Post writes/s (avg)</span><strong class="o-w"></strong></div>
          <div class="stat"><span>Feed reads/s (avg)</span><strong class="o-r"></strong></div>
          <div class="stat"><span>Read : write</span><strong class="o-rw"></strong></div>
          <div class="stat"><span>Fan-out writes/s (push)</span><strong class="o-fo"></strong></div>
          <div class="stat"><span>Text data per day</span><strong class="o-tx"></strong></div>
          <div class="stat"><span>Media per day (10% × 500 KB)</span><strong class="o-md"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const v = id => Math.max(0.1, Number(el.querySelector('#' + id).value) || 0.1);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n.toFixed(0);
      const sz = b => b >= 1e12 ? (b / 1e12).toFixed(1) + ' TB' : (b / 1e9).toFixed(0) + ' GB';
      const upd = () => {
        const dau = v('fd-dau') * 1e6, ppd = v('fd-ppd'), vpd = v('fd-vpd'), fol = v('fd-fol');
        const posts = dau * ppd, w = posts / 1e5, r = dau * vpd / 1e5;
        el.querySelector('.o-w').textContent = f(w) + '/s (peak ~' + f(w * 3) + ')';
        el.querySelector('.o-r').textContent = f(r) + '/s (peak ~' + f(r * 3) + ')';
        el.querySelector('.o-rw').textContent = Math.round(r / w) + ' : 1';
        el.querySelector('.o-fo').textContent = f(w * fol) + '/s';
        el.querySelector('.o-tx').textContent = sz(posts * 1e3);
        el.querySelector('.o-md').textContent = sz(posts * 0.1 * 5e5);
        el.querySelector('.o-note').textContent = `Assumptions: one day ≈ 10^5 s, peak ≈ 3× average, one post's text + metadata ≈ 1 KB. Conclusion: reads are ${Math.round(r / w)} times the writes, so building the feed in advance (precompute) and caching it is wise. But if we write every post into every follower's list, that is ${f(w * fol)} writes/s: the average follower count decides how expensive "push" is.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},

    { type: 'h2', text: 'Step 4: API and data model' },
    { type: 'p', html: `Three jobs: posting, following, and reading the feed. The feed does not come all at once; it comes in pieces (pages) of 20. With every answer, the server gives a <em>cursor</em>: a bookmark that says "seen up to here". When asking for the next page, the app sends that bookmark back. The full story of the cursor is in the "cursor pagination" deep dive below.` },
    { type: 'code', text: `
POST /posts                      body: { text, media_ids[] }      → 201 { post_id }
POST /users/{id}/follow
GET  /feed?limit=20              → { posts: [...], next_cursor: "1719…:9f2" }
GET  /feed?limit=20&cursor=1719…:9f2   → the next (older) 20` },
    { type: 'table', head: ['Entity', 'Fields', 'Where'], rows: [
      ['Post', 'post_id (time-ordered), author_id, text, media URLs, created_at', 'Sharded DB (Instagram: sharded PostgreSQL, 2012); media blob store + CDN'],
      ['Follow', 'follower_id, followee_id, created_at', 'Graph store / sharded table, indexes for both directions (Twitter 2013: Flock)'],
      ['Feed (timeline)', 'user_id → [post_id, post_id, ...] newest first', 'Redis list, IDs only, length capped'],
      ['User', 'user_id, name, avatar, follower_count, is_celebrity', 'Sharded DB + cache'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: hydration', html: `<strong>What it is:</strong> the feed cache holds only post IDs (8 bytes each), not whole posts. Turning those IDs into whole posts (text, photo URL, author name, like count) before showing the feed is called <strong>hydration</strong>, like adding water to a dry seed to grow a whole plant.<br><strong>Why we need it:</strong> when a post is edited or deleted, change it in one place, not in crores of feeds. And the lists stay small.<br><strong>Without it:</strong> every feed list would hold copies of whole posts: 100 times the memory, and one edit would mean changes in crores of places.` },

    { type: 'h2', text: 'Step 5: the simplest design, and why it breaks' },
    { type: 'p', html: `First idea: when Riya opens her feed, ask the database:` },
    { type: 'code', text: `
SELECT p.* FROM posts p
JOIN follows f ON f.followee_id = p.author_id
WHERE f.follower_id = 'riya'
ORDER BY p.created_at DESC
LIMIT 20;` },
    { type: 'p', html: `On a small xyz.com this works. But think: Riya follows 300 people. This query finds the posts of 300 authors (which sit on different shards, because posts are sharded by author), merges and sorts them, and this work happens <strong>on every feed open</strong>, 2 lakh times per second. The same work again and again, and each time on many shards (scatter-gather: ask many shards, then collect). This is called <strong>fan-out on read</strong> (or pull): the feed is built while reading.` },
    { type: 'p', html: `Reads are 50 times more common. So think the other way: build the feed <strong>while writing</strong>. Keep a ready list for Riya; whenever someone Riya follows makes a post, put its post_id into Riya's list. Reading the feed is now one simple list read. This is <strong>fan-out on write</strong> (or push).` },

    { type: 'h2', text: 'Step 6: fan-out on write (push)' },
    { type: 'p', html: `In the 2013 "Timelines at Scale" talk, Twitter (VP Engineering Raffi Krikorian) explained that its home timeline was built this way: each user's timeline was a list in a Redis cluster, holding only tweet IDs (and a little info), each list copied on three machines, with at most ~800 entries per list. The numbers then: ~150M active users, ~300k QPS of timeline reads (requests every second), ~5k tweets/s on average. This information is 10+ years old and today's X system has changed, but the core idea is still the standard interview answer.` },
    { type: 'flow', title: 'Fan-out on write', height: 330,
      nodes: [
        { id: 'a', label: 'Aman (posts)', x: 75, y: 80, w: 120, kind: 'client', info: 'What it is: the user who posts (Aman\'s phone). He has followers; his post_id must go into every follower\'s feed list.' },
        { id: 'post', label: 'Post service', x: 255, y: 80, w: 140, kind: 'server', info: 'What it is: the post service. It saves the new post (with a time-ordered post_id), tells Aman "posted" at once, and puts the fan-out work into a queue. Why: Aman should not wait for the fan-out to finish.' },
        { id: 'pdb', label: 'Post DB', sub: 'sharded', x: 455, y: 50, w: 130, kind: 'data', info: 'What it is: the Post DB, the real home of posts (source of truth), split across many shards by author_id or post_id. Photos and videos are not here but in a blob store + CDN; only their URLs are here.' },
        { id: 'fo', label: 'Fan-out workers', sub: 'queue + workers', x: 255, y: 220, w: 150, kind: 'queue', info: 'What it is: a queue (a line of jobs) and its workers (background programs). They pick "Aman posted" from the queue, fetch Aman\'s followers, and put the post_id into each follower\'s Redis list. Instagram said in 2011 that feed fan-out was done by workers of the Gearman task queue.' },
        { id: 'graph', label: 'Follower graph', sub: 'who follows Aman', x: 470, y: 175, w: 140, kind: 'data', info: 'What it is: the follower graph, the store of "who follows whom". Fan-out needs "Aman\'s followers", and reads need "whom does Riya follow". At Twitter (2013) this was a service called Flock.' },
        { id: 'redis', label: 'Feed cache', sub: 'Redis lists', x: 470, y: 285, w: 140, kind: 'cache', info: 'What it is: the feed cache, one Redis list per user holding the latest post_ids. LPUSH (add to the front of the list) puts a new ID at the front, LTRIM (cut the list) caps its length (Twitter 2013: ~800). Only IDs, so little memory. Several copies (replicas), so feeds do not vanish when one node falls over.' },
        { id: 'r', label: 'Riya (reads)', x: 640, y: 180, w: 120, kind: 'client', info: 'What it is: Riya\'s phone, reading the feed. Her list is already built: one read, a few milliseconds. (In reality a feed service sits in between and does hydration and ranking; see the Step 8 diagram.)' },
      ],
      edges: [{ a: 'a', b: 'post' }, { a: 'post', b: 'pdb' }, { a: 'post', b: 'fo' }, { a: 'fo', b: 'graph' }, { a: 'fo', b: 'redis' }, { a: 'r', b: 'redis' }],
      scenarios: [
        { name: 'Normal post', steps: [
          { title: 'Aman posts', go: ['a>post>pdb', 'res:pdb>post', 'res:post>a'], text: 'The post is saved and gets a post_id. Aman sees "posted" at once. No feed has been updated yet.', msg: 'POST /posts → 201 { post_id: 1719000000123 }' },
          { title: 'Fan-out job into the queue', go: 'evt:post>fo', text: 'Async: an event "post 1719000000123 by aman". This work happens in the background.' },
          { title: 'Who are the followers?', go: ['fo>graph', 'res:graph>fo'], text: 'Aman has 200 followers. Twitter (2013) fanned out only to users active in the last 30 days; for the others, the feed was built at login.', msg: 'followers(aman) → [riya, zoya, ... 200]' },
          { title: 'Put it into every follower\'s list', go: 'fo>redis', text: '200 small writes. Each one: add the ID at the front of the list, then cut off the old ones.', msg: 'LPUSH feed:riya 1719000000123\nLTRIM feed:riya 0 799', after: { redis: { state: 'ok', sub: '+200 writes' } } },
          { title: 'Riya opens her feed', go: ['r>redis', 'res:redis>r'], text: 'One list read, already sorted. This is the gain of push: reading is very cheap.', msg: 'LRANGE feed:riya 0 19', after: { r: { state: 'ok', sub: 'feed in ~ms' } } },
        ]},
        { name: 'Celebrity post (push only)', intro: 'Now a celebrity with 10 crore followers posts.', steps: [
          { title: 'Save the post: normal', go: ['a>post>pdb', 'evt:post>fo'], set: { a: { label: 'Celebrity', sub: '100M followers' } }, text: 'Up to here, everything is the same.' },
          { title: '10 crore writes', flood: { paths: ['fo>redis'], n: 14 }, text: 'One post = 100M Redis writes. A summary of Twitter\'s 2013 talk says fan-out for big accounts sometimes took up to ~5 minutes, while the target was ~5 seconds.', after: { fo: { state: 'hot', sub: 'backlog: minutes' }, redis: { state: 'hot', sub: 'write storm' } } },
          { title: 'Side effects', go: 'r>redis', text: 'Meanwhile, everyone else\'s normal posts are stuck in the same queue. And a strange bug: if another celebrity replies to this post, some followers may see the reply <em>before</em> the original (Twitter described this race). Plus memory: the same ID in 10 crore lists.', after: { r: { state: 'warn', sub: 'post late' } } },
        ]},
        { name: 'Feed cache node lost', steps: [
          { title: 'Redis node down', set: { redis: { state: 'down', sub: 'node lost' } }, go: ['r>redis', 'bad:redis>r'], text: 'The node that held Riya\'s list has fallen over.' },
          { title: 'Replica or rebuild', text: 'First protection: a replica (Twitter: every list on 3 machines). If that is gone too, the feed service rebuilds the feed in pull mode: whom Riya follows (graph) + their latest posts (Post DB) + merge. Slow, but correct. So treat the feed cache as a <strong>cache</strong>, not the source of truth.', focus: ['graph', 'pdb'], after: { redis: { state: 'warn', sub: 'rebuilding' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Keep whole posts in the feed cache, and the hydration hassle is gone." Then, when a post is edited or deleted, you must find and change it in 10 crore lists, and memory becomes 100 times bigger. Keep <strong>only IDs</strong> in the feed list; the post content lives in one place (post cache/DB). A deleted post is filtered out during hydration.` },
    { type: 'h2', text: 'Step 7: push vs pull vs hybrid, feel it yourself' },
    { type: 'p', html: `Move the followers slider from 10 to 10 crore, and see how the cost of the three methods changes. <strong>Hybrid</strong> means: normal accounts use push, but "celebrity" accounts get no fan-out; their posts are joined in while the feed is read (pull). Use the celebrity toggle to make this account a celebrity:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="fd-f">Followers of this account: <strong class="o-fv"></strong></label><input id="fd-f" type="range" min="0" max="70" step="1" value="20"></div>
          <div><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" class="fd-celeb"> Treat as celebrity (skip fan-out in hybrid)</label></div>
        </div>
        <div style="overflow-x:auto"><table class="fd-t" style="width:100%;border-collapse:collapse;font-size:14px;margin-top:10px"></table></div>
        <div class="calc-note o-note"></div>
        <div class="calc-note">Assumptions: a typical follower follows 300 accounts, 5 of them celebrities; each follower opens the feed 10 times a day; the fan-out workers can do ~10 lakh (1M) writes/s for this post; one feed entry = 8-byte ID × 3 replicas.</div>`;
      const g = s => el.querySelector(s);
      const K = 300, C = 5, R = 10, RATE = 1e6;
      const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n));
      const tm = s => s === 0 ? 'instant (on read)' : s < 1 ? '< 1 s' : s < 120 ? s.toFixed(0) + ' s' : (s / 60).toFixed(1) + ' min';
      const mem = b => b === 0 ? '0' : b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : b >= 1e3 ? (b / 1e3).toFixed(1) + ' KB' : b + ' B';
      const cell = (t, hi) => `<td style="padding:6px 8px;border-top:1px solid var(--line);${hi ? 'color:var(--red);font-weight:600' : ''}">${t}</td>`;
      const upd = () => {
        const F = Math.round(Math.pow(10, 1 + Number(g('#fd-f').value) / 10)), celeb = g('.fd-celeb').checked;
        g('.o-fv').textContent = fmt(F);
        const push = { w: F, d: F / RATE, m: F * 24, o: '1 list read', a: 0 };
        const pull = { w: 1, d: 0, m: 0, o: K + ' lookups + merge', a: F * R };
        const hyb = celeb ? { w: 1, d: 0, m: 0, o: `1 list read + ${C} celeb lookups`, a: F * R } : { w: F, d: F / RATE, m: F * 24, o: `1 list read + ${C} celeb lookups`, a: 0 };
        const rows = [
          ['Writes per post', x => fmt(x.w), x => x.w >= 1e6],
          ['Until the last follower', x => tm(x.d), x => x.d >= 60],
          ['Feed cache memory (this post)', x => mem(x.m), x => x.m >= 1e9],
          ['Work per feed open', x => x.o, x => x.o.startsWith(String(K))],
          ['Reads of this account\'s timeline/day', x => fmt(x.a), x => x.a >= 1e8],
        ];
        g('.fd-t').innerHTML = `<tr><th style="text-align:left;padding:6px 8px"></th><th style="text-align:left;padding:6px 8px">Push</th><th style="text-align:left;padding:6px 8px">Pull</th><th style="text-align:left;padding:6px 8px">Hybrid</th></tr>` +
          rows.map(([l, f, bad]) => `<tr><td style="padding:6px 8px;border-top:1px solid var(--line);color:var(--ink-2)">${l}</td>${[push, pull, hyb].map(x => cell(f(x), bad(x))).join('')}</tr>`).join('');
        let note;
        if (F >= 1e6 && !celeb) note = `${fmt(F)} followers and celebrity OFF: hybrid is still doing push, ${fmt(F)} writes and a delay of ~${tm(F / RATE)}. Turn the toggle ON: 1 write, zero delay. In return, this account's posts will be read ${fmt(F * R)} times a day, so make them a hot cache key and replicate it.`;
        else if (F < 1e5 && celeb) note = `Making an account with only ${fmt(F)} followers a celebrity saves only ${fmt(F)} writes, but every follower pays one extra lookup on every feed open. For small accounts, push is cheaper.`;
        else if (celeb) note = `Celebrity ON: only 1 write per post. While reading the feed, the latest posts of the follower's ${C} celebrities are merged into their list. No 300-lookup pain of pull, no write storm of push: that is why most systems use a hybrid.`;
        else note = `Normal account: push is cheap (${fmt(F)} writes, ${tm(F / RATE)}), and every feed open is just 1 list read. With pull, every feed open needs ${K} lookups: reads are 50× more common, so this gets expensive.`;
        g('.o-note').textContent = note;
      };
      g('#fd-f').addEventListener('input', upd); g('.fd-celeb').addEventListener('change', upd); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Decide', html: `The roadmap rule: <strong>Push (fan-out on write)</strong> for normal users with few followers. <strong>Pull (fan-out on read)</strong> for celebrities with crores of followers. <strong>Most systems use a hybrid.</strong> Tune the threshold (for example 1 lakh or 10 lakh followers) by looking at data. Do not fan out to inactive users (who have not come for months); build their feed with pull when they log in.` },

    { type: 'h2', text: 'Step 8: hybrid read path' },
    { type: 'p', html: `Now look at the whole road for reading the feed. The summary of Twitter's 2013 talk points in the same direction: for accounts with many followers, merge at read time instead of fanning out at write time. In the middle sits a <strong>feed service</strong> that joins everything. One new part also appears: the <strong>ranker</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: ranker (ML model)', html: `<strong>What it is:</strong> a service that gives every post a number (a score): "how much will Riya like this post". The score comes from an <em>ML model</em>: a program that learns patterns from old data (who liked what) and makes a guess.<br><strong>Why we need it:</strong> with only "newest first", important posts from friends get buried.<br><strong>Without it:</strong> the feed is only in time order; it works, but it is less interesting. That is why time order is the fallback when the ranker is slow.` },
    { type: 'callout', tone: 'term', title: 'New word: hot key', html: `<strong>What it is:</strong> a cache key that a huge number of people read at the same time, like a celebrity's timeline.<br><strong>Why it is a problem:</strong> one key lives on one cache server; crores of reads overheat (overload) that one server.<br><strong>The fix:</strong> several copies of that key (replicas), and a small 1-2 second cache in the feed service's own memory. Details in <a href="#/caching-strategies">Caching strategies</a>.` },
    { type: 'flow', title: 'Riya opens her feed (hybrid)', height: 320,
      nodes: [
        { id: 'r', label: 'Riya (app)', x: 75, y: 165, w: 120, kind: 'client', info: 'What it is: Riya\'s phone. When the app opens, it sends GET /feed?limit=20. When she scrolls, it asks for the next page with the cursor (bookmark).' },
        { id: 'fs', label: 'Feed service', sub: 'merge + hydrate', x: 270, y: 165, w: 140, kind: 'server', info: 'What it is: the feed service, the part that "joins" the feed. It merges Riya\'s ready list + celebrities\' posts, gets the order from the ranker, turns IDs into whole posts (hydration), and makes the cursor. It is stateless, so we can run many copies.' },
        { id: 'redis', label: 'Feed cache', sub: 'filled by push', x: 500, y: 40, w: 140, kind: 'cache', info: 'What it is: Riya\'s ready list in the feed cache: post IDs from normal accounts, filled by fan-out on write (push).' },
        { id: 'graph', label: 'Following', sub: 'celebs Riya follows', x: 500, y: 120, w: 140, kind: 'data', info: 'What it is: part of the follower graph: which celebrities Riya follows. Why: they had no fan-out, so their posts must be joined in at read time. This list is small and gets cached.' },
        { id: 'celeb', label: 'Celeb timelines', sub: 'hot, replicated', x: 500, y: 200, w: 140, kind: 'cache', info: 'What it is: each celebrity\'s own timeline (latest post IDs) in the cache. Crores of people read them, so they are hot keys: several replicas, plus a local cache of a few seconds in the feed service\'s own memory.' },
        { id: 'pcache', label: 'Post cache', sub: 'hydration', x: 500, y: 280, w: 140, kind: 'cache', info: 'What it is: the post cache, post_id → whole post (text, photo CDN URL, author, counts). Hydration happens here. If it is not in the cache (a miss), read from the Post DB. A deleted post is caught here.' },
        { id: 'rank', label: 'Ranker', sub: 'ML scores', x: 270, y: 285, w: 130, kind: 'server', info: 'What it is: the ranker (the service with the ML model). It gives each candidate post a score: a guess (probability) that Riya will like, comment or share. If it is slow, it times out, and the feed service falls back to time order.' },
      ],
      edges: [{ a: 'r', b: 'fs' }, { a: 'fs', b: 'redis' }, { a: 'fs', b: 'graph' }, { a: 'fs', b: 'celeb' }, { a: 'fs', b: 'pcache' }, { a: 'fs', b: 'rank' }],
      scenarios: [
        { name: 'Hybrid feed load', steps: [
          { title: 'Request', go: 'r>fs', text: 'Riya opened the app.', msg: 'GET /feed?limit=20' },
          { title: 'Precomputed list', go: ['fs>redis', 'res:redis>fs'], text: 'Posts from normal accounts are already in the list. One read.', msg: 'LRANGE feed:riya 0 199' },
          { title: 'Add the celebrities', parallel: true, go: ['fs>graph', 'fs>celeb'], text: 'Riya follows 5 celebrities. Take the latest IDs from their timelines (5 small reads, in parallel).' },
          { title: 'Merge + rank', go: ['res:celeb>fs', 'fs>rank', 'res:rank>fs'], text: 'Merging both lists gives the candidates. The ranker scores every candidate, and the top 20 are chosen.' },
          { title: 'Hydrate + send', go: ['fs>pcache', 'res:pcache>fs', 'res:fs>r'], text: '20 IDs → whole posts (media URLs point to the CDN). Plus a next_cursor.', msg: '{ posts: [...20], next_cursor: "1719000000123" }', after: { r: { state: 'ok', sub: 'feed ready' } } },
        ]},
        { name: 'Ranker slow', intro: 'The ML model\'s server is overloaded.', steps: [
          { title: 'Candidates ready', go: ['r>fs', 'fs>redis', 'res:redis>fs'], text: 'The list has arrived.' },
          { title: 'Ranker timeout', go: ['fs>rank', 'lost:rank>fs'], set: { rank: { state: 'down', sub: 'timeout 80ms' } }, text: 'The ranker did not answer in time.' },
          { title: 'Graceful degradation', go: ['fs>pcache', 'res:pcache>fs', 'res:fs>r'], text: 'Better than an empty screen: send the feed in time order (newest first). The user got a slightly less "smart" feed, but got one. This is called <a href="#/resilience">graceful degradation</a>.', after: { r: { state: 'warn', sub: 'chronological' } } },
        ]},
        { name: 'Celebrity viral post', intro: 'A celebrity posted, and crores of followers open the app at the same time.', steps: [
          { title: 'Everyone reads the same key', flood: { paths: ['r>fs>celeb'], n: 12 }, text: 'Every feed load reads that celebrity\'s timeline: a <strong>hot key</strong>.', after: { celeb: { state: 'hot', sub: 'hot key' } } },
          { title: 'Protection', go: ['fs>celeb', 'res:celeb>fs'], text: 'Keep the hot key on several replicas, and cache it for 1-2 seconds in the feed service\'s local memory: each feed-service instance asks the cache for that key only once. (See the <a href="#/caching-strategies">Hot keys</a> lesson.)', after: { celeb: { state: 'ok', sub: 'replicas + local' } } },
        ]},
        { name: 'Deleted post / unfollow', steps: [
          { title: 'Old IDs in the list', go: ['r>fs', 'fs>redis', 'res:redis>fs'], text: 'Aman deleted a post, and Riya unfollowed Kabir. But Riya\'s list still holds both IDs.' },
          { title: 'Filter on read', go: ['fs>pcache', 'bad:pcache>fs', 'fs>graph', 'res:graph>fs'], text: 'During hydration, the deleted post has no record: drop it. Kabir\'s post: drop it after the following check. A background job cleans the list later. Do not try to update crores of lists at once.', after: { r: { state: 'ok', sub: 'filtered' } } },
        ]},
      ],
    },
    { type: 'h3', text: 'How big is the feed cache?' },
    { type: 'p', html: `Napkin maths: 200M users × 800 IDs × 8 bytes ≈ <strong>1.3 TB</strong>, × 3 replicas ≈ <strong>3.8 TB</strong> of RAM (Redis overhead extra). That does not fit on one machine, so shard it in a Redis Cluster by user_id (<a href="#/consistent-hashing">consistent hashing</a>). That is why list length is capped (if someone scrolls past 800 posts, fetch the rest with pull), and lists for inactive users are not kept at all.` },
    { type: 'h2', text: 'Deep dive: ranking (awareness level)' },
    { type: 'p', html: `When Instagram launched in 2010, the feed was in plain time order. According to a 2021 post by the head of Instagram, by 2016 people were missing ~70% of the posts in their feed, including almost half of the posts from people close to them. So they started to <strong>rank</strong> the feed: for each post, guess how much you will interact with it, and order by that.` },
    { type: 'callout', tone: 'term', title: 'New words: candidate generation, ranking', html: `<strong>Candidate generation (retrieval):</strong> <strong>What it is:</strong> quickly picking a few hundred or a few thousand "maybe interesting" posts out of crores (a cheap, rough filter).<br><strong>Ranking:</strong> <strong>What it is:</strong> scoring those candidates with a heavy ML model (expensive, so only on a few posts).<br><strong>Why both:</strong> running the heavy model on crores of posts is impossible; the cheap filter alone does not give a good enough order. So we use a <strong>funnel</strong>: fewer posts at every stage, a heavier model.<br><strong>Without it:</strong> either the feed is slow, or the order is poor.` },
    { type: 'steps', items: [
      { t: 'Candidate sourcing', d: 'According to Twitter\'s 2023 open-source blog, "For You" pulled ~1,500 candidates per request, about half from accounts you follow (in-network, from the Earlybird search index) and half from outside (out-of-network: from the graph and embeddings, which are lists of numbers that describe what a post or user is about). In Instagram Feed, candidates are mainly recent posts from followed accounts.' },
      { t: 'Light ranking', d: 'A small, fast model sorts the candidates first. In Meta\'s 2023 Explore post, the first stage is also a light model that learns from the bigger model.' },
      { t: 'Heavy ranking', d: 'Twitter: a neural network with ~48M parameters that predicts, for each tweet, the probabilities of engagements like a like, retweet or reply. Instagram (2021 post): a guess whether you will stop on the post for a few seconds, comment, like, reshare or tap the profile.' },
      { t: 'Filters + mixing', d: 'Remove blocked/muted accounts and deleted or policy-breaking posts, avoid too many posts in a row from one author (diversity), then mix in ads and suggestions. At Twitter, the Home Mixer service did this.' },
    ]},
    { type: 'p', html: `According to Twitter's 2023 blog, this whole pipeline ran ~5 billion times a day, in under 1.5 seconds on average. Try a toy version of ranking yourself (the posts and probabilities are made up):` },
    { type: 'custom', render(el) {
      const P = [
        { n: 'Aman: beach photo', age: 0.5, l: 0.10, c: 0.01, s: 0.00 },
        { n: 'Zoya: exam result!', age: 5, l: 0.60, c: 0.35, s: 0.05 },
        { n: 'Celebrity: movie trailer', age: 2, l: 0.35, c: 0.02, s: 0.20 },
        { n: 'Kabir: coding meme', age: 1, l: 0.45, c: 0.05, s: 0.25 },
        { n: 'xyz.com Tech: blog post', age: 12, l: 0.08, c: 0.01, s: 0.03 },
        { n: 'Cousin: wedding photo', age: 20, l: 0.70, c: 0.25, s: 0.02 },
      ];
      el.innerHTML = `<div class="row2">
          <div><label for="fd-wl">Like weight: <strong class="o-wl"></strong></label><input id="fd-wl" type="range" min="0" max="10" step="1" value="1"></div>
          <div><label for="fd-wc">Comment weight: <strong class="o-wc"></strong></label><input id="fd-wc" type="range" min="0" max="10" step="1" value="5"></div>
          <div><label for="fd-ws">Share weight: <strong class="o-ws"></strong></label><input id="fd-ws" type="range" min="0" max="10" step="1" value="3"></div>
          <div><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" class="fd-dec" checked> Lower the score of older posts (recency)</label></div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:10px">
          <div><strong>Time order (newest first)</strong><ol class="fd-chr" style="margin:6px 0 0 18px;color:var(--ink-2)"></ol></div>
          <div><strong>Ranked (score)</strong><ol class="fd-rk" style="margin:6px 0 0 18px"></ol></div>
        </div>
        <div class="calc-note">score = like_weight × P(like) + comment_weight × P(comment) + share_weight × P(share); with recency ON, × 1/(1 + age_hours/6). Real systems have dozens of predictions and thousands of signals; the idea is the same.</div>`;
      const g = s => el.querySelector(s);
      const upd = () => {
        const wl = +g('#fd-wl').value, wc = +g('#fd-wc').value, ws = +g('#fd-ws').value, dec = g('.fd-dec').checked;
        g('.o-wl').textContent = wl; g('.o-wc').textContent = wc; g('.o-ws').textContent = ws;
        const sc = P.map(p => ({ ...p, sc: (wl * p.l + wc * p.c + ws * p.s) * (dec ? 1 / (1 + p.age / 6) : 1) }));
        g('.fd-chr').innerHTML = [...P].sort((a, b) => a.age - b.age).map(p => `<li>${p.n} <span style="color:var(--ink-3)">(${p.age} h)</span></li>`).join('');
        g('.fd-rk').innerHTML = [...sc].sort((a, b) => b.sc - a.sc || a.age - b.age).map(p => `<li>${p.n} <span style="color:var(--ink-3);font-family:var(--f-mono)">${p.sc.toFixed(2)}</span></li>`).join('');
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', upd)); upd();
    }},
    { type: 'p', html: `Play with it: by default, Zoya's exam result is at the top, while in time order it was fourth (comments have a high weight). Set the share weight to 10 and the comment weight to 0: the meme and the trailer move up. Turn recency off: the 20-hour-old wedding photo moves from fourth to second, and the 30-minute-old beach photo (which few people interact with) stays at the bottom. These weights are the "personality" of the product, and they are tuned with A/B tests.` },
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"For ranking, score every post on all of Instagram on every feed open." No, that is impossible. The heavy model runs only on a few hundred candidates; the candidates come from cheap tricks (lists of followed accounts, pre-computed embeddings). In an interview, describe the funnel: <strong>retrieve → light rank → heavy rank → filter/mix</strong>.` },
    { type: 'h2', text: 'Deep dive: cursor pagination' },
    { type: 'p', html: `Riya saw 20 posts and scrolled down. How do we give the next 20? The simple idea: <code>?page=2</code>, that is, offset 20. The problem: while Riya was reading the first 20, 3 new posts arrived at the top. Now "positions 20 to 40" include the 3 posts Riya has already seen: <strong>duplicates</strong>. (With a delete it is the opposite: posts get <strong>skipped</strong>.)` },
    { type: 'compare',
      left: { title: 'Offset (page=2)', ascii: `
First call:  [P50 P49 ... P31]   (20)
  ... 3 new posts arrive: P53 P52 P51
Second call: offset 20
  [P33 P32 P31 P30 ... P14]
   ^^^^^^^^^^^ these 3 again!` },
      right: { title: 'Cursor (max_id)', ascii: `
First call:  [P50 ... P31]
  next_cursor = P31
  ... 3 new posts arrive
Second call: "give me older than P31"
  [P30 P29 ... P11]
   no duplicates` },
    },
    { type: 'p', html: `Try it yourself. The page size is 5. Press "Get page 1", then "2 new posts arrive", then "Next page". In the offset column, the red posts are duplicates. Reset, then try "Delete the top post": offset skips a post, cursor does not.` },
    { type: 'custom', render(el) {
      const PS = 5;
      let list, top, M, log;
      const reset = () => { list = []; for (let i = 60; i >= 41; i--) list.push(i); top = 60; M = { off: { seen: [], pages: 0, last: [] }, cur: { seen: [], pages: 0, last: [], c: null } }; log = ['The server has posts P60 to P41 (bigger number = newer).']; };
      el.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <button type="button" class="btn small primary fdc-p1">Get page 1</button>
          <button type="button" class="btn small fdc-new">2 new posts arrive</button>
          <button type="button" class="btn small fdc-del">Delete the top post</button>
          <button type="button" class="btn small primary fdc-next">Next page</button>
          <button type="button" class="btn small ghost fdc-reset">Reset</button></div>
        <div style="font-family:var(--f-mono);font-size:13px;margin-bottom:8px;word-break:break-word">Server list: <span class="fdc-list"></span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Offset (?page=N)</strong><div class="fdc-off" style="font-family:var(--f-mono);font-size:13px;margin-top:6px"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r-sm);padding:8px"><strong>Cursor (?cursor=last_id)</strong><div class="fdc-cur" style="font-family:var(--f-mono);font-size:13px;margin-top:6px"></div></div>
        </div>
        <div class="calc-note fdc-log"></div>`;
      const q = s => el.querySelector(s);
      const fetch = (k, first) => {
        const m = M[k]; let page;
        if (k === 'off') page = list.slice(first ? 0 : m.pages * PS, (first ? 0 : m.pages * PS) + PS);
        else page = (first || m.c == null ? list : list.filter(x => x < m.c)).slice(0, PS);
        if (first) { m.seen = []; m.pages = 0; m.c = null; }
        const dup = page.filter(x => m.seen.includes(x));
        const lo = page.length ? Math.min(...page) : null;
        const skipped = lo == null ? [] : list.filter(x => x > lo && !m.seen.includes(x) && !page.includes(x) && x <= (m.seen.length ? Math.max(...m.seen) : top));
        m.last = page.map(x => ({ x, dup: dup.includes(x) }));
        m.seen = m.seen.concat(page.filter(x => !m.seen.includes(x)));
        m.pages++; if (lo != null) m.c = lo;
        return { dup, skipped };
      };
      const show = (k, r) => {
        const m = M[k];
        return `Page ${m.pages}: ` + (m.last.length ? m.last.map(o => `<span style="${o.dup ? 'color:var(--red);font-weight:700' : ''}">P${o.x}</span>`).join(' ') : '-') +
          (r ? `<br>${r.dup.length ? '<span style="color:var(--red)">Duplicate: ' + r.dup.map(x => 'P' + x).join(', ') + '</span>' : 'No duplicates'}${r.skipped.length ? '<br><span style="color:var(--red)">Skipped: ' + r.skipped.map(x => 'P' + x).join(', ') + '</span>' : ''}` : '') +
          (k === 'cur' && m.c != null ? `<br>next_cursor = ${m.c}` : '');
      };
      let R = {};
      const draw = () => {
        q('.fdc-list').textContent = list.slice(0, 12).map(x => 'P' + x).join(' ') + ' ...';
        q('.fdc-off').innerHTML = M.off.pages ? show('off', R.off) : 'nothing yet';
        q('.fdc-cur').innerHTML = M.cur.pages ? show('cur', R.cur) : 'nothing yet';
        q('.fdc-log').innerHTML = log.slice(-3).map(x => '• ' + x).join('<br>');
      };
      q('.fdc-p1').onclick = () => { R = { off: fetch('off', true), cur: fetch('cur', true) }; log.push('Both fetched the first 5 posts.'); draw(); };
      q('.fdc-new').onclick = () => { list.unshift(++top, ++top); list.sort((a, b) => b - a); log.push(`2 new posts arrived at the top: P${top - 1}, P${top}. Everything else moved down by one place each.`); draw(); };
      q('.fdc-del').onclick = () => { const d = list.shift(); log.push(`P${d} was deleted. Everything else moved up by one place.`); draw(); };
      q('.fdc-next').onclick = () => { if (!M.off.pages) { log.push('Press "Get page 1" first.'); draw(); return; } R = { off: fetch('off'), cur: fetch('cur') }; log.push('Both asked for the next page.'); draw(); };
      q('.fdc-reset').onclick = () => { reset(); R = {}; draw(); };
      reset(); draw();
    }},
    { type: 'p', html: `Twitter's old developer docs said the same: a timeline keeps changing, so instead of a page number, read onward from <code>max_id</code> (the smallest ID you have seen), and use <code>since_id</code> for new posts. This works only when post IDs are <strong>time-ordered</strong> (like Snowflake, see the <a href="#/unique-ids">Unique IDs</a> lesson). A cursor is also cheap for the database: "id &lt; X LIMIT 20" goes straight through the index, while a big offset first counts and throws away thousands of rows. Details: the <a href="#/pagination-idempotency">Pagination</a> lesson.` },
    { type: 'callout', tone: 'warn', title: 'A cursor in a ranked feed', html: `A ranked feed is not in time order, so "older than P31" has no meaning. Public sources give no details here; what the industry usually does: on the first request, the feed service builds a ranked list and caches it for a while, and the cursor is an <strong>opaque token</strong> into that list (like a session id + position). The client does not need to know what the token means; it just sends it back. This way page 2 continues the same ranking, even if the scores have changed in between.` },
    { type: 'h2', text: 'Deep dive: caching, what goes where' },
    { type: 'p', html: `Feed design is really cache design, because reads are 50 times more than writes. Each cache does a different job:` },
    { type: 'table', head: ['Cache', 'What it holds', 'Why', 'If it is lost'], rows: [
      ['Feed cache (Redis lists)', 'A ready list per user: post IDs', 'The result of push; reading a feed is one read', 'Rebuild with pull (slow, but correct)'],
      ['Post cache', 'post_id → whole post', 'Hydration: one feed = 20 posts', 'Read from the Post DB; DB load goes up'],
      ['Celeb timelines + local cache', 'Latest IDs of celebrities', 'Hot keys; crores of reads', 'From a replica, or from the celeb\'s user timeline in the DB'],
      ['CDN', 'Photos, videos', 'Big bytes served from near the users', 'From object storage (expensive, slow)'],
      ['User/profile cache', 'Name, avatar, follow lists', 'Every post shows its author', 'From the User DB'],
    ]},
    { type: 'callout', tone: 'term', title: 'New word: cache hit ratio', html: `<strong>What it is:</strong> out of 100 lookups, how many were found in the cache (hits). 99% hits = only 1 in 100 went to the DB (a miss).<br><strong>Why it matters:</strong> there are so many lookups that even a 1% difference means lakhs of requests more or less on the DB.<br><strong>Without it (a low hit ratio):</strong> so much load on the database that it falls over. Details in the <a href="#/caching">Caching</a> lesson.` },
    { type: 'p', html: `See for yourself (these are assumed numbers): change the hit ratio from 99% to 90% and watch the DB load. Then turn the local cache for the celebrity's hot key on and off.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Feed loads per second: <strong class="fdk-fv"></strong></label><input class="fdk-f" type="range" min="10000" max="600000" step="10000" value="200000"></div>
          <div><label>Posts per feed load: <strong class="fdk-pv"></strong></label><input class="fdk-p" type="range" min="5" max="50" step="5" value="20"></div>
          <div><label>Post cache hit ratio (%): <strong class="fdk-hv"></strong></label><input class="fdk-h" type="range" min="50" max="99.9" step="0.1" value="99"></div>
          <div><label>Feed service instances: <strong class="fdk-iv"></strong></label><input class="fdk-i" type="range" min="10" max="500" step="10" value="200"></div>
          <div><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" class="fdk-l" checked> 1-second local cache for the celeb key</label></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Post lookups/s (hydration)</span><strong class="fdk-o1"></strong></div>
          <div class="stat"><span>Post DB reads/s (misses)</span><strong class="fdk-o2"></strong></div>
          <div class="stat"><span>Redis reads/s on the celeb key</span><strong class="fdk-o3"></strong></div>
        </div>
        <div class="calc-note fdk-note"></div>`;
      const g = s => el.querySelector(s);
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n));
      const upd = () => {
        const F = +g('.fdk-f').value, P = +g('.fdk-p').value, H = +g('.fdk-h').value, I = +g('.fdk-i').value, L = g('.fdk-l').checked;
        g('.fdk-fv').textContent = f(F); g('.fdk-pv').textContent = P; g('.fdk-hv').textContent = H.toFixed(1); g('.fdk-iv').textContent = I;
        const look = F * P, miss = look * (1 - H / 100), celeb = L ? I : F;
        g('.fdk-o1').textContent = f(look); g('.fdk-o2').textContent = f(miss); g('.fdk-o3').textContent = f(celeb);
        g('.fdk-note').textContent = `${f(F)} feed loads × ${P} posts = ${f(look)} post lookups every second. At a ${H.toFixed(1)}% hit ratio, ${f(miss)} lookups every second go to the DB (misses). Assume every feed load also reads one popular celebrity's timeline: local cache ${L ? 'ON: each instance asks Redis only once per second, so only ' + f(celeb) + ' reads/s' : 'OFF: all ' + f(celeb) + ' reads/s hit one Redis key, and that server will overheat'}.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', upd)); upd();
    }},

    { type: 'h2', text: 'Storage for posts and media' },
    { type: 'p', html: `The stack in Instagram's 2011 engineering post (then ~1.4 crore users, 3 engineers) matches this design closely: posts and metadata in <strong>PostgreSQL</strong>, photos in <strong>Amazon S3</strong> served through the <strong>CloudFront CDN</strong>, the main feed and activity feed in <strong>Redis</strong>, and feed fan-out done by workers of the <strong>Gearman task queue</strong>. In a 2012 post, they explained that they split PostgreSQL into thousands of logical shards and made IDs that contain time + shard id + sequence (details in <a href="#/unique-ids">Unique IDs</a>). These are old posts; today Instagram runs on Meta's infrastructure and the stack has changed.` },
    { type: 'list', items: [
      `<strong>Posts</strong>: shard by author_id or post_id. With time-ordered IDs, "latest posts of X" is one index range scan.`,
      `<strong>Media</strong>: upload into <a href="#/object-storage">object storage</a> (with a pre-signed URL), resize into several sizes, and serve through a <a href="#/cdn">CDN</a>. The feed response carries only URLs; the bytes never pass through the feed service.`,
      `<strong>Counts</strong> (likes, views): do not update the post row on every like; put events into a queue and add them up in batches (<a href="#/kafka">Kafka</a>). A slightly old count is fine.`,
    ]},

    { type: 'h2', text: 'Failure scenarios and bottlenecks' },
    { type: 'table', head: ['What broke', 'What happens', 'Protection'], rows: [
      ['Celebrity post (push)', 'Crores of writes, a backlog of minutes, other posts late too', 'Hybrid: no fan-out for celebs, merge on read'],
      ['Fan-out queue backlog', 'Posts reach feeds late', 'Autoscale workers, active users first, skip inactive ones'],
      ['Feed cache node lost', 'Some users get an empty feed', 'Replicas (Twitter 2013: 3 copies), rebuild with pull'],
      ['Hot celebrity key', 'One Redis node overheats', 'Replicas + local in-process cache, request coalescing'],
      ['Ranker slow/down', 'Slow feed loads', 'Timeout + chronological fallback'],
      ['Reply first, original later', 'A strange order (Twitter described it)', 'Merge/sort on read; hybrid reduces the celebrity race'],
      ['Delete / unfollow / block', 'Old IDs left in lists', 'Read-time filter + background cleanup'],
      ['Offset pagination', 'Duplicates / skipped posts', 'Cursor (max_id or an opaque token)'],
    ]},
    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'steps', items: [
      { t: 'Start with the maths', d: '200M DAU: ~4k posts/s, ~200k feed reads/s, 50:1 read-heavy. So precompute + cache.' },
      { t: 'Data model', d: 'Posts (sharded, time-ordered IDs), follow graph, per-user feed list (IDs only, capped), media in blob store + CDN.' },
      { t: 'Push vs pull', d: 'Fan-out on write for normal users, merge on read for celebrities, hybrid. Skip inactive users.' },
      { t: 'Read path', d: 'Feed service: list + celeb timelines → candidates → rank → filter → hydrate → cursor.' },
      { t: 'Ranking funnel', d: 'Candidate generation → light ranker → heavy ranker → filters/mixing (Twitter 2023, Instagram).' },
      { t: 'Failures', d: 'Celebrity storm, hot keys, cache loss → rebuild, ranker timeout → chronological fallback.' },
    ]},

    { type: 'diagram', title: 'The whole design at a glance', height: 620,
      groups: [
        { label: 'Media', x: 12, y: 124, w: 156, h: 236 },
        { label: 'Data + caches', x: 552, y: 20, w: 160, h: 590 },
      ],
      nodes: [
        { id: 'author', label: 'Aman (app)', sub: 'makes a post', x: 90, y: 70, w: 130, kind: 'client', info: 'What it is: the phone of the user who posts. Text goes to the Post service, photos/videos straight into object storage (pre-signed URL).' },
        { id: 'post', label: 'Post service', sub: 'save + event', x: 270, y: 70, w: 130, kind: 'server', info: 'What it is: the post service. It saves the post with a time-ordered ID in the Post DB, tells the user "posted" at once, and puts a fan-out event into the queue.' },
        { id: 'fo', label: 'Fan-out workers', sub: 'queue + workers', x: 270, y: 190, w: 130, kind: 'queue', info: 'What it is: a queue + background workers. Normal author: the ID goes into every active follower\'s feed list (push). Celebrity: no fan-out, only their celeb timeline is updated (hybrid).' },
        { id: 'pdb', label: 'Post DB', sub: 'sharded', x: 630, y: 70, w: 130, kind: 'data', info: 'What it is: the real home of posts (source of truth), sharded, with time-ordered IDs. If the feed cache is lost, feeds are rebuilt from here.' },
        { id: 'graph', label: 'Follower graph', sub: 'who follows who', x: 630, y: 190, w: 130, kind: 'data', info: 'What it is: who follows whom. Fan-out needs "Aman\'s followers", reads need "which celebs does Riya follow".' },
        { id: 'redis', label: 'Feed cache', sub: 'Redis lists (IDs)', x: 630, y: 310, w: 130, kind: 'cache', info: 'What it is: a ready list per user, post IDs only, length capped (~800), replicated. The result of push.' },
        { id: 'celeb', label: 'Celeb timelines', sub: 'hot keys', x: 630, y: 430, w: 130, kind: 'cache', info: 'What it is: the latest post IDs of celebrities. They are merged on read (pull). Hot keys, so replicas + the feed service\'s local cache.' },
        { id: 'pcache', label: 'Post cache', sub: 'hydration', x: 630, y: 550, w: 130, kind: 'cache', info: 'What it is: post_id → whole post. It turns 20 IDs into 20 whole posts; on a miss, the Post DB. Deleted posts are filtered here.' },
        { id: 'fs', label: 'Feed service', sub: 'merge, rank, cursor', x: 270, y: 430, w: 140, kind: 'server', info: 'What it is: the stateless service that builds the feed: merges the user\'s list + celeb timelines, gets the order from the ranker, hydrates, filters (deleted, unfollowed), and makes the cursor.' },
        { id: 'rank', label: 'Ranker', sub: 'ML scores', x: 270, y: 550, w: 130, kind: 'server', info: 'What it is: the service with the ML model that scores candidates. On a timeout, the feed service falls back to time order (graceful degradation).' },
        { id: 'reader', label: 'Riya (app)', sub: 'reads the feed', x: 90, y: 430, w: 130, kind: 'client', info: 'What it is: the reader\'s phone. GET /feed?limit=20, and on scroll, the next page with the cursor. Photos come from the CDN.' },
        { id: 'blob', label: 'Object storage', sub: 'photos, videos', x: 90, y: 190, w: 130, kind: 'data', info: 'What it is: a cheap, durable file store like S3. Media bytes never pass through the feed service.' },
        { id: 'cdn', label: 'CDN', sub: 'edge cache', x: 90, y: 310, w: 130, kind: 'edge', info: 'What it is: cache servers near users. The feed carries only media URLs; the photo comes from the CDN.' },
      ],
      edges: [
        { a: 'author', b: 'post', n: 1 },
        { a: 'post', b: 'pdb', n: 2 },
        { a: 'post', b: 'fo', kind: 'evt', n: 3 },
        { a: 'fo', b: 'graph', label: 'followers' },
        { a: 'fo', b: 'redis', n: 4 },
        { a: 'fo', b: 'celeb', dashed: true },
        { a: 'author', b: 'blob' },
        { a: 'blob', b: 'cdn' },
        { a: 'cdn', b: 'reader' },
        { a: 'reader', b: 'fs', n: 5 },
        { a: 'fs', b: 'redis', n: 6 },
        { a: 'fs', b: 'graph' },
        { a: 'fs', b: 'celeb', label: 'celeb merge' },
        { a: 'fs', b: 'rank', n: 7 },
        { a: 'fs', b: 'pcache', n: 8 },
      ],
      paths: [
        { name: 'Post', text: 'Aman posts → saved in the Post DB → event into the queue → workers fetch followers → post ID into every active follower\'s Redis list (push).', go: ['author>post>pdb', 'post>fo>graph', 'fo>redis'] },
        { name: 'Open feed', text: 'Riya → feed service → her ready list + celebs\' timelines (merge) → ranker → hydration from the post cache → 20 posts + cursor. Photos from the CDN.', go: ['reader>fs>redis', 'fs>graph', 'fs>celeb', 'fs>rank', 'fs>pcache', 'cdn>reader'] },
        { name: 'Celebrity post', text: 'Star posts → Post DB → no fan-out! Only their celeb timeline is updated. The post is merged in when followers load their feed (pull).', go: ['author>post>pdb', 'post>fo>celeb', 'reader>fs>celeb'] },
        { name: 'Scroll (cursor)', text: 'Scroll down: the app sends next_cursor → the feed service takes the IDs after that place in the list → hydration. No duplicates even when new posts arrive.', go: ['reader>fs>redis', 'fs>pcache'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>A feed is very <strong>read-heavy</strong> (~50:1), so we build the feed in advance (precompute) and cache it.</li>
      <li><strong>Push</strong> (fan-out on write): on a post, the ID goes into every follower's list. Reading is cheap; writing costs as much as the follower count.</li>
      <li><strong>Pull</strong> (fan-out on read): 1 write per post, join all timelines while reading. Writing is cheap; reading is expensive.</li>
      <li><strong>Hybrid</strong>: push for normal users, pull for celebrities, merge on read. Skip fan-out for inactive users.</li>
      <li>The feed cache holds <strong>only IDs</strong>, capped; content comes from the post cache (<strong>hydration</strong>). If the cache is lost, rebuild with pull.</li>
      <li>Ranking is a <strong>funnel</strong>: candidates → light rank → heavy rank → filters/mix. If the ranker is slow, use time order.</li>
      <li>Use a <strong>cursor</strong> for scrolling, not an offset: no duplicates and no skipped posts.</li>
      <li>Hot celebrity keys: <strong>replicas + local cache</strong>. Media always comes from object storage + a CDN.</li>
    </ul>` },

    { type: 'tradeoffs', gains: ['Push: reading a feed is one list read, ~ms', 'Pull for celebs: 1 write per post, no storm', 'Hybrid: the best of both, and what most systems do', 'Caching only IDs: less memory, edits/deletes in one place', 'Ranking: people see more relevant posts', 'Cursor: no duplicates, cheap for the DB'], costs: ['Push: write amplification and TBs of RAM', 'The feed is eventually consistent: a post arrives seconds or minutes late', 'Hybrid: a complex read path (merge, two roads)', 'Ranking: ML infrastructure, latency, and "why does my feed look like this" complaints', 'Read-time filtering: extra work on every feed load', 'Cursor: no jumping straight to "page 7"'] },

    { type: 'think', questions: [
      { q: 'Riya opens the app after 2 years. Her feed list has expired (inactive users get no fan-out). What will you do?', a: 'Build the feed with pull: whom Riya follows (graph) → their latest posts (post DB/user timelines) → merge + rank → put her list into Redis and treat her as active from now on. The first load will be a bit slow; show a "loading" skeleton. Twitter (2013) did the same for inactive users.' },
      { q: 'A normal user suddenly goes viral: 500 followers yesterday, 50 lakh today. What should happen in a hybrid system?', a: 'The celebrity flag should not be fixed forever. As soon as the follower count crosses the threshold, mark the account as a celebrity; stop fan-out for its new posts and merge them on read. Leave the posts that were already pushed in the lists. Around the moment the flag flips, both roads may deliver the same post, so dedupe by post_id during the merge.' },
      { q: 'After the unfollow, Kabir\'s old posts are still in Riya\'s Redis list. Should we clean it right away?', a: 'Changing crores of lists right away is expensive. Filter on read with the following check (cheap and correct), and let a background job slowly remove the IDs from the list. The user sees the right feed, and the system gets no spike.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'The biggest benefit of fan-out on write (push)?', options: ['Posting becomes cheap', 'Reading the feed becomes one precomputed list read', 'It uses less memory'], answer: 1, explain: 'Feed reads are ~50 times more common than writes, so doing the work at write time (precompute) pays off. The cost: write amplification and memory.' },
      { q: 'When an account with 10 crore followers posts, what does the hybrid design do?', options: ['Puts the post_id into 10 crore lists', 'Skips fan-out; its latest posts are merged when followers load their feed', 'Delivers the post after 1 hour'], answer: 1, explain: 'Pull for the celebrity: 1 write, and a merge on read. Its timeline becomes a hot key, so replicas + a local cache.' },
      { q: 'What should go into the feed cache (Redis list)?', options: ['Whole posts with images', 'Only post IDs (capped length)', 'Only follower IDs'], answer: 1, explain: 'IDs are small, and the post content lives in one place (hydration). Twitter (2013) also kept only IDs (and a little info), ~800 per list.' },
      { q: 'Why is an offset (page=2) wrong for an infinite-scroll feed?', options: ['An offset is only slow', 'New posts shift the items: duplicates or misses', 'An offset is a security risk'], answer: 1, explain: 'A cursor (max_id or an opaque token) reads "from where you stopped", so changes to the list do not matter, and it is cheap for the DB too.' },
      { q: 'The correct order of a ranking pipeline?', options: ['Heavy rank → candidate generation → filter', 'Candidate generation → light rank → heavy rank → filters/mixing', 'Filters → heavy rank on all posts'], answer: 1, explain: 'The funnel: cheap retrieval gives a few hundred or thousand candidates, then a light model, then the heavy model only on the top ones, then filters and mixing (Twitter 2023, Meta Explore 2023).' },
    ]},
    { type: 'sources', note: 'Twitter\'s architecture numbers come from a 2013 talk and the ranking details from a 2023 blog; both may be out of date now. The Instagram stack is from 2011-2012.', items: [
      { title: 'The Architecture Twitter Uses To Deal With 150M Active Users, 300K QPS, A 22 MB/S Firehose...', publisher: 'High Scalability (summary of Raffi Krikorian, "Timelines at Scale", QCon 2013)', year: 2013, url: 'https://highscalability.com/the-architecture-twitter-uses-to-deal-with-150m-active-users/', used: 'Redis home timelines with 3 replicas, ~800 entries, fan-out only to users active in 30 days, ~300k QPS reads, 5k/s tweets, celebrity fan-out up to ~5 min vs 5 s target, reply-before-original race, merge high-follower accounts at read time, Flock graph.' },
      { title: 'Twitter\'s Recommendation Algorithm', publisher: 'Twitter Engineering blog', official: true, year: 2023, url: 'https://blog.x.com/engineering/en_us/topics/open-source/2023/twitter-recommendation-algorithm', used: '~1,500 candidates per request, ~50% in-network, ~48M-parameter heavy ranker predicting engagements, filters and mixing, ~5B runs/day, < 1.5 s average.' },
      { title: 'the-algorithm (README)', publisher: 'Twitter / X on GitHub', official: true, year: 2023, url: 'https://github.com/twitter/the-algorithm', used: 'Component names: Earlybird search index (in-network), light and heavy ranker, Home Mixer on Product Mixer, visibility filters, RealGraph, SimClusters, TwHIN.' },
      { title: 'Shedding More Light on How Instagram Works', publisher: 'Instagram (Adam Mosseri)', official: true, year: 2021, url: 'https://about.instagram.com/blog/announcements/shedding-more-light-on-how-instagram-works', used: 'Chronological at launch, ranking from 2016 because ~70% of posts were missed; signals and predicted actions; separate ranking for Feed, Stories, Explore, Reels.' },
      { title: 'Scaling the Instagram Explore recommendations system', publisher: 'Engineering at Meta', official: true, year: 2023, url: 'https://engineering.fb.com/2023/08/09/ml-applications/scaling-instagram-explore-recommendations-system/', used: 'Multi-stage funnel: retrieval, first-stage (light) ranking, second-stage ranking, final reranking with filters/diversity; caching and pre-computation.' },
      { title: 'What Powers Instagram: Hundreds of Instances, Dozens of Technologies', publisher: 'Instagram Engineering', official: true, year: 2011, url: 'https://instagram-engineering.com/what-powers-instagram-hundreds-of-instances-dozens-of-technologies-adf2e22da2ad', used: 'PostgreSQL for data, S3 + CloudFront for photos, Redis for main feed and activity feed, Gearman workers for feed fan-out (read via the High Scalability summary of the same post).' },
      { title: 'Sharding & IDs at Instagram', publisher: 'Instagram Engineering', official: true, year: 2012, url: 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c', used: 'Logical shards on PostgreSQL and time-ordered 64-bit IDs (time + shard + sequence).' },
      { title: 'Get Tweet timelines: guides (working with timelines)', publisher: 'Twitter Developer Platform docs', official: true, url: 'https://developer.twitter.com/en/docs/twitter-api/v1/tweets/timelines/guides', used: 'Why page-based pagination fails on changing timelines; max_id and since_id cursoring.' },
    ]},
  ],
});
