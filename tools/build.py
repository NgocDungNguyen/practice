#!/usr/bin/env python3
"""
Build the redesigned COSC2767 guide from a mirror of the original site.

Content-preserving by construction: each sub-page's <main> markup is carried
over verbatim (the only mutations are adding `callout--*` modifier classes,
image width/height attributes, and a structural `.collapse-glue` wrapper div
inside each collapsible body), then re-wrapped in the new shell (topbar,
sidebar, TOC, hero, pager).
After writing every page the script re-parses its own output and asserts that
visible text, image sources, and code blocks match the original exactly.

Usage:  python3 tools/build.py <mirror-dir>
"""

import hashlib
import json
import re
import shutil
import struct
import subprocess
import sys
from pathlib import Path

from bs4 import BeautifulSoup

PROJECT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Course registry
# ---------------------------------------------------------------------------

STAGES = {
    "foundations": {"label": "Foundations", "weeks": "Weeks 1–3"},
    "delivery": {"label": "Delivery", "weeks": "Weeks 4–5"},
    "automation": {"label": "Automation", "weeks": "Weeks 6, 8–9"},
    "orchestration": {"label": "Operations", "weeks": "Weeks 10–11"},
    "resources": {"label": "Reference", "weeks": ""},
}

PAGES = [
    # key, file, stage, num chip, short nav label
    ("week-1", "week-1-tools-environment-setup-lab.html", "foundations", "01", "Tools & Environment Setup"),
    ("week-2", "week-2-linux-cli-lab.html", "foundations", "02", "Linux and CLI Commands"),
    ("week-3", "week-3-git-aws-lab.html", "foundations", "03", "Git and AWS"),
    ("week-4", "week-4-java-maven-tomcat-lab.html", "delivery", "04", "Java, Maven and Tomcat"),
    ("week-5", "week-5-jenkins-ci-cd-lab.html", "delivery", "05", "Jenkins for CI and CD"),
    ("week-6", "week-6-docker-lab.html", "automation", "06", "Docker"),
    ("week-8", "week-8-ansible-lab.html", "automation", "08", "Ansible"),
    ("week-9", "week-9-docker-compose-swarm-lab.html", "automation", "09", "Docker Compose and Swarm"),
    ("week-10", "week-10-kubernetes-lab.html", "orchestration", "10", "Kubernetes"),
    ("week-11", "week-11-eks-aws-lab.html", "orchestration", "11", "EKS on AWS"),
    ("cheatsheet", "devops-cheatsheet.html", "resources", "CS", "DevOps Cheatsheet"),
    ("resources", "useful-resources.html", "resources", "RX", "Useful Resources"),
    ("setup", "setup.html", "resources", "SU", "Practice Environment Setup"),
    ("challenge6", "challenge-6-setup-script.html", "resources", "C6", "Challenge 6 Setup Script"),
    ("sshagent-debug", "debug-jenkins-ssh-agent.html", "resources", "DL", "Debug Log: Jenkins SSH Agent"),
    ("sshkeys", "ssh-keys-github.html", "resources", "SK", "SSH Keys & GitHub Access"),
    ("rmit-manual-deploy", "rmit-store-manual-deploy.html", "resources", "A2", "RMIT Store: Manual Deploy (A–E)"),
]

PAGE_BY_KEY = {p[0]: p for p in PAGES}

