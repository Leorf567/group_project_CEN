---
id: 002
title: Accounts, login and database
status: done
assignee: Leorf567
issue: 5
---

## Description

Sprint 1, database and security tier (owner: Leonardo). Covers PBI 1 User Registration (5 pts), PBI 2 User Authentication (5 pts) and PBI 3 Connect Database (3 pts), 13 points total.

Stand up the PostgreSQL database and the account system everything else in the app depends on:

- **Database:** PostgreSQL connection from the API, ORM models, and migration scripts that create the `users`, `missions` and `tasks` tables, so anyone on the team can rebuild the same database from scratch. A health-check endpoint confirms the API can reach the database.
- **Registration:** signup screen plus an API route that creates the user. Passwords are hashed before they are stored, usernames are unique, and a duplicate username returns a clear JSON error ("Username already taken").
- **Authentication:** JWT login, middleware that protects the API routes (missing or expired token returns 401), logout, and token expiry. Support at least two user types, admin and member, as the course requires.

Nicholas's mission/task routes and Reda's board both sit behind this login, so agree on the user/token JSON shape with them early.

## Acceptance criteria

- [x] Migration scripts create `users`, `missions` and `tasks` on a fresh PostgreSQL database
- [x] Health-check endpoint reports the database connection is up
- [x] Register route creates a user with a hashed password (never stored in plain text)
- [x] Duplicate username is rejected with "Username already taken"
- [x] Login returns a JWT; protected routes return 401 without a valid token
- [x] Logout works and expired tokens are rejected
- [x] Users have a role: admin or member
- [x] Test cases TC-REG-001 (register new user) and TC-REG-002 (duplicate username) pass, including the database postcondition

## Demo

About 2 minutes, with a PostgreSQL query open in a second window:

1. Run the migrations on an empty database and hit the health-check endpoint: it reports the database is connected.
2. Register `zebo_dev` from the signup screen: success message, then the dashboard. Run `SELECT username, role, password_hash FROM users;` and show the new row, with a hashed password (TC-REG-001).
3. Try to register `admin_reda`, which already exists: the screen shows "Username already taken" and no new row appears in the table (TC-REG-002).
4. Log in as `zebo_dev` and show the JWT the API returns. Call a protected route with the token (works) and without it (401).
5. Log out and show the protected route is rejected again.

## Notes
