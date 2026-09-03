# Handoff — COSC2767 guide site (2026-09-03, session 2)

Read this first in a new session. Everything below is verified as of the last build.

## How the site works (30 seconds)

- Source pages live in `tools/local_pages/*.html` (edit these) plus a mirror of older pages in `tools/mirror/`.
- `python3 tools/build.py tools/mirror` (run from `docs/cosc2767-guide-v2`) regenerates `sub_pages/*.html`, `index.html`, search index, and syncs `css/` + `js/`. It self-checks parity (text, code blocks, images, links). All 18 pages pass.
- Serve with `python3 -m http.server 8765` from `docs/cosc2767-guide-v2` (JS uses ES modules, so `file://` will not work). Hard-refresh after a build (asset hashes change).
- Page registry (title, chip, stage, card blurb) is `LOCAL_PAGES` in `tools/build.py`. Sidebar groups come from the stage field; the Reference group is `"resources"`.
- Design system is `css/main.css`. Section 26 at the bottom ("Runbook layout") is the new step-rail system used by the manual-deploy page.
- Collapsible contract: `<h2|h3 class="collapsible-header [start-open]">…<span class="collapse-icon"></span></h2>` followed by `<div class="collapsible-content">`. The build wraps the body in `.collapse-glue`; keep exactly one child.
- Headless screenshots: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --screenshot=out.png --window-size=1300,4000 URL`. Hash URLs do not scroll in headless; make a temp copy with `start-open` added and delete it after. `sips -c H W --cropOffset Y X` (Y first).

## What was done this session

### `tools/local_pages/rmit-store-manual-deploy.html` (rewritten)
- Linear runbook: route stepper A–E, then per-plan `.plan-brief` (Goal / Where / Steps), `Part N` dividers, numbered `.step` cards with a machine badge (`laptop`, `AWS console`, `ec2`, `api-server`, `frontend-server`) and an action tag (`run`, `new file`, `edit file`, `click`, `check`), and a green "Done with X when" checklist.
- Part dividers are collapsible (`h3.collapsible-header.phase`); Part 1 starts open, later parts closed.
- `.two-up` boxes now stack vertically (side by side clipped commands).
- "Done when" list items are tickable; state is saved in localStorage (`cosc27-checklist-v1`) by `js/modules/checklist.js`, registered in `js/main.js`.
- Plan C renumbered: Elastic IP is now **C4** (right after launching EC2), old C4–C12 became C5–C13. All placeholders in Plan C use `<api-elastic-ip>` / `<frontend-elastic-ip>`. Old `#elastic-ip` anchor is gone.
- Content fixes: api-server-sg port 8000 = Anywhere (browser calls API directly); C11 re-seed uses `seed_demo --flush --demo-users` (plain re-seed skips existing products and uploads nothing to S3); A6 no longer claims seeding is idempotent; Plan D brief includes `sudo usermod -aG docker ec2-user` + re-login.

### `css/main.css`
- Appended section 26 (runbook layout). Fixes since: `.plan-brief > div` block layout, `.runbook .command-purpose` block (site-wide flex broke inline code), `.brief` single column, `.phase > span:not(.collapse-icon)` (chevron was being styled as the PART badge), `.done-list li.is-checked` tick styles, `.plan-brief__wide` full-width row.

### Live deployment help (user's AWS Learner Lab)
- api-server: `ec2-52-206-165-40.compute-1.amazonaws.com`, key `~/Downloads/devopsA2.pem`, repo at `~/a2/server`. Frontend at `http://100.63.250.86`. Bucket `rmit-store-media-rin` (us-east-1), IAM role LabRole works.
- Images fixed by `seed_demo --flush --demo-users`. Detached HEAD fixed via `git checkout -b rin/lab origin/rin/lab`. Docker permission fixed via docker group + `newgrp docker`.
- SSH from this machine to the EC2 box was denied by the permission prompt; the user runs server commands themselves.

## Session 2 (done, build passes 18/18)

- **C8 deploy-key copy**: replaced the cat-then-nano `.two-up` with three laptop-side moves: `scp` both key halves off the api-server, `ssh`+`scp` them onto the frontend-server with 700/600 perms, `rm` the local copies. Uses `<your-key>.pem` placeholder (page has no pem placeholder elsewhere). Step head now shows both `frontend-server` and `laptop` badges.
- **Reference split (Option 1)**: new stage `archive` ("Assignment 1 archive") in `STAGES`; `setup`, `challenge6`, `sshagent-debug` moved to it. Reference order is now Manual Deploy, Alerting, SSH Keys, Cheatsheet, Resources (this also changes prev/next pager order). `COLLAPSED_STAGES = {"archive"}` renders the group as `<details>` (closed unless it holds the active page); CSS in `css/main.css` after `.sidenav__list` (`.sidenav__group--collapsible`, `.sidenav__chevron`). `--stage-archive` grey added to both themes. Homepage reference shelf unchanged (all 8 cards still under one heading).
- **Light theme** screenshotted for the runbook layout: fine.

## Open items

- Homepage reference shelf could get an "Assignment 1 archive" sub-heading to match the sidebar. Not done.
- Option 2 (merge Debug Log into SSH Keys, Challenge 6 into Setup) still available if wanted.