# Pages authored locally in tools/local_pages/ rather than mirrored from the
# original site. They use the same source format as the mirror pages and go
# through the same shell wrap + parity self-check (verified against their own
# source), so the build transform stays guarded. `card` is the homepage
# reference-shelf blurb (mirror pages get theirs from the original homepage).
LOCAL_DIR = PROJECT / "tools" / "local_pages"
LOCAL_PAGES = {
    "setup": {
        "card": "Stand up Docker, Maven, Tomcat, and Jenkins from a blank "
                "machine, verify every layer, then reset to a clean slate "
                "and drill it again.",
    },
    "challenge6": {
        "card": "The Week 4 ultimate challenge, solved: one bash script from "
                "blank EC2 instance to a live webapp on port 80 — with the "
                "reasoning behind every step.",
    },
    "sshagent-debug": {
        "card": "A real debugging session, written up: the Jenkins SSH Agent "
                "wrapper failing on an empty config field — two disproven "
                "hypotheses, the root cause, and the habits worth keeping.",
    },
    "sshkeys": {
        "card": "Key-pair auth from mental model to muscle memory: GitHub "
                "over SSH, private repos with a PAT or SSH key in Jenkins, "
                "server-to-server keys, and the publickey checklist.",
    },
    "rmit-manual-deploy": {
        "card": "The Assignment 2 store, deployed by hand before any pipeline — "
                "following the repo README's own Plan A–E: run it locally, ship "
                "it to one EC2 box, split it across servers with S3 and RDS, "
                "containerise with Docker, then Docker Compose. Stops before "
                "Plan F, the automation pipeline.",
    },
}


def asset_version(rel_path: str) -> str:
    """Short content hash for cache-busting ?v= query strings — browsers
    heuristically cache css/js (python http.server sends Last-Modified),
    so style fixes were invisible until a hard refresh."""
    return hashlib.md5((PROJECT / rel_path).read_bytes()).hexdigest()[:10]


def source_dir(key: str, mirror: Path) -> Path:
    return LOCAL_DIR if key in LOCAL_PAGES else mirror / "sub_pages"

# ---------------------------------------------------------------------------
# Shared SVG icons
# ---------------------------------------------------------------------------

ICONS = {
    "menu": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    "search": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>',
    "sun": '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5 5l1.6 1.6M17.4 17.4L19 19M19 5l-1.6 1.6M6.6 17.4L5 19"/></svg>',
    "moon": '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.4 14.2A8.5 8.5 0 0 1 9.8 3.6a8.5 8.5 0 1 0 10.6 10.6Z"/></svg>',
    "print": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/></svg>',
    "check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    "sections": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h13"/></svg>',
    "images": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M21 15.5l-4.2-4.2L7 21"/></svg>',
    "code": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 7L4 12l4.5 5M15.5 7L20 12l-4.5 5"/></svg>',
    "clock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2.2"/></svg>',
}

FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800'
    '&family=Hanken+Grotesk:ital,wght@0,400..800;1,400..700'
    '&family=JetBrains+Mono:ital,wght@0,400..700;1,400&display=swap" rel="stylesheet">'
)

THEME_BOOT = (
    "<script>(function(){try{var t=localStorage.getItem('cosc27-theme');"
    "if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';"
    "document.documentElement.dataset.theme=t;}catch(e){}})();</script>"
)

# ---------------------------------------------------------------------------
# Callout classification (adds classes only — never changes content)
# ---------------------------------------------------------------------------

WARNING_WORDS = ("important", "warning", "security", "cost and cleanup", "caution")
TASK_WORDS = ("question", "task", "prediction", "reflection", "challenge", "bonus")


def callout_type(callout) -> str:
    strong = callout.find("strong")
    label = re.sub(r"\s+", " ", strong.get_text(" ", strip=True)).lower() if strong else ""
    if "checkpoint" in label:
        return "checkpoint"
    if any(w in label for w in WARNING_WORDS):
        return "warning"
    if any(w in label for w in TASK_WORDS):
        return "task"
    return "note"


def png_size(path: Path):
    try:
        with open(path, "rb") as f:
            head = f.read(26)
        if head[:8] != b"\x89PNG\r\n\x1a\n":
            return None
        return struct.unpack(">II", head[16:24])
    except OSError:
        return None


def set_image_dimensions(main, page_dir: Path) -> None:
    """Give every screenshot intrinsic width/height so lazy loading cannot
    shift the layout (stable reading position + reliable anchor scrolls)."""
    for img in main.find_all("img"):
        src = img.get("src", "")
        if not src or src.startswith(("http", "data:")) or img.get("width"):
            continue
        size = png_size((page_dir / src).resolve())
        if size:
            img["width"], img["height"] = str(size[0]), str(size[1])


