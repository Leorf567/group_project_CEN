---
id: 004
title: Kanban board and local sync
status: in-progress
assignee: refloow-0
issue: 7
---

## Description

Sprint 1, frontend tier (owner: Reda). Covers the Kanban board (8 pts) and the local state sync (8 pts), 16 points total.

Build the screens users actually see and make task moves feel instant:

- **Screens:** login, signup and new-mission screens, wired to the API through Nicholas's network client and Leonardo's auth routes.
- **Kanban board:** To Do, In Progress and Done columns for a mission. Add a task, and drag a card between columns. A task with no title is blocked: the field turns red with "Title is required".
- **Local state sync:** when a card moves, update local state first so the UI responds immediately, then a background queue syncs the change to the API. When the API confirms, swap the temporary card for the saved one. Heavier local processing goes to the C++ module through Java Native Access, as planned.
- Statuses must survive closing and reopening the app, because they are saved in the database, not just on screen.

## Acceptance criteria

- [ ] Login, signup and new-mission screens work end to end against the API
- [ ] Board shows To Do / In Progress / Done for the selected mission
- [ ] Adding a task puts its card in To Do right away
- [ ] Dragging a card updates the UI instantly and the change is saved through the sync queue
- [ ] Closing and reopening the app shows the cards in the same columns
- [ ] Empty title turns the field red with "Title is required"
- [ ] Test cases TC-KAN-001 (add a task) and TC-KAN-002 (empty title) pass, including the database postcondition

## Demo

About 3 minutes, screen-sharing the running app. This is the main live demo, frontend to backend:

1. Register `zebo_dev`, then log in (Leonardo shows the new row in `users`).
2. Create a mission and add the task "Implement Next.js Routing": the card appears in To Do right away (TC-KAN-001).
3. Drag the card to In Progress. Close the app, reopen it and log back in: the card is still in In Progress, so the status was saved in PostgreSQL.
4. Try to save a task with no title: the field turns red with "Title is required" (TC-KAN-002).
5. Hand off to Nicholas to show what that task request looked like on the wire.

## Notes
