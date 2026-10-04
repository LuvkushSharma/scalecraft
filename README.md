# Scalecraft: system design and AI agents, made simple

An interactive system design course: from "I typed xyz.com" to designing Uber, Hotstar and ChatGPT.
Every lesson has animated request-flow diagrams you can step through, failure scenarios, "socho" questions and a quiz.

Pure HTML, CSS and JavaScript. No backend, no build step, no npm.

## Deploy on GitHub Pages (5 minutes)

1. Create a new public repository on GitHub, for example `system-design`.
2. Upload everything in this folder (keep the folder structure, including the empty `.nojekyll` file).
   - Easiest: on the repo page click **Add file → Upload files**, drag the whole folder contents in, commit.
   - Or with git:
     ```bash
     git init
     git add .
     git commit -m "Scalecraft"
     git branch -M main
     git remote add origin https://github.com/<your-username>/system-design.git
     git push -u origin main
     ```
3. In the repo go to **Settings → Pages**.
4. Under "Build and deployment", set **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**. Save.
5. Wait about a minute. Your site will be live at `https://<your-username>.github.io/system-design/`.

## Use it offline (on the way)

- Open the site once while online and press **Save offline** in the top bar. All ready lessons get stored on the device.
- On your phone, use the browser menu → **Add to Home screen**. It then opens like an app, even without internet.
- Every lesson has a **Listen** button that reads the lesson aloud using your phone's built-in voice.

## Run locally

Just open `index.html` in a browser. For offline mode testing, serve the folder instead:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Folder structure

```
index.html                 app shell
assets/css/style.css       all styles (light + dark)
assets/js/curriculum.js    the full roadmap: phases, groups, lessons, ready flags
assets/js/components.js    diagram engine, quiz, and every block type
assets/js/app.js           routing, sidebar, progress, offline, listen mode
content/lessons/*.js       one file per lesson
content/lessons/_template.js   copy this to start a new lesson
sw.js                      service worker for offline support
```

## Finishing the roadmap with Claude Code (parallel agents)

`CLAUDE.md` holds the style, accuracy and diagram rules; `docs/ROADMAP_TASKS.md` lists every remaining lesson
with what it must cover and where research should start. Open the repo in Claude Code and paste:

```
Read CLAUDE.md and docs/ROADMAP_TASKS.md. Write the next unchecked lessons for Phase 2 using parallel
subagents (2-4 lessons each, grouped by topic). Follow every rule in CLAUDE.md, especially research-first
for real systems. When all subagents finish, do the integration and verification steps from CLAUDE.md,
tick the finished lessons in ROADMAP_TASKS.md, and show me a summary.
```

Repeat phase by phase. Review a couple of lessons after each batch before moving on.

## Content accuracy policy

Real-system lessons (Uber, Hotstar, Paytm, ChatGPT, Google Maps and the rest) must be based on what the company itself has published:
engineering blogs, official docs, papers, and conference talks by its engineers. Secondary write-ups are used only when they summarise
such a primary source, and are labelled that way.

Every real-system lesson ends with a `{ type: 'sources', items: [...] }` block. Engineering posts age; if a source is old, the lesson says so in plain words.

## Adding a new lesson

1. Copy `content/lessons/_template.js` to `content/lessons/<lesson-id>.js`. The id must match the one in `curriculum.js`.
2. Write the content using the block types listed at the top of the template.
3. In `assets/js/curriculum.js`, change that lesson's last value from `0` to `1`.
4. Bump `CACHE` in `sw.js` (for example `ztu-v1` → `ztu-v2`) so phones pick up the new files, and use the same name in `app.js`.
5. Commit and push. GitHub Pages redeploys automatically.

## How the diagrams work

Diagrams are pure data. A lesson describes nodes (boxes), edges (arrows) and scenarios (lists of steps). Each step can:

- send a request packet along a path: `go: 'users>lb>s1'`
- send a response: `go: 'res:s1>lb>users'`
- lose a packet halfway: `go: 'lost:lb>s2'`
- flood many requests: `flood: { paths: ['users>lb>s1', 'users>lb>s2'], n: 12 }`
- change a box: `set: { s2: { state: 'down', sub: 'DOWN', load: 0 } }`
- reveal or hide boxes and arrows: `show: ['s3']`, `hide: ['direct']`

States: `down`, `hit`, `miss`, `hot`, `warn`, `ok`, `dim`. The full spec is in the comment at the top of `components.js`.

## Progress

Progress is saved in your browser (`localStorage`), per device. If you later want progress synced across phone and laptop, that is the point where a small backend (or something like Supabase/Firebase) becomes useful.
# scalecraft
