#!/usr/bin/env python3
"""Tools generator for beben.design.

Reads the registry at content/tools.json and the per-tool sources in
content/tools/<slug>/, renders each live tool into a single self-contained
docs/<slug>/index.html using scripts/templates/tool.html, and refreshes
every place the tool list is mirrored:

    docs/tools/index.html   the card grid, grouped by pillar
    docs/sitemap.xml        the tools block
    docs/llms.txt           the "## Tools" section
    docs/sprite.md          the "## The tools" section

Usage:
    py scripts/build_tools.py

No dependencies. The output is committed to git like any other page.

Per-tool sources (all optional except body.html):
    content/tools/<slug>/body.html    inner markup of the tool column
    content/tools/<slug>/tool.css     scoped styles, appended to the shell
    content/tools/<slug>/tool.js      the tool logic, an IIFE using Tool.*
    content/tools/<slug>/vendor/*.js  third-party libraries, inlined first

Never hand-edit a generated docs/<slug>/index.html: the next build
overwrites it. Edit content/tools/ and rebuild. Nav, footer, or token
changes on the site must be mirrored in scripts/templates/tool.html.
"""

import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "content" / "tools.json"
SOURCES = ROOT / "content" / "tools"
TEMPLATE = ROOT / "scripts" / "templates" / "tool.html"
DOCS = ROOT / "docs"
TOOLS_INDEX = DOCS / "tools" / "index.html"
SITEMAP = DOCS / "sitemap.xml"
LLMS = DOCS / "llms.txt"
SPRITE = DOCS / "sprite.md"
# Mirrors KNOWLEDGE_MAX_CHARS in cloudflare-worker/sprite-proxy.js.
SPRITE_MAX_CHARS = 12000

SITE = "https://beben.design"
OG_IMAGE = SITE + "/assets/images/og/ogimage.jpg"
MAX_STAGGER = 6

# Grid grouping. Order here is the order on the page.
PILLARS = [
    ("featured", "Featured",
     "The two that get opened most."),
    ("private", "Private by default",
     "Nothing you paste, drop, or type into these ever leaves your device."),
    ("design", "Design toolkit",
     "The utilities client work keeps reaching for, rebuilt without the sign-up wall."),
    ("business", "Run your business",
     "Pricing, invoicing, and getting your own work out of the door."),
]

warnings = []


def warn(msg):
    warnings.append(msg)
    print("  WARNING: " + msg)


def esc(text):
    return html.escape(str(text), quote=True)


# ── REGISTRY ──────────────────────────────────────────────────────────

