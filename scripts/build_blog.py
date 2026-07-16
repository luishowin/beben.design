#!/usr/bin/env python3
"""Blog generator for beben.design.

Reads markdown posts from content/blog/, renders real static HTML into
docs/blog/ using the templates in scripts/templates/, and refreshes the
blog block of docs/sitemap.xml plus docs/blog/feed.xml.

Usage:
    py scripts/build_blog.py

Dependency (one):
    py -m pip install markdown

Post format: content/blog/YYYY-MM-DD-slug.md with front matter between
--- fences. Keys: title, description, date (required); author, tags,
hero_image, hero_alt, featured, pinned, draft (optional).
The output is committed to git like any other page. Nav or footer
changes on the site must be mirrored in scripts/templates/, then rebuilt.
"""

import html
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import markdown
except ImportError:
    sys.exit("The 'markdown' package is missing. Install it with:  py -m pip install markdown")

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content" / "blog"
TEMPLATES = ROOT / "scripts" / "templates"
DOCS = ROOT / "docs"
BLOG_OUT = DOCS / "blog"
SITEMAP = DOCS / "sitemap.xml"

SITE = "https://beben.design"
FEED_DESCRIPTION = ("Essays and build logs from Beben Design: design decisions, "
                    "engineering trade-offs, and tools we shipped, written from inside real projects.")
WORDS_PER_MINUTE = 200
MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]

warnings = []


def warn(msg):
    warnings.append(msg)
    print("  WARNING: " + msg)


def esc(text):
    return html.escape(str(text), quote=True)


def parse_front_matter(raw, path):
    m = re.match(r"\A---\s*\n(.*?)\n---\s*\n(.*)\Z", raw, re.DOTALL)
    if not m:
        sys.exit(f"{path.name}: missing front matter (--- fences at the top).")
    meta = {}
    for line in m.group(1).splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            sys.exit(f"{path.name}: front matter line without a colon: {line!r}")
        key, _, value = line.partition(":")
        meta[key.strip().lower()] = value.strip()
    return meta, m.group(2).strip()


def as_bool(value):
    return str(value).strip().lower() in ("true", "yes", "1")


def human_date(d):
    return f"{MONTHS[d.month - 1]} {d.day}, {d.year}"


def short_date(d):
    return f"{MONTHS[d.month - 1][:3]} {d.day}, {d.year}"


def rfc822(d):
    dt = datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
    return dt.strftime("%a, %d %b %Y %H:%M:%S +0000")


