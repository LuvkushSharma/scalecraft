Lesson.register({
  id: 'pattern-fanout',
  title: 'Real-time updates and fan-out',
  minutes: 32,
  summary: `One event, many receivers: one group message to 500 people, one live comment to 10 lakh viewers, one post into the feeds of 1 crore followers. There is a ladder for this: gateways → registry → pub/sub → fan-out on write (push) → hybrid (pull) for celebrities. When and why to climb each rung.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Sometimes one thing has to reach a lot of people: a group message to 500 people, a live comment to 10 lakh viewers, a post to 1 crore followers.<br>Sending it to each person separately is very slow and expensive.<br>This lesson is a ladder: how to handle connections, how to know who is where, how to spread one message to everyone, and what to do with the posts of big stars.` },
    { type: 'h2', text: 'The story so far' },
    { type: 'p', html: `In the <a href="#/realtime">Realtime lesson</a> we saw how a server can reach a client instantly (WebSocket/SSE). There, one message went to one person: from Riya to Aman. This lesson asks a bigger question: <strong>one event, many people</strong>.` },
    { type: 'callout', tone: 'term', title: 'Fan-out', html: `<strong>What it is:</strong> copying one input into many outputs, the way a hand fan spreads out from one point. 1 post × 10,000 followers = a fan-out of 10,000.<br><strong>Why it matters:</strong> in system design, fan-out happens in two places: (1) <strong>live delivery</strong>: right now, onto the screens of people who are online; (2) <strong>feed delivery</strong>: putting the post into each follower's timeline, so they see it when they open the app later.<br><strong>If you ignore it:</strong> one post from a big account can jam the whole system for minutes.` },
    { type: 'p', html: `xyz.com now has three new features: (1) group chat (up to 500 members), (2) live comments on a live stream (10 lakh viewers on one match), (3) a "following" feed: when a creator posts, it appears in followers' feeds, and those who are online get a "new post" badge at once. All three ask the same question: <strong>how do we get one event to N people, with how much work, and how fast?</strong>` },

    { type: 'h2', text: 'The ladder at a glance' },
    { type: 'steps', items: [
      { t: 'Persistent connection gateways', d: 'Gateway = a server whose only job is to hold users\' open connections (WebSocket). Symptom: one server\'s connections (~100k) are full. Fix: a fleet of servers that only handle connections. Cost: stateful servers, reconnects on deploy.' },
      { t: 'Registry: who is connected where', d: 'Registry = a small list like "Aman → Gateway 2". Symptom: the event arrived at Gateway 1, but the receiver is on Gateway 7. Fix: a user → gateway mapping (Redis, with a TTL). Cost: a lookup for every delivery, old entries.' },
      { t: 'Pub/sub between services and gateways', d: 'Pub/sub = a "radio channel": the sender speaks once, and everyone tuned to the channel hears it. Symptom: one event has thousands of online receivers, with a separate lookup and send for each one. Fix: one publish to a topic, and each gateway passes it to its local users. Cost: one more system; systems like Redis pub/sub do not store messages.' },
      { t: 'Fan-out on write (push) via workers', d: 'Push = putting the post into every follower\'s ready list as soon as it is posted. Symptom: the followers\' timelines must be filled when a post is made, and a loop makes the post API slow. Fix: a queue + workers that add the post ID to every follower\'s timeline. Cost: writes = the number of followers.' },
      { t: 'Hybrid: pull for celebrities', d: 'Pull = fetching posts when the feed is opened. Symptom: a post with 1 crore followers takes minutes and jams the workers. Fix: do not fan out celebrity posts; add them in when the follower reads the feed. Cost: a more complex read path.' },
    ]},

    { type: 'h2', text: 'Each rung, a bit deeper' },
    { type: 'p', html: `The first three rungs are about <strong>live delivery</strong> (to the screens of online people). The other two are about <strong>feed delivery</strong> (to the stored timeline). Each rung: the story with numbers → the technique → when to stop → a link to the deep lesson.` },
    { type: 'h3', text: 'Rung 1: persistent connection gateways' },
    { type: 'p', html: `<strong>Story:</strong> on the IPL final, 10 lakh people are online on xyz.com's live stream at the same time. Each phone keeps one open connection to the server, so that comments show up the moment they arrive. One server can hold about 1 lakh (100k) such connections (the roadmap's napkin number). 10 lakh ÷ 1 lakh = at least 10 servers. And if the rest of the app's code runs on these same servers, every deploy breaks 10 lakh connections.` },
    { type: 'callout', tone: 'term', title: 'Persistent connection (WebSocket)', html: `<strong>What it is:</strong> a connection between the phone and the server that stays open and is not closed. Like a phone call that stays on, instead of dialling again and again. WebSocket is the common way to do it.<br><strong>Why we need it:</strong> the server can send a message to the user instantly, whenever it wants.<br><strong>Without it:</strong> the phone asks "anything new?" every few seconds (polling): slow, and lots of wasted requests. Details: <a href="#/realtime">realtime</a>.` },
    { type: 'callout', tone: 'term', title: 'Connection gateway', html: `<strong>What it is:</strong> a separate group of servers whose <em>only</em> job is to hold open connections and write messages onto them. Business logic (saving, checking) lives in other services.<br><strong>Why we need it:</strong> connections are many and long-lived. Keeping them separate means deploying app code does not break connections, and gateways can be scaled on their own.<br><strong>Without it:</strong> one server's connection limit is the limit of the whole site, and on every deploy lakhs of users reconnect at once.<br><strong>Example:</strong> 10 lakh online ÷ (1 lakh × 60% full) = 17 gateways.` },
    { type: 'callout', tone: 'term', title: 'Heartbeat and reconnect storm', html: `<strong>What it is:</strong> a <strong>heartbeat</strong> = a small "I am alive" ping about every 30 seconds, so dead connections are caught. A <strong>reconnect storm</strong> = a gateway fails, and all its users try to connect again in the same second.<br><strong>Why it matters:</strong> the storm can knock over the other gateways and the registry. The fix: <strong>jitter</strong> (each app waits a slightly different random time before reconnecting).<br><strong>Without it:</strong> one failing gateway turns into a chain reaction.` },
    { type: 'p', html: `<strong>Gateway sizing lab.</strong> Pick the number of online users and the capacity of one gateway. Gateways are filled only to about 60%, so that if one fails, the others can take its users. Then see what "one gateway fails" does, with and without jitter.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div><label>Online users (at the same time): <strong class="gz-nv"></strong></label><input class="gz-n" type="range" min="4" max="7.7" step="0.1" value="6"></div>
        <div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px" class="gz-c"></div>
        <div style="margin:4px 0 8px;display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="chip on gz-j1">Reconnect with jitter (30 s)</button><button type="button" class="chip gz-j2">No jitter (all within 2 s)</button></div>
        <div class="gz-grid" style="display:flex;flex-wrap:wrap;gap:3px;margin:6px 0"></div>
        <div class="stats">
          <div class="stat"><span>Gateways</span><strong class="gz-g"></strong></div>
          <div class="stat"><span>Users per gateway</span><strong class="gz-u"></strong></div>
          <div class="stat"><span>Heartbeats/s</span><strong class="gz-h"></strong></div>
          <div class="stat"><span>One fails: reconnects/s</span><strong class="gz-r"></strong></div>
        </div>
        <div class="calc-note gz-note"></div>`;
      const $ = c => el.querySelector(c);
      const CAPS = [5e4, 1e5, 2e5];
      let ci = 1, jit = true;
      CAPS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = (c / 1e3) + 'k conn / gateway'; b.onclick = () => { ci = i; upd(); }; $('.gz-c').appendChild(b); });
      $('.gz-j1').onclick = () => { jit = true; upd(); }; $('.gz-j2').onclick = () => { jit = false; upd(); };
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n) + '';
      const upd = () => {
        const N = Math.round(Math.pow(10, +$('.gz-n').value)), C = CAPS[ci];
        const g = Math.max(2, Math.ceil(N / (C * 0.6))), per = N / g, hb = N / 30, rc = per / (jit ? 30 : 2);
        $('.gz-c').querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i === ci));
        $('.gz-j1').classList.toggle('on', jit); $('.gz-j2').classList.toggle('on', !jit);
        $('.gz-nv').textContent = f(N);
        $('.gz-g').textContent = g; $('.gz-u').textContent = f(per); $('.gz-h').textContent = f(hb); $('.gz-r').textContent = f(rc);
        const show = Math.min(g, 60);
        $('.gz-grid').innerHTML = Array.from({ length: show }, (_, i) => `<span style="width:16px;height:16px;border-radius:4px;background:${i === 0 ? 'var(--red)' : 'var(--accent-soft)'};border:1px solid ${i === 0 ? 'var(--red)' : 'var(--accent)'}"></span>`).join('') + (g > show ? `<span style="font-size:12px;color:var(--ink-3)">+${g - show}</span>` : '');
        $('.gz-note').innerHTML = `${f(N)} ÷ (${C / 1e3}k × 60%) = ${g} gateways (at least 2, so the site keeps working if one fails). The red one failed: its ${f(per)} users move to the other ${g - 1} gateways, about ${f(per / Math.max(1, g - 1))} extra on each. ` +
          (jit ? `With jitter this is spread out to ${f(rc)} reconnects/s. The registry and gateways handle it easily.` : `Without jitter, ${f(rc)} reconnects/s arrive together: each reconnect needs a TLS handshake + a registry write. This storm can knock over other gateways too.`);
      };
      $('.gz-n').addEventListener('input', upd); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'When to stop (gateways)', html: `If one server can hold all the connections under about 60% (say 50k online), you do not need a separate gateway fleet. Build a fleet when connections are more than one server can hold, or when broken connections on deploys are a problem. Climb to the next rung (registry) once there is more than one gateway: a message arrives on one gateway and the receiver is on another.` },
    { type: 'h3', text: 'Rung 2: registry (who is connected where)' },
    { type: 'p', html: `<strong>Story:</strong> there are 17 gateways. Riya is on Gateway 3, Aman is on Gateway 11. Riya sends Aman a message. How does the chat service know which gateway Aman is on? Sending to all 17 (a broadcast) is wasted work: 16 gateways do not have Aman at all.` },
    { type: 'callout', tone: 'term', title: 'Registry', html: `<strong>What it is:</strong> a fast key-value list (often Redis): <code>conn:aman → gw11</code>. When Aman connects, Gateway 11 writes this entry with a TTL (like 60 s, renewed on each heartbeat). On disconnect it removes it.<br><strong>Why we need it:</strong> one lookup tells you where to send the message.<br><strong>Without it:</strong> every message goes to every gateway, or there is no way to reach the receiver at all.<br><strong>Example:</strong> 3 group members: <code>MGET conn:aman conn:kabir conn:zoya → [gw11, gw11, gw2]</code>.` },
    { type: 'p', html: `<strong>Cost:</strong> one lookup for every delivery. Old (stale) entries: if a gateway dies and its entries are still there, they go away only after the TTL. <strong>Limit:</strong> the work = the number of receivers. 3 or 500 receivers are fine. 10 lakh receivers = 10 lakh lookups + 10 lakh sends for every comment.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (registry)', html: `For 1:1 chat and small groups (up to a few hundred), the registry is enough. Climb to the next rung (pub/sub) when one event has <strong>thousands of online receivers</strong>, like live stream comments or big channels.` },
    { type: 'h3', text: 'Rung 3: pub/sub between services and gateways' },
    { type: 'p', html: `<strong>Story:</strong> 10 lakh viewers on the live stream, 17 gateways. About 1,000 comments every second. With the registry approach: 1,000 × 10 lakh = 100 crore lookups and sends every second. No system can handle that. But notice: the 10 lakh viewers sit on only 17 gateways.` },
    { type: 'callout', tone: 'term', title: 'Pub/sub and topic', html: `<strong>What it is:</strong> publish/subscribe. The sender puts a message once on a <strong>topic</strong> (a named channel, like <code>live:ipl</code>). Everyone who has subscribed to that topic gets a copy. The sender does not even know who is listening. Like a radio station: speak once, and everyone on that frequency hears it.<br><strong>Why we need it:</strong> here the subscribers are <em>gateways</em>, not users. When a viewer joins the stream, their gateway subscribes to the topic. The service publishes once, pub/sub gives 17 copies to 17 gateways, and each gateway passes it to its ~60k local viewers.<br><strong>Without it:</strong> the service needs a separate lookup and send for every viewer.<br><strong>Example:</strong> Redis Pub/Sub, NATS, or Kafka. The same idea as the <a href="#/queues">pub/sub in the queues lesson</a>, but here speed and fan-out matter more, and durability matters less.` },
    { type: 'p', html: `<strong>Cost:</strong> one more system. Redis Pub/Sub <strong>does not store messages</strong>: a gateway that was not connected at that moment loses the message (at-most-once). So every message gets a sequence number, and if there is a gap, you ask the DB for the missing one. <strong>Limit:</strong> this is only for <em>online</em> people. Someone offline right now needs the post in their feed when they open the app later. That is feed delivery: the next two rungs.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (pub/sub)', html: `The live delivery ladder ends here. Just add topics and gateways; with very many gateways, add regional relays (a tree of pub/sub). If, besides online people, you also need to fill the <strong>stored feeds of offline followers</strong>, then comes the feed delivery question: push or pull.` },
    { type: 'h3', text: 'Rung 4: fan-out on write (push) via queue + workers' },
    { type: 'p', html: `<strong>Story:</strong> Aman has 200 followers. He posts. Whenever his followers open the app, the post must be in their feed. And opening the feed happens 50-100 times more often than posting (in Twitter's 2013 talk: about 300k timeline reads/s vs about 5k tweets/s). So reading the feed must be <em>cheap</em>.` },
    { type: 'callout', tone: 'term', title: 'Push (fan-out on write) and timeline', html: `<strong>What it is:</strong> each user has a ready list (a <strong>timeline</strong>), often in Redis: the latest ~800 post IDs. When a post is written, add its ID to the front of every follower's timeline. Reading the feed = reading your own list.<br><strong>Why we need it:</strong> the read is very cheap (one list), and reads are the majority. This is a form of a <a href="#/pattern-reads">precomputed view</a>.<br><strong>Without it:</strong> on every feed open, find and combine the posts of everyone you follow.<br><strong>How:</strong> the post API puts one job in a queue and says OK at once. Workers read the follower list and add the ID to each timeline. 200 followers = 200 small writes, in milliseconds.` },
    { type: 'callout', tone: 'term', title: 'Pull (fan-out on read)', html: `<strong>What it is:</strong> the post is saved only with its author. When a follower opens the feed, fetch the latest posts of everyone they follow, combine them and sort them.<br><strong>Why it is sometimes good:</strong> writing is the cheapest possible (1 row). No wasted work for inactive users.<br><strong>The downside:</strong> on every feed open, fetch posts from about 300 authors (across many shards), and feed opens are very frequent. Reads are expensive.` },
    { type: 'callout', tone: 'term', title: 'Celebrity problem', html: `<strong>What it is:</strong> with push, the cost of one post = the author's followers. A normal user with 200 followers: 200 writes. A star with 5 crore followers: <strong>one post = 5 crore writes</strong>.<br><strong>Why it is a problem:</strong> even at about 300k writes/s, that takes about 2.8 minutes. The workers are busy, and everyone else's posts wait behind it. And most of those followers have not visited in months: wasted work and wasted RAM.<br><strong>If you do not spot it:</strong> one star's post jams the whole feed system. This is the "celebrity key" from <a href="#/sharding">sharding</a>, in the form of writes.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (push)', html: `If even the biggest author's post reaches all timelines in a few seconds (napkin: about 3 s for up to ~1M followers), push is enough. Climb to the next rung when posts from big accounts take minutes or eat a large share of the workers.` },
    { type: 'h3', text: 'Rung 5: hybrid (pull for celebrities)' },
    { type: 'p', html: `<strong>Story:</strong> the star Meera (5 crore followers) posts 10 times a day = 50 crore timeline writes every day, for just one person. The fix: <strong>hybrid</strong>. Normal authors use push. A celebrity author's post (followers above a threshold, like 10 lakh) is only saved, not put into any timeline. When a follower opens the feed: their ready timeline + the latest posts of the ~5 celebrities they follow (from a hot cache) → merge. Online followers get the "new post" badge through pub/sub (rung 3).` },
    { type: 'p', html: `<strong>Push vs pull vs hybrid lab.</strong> Pick one author's followers and posts per day. Model: 20% of followers are active each day, each active follower opens the feed 10 times a day, the workers together do about 300k timeline writes/s, and the celebrity threshold is 10 lakh.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2"><div><label>Author's followers: <strong class="pp-fv"></strong></label><input class="pp-f" type="range" min="3" max="8" step="0.1" value="7.7"></div>
        <div><label>Posts per day: <strong class="pp-pv"></strong></label><input class="pp-p" type="range" min="1" max="50" step="1" value="10"></div></div>
        <div style="margin:8px 0;display:flex;flex-wrap:wrap;gap:6px" class="pp-m"></div>
        <div class="pp-bars" style="display:grid;gap:8px"></div>
        <div class="stats">
          <div class="stat"><span>Timeline writes / day</span><strong class="pp-w"></strong></div>
          <div class="stat"><span>Wasted writes on inactive</span><strong class="pp-x"></strong></div>
          <div class="stat"><span>Extra feed reads / day</span><strong class="pp-r"></strong></div>
          <div class="stat"><span>Ek post sab tak</span><strong class="pp-t"></strong></div>
        </div>
        <div class="calc-note pp-note"></div>`;
      const $ = c => el.querySelector(c);
      const MODES = ['Push', 'Pull', 'Hybrid'], T = 1e6, W = 3e5, ACT = 0.2, OPENS = 10;
      let mi = 0;
      MODES.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = m; b.onclick = () => { mi = i; upd(); }; $('.pp-m').appendChild(b); });
      const f = n => n >= 1e7 ? (n / 1e7).toFixed(1) + ' cr' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' lakh' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : Math.round(n) + '';
      const tm = s => s < 1 ? Math.round(s * 1000) + ' ms' : s < 120 ? s.toFixed(1) + ' s' : (s / 60).toFixed(1) + ' min';
      const upd = () => {
        const F = Math.round(Math.pow(10, +$('.pp-f').value)), P = +$('.pp-p').value;
        const push = mi === 0 || (mi === 2 && F < T);
        const w = push ? F * P : 0, x = push ? F * P * (1 - ACT) : 0, r = push ? 0 : F * ACT * OPENS, t = F / W;
        const busy = F * P / W / 864;
        $('.pp-m').querySelectorAll('.chip').forEach((b, i) => b.classList.toggle('on', i === mi));
        $('.pp-fv').textContent = f(F); $('.pp-pv').textContent = P;
        $('.pp-w').textContent = f(w); $('.pp-x').textContent = f(x); $('.pp-r').textContent = f(r);
        $('.pp-t').textContent = push ? tm(t) : 'when feed opens';
        const bar = (lbl, v, col) => `<div><div style="font-size:13px;color:var(--ink-2)">${lbl}</div><div style="height:12px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:12px;width:${Math.max(push || lbl[0] !== 'W' ? 1 : 0, Math.min(100, v))}%;background:${col}"></div></div></div>`;
        $('.pp-bars').innerHTML = bar('Workers\' day (push writes) ' + (push ? busy.toFixed(busy < 1 ? 3 : 1) + '%' : '0%'), push ? busy : 0, busy > 1 ? 'var(--red)' : 'var(--green)');
        $('.pp-note').innerHTML = (mi === 2 ? (F >= T ? `<strong>Hybrid: ${f(F)} ≥ 10 lakh, so pull.</strong> ` : `<strong>Hybrid: ${f(F)} < 10 lakh, so push.</strong> `) : '') +
          (push ? `Each post goes into ${f(F)} timelines, in ${tm(t)}. ${f(w)} writes a day, of which ${f(x)} are for followers who will not even visit today. This one author takes ${busy.toFixed(busy < 1 ? 3 : 1)}% of the workers' time every day.` :
          `No timeline writes. On every feed open of every active follower, this author's latest posts come from one hot cache key: ${f(r)} small reads a day. It is the same key again and again, so it is a cache hit.`);
      };
      $('.pp-f').addEventListener('input', upd); $('.pp-p').addEventListener('input', upd); upd();
    }},
    { type: 'p', html: `<strong>Cost (hybrid):</strong> a complex read path: two paths, merging, ranking, and tuning the threshold. Some systems also do the opposite: skip push for <em>inactive followers</em>, and build their feed with pull when they log in. The full feed design: the Phase 8 <a href="#/design-feed">Instagram / Twitter feed</a> lesson.` },
    { type: 'callout', tone: 'tip', title: 'When to stop (hybrid)', html: `This is the top rung of the feed ladder. After this, just add workers, timeline cache shards and the hot cache for celebrity posts. Do not base the threshold only on followers: look at <strong>followers × posts per day</strong> (the real cost of push).` },
    { type: 'h2', text: 'The escalation ladder: move both sliders' },
    { type: 'p', html: `Here the load comes from two things: <strong>how many people are online</strong> (connections, gateways) and <strong>how many followers one post has</strong> (fan-out). Change both and see which rungs become necessary, how much work one post creates, and how long it takes to reach everyone.` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>Online users (concurrent): <strong class="pf-vn"></strong></label><input class="pf-n" type="range" min="3" max="8" step="0.05" value="6"></div>
          <div><label>Followers of this post's author: <strong class="pf-vf"></strong></label><input class="pf-f" type="range" min="1" max="8" step="0.05" value="4"></div>
        </div>
        <div class="pf-ladder" style="display:grid;gap:6px;margin-top:10px"></div>
        <svg class="pf-svg" viewBox="0 0 360 132" style="width:100%;max-width:520px;height:auto;margin-top:12px;display:block"></svg>
        <div class="stats">
          <div class="stat"><span>Gateways (100k conn each)</span><strong class="pf-gw"></strong></div>
          <div class="stat"><span>Timeline writes / post</span><strong class="pf-w"></strong></div>
          <div class="stat"><span>Time to reach all feeds</span><strong class="pf-t"></strong></div>
          <div class="stat"><span>Live msgs / post (registry → pub/sub)</span><strong class="pf-live"></strong></div>
        </div>
        <div class="calc-note pf-note"></div>`;
      const $ = c => el.querySelector(c);
      const GW = 1e5, ONLINE = 0.1, WORKERS = 3e5, SYNC_MS = 0.5, CELEB = 1e6;
      const f = n => n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'k' : Math.round(n).toString();
      const tm = s => s < 1 ? Math.round(s * 1000) + ' ms' : s < 120 ? s.toFixed(1) + ' s' : (s / 60).toFixed(1) + ' min';
      const box = (t, x, y, w, on) => `<g opacity="${on ? 1 : 0.3}"><rect x="${x}" y="${y}" width="${w}" height="34" rx="7" fill="${on ? 'var(--accent-soft)' : 'var(--surface-2)'}" stroke="${on ? 'var(--accent)' : 'var(--line-2)'}" ${on ? '' : 'stroke-dasharray="4 3"'}/><text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-size="11.5" fill="var(--ink)" font-family="var(--f-body)">${t}</text></g>`;
      const ln = (d, on) => `<path d="${d}" fill="none" stroke="var(--ink-3)" stroke-width="1.2" opacity="${on ? 1 : 0.2}"/>`;
      const upd = () => {
        const N = Math.round(Math.pow(10, +$('.pf-n').value)), F = Math.round(Math.pow(10, +$('.pf-f').value));
        $('.pf-vn').textContent = f(N); $('.pf-vf').textContent = f(F);
        const gws = Math.ceil(N / GW), live = Math.min(N, Math.round(F * ONLINE));
        const celeb = F >= CELEB;
        const pushT = F / WORKERS, syncT = F * SYNC_MS / 1000;
        const need = [true, gws > 1, gws > 1 && live >= 1000, syncT > 0.5, celeb];
        const why = [
          `${f(N)} connections ÷ 100k = ${gws} server${gws > 1 ? 's' : ''}. ${gws > 1 ? 'One server is not enough.' : 'One server is enough.'}`,
          gws > 1 ? `${gws} gateways: an event can arrive on any gateway, and the receiver can be on another one. You need a registry.` : 'Everyone is on one server: a local map is enough.',
          need[2] ? `${f(live)} online followers spread over ${Math.min(gws, live)} gateways. ${Math.min(gws, live)} pub/sub messages instead of ${f(live)} per-user lookups+sends.` : gws > 1 ? `Only ${f(live)} online followers: sending to each one directly through the registry is fine.` : 'Everyone is on one server: a local loop is enough.',
          need[3] ? `A loop inside the post API: ${f(F)} × 0.5 ms = ${tm(syncT)}. The post button cannot stay stuck that long: queue + workers.` : `The sync loop takes only ${tm(syncT)}: it can run inside the post API.`,
          celeb ? `Push means ${f(F)} writes, ${tm(pushT)} for the workers. Everyone else's posts wait in line. Move celebrity posts to pull.` : `Push finishes in ${tm(pushT)} (< ~3 s): no need for the celebrity rung.`,
        ];
        const names = ['Persistent connections (WebSocket/SSE)', 'Gateway fleet + registry', 'Pub/sub: services → gateways', 'Fan-out on write via queue + workers', 'Hybrid: celebrity posts on pull'];
        const top = need.lastIndexOf(true);
        $('.pf-ladder').innerHTML = names.map((n, i) => `<div style="border:1px solid ${need[i] ? 'var(--accent)' : 'var(--line)'};border-radius:var(--r-sm);padding:6px 10px;background:${i === top ? 'var(--accent-soft)' : 'var(--surface)'};opacity:${need[i] ? 1 : 0.6}">
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;font-size:14px"><strong>${i + 1}. ${n}</strong><span style="font-size:12px;color:${need[i] ? 'var(--accent-ink)' : 'var(--ink-3)'}">${need[i] ? 'needed' : 'not now'}</span></div>
            <div style="font-size:13px;color:var(--ink-2);margin-top:2px">${why[i]}</div></div>`).join('');
        $('.pf-svg').innerHTML = ln('M75 37 H85', true) + ln('M165 37 H175', need[3]) + ln('M260 37 H270', need[3]) +
          ln(need[2] ? 'M125 54 L217 82' : 'M125 54 V82', true) + ln('M175 99 H165', need[2]) + ln('M85 99 H75', true) + ln('M125 116 C125 130, 312 130, 312 116', need[1] && !need[2]) +
          box('Poster', 5, 20, 70, true) + box('Post svc', 85, 20, 80, true) + box('Workers', 175, 20, 85, need[3]) + box(celeb ? 'Timeline+pull' : 'Timelines', 270, 20, 85, true) +
          box('Followers', 5, 82, 70, true) + box(gws > 1 ? 'Gateways ×' + gws : 'WS server', 85, 82, 80, true) + box('Pub/sub', 175, 82, 85, need[2]) + box('Registry', 270, 82, 85, need[1]);
        $('.pf-gw').textContent = String(gws);
        $('.pf-w').textContent = celeb ? '0 (pull)' : f(F);
        $('.pf-t').textContent = celeb ? 'read pe (~0)' : need[3] ? tm(pushT) : tm(syncT);
        $('.pf-live').textContent = f(live) + ' → ' + (need[2] ? Math.min(gws, live) : f(live));
        $('.pf-note').innerHTML = `Highest rung needed: <strong>${top + 1}. ${names[top]}</strong>. ` + (celeb ? `In hybrid this post is not written to anyone's timeline; each follower, when opening the feed, fetches the latest posts of the celebrities they follow (say ~5) separately: a feed read = 1 timeline read + ~5 small reads. Online followers get the "new post" badge through pub/sub. ` : '') +
          `<br>Assumptions: one gateway ~100k connections (roadmap), ~10% of followers online, fan-out workers together ~300k timeline writes/s (matches the ~3.5 s p50 for up to ~1M followers in Twitter's 2013 talk), sync loop ~0.5 ms per follower write, celebrity threshold 1M followers (real systems set this knob by looking at cost).`;
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd)); upd();
    }},
    { type: 'callout', tone: 'tip', title: 'What to learn from the widget', html: `Default (10 lakh online, 10k followers): 10 gateways, a registry, pub/sub (1k online followers, 10 gateway messages), and workers (a sync loop would take 5 s). Push finishes in about 33 ms. Set followers to 8-9 lakh: push takes about 3 s. As soon as you pass 1M, the widget switches to hybrid. At 10 crore followers push would take about 5.6 minutes, which is why hybrid exists. Set online users to 50k: a single server, and both registry and pub/sub become "not now".` },

    { type: 'h2', text: 'Part 1: live delivery, from registry to pub/sub' },
    { type: 'p', html: `First, reaching online people instantly. A group chat has few receivers, a live stream has very many. See how far the registry goes, and when pub/sub comes in.` },
    { type: 'flow', height: 370,
      nodes: [
        { id: 'cm', label: 'Commenter', sub: 'Riya', x: 75, y: 70, w: 120, kind: 'client', info: 'What it is: the user sending a comment or message (Riya). Riya commented on the live stream, or sent a message in a group. Her own WebSocket is on one of the gateways (drawn straight to the service here).' },
        { id: 'cs', label: 'Comment svc', sub: 'save + route', x: 260, y: 70, w: 140, kind: 'server', meter: true, load: 20, info: 'What it is: the service with the business logic for comments. Job: validate the comment, save it in the DB (with a sequence number), then send it to the receivers: through the registry for a small group, through pub/sub for a big audience.' },
        { id: 'ps', label: 'Pub/sub', sub: 'topic: live:ipl', x: 460, y: 70, w: 150, kind: 'queue', hidden: true, info: 'What it is: a topic-based pub/sub system (like Redis Pub/Sub), rung 3. The service publishes once; every subscribed gateway gets one copy. Redis Pub/Sub does not store messages: for anyone not connected at that moment, the message is gone.' },
        { id: 'reg', label: 'Registry', sub: 'user → gateway', x: 130, y: 220, w: 140, kind: 'cache', info: 'What it is: the user → gateway list, rung 2. Entries like aman → gw2 in Redis, with a TTL. Perfect for 1:1 and small groups. One lookup per receiver.' },
        { id: 'g1', label: 'Gateway 1', sub: '100k sockets', x: 360, y: 220, w: 130, kind: 'server', meter: true, load: 50, info: 'What it is: a connection gateway, rung 1. It only handles connections. It keeps a map of its local users: who is in which topic/room. When a message arrives from pub/sub, it loops over its local subscribers and sends it.' },
        { id: 'g2', label: 'Gateway 2', sub: '100k sockets', x: 560, y: 220, w: 130, kind: 'server', meter: true, load: 50, info: 'What it is: a second connection gateway. Why it is here: users are spread over many gateways. A real system has tens to hundreds of these gateways.' },
        { id: 'v', label: 'Viewers', sub: 'online receivers', x: 460, y: 330, w: 150, kind: 'client', info: 'What it is: the online receivers, on different gateways. 3 in a group, 10 lakh on a live stream.' },
      ],
      edges: [{ a: 'cm', b: 'cs' }, { a: 'cs', b: 'reg' }, { a: 'cs', b: 'g1', id: 'd1' }, { a: 'cs', b: 'g2', id: 'd2' }, { a: 'cs', b: 'ps' }, { a: 'ps', b: 'g1' }, { a: 'ps', b: 'g2' }, { a: 'g1', b: 'reg', dashed: true }, { a: 'g1', b: 'v' }, { a: 'g2', b: 'v' }],
      scenarios: [
        { name: 'Group chat: registry', intro: '3 people in the group are online: two on Gateway 1, one on Gateway 2.', steps: [
          { title: 'A message arrives', text: 'Riya wrote in the group. The service first saves it in the DB (seq 812), so the message survives even if delivery fails.', go: 'cm>cs', msg: '{ "group": "g-55", "text": "see you tomorrow", "client_msg_id": "c-9" }  → seq 812' },
          { title: 'Each member\'s gateway', text: '3 lookups in the registry: aman → gw1, kabir → gw1, zoya → gw2. (This can also be one MGET.)', go: ['cs>reg', 'res:reg>cs'], after: { reg: { state: 'hit', sub: '3 lookups' } }, msg: 'MGET conn:aman conn:kabir conn:zoya  →  [gw1, gw1, gw2]' },
          { title: 'Straight to the gateways', text: 'One call to Gateway 1 (2 users), one to Gateway 2. The gateways write to the sockets. The work = the number of receivers. For 3 or up to 500, this is perfectly fine.', parallel: true, go: ['cs>g1>v', 'cs>g2>v'], after: { v: { state: 'ok', sub: 'all three got it' } } },
        ]},
        { name: 'Live stream: pub/sub', intro: 'The IPL final live stream: 10 lakh viewers, 10 gateways. Every comment must be shown to everyone.', steps: [
          { title: 'The registry approach blows up', text: 'For every comment, 10 lakh registry lookups and 10 lakh separate sends. 1,000 comments/s × 10 lakh = 100 crore operations/s. Both the registry and the service are gone.', flood: { paths: ['cs>reg', 'cs>g1', 'cs>g2'], n: 15 }, after: { reg: { state: 'hot', sub: '10 lakh lookups!' }, cs: { state: 'hot', load: 99 } } },
          { title: 'The gateways subscribe', text: 'Now think the other way round. When a viewer joins the stream, their gateway subscribes to the <code>live:ipl</code> topic (if it has not already) and adds the viewer to its local list. Pub/sub only knows "which gateways", not users.', show: ['ps'], hide: ['d1', 'd2'], parallel: true, go: ['g1>ps', 'g2>ps'], set: { reg: { state: '', sub: 'only for 1:1' }, cs: { state: '', load: 20 } }, msg: 'SUBSCRIBE live:ipl     (each gateway, once)' },
          { title: 'One publish', text: 'A comment arrives: the service saves it and does <strong>one</strong> publish. Pub/sub gives 10 copies to 10 gateways.', go: ['cm>cs', 'cs>ps'], after: { ps: { state: 'hit', sub: '1 → 10 gateways' } }, msg: 'PUBLISH live:ipl {"seq": 40012, "user": "riya", "text": "SIXER!"}' },
          { title: 'Local fan-out on the gateway', text: 'Each gateway loops over its ~1 lakh local viewers and sends it. The work is now shared evenly across the gateways. The service\'s work: 1 publish. One more trick: nobody can read 1,000 comments/s, so the gateway sends each viewer only a sample (say 20/s) or a batch.', parallel: true, go: ['ps>g1>v', 'ps>g2>v'], after: { v: { state: 'ok', sub: '10 lakh got it' }, g1: { load: 70 }, g2: { load: 70 } } },
        ]},
        { name: 'Failure: pub/sub message miss', intro: 'Pub/sub is the top rung. Now a network blip.', steps: [
          { title: 'Gateway 2\'s pub/sub link breaks', text: 'Gateway 2\'s pub/sub connection broke for 2 seconds. In that time, comment 40013 was published.', show: ['ps'], hide: ['d1', 'd2'], set: { g2: { state: 'warn', sub: 'resubscribing' } }, parallel: true, go: ['cm>cs>ps', 'ps>g1>v', 'lost:ps>g2'] },
          { title: 'The message is gone', text: 'Redis Pub/Sub is <strong>at-most-once</strong>: for a subscriber not connected at that moment, the message is not stored anywhere. The 1 lakh viewers on Gateway 2 will never get 40013.', focus: ['ps', 'g2'], after: { ps: { state: 'warn', sub: 'no storage' } } },
          { title: 'Fix: seq + catch-up', text: 'Every message has a sequence number and is saved in the DB. Gateway 2 subscribes again and sees: last received 40012, now got 40014. A gap! It asks the service for 40013. Where even this is not needed (live comments), a small loss is fine. Where every message matters (chat), use a durable log (Redis Streams, Kafka) or have the client "resume from the last seq".', show: ['d2'], go: ['g2>ps', 'g2>cs', 'res:cs>g2>v'], after: { g2: { state: 'ok', sub: 'gap filled: 40013' }, ps: { state: '', sub: 'topic: live:ipl' } }, msg: 'last_seen=40012, got=40014 → fetch 40013' },
        ]},
      ],
    },
    { type: 'h2', text: 'Part 2: feed fan-out, push vs pull' },
    { type: 'p', html: `Live delivery is only for people who are online. For all the other followers, the post must be in their feed whenever they open the app. Here the real question is: do the work <strong>when posting</strong> (push) or <strong>when reading the feed</strong> (pull)?` },
    { type: 'flow', height: 350,
      nodes: [
        { id: 'p', label: 'Poster', sub: '200 followers', x: 75, y: 70, w: 120, kind: 'client', info: 'What it is: the user making the post. A normal user has about 200 followers; a celebrity has crores.' },
        { id: 'post', label: 'Post service', x: 260, y: 70, w: 140, kind: 'server', info: 'What it is: the service that receives posts. It saves the post in the Posts DB, then puts a fan-out job in the queue (push), or does nothing (pull / celebrity).' },
        { id: 'q', label: 'Fan-out workers', sub: 'queue + workers', x: 470, y: 70, w: 160, kind: 'queue', meter: true, load: 15, info: 'What it is: the queue (Kafka/SQS) + workers that do the fan-out. Each job: get the author\'s follower list, and add the post ID to each follower\'s timeline. The post API does not have to wait for this.' },
        { id: 'tl', label: 'Timeline cache', sub: 'Redis: list/user', x: 630, y: 200, w: 140, kind: 'cache', meter: true, load: 20, info: 'What it is: each user\'s ready timeline list (Redis). The latest ~800 post IDs (Twitter also had a limit of ~800 in 2013). Only IDs, not the whole post; the post content comes from a separate cache/DB. A form of precomputed view.' },
        { id: 'pdb', label: 'Posts DB', sub: 'by author', x: 260, y: 200, w: 140, kind: 'data', meter: true, load: 20, info: 'What it is: the posts database, the real home of every post, sharded/indexed by author_id + time. In pull and hybrid, the feed service reads an author\'s latest posts from here.' },
        { id: 'feed', label: 'Feed service', x: 420, y: 300, w: 140, kind: 'server', meter: true, load: 20, info: 'What it is: the service that builds feeds. Job: read the timeline cache, (in hybrid) fetch the latest posts of followed celebrities from the Posts DB/cache, merge by time or ranking, fill in the post content, and paginate.' },
        { id: 'f', label: 'Follower', sub: 'opened the app', x: 75, y: 300, w: 120, kind: 'client', info: 'What it is: the follower\'s app. The follower opened the app: GET /feed. Reads are far more frequent than posts (Twitter 2013: ~300k timeline reads/s vs ~5-6k tweets/s).' },
      ],
      edges: [{ a: 'p', b: 'post' }, { a: 'post', b: 'q' }, { a: 'q', b: 'tl' }, { a: 'post', b: 'pdb' }, { a: 'f', b: 'feed' }, { a: 'feed', b: 'tl' }, { a: 'feed', b: 'pdb' }],
      scenarios: [
        { name: 'Push (fan-out on write)', steps: [
          { title: 'Save the post', text: 'Aman (200 followers) posted. The post service saves it in the Posts DB.', go: ['p>post>pdb', 'res:pdb>post>p'], msg: 'INSERT post 9001 by aman' },
          { title: 'Fan-out job', text: 'One job in the queue: "9001 to aman\'s followers". The post API already said OK to the user.', go: 'evt:post>q', after: { q: { sub: 'job: 9001 → 200' } } },
          { title: 'Into 200 timelines', text: 'A worker reads the follower list and adds 9001 to the front of each list (in a pipeline, milliseconds). Writes = the number of followers.', go: 'q>tl', after: { tl: { state: 'hit', sub: '+200 entries' } }, msg: 'LPUSH timeline:riya 9001; LTRIM timeline:riya 0 799   (×200)' },
          { title: 'Reading the feed: one list', text: 'Riya opened the app. The feed service reads one list and fills in the post content from the cache. Cheap and fast, and reads are the majority. That is why push is the default.', go: ['f>feed>tl', 'res:tl>feed>f'], after: { f: { state: 'ok', sub: 'feed ~10 ms' } }, msg: 'LRANGE timeline:riya 0 49' },
        ]},
        { name: 'Pull (fan-out on read)', steps: [
          { title: 'Only save the post', text: 'The post is saved, only in the Posts DB. No fan-out. Writing is the cheapest possible.', go: ['p>post>pdb'], set: { q: { state: 'dim' }, tl: { state: 'dim' } } },
          { title: 'Combine everything at read time', text: 'Riya follows 300 people. On every feed open: fetch the latest posts of 300 authors (scatter, across many shards), merge, sort, take the top 50. Every read is expensive, and feed opens are 50-100 times more frequent than posts.', go: ['f>feed>pdb', 'res:pdb>feed>f'], after: { pdb: { state: 'hot', load: 95, sub: '300 queries/open' }, feed: { state: 'hot', load: 90 } }, msg: 'for author in following(riya): latest_posts(author, 20)   -- ×300, then merge' },
          { title: 'When is it good?', text: 'Pull is fine when reads are few, or people follow few accounts, or for inactive users (filling the timeline of someone who visits once a month on every post is wasted). And for celebrity posts: write once, everyone reads.', focus: ['pdb'] },
        ]},
        { name: 'Failure: celebrity push', intro: 'Push is the default at the top. Now a star (5 crore followers) posts.', steps: [
          { title: 'One post, 5 crore writes', text: 'The fan-out job: 5 crore timelines. Even at ~300k writes/s, about 2.8 minutes. Twitter\'s 2013 talk also said that tweets from big accounts sometimes took minutes to reach everyone.', set: { p: { label: 'Star', sub: '5 cr followers' } }, go: ['p>post>pdb', 'evt:post>q'], after: { q: { state: 'hot', load: 99, sub: 'backlog: 5 cr' } } },
          { title: 'Workers jammed, timelines hot', text: 'The workers and Redis are busy with this one post. Aman\'s normal post waits behind it in line, and reaches his followers minutes later. Some followers see a reply (which arrived at once) before the original.', flood: { paths: ['q>tl'], n: 16 }, after: { tl: { state: 'hot', load: 98, sub: 'writes flood' } } },
          { title: 'Even more waste', text: 'Many of the 5 crore have not visited in months. Filling their timelines is wasted work and wasted RAM. And if the star posts 10 times a day, that is 50 crore writes.', focus: ['q', 'tl'] },
        ]},
        { name: 'Hybrid: celebrity pull', intro: 'Rule: if the author\'s followers are above a threshold (say 1M), do not push.', steps: [
          { title: 'The star\'s post: only save', text: 'The post service sees that the author is a celebrity. The post goes only into the Posts DB (and a hot cache). No fan-out job. Online followers get the "new post" badge from a pub/sub topic (Part 1).', set: { p: { label: 'Star', sub: '5 cr followers' } }, go: ['p>post>pdb'], after: { q: { state: 'ok', load: 15, sub: 'celeb skip' } } },
          { title: 'Normal posts: push continues', text: 'Posts from normal users like Aman use push as before. The workers are relaxed now.', go: ['evt:post>q', 'q>tl'], after: { tl: { state: 'ok', load: 25, sub: 'normal posts' } } },
          { title: 'Feed: ready list + celeb merge', text: 'Riya opens the feed: (1) her ready timeline list, (2) the latest posts of the ~5 celebrities she follows (very hot, so in cache), (3) merge by time/rank. A little more read work, but 5 crore writes saved.', parallel: true, go: ['f>feed>tl', 'f>feed>pdb'], after: { feed: { state: 'ok', sub: 'merge: list + 5 celebs' } } },
          { title: 'Response', text: 'The merged feed goes back. Read cost: ~1 list + ~5 small reads; write cost for the celebrity: zero. The good side of both push and pull.', go: 'res:feed>f', after: { f: { state: 'ok', sub: 'feed + star post' } } },
        ]},
      ],
    },
    { type: 'h2', text: 'Each rung: symptom, cost, limit' },
    { type: 'table', head: ['Rung', 'Symptom that forces it', 'Cost', 'Where it fails'], rows: [
      ['1. Gateways', 'One server\'s ~100k connections are full; on deploys, app logic and sockets fall over together', 'Stateful fleet, L4 LB, heartbeats, reconnect storms', 'You do not know which gateway an event should go to'],
      ['2. Registry', 'The receiver is on another gateway', 'A lookup for every delivery; TTL, stale entries', 'Big audiences: a separate lookup + send for every receiver'],
      ['3. Pub/sub', 'One event has thousands of online receivers on many gateways', 'One more system; Redis Pub/Sub is at-most-once; hot topic', 'Only for online people; offline people need storage'],
      ['4. Fan-out on write', 'Reading feeds is expensive (pull), and reads are very frequent', 'Writes = followers; RAM for every timeline', 'Celebrity: one post = crores of writes'],
      ['5. Hybrid', 'Posts from big accounts take minutes, workers jam', 'Complex read path: merge, two paths, threshold tuning', 'Ranking/merge latency; hot cache for celebrity posts'],
    ], caption: 'Roadmap: "Persistent connection gateways, a registry of who is connected where, pub/sub between services and gateways, and push vs pull fan-out for large audiences."' },
    { type: 'compare',
      left: { title: 'Push (fan-out on write)', html: `• Write: work equal to the number of followers<br>• Read: one list, very cheap<br>• Feed is fresh (within seconds)<br>• Bad: celebrities, wasted work on inactive followers, RAM<br>• Best: normal users, read-heavy apps` },
      right: { title: 'Pull (fan-out on read)', html: `• Write: one row<br>• Read: fetch from every followed account + merge, expensive<br>• Feed is always the latest (built at read time)<br>• Bad: very many feed opens, following very many accounts<br>• Best: celebrity posts, inactive users, few reads` },
    },
    { type: 'p', html: `<strong>Hybrid</strong> combines both: normal authors use push, celebrity authors use pull, and the follower's feed merges both at read time. The threshold is a knob: the follower count, or a calculation of "cost of push vs cost of pull". Some systems also do the opposite: skip push for <em>inactive followers</em>, and build their feed with pull at login.` },

    { type: 'h3', text: 'Three things inside pub/sub' },
    { type: 'list', items: [
      `<strong>Topic granularity:</strong> a topic per gateway (<code>gw:7</code>; the service looks at the registry and publishes there) or a topic per room/stream (<code>live:ipl</code>; gateways subscribe). The first is for 1:1 chat, the second for big rooms. With very many small rooms, keeping track of per-room topics (subscribe/unsubscribe churn) is also a cost.`,
      `<strong>Hot topic:</strong> one topic lives on one pub/sub node (in Redis Cluster, sharded pub/sub, from version 7, places a channel on one shard based on its slot). Even a topic with 10 lakh viewers goes to only ~10 gateways, so this is mostly fine. But with 1,000 gateways, add one more layer: regional relays (a tree of pub/sub).`,
      `<strong>Ordering and durability:</strong> in live comments, a little loss or reordering is fine. In chat and notifications it is not: there you store first in a durable place (DB/Kafka), then push, and the client "resumes from the last seq" (the rule from the Realtime lesson: store first, then deliver).`,
    ]},

    { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `<strong>1. "WebSocket push = fan-out on write."</strong> No. A WebSocket push reaches the <em>screen</em> of online people (live delivery). Fan-out on write fills followers' <em>stored timelines</em>. One post can do both: go into timelines, and give online people a badge.<br><strong>2. "Pub/sub is a message queue, nothing will be lost."</strong> Redis Pub/Sub stores nothing. Whoever was not listening at that moment loses the message. For important data, use a durable log + resume.<br><strong>3. "Push is always better, reads are cheap."</strong> For celebrities and inactive users, push is wasted work. In an interview, say push, then raise the celebrity problem yourself and explain hybrid.<br><strong>4. "Keep the user's data on the gateway."</strong> The gateway should hold only the connection. Messages go in the DB and the mapping in the registry, or else everything is lost when a gateway fails.` },

    { type: 'h2', text: 'In the real world: Twitter\'s timeline (2013)' },
    { type: 'p', html: `According to the 2012-13 "Timelines at Scale" talk by Twitter's engineering VP Raffi Krikorian (QCon; High Scalability wrote a summary in July 2013), at that time there were ~150M active users, ~300k timeline reads/s, and ~5k tweets/s on average (12k+/s during big events). The home timeline was built with <strong>fan-out on write</strong>: every tweet went into the followers' Redis timeline lists (each list ~800 entries, with 3 copies in Redis). Tweets from accounts like Lady Gaga (~3.1 crore followers) could take minutes to fan out, and replies sometimes showed up before the original. The talk said they were moving towards skipping fan-out for such very big accounts and <strong>merging their tweets at read time</strong>: the same hybrid. This information is more than 10 years old; today's X system has changed, but the pattern is still the textbook answer for feed design. The full feed design: the Phase 8 <a href="#/design-feed">Instagram / Twitter feed</a> lesson.` },

    { type: 'h2', text: 'Decide' },
    { type: 'callout', tone: 'tip', title: 'Decide', html: `Ask two questions separately. <strong>Live delivery:</strong> more people than one server's connections? <strong>Gateways</strong>. Receiver on another gateway? <strong>Registry</strong> (1:1, small groups). Very many online receivers for one event? A <strong>pub/sub</strong> topic, with gateways doing local fan-out; for important messages, a durable store + resume. <strong>Feed delivery:</strong> more reads, and normal authors? <strong>Push</strong> via queue + workers. Celebrity authors, or very many inactive followers? <strong>Hybrid</strong>: their posts on pull, merged at read time. The same data for everyone (a live score)? No fan-out needed at all: <strong>CDN + polling</strong> (Realtime lesson).` },
    { type: 'h2', text: 'The whole picture' },
    { type: 'p', html: `All five rungs together. Left: live delivery (to the screens of online people). Right: feed delivery (to the stored timeline). Press the buttons to see one path at a time.` },
    { type: 'diagram', title: 'Fan-out: the whole ladder inside xyz.com', height: 510,
      groups: [
        { label: 'Live delivery (online)', x: 15, y: 135, w: 350, h: 355 },
        { label: 'Feed delivery (stored)', x: 372, y: 135, w: 343, h: 355 },
      ],
      nodes: [
        { id: 'poster', label: 'Poster app', sub: 'Aman / star', x: 90, y: 60, kind: 'client', info: 'What it is: the user who posts or comments. Why it is here: this is where one event starts that has to reach N people.' },
        { id: 'post', label: 'Post service', sub: 'save + route', x: 450, y: 60, kind: 'server', info: 'What it is: the service that receives posts. Why it is here: it saves the post, publishes it on pub/sub for online people, and puts a fan-out job in the queue for normal authors. For a celebrity, the job is skipped.' },
        { id: 'q', label: 'Fan-out workers', sub: 'rung 4: push', x: 630, y: 60, w: 150, kind: 'queue', info: 'What it is: a queue + workers. Why it is here: they add the post ID to every follower\'s timeline, so the post API does not have to wait. About 300k writes/s together.' },
        { id: 'reg', label: 'Registry', sub: 'rung 2: user → gw', x: 90, y: 190, w: 140, kind: 'cache', info: 'What it is: entries like conn:aman → gw11 in Redis, with a TTL. Why it is here: finding the receiver\'s gateway for 1:1 and small groups. The gateway writes it on connect.' },
        { id: 'ps', label: 'Pub/sub', sub: 'rung 3: topics', x: 270, y: 190, w: 150, kind: 'queue', info: 'What it is: topic-based pub/sub (Redis Pub/Sub, NATS). Why it is here: the service publishes once, and each subscribed gateway gets one copy. It does not store messages, so use seq numbers + catch-up.' },
        { id: 'pdb', label: 'Posts DB', sub: '+ hot celeb cache', x: 450, y: 190, w: 150, kind: 'data', info: 'What it is: the real home of every post, by author + time. Why it is here: celebrity posts live here (and in a hot cache); in hybrid they are read from here at feed time (rung 5).' },
        { id: 'tl', label: 'Timeline cache', sub: 'Redis list/user', x: 630, y: 190, w: 150, kind: 'cache', info: 'What it is: each user\'s ready list, the latest ~800 post IDs. Why it is here: the result of push; reading the feed = reading one list.' },
        { id: 'gw', label: 'Gateway fleet', sub: 'rung 1: WebSockets', x: 180, y: 320, w: 160, kind: 'server', info: 'What it is: servers that only handle connections (~100k each, filled to ~60%). Why it is here: lakhs of open connections; they subscribe to topics and pass messages to their local users.' },
        { id: 'feed', label: 'Feed service', sub: 'rung 5: merge', x: 540, y: 320, w: 150, kind: 'server', info: 'What it is: the service that builds feeds. Why it is here: it merges the ready timeline + the latest posts of followed celebrities (hybrid), fills in content, and paginates.' },
        { id: 'online', label: 'Online users', sub: 'on screen now', x: 180, y: 450, w: 150, kind: 'client', info: 'What it is: people who have the app open right now. Why it is here: they get a live comment or a "new post" badge within seconds, through their gateway.' },
        { id: 'fol', label: 'Follower app', sub: 'GET /feed', x: 540, y: 450, w: 150, kind: 'client', info: 'What it is: a follower who opens the app later. Why it is here: the feed read path; reads are 50-100 times more frequent than posts, so this must be cheap.' },
      ],
      edges: [
        { a: 'poster', b: 'post', n: 1 },
        { a: 'post', b: 'pdb', n: 2, label: 'save' },
        { a: 'post', b: 'q', n: 3, kind: 'evt' },
        { a: 'q', b: 'tl', label: 'push IDs' },
        { a: 'post', b: 'ps', kind: 'evt', label: 'publish' },
        { a: 'ps', b: 'gw', kind: 'evt' },
        { a: 'gw', b: 'reg', dashed: true, label: 'register' },
        { a: 'gw', b: 'online', kind: 'res' },
        { a: 'fol', b: 'feed' },
        { a: 'feed', b: 'tl' },
        { a: 'feed', b: 'pdb', label: 'celeb posts' },
      ],
      paths: [
        { name: 'Live comment', text: 'The post service publishes once. Pub/sub gives one copy to each gateway, and each gateway passes it to its local users.', go: ['poster>post>ps>gw>online'] },
        { name: 'Connect', text: 'The user\'s app opens a WebSocket to a gateway. The gateway writes in the registry: this user is here.', go: ['online>gw>reg'] },
        { name: 'Push to timelines', text: 'Normal author: the post is saved, then workers add its ID to every follower\'s timeline.', go: ['poster>post>pdb', 'post>q>tl'] },
        { name: 'Hybrid feed read', text: 'The follower\'s ready timeline + celebrity posts from the Posts DB/cache, merged and sent back.', go: ['fol>feed>tl', 'feed>pdb', 'res:feed>fol'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Fan-out = one event, N receivers. Two kinds: live delivery (online screen) and feed delivery (stored timeline).</li>
      <li>Gateways only handle connections (~100k each, filled to ~60%). Use jitter for reconnects.</li>
      <li>A registry (user → gateway) is for 1:1 and small groups. The work = the number of receivers.</li>
      <li>Pub/sub: the service publishes once, gateways fan out locally. Redis Pub/Sub stores nothing: use seq + catch-up.</li>
      <li>Push (fan-out on write): cheap reads, writes = followers. The default when reads are the majority.</li>
      <li>Pull (fan-out on read): cheap write, every read is expensive. For celebrities and inactive users.</li>
      <li>Hybrid: normal authors push, celebrity authors pull, merge at feed read. Threshold = followers × posts/day.</li>
    </ul>` },

    { type: 'tradeoffs',
      gains: ['One event reaches lakhs of people in seconds (gateways + pub/sub)', 'The service\'s work does not depend on audience size: 1 publish, the gateways share the rest', 'Push makes feed reads very cheap (one list)', 'Hybrid ends the write storm from celebrity posts', 'Each rung scales on its own: gateways, pub/sub, workers, timeline cache'],
      costs: ['Stateful gateways: reconnect storms, draining on deploy', 'Registry/pub/sub is one more system; Redis Pub/Sub does not store messages', 'Push: writes = followers, RAM for timelines, wasted work on inactive users', 'Hybrid: a complex read path (merge, ranking), threshold tuning', 'Ordering/duplicates/gaps: you need seq numbers and resume logic'] },

    { type: 'think', questions: [
      { q: 'xyz.com group chat has a limit of 500 members. Will you push or pull? Do you need pub/sub?', a: 'Push (into each member\'s inbox/sync stream, or store the message once and move each member\'s "unread pointer"). 500 is a small fan-out, not a celebrity problem. For online members, go from the registry to the gateways (or use a per-gateway topic). The limit itself keeps this simple: apps like WhatsApp cap group size for exactly this reason.' },
      { q: 'An app like Uber: the rider is watching the driver\'s live location. How big is the fan-out, and which rung?', a: 'The fan-out is small: one driver → one rider (or 2-3 people on a shared trip). The driver sends a location every few seconds; push it to the rider\'s gateway through a trip topic (trip:123) or the registry. No celebrity problem. The real challenge is writes (lakhs of drivers × every few seconds), which is the Scaling writes deal: keep only the latest location in memory.' },
      { q: 'You set the celebrity threshold at 1M. One user has 9.9 lakh followers and posts 50 times a day. Is there a problem?', a: 'Yes. The threshold should be based on work, not only on followers: followers × posts per day. 9.9 lakh × 50 = about 5 crore writes a day, more than one post from a big celebrity. A better rule: if the cost of push (followers × post rate) is above a budget, use pull. And remove inactive followers from push.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'A message arrived on Gateway 1, and the receiver is on Gateway 2. What is the direct way for 1:1 chat?', options: ['Broadcast to all gateways', 'Find the receiver\'s gateway in the registry and send it there', 'Ask the receiver to poll'], answer: 1, explain: 'A registry (user → gateway) is right for 1:1 and small groups. Broadcasting gives every gateway useless work.' },
      { q: '10 lakh viewers on a live stream, 10 gateways. With pub/sub, how many messages does the service send for one comment?', options: ['10 lakh', '1 publish (pub/sub delivers to 10 gateways)', '0'], answer: 1, explain: 'The service publishes once. Pub/sub gives one copy to each subscribed gateway, and each gateway passes it to its local viewers.' },
      { q: 'What is the biggest downside of fan-out on write?', options: ['Reading the feed is slow', 'The write work for one post equals the number of followers: crores of writes for celebrities', 'The post is not saved'], answer: 1, explain: 'With push, reads are cheap and writes = followers. That is where the celebrity problem comes from.' },
      { q: 'In a hybrid feed, how is a follower\'s feed built?', options: ['Only from their timeline list', 'Timeline list (normal authors, push) + latest posts of followed celebrities (pull), merged', 'Pull from everyone they follow'], answer: 1, explain: 'Normal authors go into the list via push, celebrity posts are fetched at read time, and both are merged.' },
      { q: 'A gateway\'s connection to Redis Pub/Sub broke for 2 s. What about the messages in that time?', options: ['Redis keeps them in a queue and delivers them later', 'They are lost; you need seq numbers + catch-up from the DB', 'The gateway gets them automatically'], answer: 1, explain: 'Redis Pub/Sub is at-most-once and does not store messages. For important data, use a durable store and fill the gap.' },
    ]},
    { type: 'sources', note: 'The Twitter numbers are from 2012-13 and do not describe today\'s X system. Gateway capacity (~100k) and worker throughput are widget assumptions.', items: [
      { title: 'The Architecture Twitter Uses To Deal With 150M Active Users, 300K QPS, A 22 MB/S Firehose, And Send Tweets In Under 5 Seconds', publisher: 'High Scalability (summary of Raffi Krikorian, "Timelines at Scale", QCon 2012)', url: 'http://highscalability.com/blog/2013/7/8/the-architecture-twitter-uses-to-deal-with-150m-active-users.html', year: 2013, used: 'Fan-out on write into Redis timelines (~800 entries, 3 replicas), 300k timeline reads/s vs ~5k tweets/s, 3.5 s p50 to deliver to 1M followers, slow fan-out for accounts with tens of millions of followers, replies before originals, plan to merge such accounts at read time.' },
      { title: 'Timelines at Scale (talk)', publisher: 'InfoQ / QCon San Francisco 2012', official: true, url: 'https://www.infoq.com/presentations/Twitter-Timeline-Scalability/', year: 2012, used: 'Original talk behind the summary above.' },
      { title: 'Redis Pub/Sub', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/pubsub/', used: 'At-most-once delivery semantics; sharded Pub/Sub (Redis 7.0) assigns channels to slots/shards.' },
    ]},
  ],
});
