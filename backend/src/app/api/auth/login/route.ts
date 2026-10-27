import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { checkPassword, loginSchema, publicUser } from "@/lib/auth";
import { HttpError, handle, readJson } from "@/lib/http";
import { signToken, verifyToken } from "@/lib/jwt";

export const POST = handle(async (req: Request) => {
  const { username, password } = loginSchema.parse(await readJson(req));

  const user = await db.query.users.findFirst({
    where: sql`lower(${users.username}) = lower(${username})`,
  });

  // same message either way so you can't tell which usernames exist
  if (!user || !(await checkPassword(password, user.passwordHash))) {
    throw new HttpError(401, "Invalid username or password");
  }

  const token = await signToken(user);
  const { exp } = (await verifyToken(token))!;

  return NextResponse.json({
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
    user: publicUser(user),
  });
});
