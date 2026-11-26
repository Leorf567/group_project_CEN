import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { missionMembers, missions, tasks, type MissionRole } from "@/db/schema";
import type { AuthUser } from "./auth";
import { HttpError } from "./http";

// view: see the mission and its tasks
// edit: create, update and move tasks
// manage: rename or delete the mission and choose who else is on it
export type MissionAction = "view" | "edit" | "manage";

const ALLOWED: Record<MissionRole | "owner", MissionAction[]> = {
  owner: ["view", "edit", "manage"],
  editor: ["view", "edit"],
  viewer: ["view"],
};

/** The user's role on a mission, or null if they aren't on it. 404 if the mission doesn't exist. */
export async function missionRoleFor(userId: number, missionId: number) {
  const mission = await db.query.missions.findFirst({
    where: eq(missions.id, missionId),
    columns: { ownerId: true },
  });
  if (!mission) throw new HttpError(404, "Mission not found");
  if (mission.ownerId === userId) return "owner" as const;

  const member = await db.query.missionMembers.findFirst({
    where: and(eq(missionMembers.missionId, missionId), eq(missionMembers.userId, userId)),
    columns: { role: true },
  });
  return member?.role ?? null;
}

/**
 * Use in mission routes right after requireUser, before reading or changing anything.
 * Throws 403 if the user can't do this, so the route stops and no row changes.
 */
export async function requireMissionAccess(user: AuthUser, missionId: number, action: MissionAction) {
  const role = await missionRoleFor(user.id, missionId);
  if (!role || !ALLOWED[role].includes(action)) {
    throw new HttpError(403, "You don't have access to this mission");
  }
  return role;
}

/** Same check for a task, through the mission it belongs to. Returns the task's mission id. */
export async function requireTaskAccess(user: AuthUser, taskId: number, action: MissionAction) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    columns: { missionId: true },
  });
  if (!task) throw new HttpError(404, "Task not found");
  await requireMissionAccess(user, task.missionId, action);
  return task.missionId;
}

/** WHERE condition for listing only the missions a user owns or was added to. */
export function missionsVisibleTo(userId: number) {
  return or(
    eq(missions.ownerId, userId),
    inArray(
      missions.id,
      db.select({ id: missionMembers.missionId }).from(missionMembers).where(eq(missionMembers.userId, userId)),
    ),
  );
}
