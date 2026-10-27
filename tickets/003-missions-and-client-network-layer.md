---
id: 003
title: Missions and client network layer
status: in-progress
assignee: nickdevito22
issue: 6
---

## Description

Sprint 1, backend and networking tier (owner: Nicholas). Covers PBI 4 Create a Mission and PBI 10 Client Network Handling.

Build the Next.js API (TypeScript) routes and the client's network layer that connect the frontend to the database:

- **Missions and tasks API:** create and update routes for missions and tasks, behind the JWT middleware. `POST /api/tasks` takes JSON with the mission ID, title, description and a status of `TODO`, validates the body, inserts the row in PostgreSQL and returns **201 Created** with the saved task, including its database ID. An empty title returns **400** with "Title is required". A missing or expired token returns **401**.
- **Client network handling:** one HTTP client the frontend uses for every call, with timeouts, error handling, and the JWT sent in the `Authorization` header on every request after login.
- **JSON contracts:** document the request and response payloads for each route, so the client and the API expect the same shapes. This was one of our biggest risks from Sprint 0.

## Acceptance criteria

- [ ] Create-mission route saves a mission for the logged-in user
- [ ] `POST /api/tasks` returns 201 with the saved task and its ID
- [ ] Update route changes a task's status (TODO / IN_PROGRESS / DONE) and saves it
- [ ] Empty title returns 400 "Title is required"; no token returns 401
- [ ] Client HTTP wrapper adds the JWT, times out cleanly and shows API errors to the user
- [ ] Every route's JSON request/response is documented in the repo
- [ ] Test case TC-KAN-002 (empty title) passes on the API side

## Demo

About 2 minutes, with the browser dev tools Network tab (or a terminal) open:

1. While Reda creates the task "Implement Next.js Routing", show the `POST /api/tasks` request: the `Authorization: Bearer <JWT>` header and the JSON body (mission ID, title, description, status `TODO`).
2. Show the **201 Created** response with the task's new database ID, then the same row in the `tasks` table.
3. Send the same request with no token: **401**, nothing saved.
4. Send it with an empty title: **400** "Title is required", the same message the board shows on screen.
5. Open the documented JSON contract for that route and point out it matches what we just saw on the wire.

## Notes
