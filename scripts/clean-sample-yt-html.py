"""Sanitize docs/sample-YT.html for repo hygiene (scripts + tokens that trigger secret scanning)."""
from __future__ import annotations

import re
from pathlib import Path


def strip_scripts(html: str, placeholder: str) -> tuple[str, int]:
    """Replace <script>...</script> with placeholder. Leaves <script ... /> self-closing tags alone."""
    lower = html.lower()
    out: list[str] = []
    i = 0
    count = 0
    while True:
        start = lower.find("<script", i)
        if start == -1:
            out.append(html[i:])
            break
        gt = html.find(">", start)
        if gt == -1:
            out.append(html[i:])
            break
        open_tag = html[start : gt + 1]
        if open_tag.rstrip().endswith("/>"):
            out.append(html[i : gt + 1])
            i = gt + 1
            continue
        out.append(html[i:start])
        end = lower.find("</script>", start)
        if end == -1:
            out.append(html[start:])
            break
        end += len("</script>")
        out.append(placeholder)
        count += 1
        i = end
    return "".join(out), count


def scrub_sensitive_markup(html: str) -> str:
    """Remove obvious secret-scan targets outside of script bodies."""
    html = re.sub(
        r'<meta\s+http-equiv=["\']origin-trial["\']\s+content=["\'][^"\']*["\']\s*/?>',
        '<meta name="SECURE CLEAN UP" content="origin-trial meta removed"/>',
        html,
        flags=re.I,
    )
    html = re.sub(
        r'href=(["\'])https://www\.youtube\.com/s/_/ytmainappweb[^"\']*\1',
        r'href=# data-removed="SECURE CLEAN UP ytmainappweb bundle URL"',
        html,
    )
    # Hashed bundle fingerprint still embedded in some link class names after href scrub.
    html = re.sub(
        r'class="css-httpswwwyoutubecoms[^"]*"',
        'class="SECURE_CLEANUP"',
        html,
    )
    # Thumbnail / static URL signing segments (often flagged like API material).
    html = re.sub(r"rs=AOn4[A-Za-z0-9_-]+", "rs=SECURE_CLEANUP", html)
    html = re.sub(r"rs=AGK[A-Za-z0-9_-]+", "rs=SECURE_CLEANUP", html)
    html = re.sub(
        r"<iframe\b[^>]*\bsrc=(['\"])https://accounts\.youtube\.com/RotateCookiesPage[^>]*>[\s]*</iframe>",
        "<!-- SECURE CLEAN UP: accounts.yt cookie-rotation iframe removed -->",
        html,
        flags=re.I | re.S,
    )
    return html


def main() -> None:
    repo = Path(__file__).resolve().parents[1]
    path = repo / "docs" / "sample-YT.html"
    placeholder = '<script name="SECURE CLEAN UP"/>'
    text = path.read_text(encoding="utf-8", errors="replace")
    before = len(text)
    text, n_scripts = strip_scripts(text, placeholder)
    text = scrub_sensitive_markup(text)
    path.write_text(text, encoding="utf-8", newline="")
    print(
        f"{path}: scripts replaced: {n_scripts}; "
        f"markup scrubbed; {before} -> {len(text)} bytes"
    )


if __name__ == "__main__":
    main()
