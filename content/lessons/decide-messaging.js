(function () {
  /* Decision widget: questions as chips -> recommendation card.
     cfg = { questions: [{ id, q, opts: [[value, label]], when?(ans) }], decide(ans) -> { pick, why, cost, alt } }
     The cfg is also attached to the block (block.cfg) so a node script can walk every path. */
  const decider = (el, cfg) => {
    const ans = {};
    el.innerHTML = '<div class="dz-qs"></div><div class="dz-out" aria-live="polite"></div>' +
      '<div style="margin-top:12px"><button type="button" class="btn small ghost dz-reset">Shuru se</button></div>';
    const qs = el.querySelector('.dz-qs'), out = el.querySelector('.dz-out');
    const draw = () => {
      const live = [];
      cfg.questions.forEach(q => { if (q.when && !q.when(ans)) delete ans[q.id]; else live.push(q); });
      qs.innerHTML = '';
      let done = true;
      for (let i = 0; i < live.length; i++) {
        const q = live[i], box = document.createElement('div');
        box.style.margin = '0 0 14px';
        box.innerHTML = `<div style="font-weight:600;color:var(--ink);margin-bottom:6px">${i + 1}. ${q.q}</div><div style="display:flex;flex-wrap:wrap;gap:6px"></div>`;
        q.opts.forEach(([v, t]) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'chip' + (ans[q.id] === v ? ' on' : '');
          b.style.borderRadius = '14px'; b.style.textAlign = 'left';
          b.setAttribute('aria-pressed', String(ans[q.id] === v));
          b.innerHTML = t;
          b.onclick = () => { ans[q.id] = v; draw(); };
          box.lastChild.appendChild(b);
        });
        qs.appendChild(box);
        if (ans[q.id] == null) { done = false; break; }
      }
      if (!done) { out.innerHTML = '<div class="calc-note">Upar wale sawaal ka jawab chuno. Saare jawab milte hi recommendation yahan aayega.</div>'; return; }
      const r = cfg.decide(ans);
      out.innerHTML = `<div style="border:1px solid var(--line-2);border-left:4px solid var(--accent);border-radius:var(--r);background:var(--surface-2);padding:12px 14px">
        <div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">Recommendation</div>
        <div style="font:700 20px/1.3 var(--f-display);color:var(--ink);margin:2px 0 8px">${r.pick}</div>
        <p style="margin:6px 0"><strong>Kyun:</strong> ${r.why}</p>
        <p style="margin:6px 0"><strong>Kya chhodte ho:</strong> ${r.cost}</p>
        <p style="margin:6px 0"><strong>Runner-up:</strong> ${r.alt}</p></div>`;
    };
    el.querySelector('.dz-reset').onclick = () => { Object.keys(ans).forEach(k => delete ans[k]); draw(); };
    draw();
  };

  /* Practice cards: one case at a time; "signal" hint and "answer" reveal, prev/next. */
  const practice = (el, cases, T) => {
    let i = 0, hint = false, ans = false;
    const draw = () => {
      const c = cases[i];
      el.innerHTML = `<div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.06em">${T.case} ${i + 1} / ${cases.length}</div>
        <div style="font:600 17px/1.45 var(--f-body);color:var(--ink);margin:4px 0 10px">${c.q}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn small" data-a="hint">${T.hint}</button>
          <button type="button" class="btn small primary" data-a="ans">${T.ans}</button>
          <button type="button" class="btn small ghost" data-a="prev">${T.prev}</button>
          <button type="button" class="btn small ghost" data-a="next">${T.next}</button></div>
        <div class="calc-note" style="${hint ? '' : 'display:none'}"><strong>${T.signal}:</strong> ${c.signal}</div>
        <div style="${ans ? '' : 'display:none'};margin-top:10px;border:1px solid var(--line-2);border-left:4px solid var(--green);border-radius:var(--r);background:var(--surface-2);padding:10px 12px">
          <div style="font:700 16px var(--f-display);color:var(--ink)">${c.pick}</div>
          <p style="margin:6px 0">${c.why}</p><p style="margin:6px 0"><strong>${T.trap}:</strong> ${c.trap}</p></div>`;
      el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'hint') hint = true; else if (a === 'ans') { hint = true; ans = true; }
        else { i = (i + (a === 'next' ? 1 : cases.length - 1)) % cases.length; hint = false; ans = false; }
        draw();
      });
    };
    draw();
  };
  const CASES = [
    { q: 'Har naye user ko signup ke 1 ghante baad "getting started" email jaana chahiye.', signal: '"Ye kaam karo", ek baar, ek worker se, thodi der baad (delay).', pick: 'Queue with delay (SQS delay / scheduled job in Sidekiq/Celery)', why: 'Ek command hai, sirf email team ko chahiye. Queue retries aur DLQ deti hai. SQS mein message ko 15 minute tak delay kar sakte ho; 1 ghante ke liye scheduled job (Sidekiq/Celery) ya ek timer table.', trap: 'Kafka mein daal ke consumer mein sleep(1 hour): poora partition ek ghanta atak jaayega.' },
    { q: '"comment.posted" event: creator ko notification, spam filter, aur comment count. Spam filter mein bug mila, pichhle 3 din ke comments dobara check karne hain.', signal: 'Event + kai teams + replay.', pick: 'Kafka topic, partition key = video_id', why: 'Har team ka consumer group. Bug fix ke baad spam filter ka offset 3 din peeche karo aur dobara padho; baaki teams pe koi asar nahi.', trap: 'Retention 1 din rakhi thi to 3 din ka replay possible hi nahi. Retention ko replay ki zaroorat se tay karo.' },
    { q: 'Live match ke dauraan "Riya is typing..." indicator.', signal: 'Abhi ke abhi, miss chalega, kuch save nahi karna.', pick: 'Redis Pub/Sub', why: 'Fire-and-forget, sub-millisecond. Indicator miss hua to agle second naya aa jaayega.', trap: 'Isko Kafka mein likhna: har keypress disk pe, retention tak. Bekaar ka kharcha.' },
    { q: 'Creator ka payout: har mahine 1 taarikh ko 50,000 creators ko bank transfer. Bank API kabhi kabhi slow/fail hoti hai. Ek creator ko do baar paisa nahi jaana chahiye.', signal: 'Kaam (command), har ek zaroori, flaky third party, retries, aur double nahi.', pick: 'Queue (SQS/RabbitMQ) + idempotency key per payout + DLQ', why: 'Har payout ek job. Bank fail ho to retry; 5 baar fail ho to DLQ, insaan dekhe. At-least-once hai, to har payout ka idempotency key (payout_id) bank ko bhejo taaki duplicate pe dobara paisa na jaaye.', trap: 'Retry ke bharose bina idempotency ke: timeout hua, retry hua, aur bank ne dono baar paisa bhej diya.' },
    { q: 'Creator ko copyright claim aaya: 7 din mein jawab de, warna video private ho jaayega; jawab diya to legal team review karegi (insaan), phir decision.', signal: 'Kai steps, din bhar ke timeouts, insaan ka step.', pick: 'Workflow engine (Temporal / Step Functions)', why: 'Engine "7 din ka timer", "legal team ka wait" aur har claim ka state durable rakhta hai. Kaunsa claim kis step pe hai, ek jagah dikhta hai.', trap: 'Cron job jo har ghante saari claims scan kare: slow, aur ek bug mein claim do baar private/public hota hai.' },
    { q: 'Har video view ka event analytics ke liye. 2 lakh events/sec, kabhi kabhi analytics team ghanton down rehti hai.', signal: 'Bahut high throughput, consumer apni speed se aur baad mein catch-up kare.', pick: 'Kafka (ya Kinesis)', why: 'Log events ko retention tak rakhta hai; analytics wapas aaye to apne offset se padh leta hai. Partitions se throughput baant-ta hai.', trap: 'Redis Pub/Sub: analytics down = us waqt ke saare views gayab.' },
  ];
  const R = (pick, why, cost, alt) => ({ pick, why, cost, alt });
  const CFG = {
    questions: [
      { id: 'kind', q: 'Message kis type ka hai?', opts: [
        ['task', '"Ye kaam karo" (email bhejo, thumbnail banao, video transcode)'],
        ['fact', '"Ye ho gaya" (video publish hua, payment hua)'],
        ['process', 'Kai steps wala business process (timeouts, retries, insaan ka step)'],
      ]},
      { id: 'stack', q: 'Tumhara setup kaisa hai?', when: a => a.kind === 'task', opts: [
        ['cloud', 'AWS pe hain, managed service chalegi'],
        ['self', 'Apne servers, routing rules chahiye (priority, alag job types)'],
        ['redis', 'Chhoti app, Redis pehle se hai (Python/Ruby)'],
      ]},
      { id: 'readers', q: 'Kitni alag teams/services ko ye event chahiye?', when: a => a.kind === 'fact', opts: [
        ['one', 'Sirf ek'],
        ['many', 'Kai (notifications, search, analytics...)'],
      ]},
      { id: 'keep', q: 'Message kitna zaroori hai?', when: a => a.kind === 'fact', opts: [
        ['replay', 'Har event zaroori, aur purane events dobara padhne (replay) bhi chahiye'],
        ['once', 'Har event zaroori, ek baar process ho jaaye, bas'],
        ['live', 'Abhi ke abhi pahunchao; koi offline tha to miss chalega'],
      ]},
      { id: 'steps', q: 'Process kitna bada hai?', when: a => a.kind === 'process', opts: [
        ['simple', '2 steps, koi lamba wait nahi'],
        ['long', 'Kai steps, ghanton/dinon ke timeouts, compensation (refund)'],
      ]},
    ],
    decide(a) {
      const KAFKA_COST = 'Kafka chalana mushkil (brokers, partitions, rebalancing). Per-message retry aur DLQ built-in nahi, khud banana padta hai. At-least-once delivery, to consumers idempotent banao.';
      if (a.kind === 'task') {
        if (a.stack === 'cloud') return R('Queue: Amazon SQS', 'Har job ek worker ek baar uthata hai. Worker crash ho to visibility timeout ke baad job wapas dikhti hai (retry), aur baar baar fail ho to DLQ mein. Servers chalane ka jhanjhat AWS ka.', 'Job ack hote hi gayab: replay nahi. Doosri team ko same jobs nahi dikhti. Standard queue mein order ki guarantee nahi aur duplicate aa sakta hai (idempotent worker banao).', 'RabbitMQ (agar routing rules chahiye), ya Kafka agar baad mein kai teams ko yahi events chahiye.');
        if (a.stack === 'self') return R('Queue: RabbitMQ', 'Exchanges se routing (job type ke hisaab se alag queues), per-message ack, priorities, aur dead-letter exchange se DLQ. Job ek worker ko, ek baar.', 'Cluster khud chalana aur monitor karna. Ack ke baad message gone, replay nahi.', 'SQS agar cloud pe ho; Celery/Sidekiq agar app chhoti aur Redis pehle se ho.');
        return R('Queue: Celery / Sidekiq on Redis', 'App ke framework ke saath seedha jud jaata hai, Redis pehle se hai, retries aur scheduled jobs built-in. Chhoti team ke liye sabse kam naye parts.', 'Redis memory mein hai: persistence settings kamzor hon to crash pe jobs ja sakti hain. Bahut bade scale pe dedicated queue zyada bharosemand.', 'SQS / RabbitMQ jab jobs critical hon (payout) ya volume bahut badhe.');
      }
      if (a.kind === 'process') return a.steps === 'long'
        ? R('Workflow engine: Temporal / AWS Step Functions', 'Har process ka state engine durable rakhta hai: kaunsa step hua, kis pe retry chal raha hai, "48 ghante mein creator accept na kare to refund" jaisa timeout. Server restart ho jaaye to process wahin se chalta hai.', 'Ek naya platform seekhna aur chalana. Temporal mein workflow code deterministic rakhna padta hai. Har chhoti cheez ke liye overkill.', 'Saga with queues/Kafka + ek state table (choreography), jab steps kam aur team chhoti ho.')
        : R('Queue + status column (chhota state machine)', 'Do steps ke liye engine ki zaroorat nahi: step 1 khatam hote hi DB mein status "PAID" likho aur agla job queue mein daalo. Retry aur DLQ queue se mil jaate hain.', 'Steps badhe, timeouts aaye, compensation aaya, to ye code jaldi uljhega aur bugs chhup jaayenge.', 'Workflow engine (Temporal / Step Functions) jab process lamba ho jaaye.');
      if (a.keep === 'live') return a.readers === 'many'
        ? R('Pub/sub: Redis Pub/Sub (ya SNS / Google Pub/Sub)', 'Ek message turant saare subscribers ko, jaise chat message un gateway servers tak jahan recipients connected hain. Miss ho gaya to chalega, kyunki message DB mein saved hai aur client reconnect pe sync kar lega.', 'Redis Pub/Sub message store nahi karta: subscriber us second offline tha to message gaya. Koi retry nahi.', 'Kafka, agar har subscriber ko har message eventually milna hi chahiye.')
        : R('Pub/sub: Redis Pub/Sub', 'Ek hi live listener, fire-and-forget, sub-millisecond. Jaise "typing..." indicator: miss hua to koi nuksaan nahi.', 'Persistence aur retry zero. Listener down = message gone.', 'Queue (agar message miss nahi hona chahiye), ya Redis Streams.');
      if (a.keep === 'replay') return R('Log: Kafka (ya Kinesis / Pulsar)', (a.readers === 'many' ? 'Har team apna consumer group, apna offset, apni speed. Ek event ki ek hi copy, kitne bhi readers. ' : 'Abhi ek reader hai, lekin replay chahiye: bug fix ke baad pichhle 3 din ke events dobara process karna, ya naya system shuru se bharna. ') + 'Retention tak events rehte hain, aur ek key (jaise video_id) ke events ek partition mein order mein.', KAFKA_COST, a.readers === 'many' ? 'SNS → har team ki SQS queue (fan-out), agar replay kabhi nahi chahiye.' : 'Simple queue, agar replay ki zaroorat sach mein kabhi nahi aayegi.');
      return a.readers === 'many'
        ? R('Log: Kafka (ya Kinesis / Pulsar)', '"Ye hua, aur kai teams ko parwah hai" = Kafka ka classic case. Har team ka consumer group poore stream ki copy padhta hai; nayi team kal jude to bhi kisi ko kuch nahi badalna.', KAFKA_COST, 'SNS → har team ki apni SQS queue (fan-out): AWS pe simple, per-team retries aur DLQ built-in, lekin replay nahi.')
        : R('Queue: SQS / RabbitMQ', 'Sirf ek consumer hai aur replay nahi chahiye, to queue sabse simple hai: per-message retry, DLQ, aur ack ke baad message saaf.', 'Kal doosri team ko yahi events chahiye honge to queue unhe nahi degi; tab fan-out (SNS → queues) ya Kafka pe jaana padega.', 'Kafka, agar lagta hai jaldi hi aur teams judengi ya replay chahiye hoga.');
    },
  };

  Lesson.register({
    id: 'decide-messaging',
    title: 'Queue, Kafka ya pub/sub?',
    minutes: 26,
    summary: `Services ke beech message bhejne ke chaar tareeke: queue, log (Kafka), pub/sub aur workflow engine. Message ka "type" pehchano, aur galat tool se kya tootta hai wo dekho.`,
    blocks: [
      { type: 'callout', tone: 'analogy', title: 'Seedhi baat', html: `Ek app ke andar bahut saari services hoti hain, aur unhe ek doosre ko khabar bhejni padti hai.<br>Kabhi khabar ek <strong>kaam</strong> hoti hai ("ye email bhejo"). Kabhi ek <strong>khabar</strong> ("video publish ho gaya"), jo kai teams ko chahiye. Kabhi bas <strong>abhi ke abhi</strong> kisi ko batana hai ("Riya typing kar rahi hai").<br>Har type ke liye alag tool hai: queue, Kafka, pub/sub, ya workflow engine. Galat tool chuna to message chupke se kho jaate hain ya line atak jaati hai.<br>Is lesson mein hum message ka type pehchaan ke sahi tool chunna seekhenge.` },
      { type: 'h2', text: 'Problem: har cheez ke liye ek hi hathoda' },
      { type: 'p', html: `xyz.com mein ab dozens services hain. Video upload hua to thumbnail banana hai, followers ko notification, search index update, analytics mein count, creator ko email. Tumne <a href="#/queues">queues</a> aur <a href="#/kafka">Kafka</a> dono seekhe hain. Ab sawaal ye nahi ki "ye kaise kaam karte hain", sawaal ye hai: <strong>is message ke liye kaunsa?</strong>` },
      { type: 'p', html: `Beginner ya to har jagah Kafka laga deta hai ("big companies use it"), ya har jagah ek queue. Dono galat jagah pe toot-te hain, aur aksar <em>chupke se</em>: koi error nahi, bas ek team ko data milna band. Isliye pehle message ka type pehchano.` },
      { type: 'callout', tone: 'term', title: 'Naye words: Command (task) aur Event', html: `<strong>Ye kya hai:</strong> <strong>command</strong> = "ye kaam karo" (email bhejo, thumbnail banao). Ek baar hona chahiye, kisi ek worker se. <strong>Event</strong> = "ye ho gaya" (video publish hua). Ek fact, jise kitne bhi log sun sakte hain, aur bhejne wale ko pata bhi nahi ki kaun sun raha hai.<br><strong>Kyun chahiye:</strong> message ka type pehchaan liya to tool aadha chun liya. Command → queue. Event jise kai teams sunein → Kafka.<br><strong>Iske bina:</strong> log event ko queue mein daal dete hain, aur teen teams mein se har message sirf ek team tak pahunchta hai (neeche flow mein dekhoge).` },
      { type: 'callout', tone: 'term', title: 'Naya word: Fan-out', html: `<strong>Ye kya hai:</strong> ek message ki copy kai jagah pahunchana, har subscriber ko apni copy.<br><strong>Kyun chahiye:</strong> "video publish hua" notifications, search aur analytics, teeno ko chahiye.<br><strong>Iske bina:</strong> producer ko har team ko alag se message bhejna padega, aur nayi team aayi to producer ka code badlo.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Workflow engine', html: `<strong>Ye kya hai:</strong> ek system jo <strong>lambe, kai steps wale business process</strong> ka state yaad rakhta hai: kaunsa step hua, kis pe retry chal raha hai, kitni der se wait ho raha hai. Examples: <strong>Temporal</strong>, <strong>AWS Step Functions</strong>.<br><strong>Kyun chahiye:</strong> "48 ghante mein accept nahi kiya to refund" jaise timeouts aur "refund wapas karo" jaise ulte steps (compensation) ko bharosemand banana.<br><strong>Iske bina:</strong> queues + cron jobs + status columns ka jaal. Server restart hua to process beech mein atak jaata hai, aur kisi ko pata nahi kaunsa kaam kis step pe hai. Detail: <a href="#/distributed-tx">sagas lesson</a>.` },
      { type: 'h3', text: 'Pichhle lessons ke words, ek line mein' },
      { type: 'table', head: ['Word', 'Ek line mein', 'Detail'], rows: [
        ['Queue', 'Line mein lage messages; har message ek hi worker uthata hai, aur kaam hone pe delete.', '<a href="#/queues">Queues</a>'],
        ['Ack', 'Worker ka bolna "ye message ho gaya". Ack ke baad hi message hatta hai.', '<a href="#/queues">Queues</a>'],
        ['Log / topic', 'Kafka ka append-only list. Message padhne ke baad bhi rehta hai (retention tak).', '<a href="#/kafka">Kafka</a>'],
        ['Offset', 'Log mein "main yahan tak padh chuka" ka number. Har consumer group ka apna.', '<a href="#/kafka">Kafka</a>'],
        ['Consumer group', 'Ek team ke workers ka group. Har group ko poore stream ki apni copy milti hai.', '<a href="#/kafka">Kafka</a>'],
        ['Partition', 'Topic ka ek hissa. Ek partition ke andar order pakka hai.', '<a href="#/kafka">Kafka</a>'],
        ['At-least-once', 'Message kam se kam ek baar pahunchega, kabhi do baar bhi. Isliye consumer idempotent ho: do baar chale to bhi nateeja same.', '<a href="#/queues">Queues</a>'],
      ]},
      { type: 'callout', tone: 'tip', title: 'Rule of thumb (Decide)', html: `<strong>"Ye kaam karo"</strong> → queue. <strong>"Ye hua, aur kai teams ko parwah hai"</strong> → Kafka. <strong>"Abhi ke abhi sabko, miss chalega"</strong> → pub/sub. <strong>"Kai steps, timeouts, insaan ka step"</strong> → workflow engine.` },

      { type: 'h2', text: 'Decision helper' },
      { type: 'p', html: `Ek message socho (jaise "video publish hua", "welcome email bhejo", "user typing kar raha hai") aur jawab do. Har raasta try karo: result mein pick, wajah, kya chhoda, aur runner-up.` },
      { type: 'custom', cfg: CFG, render(el) { decider(el, CFG); } },

      { type: 'h2', text: 'Poori table' },
      { type: 'table', head: ['Zaroorat', 'Pick', 'Example'], caption: 'Roadmap phase 5: "Queue, Kafka or pub/sub?"', rows: [
        ['Jobs workers mein baanto; har job ek baar, phir delete; per-message retries aur DLQ', 'Queue: SQS, RabbitMQ, Celery / Sidekiq on Redis', 'Emails bhejna, images resize, videos transcode'],
        ['High-throughput event stream, kai independent consumers, replay, ordering per key', 'Log: Kafka, Kinesis, Pulsar', 'Order/video events → billing, analytics, notifications, search indexing'],
        ['Ek message abhi ke abhi kai subscribers ko, loss chalta hai', 'Pub/sub: Redis Pub/Sub, SNS, Google Pub/Sub', 'Chat message ko un gateway servers tak jahan recipients connected hain'],
        ['Complex multi-step business process, retries, timeouts, human steps', 'Workflow engine: Temporal, Step Functions', 'Sponsorship: payment → creator accept → video publish → payout'],
      ]},
      { type: 'callout', tone: 'term', title: 'Naya word: DLQ (dead-letter queue)', html: `<strong>Ye kya hai:</strong> ek alag queue jahan wo messages chale jaate hain jo baar baar (jaise 3 baar) fail hue.<br><strong>Kyun chahiye:</strong> ek kharab message line na roke, aur koi insaan baad mein use dekh ke theek kar sake.<br><strong>Iske bina:</strong> ya to kharab message hamesha retry hota rahega (CPU aur paisa barbaad), ya chupke se phenk diya jaayega.` },
      { type: 'callout', tone: 'term', title: 'Naye words: Replay, Ordering per key', html: `<strong>Replay, ye kya hai:</strong> purane events dobara padhna (Kafka mein offset peeche karke). <strong>Kyun:</strong> bug fix ke baad pichhle 2 din ke events dobara process karna, ya naya system shuru se bharna. <strong>Iske bina:</strong> queue mein ack hote hi message gayab, dobara chalane ka koi tareeka nahi.<br><strong>Ordering per key, ye kya hai:</strong> ek hi key (jaise video_id) ke events usi order mein milte hain jisme bane; alag keys ke beech koi guarantee nahi. <strong>Kyun:</strong> "video upload hua" ke baad hi "video delete hua" process ho. <strong>Iske bina:</strong> delete pehle chal gaya to video phir se dikhne lagega.` },
      { type: 'h2', text: 'Har option, ek ek karke: signal, scenario, wajah, jaal' },
      { type: 'h3', text: 'Queue: SQS, RabbitMQ, Celery / Sidekiq on Redis' },
      { type: 'p', html: `<strong>Signal:</strong> "ye kaam karo", ek baar, kisi ek worker se. Fail ho to retry, phir DLQ.<br><strong>xyz.com:</strong> har upload ke baad "is video ke 360p, 720p, 1080p banao" (transcode). 1,000 videos aaye aur 20 workers hain, to queue kaam baant deti hai; backlog badhe to workers badhao.<br><strong>Kaunsa:</strong> AWS pe ho to <strong>SQS</strong> (managed; worker crash ho to <em>visibility timeout</em> ke baad message phir dikhta hai, yaani apne aap retry). Apne servers aur routing rules (priority, job type ke hisaab se alag queues) chahiye to <strong>RabbitMQ</strong>. Chhoti Python/Ruby app jisme Redis pehle se hai to <strong>Celery / Sidekiq</strong>.<br><strong>Jaal:</strong> kal doosri team ko bhi "video transcoded" chahiye. Queue mein ack ke baad message gayab, to wo team ko kabhi nahi milega. Tab queue ke baad ek event Kafka mein bhi bhejo.` },
      { type: 'h3', text: 'Log: Kafka, Kinesis, Pulsar' },
      { type: 'p', html: `<strong>Signal:</strong> "ye hua", aur kai teams ko parwah hai. Bahut zyada events, replay chahiye, ek key ke events order mein.<br><strong>xyz.com:</strong> "video.published": notifications, search, analytics, recommendations, sab apni speed se padhte hain. Kal "copyright check" team judegi, aur upload service ka code badalna bhi nahi padega.<br><strong>Kaunsa:</strong> <strong>Kafka</strong> sabse common (default retention 7 din, badha sakte ho). AWS pe managed chahiye to <strong>Kinesis</strong> (default 24 ghante, 365 din tak badha sakte ho). <strong>Pulsar</strong> storage aur brokers ko alag rakhta hai aur queue jaisa use bhi deta hai.<br><strong>Jaal:</strong> "Kafka big companies use karti hain" sun ke har kaam ke liye. Per-message retry aur DLQ Kafka mein built-in nahi, aur ek atka message apne partition ko rok deta hai (neeche "emails" trap).` },
      { type: 'h3', text: 'Pub/sub: Redis Pub/Sub, SNS, Google Pub/Sub' },
      { type: 'p', html: `<strong>Signal:</strong> ek message <em>abhi ke abhi</em> kai subscribers ko, aur koi miss kare to chalega (kyunki asli data kahin aur saved hai).<br><strong>xyz.com:</strong> Riya ka chat message un gateway servers tak pahunchana jahan Aman ke phone ka connection hai. Ya "Riya typing kar rahi hai".<br><strong>Kaunsa:</strong> <strong>Redis Pub/Sub</strong> sabse tez aur simple, lekin message store nahi karta: us second subscriber connected nahi tha to message gaya (at-most-once). <strong>SNS</strong> aur <strong>Google Pub/Sub</strong> managed hain aur delivery retry karte hain; SNS → har team ki SQS queue ek common fan-out tareeka hai.<br><strong>Jaal:</strong> billing jaise "miss nahi hona chahiye" events Redis Pub/Sub pe bhejna. Gateway restart ke 2 second = paise ka hisaab gayab.` },
      { type: 'h3', text: 'Workflow engine: Temporal, Step Functions' },
      { type: 'p', html: `<strong>Signal:</strong> kai steps, beech mein lambe wait (ghante, din), timeouts, insaan ka step, aur fail hone pe ulte steps (refund).<br><strong>xyz.com:</strong> brand sponsorship: brand pay kare → creator 48 ghante mein accept kare → video publish → 7 din baad payout. Accept nahi kiya to refund.<br><strong>Kaunsa:</strong> <strong>Temporal</strong>: process ko normal code ki tarah likhte ho, engine har step ka state durable rakhta hai. <strong>AWS Step Functions</strong>: steps ko ek state machine ki tarah define karte ho; Standard workflows ek saal tak chal sakte hain.<br><strong>Jaal:</strong> 2 steps ke liye bhi engine. Do steps = queue + ek status column kaafi hai. Engine tab jab timeouts, compensation aur bahut steps aayein.` },
      { type: 'callout', tone: 'mistake', title: 'Common beginner confusion', html: `"Pub/sub" do alag cheezon ke liye bola jaata hai. <strong>Redis Pub/Sub</strong> fire-and-forget hai: subscriber us waqt connected nahi tha to message gaya. <strong>Google Pub/Sub / SNS</strong> managed services hain jo delivery retry karti hain. Aur <strong>Kafka</strong> bhi "publish-subscribe" pattern deta hai, lekin uska asli farq hai <em>log</em>: messages padhne ke baad bhi rehte hain. Interview mein "pub/sub" bolo to saath mein batao: <em>loss chalega ya nahi, replay chahiye ya nahi</em>.` },
      { type: 'h2', text: 'Worked scenarios' },
      { type: 'h3', text: '1. Video transcode karna' },
      { type: 'p', html: `<strong>Type:</strong> command ("is video ke 360p, 720p, 1080p banao"). Har video ek hi baar transcode ho, kisi ek worker se; fail ho to retry, baar baar fail ho to DLQ mein, insaan dekhe. <strong>Decision: queue</strong> (SQS/RabbitMQ). Workers ki ginti backlog dekh ke badhao.` },
      { type: 'h3', text: '2. "Video published" event' },
      { type: 'p', html: `<strong>Type:</strong> event. Notifications team followers ko batayegi, search team index karegi, analytics count karegi, recommendations team naya video seekhegi. Kal ek "copyright check" team bhi judegi. <strong>Decision: Kafka</strong>. Har team ka apna consumer group; upload service ko kisi team ka naam bhi nahi pata. Search indexer mein bug tha? Fix karo aur offset peeche karke pichhle 2 din <em>replay</em> karo.` },
      { type: 'h3', text: '3. Chat message, sahi gateway tak' },
      { type: 'p', html: `Riya ne Aman ko message bheja. Aman ka phone <a href="#/realtime">gateway server</a> #7 se WebSocket pe juda hai. Message pehle DB mein save hota hai, phir <strong>Redis Pub/Sub</strong> pe "user:aman" channel pe publish; gateway #7 subscribed hai, turant push kar deta hai. Agar us second gateway restart ho raha tha aur message miss hua? Koi baat nahi: Aman reconnect karte hi "last message id ke baad ke messages do" poochhega. <strong>Loss chalega, kyunki source of truth DB hai.</strong>` },
      { type: 'h3', text: '4. Trap: emails ke liye Kafka, "kyunki scale"' },
      { type: 'p', html: `Team ne welcome emails Kafka se bhejna shuru kiya. Ek din ek user ka email address kharab tha aur email provider error de raha tha. Kafka consumer ek partition ko <em>order mein</em> padhta hai, to wo message pe atka rehta hai: retry, retry, retry, aur <strong>uske peeche us partition ke hazaaron emails ruk gaye</strong> (head-of-line blocking). Per-message retry aur DLQ Kafka mein khud banana padta hai. <strong>Sahi decision: queue</strong>. Ek kharab message apni retries karke DLQ mein chala jaata, baaki emails chalte rehte.` },
      { type: 'callout', tone: 'term', title: 'Naya word: Head-of-line blocking', html: `<strong>Ye kya hai:</strong> jab line mein sabse aage wala atak jaaye aur uske peeche sab ruk jaayein, chahe unme koi problem na ho. Jaise ek single-lane road pe ek kharab gaadi.<br><strong>Yahan kyun:</strong> Kafka partition order mein padha jaata hai. Ek "poison message" (aisa message jo har baar fail ho) poore partition ko rok deta hai.<br><strong>Bachaav:</strong> kaam ke liye queue (har message ki apni retry + DLQ), ya Kafka mein khud ka retry topic aur DLQ topic.` },
      { type: 'h3', text: '5. Trap: brand sponsorship, "bas ek queue aur kuch cron jobs"' },
      { type: 'p', html: `Brand paisa deta hai → creator ko 48 ghante mein accept karna hai → video publish → 7 din baad payout. Na accept kiya to refund. Pehli soch: queues + cron jobs + status columns. Teen mahine baad: kaunsa sponsorship kis step pe atka hai, kisi ko nahi pata, aur refund do baar chala gaya. <strong>Sahi decision: workflow engine</strong> (Temporal/Step Functions): har sponsorship ka state, timeouts aur compensation (refund) engine sambhalta hai.` },
      { type: 'h2', text: 'Practice: 6 chhote cases' },
      { type: 'p', html: `Har case padho aur pehle khud socho: ye command hai, event hai, live khabar hai, ya lamba process? Phir "Signal dikhao", phir "Jawab dikhao".` },
      { type: 'custom', render(el) { practice(el, CASES, { case: 'Case', hint: 'Signal dikhao', ans: 'Jawab dikhao', prev: '← Pichhla', next: 'Agla →', signal: 'Signal', trap: 'Jaal' }); } },
      { type: 'h2', text: 'Galat tool, chupa hua nuksaan: chala ke dekho' },
      { type: 'p', html: `Teen teams ko "video published" events chahiye. Pehle Kafka ke saath dekho, phir wahi kaam ek plain queue se, phir emails ke liye Kafka wala trap.` },
      { type: 'flow', height: 340,
        nodes: [
          { id: 'up', label: 'Upload service', sub: 'producer', x: 100, y: 170, w: 150, kind: 'server', info: 'Ye kya hai: wo service jo video upload aur publish sambhalti hai (producer, yaani message bhejne wala). Video publish hone pe ek message bhejta hai. Ise nahi pata ki kaun kaun sun raha hai, aur nahi hona chahiye.' },
          { id: 'bus', label: 'Kafka topic', sub: 'video.published', x: 330, y: 170, w: 160, kind: 'queue', info: 'Ye kya hai: beech ka message system. Kafka scenario mein: ek log jahan events retention tak rehte hain; har consumer group ka apna offset. Queue scenario mein: ek queue jahan message ek consumer ko milta hai aur ack ke baad delete.' },
          { id: 'n', label: 'Notifications', x: 590, y: 60, w: 170, kind: 'server', info: 'Ye kya hai: notifications service. Followers ko "naya video" notification bhejti hai. Trap scenario mein ye email sender ban jaata hai.' },
          { id: 's', label: 'Search indexer', x: 590, y: 170, w: 170, kind: 'server', info: 'Ye kya hai: search team ki service. Naye video ko search index mein daalta hai. Event miss = video kabhi search mein nahi aayega.' },
          { id: 'an', label: 'Analytics', x: 590, y: 280, w: 170, kind: 'data', info: 'Ye kya hai: analytics team ka system. Creator dashboard ke liye counts. Ye team kabhi kabhi ghanton down rehti hai (deploy, migration) aur baad mein catch-up karti hai.' },
        ],
        edges: [{ a: 'up', b: 'bus' }, { a: 'bus', b: 'n' }, { a: 'bus', b: 's' }, { a: 'bus', b: 'an' }],
        scenarios: [
          { name: 'Kafka (sahi)', steps: [
            { title: 'Event publish', text: 'Video v1 publish hua. Ek event log mein append.', set: { bus: { label: 'Kafka topic', sub: 'video.published', state: '' }, n: { label: 'Notifications', sub: '', state: '' }, s: { sub: '', state: '' }, an: { sub: '', state: '' } }, go: 'evt:up>bus', msg: 'video.published { id: "v1" }  → offset 0' },
            { title: 'Teeno ko apni copy', text: 'Har team ka apna consumer group hai, to <strong>teeno</strong> v1 padhte hain. Event delete nahi hota.', parallel: true, go: ['evt:bus>n', 'evt:bus>s', 'evt:bus>an'], after: { n: { state: 'ok', sub: 'v1' }, s: { state: 'ok', sub: 'v1' }, an: { state: 'ok', sub: 'v1' } } },
            { title: 'Analytics down', text: 'Analytics 2 ghante down hai. v2 aata hai; baaki do teams padh leti hain. Analytics ka offset wahin ruka hai.', set: { an: { state: 'down', sub: 'offset 1 pe ruka' } }, go: ['evt:up>bus', 'evt:bus>n', 'evt:bus>s'], msg: 'video.published { id: "v2" }  → offset 1' },
            { title: 'Wapas aaya, catch-up', text: 'Analytics wapas aate hi apne offset se padhta hai aur v2 bhi le leta hai. Kuch miss nahi hua. Yahi <strong>replay / independent pace</strong> ka faayda hai.', set: { an: { state: '' } }, go: 'evt:bus>an', after: { an: { state: 'ok', sub: 'v1, v2' } }, msg: 'analytics-group: offset 1 se resume' },
          ]},
          { name: 'Plain queue (galat)', intro: 'Ab wahi teen teams ek hi queue se padhti hain. Queue mein ek message sirf ek consumer ko milta hai (competing consumers).', steps: [
            { title: 'Ek queue, teen readers', text: 'Teams ko laga: "queue se events mil jaayenge".', set: { bus: { label: 'Queue', sub: 'video-events', state: '' }, n: { label: 'Notifications', sub: '', state: '' }, s: { sub: '', state: '' }, an: { sub: '', state: '' } }, focus: ['bus'] },
            { title: 'v1 sirf Notifications ko', text: 'Queue ne v1 ek consumer ko diya. Usne ack kiya, message <strong>delete</strong>.', go: ['evt:up>bus', 'evt:bus>n'], after: { n: { sub: 'v1' }, bus: { sub: 'v1 deleted' } }, msg: 'receive → v1 → ack → delete' },
            { title: 'v2 sirf Search ko', text: 'Agla message kisi aur ne utha liya.', go: ['evt:up>bus', 'evt:bus>s'], after: { s: { sub: 'v2' }, bus: { sub: 'v2 deleted' } } },
            { title: 'Chupa hua nuksaan', text: 'v1 kabhi search mein nahi aayega, v2 ke followers ko notification nahi gayi, analytics ko kuch nahi mila. <strong>Kahin koi error nahi.</strong> Fix: Kafka, ya har team ki apni queue (SNS/fanout exchange se fan-out).', after: { n: { state: 'warn', sub: 'v2 miss!' }, s: { state: 'warn', sub: 'v1 miss!' }, an: { state: 'warn', sub: '0 events' } } },
          ]},
          { name: 'Trap: emails Kafka se', intro: 'Ab topic "emails" hai aur consumer ek email sender. Ek address kharab hai.', steps: [
            { title: 'Poison message', text: 'Partition 3 ke aage ek email jiska address kharab hai. Provider har baar error deta hai.', set: { bus: { label: 'Kafka topic', sub: 'emails, p3', state: '' }, n: { label: 'Email sender', sub: '', state: '' }, s: { state: 'dim', sub: '' }, an: { state: 'dim', sub: '' } }, go: ['evt:up>bus', 'evt:bus>n', 'bad:n>bus'], msg: 'send(riya@gmial.con) → 550 error' },
            { title: 'Retry, retry, retry', text: 'Consumer order mein padhta hai, to agla message tabhi jab ye wala ho jaaye. Wo atka rehta hai.', go: ['evt:bus>n', 'bad:n>bus'], after: { n: { state: 'warn', sub: 'retry #40...' } } },
            { title: 'Peeche line lambi', text: 'Is partition ke 5,000 welcome emails ruk gaye: <strong>head-of-line blocking</strong>. Queue mein ye message retries ke baad DLQ chala jaata aur baaki chalte rehte.', flood: { paths: ['up>bus'], n: 10, kind: 'evt' }, after: { bus: { state: 'hot', sub: 'p3: 5,000 ruke' } } },
          ]},
        ],
      },
      { type: 'h2', text: 'Interview mein kaise bolein' },
      { type: 'list', items: [
        '"Transcode ek <strong>command</strong> hai, ek baar hona chahiye, to SQS queue + autoscaling workers, 3 retries ke baad DLQ."',
        '"Video published ek <strong>event</strong> hai jo 4 teams padhti hain, to Kafka topic, partition key video_id taaki ek video ke events order mein rahein."',
        '"Chat delivery ke liye Redis Pub/Sub, loss chalega kyunki message pehle DB mein save hai aur client reconnect pe sync karta hai."',
        '"Sponsorship ek lamba process hai jisme timeouts aur refund hai, to Temporal workflow."',
      ]},
      { type: 'diagram', title: 'xyz.com mein messages: poori picture', height: 616,
        groups: [
          { label: 'Users', x: 20, y: 14, w: 680, h: 74 },
          { label: 'Services', x: 4, y: 108, w: 712, h: 96 },
          { label: 'Messaging', x: 4, y: 236, w: 712, h: 100 },
          { label: 'Consumers', x: 4, y: 370, w: 712, h: 100 },
          { label: 'Jobs', x: 4, y: 502, w: 712, h: 96 },
        ],
        nodes: [
          { id: 'users', label: 'Users', sub: 'app + browser', x: 360, y: 50, w: 170, kind: 'client', info: 'Ye kya hai: xyz.com ke users. Video upload karte hain, chat karte hain, brand sponsorship lete hain. Har kaam ka message alag tool se jaata hai.' },
          { id: 'upload', label: 'Upload service', sub: 'producer', x: 110, y: 165, w: 150, kind: 'server', info: 'Ye kya hai: video upload aur publish sambhalne wali service. Publish hone pe ek event "video.published" Kafka mein likhti hai. Use nahi pata kaun kaun sunta hai.' },
          { id: 'chat', label: 'Chat service', sub: 'saves to DB', x: 360, y: 165, w: 150, kind: 'server', info: 'Ye kya hai: chat ka backend. Message pehle DB mein save karta hai (source of truth), phir Redis Pub/Sub pe publish, taaki sahi gateway turant push kare.' },
          { id: 'gw', label: 'WS gateways', sub: 'live connections', x: 600, y: 165, w: 150, kind: 'edge', info: 'Ye kya hai: wo servers jinse users ke phone WebSocket se jude rehte hain. Redis channel subscribe karte hain aur message turant user tak push karte hain.' },
          { id: 'kafka', label: 'Kafka topic', sub: 'video.published', x: 110, y: 295, w: 160, kind: 'queue', info: 'Ye kya hai: log (event stream). Event retention tak rehta hai; har team ka consumer group apni copy apni speed se padhta hai. Replay possible.' },
          { id: 'redis', label: 'Redis Pub/Sub', sub: 'user:<id>', x: 420, y: 295, w: 150, kind: 'queue', info: 'Ye kya hai: live fan-out. Message us waqt subscribed gateways ko turant; koi offline tha to miss. Chalega, kyunki message DB mein saved hai aur client reconnect pe sync karta hai.' },
          { id: 'temporal', label: 'Temporal', sub: 'sponsorship flow', x: 620, y: 295, w: 130, kind: 'queue', info: 'Ye kya hai: workflow engine. Har sponsorship ka state: pay → 48 ghante accept ka timer → publish → payout, ya refund. Restart pe bhi wahin se chalta hai.' },
          { id: 'search', label: 'Search indexer', x: 165, y: 430, w: 140, kind: 'server', info: 'Ye kya hai: search team ka consumer group. Naye video ko index mein daalta hai. Bug ho to offset peeche karke replay.' },
          { id: 'notif', label: 'Notifications', x: 330, y: 430, w: 140, kind: 'server', info: 'Ye kya hai: notifications team ka consumer group. Followers ko batata hai, aur har email ko ek job bana ke email queue mein daalta hai.' },
          { id: 'an', label: 'Analytics', sub: 'catch-up later', x: 500, y: 430, w: 140, kind: 'data', info: 'Ye kya hai: analytics team ka consumer group. Kabhi ghanton down rahe to bhi wapas aake apne offset se padh leta hai.' },
          { id: 'emailq', label: 'Email queue', sub: 'SQS', x: 280, y: 560, w: 140, kind: 'queue', info: 'Ye kya hai: queue. Har email ek job; ek worker ek baar uthata hai, fail pe retry (visibility timeout).' },
          { id: 'worker', label: 'Email workers', x: 450, y: 560, w: 150, kind: 'server', info: 'Ye kya hai: workers jo queue se job lekar email provider ko bhejte hain. Backlog badhe to workers badhao.' },
          { id: 'dlq', label: 'DLQ', sub: 'needs a human', x: 640, y: 560, w: 130, kind: 'threat', info: 'Ye kya hai: dead-letter queue. 3 baar fail hua email (jaise galat address) yahan; baaki line chalti rehti hai, insaan baad mein dekhta hai.' },
        ],
        edges: [
          { a: 'users', b: 'upload', n: 1 },
          { a: 'users', b: 'chat' },
          { a: 'gw', b: 'users', both: true, label: 'WebSocket' },
          { a: 'upload', b: 'kafka', n: 2, kind: 'evt' },
          { a: 'chat', b: 'redis', kind: 'evt', label: 'publish' },
          { a: 'redis', b: 'gw', kind: 'evt' },
          { a: 'users', b: 'temporal', via: [[708, 50], [708, 295]] },
          { a: 'kafka', b: 'search', kind: 'evt' },
          { a: 'kafka', b: 'notif', kind: 'evt' },
          { a: 'kafka', b: 'an', kind: 'evt' },
          { a: 'notif', b: 'emailq', label: 'job' },
          { a: 'emailq', b: 'worker' },
          { a: 'worker', b: 'dlq', kind: 'bad', label: 'fails' },
        ],
        paths: [
          { name: 'Video published (event)', text: 'Ek event Kafka mein; search, notifications aur analytics teeno apni copy padhte hain.', go: ['users>upload>kafka', 'kafka>search', 'kafka>notif', 'kafka>an'] },
          { name: 'Email (command)', text: 'Notifications har email ka job queue mein daalta hai; worker bhejta hai; baar baar fail ho to DLQ.', go: ['notif>emailq>worker>dlq'] },
          { name: 'Chat (pub/sub)', text: 'Message DB mein save, phir Redis Pub/Sub se sahi gateway, wahan se WebSocket pe user tak.', go: ['users>chat>redis>gw', 'res:gw>users'] },
          { name: 'Sponsorship (workflow)', text: 'Lamba process, timers aur refund: Temporal har sponsorship ka state sambhalta hai.', go: ['users>temporal'] },
        ],
      },
      { type: 'callout', tone: 'recap', title: 'Yaad rakho', html: `<ul>
        <li>Pehle message ka type: <strong>command</strong> ("ye karo") ya <strong>event</strong> ("ye hua").</li>
        <li>Command → <strong>queue</strong> (SQS, RabbitMQ, Celery/Sidekiq): ek worker, retries, DLQ, ack ke baad delete.</li>
        <li>Event + kai teams + replay → <strong>Kafka</strong> (ya Kinesis/Pulsar): har team ka consumer group, ordering per key.</li>
        <li>Abhi ke abhi, miss chalega → <strong>pub/sub</strong>. Redis Pub/Sub kuch store nahi karta; SNS/Google Pub/Sub retry karte hain.</li>
        <li>Kai steps, timeouts, insaan, refund → <strong>workflow engine</strong> (Temporal, Step Functions).</li>
        <li>Teen teams ek queue se padhein to har message sirf ek ko milta hai: fan-out ya Kafka chahiye.</li>
        <li>Kafka mein ek poison message partition rok deta hai: kaam ke liye queue, ya retry/DLQ topic.</li>
        <li>Har async raasta at-least-once: consumers idempotent banao.</li>
      </ul>` },
      { type: 'tradeoffs', gains: [
        'Queue: per-message retry, DLQ, simple scaling, ek kharab job baaki ko nahi rokti',
        'Kafka: ek event, kitne bhi teams; replay; per-key ordering; producer ko consumers ka pata nahi',
        'Pub/sub: sabse kam latency, sabse simple fan-out',
        'Workflow engine: lambe process ka state, timeouts aur compensation ek jagah, dikhta bhi hai',
      ], costs: [
        'Queue: ack ke baad message gone; nayi team = naya fan-out setup',
        'Kafka: operate karna mushkil; per-message retry/DLQ khud; head-of-line blocking',
        'Pub/sub (Redis): koi persistence nahi; offline subscriber ka message gaya',
        'Workflow engine: naya platform, learning curve; chhoti cheezon ke liye overkill',
        'Har async raasta: at-least-once, to consumers idempotent banane padte hain',
      ]},
      { type: 'think', questions: [
        { q: 'Payment service "payment.succeeded" bhejti hai. Billing, email receipt, aur fraud team ko chahiye. Billing ka event miss hona bilkul nahi chalega. Redis Pub/Sub chalega?', a: 'Nahi. Redis Pub/Sub mein subscriber restart ho raha ho to message gaya, aur billing ke liye ye paisa ka nuksaan hai. Kai teams + koi loss nahi = Kafka (ya SNS → har team ki queue). Aur event DB write ke saath atomic ho, iske liye transactional outbox (event ko pehle usi DB transaction mein ek outbox table mein likho, phir ek relay use Kafka tak bheje; detail <a href="#/kafka">Kafka lesson</a> mein).' },
        { q: 'Ek junior kehta hai: "Hum har jagah Kafka use karenge, ek hi tool seekhna padega." Ek fayda aur do nuksaan batao.', a: 'Fayda: ek hi platform chalana aur monitor karna. Nuksaan 1: kaam (commands) ke liye per-message retry aur DLQ khud banana padega, aur ek poison message partition rok dega. Nuksaan 2: live, miss-chalega cheezein (typing indicator) bhi disk pe likhi jaayengi; latency aur kharcha bekaar. Sahi jawab aksar: events ke liye Kafka, kaam ke liye queue, live ke liye pub/sub.' },
        { q: 'Tumhare Kafka consumer ko kabhi kabhi ek message process karne mein 10 minute lagte hain (bada PDF). Kya problem hogi aur kya karoge?', a: 'Us partition ke peeche ke messages ruk jaayenge (head-of-line), aur consumer bahut der poll na kare to group usse bahar maan ke rebalance kar sakta hai. Behtar: Kafka event aaye to ek queue mein "PDF process karo" job daalo; slow kaam queue workers karein, jahan per-job retry aur DLQ hain. Event ke liye Kafka, kaam ke liye queue.' },
      ]},
      { type: 'quiz', questions: [
        { q: '"Profile photo upload hui, 3 sizes ke thumbnails banao." Kya?', options: ['Kafka topic', 'Queue (SQS/RabbitMQ)', 'Redis Pub/Sub'], answer: 1, explain: 'Ye command hai: ek baar, ek worker, retries aur DLQ. Queue ka classic case.' },
        { q: 'Teen teams ek hi SQS queue se "order.created" padh rahi hain. Kya hoga?', options: ['Teeno ko har message milega', 'Har message sirf ek team ko milega, baaki miss karengi', 'SQS error dega'], answer: 1, explain: 'Queue mein consumers compete karte hain; ack ke baad message delete. Har team ko copy chahiye to fan-out (SNS → queues) ya Kafka.' },
        { q: 'Kafka mein ek kharab message baar baar fail ho raha hai. Uske peeche ke messages ka kya?', options: ['Wo aage nikal jaate hain', 'Us partition mein ruk jaate hain jab tak tum skip/park na karo', 'Kafka khud DLQ mein daal deta hai'], answer: 1, explain: 'Partition order mein padha jaata hai. Retry topic / DLQ topic ka logic khud likhna padta hai (ya framework se).' },
        { q: '"Order paid → seller 24 ghante mein confirm kare, warna refund" ke liye sabse achha?', options: ['Cron job har minute', 'Workflow engine (Temporal / Step Functions)', 'Redis Pub/Sub'], answer: 1, explain: 'Lamba process, timeout, compensation: workflow engine state aur timers durable rakhta hai.' },
      ]},
      { type: 'sources', note: 'Behaviour official docs se; decision table roadmap phase 5 se.', items: [
        { title: 'Redis Pub/Sub', publisher: 'Redis documentation', official: true, url: 'https://redis.io/docs/latest/develop/interact/pubsub/', used: 'At-most-once delivery: subscriber connected na ho to message lost.' },
        { title: 'Amazon SQS: visibility timeout and dead-letter queues', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html', used: 'Retry via visibility timeout, maxReceiveCount ke baad DLQ; standard queue at-least-once, best-effort order.' },
        { title: 'Apache Kafka documentation: consumer groups and offsets', publisher: 'Apache Software Foundation', official: true, url: 'https://kafka.apache.org/documentation/', used: 'Har consumer group ka apna offset, retention, per-partition ordering.' },
        { title: 'Amazon Kinesis Data Streams: changing the data retention period', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html', used: 'Default retention 24 ghante, 365 din tak badha sakte hain.' },
        { title: 'AWS Step Functions: Standard vs Express workflows', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html', used: 'Standard workflows ek saal tak chal sakte hain.' },
        { title: 'Amazon SQS delay queues', publisher: 'AWS documentation', official: true, url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html', used: 'Message delay maximum 15 minute.' },
        { title: 'Temporal documentation: workflows', publisher: 'Temporal', official: true, url: 'https://docs.temporal.io/workflows', used: 'Durable workflow state, timers/timeouts, deterministic workflow code.' },
      ]},
    ],
  });
})();
