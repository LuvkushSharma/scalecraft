Lesson.register({
  id: 'pagination-idempotency',
  title: 'Pagination and idempotency',
  minutes: 26,
  summary: `Two things every good API has. Pagination: do not send 10 lakh posts at once, send a few at a time (offset vs cursor, and why offset breaks at scale, with a live demo). Idempotency: if a request goes twice because of the network, the work must not happen twice, especially with money (idempotency keys, how the server stores them, PUT vs POST).`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Two small problems, but every big app meets them.<br><strong>First:</strong> Riya's feed has 50,000 posts. Send them all at once and the phone hangs. So we send them 20 at a time. But if the "next 20" are worked out wrongly, posts repeat or disappear.<br><strong>Second:</strong> Riya pressed "Pay ₹500", and the internet got stuck halfway. The app sends it again. The server must recognise "this is the same old payment", or the money is taken twice.<br>In this lesson you will see the right fix for both, and run them yourself.` },

    { type: 'h2', text: 'Part 1: Pagination' },
    { type: 'p', html: `Riya's feed on xyz.com has 50,000 posts. If the API sends all 50,000 for <code>GET /feed</code>, what happens?` },
    { type: 'list', items: [
      `The response is about 50 MB. The phone's data and battery run out.`,
      `The database has to read and send 50,000 rows. For every user. The database gets tired.`,
      `And the user only looks at the first 10-20 posts. All the rest is wasted work.`,
    ]},
    { type: 'callout', tone: 'term', title: 'New word: pagination', html: `<strong>What it is:</strong> sending a big result in small parts (<strong>pages</strong>). First 20, and when the user scrolls down, the next 20. The number of items per page is called the <strong>limit</strong> (or page size).<br><strong>Why we need it:</strong> the response stays small and fast, and the database reads only what will be shown.<br><strong>Without it:</strong> the API is slow for big users, heavy on phones, and a useless load on the database.<br><strong>Example:</strong> Google search's "1 2 3 ... Next", or Instagram's infinite scroll (keep going down, more posts keep coming). Both are pagination inside.` },
    { type: 'p', html: `The question is: how do we tell the server which ones are "the next 20"? There are two main ways.` },

    { type: 'h3', text: 'Way 1: Offset pagination' },
    { type: 'code', text: `
GET /feed?limit=20&offset=0     → posts 1 to 20
GET /feed?limit=20&offset=20    → posts 21 to 40
GET /feed?limit=20&offset=40    → posts 41 to 60

SQL:  SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 20` },
    { type: 'callout', tone: 'term', title: 'New word: offset', html: `<strong>What it is:</strong> "how many items to skip from the start". <code>offset=40</code> means skip the first 40, then give <code>limit</code> items.<br><strong>Why we need it:</strong> it is the easiest way. "Page 5" = <code>offset = (5-1) × 20 = 80</code>. You can jump straight to any page.<br><strong>Without it:</strong> a page-number UI ("1 2 3 ... 50") is hard to build.<br><strong>The catch:</strong> two problems. See them yourself below.` },
    { type: 'p', html: `<strong>Problem 1: the list moves.</strong> Offset works by counting ("skip the first 5"). If the list changes between the user seeing page 1 and asking for page 2 (a new post arrives, or a post is deleted), the count shifts. In the demo every page has 5 posts:` },
    { type: 'custom', render(el) {
      const S = {
        off: 'Get page 2 with offset', cur: 'Get page 2 with cursor', add: '2 new posts arrived', del: 'A post the user saw was deleted', reset: 'Reset',
        db: 'Database (newest on top)', seen: 'What the user saw', missing: 'Never shown: ',
        start: 'Page 1 has loaded: posts 20 to 16. Now press "2 new posts arrived" or "A post the user saw was deleted", then get page 2 both ways and compare.',
        added: 'Someone added 2 new posts. They went to the top of the list, and everything else moved 2 places down.',
        deleted: 'Post 18 was deleted (the user had already seen it). All posts below it moved 1 place up.',
        offDup: d => `Offset 5 means "skip the first 5". But the list had moved, so ${d} post(s) the user had already seen came again (red).`,
        offMiss: m => `Offset 5 skipped "the first 5", but the list had moved up. Post ${m} did not come on any page: the user never saw it!`,
        offOk: 'Nothing changed in between, so offset worked fine. Now change the list and try again.',
        curOk: last => `The cursor means "give me the 5 posts older than post ${last}". However many new posts arrive on top, or whatever is deleted in between, it always starts from the right place. No duplicates, nothing missing.`,
        again: 'You already got page 2. Press Reset and try the other way.',
      };
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small primary pg-off">${S.off}</button><button type="button" class="btn small primary pg-cur">${S.cur}</button>
          <button type="button" class="btn small pg-new">${S.add}</button><button type="button" class="btn small pg-del">${S.del}</button><button type="button" class="btn small ghost pg-reset">${S.reset}</button>
        </div>
        <div class="row2" style="margin-top:14px">
          <div><div style="font-weight:700;font-family:var(--f-display)">${S.db}</div><div class="pg-db"></div></div>
          <div><div style="font-weight:700;font-family:var(--f-display)">${S.seen}</div><div class="pg-seen"></div><div class="pg-miss" style="margin-top:6px;color:var(--red);font-size:13px"></div></div>
        </div>
        <div class="calc-note pg-note"></div>`;
      let db, seen, next, done;
      const q = c => el.querySelector(c);
      const chip = (txt, style) => `<span style="display:inline-block;margin:3px;padding:3px 8px;border-radius:6px;font:13px var(--f-mono);${style}">${txt}</span>`;
      const draw = (miss) => {
        q('.pg-db').innerHTML = db.map(id => chip('post ' + id, id >= 100 ? 'background:var(--accent-soft);color:var(--accent-ink)' : 'background:var(--surface-2)')).join('');
        q('.pg-seen').innerHTML = seen.map(s => chip('p' + s.page + ': ' + s.id, s.dup ? 'background:color-mix(in srgb,var(--red) 18%,var(--surface));color:var(--red)' : 'background:var(--surface-2)')).join('');
        q('.pg-miss').textContent = miss && miss.length ? S.missing + miss.map(m => 'post ' + m).join(', ') : '';
      };
      const reset = () => { db = []; for (let i = 20; i >= 1; i--) db.push(i); seen = db.slice(0, 5).map(id => ({ id, dup: false, page: 1 })); next = 100; done = false; draw(); q('.pg-note').textContent = S.start; };
      const take = page => { const have = new Set(seen.map(s => s.id)); page.forEach(id => seen.push({ id, dup: have.has(id), page: 2 })); done = true; return page.filter(id => have.has(id)).length; };
      // posts that are older than page 1's last post but newer than page 2's first one, and were never shown
      const missing = () => { const p1 = seen.filter(s => s.page === 1), p2 = seen.filter(s => s.page === 2); const lo = p2.length ? p2[0].id : 0, hi = p1[p1.length - 1].id; const have = new Set(seen.map(s => s.id)); return db.filter(id => id < hi && id > lo && !have.has(id)); };
      q('.pg-new').onclick = () => { db.unshift(next + 1, next); next += 2; draw(); q('.pg-note').textContent = S.added; };
      q('.pg-del').onclick = () => { db = db.filter(id => id !== 18); draw(); q('.pg-note').textContent = S.deleted; };
      q('.pg-off').onclick = () => { if (done) { q('.pg-note').textContent = S.again; return; } const d = take(db.slice(5, 10)); const m = missing(); draw(m); q('.pg-note').textContent = d ? S.offDup(d) : m.length ? S.offMiss(m.join(', ')) : S.offOk; };
      q('.pg-cur').onclick = () => { if (done) { q('.pg-note').textContent = S.again; return; } const last = seen.filter(s => s.page === 1).slice(-1)[0].id; take(db.filter(id => id < last).slice(0, 5)); draw(missing()); q('.pg-note').textContent = S.curOk(last); };
      q('.pg-reset').onclick = reset;
      reset();
    }},
    { type: 'h3', text: 'Way 2: Cursor (keyset) pagination' },
    { type: 'p', html: `The idea of a cursor: do not say "how many to skip". Say <strong>"how far I have seen"</strong>. Like a bookmark in a book: "read on from after page 47". However many pages are added in between, the bookmark stays in the same place.` },
    { type: 'code', text: `
GET /feed?limit=20
→ { "data": [ ...20 posts... ], "next_cursor": "eyJpZCI6OTgxMn0", "has_more": true }

GET /feed?limit=20&cursor=eyJpZCI6OTgxMn0     ← "give me 20 posts older than post 9812"

SQL:  SELECT * FROM posts WHERE id < 9812 ORDER BY id DESC LIMIT 20` },
    { type: 'callout', tone: 'term', title: 'New word: cursor', html: `<strong>What it is:</strong> a small "bookmark" given by the server that says where the previous page ended. Usually it is the id (or time) of the last item on the previous page, encoded into a string.<br><strong>Why we need it:</strong> the next page always starts from the right place, even if new things arrive in the list or something is deleted.<br><strong>Without it:</strong> duplicates and missing posts, like with offset.<br><strong>Example:</strong> <code>eyJpZCI6OTgxMn0</code> is really <code>{"id":9812}</code> written in base64url (URL-safe base64, with the trailing <code>=</code> removed). The client should not look inside it; it just sends it back in the next request. That is why it is called an <strong>opaque</strong> cursor.` },
    { type: 'callout', tone: 'term', title: 'New word: keyset and index', html: `<strong>What it is:</strong> the database name for a cursor is <strong>keyset pagination</strong>: "give me the rows after the key (id or time) I saw last" (<code>WHERE id &lt; 9812</code>). It is fast because the database has an <strong>index</strong>. An index is a sorted list, like the index at the back of a book: "id 9812 → here". The database jumps straight to that place.<br><strong>Why we need it:</strong> page 1 or page 5000, the work is the same.<br><strong>Without it:</strong> the database has to count from the start (see the next part). The full lesson on indexes (db-internals) comes later.` },
    { type: 'callout', tone: 'warn', title: 'The sort key must be unique', html: `If the feed is sorted by <code>created_at</code> (time), and two posts have exactly the same time, <code>WHERE created_at &lt; X</code> will skip one post. The fix: add a <strong>tie-breaker</strong>. Sort on <code>(created_at, id)</code>, and keep both in the cursor: <code>WHERE (created_at, id) &lt; ('2026-10-01 10:00', 9812)</code>. Build the index on the same pair.` },

    { type: 'h3', text: 'Problem 2: offset gets slow at scale' },
    { type: 'p', html: `<code>OFFSET 100000</code> means "skip the first 1 lakh rows". But the database has no shortcut for "skip 1 lakh". It has to read the first 1,00,000 rows one by one, throw them away, and only then give you 20. The further you scroll, the slower it gets. A cursor jumps straight there through the index. Move the slider and see:` },
    { type: 'custom', render(el) {
      const S = { page: 'Page number', size: 'Page size (limit)', off: 'Offset: rows the database reads', cur: 'Cursor: rows the database reads', ratio: 'How much more work offset does',
        note: (p, n, o) => `For page ${p}, offset = (${p} - 1) × ${n} = ${o.toLocaleString('en-IN')}. The database reads ${o.toLocaleString('en-IN')} rows and throws them away, then gives ${n}. The cursor reaches the right place straight through the index and reads only ${n} (plus a few steps to search the index).` };
      el.innerHTML = `<div class="row2"><div><label>${S.page}: <strong class="po-pv"></strong></label><input type="range" class="po-p" min="1" max="5000" value="1" aria-label="${S.page}"></div>
        <div><label>${S.size}: <strong class="po-nv"></strong></label><input type="range" class="po-n" min="10" max="100" step="10" value="20" aria-label="${S.size}"></div></div>
        <div class="po-bars" style="margin-top:12px"></div><div class="stats po-stats"></div><div class="calc-note po-note"></div>`;
      const q = c => el.querySelector(c);
      const bar = (label, v, max, col) => `<div style="margin:6px 0"><div style="font-size:13px;color:var(--ink-2)">${label}: <strong style="font-family:var(--f-mono)">${v.toLocaleString('en-IN')}</strong></div><div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:12px;width:${Math.max(0.6, 100 * v / max)}%;background:${col}"></div></div></div>`;
      const draw = () => {
        const p = +q('.po-p').value, n = +q('.po-n').value, o = (p - 1) * n, offRows = o + n, curRows = n;
        q('.po-pv').textContent = p; q('.po-nv').textContent = n;
        q('.po-bars').innerHTML = bar(S.off, offRows, offRows, 'var(--red)') + bar(S.cur, curRows, offRows, 'var(--green)');
        q('.po-stats').innerHTML = `<div class="stat"><span>${S.ratio}</span><strong>${Math.round(offRows / curRows).toLocaleString('en-IN')}×</strong></div>`;
        q('.po-note').textContent = S.note(p, n, o);
      };
      q('.po-p').oninput = draw; q('.po-n').oninput = draw; draw();
    }},
    { type: 'table', head: ['', 'Offset', 'Cursor (keyset)'], rows: [
      ['"Go to page 7"', 'Yes, directly', 'No (only next/previous)'],
      ['Speed on deep pages', 'Gets slower and slower (reads offset + limit rows)', 'Always fast (only limit rows)'],
      ['When new data arrives / is deleted', 'Duplicates or missing items', 'Stable'],
      ['"50,000 results in total"', 'Often shown (but COUNT(*) is costly too)', 'Usually not, only has_more'],
      ['Where to use', 'Small admin tables, page numbers in search', 'Feeds, chats, infinite scroll, big lists, API exports'],
    ]},
    { type: 'p', html: `In real APIs: Stripe list APIs use <code>limit</code>, <code>starting_after</code> (the id of the last object on the previous page) and <code>has_more</code>. Slack takes a <code>cursor</code> and returns <code>next_cursor</code>. Many GitHub endpoints use page numbers, some use <code>before</code>/<code>after</code> cursors, and GitHub gives the link to the next page in the response's <code>Link</code> header.` },
    { type: 'callout', tone: 'mistake', html: `<strong>"A cursor is just a page number too."</strong> No. A page number is a count ("from the 21st item"); a cursor is a place ("after post 9812"). A count goes wrong when the list changes; a place does not. Another mistake: not capping the limit. If a client sends <code>?limit=1000000</code>, the benefit of pagination is gone. Keep a max limit on the server (like 100), as GitHub does.` },
    { type: 'h2', text: 'Part 2: Idempotency' },
    { type: 'p', html: `Riya is buying the ₹500 premium plan on xyz.com. She pressed "Pay". The request reached the server, and the money was taken. But on the way back, the network broke.` },
    { type: 'p', html: `Riya's app only saw a <strong>timeout</strong> (meaning "no answer came in time"). The app has no idea whether the payment happened. There are three possibilities: the request never reached the server, or it reached and the work was done, or it reached and the work got stuck halfway. The app has no way to find out. So the app retries. Will ₹500 now be taken twice?` },
    { type: 'callout', tone: 'term', title: 'New word: idempotent', html: `<strong>What it is:</strong> an operation is <strong>idempotent</strong> if doing it once or ten times gives the same final result. Like a lift button: press it once or five times, the lift comes only once.<br><strong>Why we need it:</strong> retries on a network are certain to happen. If the operation is idempotent, a retry is completely safe.<br><strong>Without it:</strong> every retry means a double payment, a double order, a double message.<br><strong>Example:</strong> "set Riya's name to Riya S" is idempotent (do it 5 times, the name is Riya S). "Add ₹500 to Riya's wallet" is not (5 times = ₹2500).` },
    { type: 'table', head: ['HTTP method', 'Safe?', 'Idempotent?', 'Why'], rows: [
      ['GET, HEAD', 'Yes', 'Yes', 'Only reads, changes nothing'],
      ['PUT', 'No', 'Yes', '"This resource is now exactly this": do it 5 times, same state'],
      ['DELETE', 'No', 'Yes', 'Delete post 9: the second time post 9 is still deleted (the reply may be 404, the state is the same)'],
      ['POST', 'No', 'No', '"Create a new payment": a new payment every time!'],
      ['PATCH', 'No', 'Not necessarily', '"name = Riya S" is idempotent, but "followers + 1" is not. It depends on what the patch says'],
    ]},
    { type: 'h3', text: 'PUT vs POST: who creates the id?' },
    { type: 'p', html: `<strong>POST</strong> goes to a collection: <code>POST /orders</code> = "create a new order, and you (the server) choose the id". Send it twice: two orders, two different ids.` },
    { type: 'p', html: `<strong>PUT</strong> goes to a fixed address: <code>PUT /orders/7f3a91c2</code> = "the order with this id is now exactly this". Here the client made the id. Send it twice and there is still only one order <code>7f3a91c2</code>: it was created the first time, and the second time the same data was written again. So if the client can make a unique id itself, even a create can be made idempotent with PUT.` },
    { type: 'callout', tone: 'mistake', html: `<strong>"PUT is for update, POST is for create."</strong> That is only half true. The real difference: PUT means "put this whole thing at this address" (so it is idempotent), POST means "give this to the collection, let it do what it wants" (so it is not). In most APIs the server makes the id, so creating is done with POST, and then retry-safety needs an <strong>idempotency key</strong>.` },

    { type: 'h3', text: 'The fix: an idempotency key' },
    { type: 'p', html: `For every new action, the client makes a unique <strong>idempotency key</strong> (like a random UUID) and sends it in a request header. A retry sends <em>the same key</em>. Before doing any work, the server checks: "have I seen this key before? Yes? Then do not do new work; return the earlier result."` },
    { type: 'callout', tone: 'term', title: 'New word: idempotency key', html: `<strong>What it is:</strong> a long random string (like <code>7f3a91c2-...</code>) that identifies "one attempt by a user". It goes in a header: <code>Idempotency-Key: 7f3a91c2-...</code><br><strong>Why we need it:</strong> the server can recognise that two requests are really one piece of work (the first + its retry), not two different pieces of work.<br><strong>Without it:</strong> every POST is new to the server. Retry = double charge.<br><strong>Example:</strong> all Stripe POST requests accept this header. Stripe saves the status code and body of the first request, and returns the same thing for the same key, even if the first time was an error. Keys can be removed once they are 24 hours old.` },
    { type: 'callout', tone: 'term', title: 'New word: UUID', html: `<strong>What it is:</strong> a UUID (Universally Unique Identifier) is a 128-bit, random-looking id, like <code>7f3a91c2-5b1e-4c8a-9d2f-0e6b3a1c4d55</code>. There are so many possible UUIDs that making the same one twice is practically impossible.<br><strong>Why we need it:</strong> the app can make a unique key by itself, without asking the server.<br><strong>Without it:</strong> the app would first have to call the server to get a key, and that call could fail too.` },
    { type: 'h3', text: 'How the server stores keys' },
    { type: 'p', html: `The server has a small table (in the database, or in Redis). One row per key:` },
    { type: 'table', head: ['Column', 'What it holds', 'Why'], rows: [
      ['<code>key</code> (UNIQUE)', '7f3a91c2-...', 'The database itself guarantees there are never two rows for one key'],
      ['<code>user_id</code>', '42', 'One user\'s key never returns another user\'s result'],
      ['<code>request_hash</code>', 'A fingerprint of amount=500, plan=premium', 'To catch the same key arriving with different data'],
      ['<code>status</code>', 'in_progress / done', 'To know whether the first request is still running or finished'],
      ['<code>response</code>', '201 + body', 'To return the same answer on a retry, without doing the work again'],
      ['<code>created_at</code>', 'time', 'To remove old keys after some time (like 24 hours)'],
    ]},
    { type: 'steps', items: [
      { t: 'First write the key as "in_progress"', d: 'Do an INSERT. If it fails because of the UNIQUE constraint, the key already exists: go to step 4. This is one atomic step, so even if two requests come together, only one wins.' },
      { t: 'Do the real work', d: 'Charge the bank, create the order, whatever the work is.' },
      { t: 'Save the result', d: 'status = done, response = 201 + body. Then send the reply to the client.' },
      { t: 'The key already existed?', d: 'Different data (request_hash does not match) → a 422 error. Status is in_progress → 409 "still running, wait a little and ask again". Status is done → send the saved response, without doing the work.' },
    ]},
    { type: 'p', html: `These 409 and 422 rules are also written in an IETF draft standard (<em>The Idempotency-Key HTTP Header Field</em>). It has not become an RFC yet (it is an Internet-Draft), but APIs like Stripe already use this pattern. Now run it yourself:` },
    { type: 'custom', render(el) {
      const S = {
        useKey: 'Use an idempotency key', lose: 'The reply gets lost on the way (timeout)',
        pay: 'Pay ₹500 (new attempt)', retry: 'Retry (same attempt)', dbl: 'Double tap (2 at once)', bad: 'Same key, with ₹600', reset: 'Reset',
        charged: 'Taken from the bank', charges: 'Charges', table: 'The server\'s keys table', none: '(empty)', cols: ['key', 'amount', 'status', 'saved response'],
        noAttempt: 'First press "Pay ₹500".',
        start: 'At the start the key is OFF. Turn "reply gets lost" ON, press Pay, then Retry. Then turn the key ON and repeat.',
        timeout: ' The app got no reply (timeout). It does not know what happened.',
        got: r => ` The app got a reply: ${r}.`,
        charge: (k) => k ? `Key ${k} was new: first wrote "in_progress", took ₹500 from the bank, saved the result.` : 'Without a key: the server took ₹500 from the bank directly.',
        replay: k => `Key ${k} is already "done". The bank was not called at all; the saved response was sent back.`,
        conflict: k => `Key ${k} is still "in_progress" (the first request is running). The second one gets 409: "wait a little and ask again".`,
        mismatch: k => `Key ${k} was made for ₹500, now ₹600 came. The server returned 422: the same key will not work for different work.`,
        dblNoKey: 'Two taps, no key: both requests charged separately!',
        dblKey: k => `Two taps, same key ${k}: the first wrote "in_progress", the second got 409, only one charge.`,
      };
      const KEYS = ['7f3a91c2', 'b81e44d0', 'c2d9a017', 'e4f0b3a8', '19ab77c5', '5d02e6f1'];
      el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:14px"><label><input type="checkbox" class="ik-use"> ${S.useKey}</label><label><input type="checkbox" class="ik-lose"> ${S.lose}</label></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px"><button type="button" class="btn small primary ik-pay">${S.pay}</button><button type="button" class="btn small ik-retry">${S.retry}</button><button type="button" class="btn small ik-dbl">${S.dbl}</button><button type="button" class="btn small ik-bad">${S.bad}</button><button type="button" class="btn small ghost ik-reset">${S.reset}</button></div>
        <div class="stats ik-stats"></div><div style="font-weight:700;font-family:var(--f-display);margin-top:8px">${S.table}</div><div class="ik-tab" style="overflow-x:auto"></div><div class="calc-note ik-note"></div>`;
      const q = c => el.querySelector(c);
      let st;
      const reset = () => { st = { keys: {}, order: [], charged: 0, n: 0, cur: null }; draw(); q('.ik-note').textContent = S.start; };
      const draw = () => {
        q('.ik-stats').innerHTML = `<div class="stat"><span>${S.charged}</span><strong>₹${st.charged}</strong></div><div class="stat"><span>${S.charges}</span><strong>${st.n}</strong></div>`;
        const td = 'style="padding:4px 8px;border-bottom:1px solid var(--line);font:12.5px var(--f-mono)"';
        q('.ik-tab').innerHTML = st.order.length ? `<table style="border-collapse:collapse;margin-top:4px"><tr>${S.cols.map(c => `<th ${td}>${c}</th>`).join('')}</tr>${st.order.map(k => { const r = st.keys[k]; return `<tr><td ${td}>${k}</td><td ${td}>₹${r.amount}</td><td style="padding:4px 8px;border-bottom:1px solid var(--line);font:12.5px var(--f-mono);color:${r.status === 'done' ? 'var(--green)' : 'var(--amber)'}">${r.status}</td><td ${td}>${r.resp || '-'}</td></tr>`; }).join('')}</table>` : `<div style="color:var(--ink-3);font-size:13px">${S.none}</div>`;
      };
      const charge = a => { st.charged += a; st.n++; };
      // one request reaching the server; returns [status text, explanation]
      const server = (key, amount, finish = true) => {
        if (!key) { charge(amount); return ['201 paid', S.charge(null)]; }
        const r = st.keys[key];
        if (r) { if (r.amount !== amount) return ['422 Unprocessable', S.mismatch(key)]; if (r.status === 'in_progress') return ['409 Conflict', S.conflict(key)]; return [r.resp + ' (replay)', S.replay(key)]; }
        st.keys[key] = { amount, status: 'in_progress', resp: '' }; st.order.push(key);
        charge(amount);
        if (finish) { st.keys[key].status = 'done'; st.keys[key].resp = '201 paid'; }
        return ['201 paid', S.charge(key)];
      };
      const send = (amount, fresh) => {
        if (fresh) st.cur = q('.ik-use').checked ? KEYS[st.order.length % KEYS.length] + '-' + (st.order.length + 1) : 'nokey';
        if (!st.cur) { q('.ik-note').textContent = S.noAttempt; return; }
        const key = st.cur === 'nokey' ? null : st.cur;
        const [r, why] = server(key, amount);
        q('.ik-note').textContent = why + (q('.ik-lose').checked ? S.timeout : S.got(r)); draw();
      };
      q('.ik-pay').onclick = () => send(500, true);
      q('.ik-retry').onclick = () => send(500, false);
      q('.ik-bad').onclick = () => { if (!st.cur || st.cur === 'nokey') { q('.ik-note').textContent = S.noAttempt; return; } send(600, false); };
      q('.ik-dbl').onclick = () => {
        const use = q('.ik-use').checked; st.cur = use ? KEYS[st.order.length % KEYS.length] + '-' + (st.order.length + 1) : 'nokey';
        if (!use) { server(null, 500); server(null, 500); q('.ik-note').textContent = S.dblNoKey; draw(); return; }
        server(st.cur, 500, false); server(st.cur, 500); const r = st.keys[st.cur]; r.status = 'done'; r.resp = '201 paid';
        q('.ik-note').textContent = S.dblKey(st.cur); draw();
      };
      q('.ik-reset').onclick = reset;
      reset();
    }},
    { type: 'p', html: `Now see the same thing along the request's journey. In each scenario, watch the bank's meter: how many times money was taken.` },
    { type: 'flow', height: 300,
      nodes: [
        { id: 'app', label: 'xyz app', sub: 'Riya', x: 90, y: 150, w: 120, kind: 'client', info: 'What it is: the xyz.com app on Riya\'s phone. For every payment attempt it makes a new idempotency key (on the first tap), and on a retry it sends the same key again.' },
        { id: 'api', label: 'Payment API', x: 320, y: 150, w: 140, kind: 'server', info: 'What it is: the xyz.com server that takes payment requests. Before doing any work it checks the key in the keys table: a new key means do the work, an old key means return the saved answer.' },
        { id: 'keys', label: 'Keys table', sub: 'key → result', x: 320, y: 265, w: 150, kind: 'data', hidden: true, info: 'What it is: a database table that keeps every key and its result (for some hours/days). The key column is UNIQUE, so two rows for one key can never exist. This is how duplicates are caught.' },
        { id: 'bank', label: 'Bank / PSP', sub: 'takes the money', x: 580, y: 150, w: 140, kind: 'server', meter: true, load: 0, info: 'What it is: the bank or payment company (PSP = Payment Service Provider) where the real money is taken. The meter shows how many times a charge happened.' },
      ],
      edges: [{ a: 'app', b: 'api' }, { a: 'api', b: 'bank' }, { a: 'api', b: 'keys' }],
      scenarios: [
        { name: 'Without an idempotency key', steps: [
          { title: 'Riya presses "Pay ₹500"', go: 'app>api>bank', text: 'The money was taken.', after: { bank: { load: 50, sub: 'charged: ₹500' } }, msg: 'POST /payments { amount: 500 }' },
          { title: 'The reply got lost on the way', go: 'lost:api>app', text: 'The app got a timeout. It does not know whether the payment happened.' },
          { title: 'The app retries', text: 'POST is not idempotent. To the server, this is a brand-new request.', go: 'app>api>bank', after: { bank: { load: 100, state: 'hot', sub: 'charged: ₹1000 !!' } }, msg: 'POST /payments { amount: 500 }' },
          { title: 'Double charge', text: '₹1000 was taken from Riya. In the real world this is one of the worst bugs.', go: 'res:api>app' },
        ]},
        { name: 'With an idempotency key', steps: [
          { title: 'The app makes a unique key', text: 'A new key for every new payment attempt. The key goes in a request header.', show: ['keys'], go: 'app>api', msg: 'POST /payments { amount: 500 }\nIdempotency-Key: 7f3a-91c2-...' },
          { title: 'The server saves the key, then charges', go: ['api>keys', 'api>bank'], text: 'A key seen for the first time: first write "in_progress", do the work, then save the result with the key.', after: { bank: { load: 50, sub: 'charged: ₹500' }, keys: { sub: '7f3a → paid ✓' } } },
          { title: 'The reply got lost', go: 'lost:api>app', text: 'The same network problem.' },
          { title: 'Retry, with the SAME key', text: 'The server looks in the keys table: this key has come before and the result is "paid". The bank is not called again.', go: ['app>api', 'api>keys', 'res:keys>api'], after: { keys: { state: 'hit' } }, msg: 'Idempotency-Key: 7f3a-91c2-...  →  already processed' },
          { title: 'The earlier result comes back', text: 'Riya sees "Payment successful", and ₹500 was taken only once.', go: 'res:api>app', after: { bank: { state: 'ok' } } },
        ]},
        { name: 'Two requests at once (409)', steps: [
          { title: 'The first request arrives', text: 'The key is new. The server wrote the key as "in_progress" and called the bank. The bank is a bit slow.', show: ['keys'], go: ['app>api', 'api>keys'], after: { keys: { sub: '7f3a → in_progress', state: 'warn' }, bank: { load: 50, sub: 'charging...' } }, msg: 'POST /payments  Idempotency-Key: 7f3a-...' },
          { title: 'Double tap: a second request, same key', text: 'The first one has not finished yet. The server checked the table: the key is "in_progress". The second one gets 409 Conflict at once: "still running, wait a little and ask again".', go: ['app>api', 'api>keys', 'res:keys>api', 'bad:api>app'], msg: 'HTTP/1.1 409 Conflict' },
          { title: 'The first one finishes', text: 'The bank charged once. The key became "done". If the key INSERT were not atomic (read first, then write), both requests would see "new key" and both would charge.', go: ['api>bank', 'res:bank>api', 'res:api>app'], after: { keys: { sub: '7f3a → paid ✓', state: 'ok' }, bank: { sub: 'charged: ₹500' } } },
        ]},
        { name: 'Same key, different data (422)', steps: [
          { title: 'The first payment is done', text: 'Key 7f3a is "done" for ₹500.', show: ['keys'], go: ['app>api', 'api>keys', 'api>bank'], after: { keys: { sub: '7f3a → ₹500 paid' }, bank: { load: 50, sub: 'charged: ₹500' } } },
          { title: 'A bug in the app: same key, ₹600', text: 'Because of a bug, the app sent the old key with a new amount.', go: 'app>api', msg: 'POST /payments { amount: 600 }\nIdempotency-Key: 7f3a-...' },
          { title: 'The fingerprint does not match', text: 'The server compared the hash of the request with the saved hash: they differ. Returning the old result would be wrong (Riya would think she paid ₹600), and a new charge would be wrong too. So a 422 error, and no call to the bank.', go: ['api>keys', 'res:keys>api', 'bad:api>app'], after: { keys: { state: 'warn' } }, msg: 'HTTP/1.1 422 Unprocessable Content\n{ "error": "key reused with different request" }' },
        ]},
      ],
    },
    { type: 'callout', tone: 'why', title: 'Why this is needed everywhere', html: `The network can fail at any time, and the client never knows for sure whether the server did the work. So the rule of distributed systems is: <strong>retries will happen</strong>. A retry is safe only when the operation is idempotent. Payments, orders, bookings, sending messages: this pattern is everywhere.` },
    { type: 'callout', tone: 'tip', title: 'Ways to be idempotent without a key', html: `<strong>Set an absolute value</strong>, do not add to it: "balance = 1500" (idempotent) vs "balance + 500" (not). <strong>Add a condition</strong>: <code>UPDATE orders SET status='paid' WHERE id=7 AND status='pending'</code>. The second time, no row will match. <strong>Queue messages</strong>: queues often deliver a message more than once (at-least-once). The consumer writes each message id into a "processed" table and skips it if it comes again. This is called an <em>idempotent consumer</em> (details in the queues lesson).` },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `<strong>Pagination:</strong> for feeds, chats, infinite scroll and any big or fast-changing list: <strong>cursor (keyset)</strong>, with an index on a unique sort key (time + id). Use offset only for small, slow-changing lists where you need "go to page 7" (admin tables). Always keep a max limit on the server.<br><strong>Idempotency:</strong> keep GET, PUT, DELETE idempotent as they are. For any POST that creates money movement, an order, a booking or a message, take an <strong>Idempotency-Key</strong>, save the key atomically with a UNIQUE constraint, store the response, and expire keys after about 24 hours.` },
    { type: 'diagram', title: 'Pagination + idempotency: the whole picture', height: 420,
      groups: [
        { label: 'API servers', x: 165, y: 138, w: 390, h: 104 },
        { label: 'Data', x: 40, y: 290, w: 640, h: 100 },
      ],
      nodes: [
        { id: 'app', label: 'Riya\'s app', sub: 'feed + payments', x: 120, y: 70, kind: 'client', info: 'What it is: the xyz.com app. For the feed it sends back the next_cursor of the previous page. For a payment it makes a new idempotency key for every attempt and sends the same one on a retry.' },
        { id: 'lb', label: 'Load Balancer', x: 360, y: 70, kind: 'net', info: 'What it is: something that spreads requests across several API servers (its full lesson comes later). Because of it, a retry can go to a different server, so keys must be kept in a shared table, not in one server\'s memory.' },
        { id: 's1', label: 'API server 1', x: 250, y: 200, kind: 'server', info: 'What it is: one copy of the xyz.com API code. On a feed request it decodes the cursor and runs a "WHERE id < cursor" query. The retry came here, and the keys table still showed that the payment was done.' },
        { id: 's2', label: 'API server 2', x: 470, y: 200, kind: 'server', info: 'What it is: a second copy of the API code. The first payment request came here: it wrote the key as "in_progress", charged the bank, and saved the result.' },
        { id: 'posts', label: 'Posts DB', sub: 'index (time, id)', x: 120, y: 340, kind: 'data', info: 'What it is: the posts table, with an index on (created_at, id). Because of the index, the cursor query jumps straight to the right place: page 1 or page 5000, the same work.' },
        { id: 'keys', label: 'Keys table', sub: 'UNIQUE key', x: 360, y: 340, kind: 'data', info: 'What it is: the shared table of idempotency keys: key, user, request hash, status, saved response. The UNIQUE constraint never lets two requests both win. Old keys are removed after 24 hours.' },
        { id: 'bank', label: 'Payment provider', sub: 'bank / PSP', x: 600, y: 340, w: 150, kind: 'net', info: 'What it is: the outside company that takes the real money. Our job: call it only once per attempt. Good providers also accept an idempotency key, so we pass our key on to them.' },
      ],
      edges: [
        { a: 'app', b: 'lb', n: 1 },
        { a: 'lb', b: 's1' },
        { a: 'lb', b: 's2' },
        { a: 's1', b: 'posts', label: 'id < cursor' },
        { a: 's1', b: 'keys', label: 'key: done' },
        { a: 's2', b: 'keys', label: 'INSERT key' },
        { a: 's2', b: 'bank', label: 'charge once' },
      ],
      paths: [
        { name: 'Feed: next page', text: 'The app sends next_cursor. The server uses the index to fetch the next 20 posts from exactly that place. No duplicates, nothing missing.', go: ['app>lb>s1>posts'] },
        { name: 'Pay: first time', text: 'A new key: server 2 wrote the key as "in_progress", charged the bank once, and saved the result.', go: ['app>lb>s2>keys', 's2>bank'] },
        { name: 'Retry: on another server', text: 'The reply was lost, and the retry went to server 1. The shared keys table showed the key as "done": the saved answer went back, and the bank was not called.', go: ['app>lb>s1>keys'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Pagination = a big result in small pages. Always keep a max limit on the server.</li>
      <li>Offset = "skip the first N": easy, can jump to a page, but if the list changes you get duplicates/missing items, and deep pages are slow (it reads offset + limit rows).</li>
      <li>Cursor (keyset) = "give me what comes after this place": stable and always fast, with an index. Keep the sort key unique (time + id).</li>
      <li>Idempotent = run it any number of times, the final state is the same. GET, PUT, DELETE yes; POST no; PATCH depends.</li>
      <li>PUT says "put this at a fixed address" (idempotent); POST says "create something new in the collection" (not).</li>
      <li>Idempotency key: the client uses one key per attempt, and the same key on a retry. The server saves the key atomically with UNIQUE and stores the response.</li>
      <li>Same key + in_progress = 409, same key + different data = 422, same key + done = the saved answer.</li>
      <li>Keys live in a shared store (a retry can reach any server), and expire after some time.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['Small, fast responses; the DB reads only what will be shown', 'Cursor: the same speed even on a deep scroll, and correct even when the list changes', 'Safe retries: no double charge, no double order', 'Even after a network timeout, the client gets a definite answer'], costs: ['With a cursor, "go to page 37" and a total count are hard', 'Every sort order needs the right index', 'Idempotency: an extra DB write/read on every POST, plus storage for keys', 'Atomic insert, request hash, expiry, 409/422: building it right takes effort'] },
    { type: 'think', questions: [
      { q: 'Riya pressed "Pay" twice very quickly (a double tap). Will the idempotency key protect her?', a: 'Yes, if the app makes only one key for one payment attempt and sends the same key with both taps. That is why the key is made "when the screen opens" or "on the first tap", not on every tap. If both arrive together, the second gets 409. Disabling the button in the UI also helps.' },
      { q: 'Offset or cursor for an infinite-scroll feed?', a: 'Cursor. New content keeps arriving in a feed (offset gives duplicates), and users scroll very far down (offset keeps getting slower).' },
      { q: 'You kept the keys only in each API server\'s RAM (each server has its own). What can go wrong?', a: 'Because of the Load Balancer, a retry can go to another server where the key does not exist: a double charge. On a server restart, all keys are lost too. Keep keys in a shared, durable store (a database table or replicated Redis).' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Which HTTP method is NOT idempotent by default?', options: ['GET', 'PUT', 'POST'], answer: 2, explain: 'POST usually creates a new resource. Every call = a new resource.' },
      { q: 'What should the idempotency key be on a retry?', options: ['A new random key', 'The same key as before', 'No key'], answer: 1, explain: 'Only the same key lets the server recognise that this is the same operation.' },
      { q: 'Why is OFFSET 100000 slow?', options: ['The network is slow', 'The DB must read and skip 1 lakh rows', 'The JSON is big'], answer: 1, explain: 'The database has no shortcut for "skip". A cursor jumps straight to the right place through the index.' },
      { q: 'After page 1 was seen, 2 new posts arrived. What happens when page 2 is fetched with offset?', options: ['All fine', 'The last 2 posts of page 1 show up again', '2 posts go missing'], answer: 1, explain: 'The new posts on top pushed everything 2 places down. "Skip the first 5" now returns 2 old posts again.' },
      { q: 'Same idempotency key, but the first request is still running. What should the server do?', options: ['Charge again', '409 Conflict: wait a little and ask again', 'Delete the key'], answer: 1, explain: 'The status is in_progress. Doing the work again is a double charge. Say 409; the client waits a little and retries, and then gets the saved result.' },
      { q: 'PUT /orders/7f3a was sent twice. How many orders?', options: ['One', 'Two', 'An error'], answer: 0, explain: 'PUT means "put this at a fixed address". The second time the same data was written again; there is still one order.' },
    ]},
    { type: 'sources', note: 'The facts about idempotency keys and pagination come from these.', items: [
      { title: 'Idempotent requests (API reference)', publisher: 'Stripe docs', official: true, url: 'https://docs.stripe.com/api/idempotent_requests', used: 'Idempotency-Key header, saved status code and body (even 500s), keys up to 255 chars, prunable after 24 hours, parameter mismatch errors, no effect on GET/DELETE.' },
      { title: 'Designing robust and predictable APIs with idempotency', publisher: 'Stripe blog (Brandur Leach)', official: true, year: 2017, url: 'https://stripe.com/blog/idempotency', used: 'Why clients cannot know if a timed-out request ran, retries with the same key, exponential backoff.' },
      { title: 'The Idempotency-Key HTTP Header Field (Internet-Draft 07)', publisher: 'IETF HTTPAPI working group', official: true, year: 2025, url: 'https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/', used: '400 for a missing key, 409 while the first request is still processing, 422 for reuse with a different payload; still a draft, not an RFC.' },
      { title: 'RFC 9110: HTTP Semantics (sections 9.2.1, 9.2.2)', publisher: 'IETF', official: true, year: 2022, url: 'https://www.rfc-editor.org/rfc/rfc9110.html', used: 'Safe and idempotent methods; PUT and DELETE idempotent, POST not.' },
      { title: 'We need tool support for keyset pagination (No Offset)', publisher: 'Use The Index, Luke (Markus Winand)', url: 'https://use-the-index-luke.com/no-offset', used: 'Why OFFSET reads and discards rows, keyset with an index, unique sort key / tie-breaker.' },
      { title: 'Pagination (API reference)', publisher: 'Stripe docs', official: true, url: 'https://docs.stripe.com/api/pagination', used: 'limit, starting_after, ending_before and has_more on list endpoints.' },
      { title: 'Pagination through Web API collections', publisher: 'Slack developer docs', official: true, url: 'https://docs.slack.dev/apis/web-api/pagination', used: 'cursor parameter and response_metadata.next_cursor.' },
      { title: 'Using pagination in the REST API', publisher: 'GitHub Docs', official: true, url: 'https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api', used: 'Link header with rel="next", page or before/after parameters, per_page max usually 100.' },
    ]},
  ],
});
