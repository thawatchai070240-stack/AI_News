"""
build.py - AI News Hub site builder

Scans the working directory for files named `AI-news_<N>.html`,
extracts metadata, copies each file into `issues/issue-<NN>.html`
with a "back to home" top-bar injected, and writes the manifest at
`data/issues.json` consumed by the homepage (`index.html`).

Usage:
    python build.py

Re-run after dropping new AI-news_*.html files into this folder.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from html import unescape
from pathlib import Path

# Force UTF-8 on Windows consoles (cp874/cp1252) so Thai + arrows print cleanly.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, OSError):
    pass

ROOT = Path(__file__).resolve().parent
ISSUES_DIR = ROOT / "issues"
DATA_DIR = ROOT / "data"
SOURCE_PATTERN = re.compile(r"^AI-news_(\d+)\.html$", re.IGNORECASE)

# ---------- HTML parsing helpers (regex-based, no external deps) ----------

TAG_STRIP_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"\s+")


def strip_tags(html: str) -> str:
    """Strip HTML tags and collapse whitespace."""
    text = TAG_STRIP_RE.sub(" ", html)
    text = unescape(text)
    return WHITESPACE_RE.sub(" ", text).strip()


def find_first(pattern: str, html: str, flags: int = re.DOTALL | re.IGNORECASE) -> str:
    m = re.search(pattern, html, flags)
    return m.group(1).strip() if m else ""


def find_all(pattern: str, html: str, flags: int = re.DOTALL | re.IGNORECASE) -> list[str]:
    return [m.strip() for m in re.findall(pattern, html, flags)]


# ---------- Metadata extraction ----------

THAI_MONTHS = {
    "มกราคม": 1, "กุมภาพันธ์": 2, "มีนาคม": 3, "เมษายน": 4,
    "พฤษภาคม": 5, "มิถุนายน": 6, "กรกฎาคม": 7, "สิงหาคม": 8,
    "กันยายน": 9, "ตุลาคม": 10, "พฤศจิกายน": 11, "ธันวาคม": 12,
}


def parse_thai_date(text: str) -> str | None:
    """Convert 'D เดือน พ.ศ.' → ISO date 'YYYY-MM-DD' (Gregorian).

    Returns None if the text cannot be parsed.
    """
    m = re.search(r"(\d{1,2})\s+([\u0e00-\u0e7f]+)\s+(\d{4})", text)
    if not m:
        return None
    day, month_th, year_be = m.group(1), m.group(2), int(m.group(3))
    month = THAI_MONTHS.get(month_th)
    if not month:
        return None
    # พ.ศ. → ค.ศ. (subtract 543) — falls back gracefully if already CE
    year = year_be - 543 if year_be > 2400 else year_be
    try:
        return datetime(year, month, int(day)).date().isoformat()
    except ValueError:
        return None


def extract_metadata(source_path: Path, issue_num: int) -> dict:
    html = source_path.read_text(encoding="utf-8", errors="replace")

    title = strip_tags(find_first(r"<title>(.*?)</title>", html))

    # Masthead block — date + week info
    masthead = find_first(r'<div class="site-meta">(.*?)</div>', html)
    date_strong = strip_tags(find_first(r"<strong>(.*?)</strong>", masthead)) if masthead else ""
    masthead_text = strip_tags(re.sub(r"<strong>.*?</strong>", "", masthead, flags=re.DOTALL)) if masthead else ""

    week_match = re.search(r"สัปดาห์ที่\s*(\d+)", masthead_text)
    week_num = int(week_match.group(1)) if week_match else None

    headline_count_match = re.search(r"(\d+)\s*หัวข่าว", masthead_text)
    headline_count = int(headline_count_match.group(1)) if headline_count_match else None

    # Strip the "X หัวข่าว..." trailer so edition is clean
    edition_text = re.sub(r"\d+\s*หัวข่าว[^\s]*", "", masthead_text).strip()
    issue_label_match = re.search(r"(ฉบับ[^\n·]*?)(?:\s{2,}|\n|·|$)", edition_text)
    edition_label = issue_label_match.group(1).strip() if issue_label_match else ""

    tagline = strip_tags(find_first(r'<div class="site-tagline">(.*?)</div>', html))

    # Hero primary headline + excerpt
    hero_block = find_first(r'<article class="hero-primary"[^>]*>(.*?)</article>', html)
    hero_headline = strip_tags(find_first(r'<h[12][^>]*class="hl"[^>]*>(.*?)</h[12]>', hero_block))
    hero_excerpt = strip_tags(find_first(r'<p[^>]*class="dk"[^>]*>(.*?)</p>', hero_block))

    # Collect all top-level headlines (.hl) for search index
    all_headlines = [strip_tags(h) for h in find_all(r'class="hl"[^>]*>(.*?)</h[1-6]>', html)]
    all_headlines = [h for h in all_headlines if h]

    # Collect categories (nav data-filter)
    categories = []
    nav_block = find_first(r'<nav class="site-nav"[^>]*>(.*?)</nav>', html)
    if nav_block:
        for label, key in re.findall(r'data-filter="([^"]+)"[^>]*>(.*?)</a>', nav_block):
            categories.append({"key": label, "label": strip_tags(key)})

    iso_date = parse_thai_date(date_strong) or ""

    return {
        "id": issue_num,
        "slug": f"issue-{issue_num:02d}",
        "source_file": source_path.name,
        "output_file": f"issues/issue-{issue_num:02d}.html",
        "title": title,
        "tagline": tagline,
        "date_th": date_strong,
        "date_iso": iso_date,
        "week": week_num,
        "edition": edition_label,
        "headline_count": headline_count,
        "hero_headline": hero_headline,
        "hero_excerpt": hero_excerpt,
        "headlines": all_headlines[:12],
        "categories": categories,
    }


# ---------- Top-bar injection ----------

TOPBAR_HTML = """
<!-- AI News Hub: injected back-to-home bar -->
<style>
.aih-topbar{position:sticky;top:0;z-index:9999;background:#0f0f0e;color:#fff;
  border-bottom:3px solid #c8230e;font-family:'Sarabun','Noto Sans Thai',sans-serif;
  font-size:13px;display:flex;align-items:center;justify-content:space-between;
  padding:10px 24px;letter-spacing:.3px}