def load_posts():
    if not CONTENT.is_dir():
        sys.exit(f"Content folder not found: {CONTENT}")
    posts = []
    for path in sorted(CONTENT.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        meta, body_md = parse_front_matter(raw, path)

        for key in ("title", "description", "date"):
            if not meta.get(key):
                sys.exit(f"{path.name}: front matter is missing '{key}'.")
        if as_bool(meta.get("draft", "")):
            print(f"  skipping draft: {path.name}")
            continue

        try:
            date = datetime.strptime(meta["date"], "%Y-%m-%d").date()
        except ValueError:
            sys.exit(f"{path.name}: date must be YYYY-MM-DD, got {meta['date']!r}.")

        slug = meta.get("slug") or re.sub(r"^\d{4}-\d{2}-\d{2}-", "", path.stem)
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
            sys.exit(f"{path.name}: slug {slug!r} must be lowercase words joined by hyphens.")

        visible = meta["title"] + " " + meta["description"] + " " + body_md
        if "—" in visible:
            warn(f"{path.name} contains an em dash; site copy uses hyphens/colons instead.")

        word_count = len(re.findall(r"\w+", body_md))
        posts.append({
            "source": path.name,
            "slug": slug,
            "title": meta["title"],
            "description": meta["description"],
            "date": date,
            "author": meta.get("author", "Luis"),
            "tags": [t.strip() for t in meta.get("tags", "").split(",") if t.strip()],
            "hero_image": meta.get("hero_image", ""),
            "hero_alt": meta.get("hero_alt", ""),
            "featured": as_bool(meta.get("featured", "")),
            "pinned": as_bool(meta.get("pinned", "")),
            "minutes": max(1, round(word_count / WORDS_PER_MINUTE)),
            "body_html": markdown.markdown(body_md, extensions=["extra"]),
        })

    slugs = [p["slug"] for p in posts]
    for s in set(slugs):
        if slugs.count(s) > 1:
            sys.exit(f"Duplicate slug {s!r}; rename one of the source files.")
    posts.sort(key=lambda p: (p["date"], p["source"]), reverse=True)
    return posts


def pick_layout(posts):
    pinned = [p for p in posts if p["pinned"]]
    if len(pinned) > 1:
        warn("More than one post is pinned; using the newest ("
             + pinned[0]["source"] + ").")
    hero = pinned[0] if pinned else posts[0]

    pool = [p for p in posts if p is not hero]
    featured = [p for p in pool if p["featured"]][:3]
    for p in pool:
        if len(featured) >= 3:
            break
        if p not in featured:
            featured.append(p)
    featured.sort(key=lambda p: (p["date"], p["source"]), reverse=True)
    rest = [p for p in pool if p not in featured]
    return hero, featured, rest


def post_url(post):
    return f"{SITE}/blog/{post['slug']}/"


def meta_line(post, with_author=True):
    bits = [f"<span>{esc(human_date(post['date']))}</span>",
            "<span>&middot;</span>",
            f"<span>{post['minutes']} min read</span>"]
    if with_author:
        bits += ["<span>&middot;</span>", f"<span>{esc(post['author'])}</span>"]
    return "".join(bits)


def build_post_page(post, newer, older, template):
    canonical = post_url(post)

    hero_figure = ""
    if post["hero_image"]:
        hero_figure = ('            <figure class="post-figure" data-reveal>\n'
                       f'                <img src="{esc(post["hero_image"])}" alt="{esc(post["hero_alt"])}" '
                       'width="1200" height="630">\n'
                       "            </figure>")

    tags_html = ""
    if post["tags"]:
        spans = "".join(f"<span>{esc(t)}</span>" for t in post["tags"])
        tags_html = f'            <div class="post-tags" data-reveal>{spans}</div>'

    nav_rows = []
    for label, neighbour in (("Newer", newer), ("Older", older)):
        if neighbour:
            nav_rows.append(
                f'                <div class="post-nav-row" data-reveal style="--i:{len(nav_rows) + 1}">\n'
                f'                    <span class="dir">{label}</span>\n'
                f'                    <a href="/blog/{neighbour["slug"]}/">{esc(neighbour["title"])}</a>\n'
                "                </div>")
    post_nav = "\n".join(nav_rows) if nav_rows else \
        '                <div class="post-nav-row" data-reveal style="--i:1"><span class="dir">Soon</span><a href="/blog/">More articles are on the way</a></div>'

    json_ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post["title"],
        "description": post["description"],
        "datePublished": post["date"].isoformat(),
        "dateModified": post["date"].isoformat(),
        "url": canonical,
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "author": {"@type": "Person", "name": post["author"]},
        "publisher": {"@type": "Organization", "name": "Beben Design", "url": SITE + "/"},
    }
    if post["hero_image"]:
        json_ld["image"] = SITE + post["hero_image"]

    page = template
    for token, value in {
        "{{GENERATED_COMMENT}}": ("<!-- GENERATED by scripts/build_blog.py from content/blog/"
                                  + post["source"] + ". Do not hand-edit; edit the markdown and rebuild. -->"),
        "{{TITLE}}": esc(post["title"]),
        "{{DESCRIPTION}}": esc(post["description"]),
        "{{CANONICAL_URL}}": canonical,
        "{{DATE_ISO}}": post["date"].isoformat(),
        "{{DATE_HUMAN}}": esc(human_date(post["date"])),
        "{{AUTHOR}}": esc(post["author"]),
        "{{READING_TIME}}": str(post["minutes"]),
        "{{JSON_LD}}": json.dumps(json_ld, indent=2),
        "{{HERO_FIGURE}}": hero_figure,
        "{{BODY_HTML}}": post["body_html"],
        "{{TAGS_HTML}}": tags_html,
        "{{POST_NAV_HTML}}": post_nav,
    }.items():
        page = page.replace(token, value)

    out = BLOG_OUT / post["slug"] / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8", newline="\n")
    return out


