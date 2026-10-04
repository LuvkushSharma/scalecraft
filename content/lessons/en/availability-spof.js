Lesson.register({
  id: 'availability-spof',
  title: 'Availability, nines and SPOF',
  minutes: 26,
  summary: `Availability = what % of the time the system is up. "99.9%" sounds perfect, but it means ~9 hours of downtime a year. The biggest enemy of uptime is a Single Point of Failure: one box that, if it falls, takes everything down with it. In this lesson: the math of nines, MTBF/MTTR, redundancy (active-active, active-passive), failover, a serial vs parallel availability calculator, redundancy for data, and availability zones/regions.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `Imagine your website went down at 2 am and no one noticed until 9 am. For seven hours, no user could do anything.<br>The availability question is simple: <strong>"when a user comes, how sure are we that the site will be up?"</strong><br>The answer is a number (like 99.9%), and the way to raise that number is also simple: <strong>keep an extra copy of every important thing</strong>, so if one breaks the other takes over, and make this switch happen automatically and fast.` },

    { type: 'h2', text: 'The problem: xyz.com was down all night' },
    { type: 'p', html: `In the last lesson, xyz.com got 2 servers behind a Load Balancer. One night, the disk of the database machine broke. The servers were running, but without the data, every page showed an error. In the morning an engineer woke up, built a new machine and loaded the data from a backup: it took 7 hours.` },
    { type: 'p', html: `The users' question: "how reliable is your site?" To answer this, engineers use a number.` },
    { type: 'callout', tone: 'term', title: 'New word: Availability', html: `<strong>What it is:</strong> what % of the time the system is up and answering correctly. Formula: <code>uptime ÷ (uptime + downtime)</code>.<br><strong>Why we need it:</strong> no one can measure "the site is very reliable". "99.9%" can be measured and promised, and it decides the design.<br><strong>Without it:</strong> you will never know how much redundancy you need, or when it is "good enough".<br><strong>Example:</strong> in one month (30 days = 720 hours) xyz.com was down for 7 hours: 713 ÷ 720 = <strong>99.03%</strong>.` },
    { type: 'callout', tone: 'term', title: 'New word: Downtime', html: `<strong>What it is:</strong> the time when the system does not work for users: down, or so slow that it is useless, or giving wrong errors. <strong>Uptime</strong> is the opposite.<br><strong>Two kinds:</strong> <em>planned</em> (announced in advance, for an upgrade) and <em>unplanned</em> (a sudden crash). For users, both hurt the same.` },

    { type: 'h2', text: 'Nines: think of availability as a number' },
    { type: 'p', html: `No engineer says "our site always works". They say "99.9% available". These 9s are called <strong>nines</strong>: 99.9% = "three nines", 99.99% = "four nines". Move the slider and see how much difference each extra 9 makes:` },
    { type: 'custom', render(el) {
      const opts = [['90%', 0.9], ['99% (two nines)', 0.99], ['99.9% (three nines)', 0.999], ['99.95%', 0.9995], ['99.99% (four nines)', 0.9999], ['99.999% (five nines)', 0.99999]];
      el.innerHTML = `<label>Availability target</label>
        <input class="nR" type="range" min="0" max="${opts.length - 1}" step="1" value="2">
        <div class="stats">
          <div class="stat"><span>Target</span><strong class="nT"></strong></div>
          <div class="stat"><span>Downtime per year</span><strong class="nY"></strong></div>
          <div class="stat"><span>Per month</span><strong class="nM"></strong></div>
          <div class="stat"><span>Per day</span><strong class="nD"></strong></div>
        </div>
        <div class="calc-note nN"></div>`;
      const fmt = s => s >= 86400 ? (s / 86400).toFixed(s < 864000 ? 2 : 1) + ' days' : s >= 3600 ? (s / 3600).toFixed(1) + ' hours' : s >= 600 ? Math.round(s / 60) + ' min' : s >= 60 ? (s / 60).toFixed(1) + ' min' : Math.round(s) + ' sec';
      const notes = [
        'Down for 2.4 hours every day. No serious product will accept this.',
        'Down for ~3.65 days a year. This can work for internal tools.',
        'About 8.8 hours a year. Many normal websites aim for this.',
        'About 4.4 hours a year. A good practical target.',
        'About 53 minutes a year. Payments, big apps. No manual fix is this fast any more; failover must be automatic.',
        'About 5 minutes a year. Telecom/critical infrastructure level. Each extra 9 multiplies cost and complexity.',
      ];
      const r = el.querySelector('.nR');
      const upd = () => {
        const [name, a] = opts[r.value];
        const down = 1 - a;
        el.querySelector('.nT').textContent = name.split(' ')[0];
        el.querySelector('.nY').textContent = fmt(down * 365 * 86400);
        el.querySelector('.nM').textContent = fmt(down * 365 / 12 * 86400);
        el.querySelector('.nD').textContent = fmt(down * 86400);
        el.querySelector('.nN').textContent = notes[r.value];
      };
      r.addEventListener('input', upd);
      upd();
    }},
    { type: 'table', head: ['Availability', 'Downtime per year', 'Per month'], rows: [
      ['99% (two nines)', '≈ 3.65 days', '≈ 7.3 hours'],
      ['99.9% (three nines)', '≈ 8.8 hours', '≈ 44 minutes'],
      ['99.99% (four nines)', '≈ 53 minutes', '≈ 4.4 minutes'],
      ['99.999% (five nines)', '≈ 5.3 minutes', '≈ 26 seconds'],
    ], caption: 'This table is worth remembering. Each extra 9 = 10 times less downtime.' },
    { type: 'callout', tone: 'why', title: 'Why not 100%?', html: `A clear lesson from Google's SRE book: 100% is almost never the right target. Each next 9 costs much more than the previous one (more copies, more automation, more engineers' time). And the user's own phone network, WiFi and battery are less than 99.99% reliable, so they will not even notice the difference. So the target follows the business: a chat app 99.9%, payments 99.99%.` },
    { type: 'p', html: `Another way: count <strong>requests</strong> instead of time. Availability = successful requests ÷ total requests. With 25 lakh requests in a day and a 99.99% target, up to 250 failed requests a day are OK. Big systems (like Google) often use this measure, because a state like "half the system is up" is also counted correctly. The amount of failure that is "allowed" inside the target is called the <strong>error budget</strong>: if budget is left, release new features; if it is used up, stop and improve stability.` },
    { type: 'h2', text: 'Availability, reliability, fault tolerance: four similar words' },
    { type: 'p', html: `These words are often mixed up in interviews. Let us look at them one by one:` },
    { type: 'callout', tone: 'term', title: 'New word: Reliability', html: `<strong>What it is:</strong> whether the system works <em>correctly</em>, for a long time, without mistakes. Availability asks "is it up?"; reliability asks "is what it does correct?".<br><strong>Example:</strong> a bank app opens (available) but shows the wrong balance (unreliable). You need both.` },
    { type: 'callout', tone: 'term', title: 'New word: Fault tolerance', html: `<strong>What it is:</strong> even if one part breaks (a fault), the system keeps running without stopping and without the user noticing. Like one server falling and requests quietly moving to another.<br><strong>Why we need it:</strong> hardware, network, software: something breaks every day. In a big system, "something is broken" is the normal state.<br><strong>Without it:</strong> every small fault = errors for users.` },
    { type: 'callout', tone: 'term', title: 'New word: High availability (HA)', html: `<strong>What it is:</strong> designing a system so downtime is very small (like 99.99%). The method: redundancy + automatic failover. A small bump is OK (a few seconds of errors until the backup takes over).<br><strong>Difference from fault tolerance:</strong> fault tolerance means <em>zero</em> interruption (often two copies run exactly side by side). HA means <em>back quickly</em>. Fault tolerance is more expensive; most websites manage with HA.` },
    { type: 'table', head: ['Word', 'Question', 'xyz.com example'], rows: [
      ['Availability', 'Is it up? What % of the time?', 'The site opens 99.9% of the time'],
      ['Reliability', 'Does it work correctly?', 'Pressing like really adds exactly one like'],
      ['Fault tolerance', 'If one part breaks, does it keep running without stopping?', 'A server fell, and no user saw an error'],
      ['High availability', 'If it breaks, how quickly is it back?', 'The DB fell, and the replica took over in 30 seconds'],
    ]},
    { type: 'callout', tone: 'mistake', title: 'Common confusion', html: `"Available" does not mean "correct". A system that instantly returns a <code>500 error</code> to every request is technically "answering", but it should not count as available. So when you measure availability, count "successful requests", not just "the server is alive".` },

    { type: 'h2', text: 'MTBF and MTTR: fall less often, or get up faster?' },
    { type: 'callout', tone: 'term', title: 'New words: MTBF and MTTR', html: `<strong>MTBF (Mean Time Between Failures):</strong> on average, how long until something falls. Like "the server crashes once a month" = MTBF 720 hours.<br><strong>MTTR (Mean Time To Recovery/Repair):</strong> when it falls, on average how long until it is up again. Like "the engineer wakes up and fixes it, 1 hour" = MTTR 1 hour.<br><strong>Why we need it:</strong> availability is made of these two: <code>Availability = MTBF ÷ (MTBF + MTTR)</code>. It tells you where to put your effort.` },
    { type: 'p', html: `Example: the server falls once a month (MTBF 720 h), and fixing it takes 1 hour (MTTR 1 h): 720 ÷ 721 = <strong>99.86%</strong>. Now there are two roads: make it fall half as often (MTBF 1,440 h) and you get 99.93%. Or make recovery automatic, 6 minutes (MTTR 0.1 h): <strong>99.986%</strong>. Faster recovery is often cheaper and more effective. See for yourself:` },
    { type: 'custom', render(el) {
      el.innerHTML = `<div class="row2">
          <div><label>MTBF: one failure every <strong class="mB"></strong> hours</label><input class="mBr" type="range" min="24" max="2160" step="24" value="720"></div>
          <div><label>MTTR: <strong class="mR"></strong> minutes to fix</label><input class="mRr" type="range" min="1" max="240" step="1" value="60"></div>
        </div>
        <div class="stats">
          <div class="stat"><span>Availability</span><strong class="mA"></strong></div>
          <div class="stat"><span>Failures per year</span><strong class="mF"></strong></div>
          <div class="stat"><span>Downtime per year</span><strong class="mD"></strong></div>
        </div>
        <div class="calc-note mN"></div>`;
      const upd = () => {
        const b = +el.querySelector('.mBr').value, rMin = +el.querySelector('.mRr').value, r = rMin / 60;
        const a = b / (b + r), fy = 8760 / (b + r), dy = fy * rMin;
        el.querySelector('.mB').textContent = b.toLocaleString('en-IN');
        el.querySelector('.mR').textContent = rMin;
        el.querySelector('.mA').textContent = (a * 100).toFixed(3) + '%';
        el.querySelector('.mF').textContent = fy.toFixed(1);
        el.querySelector('.mD').textContent = dy >= 120 ? (dy / 60).toFixed(1) + ' hours' : Math.round(dy) + ' min';
        el.querySelector('.mN').textContent = rMin <= 5
          ? 'Recovery this fast only comes from automation: a health check caught it and the backup took over right away. Just waking a person up takes 5 minutes.'
          : rMin >= 60
          ? 'A person is doing the recovery (alert, wake up, laptop, fix). Move the MTTR slider to 6 minutes and see how much availability jumps.'
          : 'The middle road: some automation, some people. Reducing failures (raising MTBF) is expensive; faster recovery is often cheaper.';
      };
      el.querySelectorAll('input').forEach(i => i.addEventListener('input', upd));
      upd();
    }},
    { type: 'h2', text: 'Single Point of Failure (SPOF)' },
    { type: 'callout', tone: 'term', title: 'New word: SPOF (Single Point of Failure)', html: `<strong>What it is:</strong> the one component whose fall brings down the whole system, because it has no copy. Like a house with only one door, and its lock gets stuck.<br><strong>Why finding it matters:</strong> a system is only as reliable as its weakest single part. With 10 servers and one database, the database decides your availability.<br><strong>Without it (if you leave a SPOF):</strong> all the money spent on everything else is wasted; one thing falls and the site is gone.<br><strong>How to remove it:</strong> keep a <strong>redundant</strong> (extra, backup) copy of that thing, and switch over automatically when it falls.` },
    { type: 'p', html: `Below, in xyz.com's architecture, make the components fall one by one and see which one is a SPOF. Click each box to read its explanation:` },
    { type: 'flow', height: 360,
      nodes: [
        { id: 'u', label: 'Users', x: 80, y: 160, w: 110, kind: 'client', info: 'What it is: xyz.com\'s users. All they see is: did the site open or not.' },
        { id: 'lb', label: 'Load Balancer', x: 270, y: 160, w: 150, kind: 'edge', info: 'What it is: the door for all traffic, which shares requests among servers. All traffic passes through it, so a single LB is itself a SPOF.' },
        { id: 'lb2', label: 'Standby LB', sub: 'backup', x: 270, y: 300, w: 150, kind: 'edge', hidden: true, info: 'What it is: a copy of the main LB that normally does nothing and just listens to its "heartbeat". If the main LB falls, this one takes its place. This is called an active-passive setup.' },
        { id: 's1', label: 'Server 1', x: 470, y: 90, w: 130, kind: 'server', info: 'What it is: a server that runs xyz.com\'s code. It has a copy (Server 2), so it is not a SPOF.' },
        { id: 's2', label: 'Server 2', x: 470, y: 230, w: 130, kind: 'server', info: 'What it is: a copy of Server 1. Both work together (active-active); if one falls, the other handles everything.' },
        { id: 'db', label: 'Database', x: 650, y: 160, w: 110, kind: 'data', info: 'What it is: all of xyz.com\'s data. At first it is alone, so if it falls, no server is of any use: a SPOF.' },
        { id: 'db2', label: 'DB replica', sub: 'copy', x: 650, y: 300, w: 110, kind: 'data', hidden: true, info: 'What it is: a copy of the database that keeps copying every change (replication). If the main DB falls, we make this the new main (promote).' },
      ],
      edges: [
        { a: 'u', b: 'lb' }, { a: 'lb', b: 's1' }, { a: 'lb', b: 's2' },
        { a: 'u', b: 'lb2', dashed: true }, { a: 'lb2', b: 's1', dashed: true }, { a: 'lb2', b: 's2', dashed: true },
        { a: 's1', b: 'db' }, { a: 's2', b: 'db' },
        { a: 'db', b: 'db2', dashed: true, hidden: true }, { a: 's2', b: 'db2', hidden: true },
      ],
      scenarios: [
        { name: 'Server 1 falls', steps: [
          { title: 'Server 1 crashes', text: 'The hardware failed.', set: { s1: { state: 'down', sub: 'DOWN' } }, focus: ['s1'] },
          { title: 'The Load Balancer sends everything to Server 2', text: 'The LB\'s health check (asking "are you alive?" every few seconds) failed, so the LB took Server 1 off its list. The user did not even notice. The server is <strong>not</strong> a SPOF, because it has a copy.', go: ['u>lb>s2>db', 'res:db>s2>lb>u'] },
        ]},
        { name: 'Database falls', steps: [
          { title: 'Database crashes', text: 'The disk failed.', set: { db: { state: 'down', sub: 'DOWN' } }, focus: ['db'] },
          { title: 'Both servers alive, but the site is still down', text: 'The servers are running but can do nothing without data. <strong>Here the database is the SPOF.</strong>', go: ['u>lb>s1', 'lost:s1>db'], after: { s1: { sub: '500 error' }, s2: { sub: '500 error' } } },
          { title: 'Fix: a replica that is already ready', text: 'A <strong>replica</strong> (copy) was copying every change all the time. When the main DB fell, the replica was made the new main (promoted), and the servers now talk to it. Downtime: seconds to a few minutes instead of hours. The full story is in the "Database replication" lesson.', show: ['db2', 'db-db2', 's2-db2'], set: { db2: { state: 'ok', sub: 'now main!' }, s1: { sub: '' }, s2: { sub: '' } }, go: ['u>lb>s2>db2', 'res:db2>s2>lb>u'] },
        ]},
        { name: 'Load Balancer falls', steps: [
          { title: 'LB crashes', text: 'The Load Balancer itself fell.', set: { lb: { state: 'down', sub: 'DOWN' } }, go: 'lost:u>lb' },
          { title: 'Everything is fine, yet no one can get in', text: 'The servers and DB are healthy, but the door is closed. <strong>A single LB is also a SPOF.</strong>', focus: ['lb'] },
          { title: 'Fix: a standby LB', text: 'Keep a backup LB that keeps listening to the main LB\'s "heartbeat". When the heartbeat stops, it takes the main LB\'s address (IP) right away and handles the traffic. This switch is called <strong>failover</strong>.', show: ['lb2'], set: { lb2: { state: 'ok', sub: 'now active!' } }, go: ['u>lb2>s1>db', 'res:db>s1>lb2>u'] },
        ]},
      ],
    },
    { type: 'callout', tone: 'tip', title: 'How to find a SPOF', html: `Draw your architecture diagram. Put your finger on each box and ask: <strong>"what happens if this falls?"</strong> If the answer is "everything stops", it is a SPOF. Not just servers; also check: the DNS provider, a single network cable/switch, the power of a single data center, a single payment provider, and yes, the one engineer who is the only person who knows how to deploy.` },
    { type: 'h2', text: 'Two styles of redundancy' },
    { type: 'callout', tone: 'term', title: 'New word: Redundancy', html: `<strong>What it is:</strong> keeping more than one copy of something important, so if one breaks, the other works. Like two SIM cards in a phone: if one has no network, you call with the other.<br><strong>Why we need it:</strong> this is the only way to remove a SPOF.<br><strong>Without it:</strong> every component is a SPOF.<br><strong>Cost:</strong> money for the copies, and the effort of keeping the copies "in sync" (the same).` },
    { type: 'image', src: 'assets/img/availability-spof/backup-generator.jpg', alt: 'A large green diesel generator inside a data center, labelled "Generator B"', caption: 'Redundancy is not only in software. This is a data center\'s diesel generator; look at the name: "Generator B". If the power goes, batteries run things for a few minutes and the generator starts. And there is also an "A", so the generator does not become a SPOF either.', credit: { text: 'Mikael Häggström, Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Power_generator_of_a_hospital_data_center.jpg', license: 'CC0' } },
    { type: 'compare',
      left: { title: 'Active-passive', ascii: `
   [ LB-A ]  ← working
   [ LB-B ]  ← only waiting (standby)

A falls → B becomes active` , html: 'One does the work, the other sits idle and waits. Simple, and data is written in only one place (no conflicts). But the backup\'s capacity is normally wasted, and the switch takes a few seconds to minutes. Databases often run like this (primary + standby).' },
      right: { title: 'Active-active', ascii: `
   [ Server 1 ] ← working
   [ Server 2 ] ← working

1 falls → 2 handles everything` , html: 'Both work together, both capacities are used, and the switch time is almost zero. Perfect for stateless app servers. But careful: if both were running at 80%, when one falls the other gets 160% and it falls too.' },
    },
    { type: 'callout', tone: 'warn', title: 'Keep headroom', html: `In active-active, do not run servers up to 100%. Aim for 50-70%, so if one server or a whole data center falls, the rest can lift its load. That is why real fleets always seem to have a bit of "extra" capacity. And this "extra" is not waste; it is your insurance.` },

    { type: 'h3', text: 'Failover: how does the backup know it is its turn?' },
    { type: 'callout', tone: 'term', title: 'New word: Failover', html: `<strong>What it is:</strong> when the main component falls, handing its work to the backup <em>automatically</em>. Going back to the main is called <strong>failback</strong>.<br><strong>Why we need it:</strong> a backup is only useful if the switch is fast. 99.99% gives you only 53 minutes a year; there is no time for a person to wake up.<br><strong>Without it:</strong> the backup just sits there and the site stays down until someone switches manually.` },
    { type: 'steps', items: [
      { t: 'Heartbeat / health check', d: 'The backup (or the LB) asks "are you alive?" every 1-5 seconds. For example, <code>GET /health</code> should return 200.' },
      { t: 'Let it fail a few times', d: 'One missed answer may just be a network hiccup. Often 3 failures in a row = "dead". Being too quick = failover for no reason.' },
      { t: 'The backup takes over', d: 'The standby LB takes the main one\'s IP, or the replica database becomes the "primary", or DNS gives out a new address.' },
      { t: 'Tell everyone else', d: 'Clients/servers go to the new address. Requests that got stuck in the middle are retried.' },
      { t: 'Be careful when the old one comes back', d: 'The old main must not wake up and think it is still the main! Two "mains" at the same time = <strong>split brain</strong> (both write different data). Ways to avoid this are in the replication and coordination lessons.' },
    ]},
    { type: 'callout', tone: 'mistake', html: `"We have a backup, so we are safe" is wrong thinking if the failover was never <strong>tested</strong>. In many outages there was a backup, but the switch failed (wrong config, old data, or a backup too small to carry the load). That is why big companies switch things off on purpose to check (Netflix\'s Chaos Monkey is the famous example).` },

    { type: 'h3', text: 'Redundancy for data: replicas and backups' },
    { type: 'p', html: `Making a copy of a server is easy (same code). A copy of <strong>data</strong> is a different matter, because data changes every second. You need two different things:` },
    { type: 'table', head: ['', 'Replica', 'Backup'], rows: [
      ['What it is', 'A live copy of the database, every change copied within seconds', 'A "photo" (snapshot) of one moment, like every night at 2 am'],
      ['What it protects from', 'A machine/disk/zone falling: switch right away', 'Accidental delete, a bug that spoiled data, a hack: go back to an older moment'],
      ['Where it is kept', 'Another machine, often in another availability zone', 'A separate place (object storage), even in another region'],
      ['Weakness', 'Mistakes are also copied right away (a DELETE runs on the replica too)', 'Restoring takes hours; data after the last backup may be lost'],
    ]},
    { type: 'callout', tone: 'mistake', html: `"We have a replica, so we do not need a backup" is a very dangerous mistake. If someone runs <code>DELETE FROM users</code> by accident, the replica is empty one second later too. The replica is for availability, the backup is for saving data. You need both, and sometimes restore a backup to check that it really works.` },
    { type: 'h2', text: 'Availability math: serial vs parallel' },
    { type: 'p', html: `A request has to pass through the LB, a server and the database, all three. So what is the availability of the whole system? There are two simple rules:` },
    { type: 'callout', tone: 'term', title: 'New word: Serial (one after another)', html: `<strong>What it is:</strong> when a request must pass through A <em>and</em> B <em>and</em> C. If any one falls, the request fails.<br><strong>Math:</strong> <strong>multiply</strong> the availabilities: <code>A × B × C</code>. Each new link <em>lowers</em> the total.<br><strong>Example:</strong> LB 99.9%, server 99.9%, DB 99.9%: 0.999 × 0.999 × 0.999 = <strong>99.70%</strong>. Each part was "three nines", but the whole system is 99.7% (~26 hours down a year).` },
    { type: 'callout', tone: 'term', title: 'New word: Parallel (copies, any one is enough)', html: `<strong>What it is:</strong> when there are two copies of the same job and the work gets done if any one is up.<br><strong>Math:</strong> the chance that both fall at the same time = <code>(1 − A) × (1 − A)</code>. So availability = <code>1 − (1 − A)²</code>. Each new copy <em>raises</em> the total.<br><strong>Example:</strong> two servers, both 99%: the chance both are down together is 1% × 1% = 0.01%. Availability = <strong>99.99%</strong>. "Four nines" from two "two nines" machines!` },
    { type: 'p', html: `Now build it yourself. Pick the availability and the number of copies for each tier (LB, app servers, database). The calculator joins each tier like parallel, and joins the three tiers like serial:` },
    { type: 'custom', render(el) {
      const TIERS = ['Load Balancer', 'App servers', 'Database'], AV = [0.99, 0.999, 0.9995, 0.9999];
      const st = [{ a: 1, n: 1 }, { a: 1, n: 1 }, { a: 1, n: 1 }];
      el.innerHTML = `<div class="avT" style="display:grid;gap:10px"></div>
        <div class="stats"><div class="stat"><span>Whole system</span><strong class="avA"></strong></div><div class="stat"><span>Downtime per year</span><strong class="avD"></strong></div><div class="stat"><span>Weakest link</span><strong class="avW"></strong></div></div>
        <div class="calc-note avN"></div>`;
      const box = el.querySelector('.avT');
      const pct = a => a >= 0.9999999 ? '> 99.99999%' : (a * 100).toFixed(a > 0.99999 ? 5 : a > 0.9999 ? 4 : 3) + '%';
      const tierA = t => 1 - Math.pow(1 - AV[t.a], t.n);
      const dt = a => { const m = (1 - a) * 525600; return m >= 120 ? (m / 60).toFixed(1) + ' hours' : m >= 1 ? m.toFixed(1) + ' min' : m * 60 >= 1 ? Math.round(m * 60) + ' sec' : '< 1 sec'; };
      TIERS.forEach((name, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;border:1px solid var(--line);border-radius:var(--r);padding:8px 10px';
        row.innerHTML = `<strong style="min-width:120px">${name}</strong>
          <select class="avS" aria-label="${name} availability">${AV.map((a, k) => `<option value="${k}"${k === 1 ? ' selected' : ''}>each copy ${(a * 100).toFixed(2).replace(/\.?0+$/, '')}%</option>`).join('')}</select>
          <span style="display:flex;gap:4px">${[1, 2, 3].map(n => `<button type="button" class="chip avC" data-n="${n}">${n} ${n === 1 ? 'copy' : 'copies'}</button>`).join('')}</span>
          <span class="avR" style="margin-left:auto;font-family:var(--f-mono);font-size:13px;color:var(--ink-2)"></span>`;
        row.querySelector('.avS').onchange = e => { st[i].a = +e.target.value; upd(); };
        row.querySelectorAll('.avC').forEach(b => b.onclick = () => { st[i].n = +b.dataset.n; upd(); });
        box.appendChild(row);
      });
      const upd = () => {
        let total = 1, worst = 0;
        [...box.children].forEach((row, i) => {
          const a = tierA(st[i]); total *= a; if (a < tierA(st[worst])) worst = i;
          row.querySelectorAll('.avC').forEach(b => b.classList.toggle('on', +b.dataset.n === st[i].n));
          row.querySelector('.avR').textContent = 'tier: ' + pct(a);
        });
        el.querySelector('.avA').textContent = pct(total);
        el.querySelector('.avD').textContent = dt(total);
        el.querySelector('.avW').textContent = TIERS[worst];
        const ones = st.filter(t => t.n === 1).length;
        el.querySelector('.avN').textContent = ones === 3
          ? 'Three links in series, each one alone: the total is lower than each part. Now press "2 copies" on every tier.'
          : ones > 0
          ? `${ones} tier${ones > 1 ? 's are' : ' is'} still alone (a SPOF). The total is stuck at about the level of that single tier: the weakest link decides the chain.`
          : 'Copies on every tier: the total is even higher than any single part! But this math assumes the copies fail separately and the switch is instant. In real life, if both copies are in the same building they can fall together, so copies are kept in different zones.';
      };
      upd();
    }},
    { type: 'p', html: `All three at 99.9% with 1 copy each: <strong>99.700%</strong> (~26 hours/year). 2 copies on all three: <strong>99.9997%</strong> (~1.6 minutes/year). Now set only the database back to 1 copy: the total drops to <strong>99.900%</strong> (~8.8 hours). One single tier pulls the whole system down to its own level.` },
    { type: 'callout', tone: 'warn', title: 'When this math lies', html: `<ul><li><strong>Copies fall together:</strong> both servers in the same rack, on the same power, in the same zone = one failure takes both down. The formula assumes failures are separate (independent).</li><li><strong>Failover is not instant:</strong> if the switch takes 30 seconds, that is downtime too.</li><li><strong>One bug in all copies:</strong> same code, same bug. One bad deploy can bring down all copies at once. That is why deploys are done slowly (one server at a time).</li></ul>` },
    { type: 'h2', text: 'Regions and availability zones' },
    { type: 'p', html: `Two servers are in the same building and the building loses power, or catches fire, or floods? Both are gone. The calculator\'s "fail separately" idea breaks here. That is why cloud providers (AWS, Google Cloud, Azure) give two levels:` },
    { type: 'callout', tone: 'term', title: 'New word: Availability Zone (AZ)', html: `<strong>What it is:</strong> a group of one or more data centers inside a city/area, with its own separate power, cooling and network. According to AWS, the AZs of a region are many kilometres apart from each other (but within 100 km), and are linked by a very fast network.<br><strong>Why we need it:</strong> a fire, power cut or network fault in one building brings down only one AZ. Spread your copies across 2-3 AZs.<br><strong>Without it:</strong> your "two copies" can fall together from one single fault.<br><strong>Example:</strong> the AWS Mumbai region (<code>ap-south-1</code>) has several AZs. Every AWS region has at least 3 AZs.` },
    { type: 'callout', tone: 'term', title: 'New word: Region', html: `<strong>What it is:</strong> the whole group of AZs in a separate city/country (Mumbai, Hyderabad, Singapore, Virginia). Regions are kept fully separate from each other.<br><strong>Why we need it:</strong> to survive a disaster across a whole area (a big storm, a power grid failure, or a cloud mistake affecting a whole region), and to put servers close to faraway users.<br><strong>Cost:</strong> multi-region is very expensive and complex: data must be copied thousands of km away (latency), and writing in both places causes conflicts.` },
    { type: 'table', head: ['Where the copy is kept', 'What it protects from', 'What it does not'], rows: [
      ['2 processes on the same machine', 'One process crashing', 'Machine, disk, power'],
      ['2 machines in the same AZ', 'One machine/disk falling', 'Building power, fire, network'],
      ['In 2-3 AZs (same region)', 'A whole data center falling', 'A disaster across the whole region'],
      ['In 2 regions', 'A whole region falling', 'A bug in your own code (it is in both places!)'],
    ], caption: 'For most products, "multi-AZ" is the right place. Multi-region only when the business really needs it.' },
    { type: 'callout', tone: 'why', title: 'Decide', html: `<strong>At least 2 copies on every tier</strong>, in different availability zones, with <strong>automatic failover</strong> (health checks + standby/replica). Run stateless servers active-active, and the database as primary + standby (active-passive). Run servers at 50-70% so if one zone falls the rest can take its load. Keep data backups in a separate place. Go <strong>multi-region</strong> only when the target is above 99.99% or the law/faraway users demand it, because its cost and complexity are very high.` },
    { type: 'diagram', title: 'xyz.com high availability: the whole picture', height: 600,
      groups: [
        { label: 'AZ a', x: 30, y: 110, w: 310, h: 360 },
        { label: 'AZ b', x: 380, y: 110, w: 310, h: 360 },
        { label: 'Another region', x: 250, y: 490, w: 300, h: 100 },
      ],
      nodes: [
        { id: 'users', label: 'Users', x: 200, y: 60, kind: 'client', info: 'What it is: xyz.com\'s users. For them, availability simply means: whenever they come, the site works.' },
        { id: 'dns', label: 'DNS', sub: 'health-checked', x: 520, y: 60, kind: 'net', info: 'What it is: the phonebook that turns a name (xyz.com) into an IP. Why here: DNS also runs in copies, and when needed it can give out the address of a live LB.' },
        { id: 'lb1', label: 'LB (active)', x: 185, y: 170, kind: 'edge', info: 'What it is: the Load Balancer doing the work right now; it shares traffic among servers and removes a fallen server using health checks.' },
        { id: 'lb2', label: 'LB (standby)', x: 535, y: 170, kind: 'edge', info: 'What it is: a copy of the LB in another AZ. It listens to the heartbeat; if the main LB falls, it takes over its work (active-passive failover).' },
        { id: 's1', label: 'Server 1', sub: 'active', x: 185, y: 290, kind: 'server', info: 'What it is: a stateless app server in AZ a. Active-active with Server 2. It runs at 50-70% so it can also take Server 2\'s load.' },
        { id: 's2', label: 'Server 2', sub: 'active', x: 535, y: 290, kind: 'server', info: 'What it is: a copy of Server 1, in another AZ. Even if a whole zone falls, this one keeps running.' },
        { id: 'dbp', label: 'DB primary', x: 185, y: 410, kind: 'data', info: 'What it is: the main database where all writes go. It sends every change to the replica.' },
        { id: 'dbr', label: 'DB replica', sub: 'standby', x: 535, y: 410, kind: 'data', info: 'What it is: a live copy of the primary, in another AZ. If the primary falls, we promote this one to be the new primary (failover).' },
        { id: 'bk', label: 'Backups', sub: 'daily snapshot', x: 430, y: 545, kind: 'data', info: 'What it is: a daily "photo" of the database, in storage in another region. Why: to bring data spoiled by an accidental delete or a bug back to an older moment. A replica cannot do this.' },
      ],
      edges: [
        { a: 'users', b: 'dns', n: 1, label: 'IP?' },
        { a: 'users', b: 'lb1', n: 2 },
        { a: 'users', b: 'lb2', dashed: true, via: [[360, 100], [535, 100]] },
        { a: 'lb1', b: 'lb2', dashed: true, both: true, kind: 'evt', label: 'heartbeat' },
        { a: 'lb1', b: 's1', n: 3 }, { a: 'lb1', b: 's2' },
        { a: 'lb2', b: 's2', dashed: true },
        { a: 's1', b: 'dbp', n: 4 }, { a: 's2', b: 'dbp' },
        { a: 's2', b: 'dbr', dashed: true },
        { a: 'dbp', b: 'dbr', kind: 'evt', label: 'replication' },
        { a: 'dbp', b: 'bk', dashed: true, kind: 'evt', label: 'every night', via: [[185, 545]] },
      ],
      paths: [
        { name: 'Normal day', text: 'DNS gives the LB\'s address, the active LB picks a server, and the server gets data from the primary DB. The primary sends every change to the replica.', go: ['users>dns', 'users>lb1>s1>dbp', 'dbp>dbr'] },
        { name: 'Server 1 falls', text: 'The health check fails. The LB sends all traffic to Server 2 (in the other AZ). There was headroom, so Server 2 handles it.', go: ['users>lb1>s2>dbp'] },
        { name: 'LB falls', text: 'The heartbeat stops. The standby LB takes over, and users now come to it.', go: ['lb1>lb2', 'users>lb2>s2>dbp'] },
        { name: 'All of AZ a falls', text: 'The LB, Server 1 and the primary DB are all gone. The standby LB becomes active, and the replica is promoted to the new primary. The site runs, only from AZ b.', go: ['users>lb2>s2>dbr'] },
        { name: 'Accidental delete', text: 'The DELETE was copied to the replica too. Only the backup can save you: restore from last night\'s snapshot.', go: ['dbp>bk'] },
      ],
    },
    { type: 'callout', tone: 'recap', title: 'Remember', html: `<ul>
      <li>Availability = uptime ÷ total time (or successful requests ÷ total requests). 99.9% ≈ 8.8 hours/year, 99.99% ≈ 53 minutes/year. Each 9 = 10 times less downtime, and many times more cost.</li>
      <li>Availability = MTBF ÷ (MTBF + MTTR). Faster recovery (automation) is often cheaper than failing less.</li>
      <li>SPOF = a single part whose fall brings everything down. Ask of every box: "what if this falls?"</li>
      <li>Redundancy: active-active (both work, stateless servers) or active-passive (one waits, databases). Headroom 50-70%.</li>
      <li>Failover = health check/heartbeat + automatic switch. If it is not tested, do not trust it. Avoid split brain.</li>
      <li>Serial = multiply (each link lowers the total). Parallel = 1 − (1 − A)ⁿ (each copy raises it). Copies in different AZs, or they fall together.</li>
      <li>A replica protects from things falling, a backup from mistakes/bugs. You need both.</li>
    </ul>` },
    { type: 'tradeoffs', gains: ['The site stays up even if a machine or a zone falls', 'Recovery at 3 am without a person (automatic failover)', 'Planned maintenance without downtime (one copy off, the other on)', 'Accidentally deleted data comes back from a backup'], costs: ['Money for every copy, and for the empty headroom capacity', 'Keeping copies in sync: replication lag, the risk of split brain', 'The failover logic is itself complex and must be tested', 'Multi-region: very expensive, with latency and data conflicts'] },
    { type: 'think', questions: [
      { q: 'xyz.com has 10 servers and 2 Load Balancers, but only one database. What is the SPOF?', a: 'The database. A chain of redundancy is only as strong as its weakest link. Adding more servers does not remove the database SPOF. Fix: a replica (in another AZ) + automatic failover, and backups.' },
      { q: 'You need 99.99% availability. Is it enough to send an alert to the on-call engineer and fix things by hand?', a: 'No. 99.99% = only ~4.4 minutes of downtime a month. Just waking the engineer and opening a laptop takes that long. Failover must be automatic (health checks + standby).' },
      { q: 'Both of your app servers are in the same AZ, each at 99.9%. The calculator says 99.9999%. Is that true?', a: 'No. The formula assumes the two fall separately. In the same AZ, if power or network goes, both fall together. The real availability cannot be higher than the AZ\'s availability. Fix: put one server in another AZ.' },
      { q: 'The payment provider (an outside company) is 99.9% available. Your whole system is 99.99%. What is the availability of checkout?', a: 'Serial: 0.9999 × 0.999 ≈ 99.89%. Checkout is only as good as your weakest dependency. Protection: two payment providers (parallel), or a graceful fallback like "retry later" on failure.' },
    ]},
    { type: 'quiz', questions: [
      { q: 'About how much downtime per year does 99.9% availability mean?', options: ['~9 minutes', '~9 hours', '~9 days'], answer: 1, explain: '0.1% of 365 days ≈ 8.8 hours. Each extra 9 makes it 10 times smaller.' },
      { q: 'How do you remove a SPOF?', options: ['By making the server bigger', 'By keeping a redundant copy of that component, with automatic failover', 'By adding a cache'], answer: 1, explain: 'Redundancy: a copy that takes over the work if the original falls, and the switch happens by itself.' },
      { q: 'In active-active, both servers are at 80% load. One falls. What happens?', options: ['Nothing', 'The other gets ~160% load and may fall too', 'The Load Balancer will create a new server'], answer: 1, explain: 'That is why we keep headroom: a 50-70% utilisation target.' },
      { q: 'LB 99.9%, server 99.9%, DB 99.9%, all single, in series. The total?', options: ['99.9%', '~99.7%', '~99.99%'], answer: 1, explain: 'Serial = multiply: 0.999³ ≈ 0.997. Each link lowers the total.' },
      { q: 'Two servers, each 99% available, and any one running is enough. The total?', options: ['98%', '99%', '99.99%'], answer: 2, explain: 'The chance both fall together is 1% × 1% = 0.01%. So 99.99% (if they fail separately).' },
      { q: 'MTBF 720 hours, MTTR 1 hour. About what availability?', options: ['99.86%', '99.99%', '72%'], answer: 0, explain: '720 ÷ (720 + 1) ≈ 0.9986. Make MTTR 6 minutes and you get ~99.986%.' },
      { q: 'Someone deleted the users table by mistake. What will save you?', options: ['Replica', 'Backup', 'Load Balancer'], answer: 1, explain: 'The delete is copied to the replica right away too. Only a backup from an older moment can bring the data back.' },
    ]},
    { type: 'sources', note: 'The nines, availability formulas and cloud zone facts come from these sources.', items: [
      { title: 'Embracing Risk (Site Reliability Engineering book, chapter 3)', publisher: 'Google', official: true, year: 2016, url: 'https://sre.google/sre-book/embracing-risk/', used: 'Time-based vs request-based availability, 99.99% ≈ 52.56 min/year, 2.5M requests with 250 allowed errors example, error budgets, each extra nine costs far more, 100% is rarely the right target.' },
      { title: 'Regions and Availability Zones', publisher: 'AWS', official: true, url: 'https://aws.amazon.com/about-aws/global-infrastructure/regions_az/', used: 'Each region has at least three isolated AZs; AZs are many kilometres apart but within 100 km; each AZ has independent power, cooling and networking.' },
      { title: 'Regions and Zones (Amazon EC2 User Guide)', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-regions-availability-zones.html', used: 'Spreading instances across AZs protects from failure of one location; regions are isolated from each other.' },
      { title: 'The Netflix Simian Army', publisher: 'Netflix TechBlog', official: true, year: 2011, url: 'https://netflixtechblog.com/the-netflix-simian-army-16e57fbab116', used: 'Chaos Monkey randomly turns off production instances to prove the system survives failures (an older post, but the idea is still used).' },
    ]},
  ],
});