def type_callouts(soup) -> None:
    for callout in soup.select(".callout"):
        classes = callout.get("class", [])
        if not any(c.startswith("callout--") for c in classes):
            classes.append(f"callout--{callout_type(callout)}")
            callout["class"] = classes


def wrap_collapsible_contents(soup, main) -> None:
    """The collapse animation (grid-template-rows 0fr → 1fr) only collapses
    the single explicit grid row. Any extra direct children of a
    .collapsible-content land in implicit `auto` rows that keep their height
    when closed, leaving blank reserved space (several original sections and
    all callout-bearing local sections have 2+ children). Guarantee exactly
    one child by wrapping each body's children in a .collapse-glue div —
    a structural shell mutation only; text/images/code/links are untouched."""
    for content in main.select(".collapsible-content"):
        glue = soup.new_tag("div")
        glue["class"] = "collapse-glue"
        for child in list(content.contents):
            glue.append(child.extract())
        content.append(glue)


# ---------------------------------------------------------------------------
# Extraction helpers
# ---------------------------------------------------------------------------

EMOJI_RE = re.compile(
    r"^([\U0001F000-\U0001FAFF℀-⯿〰〽️⃣‍]+)\s*(.*)$",
    re.S,
)


def split_emoji(text: str):
    match = EMOJI_RE.match(text.strip())
    if match and match.group(1):
        return match.group(1).strip(), match.group(2).strip()
    return None, text.strip()


def section_meta(soup):
    """[{id, emoji, title}] for every top-level section."""
    out = []
    for section in soup.select("main > section.cheatsheet-section"):
        header = section.find(["h2"], class_="collapsible-header")
        if not header or not section.get("id"):
            continue
        text = re.sub(r"\s+", " ", header.get_text(" ", strip=True))
        emoji, title = split_emoji(text)
        out.append({"id": section["id"], "emoji": emoji or "📄", "title": title})
    return out


def section_search_text(section) -> str:
    """Readable snippet + code first-lines for the search index."""
    clone = BeautifulSoup(str(section), "html.parser")
    code_lines = []
    for pre in clone.find_all("pre"):
        first = next((l.strip() for l in pre.get_text().splitlines() if l.strip()), "")
        if first:
            code_lines.append(first)
        pre.decompose()
    text = re.sub(r"\s+", " ", clone.get_text(" ", strip=True))
    snippet = text[:340]
    if code_lines:
        snippet += " ⌁ " + " · ".join(code_lines[:6])[:220]
    return snippet


def reading_minutes(soup, n_images: int, n_code: int) -> int:
    words = len(soup.get_text(" ", strip=True).split())
    return max(3, round(words / 170 + n_code * 0.25 + n_images * 0.05))


# ---------------------------------------------------------------------------
# Shell fragments
# ---------------------------------------------------------------------------


def head_html(title: str, description: str, root: str) -> str:
    desc = f'\n<meta name="description" content="{description}">' if description else ""
    css_v = asset_version("css/main.css")
    js_v = asset_version("js/main.js")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">{desc}
<title>{title}</title>
<link rel="icon" type="image/png" href="{root}assets/images/rmit-logo.png">
{FONTS}
<link rel="stylesheet" href="{root}css/main.css?v={css_v}">
{THEME_BOOT}
<script type="module" src="{root}js/main.js?v={js_v}"></script>
</head>"""


def topbar_html(root: str, crumb: str) -> str:
    return f"""<a class="skip-link" href="#main-content">Skip to content</a>