def aotd_section(hero, css_class):
    href = f"/blog/{hero['slug']}/"
    text = [
        '            <div class="aotd-text">',
        '                <span class="aotd-label" data-reveal style="--i:0"><span class="dot" aria-hidden="true"></span>Article of the day</span>',
        f'                <h2 data-reveal style="--i:1"><a href="{href}">{esc(hero["title"])}</a></h2>',
        f'                <div class="post-meta" data-reveal style="--i:2">{meta_line(hero)}</div>',
        f'                <p data-reveal style="--i:3">{esc(hero["description"])}</p>',
        '                <div class="cta-wrapper" data-reveal style="--i:4">',
        f'                    <a href="{href}" class="cta-link">Read the article &rarr;</a>',
        "                </div>",
        "            </div>",
    ]
    figure = []
    aotd_class = "aotd"
    if hero["hero_image"]:
        figure = [
            '            <figure class="aotd-figure" data-reveal style="--i:2">',
            f'                <img src="{esc(hero["hero_image"])}" alt="{esc(hero["hero_alt"])}" width="1200" height="630">',
            "            </figure>",
        ]
    else:
        aotd_class = "aotd aotd--noimg"
    return (f'    <section{css_class}>\n        <div class="container">\n'
            f'        <div class="{aotd_class}">\n' + "\n".join(text + figure)
            + "\n        </div>\n        </div>\n    </section>")


def featured_section(featured, css_class):
    cards = []
    for i, p in enumerate(featured):
        tag = esc(p["tags"][0]) if p["tags"] else "journal"
        cards.append(
            f'                <article class="featured-card" data-reveal style="--i:{i + 2}">\n'
            f'                    <span class="tag">{tag}</span>\n'
            f'                    <h3><a href="/blog/{p["slug"]}/">{esc(p["title"])}</a></h3>\n'
            f'                    <p>{esc(p["description"])}</p>\n'
            f'                    <div class="post-meta">{meta_line(p, with_author=False)}</div>\n'
            "                </article>")
    return (f'    <section{css_class}>\n        <div class="container">\n'
            '            <div class="content-block">\n'
            '                <span class="eyebrow" data-reveal style="--i:0">Featured</span>\n'
            '                <h2 data-reveal style="--i:1">Worth your time</h2>\n'
            "            </div>\n"
            '            <div class="featured-grid">\n' + "\n".join(cards)
            + "\n            </div>\n        </div>\n    </section>")


def rest_section(rest, css_class):
    rows = []
    for i, p in enumerate(rest):
        rows.append(
            f'                <article class="article-row" data-reveal style="--i:{i + 2}">\n'
            f'                    <span class="date">{esc(short_date(p["date"]))}</span>\n'
            "                    <div>\n"
            f'                        <h3><a href="/blog/{p["slug"]}/">{esc(p["title"])}</a></h3>\n'
            f'                        <p>{esc(p["description"])}</p>\n'
            "                    </div>\n"
            f'                    <span class="mins">{p["minutes"]} min</span>\n'
            "                </article>")
    return (f'    <section{css_class}>\n        <div class="container">\n'
            '            <div class="content-block">\n'
            '                <span class="eyebrow" data-reveal style="--i:0">Archive</span>\n'
            '                <h2 data-reveal style="--i:1">All articles</h2>\n'
            "            </div>\n"
            '            <div class="article-rows">\n' + "\n".join(rows)
            + "\n            </div>\n        </div>\n    </section>")


def build_index(hero, featured, rest, template):
    builders = [lambda c: aotd_section(hero, c)]
    if featured:
        builders.append(lambda c: featured_section(featured, c))
    if rest:
        builders.append(lambda c: rest_section(rest, c))
    # The page-hero above is plain, so alternation starts soft.
    sections = []
    for i, build in enumerate(builders):
        css_class = ' class="section--soft"' if i % 2 == 0 else ""
        sections.append(build(css_class))

    page = template.replace(
        "{{GENERATED_COMMENT}}",
        "<!-- GENERATED by scripts/build_blog.py from content/blog/. Do not hand-edit; edit the markdown and rebuild. -->",
    ).replace("{{SECTIONS_HTML}}", "\n\n".join(sections))
    out = BLOG_OUT / "index.html"
    out.write_text(page, encoding="utf-8", newline="\n")
    return out