def load_registry():
    if not REGISTRY.is_file():
        sys.exit(f"Registry not found: {REGISTRY}")
    try:
        data = json.loads(REGISTRY.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        sys.exit(f"content/tools.json is not valid JSON: {e}")

    tools = data.get("tools")
    if not tools:
        sys.exit("content/tools.json has no 'tools' array.")

    seen = set()
    pillars = {p[0] for p in PILLARS}
    for tool in tools:
        for key in ("slug", "name", "tag", "pillar", "status", "description"):
            if not tool.get(key):
                sys.exit(f"Tool entry is missing '{key}': {tool.get('slug', tool)!r}")

        slug = tool["slug"]
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", slug):
            sys.exit(f"Slug {slug!r} must be lowercase words joined by hyphens.")
        if slug in seen:
            sys.exit(f"Duplicate slug {slug!r} in content/tools.json.")
        seen.add(slug)

        if tool["pillar"] not in pillars:
            sys.exit(f"{slug}: unknown pillar {tool['pillar']!r}. "
                     f"Expected one of {sorted(pillars)}.")
        if tool["status"] not in ("live", "soon"):
            sys.exit(f"{slug}: status must be 'live' or 'soon', got {tool['status']!r}.")

        tool["generated"] = tool["status"] == "live" and not tool.get("external_url")
        if tool["generated"]:
            for key in ("number", "h1", "lead", "meta_title", "meta_description"):
                if not tool.get(key):
                    sys.exit(f"{slug}: live generated tools need '{key}' in the registry.")

        copy_text = " ".join(str(tool.get(k, "")) for k in
                             ("name", "description", "lead", "meta_title", "meta_description"))
        if "—" in copy_text:
            warn(f"{slug}: registry copy contains an em dash; site copy uses "
                 "hyphens, colons, or commas instead.")

    return tools


def tool_url(tool):
    if tool.get("external_url"):
        return f"{SITE}/{tool['slug']}/"
    return f"{SITE}/{tool['slug']}/"


def download_name(tool):
    return tool.get("download_name") or f"beben-{tool['slug']}.html"


# ── TOOL PAGES ────────────────────────────────────────────────────────

def h1_html(raw):
    """'QR Code|Generator' -> two lines, the last in the red highlight box."""
    parts = [p.strip() for p in raw.split("|") if p.strip()]
    if not parts:
        return ""
    lead = [esc(p) for p in parts[:-1]]
    last = f'<span class="highlight-box">{esc(parts[-1])}</span>'
    return "<br>".join(lead + [last])


def specs_html(rows):
    out = []
    for row in rows or []:
        label, value = row[0], row[1]
        cls = ' class="spec-value accent"' if len(row) > 2 and row[2] == "accent" \
            else ' class="spec-value"'
        out.append(
            '            <div class="spec-row">\n'
            f'                <span class="spec-label">{esc(label)}</span>\n'
            f'                <span{cls}>{esc(value)}</span>\n'
            "            </div>")
    return "\n".join(out)


def vendor_js(src_dir):
    vendor_dir = src_dir / "vendor"
    if not vendor_dir.is_dir():
        return ""
    blocks = []
    for path in sorted(vendor_dir.glob("*.js")):
        notice = (vendor_dir / (path.stem + ".txt"))
        header = notice.read_text(encoding="utf-8").strip() if notice.is_file() \
            else f"Vendored third-party library: {path.name}"
        indented = "\n".join("   " + line if line.strip() else ""
                             for line in header.splitlines())
        blocks.append(
            "\n<!-- Vendored so this page works with no network. -->\n"
            "<script>\n"
            "/* " + path.name + "\n" + indented + "\n*/\n"
            + path.read_text(encoding="utf-8").rstrip() + "\n"
            "</script>")
    return "".join(blocks)


def indent(text, spaces):
    pad = " " * spaces
    return "\n".join(pad + line if line.strip() else "" for line in text.splitlines())


def build_tool_page(tool, template):
    slug = tool["slug"]
    src = SOURCES / slug
    body_file = src / "body.html"
    if not body_file.is_file():
        sys.exit(f"{slug}: content/tools/{slug}/body.html is missing.")

    body = body_file.read_text(encoding="utf-8").rstrip()
    css_file, js_file = src / "tool.css", src / "tool.js"
    css = css_file.read_text(encoding="utf-8").rstrip() if css_file.is_file() else ""
    js = js_file.read_text(encoding="utf-8").rstrip() if js_file.is_file() else ""

    if "—" in body:
        warn(f"{slug}: body.html contains an em dash.")

    canonical = tool_url(tool)
    page = template
    for token, value in {
        "{{GENERATED_COMMENT}}": (
            "<!-- GENERATED by scripts/build_tools.py from content/tools/" + slug
            + "/. Do not hand-edit; edit the source and rebuild. -->"),
        "{{META_TITLE}}": esc(tool["meta_title"]),
        "{{META_DESCRIPTION}}": esc(tool["meta_description"]),
        "{{CANONICAL_URL}}": canonical,
        "{{OG_IMAGE}}": OG_IMAGE,
        "{{PAGE_LABEL}}": esc(f"[ TOOLS.{tool['number']} ] - {tool['tag']}"),
        "{{H1_HTML}}": h1_html(tool["h1"]),
        "{{LEAD}}": esc(tool["lead"]),
        "{{SPECS_HTML}}": specs_html(tool.get("specs")),
        "{{TOAST_TEXT}}": esc(tool.get("toast", "Copied to clipboard.")),
    }.items():
        page = page.replace(token, value)

    # Content last, so nothing inside it is scanned for other tokens.
    page = page.replace("{{VENDOR_JS}}", vendor_js(src))
    page = page.replace("{{TOOL_CSS}}", indent(css, 8))
    page = page.replace("{{TOOL_HTML}}", indent(body, 8))
    page = page.replace("{{TOOL_JS}}", js)

    left = re.findall(r"\{\{[A-Z_]+\}\}", page)
    if left:
        sys.exit(f"{slug}: template placeholders left unfilled: {sorted(set(left))}")

    out = DOCS / slug / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8", newline="\n")
    return out


# ── TOOLS INDEX GRID ──────────────────────────────────────────────────

def card_html(tool, stagger):
    slug = tool["slug"]
    i = min(stagger, MAX_STAGGER)
    tag = f'<span class="card-tag">// {esc(tool["tag"])}</span>'
    title = f'<h3>{esc(tool["name"])}</h3>'
    desc = f'<p>{esc(tool["description"])}</p>'

    if tool["status"] == "soon":
        return (f'                    <article class="tool-card tool-card--soon" data-reveal style="--i:{i}">\n'
                '                        <div class="card-body">\n'
                f'                            {tag}\n'
                f'                            {title}\n'
                f'                            {desc}\n'
                "                        </div>\n"
                '                        <div class="card-footer">\n'
                '                            <span class="card-open">Coming soon</span>\n'
                "                        </div>\n"
                "                    </article>")

    href = tool.get("external_url") or f"../{slug}/"
    open_label = tool.get("card_open", "Open tool &nearr;")

    banner = ""
    classes = "tool-card"
    if tool.get("banner"):
        classes += " tool-card--visual"
        banner = (f'                        <a href="{esc(href)}" class="card-banner" '
                  f'aria-label="Open {esc(tool["name"])}">\n'
                  '                            <span class="card-banner-inner"></span>\n'
                  "                        </a>\n")

    footer = f'                            <a href="{esc(href)}" class="card-open">{open_label}</a>\n'
    if tool["generated"]:
        footer += (f'                            <a href="../{slug}/index.html"\n'
                   '                               class="card-download"\n'
                   f'                               download="{esc(download_name(tool))}"\n'
                   '                               title="Download as a standalone HTML file">&darr; .HTML</a>\n')

    return (f'                    <article class="{classes}" data-reveal style="--i:{i}">\n'
            + banner
            + f'                        <a href="{esc(href)}" class="card-body">\n'
            f'                            {tag}\n'
            f'                            {title}\n'
            f'                            {desc}\n'
            "                        </a>\n"
            '                        <div class="card-footer">\n'
            + footer
            + "                        </div>\n"
            "                    </article>")


def grid_html(tools):
    groups = []
    for key, title, note in PILLARS:
        members = [t for t in tools if t["pillar"] == key]
        if not members:
            continue
        cards = [card_html(t, n + 1) for n, t in enumerate(members)]
        groups.append(
            '            <div class="tool-group">\n'
            '                <div class="group-head" data-reveal style="--i:0">\n'
            f'                    <h3 class="group-title">{esc(title)}</h3>\n'
            f'                    <p class="group-note">{esc(note)}</p>\n'
            "                </div>\n"
            '                <div class="tools-grid">\n'
            + "\n\n".join(cards) + "\n"
            "                </div>\n"
            "            </div>")
    return "\n\n".join(groups)


def replace_block(text, start, end, block, path):
    if start not in text or end not in text:
        sys.exit(f"{path}: missing the markers {start!r} and {end!r}.")
    pattern = re.escape(start) + r".*?" + re.escape(end)
    return re.sub(pattern, lambda _: start + "\n\n" + block + "\n\n" + " " * 12 + end,
                  text, flags=re.DOTALL)


def update_tools_index(tools):
    start = "<!-- tools:start (managed by scripts/build_tools.py) -->"
    end = "<!-- tools:end -->"
    text = TOOLS_INDEX.read_text(encoding="utf-8")
    text = replace_block(text, start, end, grid_html(tools), "docs/tools/index.html")
    TOOLS_INDEX.write_text(text, encoding="utf-8", newline="\n")


def update_sitemap(tools):
    start = "<!-- tools:start (managed by scripts/build_tools.py) -->"
    end = "<!-- tools:end -->"
    entries = [
        "  <url>\n"
        f"    <loc>{SITE}/tools/</loc>\n"
        "    <changefreq>weekly</changefreq>\n"
        "    <priority>0.7</priority>\n"
        "  </url>"
    ]
    for tool in tools:
        if tool["status"] != "live":
            continue
        entries.append(
            "  <url>\n"
            f"    <loc>{tool_url(tool)}</loc>\n"
            "    <changefreq>monthly</changefreq>\n"
            "    <priority>0.6</priority>\n"
            "  </url>")
    block = "\n\n".join(entries)

    xml = SITEMAP.read_text(encoding="utf-8")
    if start in xml and end in xml:
        pattern = re.escape(start) + r".*?" + re.escape(end)
        xml = re.sub(pattern, lambda _: start + "\n\n" + block + "\n\n  " + end,
                     xml, flags=re.DOTALL)
    else:
        xml = xml.replace("</urlset>",
                          "  " + start + "\n\n" + block + "\n\n  " + end + "\n\n</urlset>")
    SITEMAP.write_text(xml, encoding="utf-8", newline="\n")


def replace_md_section(path, heading, body):
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(r"^" + re.escape(heading) + r"\s*\n.*?(?=^## |\Z)",
                         re.MULTILINE | re.DOTALL)
    if not pattern.search(text):
        sys.exit(f"{path.name}: no '{heading}' section to manage.")
    text = pattern.sub(lambda _: heading + "\n\n" + body + "\n\n", text, count=1)
    path.write_text(text, encoding="utf-8", newline="\n")


def update_llms(tools):
    lines = [
        f"- [Free Web Tools]({SITE}/tools/): A growing collection of single-purpose, "
        "browser-native utilities: no accounts, no server calls, no data collection. "
        "Every tool is downloadable as a standalone HTML file that runs offline forever."
    ]
    for tool in tools:
        if tool["status"] != "live":
            continue
        lines.append(f"- [{tool['name']}]({tool_url(tool)}): {tool['description']}")

    soon = [t["name"] for t in tools if t["status"] == "soon"]
    if soon:
        lines.append("- In development: " + ", ".join(soon) + ".")
    replace_md_section(LLMS, "## Tools", "\n".join(lines))


def update_sprite(tools):
    live = [t for t in tools if t["status"] == "live"]
    soon = [t for t in tools if t["status"] == "soon"]
    lines = [
        "- The free tools at /tools/ all run entirely in the browser: no accounts,",
        "  no uploads, no data collection. Each one can be downloaded as a single",
        "  HTML file that keeps working offline forever.",
        "- Live now:",
    ]
    for tool in live:
        lines.append(f"  - {tool['name']} (/{tool['slug']}/): {tool['description']}")
    if soon:
        lines.append("- In development: " + ", ".join(t["name"] for t in soon) + ".")
    replace_md_section(SPRITE, "## The tools", "\n".join(lines))

    # The Worker slices sprite.md at KNOWLEDGE_MAX_CHARS with no error, so an
    # over-long file loses its tail and Sprite quietly forgets whatever was at
    # the bottom. Keep this in step with cloudflare-worker/sprite-proxy.js.
    size = len(SPRITE.read_text(encoding="utf-8"))
    if size > SPRITE_MAX_CHARS:
        sys.exit(f"docs/sprite.md is {size} chars, over the Worker's "
                 f"{SPRITE_MAX_CHARS} limit. It would be truncated silently. "
                 f"Trim it, or raise KNOWLEDGE_MAX_CHARS in "
                 f"cloudflare-worker/sprite-proxy.js to match.")
    if size > SPRITE_MAX_CHARS * 0.9:
        warn(f"docs/sprite.md is {size} chars, within 10% of the Worker's "
             f"{SPRITE_MAX_CHARS} limit.")


def check_orphans(tools):
    for tool in tools:
        if tool["status"] == "soon" and (DOCS / tool["slug"]).is_dir():
            warn(f"docs/{tool['slug']}/ exists but the registry marks it "
                 "'soon'; flip it to 'live' or delete the folder.")
        if tool["generated"] and not (SOURCES / tool["slug"]).is_dir():
            warn(f"content/tools/{tool['slug']}/ is missing for a live tool.")


# ── MAIN ──────────────────────────────────────────────────────────────

def main():
    print("Building tools...")
    tools = load_registry()
    template = TEMPLATE.read_text(encoding="utf-8")

    built = 0
    for tool in tools:
        if tool["generated"]:
            out = build_tool_page(tool, template)
            print(f"  wrote {out.relative_to(ROOT)}")
            built += 1

    update_tools_index(tools)
    print("  updated docs/tools/index.html (grid block)")
    update_sitemap(tools)
    print("  updated docs/sitemap.xml (tools block)")
    update_llms(tools)
    print("  updated docs/llms.txt (Tools section)")
    update_sprite(tools)
    print("  updated docs/sprite.md (The tools section)")
    check_orphans(tools)

    live = sum(1 for t in tools if t["status"] == "live")
    soon = sum(1 for t in tools if t["status"] == "soon")
    print(f"Done: {len(tools)} cards ({live} live, {soon} coming soon), "
          f"{built} pages generated.")
    if warnings:
        print(f"{len(warnings)} warning(s) above.")


if __name__ == "__main__":
    main()
