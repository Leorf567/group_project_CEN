---
id: 006
title: Dataset processing, milestone auto-posts and reports
status: in-progress
assignee: nickdevito22
issue:
---

## Description

Sprint 2, backend and networking tier (owner: Nicholas). Covers PBI 7 Process Dataset (5 pts), PBI 9 Auto-Post Milestones (5 pts) and PBI 12 Export Reports (3 pts), 13 points total.

Sprint 2 goal: make progress social. Auto-post milestones to friends, and add analytics and admin tools.

- **Process dataset:** API routes that aggregate missions and tasks into progress data (tasks per status, completions over time, per user and per mission). This feeds Reda's dashboard (PBI 8) and Leonardo's admin analytics view (PBI 11).
- **Auto-post milestones:** when a user hits a milestone (for example, a mission's tasks all moved to Done), the API creates a post in the social feed automatically, visible to that user's friends.
- **Export reports:** a route that exports a user's or mission's progress report as a downloadable file (CSV).
- **JSON contracts:** document every new route's request and response, same as Sprint 1.

## Acceptance criteria

- [ ] Progress routes return correct aggregates for a user and for a mission, behind the JWT middleware
- [ ] Completing a milestone creates exactly one feed post, visible only to the user's friends
- [ ] Export route returns a report file with the user's / mission's progress
- [ ] Missing or expired token returns 401 on every new route
- [ ] Every new route's JSON request/response is documented in the repo

## Notes
