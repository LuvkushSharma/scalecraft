# Scalecraft: instructions for Claude Code

This repo is a static system design course website (no build step). Lessons are data files in
`content/lessons/<id>.js`. Your job when asked to "continue the roadmap" is to write the remaining
lessons listed in `docs/ROADMAP_TASKS.md`, at the same quality as the finished ones.

## Read these first (every agent, every time)

1. `content/lessons/_template.js`: every block type you can use.
2. Header comment of `assets/js/components.js`: full spec of the interactive `flow` diagram.
3. Two finished lessons as the quality bar: `content/lessons/caching.js` (concept lesson) and
   `content/lessons/url-shortener.js` (real-system lesson).

## Parallel workflow

- Split remaining lessons across subagents, 2 to 4 lessons each, grouped by phase so related
  lessons share context (for example: replication + sharding + consistent-hashing together).
- Each subagent writes only its own `content/lessons/<id>.js` files. Never edit shared files
  (`curriculum.js`, `components.js`, `app.js`, `style.css`) from a subagent.
- After all subagents finish, the main agent:
  1. runs `node --check` on every lesson file,
  2. flips each finished lesson's ready flag from `0` to `1` in `assets/js/curriculum.js`,
  3. bumps the cache name in `sw.js` and `assets/js/app.js` (`ztu-vN` → `ztu-vN+1`),
  4. serves the folder (`python3 -m http.server`) and opens every new lesson, clicking through
     every diagram scenario to confirm there are no console errors and no boxes overlap.

## Teaching style (non-negotiable)

- Language: simple conversational Hinglish. Technical terms stay in English (Server, Cache,
  Load Balancer, Sharding, Queue...). Explain every new term the first time it appears,
  using the `callout` block with `tone: 'term'`.
- Audience: a curious 12-year-old who knows basic programming. Never assume prior knowledge.
- Running example: the fictional site `xyz.com`. Do NOT use restaurant, pizza, food delivery,
  hotel or shopping-mall analogies. Prefer websites, apps, video platforms, chat, search.
  (Real-system lessons like Zomato/Swiggy are fine as case studies, just not as analogies.)
- Every component is introduced because a problem forced it:
  current architecture → new problem → why it fails → solution → updated architecture → trade-offs.
- Every lesson must include:
  - at least one interactive `flow` with a happy-path scenario AND at least one failure scenario,
  - every node with an `info` explanation,
  - `tradeoffs` (what we gain, what we pay),
  - `think` questions (2+) and a `quiz` (3+ questions with explanations),
  - a "common beginner confusion" callout (`tone: 'mistake'`) where relevant.
- Add a `custom` interactive widget (calculator, simulator, toggle) whenever a number or
  behaviour is easier to feel than to read: quorums, consistent hashing ring, rate-limit buckets,
  bloom filter false positives, napkin maths, etc. Widgets must be deterministic (seeded random),
  must work in light and dark mode (use CSS variables only), and must be verified: compute the
  outputs and confirm they match what the explanation text claims.
- Do not use green "confirmed" / orange "assumed" labels. Write confidently from good sources.

## Accuracy rules (most important)

- Concept lessons: be technically correct; if a claim depends on a specific product version
  or a number, double-check it with a web search.
- Real-system lessons (phase 8): RESEARCH FIRST, then write. Do not invent architecture.
  - Primary sources first: the company's own engineering blog, official documentation, papers,
    and conference talks by its engineers. Reputable summaries of those talks are acceptable
    as secondary sources.
  - Use at least 3 searches per real system, and fetch and read the actual posts, not just snippets.
  - Every component in a real-system diagram must come from the research, or be clearly
    described in the prose as the general industry approach (in plain words, not a label).
  - Engineering posts age. If a source is several years old, say so in the text.
  - End every real-system lesson with a `sources` block: title, publisher, url, and what was used.
- Copyright: never paste paragraphs from sources. Paraphrase in your own words. Short quotes only
  if essential, under 15 words, at most one per source.

## Diagram layout rules

- Canvas is 720 wide. Node `x, y` are the box centre. Keep every box fully inside 0..720 and 0..height.
- Leave at least 20 px between boxes. Check that no edge line crosses an unrelated box;
  move boxes or hide/show edges per scenario if needed.
- 4 to 7 nodes per diagram. If you need more, split into two diagrams with prose between them.
- Packet path syntax: `'a>b>c'`, prefixes `res:` (response), `bad:` (error), `evt:` (event),
  `lost:` (dropped halfway). See `components.js`.

## V2 rules (added after reader feedback)

- Plain language first: explain-before-use. The first time a component appears, give a `term` callout
  with "Ye kya hai / Kyun chahiye / Iske bina". Lessons open with a short 'Seedhi baat' callout.
- When a topic has several algorithms or variants, each one gets its own worked example and interactive.
- Every lesson ends with a `diagram` block (the whole design / whole mechanism, with path buttons),
  then a `recap` callout ('Yaad rakho'), then tradeoffs, think, quiz, sources.
- Images: only freely licensed ones (Wikimedia Commons etc.), stored in `assets/img/<id>/`, always with
  a `credit`. Never copy images from blogs or company posts; redraw the idea as a diagram instead.
- English twin: every lesson has `content/lessons/en/<id>.js`, a full translation into plain, simple
  English (same blocks, same widgets and numbers, no Hinglish words). The header toggle switches language;
  English titles live in `window.TITLES_EN` in `curriculum.js`.
