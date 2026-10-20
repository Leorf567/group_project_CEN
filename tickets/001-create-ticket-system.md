---
id: 001
title: Create ticket system
status: done
assignee: Leorf567
issue: 4
---

## Description

Set up the team's ticket system so the four of us can split work without stepping on each other. Each ticket is a Markdown file in `tickets/` on `main`, and it is mirrored automatically to the **Issues** tab (as "Ticket 001 - <name>", with the same description and assignee) and to the **Projects** kanban board (Ready / In Progress / Done).

Anyone on the team can claim a ticket with `python scripts/ticket.py claim <id>`, or by assigning themselves on the Issue. Either way the ticket file on `main`, the Issue and the board card all update to In Progress with that person assigned. Finishing a ticket (`done`, or closing the Issue) moves all three to Done.

This ticket is also the end-to-end test of the system itself.

## Acceptance criteria

- [x] `scripts/ticket.py` supports list, show, new, claim, unclaim, done, status and watch
- [x] Pushing a ticket file to `main` creates/updates the Issue "Ticket 001 - Create ticket system" with the same description
- [x] The Issue is assigned to the same person as the ticket file
- [x] The ticket appears on the Project board in the matching column (Ready / In Progress / Done)
- [ ] Assigning, unassigning or closing the Issue updates the ticket file on `main` and the board
- [x] `TICKETS.md` explains the workflow to the rest of the team

## Notes
