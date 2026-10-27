import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { credentialsSchema, hashPassword, publicUser } from "@/lib/auth";
import { HttpError, handle, readJson } from "@/lib/http";

// Postgres error code for a unique constraint violation
const UNIQUE_VIOLATION = "23505";

export const POST = handle(async (req: Request) => {
  const { username, password } = credentialsSchema.parse(await readJson(req));
  const passwordHash = await hashPassword(password);

  try {
    // new accounts are always members, admins are made with the seed script
    const [user] = await db
      .insert(users)
      .values({ username, passwordHash, role: "member" })
      .returning();
    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, "Username already taken");
    throw err;
  }
});

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  // drizzle wraps the pg error in `cause` in newer versions
  const e = err as { code?: string; cause?: unknown };
  return e.code === UNIQUE_VIOLATION || isUniqueViolation(e.cause);
}