.aih-topbar a{color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:8px;
  font-weight:700;transition:color .15s}
.aih-topbar a:hover{color:#e8a020}
.aih-topbar .aih-meta{color:rgba(255,255,255,.5);font-size:12px}
.aih-topbar .aih-arrow{display:inline-block;transition:transform .15s}
.aih-topbar a:hover .aih-arrow{transform:translateX(-3px)}
@media(max-width:600px){.aih-topbar{padding:8px 14px;font-size:12px}.aih-topbar .aih-meta{display:none}}
</style>
<div class="aih-topbar">
  <a href="../index.html"><span class="aih-arrow">←</span> AI News Hub · กลับหน้าแรก</a>
  <span class="aih-meta">{meta}</span>
</div>
"""


def inject_topbar(html: str, meta: dict) -> str:
    """Inject the back-to-home bar right after <body>."""
    meta_text = f"ฉบับที่ {meta['id']:02d} · {meta['date_th']}".strip(" ·")
    bar = TOPBAR_HTML.replace("{meta}", meta_text)
    # Insert after first <body ...> tag
    return re.sub(r"(<body[^>]*>)", r"\1" + bar, html, count=1, flags=re.IGNORECASE)


# ---------- Main build pipeline ----------

def build() -> int:
    ISSUES_DIR.mkdir(exist_ok=True)
    DATA_DIR.mkdir(exist_ok=True)

    sources: list[tuple[int, Path]] = []
    for entry in ROOT.iterdir():
        if not entry.is_file():
            continue
        m = SOURCE_PATTERN.match(entry.name)
        if m:
            sources.append((int(m.group(1)), entry))

    if not sources:
        print("⚠  ไม่พบไฟล์ AI-news_*.html ในโฟลเดอร์นี้")
        return 0

    sources.sort(key=lambda t: t[0])

    manifest: list[dict] = []
    for issue_num, path in sources:
        print(f"→ processing {path.name} (issue {issue_num:02d})")
        meta = extract_metadata(path, issue_num)
        manifest.append(meta)

        # Copy with topbar injection
        html = path.read_text(encoding="utf-8", errors="replace")
        out_html = inject_topbar(html, meta)
        out_path = ISSUES_DIR / f"issue-{issue_num:02d}.html"
        out_path.write_text(out_html, encoding="utf-8")
        print(f"   ✓ wrote {out_path.relative_to(ROOT).as_posix()}")

    # Sort manifest newest first for the homepage
    manifest.sort(key=lambda m: (m.get("date_iso") or "", m["id"]), reverse=True)

    manifest_path = DATA_DIR / "issues.json"
    manifest_path.write_text(
        json.dumps(
            {
                "generated_at": datetime.now().isoformat(timespec="seconds"),
                "count": len(manifest),
                "issues": manifest,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"✓ manifest: {manifest_path.relative_to(ROOT).as_posix()} ({len(manifest)} issues)")

    # Also generate a simple RSS feed
    write_rss(manifest)
    return len(manifest)


def write_rss(manifest: list[dict]) -> None:
    items_xml = []
    for m in manifest:
        link = f"./{m['output_file']}"
        pub_date = ""
        if m.get("date_iso"):
            try:
                pub_date = datetime.fromisoformat(m["date_iso"]).strftime("%a, %d %b %Y 09:00:00 +0700")
            except ValueError:
                pub_date = ""
        items_xml.append(
            "<item>"
            f"<title>{escape_xml(m.get('hero_headline') or m.get('title') or m['slug'])}</title>"
            f"<link>{link}</link>"
            f"<guid isPermaLink=\"false\">{m['slug']}</guid>"
            f"<description>{escape_xml(m.get('hero_excerpt') or '')}</description>"
            + (f"<pubDate>{pub_date}</pubDate>" if pub_date else "")
            + "</item>"
        )
    rss = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0"><channel>'
        "<title>AI News Hub — สรุปข่าว AI รายสัปดาห์</title>"
        "<link>./index.html</link>"
        "<description>รวมข่าว AI และเทคโนโลยีรายสัปดาห์ ภาษาไทย</description>"
        "<language>th-TH</language>"
        + "".join(items_xml)
        + "</channel></rss>"
    )
    (ROOT / "rss.xml").write_text(rss, encoding="utf-8")
    print("✓ rss.xml")


def escape_xml(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


if __name__ == "__main__":
    n = build()
    print(f"\nDone. {n} issue(s) built. เปิด index.html เพื่อดูเว็บได้เลย")