<div class="progress-rail" aria-hidden="true"><div class="progress-rail__fill"></div></div>
<header class="topbar">
<button class="tb-btn tb-btn--icon topbar__menu" type="button" data-action="toggle-sidebar" aria-expanded="false" aria-label="Toggle navigation">{ICONS['menu']}</button>
<a class="topbar__brand" href="{root}index.html">
<img src="{root}assets/images/rmit-logo.png" alt="RMIT University logo">
<span>Systems Deployment<br>and Operations</span>
<span class="topbar__course">COSC2767</span>
</a>
<div class="topbar__crumb">{crumb}</div>
<div class="topbar__actions">
<button class="tb-btn tb-btn--search" type="button" data-action="open-search" aria-label="Search the guides">{ICONS['search']}<span class="tb-search-label">Search labs…</span><kbd>⌘K</kbd></button>
<button class="tb-btn tb-btn--icon" type="button" data-action="print-page" aria-label="Print or save as PDF" title="Print / save as PDF">{ICONS['print']}</button>
<button class="tb-btn tb-btn--icon tb-btn--theme" type="button" data-action="toggle-theme" aria-label="Toggle dark mode">{ICONS['sun']}{ICONS['moon']}</button>
</div>
</header>"""


def sidebar_html(root: str, active_key: str, totals: dict) -> str:
    groups = []
    for stage_key, stage in STAGES.items():
        items = [p for p in PAGES if p[2] == stage_key]
        if not items:
            continue
        lis = []
        for key, filename, _stage, num, label in items:
            active = ' sidenav__link--active" aria-current="page' if key == active_key else ""
            lis.append(
                f'<li><a class="sidenav__link{active}" href="{root}sub_pages/{filename}" '
                f'data-page-key="{key}" data-sections="{totals.get(key, 0)}">'
                f'<span class="sidenav__num">{num}</span><span>{label}</span>'
                f'<span class="sidenav__done">{ICONS["check"]}</span></a></li>'
            )
        weeks = f"<small>{stage['weeks']}</small>" if stage["weeks"] else ""
        groups.append(
            f'<div class="sidenav__group" style="--group-accent: var(--stage-{stage_key}, var(--rmit-red))">'
            f'<div class="sidenav__stage-label">{stage["label"]}{weeks}</div>'
            f'<ul class="sidenav__list">{"".join(lis)}</ul></div>'
        )
    return (
        f'<div class="sidebar__overlay"></div>'
        f'<nav class="sidebar" id="site-nav" aria-label="Course navigation">{"".join(groups)}</nav>'
    )


def toc_html(sections, page_title: str) -> str:
    if not sections:
        return '<aside class="toc" aria-label="On this page"></aside>'
    items = "".join(
        f'<li class="toc__item" data-toc-id="{s["id"]}">'
        f'<a class="toc__link" href="#{s["id"]}"><span>{s["title"]}</span>'
        f'<span class="toc__check">{ICONS["check"]}</span></a></li>'
        for s in sections
    )
    return f"""<aside class="toc" aria-label="On this page">
