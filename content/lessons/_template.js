/*
  LESSON TEMPLATE
  1. Copy this file to content/lessons/<your-id>.js
  2. Set id below to the same <your-id>
  3. In assets/js/curriculum.js, find the lesson and change its last value from 0 to 1
  4. Refresh. Done.

  Block types you can use:
    { type: 'h2', text }                      section heading (also appears in "On this page")
    { type: 'h3', text }
    { type: 'p', html }
    { type: 'callout', tone, title?, html }   tone: why | warn | tip | term | analogy | mistake
    { type: 'ascii', text, caption? }
    { type: 'code', text }
    { type: 'list', items: [html], ordered? }
    { type: 'steps', items: [{ t, d }] }      numbered sequence
    { type: 'table', head: [], rows: [[]], caption? }
    { type: 'compare', left: { title, ascii?, html? }, right: { ... } }
    { type: 'tradeoffs', gains: [], costs: [] }
    { type: 'flow', ... }                     interactive diagram, see components.js header for full spec
    { type: 'think', questions: [{ q, a }] }  reveal-answer questions
    { type: 'quiz', questions: [{ q, options: [], answer: index, explain }] }
    { type: 'custom', render(el) { ... } }    any calculator / widget you want
    { type: 'diagram', title?, height, groups?, nodes, edges, paths?, caption? }
                                              big static "whole design" picture (up to ~16 boxes), with
                                              numbered edges and buttons that highlight one path. Spec in
                                              the Diagram header in components.js. Every lesson ends with one.
    { type: 'image', src: 'assets/img/<lesson-id>/<file>', alt, caption, maxWidth?, credit: { text, url, license } }
                                              only freely licensed images (Wikimedia Commons etc.), always credited
    callout tone 'recap'                      "Yaad rakho": 5-7 key points, placed right after the summary diagram
    { type: 'sources', note?, items: [{ title, publisher, url, year?, official?, used }] }

  RULE for real-company lessons: research first (company engineering blog, official docs, papers,
  talks by its engineers), then write. Never invent components. List sources at the end.
*/
Lesson.register({
  id: 'your-id',
  title: 'Lesson title',
  minutes: 10,
  summary: `Ek do line mein: ye lesson kya problem solve karta hai.`,
  blocks: [
    { type: 'h2', text: 'Problem' },
    { type: 'p', html: `Current architecture mein kya toota?` },

    { type: 'h2', text: 'Solution' },
    { type: 'flow', height: 260,
      nodes: [
        { id: 'u', label: 'User', x: 110, y: 130, w: 130, kind: 'client', info: 'Explain on click.' },
        { id: 's', label: 'Server', x: 360, y: 130, w: 130, kind: 'server', meter: true, load: 20, info: '...' },
        { id: 'd', label: 'Database', x: 610, y: 130, w: 130, kind: 'data', info: '...' },
      ],
      edges: [{ a: 'u', b: 's' }, { a: 's', b: 'd' }],
      scenarios: [
        { name: 'Happy path', steps: [
          { title: 'Request', text: 'User request bhejta hai.', go: 'u>s>d', msg: 'GET /something' },
          { title: 'Response', text: 'Data wapas.', go: 'res:d>s>u' },
        ]},
        { name: 'Failure', steps: [
          { title: 'DB down', text: '...', go: 'u>s>d', after: { d: { state: 'down', sub: 'DOWN' } } },
        ]},
      ],
    },

    { type: 'tradeoffs', gains: ['...'], costs: ['...'] },
    { type: 'think', questions: [{ q: '...', a: '...' }] },
    { type: 'quiz', questions: [{ q: '...', options: ['A', 'B'], answer: 0, explain: '...' }] },
    { type: 'sources', items: [{ title: '...', publisher: 'Company engineering blog', official: true, url: 'https://...', used: 'What this source confirmed' }] },
  ],
});
