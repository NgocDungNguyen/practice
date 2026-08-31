#!/usr/bin/env python3
"""Mirror the COSC2767 guide site: all HTML pages + every referenced asset."""
import os
import re
import sys
import urllib.parse
import urllib.request
from collections import deque

BASE = "https://cosc2767-systems-deployment-and-opertations-guide.pages.dev/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mirror")

HREF_RE = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.I)
SRCSET_RE = re.compile(r'srcset\s*=\s*["\']([^"\']+)["\']', re.I)
CSS_URL_RE = re.compile(r'url\(\s*["\']?([^"\')]+)["\']?\s*\)', re.I)
CSS_IMPORT_RE = re.compile(r'@import\s+["\']([^"\']+)["\']', re.I)

seen = set()
queue = deque([BASE])
errors = []
downloaded = []


def norm(url, base):
    u = urllib.parse.urljoin(base, url)
    u = urllib.parse.urldefrag(u)[0]
    return u


def local_path(url):
    p = urllib.parse.urlparse(url).path
    if p.endswith("/") or p == "":
        p = p + "index.html"
    return os.path.join(OUT, p.lstrip("/"))


def fetch(url):
    import subprocess
    body = subprocess.run(["curl", "-sL", "--fail", url], capture_output=True, timeout=60)
    if body.returncode != 0:
        raise RuntimeError(f"curl exit {body.returncode}")
    head = subprocess.run(["curl", "-sLI", url], capture_output=True, timeout=60)
    ctype = ""
    for line in head.stdout.decode("utf-8", "replace").splitlines():
        if line.lower().startswith("content-type:"):
            ctype = line.split(":", 1)[1].strip()
    return body.stdout, ctype


while queue:
    url = queue.popleft()
    if url in seen:
        continue
    seen.add(url)
    if not url.startswith(BASE):
        continue
    try:
        data, ctype = fetch(url)
    except Exception as e:
        errors.append(f"{url}: {e}")
        continue
    path = local_path(url)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    downloaded.append((url, len(data)))

    refs = []
    if "html" in ctype or path.endswith(".html"):
        text = data.decode("utf-8", "replace")
        refs += HREF_RE.findall(text)
        for ss in SRCSET_RE.findall(text):
            refs += [part.strip().split()[0] for part in ss.split(",") if part.strip()]
        refs += CSS_URL_RE.findall(text)  # inline styles
    elif path.endswith(".css") or "css" in ctype:
        text = data.decode("utf-8", "replace")
        refs += CSS_URL_RE.findall(text)
        refs += CSS_IMPORT_RE.findall(text)
    elif path.endswith(".js") or "javascript" in ctype:
        text = data.decode("utf-8", "replace")
        # catch static string paths to local resources in JS (imports, fetches)
        refs += re.findall(r'["\']([\w./-]+\.(?:html|css|js|json|png|jpe?g|gif|svg|webp|ico|woff2?))["\']', text)

    for r in refs:
        if r.startswith(("data:", "mailto:", "javascript:", "#", "tel:")):
            continue
        try:
            u = norm(r, url)
        except ValueError:
            continue
        if u.startswith(BASE) and u not in seen:
            queue.append(u)

print(f"Downloaded {len(downloaded)} files")
total = sum(s for _, s in downloaded)
print(f"Total bytes: {total:,}")
for u, s in sorted(downloaded):
    print(f"  {s:>10,}  {u[len(BASE):] or '(home)'}")
if errors:
    print("\nERRORS:")
    for e in errors:
        print("  " + e)
