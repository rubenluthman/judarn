#!/usr/bin/env python3
"""Verifies that relative Markdown links resolve to on-disk paths with exact case.

Covers inline links (with optional titles), images, angle-bracket targets and reference-style
definitions. Fenced (``` and ~~~) and inline code are ignored. `file:` links are errors because
they bind a document to one machine. macOS is case-insensitive, so every path component is
compared against os.listdir to catch links that only work locally.
"""
import os
import re
import subprocess
import sys
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

INLINE = re.compile(r"\]\(\s*(<[^>\n]*>|[^)\s]+)(?:\s+(?:\"[^\"]*\"|'[^']*'))?\s*\)")
REFERENCE = re.compile(r"^ {0,3}\[[^\]\n]+\]:\s*(<[^>\n]*>|\S+)", re.M)
SCHEME = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*:")
INLINE_CODE = re.compile(r"(`+)(?:(?!\1).)+?\1", re.S)


def strip_code(text):
    out, fence = [], None
    for line in text.split("\n"):
        stripped = line.lstrip()
        if fence is None:
            m = re.match(r"(`{3,}|~{3,})", stripped)
            if m and len(line) - len(stripped) <= 3:
                fence = m.group(1)
                out.append("")
                continue
            out.append(line)
        else:
            if stripped.startswith(fence[0] * len(fence)) and stripped.strip(fence[0]) == "":
                fence = None
            out.append("")
    return INLINE_CODE.sub("", "\n".join(out))


def exact_exists(rel):
    """True when every component of rel exists with exactly this case, starting at ROOT."""
    current = ROOT
    for part in rel.split("/"):
        if part in ("", "."):
            continue
        if part not in os.listdir(current):
            return False
        current = os.path.join(current, part)
    return True


def targets(text):
    for m in INLINE.finditer(text):
        yield m.group(1)
    for m in REFERENCE.finditer(text):
        yield m.group(1)


def main():
    listed = subprocess.check_output(
        ["git", "ls-files", "-co", "--exclude-standard", "*.md"], text=True
    ).splitlines()
    errors = []
    for f in sorted(set(listed)):
        if not os.path.isfile(f):
            continue
        with open(f, encoding="utf-8") as fp:
            text = strip_code(fp.read())
        for raw in targets(text):
            target = raw.strip()
            if target.startswith("<") and target.endswith(">"):
                target = target[1:-1].strip()
            if target.lower().startswith("file:"):
                errors.append(f"{f}: file: link is machine-specific, use a relative link: {target}")
                continue
            if SCHEME.match(target) or target.startswith("//") or target.startswith("#") or not target:
                continue
            path = unquote(re.split(r"[#?]", target, maxsplit=1)[0])
            if not path:
                continue
            if path.startswith("/"):
                resolved = os.path.normpath(path.lstrip("/"))
            else:
                resolved = os.path.normpath(os.path.join(os.path.dirname(f), path))
            if resolved.startswith(".."):
                errors.append(f"{f}: link escapes the repository: {target}")
            elif not exact_exists(resolved.replace(os.sep, "/")):
                kind = "case mismatch or missing" if os.path.exists(resolved) else "missing"
                errors.append(f"{f}: broken link ({kind}): {target} -> {resolved}")
    for e in errors:
        print(f"ERROR: {e}", file=sys.stderr)
    if errors:
        sys.exit(1)
    print("✓ All relative Markdown links resolve to on-disk files with exact case.")


main()
