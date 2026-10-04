Lesson.register({
  id: 'design-docs',
  title: 'Google Docs',
  minutes: 40,
  summary: `xyz.com Docs: three people are typing in the same paragraph at the same time, and in the end everyone's screen must show <em>exactly the same</em> document. Per-document session routing, why a naive merge breaks, Operational Transformation (the Google Docs way) vs CRDTs (try them yourself), operation log + snapshots, version history, presence and cursors, offline edits, and permissions.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine you and a friend are working on the same school project file, on two different laptops, at the same time.<br>You write a line, and your friend adds a word to that same line. Each of you should see the other's work right away.<br>In the end, both screens must show <strong>exactly the same</strong> document, and nobody's writing should disappear.<br>This lesson shows how an app like Google Docs does this: from zero, one problem at a time.` },
    { type: 'callout', tone: 'tip', title: 'Try it yourself first', html: `Think on paper for 10 minutes. The document says "I like tea". Riya and Aman both type something before "tea" in the same millisecond: Riya types "green ", Aman types "hot ". Because of the network, each of them gets the other's edit a little later. What will each screen show in the end? Will both show the same thing? Then compare with this lesson.` },
    { type: 'p', html: `This lesson builds on the <a href="#/realtime">WebSockets</a> lesson and on the CRDT part of the <a href="#/consistency">consistency</a> lesson. In 2010, Google wrote a series of three posts on the Google Drive blog about how the new Google Docs editor handles collaboration (operational transformation and a client-server protocol). That series is 15 years old, and Google's current internal design is not public. But the core idea is still what people teach today. We will also use Figma's engineering posts from 2019 and 2022 (about their multiplayer system), the Google Wave OT whitepaper (2010), and Martin Kleppmann's CRDT research.` },

    { type: 'h2', text: 'Step 0: from zero, one document and two people' },
    { type: 'p', html: `Before any design, think of the simplest possible way. The document is a file on a server. You open the file, and the whole text comes to your browser. You type. When you press "Save", the <strong>whole document</strong> goes back to the server, and the server replaces the old file with the new one.` },
    { type: 'p', html: `As long as only one person edits, this works fine. Now let two people edit at once. Riya and Aman both opened "I like tea". Riya added "green ", Aman added "hot ". Both pressed Save. The server received two full documents. What should it do? The easiest rule: <strong>keep the one that arrived last</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: last-write-wins (LWW)', html: `<strong>What it is:</strong> the simplest rule for a conflict. If two people change the same thing, only the save that reached the server <em>last</em> is kept.<br><strong>Why people choose it:</strong> it is very easy to build, and it is fine for some things (like a profile photo, or the colour of a shape).<br><strong>Without something better (and even with it):</strong> it breaks for text. The first person's <em>whole</em> edit silently disappears, with no error. Try it yourself below.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
          <div><label for="docs-lw-a">Riya's screen (type to change it)</label><input id="docs-lw-a" class="docs-lwa" type="text" maxlength="40" value="I like green tea" style="width:100%;font-family:var(--f-mono)"><button type="button" class="btn small primary docs-lsa" style="margin-top:6px">Riya: Save</button></div>
          <div><label for="docs-lw-b">Aman's screen (type to change it)</label><input id="docs-lw-b" class="docs-lwb" type="text" maxlength="40" value="I like hot tea" style="width:100%;font-family:var(--f-mono)"><button type="button" class="btn small primary docs-lsb" style="margin-top:6px">Aman: Save</button></div>
        </div>
        <div class="stats" style="margin-top:10px"><div class="stat"><span>Document on the server</span><strong class="docs-lsrv" style="font-family:var(--f-mono)"></strong></div><div class="stat"><span>Whose save won</span><strong class="docs-lwho"></strong></div></div>
        <div style="margin-top:6px"><button type="button" class="btn small ghost docs-lrs">Reset</button></div>
        <div class="calc-note docs-lnote"></div>`;
      const BASE = 'I like tea';
      let srv = BASE, who = '-', saves = [];
      const words = s => s.split(/\s+/).filter(Boolean);
      const added = s => { const b = words(BASE).slice(); return words(s).filter(w => { const i = b.indexOf(w); if (i >= 0) { b.splice(i, 1); return false; } return true; }); };
      const lost = (mine, final) => { const f = words(final); return added(mine).filter(w => { const i = f.indexOf(w); if (i >= 0) { f.splice(i, 1); return false; } return true; }); };
      const upd = () => {
        el.querySelector('.docs-lsrv').textContent = '"' + srv + '"';
        el.querySelector('.docs-lwho').textContent = who;
        const A = el.querySelector('.docs-lwa').value, B = el.querySelector('.docs-lwb').value;
        let n;
        if (saves.length < 2) n = saves.length === 0 ? 'Nobody has saved yet. Press both buttons, in any order.' : 'One save is done. Now press the other Save.';
        else {
          const la = lost(A, srv), lb = lost(B, srv);
          const parts = [];
          if (la.length) parts.push(`Riya's "${la.join(' ')}" is gone`);
          if (lb.length) parts.push(`Aman's "${lb.join(' ')}" is gone`);
          n = parts.length ? `Both saved, but the server kept only ${who}'s whole document. ${parts.join(', ')}. Nobody got an error. This is the damage last-write-wins does.` : 'Nothing was lost this time, because both wrote the same text (or added nothing). Add different words in different places and try again.';
        }
        el.querySelector('.docs-lnote').textContent = n;
      };
      const save = (name, val) => { srv = val; who = name; saves.push(name); if (saves.length > 2) saves = saves.slice(-2); upd(); };
      el.querySelector('.docs-lsa').addEventListener('click', () => save('Riya', el.querySelector('.docs-lwa').value));
      el.querySelector('.docs-lsb').addEventListener('click', () => save('Aman', el.querySelector('.docs-lwb').value));
      el.querySelector('.docs-lrs').addEventListener('click', () => { srv = BASE; who = '-'; saves = []; upd(); });
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      upd();
    }},
    { type: 'p', html: `Now imagine this: after her save, Riya writes for 1 more hour, and Aman changes one comma 1 second later and saves. Riya's hour of work is gone. That is why <strong>LWW is not allowed</strong> in a collaborative text editor. We need three changes, and each change brings a new part (component):` },
    { type: 'list', ordered: true, items: [
      `<strong>Do not send the whole document, send only the change.</strong> A small message like "insert 'hot ' at position 7". This is called an <em>operation</em> (there is a card below). The server can combine both changes; it does not have to throw one away.`,
      `<strong>Remove the Save button, send every change right away.</strong> For this we need a connection between the browser and the server that stays open: a <a href="#/realtime">WebSocket</a>.`,
      `<strong>Have one "referee" that decides the order.</strong> If two changes arrive at the same time, someone decides which one came first and adjusts the other. This will be the document's <em>session server</em>, and the way of adjusting is <em>Operational Transformation</em> or a <em>CRDT</em>.`,
    ]},
    { type: 'callout', tone: 'term', title: 'Reminder: WebSocket', html: `<strong>What it is:</strong> a connection between the browser and the server that stays open, so either side can send a message at any time (details in the <a href="#/realtime">Real-time lesson</a>).<br><strong>Why we need it:</strong> the small message for every keystroke must go out right away, and other people's edits must come from the server without the browser asking.<br><strong>Without it:</strong> the browser would have to ask the server every second "anything new?" (polling). That is slow and puts useless load on the server.` },

    { type: 'h2', text: 'Step 1: requirements' },
    { type: 'compare',
      left: { title: 'Functional', html: `• Create, open and edit a document (text + formatting)<br>• Many people edit at the same time and see each other's typing live<br>• Other people's cursors and names are visible (presence)<br>• Share: viewer / commenter / editor<br>• Version history ("the version from yesterday evening")<br>• Keep typing even when the internet is gone, sync when it is back<br><br><strong>Out of scope:</strong> spreadsheet formulas, details of comments, search` },
      right: { title: 'Non-functional', html: `• <strong>Convergence</strong>: after all edits arrive, everyone's copy is exactly the same<br>• Your own typing shows up instantly (no waiting for the network)<br>• Other people's edits arrive within a few hundred ms<br>• An acknowledged edit is never lost<br>• Each user's <em>intent</em> is kept (what they wrote stays where they wrote it)<br>• A popular doc should work even with 100+ editors` },
    },
    { type: 'callout', tone: 'term', title: 'New word: convergence', html: `<strong>What it is:</strong> every editor's browser has its own copy of the document, and edits can arrive in different orders. <strong>Convergence</strong> means: once all edits have reached everyone, every copy is <strong>the same, character by character</strong>.<br><strong>Why we need it:</strong> if Riya's screen ends with "green hot tea" and Aman's with "hot green tea", they are working on different documents and do not even know it.<br><strong>Without it:</strong> the copies silently drift apart (diverge), and every later edit lands in the wrong place.<br><strong>The second rule, intent preservation:</strong> after the merge, each user's edit should still be where they meant it to be, and nobody's text should vanish (this is exactly what LWW breaks).` },

    { type: 'h2', text: 'Step 2: napkin maths' },
    { type: 'p', html: `Suppose that at peak, 1 million documents are open on xyz.com Docs at the same time, with 2 editors per doc on average, and a typing user makes about 5 characters per second. If every keystroke is one operation, that is 1,000,000 × 2 × 5 = <strong>10 million ops per second</strong> for the whole system. But inside one <em>document</em> there are only about 10 ops per second. These two numbers shape the whole design: the total load is huge (we need many servers), but <strong>each document is small and independent</strong>. So spread the documents across servers, and do all the work for one document in one place. (These are "suppose" numbers, not Google's.)` },
    { type: 'h2', text: 'Step 3: API and data model' },
    { type: 'p', html: `Opening a document and seeing your list of documents is normal REST. Editing happens over a long-lived open <a href="#/realtime">WebSocket</a>, because small messages flow in both directions all the time. Every edit is an <strong>operation</strong>, not the whole document:` },
    { type: 'callout', tone: 'term', title: 'New word: operation (op)', html: `<strong>What it is:</strong> one small change to the document, written as data. For example <code>{InsertText 'hot ' @7}</code>: "insert 'hot ' at position 7". Position = how many characters from the start (I=0, space=1, l=2 ... the t of "tea" = 7).<br><strong>Why we need it:</strong> two people's ops can be combined (keep both texts), while from two whole documents we could only pick one. Also, only 4 characters go over the network, not 50 pages.<br><strong>Without it:</strong> we are back to LWW, and someone's work disappears.<br><strong>Example:</strong> according to Google's 2010 post, all edits in Google Docs were broken down into three basic types: <strong>InsertText</strong>, <strong>DeleteText</strong> and <strong>ApplyStyle</strong> (bold, colour and so on, over a range of text).` },
    { type: 'callout', tone: 'term', title: 'New word: rev (revision number)', html: `<strong>What it is:</strong> the server gives every accepted op a growing number inside the document: 1, 2, 3... Like the serial number of every entry in a register.<br><strong>Why we need it:</strong> the client can say "I made this op after seeing rev 17" (this is called <code>base_rev</code>). The server checks which new ops have arrived since then and adjusts for them. On reconnect, the client says "I have seen up to rev 120, give me what came after".<br><strong>Without it:</strong> nobody knows what the other side had seen, so adjusting and resuming are both impossible.` },
    { type: 'code', text: `
GET  /api/docs/42                     → { title, role: "editor", snapshot_rev: 5000, ... }
WS   /api/docs/42/session             (routed to the session server of doc 42)

Client → server:  { "type": "op",  "base_rev": 17, "op": {"insert": "hot ", "at": 7}, "client_op_id": "r-31" }
Server → client:  { "type": "ack", "client_op_id": "r-31", "rev": 18 }
Server → others:  { "type": "op",  "rev": 18, "op": {"insert": "hot ", "at": 7}, "by": "riya" }
Both ways:        { "type": "presence", "user": "riya", "cursor": 11, "color": "violet" }   (not saved)` },
    { type: 'p', html: `The messages above contain two new words. <strong>ack</strong> (acknowledgement) = the server's reply "I got your op, it is safe, and its rev is 18". <strong>presence</strong> = "who is in the document and where their cursor is". The data model below brings three more things; first understand them in plain words:` },
    { type: 'callout', tone: 'term', title: 'New words: op log, snapshot, presence', html: `<strong>Op log</strong><br><strong>What it is:</strong> a list where every accepted op is written with its rev number, one after another. We only add at the end (append-only); we never change anything in the middle.<br><strong>Why we need it:</strong> even if the server crashes, all edits are kept; to see an old version, rebuild it from the log.<br><strong>Without it:</strong> if the server's memory is lost, the edits are lost, and "yesterday's version" can never be found.<br><br><strong>Snapshot</strong><br><strong>What it is:</strong> a photo (copy) of the whole document at some rev, like "this is what the document looked like at rev 5000".<br><strong>Why we need it:</strong> to open a document, instead of re-applying (replaying) 1 million ops from the start, take the latest photo + the few ops after it.<br><strong>Without it:</strong> old documents take a very long time to open.<br><br><strong>Presence</strong><br><strong>What it is:</strong> who is in the document right now, where each cursor is, and who has selected what.<br><strong>Why we need it:</strong> when you can see someone else's cursor, you do not type on top of them.<br><strong>Without it:</strong> editing in the dark. But it does not need to be saved, so it never goes to disk.` },
    { type: 'table', head: ['Data', 'Fields', 'Where'], rows: [
      ['Document', 'doc_id, title, owner, created_at, latest_rev', 'SQL / metadata DB'],
      ['Permission', 'doc_id, principal (user/group/link), role (viewer/commenter/editor)', 'SQL, with a cache'],
      ['Operation log', 'doc_id, rev (1, 2, 3...), op, user, timestamp', 'Append-only, partition key doc_id'],
      ['Snapshot', 'doc_id, rev, encoded state of the whole document', 'Object storage (blob) + index'],
      ['Presence', 'doc_id, user, cursor, selection, color', 'Only memory / pub/sub, never disk'],
    ]},
    { type: 'p', html: `<strong>rev</strong> is the heart of it. The client says "I made this op after seeing rev 17" (<code>base_rev</code>), and the server decides whether it becomes rev 18, or whether other people's ops have arrived in between and it must be adjusted for them. In Google's 2010 protocol, too, the server kept a <strong>revision log</strong> and the client remembered the last revision it had seen.` },

    { type: 'h2', text: 'Step 4: high-level design, one document = one home' },
    { type: 'p', html: `First idea: normal stateless servers behind a load balancer, and write every op to the DB. Problem: Riya's op goes to server 1, and Aman's op goes to server 2 in the same millisecond. The two servers accept ops in different orders, and now there is no single "truth" about what happened first. Locking in the DB or coordinating across servers for every op would be very slow.` },
    { type: 'callout', tone: 'term', title: 'New word: session server (the document\'s owner)', html: `<strong>What it is:</strong> a server that is the "referee" for a document. It keeps the document open in its memory (RAM), gives every incoming op a rev number, adjusts it if needed, and sends it to everyone (broadcasts it). One document has exactly one owner; but one server can own thousands of different documents.<br><strong>Why we need it:</strong> "who came first" must have one answer. If one place decides, there is only one answer.<br><strong>Without it:</strong> two servers will accept the same document's ops in different orders, and the document will get two different histories.` },
    { type: 'callout', tone: 'term', title: 'New word: per-document session routing', html: `<strong>What it is:</strong> a router that looks at the <code>doc_id</code> of every WebSocket connection and sends it to that document's owner session server. The mapping comes either from <a href="#/consistent-hashing">consistent hashing</a> (hash of doc_id → server), or from a small table (registry): "doc 42 → server 1".<br><strong>Why we need it:</strong> a normal load balancer sends each request to any server. Here, all editors of one document must reach the <em>same</em> server.<br><strong>Without it:</strong> Riya is on server 1, Aman is on server 2, and two "referees" keep fighting.` },
    { type: 'p', html: `Solution: <strong>all editors of one document go to one session server</strong>, and the router picks the server from the <code>doc_id</code>. Different documents live on different servers, so the total load is still spread out. Figma wrote in 2019 that they run a separate process on the server for each multiplayer document, and that process is the authority for that document. Google has not published how its own routing works; this is a common industry pattern.` },
    { type: 'flow', title: 'Doc 42: routing, op log and failover', height: 350,
      nodes: [
        { id: 'r', label: 'Riya', sub: 'editor', x: 75, y: 90, w: 120, kind: 'client', info: 'What it is: Riya\'s browser (the client). It keeps its own copy of the document, applies its own edits to its screen right away (no waiting for the server), and sends ops over the WebSocket.' },
        { id: 'a', label: 'Aman', sub: 'editor', x: 75, y: 260, w: 120, kind: 'client', info: 'What it is: Aman\'s browser. Same document, its own copy. Other people\'s ops come from the server, and it applies them to its copy.' },
        { id: 'lb', label: 'Doc router', sub: 'doc_id → server', x: 250, y: 175, w: 130, kind: 'net', info: 'What it is: the router that sends every WebSocket connection to the right session server based on the doc_id. The mapping comes from consistent hashing or from a small registry (doc 42 → srv 1). If the server changes, the registry is updated.' },
        { id: 's1', label: 'Session srv 1', sub: 'doc 42 in memory', x: 450, y: 90, w: 150, kind: 'server', info: 'What it is: the owner (referee) of doc 42. It keeps the document in memory, gives ops their rev numbers, transforms them if needed, writes them to the op log, and broadcasts them to everyone. One owner per doc, so there is one truth about the order.' },
        { id: 's2', label: 'Session srv 2', sub: 'other docs', x: 450, y: 260, w: 150, kind: 'server', info: 'What it is: another session server, which owns other documents. If srv 1 dies, it can take over doc 42.' },
        { id: 'log', label: 'Op log', sub: 'append-only', x: 630, y: 90, w: 140, kind: 'data', info: 'What it is: an append-only list where every accepted op (doc_id, rev, op, user) is written. It is written here durably before the ack, so that an acknowledged edit is not lost even if the server crashes. Version history also comes from here.' },
        { id: 'snap', label: 'Snapshots', sub: 'object storage', x: 630, y: 260, w: 140, kind: 'data', info: 'What it is: photos of the document. Every few thousand ops (or every few seconds), a copy of the whole document with its rev number. To open the document: latest snapshot + replay the ops after it.' },
      ],
      edges: [{ a: 'r', b: 'lb' }, { a: 'a', b: 'lb' }, { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' }, { a: 's1', b: 'log' }, { a: 's1', b: 'snap' }, { a: 's2', b: 'snap' }, { a: 's2', b: 'log' }],
      scenarios: [
        { name: 'The journey of one edit', steps: [
          { title: 'Riya types', text: '"hot " appears on Riya\'s screen right away (optimistic). The op goes out over the WebSocket, with base_rev 17.', go: 'r>lb>s1', msg: '{ op: insert "hot " @7, base_rev: 17 }' },
          { title: 'The server decides the order', text: 'No other op arrived after rev 17, so no transform is needed. This op gets rev 18.', focus: ['s1'], set: { s1: { sub: 'rev 18' } } },
          { title: 'Durable first', text: 'Before sending the ack, append to the op log. Now even if the server dies, this edit is safe.', go: ['s1>log', 'res:log>s1'], msg: 'APPEND doc=42 rev=18 op=insert "hot " @7 by=riya' },
          { title: 'Ack and broadcast', text: 'Riya gets the ack (your op is rev 18), Aman gets the op itself. Aman applies it to his copy.', parallel: true, go: ['res:s1>lb>r', 's1>lb>a'], msg: 'riya ← ack r-31 rev 18\naman ← op rev 18 insert "hot " @7' },
        ]},
        { name: 'Without doc routing', intro: 'What if the router ignores the doc_id and just does normal round-robin?', steps: [
          { title: 'Riya on srv 1, Aman on srv 2', text: 'Both typed at the same time. Riya\'s op went to srv 1, Aman\'s to srv 2.', parallel: true, go: ['r>lb>s1', 'a>lb>s2'], set: { s2: { sub: 'doc 42 copy #2', state: 'warn' } } },
          { title: 'Two servers, two "rev 18"s', text: 'Each server gave its own op rev 18 and went to write it to the log. Now the same document has two different histories. Which one is right? To avoid this, both servers would have to lock and coordinate with each other for every op: an extra network round trip for every keystroke.', parallel: true, go: ['s1>log', 's2>log'], after: { log: { state: 'hot', sub: 'conflict!' } } },
          { title: 'Fix: route by doc_id', text: 'The router sends all connections for doc 42 to srv 1. One owner, one order, no cross-server locks. The load still has to be spread, so different documents go to different servers.', set: { s2: { sub: 'other docs', state: '' }, log: { state: '', sub: 'append-only' } }, go: 'a>lb>s1' },
        ]},
        { name: 'Session server crash', steps: [
          { title: 'Srv 1 died', text: 'The machine is gone. Riya\'s and Aman\'s WebSockets broke. Their screens show "reconnecting...", and their unacknowledged ops are safe in a local pending list.', set: { s1: { state: 'down', sub: 'DOWN' } }, go: ['lost:r>lb', 'lost:a>lb'] },
          { title: 'New owner', text: 'The health check fails. The router/registry gives doc 42 to srv 2 (through a lease, which is a "permission to be the owner" for a few seconds that must be renewed; or through the next server on the consistent hashing ring).', set: { s2: { sub: 'doc 42 owner (new)' } }, focus: ['lb', 's2'] },
          { title: 'Rebuild the state', text: 'Srv 2 loads the latest snapshot (rev 5000), then replays every op from rev 5001 to the last rev from the op log. The document in memory is again exactly what it was before the crash.', go: ['s2>snap', 'res:snap>s2', 's2>log', 'res:log>s2'], msg: 'load snapshot@5000; replay ops 5001..5212' },
          { title: 'Clients reconnect', text: 'The clients connect to the new server and say "the last rev I saw was 5210". The server sends them the ops in between, and accepts their pending ops (with their old base_rev) after transforming them. No acknowledged edit was lost.', parallel: true, go: ['r>lb>s2', 'a>lb>s2'], after: { s2: { state: 'ok' } } },
        ]},
        { name: 'Making a snapshot', steps: [
          { title: 'Ops are piling up', text: 'Doc 42 gets hundreds of thousands of ops in a month. Replaying all of them every time it opens would be slow.', focus: ['log'] },
          { title: 'Write a snapshot', text: 'Every few thousand ops (or every time interval), the session server encodes the whole document and writes it to object storage, with the rev number. According to Figma\'s 2022 post, their server wrote the whole file, binary-encoded and compressed, to S3 every 30-60 seconds (a checkpoint).', go: ['s1>snap', 'res:snap>s1'], msg: 'PUT snapshots/42@5000.bin' },
          { title: 'Old ops?', text: 'The ops before the snapshot are no longer needed for replay. Keep them if you want version history (cheap cold storage); otherwise remove them with compaction (cleaning out old ops that are no longer useful).', focus: ['log', 'snap'] },
        ]},
      ],
    },
    { type: 'h2', text: 'Deep dive 1: concurrent edits, naive vs OT vs CRDT' },
    { type: 'p', html: `One owner server does give us an order, but the real difficulty is still ahead. Riya and Aman both apply their edits <em>to their own screens right away</em> (otherwise typing would lag). So when Aman's op reaches Riya, Riya's document <strong>has already changed</strong>. Aman's "position 7" may now point to the wrong place in Riya's document. Google's 2010 post used this same kind of example: one user added 2 characters at the start, the other user's delete op was applied without changing it, and the wrong characters got deleted.` },
    { type: 'callout', tone: 'term', title: 'New word: Operational Transformation (OT)', html: `<strong>What it is:</strong> <strong>adjusting (transforming)</strong> an incoming op, based on the ops that were applied after that op was made but before it arrived.<br><strong>Example:</strong> Aman's <code>insert "hot " @7</code> arrives, but Riya has already put "green " (6 characters) at position 7. So on Riya's copy, move Aman's op 6 places forward: <code>@13</code>. The same goes for deletes: if someone first deleted 5 characters, the positions after them move 5 places back.<br><strong>Why we need it:</strong> a position is a moving target; after someone else's edit, the same number points to a different character.<br><strong>Without it:</strong> text lands in the wrong place, the wrong characters get deleted, and the copies drift apart.<br>Google Docs described this approach in 2010: transform rules for every pair of InsertText, DeleteText and ApplyStyle.` },
    { type: 'callout', tone: 'term', title: 'New word: tie-break rule', html: `<strong>What it is:</strong> a fixed rule that decides whose text comes first when two people type at <em>exactly the same position</em> at the same time. For example "the user with the smaller ID goes on the left".<br><strong>Why we need it:</strong> in this situation there is no "right" answer. Every copy just has to give the <em>same</em> answer.<br><strong>Without it:</strong> every screen would put its own text first, and the copies would differ.` },
    { type: 'h3', text: 'OT step by step: play both users yourself' },
    { type: 'p', html: `Below is a small editor where you are <strong>both Riya and Aman</strong>. Choose an op for each one (insert or delete, where, and what). Then press "Next step" and watch each message move: both apply their op to their own screen right away, one op reaches the server first, the other one is transformed, and at the end you see whether all three copies (Riya, server, Aman) match. Switch to "Naive" to see what happens without transforming.` },
    { type: 'custom', render(el) {
      const box = 'border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)';
      const ctl = (u, nm) => `<div style="${box}"><div style="font-weight:600">${nm}'s op</div>
          <div class="chips docs-k${u}" style="padding:0;margin:4px 0"><button type="button" class="chip" data-v="ins">Insert</button><button type="button" class="chip" data-v="del">Delete</button></div>
          <label>Position: <strong class="docs-pv${u}"></strong></label><input class="docs-p${u}" type="range" min="0" max="10" step="1" style="width:100%">
          <div class="docs-ti${u}"><label>Text (max 8)</label><input class="docs-t${u}" type="text" maxlength="8" style="width:100%;font-family:var(--f-mono)"></div>
          <div class="docs-li${u}"><label>How many characters: <strong class="docs-lv${u}"></strong></label><input class="docs-l${u}" type="range" min="1" max="4" step="1" style="width:100%"></div>
          <div class="docs-pr${u}" style="font-family:var(--f-mono);font-size:13px;margin-top:6px;white-space:pre-wrap"></div></div>`;
      const scr = (c, nm) => `<div style="${box}"><div style="font-weight:600">${nm}</div><div class="${c}" style="font-family:var(--f-mono);font-size:14px;white-space:pre-wrap;margin-top:4px"></div></div>`;
      el.innerHTML = `<div class="chips docs-om" style="padding:0"><button type="button" class="chip on" data-v="ot">OT (transform)</button><button type="button" class="chip" data-v="naive">Naive (apply op as it came)</button></div>
        <div class="chips docs-of" style="padding:0;margin-top:6px"><button type="button" class="chip on" data-v="A">Riya's op reaches the server first</button><button type="button" class="chip" data-v="B">Aman's op first</button></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:10px">${ctl('A', 'Riya')}${ctl('B', 'Aman')}</div>
        <div style="margin:10px 0;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn small primary docs-onx">Next step</button><button type="button" class="btn small ghost docs-ors">Start over</button><span class="docs-ost" style="align-self:center;color:var(--ink-3)"></span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">${scr('docs-sa', "Riya's screen")}${scr('docs-ss', 'Server (owner)')}${scr('docs-sb', "Aman's screen")}</div>
        <ol class="docs-olog" style="margin:10px 0 0;padding-left:20px;line-height:1.6"></ol>
        <div class="docs-ov" style="margin-top:8px;font-weight:700;font-size:17px"></div>`;
      const DOC = 'I like tea', L = DOC.length, NM = { A: 'Riya', B: 'Aman' };
      const U = { A: { t: 'ins', pos: 7, text: 'green ', len: 2 }, B: { t: 'ins', pos: 7, text: 'hot ', len: 2 } };
      let mode = 'ot', first = 'A', step = 0;
      const ap = (s, o) => o.t === 'ins' ? s.slice(0, o.pos) + o.text + s.slice(o.pos) : s.slice(0, o.pos) + s.slice(o.pos + o.len);
      const apL = (s, l) => l.reduce(ap, s);
      // transform o against p (p already applied). Returns a list of ops. Same position insert: Riya (A) goes left.
      const xf = (o, p) => { o = Object.assign({}, o);
        if (o.t === 'ins' && p.t === 'ins') { if (p.pos < o.pos || (p.pos === o.pos && p.site < o.site)) o.pos += p.text.length; return [o]; }
        if (o.t === 'ins') { const p2 = p.pos + p.len; if (o.pos >= p2) o.pos -= p.len; else if (o.pos > p.pos) o.pos = p.pos; return [o]; }
        const o2 = o.pos + o.len;
        if (p.t === 'ins') { if (p.pos <= o.pos) { o.pos += p.text.length; return [o]; } if (p.pos >= o2) return [o];
          return [{ t: 'del', pos: p.pos + p.text.length, len: o2 - p.pos, site: o.site }, { t: 'del', pos: o.pos, len: p.pos - o.pos, site: o.site }]; }
        const p2 = p.pos + p.len, ov = Math.max(0, Math.min(o2, p2) - Math.max(o.pos, p.pos)), len = o.len - ov;
        if (!len) return [];
        return [{ t: 'del', pos: o.pos < p.pos ? o.pos : (o.pos >= p2 ? o.pos - p.len : p.pos), len, site: o.site }]; };
      const op = u => { const s = U[u]; return s.t === 'ins' ? { t: 'ins', pos: s.pos, text: s.text, site: u } : { t: 'del', pos: s.pos, len: Math.min(s.len, L - s.pos), site: u }; };
      const os = o => o.t === 'ins' ? `insert "${o.text}" @${o.pos}` : `delete ${o.len} @${o.pos}`;
      const osL = l => l.length ? l.map(os).join(' + ') : 'nothing (those characters were already deleted)';
      const q = s => '"' + s + '"';
      const sync = u => { const s = U[u];
        el.querySelectorAll('.docs-k' + u + ' .chip').forEach(c => c.classList.toggle('on', c.dataset.v === s.t));
        const pr = el.querySelector('.docs-p' + u); pr.max = s.t === 'ins' ? L : L - 1; if (s.pos > +pr.max) s.pos = +pr.max; pr.value = s.pos;
        el.querySelector('.docs-pv' + u).textContent = s.pos;
        el.querySelector('.docs-ti' + u).style.display = s.t === 'ins' ? '' : 'none';
        el.querySelector('.docs-li' + u).style.display = s.t === 'del' ? '' : 'none';
        el.querySelector('.docs-lv' + u).textContent = Math.min(s.len, L - s.pos);
        const o = op(u);
        el.querySelector('.docs-pr' + u).innerHTML = o.t === 'ins' ? DOC.slice(0, o.pos) + '<strong style="color:var(--accent)">' + (o.text || '∅') + '</strong>' + DOC.slice(o.pos) : DOC.slice(0, o.pos) + '<s style="color:var(--red)">' + DOC.slice(o.pos, o.pos + o.len) + '</s>' + DOC.slice(o.pos + o.len); };
      const run = () => {
        const F = first, S = F === 'A' ? 'B' : 'A', oF = op(F), oS = op(S), ot = mode === 'ot';
        const sp = ot ? xf(oS, oF) : [oS], fp = ot ? xf(oF, oS) : [oF];
        const r = { F, S, oF, oS, sp, fp, s1: ap(DOC, oF), s2: apL(ap(DOC, oF), sp), fFin: apL(ap(DOC, oF), sp), sFin: apL(ap(DOC, oS), fp) };
        r.loc = { A: ap(DOC, op('A')), B: ap(DOC, op('B')) };
        return r; };
      const STEPS = 6;
      const upd = () => {
        const r = run(), F = NM[r.F], S = NM[r.S], ot = mode === 'ot';
        const scr = { A: DOC, B: DOC }, rv = { A: 17, B: 17 }; let srv = DOC, srev = 17;
        const log = [];
        if (step >= 1) { scr.A = r.loc.A; scr.B = r.loc.B; log.push(`Both applied their op to their own screen <strong>right away</strong> (no waiting for the network), and sent it to the server: <code>base_rev 17</code>.`); }
        if (step >= 2) { srv = r.s1; srev = 18; log.push(`${F}'s op reached the server first. Its base_rev 17 = the server's rev 17, nothing came in between, so apply it as it is: <code>${os(r.oF)}</code> → <strong>rev 18</strong>.`); }
        if (step >= 3) { srv = r.s2; srev = 19; log.push(ot ? `${S}'s op arrived with base_rev 17, but the server is at rev 18. ${S} had not seen rev 18 (${F}'s op), so the server transforms it: <code>${os(r.oS)}</code> → <code>${osL(r.sp)}</code>${osL(r.sp) === os(r.oS) ? ' (no change needed this time)' : ''} → <strong>rev 19</strong>.` : `${S}'s op arrived. The naive server applies it without adjusting: <code>${os(r.oS)}</code> → rev 19.`); }
        if (step >= 4) { scr[r.F] = r.fFin; rv[r.F] = 19; log.push(`The server sends ${F} the ack (rev 18), then the rev 19 op: <code>${osL(r.sp)}</code>. It is applied on ${F}'s screen.`); }
        if (step >= 5) { scr[r.S] = r.sFin; rv[r.S] = 19; log.push(ot ? `The server sends ${S} rev 18 (${F}'s op). ${S}'s own op is still on its way (no ack yet), so ${S}'s browser also transforms: <code>${os(r.oF)}</code> → <code>${osL(r.fp)}</code>${osL(r.fp) === os(r.oF) ? ' (no change needed this time)' : ''}. Then the ack: rev 19.` : `${S} got ${F}'s op as it was: <code>${os(r.oF)}</code>. ${S} applied it directly.`); }
        const same = scr.A === srv && scr.B === srv;
        if (step >= 6) log.push(same ? `All three copies are the same, and nobody's text was lost.` : `The copies are different! Every later op will also land in the wrong place.`);
        el.querySelector('.docs-sa').textContent = q(scr.A) + '\nrev ' + rv.A;
        el.querySelector('.docs-ss').textContent = q(srv) + '\nrev ' + srev;
        el.querySelector('.docs-sb').textContent = q(scr.B) + '\nrev ' + rv.B;
        el.querySelector('.docs-olog').innerHTML = log.map(x => '<li>' + x + '</li>').join('');
        el.querySelector('.docs-ost').textContent = `Step ${step}/${STEPS}`;
        el.querySelector('.docs-onx').disabled = step >= STEPS;
        const v = el.querySelector('.docs-ov');
        v.textContent = step < STEPS ? '' : same ? 'Converged: Riya, server and Aman, all three the same' : 'Diverged: the copies are DIFFERENT';
        v.style.color = same ? 'var(--green)' : 'var(--red)'; };
      const reset = () => { step = 0; upd(); };
      ['A', 'B'].forEach(u => {
        el.querySelectorAll('.docs-k' + u + ' .chip').forEach(c => c.addEventListener('click', () => { U[u].t = c.dataset.v; sync(u); reset(); }));
        el.querySelector('.docs-p' + u).addEventListener('input', e => { U[u].pos = +e.target.value; sync(u); reset(); });
        el.querySelector('.docs-l' + u).addEventListener('input', e => { U[u].len = +e.target.value; sync(u); reset(); });
        const ti = el.querySelector('.docs-t' + u); ti.value = U[u].text; ti.addEventListener('input', () => { U[u].text = ti.value; sync(u); reset(); });
        el.querySelector('.docs-l' + u).value = U[u].len; sync(u); });
      const pick = (sel, f) => el.querySelectorAll(sel + ' .chip').forEach(c => c.addEventListener('click', () => { el.querySelectorAll(sel + ' .chip').forEach(x => x.classList.toggle('on', x === c)); f(c.dataset.v); reset(); }));
      pick('.docs-om', v => { mode = v; }); pick('.docs-of', v => { first = v; });
      el.querySelector('.docs-onx').addEventListener('click', () => { if (step < STEPS) step++; upd(); });
      el.querySelector('.docs-ors').addEventListener('click', reset);
      upd();
    }},
    { type: 'p', html: `Things to try: (1) Run OT with the defaults, then Naive. (2) Make Riya's op "Delete, position 2, 4 characters" (delete "like") and Aman's "Insert 'very ' @7": with OT, "very " survives in the right place. (3) Let both delete the same range: with OT it is deleted only once, not twice. (4) Put Aman's insert <em>inside</em> Riya's delete range: on Aman's side, Riya's delete is split into two pieces, so Aman's text survives.` },
    { type: 'h3', text: 'CRDT: in plain words' },
    { type: 'p', html: `OT decides the order in one place (the server) and adjusts positions. There is another way: <strong>do not use positions at all</strong>. Think of a class where every student has a roll number. "The student on the third bench" can change (someone sat in front), but "roll number 12" is always the same student. A CRDT gives every character of the text a permanent name like that.` },
    { type: 'callout', tone: 'term', title: 'New word: CRDT (for text)', html: `<strong>What it is:</strong> CRDT = Conflict-free Replicated Data Type. A data structure where you can apply every copy's ops <em>in any order</em>, and in the end all copies become the same. A text CRDT gives every character a <strong>permanent unique ID</strong>, like <code>12@A</code> (user A's 12th character). An insert says "put this <em>after</em> the character <code>7@0</code>", not a position. If two people insert at the same place, a fixed rule (bigger ID first) decides the order, and this rule runs the same way on every copy.<br><strong>Why we need it:</strong> an ID never changes, so no transform is needed, and merging works even without a central server (peer-to-peer, or after a long time offline).<br><strong>Without it:</strong> either OT (needs a central order) or LWW (text disappears).<br>In the <a href="#/consistency">Consistency lesson</a> we saw the basic CRDT idea (a G-counter); this is its bigger sibling for text.` },
    { type: 'callout', tone: 'term', title: 'New word: tombstone', html: `<strong>What it is:</strong> in a CRDT, a delete does not really remove the character. It only marks it as "deleted" (it is not shown on screen), like striking out a line in a book instead of tearing out the page.<br><strong>Why we need it:</strong> someone else's insert may say "put this after <code>7@0</code>", and 7@0 was just deleted. If that character vanished, the insert would not know where to go.<br><strong>Without it:</strong> when a delete and an insert arrive together, the insert gets lost or lands in the wrong place. <strong>Cost:</strong> deleted characters still take memory, so libraries have ways to clean them up later (garbage collection).` },
    { type: 'p', html: `Now run all three ways side by side. The document is "I like tea". Riya (A) and Aman (B) edit at the same time without seeing each other's edit. Each screen applies its own op first, then the other's. Switch between the three ways:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="chips docs-sc" style="padding:0"><button type="button" class="chip on" data-v="0">Both insert at the same place</button><button type="button" class="chip" data-v="1">One delete, one insert</button></div>
        <div class="chips docs-md" style="padding:0;margin-top:6px"><button type="button" class="chip on" data-v="naive">Naive (apply op as it came)</button><button type="button" class="chip" data-v="ot">OT (transform)</button><button type="button" class="chip" data-v="crdt">CRDT (character IDs)</button></div>
        <div class="docs-ops" style="font-family:var(--f-mono);font-size:13px;margin:10px 0;line-height:1.7"></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)"><div style="font-weight:600">Riya's screen (A)</div><div class="docs-a" style="font-family:var(--f-mono);font-size:13px;line-height:1.8"></div></div>
          <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface)"><div style="font-weight:600">Aman's screen (B)</div><div class="docs-b" style="font-family:var(--f-mono);font-size:13px;line-height:1.8"></div></div>
        </div>
        <div class="docs-v" style="margin-top:10px;font-weight:700;font-size:17px"></div>
        <div class="docs-ids" style="font-family:var(--f-mono);font-size:12px;margin-top:6px;line-height:1.9;word-break:break-word"></div>
        <div class="calc-note o-note"></div>`;
      const DOC = 'I like tea';
      const SC = [
        { a: { t: 'ins', pos: 7, text: 'green ', site: 'A' }, b: { t: 'ins', pos: 7, text: 'hot ', site: 'B' } },
        { a: { t: 'del', pos: 2, len: 5, site: 'A' }, b: { t: 'ins', pos: 7, text: 'hot ', site: 'B' } },
      ];
      let sc = 0, md = 'naive';
      const show = s => '"' + s + '"';
      const opStr = o => o.t === 'ins' ? `insert "${o.text}" @${o.pos}` : `delete ${o.len} chars @${o.pos} ("${DOC.slice(o.pos, o.pos + o.len)}")`;
      const apply = (s, o) => o.t === 'ins' ? s.slice(0, Math.min(o.pos, s.length)) + o.text + s.slice(Math.min(o.pos, s.length)) : s.slice(0, o.pos) + s.slice(o.pos + o.len);
      // OT: transform o against p which was applied first. Tie on same position: site A goes left.
      const xf = (o, p) => { o = Object.assign({}, o);
        if (o.t === 'ins' && p.t === 'ins') { if (p.pos < o.pos || (p.pos === o.pos && p.site < o.site)) o.pos += p.text.length; }
        else if (o.t === 'ins' && p.t === 'del') { if (o.pos >= p.pos + p.len) o.pos -= p.len; else if (o.pos > p.pos) o.pos = p.pos; }
        else if (o.t === 'del' && p.t === 'ins') { if (p.pos <= o.pos) o.pos += p.text.length; } // enough for this widget's two scenarios; in real OT, an insert inside a delete range splits the delete in two so the insert survives
        return o; };
      // CRDT (RGA style): each char {id:[counter, site], ch, del}
      const gt = (x, y) => x[0] !== y[0] ? x[0] > y[0] : x[1] > y[1];
      const init = () => DOC.split('').map((ch, i) => ({ id: [i + 1, '0'], ch, del: false }));
      const toOps = (d, o) => { const vis = d.filter(e => !e.del);
        if (o.t === 'ins') { let origin = o.pos === 0 ? null : vis[o.pos - 1].id; return o.text.split('').map((ch, k) => { const id = [DOC.length + 1 + k, o.site], op = { t: 'ins', id, ch, origin }; origin = id; return op; }); }
        return vis.slice(o.pos, o.pos + o.len).map(e => ({ t: 'del', id: e.id })); };
      const cApply = (d, op) => { d = d.map(e => Object.assign({}, e)); const same = (x, y) => x && y && x[0] === y[0] && x[1] === y[1];
        if (op.t === 'del') { const e = d.find(x => same(x.id, op.id)); if (e) e.del = true; return d; }
        let i = op.origin ? d.findIndex(x => same(x.id, op.origin)) + 1 : 0;
        while (i < d.length && gt(d[i].id, op.id)) i++;
        d.splice(i, 0, { id: op.id, ch: op.ch, del: false }); return d; };
      const txt = d => d.filter(e => !e.del).map(e => e.ch).join('');
      const run = (sc, md) => { const { a, b } = SC[sc];
        if (md === 'naive') return { a1: apply(DOC, a), a2: apply(apply(DOC, a), b), b1: apply(DOC, b), b2: apply(apply(DOC, b), a), ra: b, rb: a };
        if (md === 'ot') { const ra = xf(b, a), rb = xf(a, b); return { a1: apply(DOC, a), a2: apply(apply(DOC, a), ra), b1: apply(DOC, b), b2: apply(apply(DOC, b), rb), ra, rb }; }
        const d0 = init(), oa = toOps(d0, a), ob = toOps(d0, b);
        let A = d0; oa.forEach(o => A = cApply(A, o)); const a1 = txt(A); ob.forEach(o => A = cApply(A, o));
        let B = d0; ob.forEach(o => B = cApply(B, o)); const b1 = txt(B); oa.forEach(o => B = cApply(B, o));
        return { a1, a2: txt(A), b1, b2: txt(B), dA: A }; };
      const upd = () => {
        const r = run(sc, md), { a, b } = SC[sc];
        el.querySelector('.docs-ops').innerHTML = `Start: ${show(DOC)}<br>Riya (A): ${opStr(a)}<br>Aman (B): ${opStr(b)}`;
        const recv = (o) => md === 'crdt' ? 'ID-based ops (below)' : opStr(o);
        el.querySelector('.docs-a').innerHTML = `Own op: ${show(r.a1)}<br>B's op arrived${md !== 'crdt' ? ' → ' + recv(r.ra) : ''}<br>Final: <strong>${show(r.a2)}</strong>`;
        el.querySelector('.docs-b').innerHTML = `Own op: ${show(r.b1)}<br>A's op arrived${md !== 'crdt' ? ' → ' + recv(r.rb) : ''}<br>Final: <strong>${show(r.b2)}</strong>`;
        const same = r.a2 === r.b2;
        const v = el.querySelector('.docs-v'); v.textContent = same ? 'Converged: both screens are the same' : 'Diverged: the two screens are DIFFERENT';
        v.style.color = same ? 'var(--green)' : 'var(--red)';
        el.querySelector('.docs-ids').innerHTML = md === 'crdt' ? "Characters with IDs (Riya's copy): " + r.dA.map(e => `<span style="${e.del ? 'text-decoration:line-through;color:var(--ink-3)' : ''}">[${e.ch === ' ' ? '␣' : e.ch} ${e.id[0]}@${e.id[1]}]</span>`).join(' ') : '';
        const N = {
          naive: sc === 0 ? 'Each one applied the other\'s op as it was. Two inserts at the same position, and on each screen the other person\'s text came first (it went in at position 7, before their own text): the documents are different forever. There was no error either, just a silent mistake.' : 'Riya deleted "like ", so the document got shorter. Aman\'s "@7" is now outside Riya\'s document, so "hot " went to the wrong place (the end). Aman\'s screen looks right, Riya\'s is wrong.',
          ot: sc === 0 ? 'Transform: there is a tie at the same position, and the rule is "A first (left)". On Riya\'s screen, B\'s op moved 6 places forward (@13); on Aman\'s screen, A\'s op stayed where it was (@7). Both end the same.' : 'Transform: B\'s insert @7 was after the delete range, so it moved 5 places back (@2). A\'s delete stayed where it was because the insert came after it. Both show "I hot tea". This is the "shift by N" idea from Google\'s 2010 post.',
          crdt: sc === 0 ? 'No position transform. "green " and "hot " were both put after "7@0" (the space); on a tie, the bigger ID goes first (B > A), so "hot " came first. The order could have been different, but both screens run the SAME rule and get the SAME result. Each person\'s run of characters stays together; they do not get mixed up.' : 'The delete only turned the characters into tombstones (struck out). Aman\'s insert refers to "after ␣ 7@0", which still exists in Riya\'s copy as a tombstone, so it went to the right place. Both show "I hot tea".',
        };
        el.querySelector('.o-note').textContent = N[md];
      };
      el.querySelectorAll('.docs-sc .chip').forEach(c => c.addEventListener('click', () => { el.querySelectorAll('.docs-sc .chip').forEach(x => x.classList.toggle('on', x === c)); sc = Number(c.dataset.v); upd(); }));
      el.querySelectorAll('.docs-md .chip').forEach(c => c.addEventListener('click', () => { el.querySelectorAll('.docs-md .chip').forEach(x => x.classList.toggle('on', x === c)); md = c.dataset.v; upd(); }));
      upd();
    }},
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"OT and CRDT gave different final texts (green hot vs hot green), so one of them is wrong." No. Both <strong>converged</strong>; they just use different tie-break rules. When two people type at the same place at the same time, there is no "right" order; the only thing that matters is that <em>everyone</em> sees the same order, and nobody's text is lost or put in the wrong place. A second misunderstanding: "just use last write wins". For text, LWW means one user's whole edit disappears, which is not allowed in a collaborative editor.` },
    { type: 'h3', text: 'The Google Docs collaboration protocol (from the 2010 posts)' },
    { type: 'p', html: `OT alone is not enough; we also need a protocol that says who transforms what, and when. According to the third post of Google's 2010 series:` },
    { type: 'list', items: [
      `<strong>The client remembers</strong>: the last revision number it got from the server, local changes not sent yet, changes sent but not yet acknowledged, and its own current state of the document.`,
      `<strong>The server remembers</strong>: changes that arrived but are not processed yet, the history of all processed changes (the <strong>revision log</strong>), and the current state of the document.`,
      `<strong>Only one change "in flight" at a time</strong>: until the previous change is acknowledged, new local changes wait in a pending list. The Google Wave OT whitepaper (2010) has the same rule: the client waits for the ack, and <em>composes</em> the waiting ops (joins them into one op). The benefit: the server does not need a separate state space for every client, only one history.`,
      `<strong>The server transforms</strong>: if a client's change is based on an old revision, the server transforms it against all the revisions the client has not seen, then gives it the next revision number. The client also transforms incoming changes against its own pending changes.`,
      `Benefits according to the post: typing does not depend on network speed (optimistic local apply), only the minimum change goes over the network, and the server does not need to remember any client's state, so more editors do not make the server's work more complex.`,
    ]},
    { type: 'p', html: `Google wrote that before moving to this OT-based protocol, their editor merged by comparing versions, and that in the new system "collaboration conflicts" were gone and people could see each other's edits character by character. That is a 2010 description; exactly what runs inside Google Docs today is not public.` },

    { type: 'h3', text: 'OT vs CRDT: when to use which?' },
    { type: 'table', head: ['', 'OT', 'CRDT'], rows: [
      ['Core idea', 'Ops with positions, transformed when they arrive', 'Every element has a unique ID, ops refer to IDs, merging is guaranteed by maths'],
      ['Central server', 'In practice yes (one place that decides the order); Jupiter (a 1995 Xerox research system that Wave\'s OT was built on), Wave and Google Docs are all client-server', 'Not needed: peer-to-peer, offline, sync in any order'],
      ['Where it is hard', 'Writing correct transform rules for every pair of op types; Figma called this a "combinatorial explosion"', 'Metadata: an ID per character + tombstones, more memory; interleaving bugs in some algorithms'],
      ['Offline', 'After a long time offline, many ops must be transformed', 'A natural fit: "local-first" (Automerge, Yjs)'],
      ['Real use', 'Google Docs (2010 posts), Google Wave', 'Yjs, Automerge; Figma built a central design "inspired" by CRDTs'],
    ]},
    { type: 'p', html: `<strong>Figma's choice (2019 post):</strong> Figma considered OT more complex than their problem needed. Their document is not a text editor; it is a tree of objects: <code>Map&lt;ObjectID, Map&lt;Property, Value&gt;&gt;</code>. They took inspiration from CRDTs, but with a <strong>central server</strong> (because their server is the authority anyway), and <strong>last-writer-wins</strong> for each property: if two people change the colour of the same object at the same time, whichever reaches the server later wins. That is not fine for text (one person's whole text would vanish), but it is perfectly fine for the properties of shapes. Lesson: <em>choose the merge strategy by looking at the shape of your data</em>.` },
    { type: 'callout', tone: 'why', title: 'Interview depth: the "hard parts" of CRDTs', html: `Martin Kleppmann's 2019 paper (PaPoC) showed that some published text CRDT algorithms have an <strong>interleaving anomaly</strong>: if two people type whole words at the same place, the characters can get mixed together (something like "ghroeteen"). According to their code, this appeared in Logoot and LSEQ, but not in RGA (our widget works like RGA, which is why "hot " and "green " stayed cleanly apart). His 2020 talk "CRDTs: The Hard Parts" covers more problems: moving list items, moving things inside a tree (cycles), and reducing metadata overhead (Automerge's columnar encoding). So a CRDT is not a "free lunch": you must choose the right algorithm and manage memory.` },
    { type: 'h2', text: 'Deep dive 2: operation log + snapshots' },
    { type: 'p', html: `According to Google's 2010 post, Google Docs saved a document as a <strong>revision log</strong>: edits did not change the underlying characters directly; they were added to the end of the log, and to show the document, the log was replayed from the start. This is the <a href="#/pattern-writes">append-only log</a> pattern, and it has three benefits: version history for free, easy rebuilding of the state after a crash, and the order of the ops is the truth of the document.` },
    { type: 'p', html: `Problem: an old document with 1 million ops. Replay 1 million ops every time it opens? Slow. Fix: a <strong>snapshot</strong> (checkpoint): every K ops, save a copy of the whole document with its rev number. To open: latest snapshot + the ops after it. Figma's 2022 post is a real example: earlier, their server wrote a checkpoint of the whole file to S3 every 30-60 seconds, so in a crash up to 60 seconds of work was at risk. They added a <strong>journal</strong> (a write-ahead log on DynamoDB, with a growing sequence number for every change). According to the post, 95% of edits are saved durably within 600 ms, and on restart the server loads the latest checkpoint and replays the journal entries after it. Change K yourself (suppose: replay speed 100,000 ops/s, snapshot load 20 ms, document 200 KB, 10 ops/s on one active doc):` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label for="docs-n">Total ops in the document's history: <strong class="o-nv"></strong></label><input id="docs-n" type="range" min="0" max="4" step="1" value="3"></div>
          <div><label for="docs-k">Snapshot every how many ops: <strong class="o-kv"></strong></label><input id="docs-k" type="range" min="0" max="5" step="1" value="2"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Replay on open (worst)</span><strong class="o-rp"></strong></div>
          <div class="stat"><span>Open time (worst)</span><strong class="o-ot"></strong></div>
          <div class="stat"><span>Snapshots (if all kept)</span><strong class="o-sc"></strong></div>
          <div class="stat"><span>Snapshot writes / hour</span><strong class="o-sh"></strong></div>
        </div>
        <div class="calc-note o-note"></div>`;
      const NS = [1e3, 1e4, 1e5, 1e6, 1e7], KS = [100, 1000, 10000, 100000, 1e6, Infinity];
      const RATE = 1e5, LOADMS = 20, KB = 200, OPS = 10;
      const f = n => n >= 1e6 ? (n / 1e6) + 'M' : n >= 1e3 ? (n / 1e3) + 'k' : String(n);
      const t = ms => ms >= 1000 ? (ms / 1000).toFixed(1) + ' s' : Math.round(ms) + ' ms';
      const upd = () => {
        const N = NS[Number(el.querySelector('#docs-n').value)], K = KS[Number(el.querySelector('#docs-k').value)];
        el.querySelector('.o-nv').textContent = f(N); el.querySelector('.o-kv').textContent = K === Infinity ? 'never' : f(K);
        const has = K !== Infinity && K <= N, replay = has ? K - 1 : N, ms = (has ? LOADMS : 0) + replay / RATE * 1000;
        const cnt = has ? Math.floor(N / K) : 0, perHr = K === Infinity ? 0 : 3600 * OPS / K;
        el.querySelector('.o-rp').textContent = replay.toLocaleString('en-IN') + ' ops';
        el.querySelector('.o-ot').textContent = t(ms);
        const mb = cnt * KB / 1e3;
        el.querySelector('.o-sc').textContent = cnt.toLocaleString('en-IN') + (cnt ? (mb >= 1000 ? ` (${(mb / 1000).toFixed(1)} GB)` : ` (${mb.toFixed(1)} MB)`) : '');
        el.querySelector('.o-sh').textContent = perHr >= 1 ? Math.round(perHr) : perHr > 0 ? perHr.toFixed(2) : '0';
        el.querySelector('.o-note').textContent = !has
          ? `No snapshot: replay all ${f(N)} ops every time, ${t(ms)}. ${ms > 2000 ? 'The user will not wait that long, and after a server restart every document needs this work at the same time!' : 'Fine for a small doc, but it will get slow as the history grows.'}`
          : `Snapshot every ${f(K)} ops: at most ${replay.toLocaleString('en-IN')} ops to replay on open, ~${t(ms)}. Cost: ${cnt.toLocaleString('en-IN')} snapshots × 200 KB, and ~${perHr >= 1 ? Math.round(perHr) : perHr.toFixed(2)} snapshot writes per hour on an active doc. ${K <= 100 ? 'Snapshots too often: fast open, but storage and write load grow for nothing.' : K >= 1e5 ? 'Few snapshots: cheap storage, but slow open and recovery.' : 'A good balance: fast open, reasonable storage.'} If you want, keep only a few old snapshots (for version history) and remove the rest.`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'warn', title: 'When should the ack be sent?', html: `If the server applies the op only in memory, sends the ack, and then crashes, the user will think the edit was saved, but it is gone. So: <strong>first a durable write to the op log, then the ack</strong>. The cost: every op pays the latency of one durable write. Figma's journal cut the server-side durable save time from ~60 seconds (the gap between checkpoints) to within 600 ms for most edits. This is the same idea as the <a href="#/db-internals">write-ahead log</a> in databases.` },
    { type: 'h3', text: 'Version history: "show me yesterday evening\'s version"' },
    { type: 'p', html: `In Google Docs you can click "Last edit" to see older versions, restore them, or make a copy of one. You can also give a version a name ("Final draft"); according to Google's help page, a document can have up to 40 named versions. The same page also says that older versions are sometimes merged together, and that you need edit permission to see the version history.` },
    { type: 'p', html: `In our design this feature is almost free, because the op log already has every change with its rev number and user:` },
    { type: 'list', items: [
      `<strong>Showing the document at rev N:</strong> take the nearest snapshot before N, then replay the ops up to N. That is all.`,
      `<strong>"Who changed what":</strong> every op has its user written next to it. The UI groups one user's continuous ops into one "version" (not one version per keystroke).`,
      `<strong>Named version:</strong> a small record "rev 5 = First draft". Never delete the snapshots of such versions.`,
      `<strong>Restore:</strong> write the old content on top as a new op (the rev keeps growing). This way the history in between is not erased, and the editors who are online just receive one more op. (This is a common design choice; exactly how Google does it inside is not public.)`,
    ]},
    { type: 'custom', render(el) {
      el.innerHTML = `<label for="docs-vh">Version (rev): <strong class="docs-vn"></strong></label><input id="docs-vh" type="range" min="0" max="12" step="1" value="12" style="width:100%">
        <div class="docs-vbar" style="display:flex;gap:3px;margin:6px 0;flex-wrap:wrap"></div>
        <div style="border:1px solid var(--line);border-radius:var(--r);padding:10px;background:var(--surface);font-family:var(--f-mono);font-size:14px;white-space:pre-wrap" class="docs-vd"></div>
        <div class="stats"><div class="stat"><span>Who / what</span><strong class="docs-vw"></strong></div><div class="stat"><span>Start from</span><strong class="docs-vs"></strong></div><div class="stat"><span>Ops to replay</span><strong class="docs-vr"></strong></div></div>
        <div class="calc-note docs-vnote"></div>`;
      const OPS = [
        ['Riya', 'ins', 0, 'Trip plan'], ['Riya', 'ins', 9, ': Goa'], ['Aman', 'ins', 14, ' in May'], ['Aman', 'del', 11, 3], ['Aman', 'ins', 11, 'Manali'],
        ['Riya', 'ins', 24, ', budget 20k'], ['Riya', 'del', 17, 7], ['Riya', 'ins', 17, ' in June'], ['Aman', 'ins', 0, 'Final '],
        ['Aman', 'del', 40, 3], ['Aman', 'ins', 40, '25k'], ['Riya', 'ins', 43, '!'],
      ];
      const K = 4, NAMED = { 5: 'First draft', 9: 'Final' };
      const ap = (s, o) => o[1] === 'ins' ? s.slice(0, o[2]) + o[3] + s.slice(o[2]) : s.slice(0, o[2]) + s.slice(o[2] + o[3]);
      const docAt = n => OPS.slice(0, n).reduce(ap, '');
      const bar = el.querySelector('.docs-vbar');
      bar.innerHTML = Array.from({ length: 13 }, (_, i) => `<span class="docs-vc" style="flex:1;min-width:18px;text-align:center;font-size:11px;padding:3px 0;border-radius:var(--r-sm);border:1px solid var(--line)">${i % K === 0 ? '▣' : ''}${NAMED[i] ? '★' : ''}${i}</span>`).join('');
      const upd = () => {
        const n = Number(el.querySelector('#docs-vh').value), snap = Math.floor(n / K) * K, o = OPS[n - 1];
        el.querySelector('.docs-vn').textContent = n + (NAMED[n] ? ' ("' + NAMED[n] + '")' : '');
        el.querySelector('.docs-vd').textContent = '"' + docAt(n) + '"';
        el.querySelector('.docs-vw').textContent = n === 0 ? 'empty document' : o[0] + ': ' + (o[1] === 'ins' ? `insert "${o[3]}" @${o[2]}` : `delete ${o[3]} @${o[2]}`);
        el.querySelector('.docs-vs').textContent = snap === 0 ? 'rev 0 (empty)' : 'snapshot @ rev ' + snap;
        el.querySelector('.docs-vr').textContent = (n - snap) + ' ops';
        bar.querySelectorAll('.docs-vc').forEach((c, i) => { c.style.background = i === n ? 'var(--accent-soft)' : i >= snap && i <= n ? 'var(--surface-2)' : ''; c.style.fontWeight = i === n ? '700' : ''; });
        el.querySelector('.docs-vnote').textContent = `To show rev ${n}: take ${snap === 0 ? 'the empty document' : 'the snapshot of rev ' + snap + ' (▣)'}, then replay ${n - snap} op${n - snap === 1 ? '' : 's'}. There is a snapshot every ${K} revs, so you never replay more than ${K - 1} ops. ★ = named version; its snapshot is never deleted.`;
      };
      el.querySelector('#docs-vh').addEventListener('input', upd); upd();
    }},
    { type: 'h2', text: 'Deep dive 3: presence, offline and permissions' },
    { type: 'p', html: `<strong>Presence</strong> (who is in the document, where each cursor is, who selected what) is completely different data from edits: it changes very often (every mouse move, every arrow key), and it <strong>does not need to be saved</strong>. Nobody cares where someone's cursor was yesterday. That is why we do not put it in the op log. The Yjs library docs say the same: their "awareness" feature sends cursors, names and colours, it is not stored in the document, and a user's awareness state is removed as soon as they disconnect.` },
    { type: 'p', html: `In big systems, WebSocket connections often end on separate <strong>gateway</strong> servers (like in the <a href="#/design-whatsapp">WhatsApp</a> lesson), and the document's session server is a different machine. Then a <strong>pub/sub channel per document</strong> (like a Redis pub/sub channel named <code>doc:42</code>) fits presence well: every gateway that has a user in doc 42 subscribes to that channel. Cursor updates are also <strong>throttled</strong>, and if one update is lost, the next one is already on its way. This is a common industry approach; Google has not published details of its presence system.` },
    { type: 'callout', tone: 'term', title: 'New words: gateway, pub/sub, throttle', html: `<strong>Gateway</strong><br><strong>What it is:</strong> the server where users' WebSocket connections end. It passes messages on to the right service inside.<br><strong>Why we need it:</strong> holding millions of open connections is a separate job. Document session servers should do document work only, not connection work.<br><strong>Without it:</strong> every session server would have to hold every user's connection, and if one doc's users were on different gateways, joining them up would be hard.<br><br><strong>Pub/sub (publish/subscribe)</strong><br><strong>What it is:</strong> a message board. Someone puts a message on the "doc:42" channel (publish), and everyone listening to that channel (subscribe) gets a copy right away.<br><strong>Why we need it:</strong> Riya's gateway does not know which gateway Aman is on. Put the message on the channel, and the right gateways pick it up themselves.<br><strong>Without it:</strong> every gateway would have to talk to every other gateway.<br><br><strong>Throttle</strong><br><strong>What it is:</strong> a limit of one update per time interval. For example, the cursor position is sent once every few dozen milliseconds, not on every keystroke.<br><strong>Why we need it:</strong> moving the mouse creates about 60 updates per second. Sending all of them fills the network and servers for no reason.<br><strong>Without it:</strong> on a doc with 100 editors, cursor updates alone would slow down the real edits.` },
    { type: 'flow', title: 'Presence, edits, permissions and offline', height: 340,
      nodes: [
        { id: 'r', label: 'Riya', sub: 'browser', x: 70, y: 175, w: 110, kind: 'client', info: 'What it is: Riya\'s browser. It holds the local copy of the document, the list of pending ops (not yet accepted by the server), and the last seen rev.' },
        { id: 'ga', label: 'Gateway A', sub: 'WebSockets', x: 215, y: 175, w: 120, kind: 'edge', info: 'What it is: the server where Riya\'s WebSocket connection ends. Why: holding millions of open connections is one job, document work is another. It forwards edits to the doc\'s session server, and presence to the pub/sub channel.' },
        { id: 'ps', label: 'Pub/sub', sub: 'channel doc:42', x: 395, y: 60, w: 150, kind: 'queue', info: 'What it is: a message board where everyone listening to the "doc:42" channel gets every message. One channel per document for presence. Fire-and-forget: if some updates are lost it is fine, the next update is coming. Nothing goes to disk.' },
        { id: 'ss', label: 'Doc session', sub: 'doc 42 owner', x: 395, y: 175, w: 150, kind: 'server', info: 'What it is: the session server (owner) of doc 42. It orders ops (rev), transforms them, writes them to the op log, and broadcasts them to all gateways. Before every op it checks the user\'s role (from a cache).' },
        { id: 'acl', label: 'Permissions', sub: 'viewer/editor', x: 395, y: 295, w: 150, kind: 'data', info: 'What it is: the database that says which user/group/link has which role: viewer, commenter, editor (Google Drive\'s sharing roles are the same three). Check on session join, keep it in a cache, and tell the session right away when a role changes.' },
        { id: 'gb', label: 'Gateway B', sub: 'WebSockets', x: 590, y: 175, w: 120, kind: 'edge', info: 'What it is: the second gateway server, where Aman\'s WebSocket is connected. It subscribed to the doc 42 channel because one of its users is in doc 42.' },
        { id: 'a', label: 'Aman', sub: 'browser', x: 650, y: 290, w: 110, kind: 'client', info: 'What it is: Aman\'s browser. Both Riya\'s edits and her cursor show up here.' },
      ],
      edges: [{ a: 'r', b: 'ga' }, { a: 'ga', b: 'ps' }, { a: 'ga', b: 'ss' }, { a: 'gb', b: 'ps' }, { a: 'gb', b: 'ss' }, { a: 'gb', b: 'a' }, { a: 'ss', b: 'acl' }],
      scenarios: [
        { name: 'Cursor move (presence)', steps: [
          { title: 'Riya\'s cursor moved', text: 'A throttled presence update. It does not go to the session server or the op log.', go: 'r>ga>ps', msg: '{ type: "presence", user: "riya", cursor: 11, color: "violet" }', set: { ss: { state: 'dim' } } },
          { title: 'Fan-out from the channel', text: 'To every gateway subscribed to doc 42. Aman sees Riya\'s violet cursor.', go: 'evt:ps>gb>a', after: { ss: { state: '' } } },
        ]},
        { name: 'Edit op', steps: [
          { title: 'Riya typed', text: 'Shown on her own screen right away. The op goes from the gateway to the doc session.', go: 'r>ga>ss', msg: '{ op: insert "hot " @7, base_rev: 120 }' },
          { title: 'Role check + order', text: 'Riya is an editor (from the cache). The op gets rev 121, is written durably to the op log, then ack + broadcast.', go: ['ss>acl', 'res:acl>ss'], set: { ss: { sub: 'rev 121' } } },
          { title: 'To everyone', parallel: true, go: ['res:ss>ga>r', 'ss>gb>a'], text: 'Riya gets the ack, Aman gets the op.' },
        ]},
        { name: 'A viewer tries to edit', intro: 'The owner changed Riya\'s role from editor to viewer, but Riya\'s tab is still open.', steps: [
          { title: 'Role changed', text: 'The permissions service sent the session an event: riya is now a viewer. The cache is updated right away.', go: 'acl>ss', after: { acl: { sub: 'riya = viewer' } } },
          { title: 'Riya tries to type', text: 'The old UI still looked editable, so an op came in.', go: 'r>ga>ss' },
          { title: 'Reject', text: 'The check always happens on the server; the client is not trusted. The op is rejected, the client undoes its local change (rollback), and the UI becomes read-only.', go: 'bad:ss>ga>r', msg: '{ type: "error", code: "PERMISSION_DENIED", client_op_id: "r-77" }', after: { acl: { sub: 'viewer/editor' } } },
        ]},
        { name: 'Offline and back', steps: [
          { title: 'Internet gone', text: 'Riya is on a train. The connection broke, but the editor kept working.', go: 'lost:r>ga', set: { r: { state: 'warn', sub: 'offline' } } },
          { title: 'Offline typing', text: 'Riya wrote 3 paragraphs. All of it was applied to her local copy, and the ops are in the pending list (also in browser storage, so they survive even if the tab is closed). Meanwhile Aman also made 40 ops: rev 121 to 160.', focus: ['r'], set: { r: { sub: '35 ops pending' } }, flood: { paths: ['a>gb>ss'], n: 4 } },
          { title: 'Reconnect: "I saw up to 120"', text: 'Riya connects and says her last rev was 120. The server sends rev 121-160; Riya\'s client transforms them against her pending ops.', go: ['r>ga>ss', 'res:ss>ga>r'], msg: 'resume { last_rev: 120 }  ←  ops 121..160' },
          { title: 'Send the pending ops', text: 'Then Riya\'s 35 ops go out (one by one, or composed together), the server gives them revs from 161 onward, and broadcasts them to Aman. Both converge.', go: ['r>ga>ss', 'ss>gb>a'], after: { r: { state: 'ok', sub: 'synced' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'term', title: 'New word: offline edits (pending queue)', html: `<strong>What it is:</strong> the editor keeps working even when the internet is gone. Every new op is applied to the screen and collected in a "pending" list, also in the browser's own storage (so it survives even if the tab is closed).<br><strong>Why we need it:</strong> trains, flights, weak WiFi. The user's work should not stop.<br><strong>Without it:</strong> the editor stops the moment the connection breaks, or whatever was typed is lost.<br><strong>When coming back:</strong> the client says "I have seen up to rev 120". The server sends the ops in between, the client combines them with its pending ops (transform in OT, direct merge in a CRDT), and then sends its pending ops.` },
    { type: 'p', html: `<strong>Offline in the real world:</strong> according to Figma's 2019 post, on reconnect the client downloads a fresh copy of the document, re-applies its offline edits on top of it, and then normal syncing starts. In Google's 2010 protocol, the client remembers its "last synced revision", which is enough to resume. CRDT libraries (Automerge, Yjs) are designed for offline from the ground up: according to the Automerge docs, users can keep working separately, and their changes merge automatically once they connect. A long time offline is expensive in OT (many ops to transform), and natural in a CRDT.` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"I did the permission check in the UI, the button is disabled, that is enough." No. Anyone can send an op over the WebSocket from the browser console. The <strong>server</strong> must check the role for every op (from a cache, so it is fast), and running sessions must learn about a role change right away. Link sharing ("anyone with the link") is also a principal that gets a role.` },
    { type: 'h2', text: 'Failure scenarios and bottlenecks' },
    { type: 'callout', tone: 'term', title: 'New words: split brain, lease, checksum', html: `<strong>Split brain</strong>: two servers both believe "I am the owner of doc 42" (for example, the network broke for a moment and each thought the other was dead). Two referees for one doc = two different histories.<br><strong>Lease</strong>: <strong>What it is:</strong> a time-limited permission to be the owner, from a coordination service (like ZooKeeper/etcd, <a href="#/coordination">Coordination lesson</a>), which must be renewed every few seconds. <strong>Why we need it:</strong> if the old owner cannot renew, its permission ends by itself, and only then does a new owner take over. <strong>Without it:</strong> split brain.<br><strong>Checksum</strong>: <strong>What it is:</strong> a small number (a hash) computed from the whole document. Two copies with the same checksum = the copies are the same (almost certainly). <strong>Why we need it:</strong> if a transform rule has a bug, the copies silently drift apart; comparing checksums catches it. <strong>Without it:</strong> you find out about divergence only when a user complains.` },
    { type: 'table', head: ['What happened', 'Effect', 'Protection'], rows: [
      ['Session server crash', 'All editors disconnect, the state in memory is gone', 'Recover from the op log (snapshot + replay), new owner, clients resume from last_rev, pending ops sent again'],
      ['Two servers both think they are the owner (split brain)', 'Two histories for one doc', 'Ownership lease (time-limited, from a coordination service), and a conditional write on rev in the op log: "write rev 18 only if 17 is the last one"'],
      ['500 editors on one doc (live class notes)', 'One server, one doc: a hot spot', 'Batch/compose ops, throttle presence, full stream only for editors and slightly delayed for viewers, a limit on editors'],
      ['A client offline for a very long time', 'Thousands of ops to transform', 'Fresh snapshot + rebase the local edits (like Figma); with a CRDT, merge directly'],
      ['Op log is slow', 'Acks arrive late, but local typing is fine', 'Write ops in small batches; a journal like Figma\'s; a separate partition per doc'],
      ['A buggy transform rule', 'Copies silently differ (the most dangerous one)', 'Periodic checksum: client and server compare the document hash, fresh snapshot on mismatch'],
      ['Permission revoked', 'An old tab keeps editing', 'Server-side check on every op, the revoke event kicks the session'],
    ]},
    { type: 'callout', tone: 'tip', title: 'Decide: OT or CRDT?', html: `<strong>OT</strong>: when you have a central server anyway, the document is mostly edited online, and you can use a mature implementation (the Google Docs way from 2010). <strong>CRDT</strong>: when you need offline-first or peer-to-peer, or do not want a central ordering server (Yjs, Automerge). <strong>Simple LWW per property</strong>: when the data is not text but separate fields/objects (the Figma way). One line for the interview: "OT or a sequence CRDT for text, with a per-document server; LWW for metadata."` },
    { type: 'h2', text: 'How to say it in an interview' },
    { type: 'list', ordered: true, items: [
      `<strong>Requirements:</strong> real-time multi-user editing, convergence + intent, presence, sharing roles, version history, offline. Local typing never waits for the network.`,
      `<strong>Shape of the load:</strong> a huge number of ops in total, but each doc is small and independent → shard by doc_id, one owner per doc.`,
      `<strong>Merge:</strong> why naive breaks (give an example), OT transform or CRDT IDs, the tie-break rule, one in-flight op + revision numbers.`,
      `<strong>Storage:</strong> append-only op log (durable first, then ack) + periodic snapshots; version history for free.`,
      `<strong>Extras:</strong> ephemeral presence via pub/sub, server-side permission check, offline resume with last_rev.`,
      `<strong>Failures:</strong> owner crash → replay + resume, split brain → lease + conditional append, divergence → checksums.`,
    ]},
    { type: 'diagram', title: 'The whole design at a glance', height: 520,
      caption: 'Edits pass through the document\'s owner (the session server), which decides the order and writes to the op log first. Cursors travel separately, through pub/sub. Old versions and sharing use the normal REST API. Use the buttons above to see one path at a time.',
      groups: [
        { label: 'Clients', x: 10, y: 30, w: 700, h: 100 },
        { label: 'Connections', x: 10, y: 148, w: 700, h: 104 },
        { label: 'Services', x: 10, y: 270, w: 700, h: 104 },
        { label: 'Data', x: 10, y: 392, w: 700, h: 112 },
      ],
      nodes: [
        { id: 'riya', label: 'Riya', sub: 'browser, local copy', x: 180, y: 82, kind: 'client', info: 'What it is: Riya\'s browser. It keeps its own copy of the document, the list of pending ops and the last seen rev. It applies its own edit to the screen right away (optimistic), without waiting for the server.' },
        { id: 'aman', label: 'Aman', sub: 'offline-capable', x: 540, y: 82, kind: 'client', info: 'What it is: Aman\'s browser. Editing keeps working even offline: ops wait as pending in browser storage, and when he is back it resumes by saying "I have seen up to rev N".' },
        { id: 'gwA', label: 'Gateway A', sub: 'WebSockets', x: 180, y: 202, kind: 'edge', info: 'What it is: the server where Riya\'s WebSocket is connected. It sends edits to the doc\'s owner, and cursor updates to the pub/sub channel.' },
        { id: 'router', label: 'Doc router', sub: 'doc_id → owner', x: 360, y: 202, w: 130, kind: 'net', info: 'What it is: per-document routing. From the doc_id it tells which session server owns this document (consistent hashing, or a registry + lease). This is how all editors of one doc reach the same server.' },
        { id: 'gwB', label: 'Gateway B', sub: 'WebSockets', x: 540, y: 202, kind: 'edge', info: 'What it is: the second gateway, where Aman is connected. It subscribes to the doc 42 pub/sub channel because one of its users is in doc 42.' },
        { id: 'api', label: 'Docs API', sub: 'REST', x: 85, y: 322, w: 130, kind: 'server', info: 'What it is: a normal request-response API: list of documents, opening, sharing, viewing version history and restoring. Real-time editing does not go through it.' },
        { id: 'ss', label: 'Session server', sub: 'doc 42 owner', x: 360, y: 322, w: 150, kind: 'server', info: 'What it is: the referee of doc 42. The document in memory, a rev number for every op, OT transform (or CRDT merge), write to the op log first, then ack and broadcast. Role check on every op.' },
        { id: 'ps', label: 'Pub/sub', sub: 'channel doc:42', x: 600, y: 322, w: 140, kind: 'queue', info: 'What it is: the message board for presence. Cursors and names are published here, and the gateways listening to doc 42 get a copy right away. Nothing is saved; if one update is lost, the next one is coming.' },
        { id: 'meta', label: 'Metadata + ACL', sub: 'SQL', x: 95, y: 452, w: 150, kind: 'data', info: 'What it is: the document\'s title, owner, and which user/group/link has which role (viewer, commenter, editor). The session server caches the role and checks it on every op.' },
        { id: 'log', label: 'Op log', sub: 'append-only', x: 320, y: 452, kind: 'data', info: 'What it is: the list of every accepted op (doc_id, rev, op, user), partition key doc_id. Written durably here before the ack. Crash recovery and version history come from it.' },
        { id: 'snap', label: 'Snapshots', sub: 'object storage', x: 540, y: 452, kind: 'data', info: 'What it is: a copy of the whole document every few thousand ops (with its rev). Opening, or viewing an old version = nearest snapshot + replay a few ops. Snapshots of named versions are never deleted.' },
      ],
      edges: [
        { a: 'riya', b: 'gwA', n: 1, label: 'op' }, { a: 'gwA', b: 'ss', n: 2 }, { a: 'ss', b: 'log', n: 3, label: 'append' },
        { a: 'ss', b: 'gwB', n: 4 }, { a: 'gwB', b: 'aman', n: 5 },
        { a: 'gwA', b: 'router', dashed: true }, { a: 'gwB', b: 'router', dashed: true },
        { a: 'gwA', b: 'ps', kind: 'evt' }, { a: 'ps', b: 'gwB', kind: 'evt', label: 'cursor' },
        { a: 'ss', b: 'snap', label: 'every K ops' }, { a: 'ss', b: 'meta', dashed: true, label: 'role?' },
        { a: 'riya', b: 'api', via: [[16, 110], [16, 262], [110, 262]], label: 'REST' }, { a: 'api', b: 'meta' }, { a: 'api', b: 'snap' }, { a: 'api', b: 'log' },
      ],
      paths: [
        { name: 'Type a letter', text: 'It shows on Riya\'s screen right away. The op goes through the gateway to the doc\'s owner; the owner gives it a rev, writes it durably to the op log, then sends Riya the ack and Aman the op.', go: ['riya>gwA>ss>log', 'ss>gwB>aman'] },
        { name: 'Two users at once', text: 'Both ops reach the same owner (because of the router). The one that came first gets rev 18; the other is transformed and gets rev 19. Both browsers also transform the incoming op against their own pending op.', go: ['riya>gwA>ss', 'aman>gwB>ss', 'ss>log', 'gwA>router', 'gwB>router'] },
        { name: 'Cursor move', text: 'Presence does not go to the op log or the owner. Gateway A puts it on the pub/sub channel doc:42, and through Gateway B, Aman sees Riya\'s cursor. Throttled, nothing saved.', go: ['riya>gwA>ps>gwB>aman'] },
        { name: 'Open old version', text: 'REST API: first a role check, then the snapshot before rev N + replay the ops up to N from the op log. Restore = a new op on top; history is not erased.', go: ['riya>api>meta', 'api>snap', 'api>log'] },
        { name: 'Offline edit', text: 'Aman is back online: the router finds the owner, he says "I have seen up to rev 120", gets the ops in between, transforms his pending ops and sends them. The owner writes them to the log and broadcasts them to Riya.', go: ['aman>gwB>router', 'gwB>ss>log', 'ss>gwA>riya'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Saving the whole document = last-write-wins = someone's text silently disappears. So send small ops.</li>
      <li>Your own edit shows on your screen right away (optimistic); ops go over a WebSocket, each with a base_rev.</li>
      <li>One owner session server per document (routing by doc_id): one truth about the order, rev numbers.</li>
      <li>OT: adjust an incoming op's position for the ops it did not see; use a tie-break rule at the same position.</li>
      <li>CRDT: a permanent ID for every character + tombstones; merges in any order, a natural fit for offline/peer-to-peer.</li>
      <li>Op log first (durable), then the ack. Snapshots make opening fast. Version history = snapshot + replay.</li>
      <li>Presence (cursors) is separate and short-lived: pub/sub, throttled, never on disk.</li>
      <li>Always check permissions on the server, for every op.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['Per-document owner: one truth about the order, no cross-server locks', 'Optimistic local apply: typing is always instant', 'Op log: crash recovery, version history, audit', 'Snapshots: even old docs open quickly', 'Presence is separate and short-lived: no load on storage'],
      costs: ['Session servers are stateful: reconnect storms and state rebuilds on deploys/crashes', 'One very popular doc becomes a hot spot on one server', 'OT: rules for every pair of op types, and bugs cause silent divergence', 'CRDT: an ID per character + tombstones, more memory', 'Durable first, then ack: write latency on every op', 'After a long time offline, merging is expensive or the intent is surprising'],
    },
    { type: 'think', questions: [
      { q: 'Riya deleted a paragraph, and at the same moment Aman was typing a word in the middle of that paragraph. What happens to Aman\'s word with OT and with a CRDT? Is that "right"?', a: 'Both converge, but intent is questionable. With good OT rules, on Riya\'s copy Aman\'s insert moves to the start of the deleted range, and on Aman\'s copy Riya\'s delete is split into two pieces (before and after the word), so Aman\'s word survives in both places. In a CRDT, the origin of Aman\'s word is a tombstone, but the word itself stays visible. Both choose "nobody\'s text is lost". The product can highlight it for the user if it wants. Lesson: convergence is guaranteed, "perfect intent" is not.' },
      { q: '2,000 people are watching the notes of a live lecture in one doc, and 5 are editing. How would you change the design?', a: 'Separate editors from viewers: the 5 editors get a full sync with the doc session server. The 2,000 viewers get a fan-out stream of ops through pub/sub/gateways, slightly batched (every 200 ms). Show presence only for editors, or just show a count. For the viewers\' first load, the snapshot can be CDN-friendly. The session server\'s work should depend on the number of editors, not viewers.' },
      { q: 'The session server gave an op rev 18 and broadcast it, but the op log write failed, and then it crashed. What went wrong, and what should the order be?', a: 'Other clients have a rev 18 that is not in the log; after recovery, the new server will give rev 18 to a different op, and the copies will differ. The right order: first the durable append (conditional: rev 18 only if 17 is the last), then the ack and the broadcast. If the append fails, reject/retry the op and do not send it to anyone.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Why are all editors of one document sent to one session server?', options: ['It is cheaper', 'One owner gives the ops a single order (rev numbers), without cross-server locking', 'A WebSocket can only connect to one server'], answer: 1, explain: 'If two servers accept the same doc\'s ops in different orders, two histories are created. One owner per doc gives one truth about the order, and putting different docs on different servers still spreads the load.' },
      { q: 'Riya deleted positions 2-6, and at the same time Aman inserted at position 7. How does OT change Aman\'s op on Riya\'s copy?', options: ['The position stays 7', 'Position 2 (5 back), because 5 characters before it have been deleted', 'The op is dropped'], answer: 1, explain: 'Transform: adjust positions for the op that was already applied. A position after the delete range moves back by the delete length.' },
      { q: 'What does a text CRDT use instead of positions?', options: ['Timestamps', 'A permanent unique ID for every character, and an insert says "after this ID"', 'The server\'s rev numbers'], answer: 1, explain: 'IDs never change, so you can apply the ops in any order and get the same result. A delete creates a tombstone so that references stay valid.' },
      { q: 'Why are cursor positions (presence) not written to the op log?', options: ['They are secret', 'They change very often and do not need to be saved; ephemeral pub/sub is enough', 'There is no space in the op log'], answer: 1, explain: 'A history of presence is of no use. Putting it in the log would only grow storage and replay for nothing. Yjs awareness is not stored in the document either.' },
      { q: 'Riya and Aman both "Save" the whole document. The server does last-write-wins. What happens?', options: ['Both edits are combined', 'Only the save that arrived last survives; the other edit silently disappears', 'The server returns an error'], answer: 1, explain: 'LWW treats the whole document as one value. The later save overwrites the earlier one, with no error. That is why we send small ops that can be combined.' },
      { q: 'You need to show the old version at rev 10,250. There is a snapshot every 1,000 revs. What is the cheapest way?', options: ['Replay 10,250 ops from rev 1', 'Take the rev 10,000 snapshot and replay 250 ops', 'Run the ops backwards from the latest document'], answer: 1, explain: 'The nearest earlier snapshot + a few ops. That is why we keep both snapshots and the op log.' },
      { q: 'When should the server send the ack for an op?', options: ['As soon as it applies it in memory', 'After writing it durably to the op log', 'After the next snapshot is made'], answer: 1, explain: 'An ack means "your edit is safe". A memory-only ack followed by a crash = the user\'s edit is gone. Waiting for a snapshot would take far too long.' },
    ]},
    { type: 'sources', note: 'The Google Docs specifics come from the official 2010 blog series (15 years old; today\'s internal design is not public). Some parts of routing, pub/sub presence and failure handling are the general industry approach, as the text says.', items: [
      { title: "What's different about the new Google Docs: Conflict resolution", publisher: 'Google Drive Blog (John Day-Richter)', year: 2010, official: true, url: 'https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs_22.html', used: 'Document as a revision log replayed from the start; InsertText/DeleteText/ApplyStyle; example of a misapplied delete; OT shift idea; style-range transform examples.' },
      { title: "What's different about the new Google Docs: Making collaboration fast", publisher: 'Google Drive Blog', year: 2010, official: true, url: 'https://drive.googleblog.com/2010/09/whats-different-about-new-google-docs.html', used: 'Collaboration protocol: client and server state, one pending change at a time, acks, server transforms against revisions the client missed, optimistic local apply, character-by-character collaboration.' },
      { title: 'Google Wave Operational Transformation (whitepaper)', publisher: 'Google (Wang, Mah, Lassen), Apache Wave archive', year: 2010, official: true, url: 'https://svn.apache.org/repos/asf/incubator/wave/whitepapers/operational-transform/operational-transform.html', used: 'Client-server OT based on Jupiter; client waits for ack before sending more; composing pending ops; single server history.' },
      { title: "How Figma's multiplayer technology works", publisher: 'Figma blog (Evan Wallace)', year: 2019, official: true, url: 'https://www.figma.com/blog/how-figmas-multiplayer-technology-works/', used: 'WebSockets, one server process per document as authority, why not OT, CRDT-inspired LWW per property, unacknowledged local changes win, reconnect = fresh copy + reapply offline edits.' },
      { title: 'Making multiplayer more reliable', publisher: 'Figma blog (Darren Tsung)', year: 2022, official: true, url: 'https://www.figma.com/blog/making-multiplayer-more-reliable/', used: 'Checkpoints every 30-60 s to S3, up to 60 s at risk, DynamoDB-backed journal with sequence numbers, 95% of edits saved within 600 ms, recovery = checkpoint + journal replay.' },
      { title: 'CRDTs: The Hard Parts', publisher: 'Martin Kleppmann (Hydra conference talk)', year: 2020, url: 'https://martin.kleppmann.com/2020/07/06/crdt-hard-parts-hydra.html', used: 'Interleaving anomaly, moving list items and trees, metadata overhead and Automerge columnar encoding; text CRDTs give each character a unique ID.' },
      { title: 'Interleaving anomalies in collaborative text editors (PaPoC 2019)', publisher: 'Kleppmann, Gomes, Mulligan, Beresford', year: 2019, url: 'https://martin.kleppmann.com/2019/03/25/papoc-interleaving-anomalies.html', used: 'Interleaving observed in Logoot and LSEQ, not in RGA.' },
      { title: 'Yjs docs: introduction and awareness', publisher: 'Yjs', official: true, url: 'https://docs.yjs.dev/getting-started/adding-awareness', used: 'Network-agnostic CRDT with shared types; awareness for cursors/names/colours is not stored in the document and is removed when a user disconnects.' },
      { title: 'Automerge: welcome / hello', publisher: 'Automerge', official: true, url: 'https://automerge.org/docs/hello/', used: 'Local-first CRDT, JSON-like documents, works offline and merges when reconnected, keeps history.' },
      { title: "Find what's changed in a file (version history)", publisher: 'Google Docs Editors Help', official: true, url: 'https://support.google.com/docs/answer/190843', used: 'Version history via Last edit; view, restore and copy earlier versions; named versions (up to 40 per document); versions may be merged; edit permission needed to see history.' },
      { title: 'High-latency, low-bandwidth windowing in the Jupiter collaboration system (UIST 1995)', publisher: 'Nichols, Curtis, Dixon, Lamping (Xerox PARC), ACM', year: 1995, url: 'https://dl.acm.org/doi/10.1145/215585.215706', used: 'The client-server OT system that the Google Wave OT design is based on (named in the table).' },
      { title: 'Share files from Google Drive', publisher: 'Google Docs Editors Help', official: true, url: 'https://support.google.com/docs/answer/2494822', used: 'Viewer, commenter and editor roles; restricted vs anyone-with-the-link access.' },
    ]},
  ],
});
