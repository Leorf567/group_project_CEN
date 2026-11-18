---
id: 005
title: Friends, social feed and dashboard
status: in-progress
assignee: refloow-0
issue: 12
---

## Description

Sprint 2, frontend tier (owner: Reda). Covers PBI 8 Interactive Dashboard (5 pts), PBI 14 Friends List (5 pts) and PBI 15 Private Social Feed (3 pts), 13 points total.

Sprint 2 goal: make progress social. Auto-post milestones to friends, and add analytics and admin tools.

- **Friends list:** a screen to search for users by username, send a friend request, accept or decline incoming requests, and see the current friends list. Talks to the API through Nicholas's network client.
- **Private social feed:** a feed screen showing posts from the user and their friends only, newest first. The user can post a text update. Milestone posts created automatically by the API (Nicholas, PBI 9) show up here too.
- **Interactive dashboard:** a screen with the user's progress across missions (tasks per status, completed over time), built from the processed data Nicholas exposes (PBI 7). Filters by mission and date range update the view without a reload.

## Acceptance criteria

- [ ] User can send, accept and decline friend requests, and the friends list updates
- [ ] Feed only shows posts from the user and their friends; a non-friend's posts never appear
- [ ] Posting a text update puts it at the top of the feed timeline
- [ ] Auto-posted milestones from the API appear in friends' feeds
- [ ] Dashboard shows per-mission progress and reacts to the mission / date filters
- [ ] Test case TC-SOC-001 (post a text update to the feed) passes, including the database postcondition

## Notes
