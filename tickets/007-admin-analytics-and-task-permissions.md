---
id: 007
title: Admin analytics and task permissions
status: in-progress
assignee: Leorf567
issue:
---

## Description

Sprint 2, database and security tier (owner: Leonardo). Covers PBI 11 Admin Analytics View (5 pts) and PBI 13 Task Permissions (5 pts), 10 points total.

Sprint 2 goal: make progress social. Auto-post milestones to friends, and add analytics and admin tools.

- **Task permissions:** only the right users can view or change a mission and its tasks. Add the schema support (migration) for who belongs to a mission and what they can do, and enforce it in the API next to the JWT middleware. A request for someone else's mission or task is rejected and nothing changes.
- **Admin analytics view:** an admin role, and an admin-only view of app-wide analytics (users, missions, tasks, activity), using the processed data from Nicholas (PBI 7). Non-admins are refused.
- Schema changes for Sprint 2 (friends, posts, roles, permissions) go through migration scripts so setup stays repeatable.

## Acceptance criteria

- [ ] Migration adds the tables / columns for roles and mission permissions
- [ ] A user without access to a mission gets 403 when reading or editing its tasks; no row changes
- [ ] The mission owner can still create, update and move tasks as in Sprint 1
- [ ] Admin analytics view shows app-wide totals for an admin user
- [ ] A non-admin requesting the analytics route gets 403

## Notes
