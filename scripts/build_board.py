#!/usr/bin/env python3
"""Build the ticket board page.

Writes docs/index.html (served by GitHub Pages; reads tickets live from main)
with a snapshot of the current tickets embedded as a fallback.
Usage:  python scripts/build_board.py [OUTPUT_BODY_FILE]
The optional argument also writes just the page body (no <html> wrapper).
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ticket  # noqa: E402

ROOT = ticket.ROOT


def snapshot():
    out = []
    for t in ticket.all_tickets():
        body = t.body
        crit = [l for l in body.splitlines() if l.startswith(("- [ ] ", "- [x] ", "- [X] "))]
        out.append({"id": t.id, "title": t.title, "status": t.status, "assignee": t.assignee,
                    "issue": t.meta["issue"], "file": t.rel(), "description": t.description(),
                    "critDone": sum(1 for l in crit if not l.startswith("- [ ] ")), "critTotal": len(crit)})
    return {"generated": datetime.now(timezone.utc).isoformat(), "tickets": out}


def main():
    body = (ROOT / "docs" / "board.body.html").read_text(encoding="utf-8")
    data = json.dumps(snapshot(), ensure_ascii=False).replace("</", "<\\/")
    body = body.replace("/*SNAPSHOT*/", data)
    page = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>'
            f'</head><body>\n{body}\n</body></html>\n')
    (ROOT / "docs" / "index.html").write_text(page, encoding="utf-8")
    (ROOT / "docs" / ".nojekyll").write_text("", encoding="utf-8")
    print("wrote docs/index.html")
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(body, encoding="utf-8")
        print("wrote", sys.argv[1])


if __name__ == "__main__":
    main()
