import bcrypt from "bcryptjs";
import { eq, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { revokedTokens, users, type Role } from "@/db/schema";
import { HttpError } from "./http";
import { bearerToken, verifyToken, type TokenPayload } from "./jwt";

const SALT_ROUNDS = 10;

export const credentialsSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[A-Za-z0-9_]+$/, "Username can only use letters, numbers and _"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters"), // bcrypt ignores anything past 72 bytes
});

// login only checks that both fields are there, the length rules are for signup
export const loginSchema = z.object({
  username: z.string({ required_error: "Username is required" }).trim().min(1, "Username is required"),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

export function hashPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function checkPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export type AuthUser = { id: number; username: string; role: Role };

export function publicUser(u: AuthUser & Record<string, unknown>): AuthUser {
  return { id: u.id, username: u.username, role: u.role };
}

/**
 * Use at the top of any protected route. middleware.ts already rejects bad or
 * expired tokens, this also catches logged-out tokens and deleted users.
 */
export async function requireUser(req: Request): Promise<{ user: AuthUser; token: TokenPayload }> {
  const raw = bearerToken(req);
  const token = raw ? await verifyToken(raw) : null;
  if (!token) throw new HttpError(401, "You need to log in");

  const revoked = await db.query.revokedTokens.findFirst({
    where: eq(revokedTokens.jti, token.jti),
  });
  if (revoked) throw new HttpError(401, "Your session has ended, log in again");

  const user = await db.query.users.findFirst({ where: eq(users.id, Number(token.sub)) });
  if (!user) throw new HttpError(401, "You need to log in");

  return { user: publicUser(user), token };
}

export async function requireAdmin(req: Request) {
  const auth = await requireUser(req);
  if (auth.user.role !== "admin") throw new HttpError(403, "Admins only");
  return auth;
}

export async function revokeToken(token: TokenPayload) {
  await db
    .insert(revokedTokens)
    .values({ jti: token.jti, expiresAt: new Date(token.exp * 1000) })
    .onConflictDoNothing();
  // tidy up rows nobody will ever check again
  await db.delete(revokedTokens).where(lt(revokedTokens.expiresAt, new Date()));
}
