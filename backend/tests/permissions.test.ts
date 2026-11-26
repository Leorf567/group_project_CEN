import { describe, expect, it } from "vitest";
import { db, pool } from "@/db";
import { missions } from "@/db/schema";
import { requireAdmin, type AuthUser } from "@/lib/auth";
import { HttpError } from "@/lib/http";
import { signToken } from "@/lib/jwt";
import {
  missionsVisibleTo,
  requireMissionAccess,
  requireTaskAccess,
  type MissionAction,
} from "@/lib/permissions";
import { authedGet } from "./helpers";

async function addUser(username: string, role: "admin" | "member" = "member"): Promise<AuthUser> {
  const { rows } = await pool.query(
    "INSERT INTO users (username, password_hash, role) VALUES ($1, 'x', $2) RETURNING id, username, role",
    [username, role],
  );
  return rows[0];
}

// owner leo, editor reda, viewer nick, and outsider sam who isn't on the mission
async function setUp() {
  const leo = await addUser("leo");
  const reda = await addUser("reda");
  const nick = await addUser("nick");
  const sam = await addUser("sam");
  const { rows: m } = await pool.query(
    "INSERT INTO missions (owner_id, title) VALUES ($1, 'Capstone') RETURNING id",
    [leo.id],
  );
  const missionId: number = m[0].id;
  const { rows: t } = await pool.query(
    "INSERT INTO tasks (mission_id, title) VALUES ($1, 'Implement Next.js Routing') RETURNING id",
    [missionId],
  );
  await pool.query(
    "INSERT INTO mission_members (mission_id, user_id, role) VALUES ($1, $2, 'editor'), ($1, $3, 'viewer')",
    [missionId, reda.id, nick.id],
  );
  return { leo, reda, nick, sam, missionId, taskId: t[0].id as number };
}

async function statusOf(promise: Promise<unknown>) {
  try {
    await promise;
    return 200;
  } catch (err) {
    if (err instanceof HttpError) return err.status;
    throw err;
  }
}

describe("mission permissions", () => {
  it("lets each role do only what it should", async () => {
    const { leo, reda, nick, sam, missionId } = await setUp();
    const expected: [AuthUser, MissionAction, number][] = [
      [leo, "view", 200],
      [leo, "edit", 200],
      [leo, "manage", 200],
      [reda, "view", 200],
      [reda, "edit", 200],
      [reda, "manage", 403],
      [nick, "view", 200],
      [nick, "edit", 403],
      [nick, "manage", 403],
      [sam, "view", 403],
      [sam, "edit", 403],
      [sam, "manage", 403],
    ];
    for (const [user, action, status] of expected) {
      const got = await statusOf(requireMissionAccess(user, missionId, action));
      expect(got, `${user.username} ${action}`).toBe(status);
    }
  });

  it("checks tasks through their mission", async () => {
    const { leo, nick, sam, missionId, taskId } = await setUp();
    expect(await requireTaskAccess(leo, taskId, "edit")).toBe(missionId);
    expect(await statusOf(requireTaskAccess(nick, taskId, "view"))).toBe(200);
    expect(await statusOf(requireTaskAccess(nick, taskId, "edit"))).toBe(403);
    expect(await statusOf(requireTaskAccess(sam, taskId, "view"))).toBe(403);
  });

  it("returns 404 for a mission or task that doesn't exist", async () => {
    const { leo } = await setUp();
    expect(await statusOf(requireMissionAccess(leo, 9999, "view"))).toBe(404);
    expect(await statusOf(requireTaskAccess(leo, 9999, "view"))).toBe(404);
  });

  it("an admin gets no extra access to someone else's mission", async () => {
    const { missionId } = await setUp();
    const admin = await addUser("admin_leo", "admin");
    expect(await statusOf(requireMissionAccess(admin, missionId, "view"))).toBe(403);
  });

  it("loses access when removed from the mission", async () => {
    const { reda, missionId } = await setUp();
    await pool.query("DELETE FROM mission_members WHERE user_id = $1", [reda.id]);
    expect(await statusOf(requireMissionAccess(reda, missionId, "view"))).toBe(403);
  });

  it("lists only the missions a user owns or was added to", async () => {
    const { leo, reda, sam } = await setUp();
    await pool.query("INSERT INTO missions (owner_id, title) VALUES ($1, 'Sam solo')", [sam.id]);
    const titles = async (userId: number) =>
      (await db.select({ title: missions.title }).from(missions).where(missionsVisibleTo(userId)))
        .map((r) => r.title)
        .sort();
    expect(await titles(leo.id)).toEqual(["Capstone"]);
    expect(await titles(reda.id)).toEqual(["Capstone"]);
    expect(await titles(sam.id)).toEqual(["Sam solo"]);
  });
});

describe("admin-only routes", () => {
  it("lets an admin through and refuses a member with 403", async () => {
    const admin = await addUser("admin_reda", "admin");
    const member = await addUser("nick");
    const adminToken = await signToken(admin);
    const memberToken = await signToken(member);

    const ok = await requireAdmin(authedGet("/api/admin/analytics", adminToken));
    expect(ok.user.role).toBe("admin");
    expect(await statusOf(requireAdmin(authedGet("/api/admin/analytics", memberToken)))).toBe(403);
    expect(await statusOf(requireAdmin(authedGet("/api/admin/analytics")))).toBe(401);
  });
});

describe("sprint 2 schema", () => {
  it("keeps one friendship per pair and none with yourself", async () => {
    const a = await addUser("reda");
    const b = await addUser("nick");
    await pool.query("INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)", [a.id, b.id]);
    await expect(
      pool.query("INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)", [b.id, a.id]),
    ).rejects.toThrow(/friendships_pair_unique/);
    await expect(
      pool.query("INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $1)", [a.id]),
    ).rejects.toThrow(/friendships_check/);
  });

  it("rejects an empty post and adding the same member twice", async () => {
    const { leo, reda, missionId } = await setUp();
    await expect(pool.query("INSERT INTO posts (author_id, body) VALUES ($1, '   ')", [leo.id])).rejects.toThrow(
      /posts_body_check/,
    );
    await expect(
      pool.query("INSERT INTO mission_members (mission_id, user_id) VALUES ($1, $2)", [missionId, reda.id]),
    ).rejects.toThrow(/mission_members_pkey/);
  });
});
