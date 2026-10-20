#!/usr/bin/env python3
"""Ticket system for group_project_CEN.

The ticket files in tickets/ on the main branch are the source of truth.
A GitHub Action (.github/workflows/tickets.yml) mirrors every ticket to:
  * an Issue titled "Ticket 001 - <title>" (same description, same assignee)
  * an item on the GitHub Project (kanban) with Status Ready / In Progress / Done
and, in the other direction, picks up assign / unassign / close / reopen
done in the Issues tab and writes it back into the ticket file on main.

Everyday commands (run from the repo root, needs only Python 3 + git):
  python scripts/ticket.py list                     # board in the terminal
  python scripts/ticket.py show 001
  python scripts/ticket.py new "Login page" -d "Build the login form ..."
  python scripts/ticket.py claim 001                # you take it -> In Progress
  python scripts/ticket.py unclaim 001              # give it back -> Ready
  python scripts/ticket.py done 001                 # finished -> Done
  python scripts/ticket.py watch                    # live board, refreshes from main

Commands used by the GitHub Action (need the gh CLI + a token):
  python scripts/ticket.py sync-github
  python scripts/ticket.py from-issue
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TICKETS_DIR = ROOT / "tickets"
MAIN = "main"

STATUSES = ["ready", "in-progress", "done"]
STATUS_LABEL = {"ready": "Ready", "in-progress": "In Progress", "done": "Done"}
# Names accepted for each column on the Project board's Status field.
BOARD_ALIASES = {
    "ready": ["ready", "ready to pick up", "todo", "to do", "backlog"],
    "in-progress": ["in progress", "in-progress", "doing"],
    "done": ["done", "complete", "completed"],
}
ISSUE_TITLE_RE = re.compile(r"^\s*ticket\s+(\d{3})\b", re.I)


# --------------------------------------------------------------------------- #
# Ticket files
# --------------------------------------------------------------------------- #
class Ticket:
    FIELDS = ["id", "title", "status", "assignee", "issue"]

    def __init__(self, path, meta, body):
        self.path = path
        self.meta = meta
        self.body = body

    # -- parsing ------------------------------------------------------------ #
    @classmethod
    def load(cls, path):
        text = Path(path).read_text(encoding="utf-8")
        m = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, re.S)
        if not m:
            raise SystemExit(f"{path}: missing '---' header block")
        meta = {}
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        for f in cls.FIELDS:
            meta.setdefault(f, "")
        return cls(Path(path), meta, m.group(2).lstrip("\n"))

    def save(self):
        head = "\n".join(f"{f}: {self.meta.get(f, '')}".rstrip() for f in self.FIELDS)
        self.path.write_text(f"---\n{head}\n---\n\n{self.body.rstrip()}\n", encoding="utf-8")

    # -- convenience -------------------------------------------------------- #
    id = property(lambda s: s.meta["id"])
    title = property(lambda s: s.meta["title"])
    status = property(lambda s: s.meta["status"] or "ready")
    assignee = property(lambda s: s.meta["assignee"])

    @property
    def issue_title(self):
        return f"Ticket {self.id} - {self.title}"

    def description(self):
        """Everything under '## Description' up to the next '## ' heading."""
        m = re.search(r"^## Description\s*\n(.*?)(?=^## |\Z)", self.body, re.S | re.M)
        return (m.group(1) if m else self.body).strip()

    def rel(self):
        return self.path.relative_to(ROOT).as_posix()


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:50] or "ticket"


def all_tickets():
    if not TICKETS_DIR.exists():
        return []
    return sorted(
        (Ticket.load(p) for p in TICKETS_DIR.glob("[0-9][0-9][0-9]-*.md")),
        key=lambda t: t.id,
    )


def find(ticket_id):
    tid = f"{int(ticket_id):03d}"
    for t in all_tickets():
        if t.id == tid:
            return t
    raise SystemExit(f"Ticket {tid} not found in tickets/")


# --------------------------------------------------------------------------- #
# git helpers
# --------------------------------------------------------------------------- #
def run(cmd, check=True, capture=True, input=None):
    r = subprocess.run(cmd, cwd=ROOT, text=True, input=input,
                       capture_output=capture)
    if check and r.returncode != 0:
        raise SystemExit(f"$ {' '.join(cmd)}\n{(r.stderr or r.stdout).strip()}")
    return (r.stdout or "").strip()


def git(*args, check=True):
    return run(["git", *args], check=check)


def require_clean_main():
    branch = git("rev-parse", "--abbrev-ref", "HEAD")
    if branch != MAIN:
        raise SystemExit(
            f"Ticket changes are made on '{MAIN}', you are on '{branch}'.\n"
            f"Run:  git stash && git switch {MAIN}   (then come back to your branch)")
    dirty = git("status", "--porcelain", "--", "tickets")
    if dirty:
        raise SystemExit("You have uncommitted changes in tickets/. Commit or discard them first.")


def pull():
    git("pull", "--rebase", "--autostash", "origin", MAIN)


def commit_and_push(paths, message):
    git("add", *paths)
    git("commit", "-m", message)
    for attempt in range(3):
        r = subprocess.run(["git", "push", "origin", MAIN], cwd=ROOT,
                           text=True, capture_output=True)
        if r.returncode == 0:
            return
        # Someone pushed first: replay our commit on top of theirs.
        rb = subprocess.run(["git", "pull", "--rebase", "origin", MAIN], cwd=ROOT,
                            text=True, capture_output=True)
        if rb.returncode != 0:
            subprocess.run(["git", "rebase", "--abort"], cwd=ROOT, capture_output=True)
            git("reset", "--hard", f"origin/{MAIN}")
            raise SystemExit("Someone changed the same ticket at the same time. "
                             "Your change was dropped; run `ticket list` and try again.")
    raise SystemExit("Could not push to main after 3 tries:\n" + r.stderr)


def whoami():
    """GitHub username of the person running the command."""
    user = os.environ.get("TICKET_USER") or git("config", "github.user", check=False)
    if not user:
        try:
            user = run(["gh", "api", "user", "--jq", ".login"], check=False)
        except FileNotFoundError:
            user = ""
    if not user:
        raise SystemExit(
            "I don't know your GitHub username. Run once:\n"
            "  git config --global github.user YOUR_GITHUB_USERNAME")
    return user


# --------------------------------------------------------------------------- #
# Local commands
# --------------------------------------------------------------------------- #
def render_board(tickets):
    cols = {s: [t for t in tickets if t.status == s] for s in STATUSES}
    width = 34
    out = ["  ".join(f"{STATUS_LABEL[s]} ({len(cols[s])})".ljust(width) for s in STATUSES),
           "  ".join("-" * width for _ in STATUSES)]
    for i in range(max([len(c) for c in cols.values()] + [0])):
        row = []
        for s in STATUSES:
            if i < len(cols[s]):
                t = cols[s][i]
                who = f" @{t.assignee}" if t.assignee else ""
                row.append(f"{t.id} {t.title}"[: width - len(who)].ljust(width - len(who)) + who)
            else:
                row.append(" " * width)
        out.append("  ".join(row))
    return "\n".join(out)


def cmd_list(a):
    print(render_board(all_tickets()))


def cmd_show(a):
    t = find(a.id)
    print(f"{t.issue_title}\nStatus:   {STATUS_LABEL[t.status]}\n"
          f"Assignee: {t.assignee or '-'}\nIssue:    #{t.meta['issue'] or '(created on next sync)'}\n"
          f"File:     {t.rel()}\n\n{t.description()}")


def cmd_new(a):
    require_clean_main()
    pull()
    nums = [int(t.id) for t in all_tickets()]
    tid = f"{(max(nums) + 1 if nums else 1):03d}"
    TICKETS_DIR.mkdir(exist_ok=True)
    path = TICKETS_DIR / f"{tid}-{slugify(a.title)}.md"
    assignee = a.assign or ""
    status = "in-progress" if assignee else "ready"
    criteria = "\n".join(f"- [ ] {c}" for c in (a.criteria or [])) or "- [ ] "
    t = Ticket(path, {"id": tid, "title": a.title.strip(), "status": status,
                      "assignee": assignee, "issue": ""},
               f"## Description\n\n{a.description.strip()}\n\n## Acceptance criteria\n\n{criteria}\n\n## Notes\n")
    t.save()
    commit_and_push([t.rel()], f"ticket {tid}: create \"{t.title}\"")
    print(f"Created {t.rel()} -> {STATUS_LABEL[status]}. The Issue and board card appear in ~1 min.")


def change(ticket_id, mutate, message):
    require_clean_main()
    pull()
    t = find(ticket_id)
    mutate(t)
    t.save()
    if not git("status", "--porcelain", "--", t.rel()):
        print("Nothing to change.")
        return
    commit_and_push([t.rel()], message.format(t=t))
    print(f"Ticket {t.id}: {STATUS_LABEL[t.status]}"
          + (f", assigned to @{t.assignee}" if t.assignee else "")
          + ". Issue + board update in ~1 min.")


def cmd_claim(a):
    me = whoami()

    def m(t):
        if t.assignee and t.assignee.lower() != me.lower() and not a.force:
            raise SystemExit(f"Ticket {t.id} is already claimed by @{t.assignee}.")
        if t.status == "done" and not a.force:
            raise SystemExit(f"Ticket {t.id} is already done.")
        t.meta["assignee"], t.meta["status"] = me, "in-progress"
    change(a.id, m, "ticket {t.id}: claimed by @{t.assignee}")


def cmd_unclaim(a):
    def m(t):
        t.meta["assignee"], t.meta["status"] = "", "ready"
    change(a.id, m, "ticket {t.id}: back to Ready")


def cmd_done(a):
    def m(t):
        t.meta["status"] = "done"
        if not t.assignee:
            t.meta["assignee"] = whoami()
    change(a.id, m, "ticket {t.id}: done")


def cmd_status(a):
    if a.status not in STATUSES:
        raise SystemExit(f"Status must be one of: {', '.join(STATUSES)}")

    def m(t):
        t.meta["status"] = a.status
        if a.status == "ready":
            t.meta["assignee"] = ""
    change(a.id, m, "ticket {t.id}: status " + a.status)


def cmd_watch(a):
    """Live board: fetches main every few seconds and reads tickets from it."""
    last = None
    while True:
        subprocess.run(["git", "fetch", "-q", "origin", MAIN], cwd=ROOT, capture_output=True)
        files = git("ls-tree", "--name-only", f"origin/{MAIN}", "tickets/", check=False).split()
        tickets = []
        for f in files:
            if re.match(r"tickets/\d{3}-.*\.md$", f):
                tmp = ROOT / ".git" / "ticket-watch.md"
                tmp.write_text(git("show", f"origin/{MAIN}:{f}"), encoding="utf-8")
                t = Ticket.load(tmp)
                tickets.append(t)
        tickets.sort(key=lambda t: t.id)
        board = render_board(tickets)
        if board != last:
            os.system("cls" if os.name == "nt" else "clear")
            print(f"Tickets on origin/{MAIN} - {time.strftime('%H:%M:%S')}  (Ctrl+C to stop)\n")
            print(board)
            last = board
        try:
            time.sleep(a.interval)
        except KeyboardInterrupt:
            return


# --------------------------------------------------------------------------- #
# GitHub sync (runs in GitHub Actions)
# --------------------------------------------------------------------------- #
def gh(*args, input=None, check=True):
    return run(["gh", *args], input=input, check=check)


def gh_json(*args, input=None):
    out = gh(*args, input=input)
    return json.loads(out) if out else None


def graphql(query, **variables):
    payload = json.dumps({"query": query, "variables": variables})
    data = gh_json("api", "graphql", "--input", "-", input=payload)
    if data.get("errors"):
        raise SystemExit("GraphQL error: " + json.dumps(data["errors"]))
    return data["data"]


def repo_slug():
    return os.environ.get("GITHUB_REPOSITORY") or gh(
        "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner")


def issue_body(t):
    return (f"{t.description()}\n\n---\n"
            f"**Status:** {STATUS_LABEL[t.status]}  \n"
            f"**Ticket file:** [`{t.rel()}`](../blob/{MAIN}/{t.rel()})\n\n"
            f"<sub>Synced from the ticket file. Claim it with "
            f"`python scripts/ticket.py claim {t.id}` or by assigning yourself here.</sub>")


def ensure_labels(repo):
    existing = {l["name"] for l in gh_json("label", "list", "-R", repo, "--json", "name", "-L", "200")}
    for name, color in [("ticket", "5319e7"), ("ready", "0e8a16"),
                        ("in-progress", "fbca04"), ("done", "6e7781")]:
        if name not in existing:
            gh("label", "create", name, "-R", repo, "--color", color, check=False)


def find_issue(repo, t):
    if t.meta["issue"]:
        return int(t.meta["issue"])
    issues = gh_json("issue", "list", "-R", repo, "--state", "all", "-L", "500",
                     "--search", f"\"Ticket {t.id}\" in:title", "--json", "number,title")
    for i in issues or []:
        m = ISSUE_TITLE_RE.match(i["title"])
        if m and m.group(1) == t.id:
            return i["number"]
    return None


class Project:
    """GitHub Projects (v2) board, owned by the repo owner (user or org)."""

    def __init__(self, owner, number):
        q = """query($login:String!,$n:Int!){
          user(login:$login){projectV2(number:$n){...P}}
          organization(login:$login){projectV2(number:$n){...P}} }
          fragment P on ProjectV2 { id title
            field(name:"Status"){ ... on ProjectV2SingleSelectField { id options{ id name } } } }"""
        payload = json.dumps({"query": q, "variables": {"login": owner, "n": number}})
        raw = json.loads(run(["gh", "api", "graphql", "--input", "-"], input=payload, check=False) or "{}")
        data = raw.get("data") or {}
        proj = ((data.get("user") or {}).get("projectV2")
                or (data.get("organization") or {}).get("projectV2"))
        if not proj:
            raise SystemExit(f"Project #{number} of {owner} not found, or PROJECT_TOKEN "
                             f"lacks the 'project' scope.\n{json.dumps(raw.get('errors'))}")
        if not proj.get("field"):
            raise SystemExit("The project has no single-select 'Status' field.")
        self.id = proj["id"]
        self.field_id = proj["field"]["id"]
        self.options = {o["name"].lower(): o["id"] for o in proj["field"]["options"]}
        self.option_for = {}
        for status, names in BOARD_ALIASES.items():
            opt = next((self.options[n] for n in names if n in self.options), None)
            if not opt:
                raise SystemExit(f"Board needs a Status column for {STATUS_LABEL[status]!r}. "
                                 f"Found: {list(self.options)}")
            self.option_for[status] = opt

    def set_status(self, issue_node_id, status):
        item = graphql("""mutation($p:ID!,$c:ID!){
            addProjectV2ItemById(input:{projectId:$p,contentId:$c}){item{id}}}""",
                       p=self.id, c=issue_node_id)["addProjectV2ItemById"]["item"]["id"]
        graphql("""mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){
            updateProjectV2ItemFieldValue(input:{projectId:$p,itemId:$i,fieldId:$f,
              value:{singleSelectOptionId:$o}}){projectV2Item{id}}}""",
                p=self.id, i=item, f=self.field_id, o=self.option_for[status])


def sync_one(repo, project, t):
    """Make the Issue and the board card match ticket file t. Returns True if the file changed."""
    file_changed = False
    labels = ["ticket", t.status]
    num = find_issue(repo, t)
    if num is None:
        url = gh("issue", "create", "-R", repo, "--title", t.issue_title,
                 "--body", issue_body(t), "--label", ",".join(labels))
        num = int(url.rstrip("/").split("/")[-1])
        print(f"  created issue #{num}")
    if str(num) != t.meta["issue"]:
        t.meta["issue"] = str(num)
        t.save()
        file_changed = True

    cur = gh_json("issue", "view", str(num), "-R", repo,
                  "--json", "id,title,body,state,assignees,labels")
    args = []
    if cur["title"] != t.issue_title:
        args += ["--title", t.issue_title]
    if cur["body"].strip() != issue_body(t).strip():
        args += ["--body", issue_body(t)]
    have_labels = {l["name"] for l in cur["labels"]}
    for s in STATUSES:
        if s in have_labels and s != t.status:
            args += ["--remove-label", s]
    for l in labels:
        if l not in have_labels:
            args += ["--add-label", l]
    have = {a["login"].lower(): a["login"] for a in cur["assignees"]}
    want = t.assignee.lower()
    for low, login in have.items():
        if low != want:
            args += ["--remove-assignee", login]
    if want and want not in have:
        args += ["--add-assignee", t.assignee]
    if args:
        gh("issue", "edit", str(num), "-R", repo, *args)

    if t.status == "done" and cur["state"] == "OPEN":
        gh("issue", "close", str(num), "-R", repo, "--reason", "completed")
    elif t.status != "done" and cur["state"] == "CLOSED":
        gh("issue", "reopen", str(num), "-R", repo)

    if project:
        project.set_status(cur["id"], t.status)
    print(f"  #{num} {t.issue_title}: {STATUS_LABEL[t.status]}"
          + (f" @{t.assignee}" if t.assignee else ""))
    return file_changed


def get_project():
    num = os.environ.get("PROJECT_NUMBER", "").strip()
    if not num:
        print("PROJECT_NUMBER is not set: skipping the Project board.")
        return None
    owner = os.environ.get("PROJECT_OWNER") or repo_slug().split("/")[0]
    return Project(owner, int(num))


def cmd_sync_github(a):
    repo = repo_slug()
    ensure_labels(repo)
    project = get_project()
    changed = [t.rel() for t in all_tickets() if sync_one(repo, project, t)]
    write_output("changed", " ".join(changed))


def cmd_from_issue(a):
    """Issues tab -> ticket file. Reads the webhook payload GitHub Actions provides."""
    event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
    issue = event["issue"]
    m = ISSUE_TITLE_RE.match(issue["title"])
    if not m:
        print("Not a ticket issue, nothing to do.")
        return
    t = find(m.group(1))
    assignees = [x["login"] for x in issue.get("assignees") or []]
    current = t.assignee if t.assignee in assignees else (assignees[0] if assignees else "")
    if issue["state"] == "closed":
        status = "done"
    elif current:
        status = "in-progress"
    else:
        status = "ready"
    before = dict(t.meta)
    t.meta.update(assignee=current, status=status, issue=str(issue["number"]))
    if t.meta != before:
        t.save()
        print(f"Ticket {t.id} <- issue #{issue['number']}: {STATUS_LABEL[status]}"
              + (f" @{current}" if current else ""))
        write_output("changed", t.rel())
        write_output("message", f"ticket {t.id}: {STATUS_LABEL[status]}"
                     + (f" (@{current})" if current else "") + f" via issue #{issue['number']}")
    else:
        print("Ticket file already matches the issue.")


def write_output(key, value):
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a") as f:
            f.write(f"{key}={value}\n")


# --------------------------------------------------------------------------- #
def main():
    p = argparse.ArgumentParser(description="Team ticket system (tickets/ on main is the source of truth).")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list", help="show the board").set_defaults(fn=cmd_list)
    s = sub.add_parser("show", help="show one ticket"); s.add_argument("id"); s.set_defaults(fn=cmd_show)
    s = sub.add_parser("new", help="create a ticket")
    s.add_argument("title")
    s.add_argument("-d", "--description", required=True)
    s.add_argument("-c", "--criteria", action="append", help="acceptance criterion (repeatable)")
    s.add_argument("-a", "--assign", help="GitHub username to assign right away")
    s.set_defaults(fn=cmd_new)
    s = sub.add_parser("claim", help="take a ticket (-> In Progress)")
    s.add_argument("id"); s.add_argument("--force", action="store_true"); s.set_defaults(fn=cmd_claim)
    s = sub.add_parser("unclaim", help="release a ticket (-> Ready)"); s.add_argument("id"); s.set_defaults(fn=cmd_unclaim)
    s = sub.add_parser("done", help="finish a ticket (-> Done)"); s.add_argument("id"); s.set_defaults(fn=cmd_done)
    s = sub.add_parser("status", help="set status directly")
    s.add_argument("id"); s.add_argument("status"); s.set_defaults(fn=cmd_status)
    s = sub.add_parser("watch", help="live board from origin/main")
    s.add_argument("-n", "--interval", type=int, default=15); s.set_defaults(fn=cmd_watch)
    sub.add_parser("sync-github", help="(CI) push ticket files to Issues + Project").set_defaults(fn=cmd_sync_github)
    sub.add_parser("from-issue", help="(CI) pull an Issue change into its ticket file").set_defaults(fn=cmd_from_issue)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
