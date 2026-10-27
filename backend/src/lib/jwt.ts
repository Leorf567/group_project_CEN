import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/db/schema";

// no db imports in here, middleware.ts runs on the edge runtime

export type TokenPayload = {
  sub: string; // user id
  username: string;
  role: Role;
  jti: string;
  exp: number;
};

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET is missing or shorter than 32 characters");
  }
  return new TextEncoder().encode(s);
}

export async function signToken(user: { id: number; username: string; role: Role }) {
  return new SignJWT({ username: user.username, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "1h")
    .sign(secret());
}

/** Returns the payload, or null if the token is bad or expired. */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || !payload.jti || !payload.exp) return null;
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function bearerToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}