def build_feed(posts):
    newest = posts[0]["date"]
    items = []
    for p in posts:
        items.append(
            "    <item>\n"
            f"      <title>{esc(p['title'])}</title>\n"
            f"      <link>{post_url(p)}</link>\n"
            f"      <guid>{post_url(p)}</guid>\n"
            f"      <pubDate>{rfc822(p['date'])}</pubDate>\n"
            f"      <description>{esc(p['description'])}</description>\n"
            "    </item>")
    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        "    <title>Beben Design Blog</title>\n"
        f"    <link>{SITE}/blog/</link>\n"
        f'    <atom:link href="{SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>\n'
        f"    <description>{esc(FEED_DESCRIPTION)}</description>\n"
        "    <language>en</language>\n"
        f"    <lastBuildDate>{rfc822(newest)}</lastBuildDate>\n"
        + "\n".join(items) + "\n"
        "  </channel>\n"
        "</rss>\n")
    out = BLOG_OUT / "feed.xml"
    out.write_text(feed, encoding="utf-8", newline="\n")
    return out


def update_sitemap(posts):
    start, end = "<!-- blog:start (managed by scripts/build_blog.py) -->", "<!-- blog:end -->"
    entries = [
        "  <url>\n"
        f"    <loc>{SITE}/blog/</loc>\n"
        f"    <lastmod>{posts[0]['date'].isoformat()}</lastmod>\n"
        "    <changefreq>weekly</changefreq>\n"
        "    <priority>0.7</priority>\n"
        "  </url>"
    ]
    for p in posts:
        entries.append(
            "  <url>\n"
            f"    <loc>{post_url(p)}</loc>\n"
            f"    <lastmod>{p['date'].isoformat()}</lastmod>\n"
            "    <changefreq>monthly</changefreq>\n"
            "    <priority>0.6</priority>\n"
            "  </url>")
    block = start + "\n\n" + "\n\n".join(entries) + "\n\n  " + end

    xml = SITEMAP.read_text(encoding="utf-8")
    if start in xml and end in xml:
        pattern = re.escape(start) + r".*?" + re.escape(end)
        xml = re.sub(pattern, block, xml, flags=re.DOTALL)
    else:
        xml = xml.replace("</urlset>", "  " + block + "\n\n</urlset>")
    SITEMAP.write_text(xml, encoding="utf-8", newline="\n")


def check_orphans(posts):
    if not BLOG_OUT.is_dir():
        return
    slugs = {p["slug"] for p in posts}
    for child in BLOG_OUT.iterdir():
        if child.is_dir() and child.name not in slugs:
            warn(f"docs/blog/{child.name}/ has no matching markdown source; "
                 "delete it manually if the post was removed.")


def main():
    print("Building blog...")
    posts = load_posts()
    if not posts:
        sys.exit("No publishable posts found in content/blog/.")

    hero, featured, rest = pick_layout(posts)
    post_template = (TEMPLATES / "post.html").read_text(encoding="utf-8")
    index_template = (TEMPLATES / "blog-index.html").read_text(encoding="utf-8")

    BLOG_OUT.mkdir(parents=True, exist_ok=True)
    for i, post in enumerate(posts):
        newer = posts[i - 1] if i > 0 else None
        older = posts[i + 1] if i < len(posts) - 1 else None
        out = build_post_page(post, newer, older, post_template)
        print(f"  wrote {out.relative_to(ROOT)}")

    print(f"  wrote {build_index(hero, featured, rest, index_template).relative_to(ROOT)}")
    print(f"  wrote {build_feed(posts).relative_to(ROOT)}")
    update_sitemap(posts)
    print("  updated docs/sitemap.xml (blog block)")
    check_orphans(posts)

    print(f"Done: {len(posts)} posts. Hero: {hero['slug']}. "
          f"Featured: {', '.join(p['slug'] for p in featured) or 'none'}. "
          f"Archive rows: {len(rest)}.")
    if warnings:
        print(f"{len(warnings)} warning(s) above.")


if __name__ == "__main__":
    main()
