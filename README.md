# COSC2767 · Systems Deployment and Operations — Lab Guide (v2)

A redesigned version of the COSC2767 weekly lab guide site
(originally at `cosc2767-systems-deployment-and-opertations-guide.pages.dev`),
rebuilt with a new UI/UX while preserving **100% of the original content** —
every heading, paragraph, screenshot, code block, callout, and link.

## What's new in v2

- **Three-column docs layout** — sticky sidebar navigation grouped by course
  stage, content column tuned for reading, and an "On this page" rail with
  scrollspy highlighting.
- **Course-wide search** — press `⌘K` / `Ctrl+K` (or `/`) anywhere to search
  all 124 sections across every lab, grouped by week.
- **Progress tracking** — mark sections done; progress is stored in the
  browser (localStorage) and shows up in the TOC, the sidebar, and as
  progress rings on the homepage week cards.
- **Light + dark themes** — follows system preference, toggleable, persisted.
- **Terminal-style code blocks** — language labels, syntax highlighting
  (ported from the original site's dependency-free highlighter), and
  one-click copy buttons.
- **Screenshot lightbox** — click any screenshot to zoom; arrow keys navigate.
- **Typed callouts** — notes, tasks/questions, warnings, and checkpoints are
  color-coded automatically.
- **Collapsible sections** kept from the original, now animated, with
  expand/collapse-all controls, deep-link auto-open, and print support
  (printing expands everything; use the print button for a PDF).
- **Prev/next lab pagination**, reading-progress bar, mobile drawer
  navigation, keyboard-accessible everything.

## Structure

```
index.html              Homepage (roadmap, week cards with progress rings)
sub_pages/*.html        13 lab/reference pages
assets/                 All original images and tutorial screenshots (~100MB)
css/main.css            The entire design system
js/                     Module JS (self-detecting features, no build step)
data/search-index.json  Search index (generated)
tools/build.py          Regenerates pages from a mirror of the original site
tools/local_pages/      Locally-authored pages (not from the mirror)
```

No build step is needed to serve it — it's plain static HTML/CSS/JS.

## Run locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy

Upload the folder (minus `tools/`) to any static host. For Cloudflare Pages:
project root as the build output directory, no build command.

## Regenerating pages (`tools/build.py`)

The pages were generated from a mirror of the original site:

```bash
python3 tools/build.py <path-to-mirror>
```

The build carries the original `<main>` content over verbatim (the only
mutation is adding `callout--*` classes), wraps it in the new shell, and then
**verifies parity** — text, image sequence, code blocks, and external links
must match the original exactly or the build fails.

Pages listed in `LOCAL_PAGES` in `build.py` (e.g. the Practice Environment
Setup reference) are authored in `tools/local_pages/` using the same source
format as the mirror pages, and are parity-checked against their own source.
To edit one, change its file in `tools/local_pages/` and re-run the build —
never edit the generated copy in `sub_pages/`.
