Lesson.register({
  id: 'pattern-contention',
  title: 'Contention: everyone wants the same thing',
  minutes: 28,
  summary: `When thousands of people want the same thing in the same second (the last hoodie, one seat, one ticket), simple code sells one item to two people. In this lesson: row locks, optimistic concurrency, atomic Redis operations, distributed locks, "hold for 10 minutes" reservations and virtual waiting rooms, and when to pick which one.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine xyz.com has only 100 hoodies, and 2,000 people press "Buy" in the same second.<br>A computer does many things at the same time. If we are careless, it will sell one hoodie to two people.<br>In this lesson we climb a <strong>ladder</strong>. We start with the simplest method. We climb up only when the lower method breaks under the crowd.<br>Each step is one tool: a lock, a check while writing, a super-fast counter, a lock with a timer, and a queue for the crowd.<br>At the end, a simulator makes 1,000 people fight for 10 seats, so you can see what each tool does.` },
    { type: 'h2', text: 'Problem: 8 PM, 100 hoodies, 2,000 fans' },
    { type: 'p', html: `A big creator on xyz.com drops limited merch: only <strong>100 hoodies</strong>, and the sale starts at exactly 8:00 PM. At 8:00:00, 2,000 fans press "Buy" together. Our old code was very simple:` },
    { type: 'code', text: `stock = SELECT qty FROM items WHERE id = 'hoodie'   -- 1. read
if stock > 0:
    UPDATE items SET qty = stock - 1 WHERE id = 'hoodie' -- 2. write
    create_order(user)
else:
    return "Sold out"` },
    { type: 'p', html: `For one user, this is perfectly correct. But 2,000 people at once? Two requests read qty <em>at the same moment</em>. Both saw "1". Both thought "one is left, it is mine". Both wrote qty = 0. <strong>One hoodie, two orders.</strong> This is called <em>overselling</em>. In a flash sale it does not happen twice. It happens hundreds of times.` },
    { type: 'callout', tone: 'term', title: 'Contention', html: `<strong>What it is:</strong> many requests want to change one <em>shared</em> thing (one row, one counter, one seat) at the same time. Like 2,000 people trying to walk through one door together.<br><strong>Why we need to understand it:</strong> on a normal day, requests touch different rows, so the problem never shows up. In a flash sale, everyone rushes at <strong>one single row</strong>, and that is when the bugs appear.<br><strong>Without it (if we ignore it):</strong> one item is sold to two people, or the system gets stuck in a long line and becomes slow.` },
    { type: 'callout', tone: 'term', title: 'Race condition (and lost update)', html: `<strong>What it is:</strong> a race condition is when the result depends on which request arrived first, and the wrong order gives a wrong result. The case above is a special race called a <strong>lost update</strong>. Two people read the same old value, and both write their "new" value. One update wipes out the other.<br><strong>Why we need to understand it:</strong> this bug never shows up in testing (one user, one request). It only shows up with a real crowd.<br><strong>Without it (if we do not stop it):</strong> overselling, wrong balances, wrong counters. We saw the same thing with a Redis counter in the rate limiting lesson (<a href="#/rate-limiting">Rate limiting</a>).` },
    { type: 'callout', tone: 'term', title: 'Transaction', html: `<strong>What it is:</strong> a packet of several database jobs (queries). It starts with <code>BEGIN</code> and becomes final at <code>COMMIT</code>. Either all the jobs happen, or none of them (if something fails in the middle, <code>ROLLBACK</code>).<br><strong>Why we need it:</strong> "reduce stock + create order" must never be half done.<br><strong>Without it:</strong> the stock goes down but no order is created (or the other way round). Details are in the <a href="#/sql-vs-nosql">Databases lesson</a>.` },
    { type: 'ascii', caption: 'Read-then-write race: time goes from top to bottom', text: `time   Request A (Riya)          Request B (Kabir)        DB qty
 t1    SELECT qty  -> 1                                         1
 t2                              SELECT qty  -> 1               1
 t3    UPDATE qty = 0                                           0
 t4                              UPDATE qty = 0                 0
 t5    order #501 created        order #502 created     (1 hoodie, 2 orders!)` },
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "just wrap it in a transaction"', html: `Many people think that putting the code inside <code>BEGIN ... COMMIT</code> ends the race. <strong>It does not.</strong> Every database has an <strong>isolation level</strong> (a setting that decides how much transactions running at the same time can see of each other's work). The default level in Postgres and MySQL (Read Committed / Repeatable Read) does not automatically put this read-then-write in a single line, one after another. Both transactions can read qty = 1. A transaction gives you "all or nothing", not "one at a time". The story of isolation levels is in the <a href="#/sql-vs-nosql">Databases lesson</a>. To break the race, you need the tools below.` },
    { type: 'p', html: `This pattern shows up everywhere: one seat on BookMyShow, a Tatkal train ticket, the last phone in a flash sale, the last bid in an online auction, one cab offered to two riders. There are five tools. Each has its own price, so we will look at them as a <strong>ladder</strong>.` },
    { type: 'h2', text: 'The contention ladder: five steps' },
    { type: 'p', html: `The rule is simple: <strong>start at the lowest step</strong>. Climb up only when the lower step breaks under your crowd. Each higher step gives more power, but also more parts, more code, and more things that can go wrong.` },
    { type: 'ascii', caption: 'Read from the bottom up. You need each step when the one below is not enough.', text: `  5  Hold + waiting room   "seat is yours for 10 min" + keep the crowd in a line
     ^  when: buying is a process (payment), and the crowd is 100x the backend
  4  Distributed lock+TTL  "only one worker at a time" (something outside the DB)
     ^  when: the thing to protect is not a DB row (external API, a job)
  3  Atomic Redis          counter in RAM, check + decrease in one step (~1 ms)
     ^  when: thousands per second on one hot counter
  2  Optimistic (version)  no lock, check while writing "did anyone change it?"
     ^  when: minutes between read and write (user filling a form),
     ^       we cannot hold a lock that long; conflicts are rare
  1  Row lock (FOR UPDATE) lock on the DB row, others wait in line
     ^  when: conflicts are common, all data in one DB, normal traffic
  0  Naive read-then-write oversell! (never do this)` },
    { type: 'callout', tone: 'tip', title: 'We will read every step the same way', html: `(1) an xyz.com story with numbers, (2) the tool in plain words, (3) a widget or diagram to play with, (4) <strong>"Stop here if..."</strong>: when you do not need to climb higher, and (5) which lesson to read for more depth.` },
    { type: 'h2', text: 'Step 1: Row lock (pessimistic locking)' },
    { type: 'p', html: `<strong>Story:</strong> creators on xyz.com keep their earnings in a <strong>wallet</strong>. Riya has ₹1,000 in her wallet. From her phone and her laptop, "withdraw ₹800" went out at the same moment. Both requests read the balance (₹1,000). Both thought "that is enough". Both took out ₹800. The balance is now −₹600. On a normal day xyz.com has ~50 withdrawals per second, but spread across lakhs of different wallets. A conflict on one wallet is rare, but when it happens, money goes wrong.` },
    { type: 'callout', tone: 'term', title: 'Lock and row lock', html: `<strong>What it is:</strong> a lock is an "occupied" sign. Whoever puts up the sign first does the work. Everyone else waits. A <strong>row lock</strong> is a lock on <em>one row</em> of the database (like Riya's wallet, or the hoodie stock).<br><strong>Why we need it:</strong> so nobody else can touch that row between our read and our write.<br><strong>Without it:</strong> two requests read the same old value and both write: a lost update.` },
    { type: 'callout', tone: 'term', title: 'Pessimistic vs optimistic', html: `<strong>What it is:</strong> two ways of thinking about how to stop lost updates. <strong>Pessimistic</strong>: "there will be a conflict, so lock first, then work." <strong>Optimistic</strong>: "a conflict is unlikely, so work without a lock, and while writing, check that nobody changed the data in between."<br><strong>Why we need it:</strong> you pick the right way based on how common conflicts are.<br><strong>Without it:</strong> the wrong choice gives either a useless line (pessimistic where there are no conflicts), or a storm of retries (optimistic where everything conflicts).` },
    { type: 'p', html: `<code>SELECT ... FOR UPDATE</code> tells the database: "I am going to change this row. Until my COMMIT/ROLLBACK, nobody else can read it with FOR UPDATE or change it." The second transaction stops right there and waits. Readers using a plain SELECT (without FOR UPDATE) are not blocked: Postgres/MySQL show them the old committed value from a snapshot (the last saved picture of the data).` },
    { type: 'code', text: `BEGIN;
SELECT qty FROM items WHERE id = 'hoodie' FOR UPDATE;   -- lock + read
-- app: if qty > 0 ...
UPDATE items SET qty = qty - 1 WHERE id = 'hoodie';
INSERT INTO orders (user_id, item_id) VALUES (42, 'hoodie');
COMMIT;                                                 -- lock released` },
    { type: 'list', items: [
      '<strong>When it is good:</strong> conflicts are common, the data is critical (money, inventory), and everything lives in one database. The code is simple and correct.',
      '<strong>Bottleneck:</strong> only one transaction at a time on a row. If a transaction takes 5 ms, that row can do at most ~200 purchases per second. If 2,000 people arrive in one second and all want to buy, the line takes ~10 seconds to clear: the last person waits ~9 seconds. Also, every waiting request holds a <strong>DB connection</strong> (see the card below). When connections run out, the whole site gets stuck, even pages that have nothing to do with the sale.',
      '<strong>Keep the lock short:</strong> never make a network call (payment gateway, email) while holding the lock. Hold the lock only for a few milliseconds of work inside the DB.',
      '<strong>Timeout:</strong> Postgres has <code>lock_timeout</code> (default 0 = wait forever). MySQL InnoDB has <code>innodb_lock_wait_timeout</code> (default 50 s). For a sale, keep these short, so the user quickly sees "please try again" instead of a 50 second spinner.',
      '<strong>NOWAIT / SKIP LOCKED:</strong> <code>FOR UPDATE NOWAIT</code> gives an error right away if it cannot get the lock. <code>FOR UPDATE SKIP LOCKED</code> skips locked rows and gives you the next free row: perfect for "give me any empty seat" or for a job queue (Long-running tasks lesson). Available in Postgres 9.5+ and MySQL 8.0+.',
    ]},
    { type: 'callout', tone: 'term', title: 'DB connection pool', html: `<strong>What it is:</strong> a set of connections between the app servers and the database that are kept open in advance, like 100 phone lines. Every query needs one line. When the work is done, the line goes back.<br><strong>Why we need it:</strong> opening a new connection for every query is slow, and a database can only handle a limited number of connections.<br><strong>Without it (or when it runs out):</strong> every request waiting for a lock is holding a line. When all 100 lines are full, the homepage, login, everything gets stuck on "could not get a connection".` },
    { type: 'p', html: `See it for yourself below: how long does the line on one row get? Change the transaction time and the number of buyers.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Time of one transaction (how long the lock is held): <strong class="rl-tv"></strong></label><input class="rl-t" type="range" min="1" max="50" step="1" value="5"></div>
          <div><label>Buyers in one second (all on the same row): <strong class="rl-nv"></strong></label><input class="rl-n" type="range" min="50" max="5000" step="50" value="2000"></div>
          <div><label>DB connection pool: <strong class="rl-pv"></strong></label><input class="rl-p" type="range" min="20" max="500" step="10" value="100"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Max speed of the row</span><strong class="rl-rate"></strong></div>
          <div class="stat"><span>Time to clear the line</span><strong class="rl-done"></strong></div>
          <div class="stat"><span>Wait of the last buyer</span><strong class="rl-wait"></strong></div>
          <div class="stat"><span>Waiting in line at 1 second</span><strong class="rl-q"></strong></div>
        </div>
        <div class="calc-note rl-note"></div>`;
      const $ = s => el.querySelector(s);
      const f = n => Math.round(n).toLocaleString('en-IN');
      const sec = ms => ms < 1000 ? f(ms) + ' ms' : (ms / 1000).toFixed(1) + ' s';
      const upd = () => {
        const t = +$('.rl-t').value, n = +$('.rl-n').value, pool = +$('.rl-p').value;
        $('.rl-tv').textContent = t + ' ms'; $('.rl-nv').textContent = f(n); $('.rl-pv').textContent = f(pool);
        const rate = 1000 / t;                 // max transactions per second on one row
        const done = Math.max(1000, n * t);    // buyers arrive between 0 and 1 s; when the line is empty
        const wait = Math.max(t, n * t - 1000 + t);
        const q = Math.max(0, Math.round(n - rate)); // how many are still in line at 1 s
        $('.rl-rate').textContent = f(rate) + ' / s';
        $('.rl-done').textContent = sec(done);
        $('.rl-wait').textContent = sec(wait);
        $('.rl-q').textContent = f(q);
        $('.rl-q').style.color = q > pool ? 'var(--red)' : '';
        $('.rl-note').innerHTML = q === 0
          ? `The row can handle ${f(rate)} transactions per second, and there are ${f(n)} buyers. <strong>No line.</strong> Here a row lock is exactly the right tool.`
          : q > pool
            ? `At 1 second, <strong>${f(q)} requests</strong> are waiting for the lock, each holding a DB connection. The pool has only ${f(pool)}: <strong>the pool is used up</strong>, and the rest of the site is stuck too. Here you need a higher step (atomic counter, waiting room).`
            : `${f(q)} requests in line, and the pool (${f(pool)}) still has room. The last buyer waits ${sec(wait)}. It will work, but if the crowd grows a little more, the pool runs out.`;
      };
      ['.rl-t', '.rl-n', '.rl-p'].forEach(c => $(c).addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'term', title: 'Deadlock', html: `<strong>What it is:</strong> A has locked seat 1 and is asking for seat 2. B has locked seat 2 and is asking for seat 1. Each will wait for the other forever, like two people facing each other in a narrow lane, and nobody steps back.<br><strong>Why we need to understand it:</strong> when one request locks several rows (two seats, two wallets), this will happen.<br><strong>Without it (if we ignore it):</strong> the database detects it and kills one transaction (an error), and the app has to retry. Prevention: always lock multiple rows <strong>in the same order</strong> (for example, seat id ascending: <code>ORDER BY id FOR UPDATE</code>).` },
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...conflicts on a row are occasional, fewer than one or two hundred people per second hit one row, and all the data is in one database. Wallets, bank transfers, order status: a row lock (or one conditional UPDATE) is enough for these. The higher steps would only add complexity here. Depth: <a href="#/sql-vs-nosql">Databases (ACID, isolation)</a>, <a href="#/db-internals">DB internals</a>.` },

    { type: 'h2', text: 'Step 2: Optimistic concurrency (version / compare-and-set)' },
    { type: 'p', html: `<strong>Story:</strong> two moderators of a big channel on xyz.com, Meera and Arjun, edit the title and description of the same video. Meera opened the edit form at 9:00, Arjun at 9:01. Meera presses Save at 9:03, Arjun at 9:04. Arjun's Save silently wipes out all of Meera's work (a lost update). A row lock will not work here: the form stays open for 3-4 minutes, and holding a DB connection and a lock for that long is impossible. And conflicts are rare: xyz.com has ~10 lakh edits a day, and maybe only 100 of them hit the same thing at the same time.` },
    { type: 'callout', tone: 'term', title: 'Version column', html: `<strong>What it is:</strong> a number in the row (<code>version</code>) that goes up by 1 on every update. Like "v7" written on top of a document.<br><strong>Why we need it:</strong> while writing, we can tell whether what I read (v7) is still the same, or whether someone changed it in between (now v8).<br><strong>Without it:</strong> the app never knows that its data has become old.` },
    { type: 'callout', tone: 'term', title: 'Compare-and-set (CAS)', html: `<strong>What it is:</strong> "change the value only if it is still what I saw." Compare and write happen in one atomic step (atomic = nobody can sneak in between). In a database this is <code>UPDATE ... WHERE version = 7</code>.<br><strong>Why we need it:</strong> it stops lost updates even without a lock. If 0 rows changed, someone changed the row in between: read again and retry, or tell the user.<br><strong>Without it:</strong> the optimistic way has no way to check.<br><strong>Example:</strong> Meera's Save (v7 → v8) worked. Arjun's Save sends "WHERE version = 7" and gets 0 rows. Arjun sees: "someone just changed this video, look at the new version."` },
    { type: 'code', text: `-- 1. read (no lock)
SELECT qty, version FROM items WHERE id = 'hoodie';          -- (1, 7)
-- 2. write, only if nobody touched it in between
UPDATE items SET qty = 0, version = 8
 WHERE id = 'hoodie' AND version = 7;                        -- 1 row = win, 0 rows = conflict

-- For a simple counter, one statement is enough (the DB takes the row lock itself):
UPDATE items SET qty = qty - 1 WHERE id = 'hoodie' AND qty > 0;   -- 1 row = sold` },
    { type: 'p', html: `You find this idea everywhere: DynamoDB <em>conditional writes</em> (<code>ConditionExpression</code>), HTTP <code>ETag</code> (a "version of this resource" tag given by the server) + the <code>If-Match</code> header ("change it only if the version is still this one"; otherwise 412 Precondition Failed), Elasticsearch <code>if_seq_no</code>, Kubernetes <code>resourceVersion</code>. A case like a wiki page or a Google Doc, where "two people are editing the same profile", is a perfect use of optimistic: conflicts are rare, and when one happens, show the user "the page changed, please refresh".` },
    { type: 'callout', tone: 'warn', title: 'The weakness of optimistic: a hot row', html: `When everyone is on <strong>one single row</strong>, only one CAS can win every 5 ms. All the others lose, retry, and lose again. Work is wasted, the load on the DB grows, and users get errors even though stock is still left. In the simulator, try "Optimistic" with 100 and then 500 hoodies.` },
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...conflicts are rare (profile, settings, wiki, document edit), or the user has "thinking time" between reading and writing. Optimistic is cheap: no lock, no line. But if everyone rushes at one row in one second (a flash sale), optimistic is the worst choice (you will see it in the simulator). Then go to step 3. Depth: <a href="#/consistency">Consistency</a>, <a href="#/object-storage">Object storage (ETag)</a>.` },
    { type: 'h2', text: 'Step 3: Atomic Redis operations' },
    { type: 'p', html: `<strong>Story:</strong> back to the hoodie sale. 2,000 fans, 100 hoodies, all in one second. We saw in the widget above: with a row lock, after 1 second ~1,800 requests are standing in line, and the pool of 100 connections is used up. Optimistic is even worse (you will see it in the simulator). The real job is only this: <strong>count one number down from 100 to 0, one at a time, without a mistake</strong>. A full database transaction is far too heavy for that.` },
    { type: 'callout', tone: 'term', title: 'Atomic operation', html: `<strong>What it is:</strong> a piece of work that happens in one single move. No other request can sneak in and see a half-done value. If "read, check, decrease" are three separate steps, there is a race in between. If it is one atomic step, there is no race at all.<br><strong>Why we need it:</strong> a correct result without a lock and without a line.<br><strong>Without it:</strong> another client sneaks in between GET and DECR.` },
    { type: 'callout', tone: 'term', title: 'Redis and Lua script', html: `<strong>What it is:</strong> Redis is an in-memory store (data lives in RAM, so it is very fast), which we saw in the <a href="#/caching">Caching lesson</a>. Redis runs commands one at a time, so every single command (like <code>DECR</code> = subtract 1) is atomic by itself. A <strong>Lua script</strong> is a tiny program that runs inside Redis. Redis finishes the whole script before it takes the next command, so "check + decrease" also becomes one atomic step.<br><strong>Why we need it:</strong> a decision in ~1 ms, without touching the database.<br><strong>Without it:</strong> one DB transaction for every buyer, and a row lock line.` },
    { type: 'p', html: `A database row serves one transaction at a time, and every transaction pays for disk, locks and commit. In a flash sale, where we only need to decrease one <em>number</em>, that is very expensive. Redis keeps that number in RAM and runs commands one at a time, so every command is <strong>atomic</strong> by itself (no other command can sneak in between).` },
    { type: 'list', items: [
      '<code>DECR stock:hoodie</code> returns the new value. If the result is &lt; 0, you were late: put it back with <code>INCR</code> and say "Sold out". Simple, but the counter can look negative for a short moment.',
      '<strong>Lua script</strong> (<code>EVAL</code>) or Redis Functions: "check + decrement" in one script. Redis runs the whole script before the next command, so this check-then-act also becomes atomic. The "Atomic Redis" scenario in the diagram below is exactly this. Keep the script short: while it runs, Redis makes everyone else wait.',
      '<strong>Speed:</strong> one Redis node can do a lakh or more simple operations per second, with a ~1 ms network round trip. Far ahead of the 200/s of a database row lock.',
      '<strong>After winning:</strong> Redis only decides "who won". The real order (payment, address) is written into the DB through a <a href="#/queues">queue</a>, at its own speed.',
    ]},
    { type: 'callout', tone: 'warn', title: 'Redis is not the source of truth', html: `The <strong>source of truth</strong> is the place whose data counts as "the real truth". Redis cannot be that. If Redis crashes and the last few writes did not reach the disk (this depends on its disk-saving setting, AOF/RDB), or if there is a <strong>failover</strong> (the main Redis died and its copy, the replica, took over) and the replica was a little behind, the counter can be wrong. So: (1) also keep the count of orders in the DB, and <strong>reconcile</strong> after the sale (compare the numbers in both places and fix any difference); (2) keep a last safety net in the DB, like <code>UPDATE ... WHERE qty &gt; 0</code> or a unique constraint (one booking per seat). Redis holds back the crowd; the DB decides the truth.` },
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...the problem is only "decrease one counter correctly under a crowd", and buying is one click (likes, coupon codes, the "first 100" in a flash sale). Atomic Redis + a queue + a DB safety net is enough for one hot counter. Go higher when (a) the thing to protect is not a counter but something outside (step 4), or (b) the user needs minutes to pay and the crowd is many times bigger than the backend (step 5). Depth: <a href="#/caching">Caching</a>, <a href="#/queues">Message queues</a>, <a href="#/pattern-writes">Scaling writes</a>.` },
    { type: 'h2', text: 'Try it: the last hoodie, two fans' },
    { type: 'p', html: `Run the three steps so far on the same race. Only <strong>1 hoodie</strong> is left in stock. Riya and Kabir press Buy in the same millisecond. Each scenario is a different tool. Run "Naive" (step 0) first, then the others.` },
    { type: 'flow', height: 330,
      nodes: [
        { id: 'a', label: 'Riya', sub: 'pressed Buy', x: 90, y: 75, w: 130, kind: 'client', info: 'What it is: the first fan, Riya, who wants to buy the last hoodie. Her request reaches one of the checkout servers of xyz.com.' },
        { id: 'b', label: 'Kabir', sub: 'pressed Buy', x: 90, y: 255, w: 130, kind: 'client', info: 'What it is: the second fan, Kabir. He sends his request in the same millisecond. In a real sale there are thousands like him, all behind the same row.' },
        { id: 'app', label: 'Checkout API', sub: 'stateless servers', x: 320, y: 165, w: 160, kind: 'server', info: 'What it is: the checkout service, which handles "Buy". It has many servers, and each request can go to a different server. So keeping a lock in a server\'s memory is useless: Riya\'s server cannot see the lock on Kabir\'s server. The decision must happen in a shared place (the DB or Redis).' },
        { id: 'db', label: 'Postgres', sub: 'items: qty = 1', x: 580, y: 235, w: 170, kind: 'data', info: 'What it is: the main database of xyz.com, and the source of truth (the real truth lives here). The items table has one row for the hoodie: qty and version. The contention is on this one row.' },
        { id: 'r', label: 'Redis', sub: 'stock:hoodie = 1', x: 580, y: 75, w: 170, kind: 'cache', hidden: true, info: 'What it is: an in-memory store (data in RAM, very fast). Redis runs commands one at a time (one main thread), so a DECR or a Lua script cannot be broken by anyone in the middle. The flash sale counter lives here; the real order is written into the DB later.' },
      ],
      edges: [{ a: 'a', b: 'app' }, { a: 'b', b: 'app' }, { a: 'app', b: 'db' }, { a: 'app', b: 'r', id: 'ar', hidden: true }],
      scenarios: [
        { name: 'Naive: oversell', intro: 'The old read-then-write code, with no protection.', steps: [
          { title: 'Both read qty', text: 'Riya\'s and Kabir\'s requests reach the DB at almost the same time. Both see qty = 1.', parallel: true, go: ['a>app>db', 'b>app>db'], msg: 'A: SELECT qty → 1\nB: SELECT qty → 1' },
          { title: 'Both wrote', text: 'Each one writes "1 - 1 = 0" by its own math. The DB does not complain: both are valid UPDATEs.', parallel: true, go: ['res:db>app>a', 'res:db>app>b'], after: { db: { state: 'warn', sub: 'qty = 0, orders = 2' } }, msg: 'A: UPDATE qty = 0  ✓\nB: UPDATE qty = 0  ✓' },
          { title: 'Oversell', text: 'Two confirmation emails went out, but there is one hoodie. Now one fan gets a refund and a sorry email. In a sale with 2,000 fans this will happen hundreds of times (you will see it in the simulator below).', set: { a: { state: 'ok', sub: 'order #501' }, b: { state: 'down', sub: '#502: oversold' } }, focus: ['a', 'b'] },
        ]},
        { name: 'Row lock (FOR UPDATE)', intro: 'Pessimistic: lock the row first, then read.', steps: [
          { title: 'Riya locked the row', text: '<code>SELECT ... FOR UPDATE</code> reads the row and also puts a <strong>lock</strong> on it until the transaction ends.', go: ['a>app>db', 'res:db>app'], after: { db: { state: 'hot', sub: 'locked by A, qty = 1' } }, msg: 'BEGIN;\nSELECT qty FROM items WHERE id=\'hoodie\' FOR UPDATE;  → 1' },
          { title: 'Kabir has to wait', text: 'Kabir\'s FOR UPDATE also arrives. The row is locked, so his query <strong>stops and waits</strong> (blocks). His DB connection stays tied up until then.', go: 'b>app>db', after: { b: { state: 'warn', sub: 'waiting...' } }, msg: 'B: SELECT ... FOR UPDATE   (blocked)' },
          { title: 'Riya commits', text: 'Riya writes qty = 0 and does COMMIT. The lock is released.', go: 'res:db>app>a', after: { a: { state: 'ok', sub: 'order #501' }, db: { state: '', sub: 'qty = 0' } }, msg: 'UPDATE items SET qty = 0 ...; COMMIT;' },
          { title: 'Kabir gets the right answer', text: 'Now Kabir\'s query runs and he gets the <strong>fresh</strong> value: 0. He sees "Sold out". No oversell. The price: Kabir waited, and in a crowd this wait keeps getting longer.', go: 'res:db>app>b', after: { b: { state: 'miss', sub: 'Sold out' } }, msg: 'B: → qty = 0  →  "Sold out"' },
        ]},
        { name: 'Optimistic (version)', intro: 'No lock; check while writing: "is what I read still the same?"', steps: [
          { title: 'Both read version 7', text: 'The row has a <code>version</code> column. Both see qty = 1, version = 7. No lock was taken.', parallel: true, go: ['a>app>db', 'b>app>db'], after: { db: { sub: 'qty = 1, v = 7' } }, msg: 'SELECT qty, version → (1, 7)' },
          { title: 'Riya\'s conditional UPDATE', text: 'Update only if the version is still 7. It worked: 1 row updated, the version is now 8.', go: ['app>db', 'res:db>app>a'], after: { db: { sub: 'qty = 0, v = 8' }, a: { state: 'ok', sub: 'order #501' } }, msg: 'UPDATE items SET qty = 0, version = 8\n WHERE id = \'hoodie\' AND version = 7;   → 1 row' },
          { title: 'Kabir\'s UPDATE: 0 rows', text: 'Kabir also sends "WHERE version = 7", but the version is now 8. <strong>0 rows updated</strong> = someone changed it in between. The app understands: conflict.', go: ['app>db', 'bad:db>app'], after: { b: { state: 'warn', sub: 'conflict' } }, msg: 'UPDATE ... WHERE version = 7;   → 0 rows' },
          { title: 'Retry: read again', text: 'The app reads again for Kabir: qty = 0. The answer is "Sold out". With few conflicts this is very cheap; in a crowd you get a storm of retries.', go: ['app>db', 'res:db>app>b'], after: { b: { state: 'miss', sub: 'Sold out' } } },
        ]},
        { name: 'Atomic Redis', intro: 'The stock counter lives in Redis; check and decrease are one atomic step.', steps: [
          { title: 'Counter in Redis', text: 'Before the sale, the stock was loaded into Redis: <code>stock:hoodie = 1</code>. Now the DB is not on this hot path.', show: ['r', 'ar'], set: { db: { state: 'dim', sub: 'orders (async)' } }, focus: ['r'] },
          { title: 'Both run the Lua script', text: 'Script: "if stock > 0, DECR and return 1, otherwise return 0". Redis finishes one script before it takes the next command, so nobody can sneak in between.', parallel: true, go: ['a>app>r', 'b>app>r'], msg: '-- buy.lua (EVAL ... 1 stock:hoodie)\nlocal s = tonumber(redis.call(\'GET\', KEYS[1]))\nif s > 0 then redis.call(\'DECR\', KEYS[1]) return 1 end\nreturn 0' },
          { title: 'One won, one "Sold out"', text: 'The first script returns 1 (stock 0), the second returns 0. Both get an answer in ~1 ms, with no waiting line. The winner\'s order is written into the DB later, through a queue.', parallel: true, go: ['res:r>app>a', 'bad:r>app>b'], after: { r: { state: 'ok', sub: 'stock:hoodie = 0' }, a: { state: 'ok', sub: 'won' }, b: { state: 'miss', sub: 'Sold out' } } },
        ]},
      ],
    },

    { type: 'h2', text: 'Step 4: Distributed lock with TTL (when, and when not)' },
    { type: 'p', html: `<strong>Story:</strong> every night at 2 AM, xyz.com runs a <strong>payout job</strong>: it works out the earnings of ~40,000 creators and tells the bank API "send money to these people". So that one dead server does not stop it, the job is scheduled on 3 servers. With nothing to stop them, all three will run, and every creator gets paid <strong>three times</strong>. Here the thing to protect is not a database row but a <em>job</em> (and an outside bank). A row lock does not fit here.` },
    { type: 'callout', tone: 'term', title: 'Distributed lock', html: `<strong>What it is:</strong> a lock shared between many machines. A key in a common place (Redis, ZooKeeper, etcd): whoever writes it first is the "lock holder". The others see it and wait.<br><strong>Why we need it:</strong> 3 servers, one job. Only one should run it.<br><strong>Without it:</strong> every server thinks it is alone: three payouts, three emails, three reports.` },
    { type: 'callout', tone: 'term', title: 'TTL (time to live)', html: `<strong>What it is:</strong> the expiry time of a key. <code>PX 30000</code> = the key deletes itself after 30 seconds.<br><strong>Why we need it:</strong> if the lock holder server crashes, it will never say "unlock". After the TTL, the lock opens by itself and another server takes over the job.<br><strong>Without it:</strong> one crash = the lock stays closed forever, and the payout never runs.` },
    { type: 'callout', tone: 'term', title: 'Fencing token', html: `<strong>What it is:</strong> a number that goes up every time the lock is given out (33, 34, 35...). The lock holder sends its number with every write. The storage (DB, file service) remembers the biggest number it has seen so far, and <strong>rejects</strong> any write with a smaller number.<br><strong>Why we need it:</strong> TTL has a trap. The lock holder froze (for example a <strong>GC pause</strong>: everything in the program stops for a few seconds while it cleans up its memory), the TTL ran out, and someone else got the lock. The first one wakes up and has no idea that the lock is no longer its own.<br><strong>Without it:</strong> two "lock holders" at once, and the late write of the old one spoils the new one's work.` },
    { type: 'p', html: `We saw this in the <a href="#/coordination">Coordination lesson</a>: <code>SET lock:x owner NX PX 30000</code> makes a lock in Redis (<code>NX</code> = write only if the key does not exist yet, so there is no other holder; <code>PX 30000</code> = a TTL of 30 s). If the holder crashes, it opens by itself after the TTL. And a <strong>fencing token</strong> rejects the late write of an old lock holder. In contention, its role is small:` },
    { type: 'list', items: [
      '<strong>When to use it:</strong> when the thing to protect is not a database row. For example, only one worker should run a creator\'s payout, only one call at a time should go to an external API, or a big report should be built only once.',
      '<strong>When not to:</strong> for every purchase of inventory. Every request takes the lock, does the work, releases the lock: this is just as one-at-a-time as a row lock, plus an extra Redis round trip and the TTL risk. If the data is in one DB, the DB lock or a conditional UPDATE is better.',
      '<strong>The TTL trap:</strong> if the holder is stuck for longer than the TTL (GC pause, slow network), two machines become "lock holder" at the same time. If you need correctness, you need a fencing token and a check in the storage. Try it yourself below.',
      '<strong>Release the lock carefully too:</strong> delete only your own lock. Delete only if the key\'s value (your random owner id) matches: on Redis 8.4+ with <code>DELEX key IFEQ value</code>, on older versions with a tiny Lua script. Otherwise, after the TTL, you would delete someone else\'s lock.',
    ]},

    { type: 'p', html: `<strong>Play with it:</strong> Worker A got the lock (token 33). After 2 seconds of work it gets stuck in a GC pause. Worker B tries to get the lock every second. Change the TTL and the pause, and turn fencing on and off.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Lock TTL: <strong class="dl-tv"></strong></label><input class="dl-t" type="range" min="10" max="60" step="5" value="30"></div>
          <div><label>Worker A's pause (GC): <strong class="dl-pv"></strong></label><input class="dl-p" type="range" min="0" max="60" step="5" value="0"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0"><button type="button" class="chip dl-f">Fencing token: OFF</button></div>
        <div class="dl-tracks" style="display:grid;gap:6px;font-size:13px"></div>
        <ol class="dl-log" style="font-family:var(--f-mono);font-size:12.5px;margin:10px 0 0;padding-left:20px"></ol>
        <div class="calc-note dl-note"></div>`;
      const $ = s => el.querySelector(s);
      let fence = false;
      const span = 75; // seconds shown on the bar
      const bar = (lbl, segs) => `<div style="display:flex;align-items:center;gap:8px"><span style="width:62px;flex:none">${lbl}</span><div style="position:relative;flex:1;height:18px;background:var(--surface-2);border-radius:var(--r-sm);overflow:hidden">${segs.map(([a, b, c]) => `<div style="position:absolute;top:0;bottom:0;left:${a / span * 100}%;width:${Math.max(1, (b - a) / span * 100)}%;background:${c}"></div>`).join('')}</div></div>`;
      const upd = () => {
        const ttl = +$('.dl-t').value, P = +$('.dl-p').value;
        $('.dl-tv').textContent = ttl + ' s'; $('.dl-pv').textContent = P + ' s';
        $('.dl-f').textContent = 'Fencing token: ' + (fence ? 'ON' : 'OFF'); $('.dl-f').classList.toggle('on', fence);
        const aWrite = P + 3;                 // A: 2 s of work, a P s pause, then a write within 1 s
        const log = [], segsA = [[0, 2, 'var(--green)']], segsB = [];
        log.push('t=0s   A took the lock (token 33), work starts');
        if (P > 0) segsA.push([2, 2 + P, 'var(--amber)']);
        let note;
        if (aWrite <= ttl) {
          segsA.push([2 + P, aWrite, 'var(--green)']);
          if (P > 0) log.push(`t=2s   A froze (GC pause ${P} s)`);
          log.push(`t=${aWrite}s  A wrote (token 33) and released the lock`);
          segsB.push([aWrite, aWrite + 3, 'var(--green)']);
          log.push(`t=${aWrite}s  B got the lock (token 34): the job is already done, B does nothing`);
          note = `A's work (${aWrite} s) finished before the TTL (${ttl} s). Only one holder at a time. <strong>Safe.</strong>`;
        } else {
          log.push(`t=2s   A froze (GC pause ${P} s)`);
          log.push(`t=${ttl}s  TTL ran out, the key was deleted. A does not know.`);
          log.push(`t=${ttl}s  B got the lock (token 34)`);
          log.push(`t=${ttl + 1}s  B wrote (token 34). Biggest token in storage: 34`);
          segsB.push([ttl, ttl + 1, 'var(--green)']);
          segsA.push([2 + P, aWrite, fence ? 'var(--ink-3)' : 'var(--red)']);
          if (fence) {
            log.push(`t=${aWrite}s  A woke up and wrote (token 33): REJECTED (33 < 34)`);
            note = `A's pause was longer than the TTL, so from ${ttl} s to ${aWrite} s <strong>two workers both thought they held the lock</strong>. But the storage saw token 33 and rejected A's old write. <strong>Fencing saved us.</strong>`;
          } else {
            log.push(`t=${aWrite}s  A woke up and wrote (token 33): ACCEPTED. B's work is spoiled!`);
            note = `A's pause was longer than the TTL. From ${ttl} s to ${aWrite} s there were <strong>two lock holders</strong>. A's late write overwrote B's work: a double payout or wrong data. <strong>TTL alone is not enough</strong>; turn fencing ON and try again.`;
          }
        }
        $('.dl-tracks').innerHTML = bar('Worker A', segsA) + bar('Worker B', segsB) + `<div style="color:var(--ink-3);font-size:12px">The bar goes from 0 to ${span} s. Green = work, amber = pause, red = wrong write, grey = rejected write.</div>`;
        $('.dl-log').innerHTML = log.map(x => `<li>${x}</li>`).join('');
        $('.dl-note').innerHTML = note;
      };
      $('.dl-f').onclick = () => { fence = !fence; upd(); };
      ['.dl-t', '.dl-p'].forEach(c => $(c).addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...all you need is "only one worker at a time", the job is idempotent (running it twice does no harm), and the thing to protect is not a DB row. Do not use a distributed lock for inventory or seats: steps 1-3 are better there. And where correctness means money, add a fencing token or a conditional write in the DB as well. Depth: <a href="#/coordination">Coordination (leases, fencing)</a>, <a href="#/consensus">Consensus</a>.` },

    { type: 'h2', text: 'Step 5: "Hold for 10 minutes" + virtual waiting room' },
    { type: 'p', html: `Now xyz.com sells <strong>500 seats</strong> for a live creator meetup. The problem has changed: buying is not one click, it is a process. The user picks a seat, then spends 2-3 minutes on the payment page. If we lock the seat after payment, two people will pay for the same seat. If we give the seat away for good as soon as it is picked, the seats of people who left the payment page will be stuck forever.` },
    { type: 'callout', tone: 'term', title: 'Hold (temporary reservation)', html: `<strong>What it is:</strong> putting a seat in your name for a short time (say 10 minutes). During that time, nobody else can take it. If the payment succeeds, the hold becomes a <em>booking</em>. If time runs out and there is no payment, the hold <strong>expires</strong> and the seat goes back to everyone. The "session timer" on BookMyShow and IRCTC is exactly this.<br><strong>Why we need it:</strong> payment takes minutes. We cannot hold a row lock that long, and with nothing to stop it, two people will pay for one seat.<br><strong>Without it:</strong> either double booking, or abandoned seats "stuck" forever.` },
    { type: 'callout', tone: 'term', title: 'Webhook', html: `<strong>What it is:</strong> a call from an outside service (here the payment gateway) to our server: "payment #8812 is done". We give them a URL in advance, and they call that URL when the work is done.<br><strong>Why we need it:</strong> the gateway knows when the payment is complete, we do not. This is better than asking again and again (polling).<br><strong>Without it:</strong> we would never know when to confirm the booking.` },
    { type: 'code', text: `-- seats: id, status (AVAILABLE | HELD | BOOKED), held_by, hold_until
-- Taking a hold: one atomic conditional UPDATE (expired holds can be taken too)
UPDATE seats SET status = 'HELD', held_by = 42, hold_until = now() + interval '10 minutes'
 WHERE id = 'A12'
   AND (status = 'AVAILABLE' OR (status = 'HELD' AND hold_until < now()));   -- 1 row = got it

-- When the payment success webhook arrives: book only your own hold, and only if still valid
UPDATE seats SET status = 'BOOKED'
 WHERE id = 'A12' AND status = 'HELD' AND held_by = 42 AND hold_until > now();` },
    { type: 'list', items: [
      '<strong>Two ways to expire:</strong> (1) <em>lazy</em>: like above, the query itself treats <code>hold_until &lt; now()</code> as free, so no background job is needed; (2) in Redis, <code>SET hold:A12 user42 NX EX 600</code>, and the key disappears by itself. Often both: Redis for a fast check, the DB for the truth, and a sweeper job that cleans up old HELD rows.',
      '<strong>What if the payment arrives late?</strong> The hold has expired and the seat now belongs to someone else, but the money was taken. That is why the payment webhook runs the conditional UPDATE above; 0 rows = automatic refund. This is a multi-step flow, and its full story is in <a href="#/pattern-multistep">Multi-step processes</a>.',
      '<strong>How long should a hold be?</strong> A short hold = abandoned seats come back quickly, but a slow user\'s payment may be cut off in the middle. A long hold = more seats look "stuck". 5-15 minutes is common.',
    ]},
    { type: 'h3', text: 'Waiting room: stop the crowd at the door' },
    { type: 'p', html: `Locks and holds settle the fight over one seat. But when 2 lakh people arrive at 8:00 and there are only 500 seats, the real problem is that <strong>2 lakh requests</strong> hit the checkout service, the DB and the payment gateway at the same time. Everything slows down: timeouts, retries, and the retries add even more load. The people who will never get a seat are also bringing the system down.` },
    { type: 'callout', tone: 'term', title: 'Virtual waiting room', html: `<strong>What it is:</strong> a light page/service that sits <em>in front of</em> checkout. It gives everyone who arrives a number in the line ("you are number 18,402, ~2 minutes"). Only as many people as the system behind can handle (say 200 users per second) are sent in.<br><strong>Why we need it:</strong> 2 lakh people, 500 seats. Even the people who will never get a seat are bringing down checkout and the DB. The waiting room stops the crowd at the CDN.<br><strong>Without it:</strong> everything slows down, timeouts, people refresh, and the load grows even more.<br><strong>Example:</strong> this is a common industry approach in ticketing and big sales. CDN providers like Cloudflare and Akamai, and services like Queue-it, offer it ready-made.` },
    { type: 'callout', tone: 'term', title: 'Admission token', html: `<strong>What it is:</strong> a small signed pass (signed = any tampering is detected) that you get from the waiting room when your turn comes: "Riya may enter until 8:08".<br><strong>Why we need it:</strong> checkout does not accept any request without a valid token. So nobody can skip the line by opening the checkout URL directly.<br><strong>Without it:</strong> the waiting room is just for show: clever users and bots walk straight in.` },
    { type: 'list', items: [
      '<strong>Why is it light?</strong> The waiting room page is served as a static page from the CDN and polls its status every few seconds. Showing an "you are in line" page is a thousand times cheaper than running checkout.',
      '<strong>Fairness:</strong> how do we order people who arrived from 7:55? Many systems give everyone who arrived before the sale a <em>random</em> order (so bots and people with fast internet do not win), and people who arrive later get FIFO (first in, first out).',
      '<strong>Bots:</strong> the token is tied to one user/device and it expires, so one bot cannot break the line with 1,000 tabs. CAPTCHA, login and a per-user limit (one account = 4 tickets) are used together with it (<a href="#/rate-limiting">Rate limiting</a>).',
      '<strong>Honesty:</strong> when the stock runs out, tell everyone in the line right away. Keeping people in line for hours and then saying "sold out" is the worst experience.',
    ]},
    { type: 'flow', height: 340,
      nodes: [
        { id: 'f', label: 'Fans', sub: '2 lakh, 8:00 PM', x: 85, y: 170, w: 130, kind: 'client', info: 'What it is: all the users who want a seat at the meetup (2 lakh people, 500 seats). Most of them will not get a seat; the system\'s job is to tell them quickly and honestly.' },
        { id: 'w', label: 'Waiting room', sub: 'CDN edge', x: 265, y: 170, w: 150, kind: 'edge', info: 'What it is: the virtual waiting room, a light door in front of checkout. It keeps the line, shows the position, and gives out admission tokens at a fixed rate. It runs on the CDN/edge so the crowd never reaches the origin.' },
        { id: 'api', label: 'Checkout', sub: 'token check', x: 455, y: 170, w: 140, kind: 'server', meter: true, load: 30, info: 'What it is: the checkout service. It only accepts requests with a valid admission token. It holds the seat, starts the payment, and confirms the booking when the payment webhook arrives.' },
        { id: 'r', label: 'Redis holds', sub: 'hold:A12 TTL 600s', x: 630, y: 70, w: 150, kind: 'cache', info: 'What it is: a fast register of holds, in Redis. Each hold is one key: SET hold:seat user NX EX 600. NX = only if it does not exist yet (one seat, one holder). EX = disappears by itself after 10 minutes.' },
        { id: 'db', label: 'Seats DB', sub: 'status per seat', x: 630, y: 270, w: 150, kind: 'data', info: 'What it is: the seats database, the source of truth. For every seat: status AVAILABLE / HELD / BOOKED, held_by, hold_until. The final booking decision is made here with a conditional UPDATE.' },
        { id: 'pay', label: 'Payment', sub: 'gateway', x: 455, y: 295, w: 140, kind: 'net', info: 'What it is: the outside payment gateway (like Razorpay/Stripe). It tells checkout the payment result through a webhook. It is never called while holding a lock.' },
      ],
      edges: [{ a: 'f', b: 'w' }, { a: 'w', b: 'api' }, { a: 'api', b: 'r' }, { a: 'api', b: 'db' }, { a: 'api', b: 'pay' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'A number in the line', text: 'Riya arrives at 8:00:01. The waiting room gives her a position. Checkout does not even know about her yet.', go: ['f>w', 'res:w>f'], after: { w: { sub: 'Riya: #18,402' } }, msg: 'GET /queue  →  { position: 18402, eta: "2 min" }' },
          { title: 'Her turn: a token', text: 'The line moves forward at 200 users per second. Riya gets a signed admission token (valid for a few minutes).', go: ['res:w>f'], msg: 'admit_token = sign(user=riya, exp=8:08)' },
          { title: 'Hold seat A12', text: 'Checkout checks the token, then makes an atomic hold in Redis and marks HELD in the DB. A 10 minute timer starts.', go: ['f>w>api', 'api>r', 'res:r>api', 'api>db'], after: { r: { state: 'ok', sub: 'hold:A12 = riya' }, db: { sub: 'A12: HELD till 8:16' } }, msg: 'SET hold:A12 riya NX EX 600   → OK' },
          { title: 'Payment', text: 'Riya pays. The gateway sends a webhook. Checkout runs a conditional UPDATE: "HELD by riya and hold_until > now". 1 row = booking confirmed.', go: ['api>pay', 'res:pay>api', 'api>db'], after: { db: { state: 'ok', sub: 'A12: BOOKED (riya)' } }, msg: 'UPDATE seats SET status=\'BOOKED\' WHERE id=\'A12\' AND held_by=riya AND hold_until > now()  → 1 row' },
        ]},
        { name: 'Hold expire', intro: 'Kabir held a seat, then closed the tab.', steps: [
          { title: 'Kabir\'s hold', text: 'Kabir got a hold on A13, for 10 minutes.', go: ['w>api>r', 'api>db'], after: { r: { sub: 'hold:A13 = kabir' }, db: { sub: 'A13: HELD' } } },
          { title: 'Kabir left', text: 'Kabir closed the tab on the payment page. No "cancel" request came. Without an expiry, A13 would be stuck forever.', set: { f: { state: 'dim' } }, focus: ['r'] },
          { title: 'Ten minutes later', text: 'The Redis key disappears by itself because of the TTL. The DB row also counts as "free" now, because <code>hold_until &lt; now()</code>.', set: { r: { state: 'warn', sub: 'hold:A13 expired' }, db: { sub: 'A13: free (expired)' } }, focus: ['r', 'db'] },
          { title: 'A seat for the next in line', text: 'The next user waiting in the waiting room got a token, and got A13. The abandoned seat was sold, with no oversell.', go: ['f>w>api>r', 'api>db'], after: { f: { state: '' }, r: { state: 'ok', sub: 'hold:A13 = meera' }, db: { sub: 'A13: HELD (meera)' } } },
        ]},
        { name: 'Late payment', intro: 'The hold expired, but the user\'s payment arrived only now.', steps: [
          { title: 'Hold expired, seat is someone else\'s', text: 'Arjun\'s hold ended at 8:16, and at 8:17 Meera held A14.', set: { db: { sub: 'A14: HELD (meera)' } }, focus: ['db'] },
          { title: 'Arjun\'s webhook at 8:18', text: 'The gateway says Arjun\'s payment went through. Checkout runs the conditional UPDATE.', go: ['res:pay>api', 'api>db', 'bad:db>api'], msg: 'UPDATE ... WHERE id=\'A14\' AND held_by=arjun AND hold_until > now()  → 0 rows' },
          { title: 'Refund, no oversell', text: '0 rows = the seat is no longer Arjun\'s. Checkout starts an automatic refund and tells Arjun the truth. Without this check, A14 would be sold to two people.', go: 'api>pay', after: { pay: { state: 'warn', sub: 'refund arjun' }, api: { state: 'warn' } }, msg: 'POST /refunds { payment: arjun_8812 }' },
        ]},
        { name: 'Spike: the room saves us', intro: '2 lakh people in one minute.', steps: [
          { title: 'The crowd hits the waiting room', text: 'The whole crowd stops at the CDN edge. These are static pages and small poll requests, and the CDN handles them easily.', flood: { paths: ['f>w'], n: 14 }, after: { w: { state: 'hot', sub: '2 lakh in line' } } },
          { title: 'Only 200/s go inside', text: 'Only as many people reach checkout as it can handle. The load meter stays normal.', flood: { paths: ['w>api'], n: 4, gap: 300 }, after: { api: { load: 55, sub: 'steady 200/s' } } },
          { title: 'Sold out: tell everyone', text: 'All 500 seats are booked or held. The waiting room immediately shows "sold out" to everyone still in line, so they do not wait for nothing.', go: 'res:w>f', after: { w: { state: 'warn', sub: 'SOLD OUT shown' } } },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', title: 'Stop here if...', html: `...this is the top step of the ladder. Above it there is only "more of the same": many regions, bot detection, and sharding counters (splitting them into pieces: a separate counter for each show/event). Use a waiting room only when demand is <strong>many times</strong> the backend's capacity, and only for that event (on other days use "passthrough", which lets everyone straight in). On a normal day, a waiting room only adds latency. Depth: <a href="#/rate-limiting">Rate limiting</a>, <a href="#/pattern-spikes">Traffic spikes</a>, <a href="#/pattern-multistep">Multi-step processes (after the payment)</a>, <a href="#/design-bookmyshow">BookMyShow design</a>.` },
    { type: 'h2', text: 'Simulator: 1,000 people, 10 seats (and bigger crowds)' },
    { type: 'p', html: `Now run all five steps (plus step 0, "no protection") on the same crowd. First pick the preset <strong>"1,000 people, 10 seats"</strong>, then the presets with bigger crowds. Click each strategy and watch the numbers: who oversells, who makes a line, and who wastes work on retries.` },
    { type: 'custom', render(el) {
      function pcSim(mode, N, K) {
        let seed = 20240917;
        const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
        const D = 5, TO = 2000, ADMIT = 200, HOLD = 600;
        const arr = []; for (let i = 0; i < N; i++) arr.push(rnd() * 1000);
        arr.sort((a, b) => a - b);
        const r = { ok: 0, over: 0, retry: 0, err: 0, soldout: 0, lat: [], peak: 0, unit: 'ms', expired: 0 };
        const heap = [];
        const push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p].t <= heap[i].t) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
        const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, rr = l + 1; let m = i; if (l < heap.length && heap[l].t < heap[m].t) m = l; if (rr < heap.length && heap[rr].t < heap[m].t) m = rr; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
        if (mode === 'none') {
          let stock = K, inflight = 0;
          arr.forEach((a, i) => push({ t: a, k: 'read', i }));
          const seen = [];
          while (heap.length) {
            const e = pop();
            if (e.k === 'read') {
              seen[e.i] = stock;
              if (stock > 0) { inflight++; r.peak = Math.max(r.peak, inflight); push({ t: e.t + D, k: 'write', i: e.i, a: arr[e.i] }); }
              else { r.soldout++; r.lat.push(1); }
            } else { inflight--; stock = seen[e.i] - 1; r.ok++; r.lat.push(e.t - e.a); }
          }
          r.over = Math.max(0, r.ok - K);
        } else if (mode === 'lock') {
          let stock = K, free = 0; const ends = [];
          arr.forEach(a => {
            const start = Math.max(a, free);
            if (start - a > TO) { r.err++; r.lat.push(TO); ends.push([a, a + TO]); return; }
            const hold = stock > 0 ? D : 1; const end = start + hold; free = end;
            if (stock > 0) { stock--; r.ok++; } else r.soldout++;
            r.lat.push(end - a); ends.push([a, end]);
          });
          const ev = []; ends.forEach(([s, e]) => { ev.push([s, 1]); ev.push([e, -1]); });
          ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]); let c = 0; ev.forEach(x => { c += x[1]; r.peak = Math.max(r.peak, c); });
        } else if (mode === 'occ') {
          let stock = K, ver = 0, inflight = 0;
          arr.forEach((a, i) => push({ t: a, k: 'read', i, n: 0, a }));
          while (heap.length) {
            const e = pop();
            if (e.k === 'read') {
              if (stock <= 0) { r.soldout++; r.lat.push(e.t + 1 - e.a); continue; }
              inflight++; r.peak = Math.max(r.peak, inflight);
              push({ t: e.t + D, k: 'cas', i: e.i, n: e.n, a: e.a, v: ver });
            } else {
              inflight--;
              if (e.v === ver) { ver++; stock--; r.ok++; r.lat.push(e.t - e.a); }
              else if (e.n >= 4) { r.err++; r.lat.push(e.t - e.a); }
              else { r.retry++; const back = D * Math.pow(2, e.n) * (0.5 + rnd()); push({ t: e.t + back, k: 'read', i: e.i, n: e.n + 1, a: e.a }); }
            }
          }
        } else if (mode === 'atomic') {
          let stock = K, free = 0; const OP = 0.01;
          arr.forEach(a => {
            const start = Math.max(a + 0.5, free); free = start + OP;
            if (stock > 0) { stock--; r.ok++; } else r.soldout++;
            r.lat.push(free + 0.5 - a);
          });
          r.peak = 1;
        } else { // hold + waiting room, times in seconds
          r.unit = 's';
          let avail = K, wl = 0, fullAt = -1; const WL = Math.ceil(K * 0.3);
          arr.forEach((a, idx) => push({ t: idx / ADMIT + 1, k: 'admit', a: a / 1000 }));
          const give = t => { if (rnd() < 0.25) push({ t: t + HOLD, k: 'expire' }); else push({ t: t + 60 + rnd() * 240, k: 'pay' }); };
          while (heap.length) {
            const e = pop();
            if (e.k === 'admit') {
              if (fullAt >= 0) { r.soldout++; r.lat.push(fullAt + 0.5 - e.a); continue; }
              r.lat.push(e.t - e.a);
              if (avail > 0) { avail--; give(e.t); }
              else if (wl < WL) { wl++; if (wl === WL) fullAt = e.t; }
            } else if (e.k === 'pay') r.ok++;
            else { r.expired++; if (wl > 0) { wl--; give(e.t); } else avail++; }
          }
          r.soldout += wl;
          r.peak = Math.min(ADMIT, N);
        }
        r.lat.sort((a, b) => a - b);
        const q = p => r.lat.length ? r.lat[Math.min(r.lat.length - 1, Math.floor(p * r.lat.length))] : 0;
        r.p50 = q(0.5); r.p99 = q(0.99);
        delete r.lat;
        return r;
      }
      const pcNote = (m, r, N, K, left) => {
        const f = n => Math.round(n).toLocaleString('en-IN');
        if (m === 'none') return r.over ? `<strong>${f(r.over)} orders</strong> were confirmed for items (hoodies/seats) that do not exist. Anyone who reads qty before it is updated sees the old value (lost update). Every oversell = a refund + an angry fan.` : `No oversell this time, because the crowd was small. Make the crowd bigger and watch.`;
        if (m === 'lock') return r.err ? `0 oversold, but only one transaction at a time on the row. The line is so long that <strong>${f(r.err)} people</strong> got an error at the 2 s timeout, and at the peak ${f(r.peak)} requests were standing there holding DB connections. Even the sold-out check waits in line for the lock.` : `0 oversold. The price: a line. The last people waited ~${f(r.p99)} ms, and at the peak ${f(r.peak)} DB connections were tied up at the same time.`;
        if (m === 'occ') return `0 oversold, but CAS lost <strong>${f(r.retry)} times</strong> and was retried; ${f(r.err)} people gave up after the max retries.` + (left ? ` And <strong>${f(left)} items were left unsold</strong>: on a hot row only one can win every 5 ms, and the rest of the work is wasted.` : ` With few conflicts this is cheap; the bigger the crowd, the bigger the waste.`);
        if (m === 'atomic') return `Exactly ${f(r.ok)} sold, 0 oversold, and everyone got an answer in ~1 ms. Not a single synchronous DB transaction during the sale; the winners' orders are written later through a queue.`;
        return `${f(r.ok)} people paid. ${f(r.expired)} holds expired (people left the payment) and those items went to people on the waitlist (while anyone was left on it).` + (left ? ` ${f(left)} items went back into stock after the waitlist ran out.` : '') + ` The backend never got more than 200 users/s, and everyone got a clear answer in ~${r.p99.toFixed(1)} s (hold, waitlist or sold out).`;
      };
      const M = [['none', 'No protection'], ['lock', 'Row lock'], ['occ', 'Optimistic + retry'], ['atomic', 'Atomic Redis'], ['hold', 'Hold + waiting room']];
      el.innerHTML = `<div class="pc-pre" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center"><span style="font-size:13px;color:var(--ink-3)">Preset:</span></div>
        <div class="pc-modes" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px"></div>
        <div class="row2">
          <div><label>People who press Buy in 1 second: <strong class="pc-nv"></strong></label><input class="pc-n" type="range" min="200" max="10000" step="200" value="2000"></div>
          <div><label>Stock (hoodies / seats): <strong class="pc-kv"></strong></label><input class="pc-k" type="range" min="10" max="1000" step="10" value="100"></div>
        </div>
        <div style="margin-top:14px;font-size:13px;color:var(--ink-3)">Green = sold from real stock, red = oversold (items that do not exist), empty = unsold</div>
        <div style="position:relative;height:16px;background:var(--surface-2);border-radius:var(--r-sm);overflow:hidden;margin-top:4px">
          <div class="pc-bar" style="height:100%;background:var(--green);width:0"></div>
          <div class="pc-barx" style="position:absolute;top:0;height:100%;background:var(--red);width:0"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Confirmed orders</span><strong class="pc-ok"></strong></div>
          <div class="stat"><span>Oversold (fake orders)</span><strong class="pc-over"></strong></div>
          <div class="stat"><span>Conflicts / retries</span><strong class="pc-retry"></strong></div>
          <div class="stat"><span>Errors (timeout / gave up)</span><strong class="pc-err"></strong></div>
          <div class="stat"><span>Stock left (unsold)</span><strong class="pc-left"></strong></div>
          <div class="stat"><span>Answer time p50 / p99</span><strong class="pc-lat"></strong></div>
          <div class="stat"><span>Peak load on the backend</span><strong class="pc-peak"></strong></div>
        </div>
        <div class="calc-note pc-note"></div>
        <div class="calc-note" style="font-size:13px;color:var(--ink-3)">Model: fans arrive at random within 1 second (seeded, the same every time). DB transaction 5 ms. Row lock: app timeout 2 s, and even the sold-out check takes the lock for 1 ms. Optimistic: max 4 retries, exponential backoff + jitter. Redis: 1 ms round trip. Waiting room: 200 users/s let in, 10 min hold, 25% of people abandon the payment, waitlist = 30% of stock.</div>`;
      const $ = s => el.querySelector(s);
      let mode = 'none';
      const box = $('.pc-modes');
      M.forEach(([id, name]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = name; b.dataset.m = id; b.onclick = () => { mode = id; upd(); }; box.appendChild(b); });
      const PRE = [['1,000 people, 10 seats', 1000, 10], ['2,000 fans, 100 hoodies', 2000, 100], ['2,000 fans, 500 hoodies', 2000, 500], ['10,000 fans, 100 hoodies', 10000, 100]];
      const pre = $('.pc-pre');
      PRE.forEach(([name, n, k]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small ghost'; b.textContent = name; b.onclick = () => { $('.pc-n').value = n; $('.pc-k').value = k; upd(); }; pre.appendChild(b); });
      const fmt = n => Math.round(n).toLocaleString('en-IN');
      const t = (v, u) => u === 's' ? v.toFixed(1) + ' s' : (v < 10 ? v.toFixed(1) : fmt(v)) + ' ms';
      const upd = () => {
        const N = +$('.pc-n').value, K = +$('.pc-k').value;
        $('.pc-nv').textContent = fmt(N); $('.pc-kv').textContent = fmt(K);
        box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
        const r = pcSim(mode, N, K);
        const sold = Math.min(r.ok, K), left = Math.max(0, K - r.ok);
        $('.pc-ok').textContent = fmt(r.ok);
        $('.pc-over').textContent = fmt(r.over);
        $('.pc-over').style.color = r.over ? 'var(--red)' : '';
        $('.pc-retry').textContent = fmt(r.retry);
        $('.pc-err').textContent = fmt(r.err);
        $('.pc-err').style.color = r.err ? 'var(--amber)' : '';
        $('.pc-left').textContent = fmt(left);
        $('.pc-lat').textContent = t(r.p50, r.unit) + ' / ' + t(r.p99, r.unit);
        $('.pc-peak').textContent = mode === 'atomic' ? '0 DB txns (Redis)' : mode === 'hold' ? fmt(r.peak) + ' users/s' : fmt(r.peak) + (mode === 'lock' ? ' DB conns' : ' DB txns');
        const tot = Math.max(K, r.ok);
        $('.pc-bar').style.width = (sold / tot * 100) + '%';
        $('.pc-barx').style.left = (sold / tot * 100) + '%'; $('.pc-barx').style.width = (r.over / tot * 100) + '%';
        $('.pc-note').innerHTML = pcNote(mode, r, N, K, left);
      };
      $('.pc-n').addEventListener('input', upd); $('.pc-k').addEventListener('input', upd); $('.pc-n').value = 1000; $('.pc-k').value = 10; upd();
    }},
    { type: 'p', html: `With <strong>1,000 people, 10 seats</strong>: no protection = <strong>54 orders, so 44 seats oversold</strong>. Row lock = exactly 10, the last people wait ~47 ms, and 50 DB connections are in use at the peak. Optimistic = 10, but 94 CAS attempts lost and were retried. Atomic Redis = 10, everyone in ~1 ms. Hold + waiting room = 10 paid, and 3 holds expired and went to people in the line. With a small crowd, even a row lock works fine. Now what happens with <strong>2,000 fans, 100 hoodies</strong>:` },
    { type: 'list', items: [
      '<strong>No protection:</strong> 1,082 orders confirmed, so <strong>982 oversold</strong>. The fastest (5 ms) and the most wrong.',
      '<strong>Row lock:</strong> exactly 100 sold, 0 oversold. But the median user (the middle one, p50) waits ~0.9 s in line, and at the peak ~1,400 requests are holding DB connections at the same time. Make it 500 hoodies: the line becomes longer than the 2 s timeout and 1,000 people see an error.',
      '<strong>Optimistic + retry:</strong> 100 sold, but 3,677 lost CAS attempts, and 737 people gave up after their retries. The real shock comes at 500 hoodies: only 217 sold, <strong>283 left unsold</strong>, while 1,783 people saw an error and left. On a hot row, optimistic is the wrong tool.',
      '<strong>Atomic Redis:</strong> exactly 100, ~1 ms, and the DB was not even touched during the sale.',
      '<strong>Hold + waiting room:</strong> only 200 users per second reach the backend, 33 abandoned holds expired and went to the waitlist, and every fan gets a clear answer in ~2 s. This is the answer for cases where "buying = a process" (seats, tickets).',
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common beginner mistake: "put a lock in the app server"', html: `Java\'s <code>synchronized</code> or Python\'s <code>threading.Lock</code> only stops the threads (the workers inside a program) of <em>that one process</em> (one running program). xyz.com has 20 checkout servers; Riya is on server 3 and Kabir is on server 11. Each has its own separate lock, and both won. The contention decision always happens in a <strong>shared place</strong>: a DB row, a Redis key, or a lock service.` },
    { type: 'callout', tone: 'mistake', title: 'Another mistake: "check, then write" as two separate queries', html: `<code>if (redis.GET(stock) &gt; 0) redis.DECR(stock)</code> looks correct, but another client can sneak in between GET and DECR. Atomic means <strong>check and write in one step</strong>: one conditional UPDATE, one Lua script, or deciding based on the result of DECR.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide: how to pick a contention tool', html: `First question: <strong>how big is the crowd on one single thing?</strong> Second: <strong>is buying one click, or a process (payment, form)?</strong><br>• Conflicts are rare (profile edit, wiki, settings) → <strong>optimistic</strong> (step 2: version / ETag).<br>• Conflicts are common, data is in one DB, normal traffic (bank transfer, wallet) → <strong>row lock</strong> (step 1) or a single conditional UPDATE.<br>• A flash-sale crowd on one hot counter → <strong>atomic Redis</strong> (step 3: DECR / Lua), the DB later, plus a safety net in the DB.<br>• The user needs time to think/pay (seats, tickets) → <strong>hold with expiry</strong> (step 5).<br>• Demand is far bigger than supply and the backend cannot cope → a <strong>virtual waiting room</strong> in front (step 5).<br>• The resource is not a DB row (external API, a job that must run only once) → <strong>distributed lock + TTL + fencing</strong> (step 4).` },
    { type: 'table', head: ['Tool', 'Stops oversell?', 'Under a crowd', 'Where you see it'], rows: [
      ['Row lock (FOR UPDATE)', 'Yes', 'Long line, connections get tied up', 'Bank/wallet, inventory in one DB'],
      ['Optimistic (version / CAS)', 'Yes', 'Storm of retries, wasted work', 'Profile/doc edit, DynamoDB conditional write, HTTP If-Match'],
      ['Atomic Redis (DECR / Lua)', 'Yes (with a DB safety net)', 'Very fast, ~1 ms', 'Flash sale counter, likes, rate limits'],
      ['Distributed lock + TTL', 'Yes, with fencing', 'One at a time, one extra hop', 'Single-worker jobs, external API'],
      ['Hold + expiry', 'Yes', 'Abandoned items come back', 'BookMyShow, IRCTC Tatkal, ticket sites'],
      ['Virtual waiting room', 'Not by itself (it holds back the crowd)', 'Fixed rate to the backend', 'Concert tickets, big sales'],
    ]},

    { type: 'h2', text: 'The whole picture' },
    { type: 'diagram', title: 'The contention ladder on xyz.com: where each step sits', height: 540,
      groups: [
        { label: 'Door', x: 14, y: 14, w: 156, h: 238 },
        { label: 'Async', x: 242, y: 290, w: 176, h: 236 },
      ],
      nodes: [
        { id: 'fans', label: 'Fans', sub: '2 lakh, 8:00 PM', x: 92, y: 72, w: 140, kind: 'client', info: 'What it is: the xyz.com users who all want the same thing (a hoodie, a seat). Contention starts with their crowd.' },
        { id: 'wr', label: 'Waiting room', sub: 'CDN edge, step 5', x: 92, y: 200, w: 140, kind: 'edge', info: 'What it is: the virtual waiting room. It keeps the crowd in a line and sends ~200 users per second inside with an admission token. On normal days it is set to passthrough.' },
        { id: 'api', label: 'Checkout API', sub: 'stateless servers', x: 330, y: 200, w: 160, kind: 'server', info: 'What it is: the service that handles "Buy", running on many servers. It keeps no lock of its own (the servers are separate); the decision always happens in a shared place: Redis or Postgres.' },
        { id: 'redis', label: 'Redis', sub: 'stock, holds, locks', x: 530, y: 72, w: 170, kind: 'cache', info: 'What it is: an in-memory store. Three jobs: the atomic stock counter (step 3: DECR / Lua), seat holds with a TTL (step 5: SET NX EX 600), and distributed locks (step 4: SET NX PX).' },
        { id: 'db', label: 'Postgres', sub: 'rows, version, seats', x: 530, y: 330, w: 170, kind: 'data', info: 'What it is: the source of truth. Row locks on wallets (step 1), version checks on edits (step 2), the HELD/BOOKED status of seats, and the last safety net after a flash sale (WHERE qty > 0).' },
        { id: 'pay', label: 'Payment', sub: 'gateway + webhook', x: 92, y: 350, w: 140, kind: 'net', info: 'What it is: the outside payment gateway. The payment result arrives by webhook. It is never called while holding a lock.' },
        { id: 'q', label: 'Order queue', sub: 'winners only', x: 330, y: 340, w: 150, kind: 'queue', info: 'What it is: a message queue. The orders of everyone Redis called a "winner" wait here in line. The DB gets no load at the moment of the sale.' },
        { id: 'ow', label: 'Order worker', sub: 'idempotent', x: 330, y: 470, w: 150, kind: 'server', info: 'What it is: the worker that takes an order from the queue and writes it into the DB. It removes duplicates using the order id, so a retry never creates a second order.' },
        { id: 'job', label: 'Payout job', sub: '3 servers, 2 AM', x: 530, y: 470, w: 170, kind: 'server', info: 'What it is: the nightly creator payout job, scheduled on 3 servers. A distributed lock (TTL + fencing token) makes sure only one runs.' },
      ],
      edges: [
        { a: 'fans', b: 'wr', n: 1, label: 'line' },
        { a: 'wr', b: 'api', n: 2, label: 'token' },
        { a: 'api', b: 'redis', n: 3, label: 'DECR / hold' },
        { a: 'api', b: 'db', label: 'lock / version' },
        { a: 'api', b: 'pay', label: 'pay' },
        { a: 'api', b: 'q', n: 4 },
        { a: 'q', b: 'ow' },
        { a: 'ow', b: 'db', label: 'INSERT' },
        { a: 'job', b: 'redis', via: [[690, 470], [690, 72]], label: 'lock + TTL' },
        { a: 'job', b: 'db', label: 'token 34' },
      ],
      paths: [
        { name: 'Row lock', text: 'Step 1: checkout (or the wallet service) runs SELECT ... FOR UPDATE in Postgres. Others wait in line. Enough for normal traffic.', go: ['api>db'] },
        { name: 'Optimistic', text: 'Step 2: read without a lock, then UPDATE ... WHERE version = 7. 0 rows = someone changed it; retry or tell the user.', go: ['api>db'] },
        { name: 'Atomic Redis', text: 'Step 3: a Redis Lua script does check + DECR in one step (~1 ms). Winners go into the DB through the queue; the worker is idempotent.', go: ['fans>wr>api>redis', 'api>q>ow>db'] },
        { name: 'Lock + TTL', text: 'Step 4: the payout job runs on three servers; SET NX PX gives the lock to one. Every write carries a fencing token, and the DB rejects an old token.', go: ['job>redis', 'job>db'] },
        { name: 'Hold + waiting room', text: 'Step 5: line, token, a 10 min hold in Redis, HELD in the DB, payment, then a conditional UPDATE to BOOKED when the webhook arrives.', go: ['fans>wr>api>redis', 'api>pay', 'api>db'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Contention = many people, one thing, one moment. Naive "read, then write" = lost update = oversell.</li>
      <li>A lock inside the app server is useless (the servers are separate). The decision happens in a shared place: a DB row, a Redis key.</li>
      <li>Step 1, row lock: correct and simple, but one row runs at ~1/(transaction time) speed, with a line of DB connections.</li>
      <li>Step 2, optimistic (version / CAS): for rare conflicts and long edits. On a hot row it causes a storm of retries.</li>
      <li>Step 3, atomic Redis (DECR / Lua): a hot counter in ~1 ms. A safety net in the DB and reconciling are a must.</li>
      <li>Step 4, distributed lock + TTL: for things outside the DB. TTL alone is not enough; you need a fencing token.</li>
      <li>Step 5, hold + waiting room: a timed hold for a process like payment, and keep the crowd in a line at the CDN.</li>
      <li>Start at the bottom; climb only when the lower step breaks under your crowd.</li>
    </ul>` },
    { type: 'tradeoffs',
      gains: ['No more oversell and double booking: one item, one buyer', 'With atomic Redis + a queue, a flash sale runs in ~1 ms and the DB stays safe', 'With holds, abandoned seats are sold again automatically', 'With a waiting room, the backend gets a predictable load, and users get a clear answer'],
      costs: ['Row locks: a line, the risk of running out of connections, deadlocks', 'Optimistic: retries and unsold stock on a hot row', 'Redis counter: one more system, and you must reconcile it with the DB', 'Holds: extra logic for expiry, late payments and refunds', 'Waiting room: extra infrastructure, and the headache of fairness and bots'] },

    { type: 'think', questions: [
      { q: 'An online auction: a painting gets 500 bids in the last 10 seconds. A bid is valid only if it is higher than the current highest bid. Which tool?', a: 'A conditional write: <code>UPDATE auctions SET top_bid = 5200, top_bidder = 42 WHERE id = 7 AND top_bid &lt; 5200</code>. 1 row = your bid won, 0 rows = someone bid more. This is a form of optimistic/CAS, but with no need to retry: just tell the losing bid "outbid". If the crowd is very big, bids are partitioned by auction id and put in a single line, one at a time, by a single writer (or a Redis Lua script).' },
      { q: 'The Redis counter picked 100 winners, but the queue consumer that writes orders kept crashing on 3 orders. Now what?', a: 'The Redis decision is a "reservation", not an order. The consumer must be idempotent (remove duplicates by order_id) and retry; if it fails again and again, the message goes to a DLQ and an alarm rings. If the order can never be created, tell that user and put the stock back in Redis with INCR. After the sale, reconcile the Redis count against the orders in the DB.' },
      { q: 'IRCTC Tatkal opens at 10 AM. What happens without a waiting room, and why is rate limiting alone not enough?', a: 'Without a waiting room, the whole crowd hits login, search and booking at the same time; everything slows down, there are timeouts, and users refresh and add even more load. Rate limiting refuses extra requests with a 429, but it is unfair (whoever got in by luck wins) and users keep retrying anyway. A waiting room gives an order, shows the position, and sends the backend only as much as it can handle.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'Two requests read qty = 1 and both wrote qty = 0. What is this called?', options: ['Deadlock', 'Lost update (race condition)', 'Cache miss', 'Split brain'], answer: 1, explain: 'Both read the old value and wrote their own update; one update wiped out the other. This is a lost update, which is one type of race condition.' },
      { q: 'UPDATE items SET qty = 0, version = 8 WHERE id = 1 AND version = 7 returned 0 rows. What does it mean?', options: ['The database is down', 'Someone changed the row in between; read again and retry', 'The item was deleted, forever', 'The transaction is in a deadlock'], answer: 1, explain: 'Optimistic concurrency: the version did not match, so someone else wrote first. Read the fresh value and decide again.' },
      { q: '1 lakh fans, 500 hoodies, all in one second. What is the best combination?', options: ['SELECT FOR UPDATE on every request', 'Optimistic retry with 10 retries', 'Atomic Redis counter (Lua/DECR) + order queue, with a waiting room in front', 'A synchronized block in the app server'], answer: 2, explain: 'On a hot counter, atomic Redis is fast and correct, orders go into the DB through a queue, and the waiting room protects the backend from the crowd. A row lock builds a line, optimistic drowns in retries, and an app-level lock does not even work across separate servers.' },
      { q: 'A user held a seat, the hold expired after 10 minutes, and their payment success webhook arrived in the 11th minute. What is the right behaviour?', options: ['Give them the seat, even if someone else took it', 'The conditional UPDATE (held_by = user AND hold_until > now) will fail; refund them', 'Ignore the webhook', 'Give the seat to both'], answer: 1, explain: 'The UPDATE that confirms the booking checks that the hold still belongs to that user and is still valid. 0 rows = the seat is no longer theirs, so an automatic refund and a clear message.' },
      { q: 'The payout job\'s Redis lock has a TTL of 30 s. Worker A got stuck in a 40 s GC pause. What happens, and what saves us?', options: ['Nothing, Redis will wait for A', 'After the TTL, B gets the lock; A wakes up and sends an old write. A fencing token (the storage rejects a smaller token) saves us', 'Redis will crash A', 'Making the TTL longer solves the problem forever'], answer: 1, explain: 'As soon as the TTL runs out, the key is deleted and B becomes the holder. A does not find out. If the storage remembers the biggest token and rejects writes with a smaller token, A\'s late write does no harm. A longer TTL only makes the window smaller; it does not remove it.' },
    ]},
    { type: 'sources', note: 'Version-specific defaults and behaviour were checked against these docs.', items: [
      { title: 'Explicit Locking (row-level locks, FOR UPDATE, NOWAIT, SKIP LOCKED, deadlocks)', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/explicit-locking.html', used: 'FOR UPDATE blocking behaviour, deadlock detection, lock ordering advice.' },
      { title: 'SELECT: The Locking Clause', publisher: 'PostgreSQL documentation', official: true, url: 'https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE', used: 'NOWAIT and SKIP LOCKED semantics.' },
      { title: 'InnoDB Locking Reads and innodb_lock_wait_timeout', publisher: 'MySQL 8.0 Reference Manual', official: true, url: 'https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html', used: 'FOR UPDATE in MySQL, NOWAIT/SKIP LOCKED in 8.0, default lock wait timeout 50 s.' },
      { title: 'Scripting with Lua (atomicity of scripts)', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/interact/programmability/eval-intro/', used: 'Scripts run atomically and block other clients while running.' },
      { title: 'Distributed Locks with Redis', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/', used: 'A lock with SET key value NX PX 30000, safe release using a random value, DELEX IFEQ (Redis 8.4+) or a Lua script.' },
      { title: 'Waiting Room: queueing methods and scheduled events', publisher: 'Cloudflare documentation', official: true, url: 'https://developers.cloudflare.com/waiting-room/reference/queueing-methods/', used: 'FIFO, random, passthrough and reject queueing methods; fairness with an event pre-queue and "shuffle at event start".' },
      { title: 'Condition expressions (conditional writes)', publisher: 'Amazon DynamoDB documentation', official: true, url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html', used: 'Conditional put/update: write only if the condition is true, otherwise ConditionalCheckFailed. The DynamoDB form of optimistic concurrency.' },
      { title: 'How to do distributed locking', publisher: 'Martin Kleppmann (blog)', url: 'https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html', year: 2016, used: 'TTL lock pitfalls and fencing tokens (recap from the Coordination lesson).' },
    ]},
  ],
});
