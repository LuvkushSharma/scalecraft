Lesson.register({
  id: 'welcome',
  title: 'How to use this course',
  minutes: 7,
  summary: `Welcome to Scalecraft! This course starts with a simple website (xyz.com) and takes you all the way to systems like Uber, Hotstar and ChatGPT. Every new component appears only when a problem asks for it. Here is how to use the site.`,
  blocks: [
    { type: 'callout', tone: 'analogy', title: 'In simple words', html: `How do big apps (YouTube, Uber, WhatsApp) handle tens of millions of people at the same time? This course teaches exactly that, starting from zero.<br><br>No memorising. You will <strong>run everything yourself</strong>: watch requests move through diagrams, change numbers in widgets, and check yourself with quizzes.` },

    { type: 'h2', text: 'Scalecraft has two tracks' },
    { type: 'p', html: `There are two tabs at the top of the sidebar. Switch tracks with one click:` },
    { type: 'table', head: ['Track', 'What you will learn', 'Where to start'], rows: [
      ['<strong>System Design</strong>', 'From servers, databases, caches and queues to real systems like Uber, Hotstar and WhatsApp', 'Phase 1: "What is system design?"'],
      ['<strong>AI Agents</strong>', 'What an LLM is, the Transformer from the inside, training, prompts, RAG, and finally building agents', 'A1: "LLM basics"'],
    ]},

    { type: 'h2', text: 'Hinglish or English: your choice' },
    { type: 'p', html: `The header has a language button. Press it, and every lesson switches between Hinglish and simple English: the same diagrams, the same widgets, the same quiz. Press the same button again to switch back. Your choice is remembered.` },

    { type: 'h2', text: 'The one rule of this course' },
    { type: 'p', html: `Do not treat system design as a subject of memorising boxes. Every box arrives because of a problem. So every lesson follows this order:` },
    { type: 'ascii', text: `
Current architecture
        ↓
A new problem arrives
        ↓
Why the current architecture fails
        ↓
A new solution (a new component)
        ↓
Updated architecture
        ↓
Trade-offs: what we got, what we paid` },
    { type: 'p', html: `One example runs through the whole course: <strong>xyz.com</strong>, a general website that starts on a single laptop and slowly grows into an app with tens of millions of users.` },

    { type: 'h2', text: 'What you will find inside every lesson' },
    { type: 'table', head: ['Part', 'What it is', 'How to use it'], rows: [
      ['In simple words', 'The problem of the lesson, in kid-friendly words, with no jargon', 'Read it first, 30 seconds'],
      ['New word cards', 'A card for every new component: <em>What it is / Why we need it / Without it</em>', 'Move on only when all three lines make sense'],
      ['Interactive diagram', 'Watch a request move between the boxes', 'Press "Next step", and always run the failure scenarios'],
      ['Widgets', 'Calculators and simulators', 'Change the sliders and buttons, and feel the numbers'],
      ['Think', 'Questions with hidden answers', 'Think on your own first, then open the answer'],
      ['The whole design at a glance', 'A big diagram at the end of the lesson', 'Press the path buttons, click every box'],
      ['Remember', 'A recap of 5-8 points', 'Read it again tomorrow, 1 minute'],
      ['Quiz', '3-6 questions, each with an explanation', 'If you get one wrong, read the explanation'],
    ]},

    { type: 'h2', text: 'How to run a diagram: try it here' },
    { type: 'p', html: `This is a small practice diagram. Pick a scenario at the top, then keep pressing <strong>Next step</strong>. Click any box and its job is explained below. <strong>Auto play</strong> runs everything by itself.` },
    { type: 'flow', title: 'Practice: the trip of one request', height: 290,
      nodes: [
        { id: 'u', label: 'You', sub: 'browser', x: 100, y: 110, w: 130, kind: 'client', info: 'What it is: you, with your browser or app. Every story starts here: you send a request.' },
        { id: 's', label: 'Server', sub: 'xyz.com', x: 360, y: 110, w: 130, kind: 'server', info: 'What it is: the computer of xyz.com. It takes the request, does the work, and sends the answer.' },
        { id: 'c', label: 'Cache', sub: 'fast memory', x: 360, y: 230, w: 130, kind: 'cache', info: 'What it is: a fast memory that keeps things people ask for again and again. The server looks here first.' },
        { id: 'd', label: 'Database', sub: 'permanent data', x: 620, y: 110, w: 130, kind: 'data', info: 'What it is: the permanent home of data. If something is not in the cache, the server gets it from here.' },
      ],
      edges: [{ a: 'u', b: 's' }, { a: 's', b: 'c' }, { a: 's', b: 'd' }],
      scenarios: [
        { name: 'Normal request', intro: 'You open a post on xyz.com.', steps: [
          { title: 'The request goes out', text: 'Orange dot = a request. It travels from you to the server.', go: 'u>s', msg: 'GET /post/42' },
          { title: 'The server checks the cache', text: 'This post was not in the cache. This is called a <strong>cache miss</strong>.', go: 's>c', after: { c: { state: 'miss' } } },
          { title: 'The server gets it from the database', text: 'The database has the real data. Green dot = the answer coming back.', go: ['s>d', 'res:d>s'] },
          { title: 'The answer reaches you', text: 'The post is on your screen. Now run the "Database down" scenario.', go: 'res:s>u', msg: '200 OK: post #42' },
        ]},
        { name: 'Database down', intro: 'This time the database is down.', steps: [
          { title: 'The request goes out', text: 'Everything starts normally.', go: ['u>s', 's>c'], after: { c: { state: 'miss' } } },
          { title: 'The database does not answer', text: 'Red dot = failure. The box turned red: it is DOWN.', go: 'bad:s>d', after: { d: { state: 'down', sub: 'DOWN' } } },
          { title: 'You get an error', text: 'The server says the page cannot be built right now. Every lesson has failure scenarios like this. That is real system design: what happens when something breaks?', go: 'res:s>u', msg: '503 Service Unavailable' },
        ]},
      ],
    },
    { type: 'table', head: ['Box colour', 'What it is', 'Examples'], rows: [
      ['Indigo', 'User / client', 'Browser, mobile app'],
      ['Teal', 'Network helpers', 'DNS, CDN, WiFi'],
      ['Blue', 'Entry point for traffic', 'Load Balancer, API Gateway'],
      ['Grey', 'Application server', 'Server 1, Server 2'],
      ['Orange', 'Cache', 'Redis'],
      ['Violet', 'Database / storage', 'PostgreSQL, S3'],
      ['Pink', 'Queue / stream', 'Kafka, SQS'],
    ]},
    { type: 'table', head: ['Moving dot', 'Meaning'], rows: [
      ['Orange dot', 'A request is going out'],
      ['Green dot', 'A response is coming back'],
      ['Red dot', 'The request failed / a packet was lost'],
      ['Violet dot', 'An event (a Kafka/queue message)'],
    ]},

    { type: 'h2', text: 'The last diagram: the whole design at a glance' },
    { type: 'p', html: `Every lesson ends with a big diagram that shows the whole design at once. Numbers on the arrows show the order. The buttons at the top highlight one path, and <strong>Expand</strong> opens the diagram on the full screen. Here is a small example:` },
    { type: 'diagram', title: 'Example: a small design for xyz.com', height: 300,
      nodes: [
        { id: 'u', label: 'You', sub: 'browser', x: 100, y: 110, w: 130, kind: 'client', info: 'What it is: the user. The request starts here.' },
        { id: 's', label: 'Server', sub: 'xyz.com', x: 360, y: 110, w: 130, kind: 'server', info: 'What it is: the computer of xyz.com that does the work of the request.' },
        { id: 'c', label: 'Cache', sub: 'fast memory', x: 360, y: 240, w: 130, kind: 'cache', info: 'What it is: fast memory. The server looks here first.' },
        { id: 'd', label: 'Database', sub: 'permanent data', x: 620, y: 110, w: 130, kind: 'data', info: 'What it is: the permanent home of data. On a cache miss, we come here.' },
      ],
      edges: [
        { a: 'u', b: 's', n: 1, label: 'request' },
        { a: 's', b: 'c', n: 2, label: 'look here first' },
        { a: 's', b: 'd', n: 3, label: 'on a miss' },
      ],
      paths: [
        { name: 'Cache hit', text: 'Found in the cache: no need to go to the database. Fast.', go: ['u>s>c'] },
        { name: 'Cache miss', text: 'Not in the cache: the server gets it from the database. A little slower.', go: ['u>s>c', 's>d'] },
      ],
    },
    { type: 'p', html: `Below it there is always a <strong>Remember</strong> box: the 5-8 most important points of the lesson.` },

    { type: 'h2', text: 'Roadmap: System Design' },
    { type: 'p', html: `There are 8 phases. Phases 1 to 3 build vocabulary (words and building blocks), 4 to 7 build judgment (when to use what), and in phase 8 we open up real apps. Click any phase.` },
    { type: 'roadmap' },
    { type: 'h3', text: 'The second track: AI Agents' },
    { type: 'p', html: `Open the <strong>AI Agents</strong> tab at the top of the sidebar. It starts with the basics of LLMs, then the Transformer (with attention calculated by hand), the maths of LoRA and quantization, prompts and context engineering, RAG, and finally agents, harnesses and frameworks, with an interactive Harness playground.` },
    { type: 'roadmap', track: 'ai' },

    { type: 'h2', text: 'How to study each lesson' },
    { type: 'steps', items: [
      { t: 'In simple words and New word cards first', d: 'Do not move on until all three lines, "What it is / Why we need it / Without it", make sense.' },
      { t: 'Run the diagram', d: 'Pick a scenario, press "Next step", and watch the request pass through each box. Click any box to see its job explained.' },
      { t: 'Always try the failure scenarios', d: 'Server down, DNS down, cache down. This is what system design really is: what happens when something breaks.' },
      { t: 'Play with the widgets', d: 'Change a number and see what happens. The lesson text tells you which settings to try.' },
      { t: 'Stop at the "Think" questions', d: 'Think on your own before you open the answer, even if you get it wrong. That is where the learning happens.' },
      { t: 'Draw it on paper, then Mark as complete', d: 'After the lesson, draw the last diagram from memory. If you can explain it to a friend in 2 minutes, press "Mark as complete" at the bottom. Your progress bar in the sidebar will grow.' },
    ]},

    { type: 'h2', text: 'Other useful features' },
    { type: 'list', items: [
      '<strong>Search:</strong> type a topic in the search box at the top of the sidebar (cache, kafka, uber).',
      '<strong>Progress:</strong> lessons you mark as complete get a tick in the sidebar. This is remembered in your browser.',
      '<strong>Dark mode:</strong> the moon button in the header.',
      '<strong>Listen:</strong> every lesson has a Listen button that reads the text aloud. Handy while travelling.',
      '<strong>Save offline:</strong> press this button in the header. All ready lessons (both Hinglish and English) are saved on your phone and open even without internet.',
      '<strong>Like an app:</strong> on a phone, choose "Add to Home screen" from the browser menu and it opens like an app.',
    ]},
    { type: 'callout', tone: 'tip', title: 'How much each day?', html: `About one hour a day is enough. Read one lesson, draw the diagram on paper, take the quiz. Do not wait until you reach Phase 8 (real systems): start trying small designs from the middle of Phase 2.` },
    { type: 'p', html: `Now, the first lesson: <a href="#/what-is-system-design">What is system design?</a>` },
  ],
});
