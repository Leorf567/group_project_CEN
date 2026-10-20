# Ticket system

Every piece of work is a **ticket**: a Markdown file in [`tickets/`](tickets/) on `main`.
The ticket file is the source of truth, and a GitHub Action keeps three places in sync:

| Where | What you see |
|---|---|
| `tickets/001-create-ticket-system.md` on `main` | `status:` and `assignee:` in the header, full description |
| **Issues** tab | "Ticket 001 - Create ticket system", same description, same assignee, label `ready` / `in-progress` / `done`, closed when done |
| **Projects** tab (kanban) | Card in **Ready**, **In Progress** or **Done** |

Changes show up on the Issue and the board about a minute after they land on `main`.

**Live board page:** https://leorf567.github.io/group_project_CEN/ — reads the ticket files on `main` and refreshes every 2 minutes.
It's `docs/index.html`, built from `docs/board.body.html` with `python scripts/build_board.py`.

## One-time setup (each teammate)

```bash
git config --global github.user YOUR_GITHUB_USERNAME
```

You need Python 3 and git, nothing else. You must be a collaborator on the repo with push access to `main`.

## Daily use

Run from the repo root, on the `main` branch:

```bash
python scripts/ticket.py list          # the board, in your terminal
python scripts/ticket.py watch         # live board, refreshes from main every 15s
python scripts/ticket.py show 003      # one ticket's details
python scripts/ticket.py claim 003     # it's yours -> In Progress
python scripts/ticket.py unclaim 003   # give it back -> Ready
python scripts/ticket.py done 003      # finished -> Done (Issue gets closed)
```

Then do the actual work on your own branch (`git switch -c ticket-003-login-page`) and open a PR
that says `Closes #<issue number>` — merging it closes the Issue, which marks the ticket Done everywhere.

**Prefer the website?** On the Issue, assign yourself (claim), remove yourself (unclaim) or close it (done).
The Action writes that back into the ticket file on `main` and moves the board card.
Dragging cards on the board does **not** sync back — use the script or the Issue.

If two people claim the same ticket at the same moment, the second one gets
"already claimed by @…" and nothing changes.

## Creating tickets

```bash
python scripts/ticket.py new "Login page" \
  -d "Build the login form and connect it to the auth endpoint." \
  -c "Form validates email and password" -c "Shows an error on bad credentials"
```

Add `-a USERNAME` to assign it immediately. Numbers are picked automatically (next free 3-digit id).
You can edit a ticket's description directly in its file; the Issue picks up the change on the next push.

## Repo owner setup (once)

1. **Project board:** Projects tab → New project → Board. Rename the `Todo` column to `Ready`
   (keep `In Progress` and `Done`). Link it to this repo. Note its number from the URL
   (`github.com/users/Leorf567/projects/<number>`).
2. **Token:** GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) →
   generate one with scopes **repo** and **project**.
3. **Repo settings → Secrets and variables → Actions:**
   - Secret `PROJECT_TOKEN` = the token
   - (Board number is set in `.github/workflows/tickets.yml`, currently 2. A repo variable `PROJECT_NUMBER` overrides it.)
4. **Repo settings → Actions → General → Workflow permissions:** "Read and write permissions".
5. Actions tab → *Ticket sync* → **Run workflow** once to create the Issues and board cards.