<p class="toc__title">On this page</p>
<div class="toc__tools">
<button class="toc__tool" type="button" data-action="expand-all">Expand all</button>
<button class="toc__tool" type="button" data-action="collapse-all">Collapse all</button>
</div>
<ul class="toc__list">{items}</ul>
<div class="toc__progress">
<span data-progress-label>0 of {len(sections)} sections done</span>
<div class="toc__progress-bar"><div class="toc__progress-fill"></div></div>
</div>
</aside>"""


def pager_html(key: str, root: str) -> str:
    order = [p[0] for p in PAGES]
    i = order.index(key)
    parts = []
    if i > 0:
        k, filename, stage, num, label = PAGE_BY_KEY[order[i - 1]]
        parts.append(
            f'<a class="pager__link pager__link--prev" style="--pager-accent: var(--stage-{stage})" href="{root}sub_pages/{filename}">'
            f'<span class="pager__dir">← Previous</span><span class="pager__title">{label}</span></a>'
        )
    if i < len(order) - 1:
        k, filename, stage, num, label = PAGE_BY_KEY[order[i + 1]]
        parts.append(
            f'<a class="pager__link pager__link--next" style="--pager-accent: var(--stage-{stage})" href="{root}sub_pages/{filename}">'
            f'<span class="pager__dir">Next →</span><span class="pager__title">{label}</span></a>'
        )
    return f'<nav class="pager" aria-label="Adjacent labs">{"".join(parts)}</nav>'


FOOTER = (
    '<footer class="site-footer"><p>© Created by Tom Huynh with love ❤️ · '
    'COSC2767 Systems Deployment and Operations · RMIT University</p></footer>'
)


# ---------------------------------------------------------------------------
# Sub-page build
# ---------------------------------------------------------------------------


def build_subpage(mirror: Path, key: str, totals: dict, search_entries: list) -> None:
    _, filename, stage, num, label = PAGE_BY_KEY[key]
    source = source_dir(key, mirror) / filename
    soup = BeautifulSoup(source.read_text(), "html.parser")

    title_tag = re.sub(r"\s+", " ", soup.title.get_text(strip=True))
    description = ""
    meta = soup.find("meta", attrs={"name": "description"})
    if meta:
        description = meta.get("content", "")

    h1 = soup.find("h1")
    h1_text = re.sub(r"\s+", " ", h1.get_text(" ", strip=True)) if h1 else label
    h1_text = re.sub(r"\s*Lab Guide$", "", h1_text)
    emoji, bare_title = split_emoji(h1_text)
    display_title = re.sub(r"^Week \d+:\s*", "", bare_title)

    intro = soup.select_one("header p.intro")
    intro_html = intro.decode_contents().strip() if intro else ""

    main = soup.find("main")
    type_callouts(main)
    set_image_dimensions(main, PROJECT / "sub_pages")
    wrap_collapsible_contents(soup, main)

    sections = section_meta(soup)
    n_images = len(main.find_all("img"))
    n_code = len(main.find_all("pre"))
    minutes = reading_minutes(main, n_images, n_code)

    # search entries
    page_title_short = f"Week {int(num)} · {label}" if num.isdigit() else label
    for section in main.select("section.cheatsheet-section"):
        if not section.get("id"):
            continue
        header = section.find("h2", class_="collapsible-header")
        text = re.sub(r"\s+", " ", header.get_text(" ", strip=True)) if header else ""
        s_emoji, s_title = split_emoji(text)
        search_entries.append({
            "page": f"sub_pages/{filename}",
            "pageTitle": page_title_short,
            "stage": stage,
            "section": section["id"],
            "emoji": s_emoji or emoji or "📄",
            "title": s_title or label,
            "text": section_search_text(section),
        })

    root = "../"
    week_chip = f"Week {num}" if num.isdigit() else STAGES[stage]["label"]
    stage_label = STAGES[stage]["label"]
    kind = "Lab guide" if num.isdigit() else "Reference"

    crumb = (
        f'<span>{stage_label}</span><span class="crumb-sep">/</span>'
        f'<span>{week_chip if num.isdigit() else label}</span>'
    )

    hero_meta = [
        f'<span>{ICONS["sections"]}<strong>{len(sections)}</strong>&nbsp;sections</span>',
    ]
    if n_images:
        hero_meta.append(f'<span>{ICONS["images"]}<strong>{n_images}</strong>&nbsp;screenshots</span>')
    if n_code:
        hero_meta.append(f'<span>{ICONS["code"]}<strong>{n_code}</strong>&nbsp;code blocks</span>')
    hero_meta.append(f'<span>{ICONS["clock"]}~<strong>{minutes}</strong>&nbsp;min</span>')

    chips = []
    for chip_text in (week_chip, stage_label, kind):
        if chip_text not in chips:
            chips.append(chip_text)
    chips_html = f'<span class="chip chip--stage">{chips[0]}</span>' + "".join(
        f'<span class="chip">{c}</span>' for c in chips[1:]
    )

    hero = f"""<div class="page-hero">
<div class="page-hero__tags">
{chips_html}
</div>
<h1>{f'<span class="hero-emoji" aria-hidden="true">{emoji}</span>' if emoji else ''}{display_title}</h1>
<p class="page-hero__intro">{intro_html}</p>
<div class="page-hero__meta">{''.join(hero_meta)}</div>
</div>"""

    main_inner = main.decode_contents()

    page = f"""{head_html(title_tag, description, root)}
<body data-page="{key}" data-stage="{stage}" data-root="{root}" style="--stage-accent: var(--stage-{stage})">
{topbar_html(root, crumb)}
<div class="layout">
{sidebar_html(root, key, totals)}
<main class="content" id="main-content">
{hero}
{main_inner}
{pager_html(key, root)}
</main>
{toc_html(sections, label)}
</div>
{FOOTER}
</body>
</html>
"""
    out = PROJECT / "sub_pages" / filename
    out.write_text(page)
    verify_page(source, out, filename)


# ---------------------------------------------------------------------------
# Parity self-check
# ---------------------------------------------------------------------------


def content_signature(path: Path):
    soup = BeautifulSoup(path.read_text(), "html.parser")
    main = soup.find("main")
    # hero + pager are new shell elements; exclude them from the comparison
    for extra in main.select(".page-hero, .pager"):
        extra.decompose()
    text = re.sub(r"\s+", " ", main.get_text(" ", strip=True))
    images = [img.get("src", "").split("/")[-1] for img in main.find_all("img")]
    code = [re.sub(r"\s+", " ", pre.get_text(strip=True)) for pre in main.find_all("pre")]
    links = [a.get("href", "") for a in main.find_all("a") if a.get("href", "").startswith("http")]
    return text, images, code, links


def verify_page(original: Path, rebuilt: Path, name: str) -> None:
    o_text, o_imgs, o_code, o_links = content_signature(original)
    n_text, n_imgs, n_code, n_links = content_signature(rebuilt)
    problems = []
    if o_imgs != n_imgs:
        problems.append(f"images {len(o_imgs)} → {len(n_imgs)}")
    if o_code != n_code:
        problems.append(f"code blocks {len(o_code)} → {len(n_code)}")
    if o_links != n_links:
        problems.append(f"external links {len(o_links)} → {len(n_links)}")
    if o_text != n_text:
        # locate first divergence for the error message
        i = next((k for k in range(min(len(o_text), len(n_text))) if o_text[k] != n_text[k]), min(len(o_text), len(n_text)))
        problems.append(f"text diverges at char {i}: …{o_text[max(0,i-40):i+40]!r} vs …{n_text[max(0,i-40):i+40]!r}")
    if problems:
        raise SystemExit(f"PARITY FAILURE in {name}: " + "; ".join(problems))
    print(f"  ✓ parity ok: {name} ({len(o_imgs)} imgs, {len(o_code)} code blocks, {len(o_text):,} text chars)")


# ---------------------------------------------------------------------------
# Homepage build
# ---------------------------------------------------------------------------


def build_home(mirror: Path, totals: dict) -> None:
    original = BeautifulSoup((mirror / "index.html").read_text(), "html.parser")

    description = original.find("meta", attrs={"name": "description"}).get("content", "")
    intro = original.select_one("header p.intro")
    intro_text = intro.decode_contents().strip() if intro else ""
    # Split the coordinator line off the intro (separated by <br><br> originally)
    parts = re.split(r"(?:<br\s*/?>\s*){2,}", intro_text)
    intro_main = parts[0].strip()
    coordinator = parts[1].strip() if len(parts) > 1 else ""

    # Roadmap stages, verbatim from the original homepage
    stages_html = []
    for li in original.select(".learning-roadmap__list > li"):
        stage_key = next(
            (c.split("--")[1] for c in li.get("class", []) if "--" in c), "foundations"
        )
        marker = li.select_one(".learning-roadmap__marker").get_text(strip=True)
        meta_spans = [s.get_text(strip=True) for s in li.select(".learning-roadmap__meta span")]
        h3 = li.find("h3").decode_contents().strip()
        p = li.find("p").decode_contents().strip()
        outcomes = "".join(f"<li>{o.decode_contents().strip()}</li>" for o in li.select(".learning-roadmap__outcomes li"))
        stages_html.append(f"""<li class="roadmap__stage" data-stage="{stage_key}">
<span class="roadmap__marker">{marker}</span>
<div class="roadmap__meta"><span>{meta_spans[0]}</span><span>{meta_spans[1]}</span></div>
<h3>{h3}</h3>
<p>{p}</p>
<ul class="roadmap__outcomes">{outcomes}</ul>
</li>""")

    # Week + resource cards, text verbatim from the original homepage.
    # Cards are either <a class="card"> links or plain <div class="card">
    # placeholders (e.g. Week 7: Personal Development Week) — keep both.
    cards_html = []
    resource_cards_html = []
    for a in original.select(".grid-container--home > .card"):
        h3 = a.find("h3").decode_contents().strip()
        p = a.find("p").decode_contents().strip()

        if a.name != "a":
            # Placeholder card with no lab page (kept verbatim, no link)
            week_match = re.match(r"Week (\d+):\s*(.*)", h3)
            num = week_match.group(1).zfill(2) if week_match else ""
            title = week_match.group(2) if week_match else h3
            availability = a.select_one(".availability-label")
            availability_text = availability.get_text(strip=True) if availability else ""
            cards_html.append(f"""<div class="week-card week-card--locked">
<span class="week-card__top"><span class="week-card__num">WK {num}</span><span class="week-card__emoji" aria-hidden="true">🌱</span></span>
<h3>{title}</h3>
<p>{p}</p>
<span class="go-to-link go-to-link--static">{availability_text}</span>
</div>""")
            continue

        href = a.get("href", "")
        filename = href.split("/")[-1]
        entry = next((p2 for p2 in PAGES if p2[1] == filename), None)
        if not entry:
            continue
        key, _f, stage, num, label = entry
        page_soup_emoji = PAGE_EMOJI.get(key, "📘")
        total = totals.get(key, 0)
        if num.isdigit():
            ring = f"""<span class="week-card__ring" data-page-key="{key}" data-sections="{total}" role="img" aria-label="progress">
<svg width="30" height="30" viewBox="0 0 30 30"><circle class="ring-track" cx="15" cy="15" r="12"/><circle class="ring-fill" cx="15" cy="15" r="12" stroke-dasharray="75.4" stroke-dashoffset="75.4"/><path class="ring-done-tick" d="M10.2 15.4l3.2 3.2 6.4-6.8-1.5-1.4-4.9 5.2-1.8-1.7z"/></svg>
</span>"""
            top = (
                f'<span class="week-card__num">WK {num}</span>'
                f'<span class="week-card__emoji" aria-hidden="true">{page_soup_emoji}</span>{ring}'
            )
            title = re.sub(r"^Week \d+:\s*", "", h3)
            cards_html.append(f"""<a class="week-card" data-stage="{stage}" href="{href}">
<span class="week-card__top">{top}</span>
<h3>{title}</h3>
<p>{p}</p>
<span class="go-to-link">Open lab guide</span>
</a>""")
        else:
            resource_cards_html.append(f"""<a class="week-card" data-stage="resources" href="{href}">
<span class="week-card__top"><span class="week-card__num">{num}</span><span class="week-card__emoji" aria-hidden="true">{page_soup_emoji}</span></span>
<h3>{h3}</h3>
<p>{p}</p>
<span class="go-to-link">Open reference</span>
</a>""")

    # Locally-authored reference pages have no card on the original homepage —
    # generate theirs from the registry blurb instead.
    for key, local_meta in LOCAL_PAGES.items():
        _k, filename, _stage, num, label = PAGE_BY_KEY[key]
        resource_cards_html.append(f"""<a class="week-card" data-stage="resources" href="sub_pages/{filename}">
<span class="week-card__top"><span class="week-card__num">{num}</span><span class="week-card__emoji" aria-hidden="true">{PAGE_EMOJI.get(key, "📘")}</span></span>
<h3>{label}</h3>
<p>{local_meta["card"]}</p>
<span class="go-to-link">Open reference</span>
</a>""")

    home = f"""{head_html("COSC2767 - Systems Deployment and Operations", description, "")}
<body data-page="home" data-root="">
{topbar_html("", "<span>Course home</span>")}
<section class="home-hero">
<div class="container">
<div class="home-hero__uni"><img src="assets/images/rmit-logo.png" alt="RMIT University logo"><span>RMIT University</span></div>
<p class="home-hero__kicker">Deployment · Automation · Cloud Operations</p>
<h1><span class="h1-course-code">COSC2767</span>Systems Deployment <br>and Operations</h1>
<p class="home-hero__intro">{intro_main}</p>
<p class="home-hero__coordinator">👨‍🏫 {coordinator}</p>
<div class="home-hero__actions">
<a class="btn-primary" href="sub_pages/week-1-tools-environment-setup-lab.html">Start with Week 1 →</a>
<button class="btn-ghost" type="button" data-action="open-search">{ICONS['search']} Search the guides <kbd>⌘K</kbd></button>
</div>
</div>
</section>
<main class="container" id="main-content">
<section class="home-section" aria-labelledby="learning-path-title">
<p class="home-section__eyebrow">Course roadmap</p>
<h2 class="home-section__title" id="learning-path-title">Your learning path</h2>
<p class="home-section__intro">Each stage builds on the last: establish dependable Linux foundations, automate application delivery, package and coordinate services, then operate them on Kubernetes in AWS.</p>
<ol class="roadmap">{''.join(stages_html)}</ol>
</section>
<section class="home-section" aria-labelledby="weekly-labs-title">
<p class="home-section__eyebrow">Weekly tutorial labs</p>
<h2 class="home-section__title" id="weekly-labs-title">Lab guides, week by week</h2>
<p class="home-section__intro">Your progress is saved in this browser as you mark sections done — the rings show how far along each lab you are.</p>
<div class="week-grid">{''.join(cards_html)}</div>
</section>
<section class="home-section" aria-labelledby="resources-title">
<p class="home-section__eyebrow">Reference shelf</p>
<h2 class="home-section__title" id="resources-title">Course reference library</h2>
<div class="week-grid">{''.join(resource_cards_html)}</div>
</section>
</main>
{FOOTER}
</body>
</html>
"""
    (PROJECT / "index.html").write_text(home)
    print("  ✓ homepage built")


PAGE_EMOJI = {}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: build.py <mirror-dir>")
    mirror = Path(sys.argv[1])

    # Pass 1: gather section totals + page emojis (needed by every sidebar)
    totals = {}
    for key, filename, *_ in PAGES:
        soup = BeautifulSoup((source_dir(key, mirror) / filename).read_text(), "html.parser")
        totals[key] = len(section_meta(soup))
        h1 = soup.find("h1")
        emoji, _ = split_emoji(re.sub(r"\s+", " ", h1.get_text(" ", strip=True)))
        PAGE_EMOJI[key] = emoji or "📘"
    PAGE_EMOJI["cheatsheet"] = PAGE_EMOJI.get("cheatsheet") or "📋"
    PAGE_EMOJI["resources"] = PAGE_EMOJI.get("resources") or "🔗"

    # Pass 2: build pages + search index
    search_entries = []
    print("Building sub-pages:")
    for key, *_ in PAGES:
        build_subpage(mirror, key, totals, search_entries)

    (PROJECT / "data").mkdir(exist_ok=True)
    (PROJECT / "data" / "search-index.json").write_text(
        json.dumps(search_entries, ensure_ascii=False)
    )
    print(f"  ✓ search index: {len(search_entries)} entries")

    build_home(mirror, totals)

    # Assets: copy the complete mirrored asset tree
    target = PROJECT / "assets"
    if not target.exists():
        shutil.copytree(mirror / "assets", target)
        print("  ✓ assets copied")
    else:
        subprocess.run(["rsync", "-a", str(mirror / "assets") + "/", str(target) + "/"], check=True)
        print("  ✓ assets synced")

    print("Done.")


if __name__ == "__main__":
    main()
