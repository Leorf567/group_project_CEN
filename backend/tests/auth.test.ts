import { describe, expect, it } from "vitest";
import { pool } from "@/db";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me } from "@/app/api/me/route";
import { GET as health } from "@/app/api/health/route";
import { middleware } from "@/middleware";
import { signToken } from "@/lib/jwt";
import { authedGet, jsonRequest } from "./helpers";

async function signUp(username = "zebo_dev", password = "secret123") {
  return register(jsonRequest("/api/auth/register", { username, password }));
}

async function logIn(username = "zebo_dev", password = "secret123") {
  const res = await login(jsonRequest("/api/auth/login", { username, password }));
  return { res, body: await res.json() };
}

describe("registration", () => {
  it("TC-REG-001: creates a new member with a hashed password", async () => {
    const res = await signUp();
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user).toMatchObject({ username: "zebo_dev", role: "member" });
    expect(body.user.password_hash ?? body.user.passwordHash).toBeUndefined();

    // postcondition: the row is in the database and the password isn't stored as typed
    const { rows } = await pool.query("SELECT * FROM users WHERE username = 'zebo_dev'");
    expect(rows).toHaveLength(1);
    expect(rows[0].password_hash).not.toBe("secret123");
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  it("TC-REG-002: rejects a username that is already taken", async () => {
    await signUp("admin_reda");
    const res = await signUp("admin_reda", "different123");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Username already taken" });

    // postcondition: still only one admin_reda
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM users");
    expect(rows[0].n).toBe(1);
  });

  it("treats usernames as case-insensitive", async () => {
    await signUp("zebo_dev");
    const res = await signUp("Zebo_Dev");
    expect(res.status).toBe(409);
  });

  it("validates username and password", async () => {
    const short = await signUp("zebo_dev", "short");
    expect(short.status).toBe(400);
    expect((await short.json()).error).toBe("Password must be at least 8 characters");

    const bad = await signUp("no spaces allowed");
    expect(bad.status).toBe(400);

    const missing = await register(jsonRequest("/api/auth/register", {}));
    expect(missing.status).toBe(400);
    expect((await missing.json()).error).toBe("Username is required");

    const notJson = await register(jsonRequest("/api/auth/register", "{oops"));
    expect(notJson.status).toBe(400);

    const { rows } = await pool.query("SELECT count(*)::int AS n FROM users");
    expect(rows[0].n).toBe(0);
  });

  it("never lets someone sign themselves up as admin", async () => {
    const res = await register(
      jsonRequest("/api/auth/register", { username: "sneaky", password: "secret123", role: "admin" }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).user.role).toBe("member");
  });
});

describe("login and protected routes", () => {
  it("returns a JWT that works on protected routes", async () => {
    await signUp();
    const { res, body } = await logIn();
    expect(res.status).toBe(200);
    expect(body.token.split(".")).toHaveLength(3);
    expect(body.user).toMatchObject({ username: "zebo_dev", role: "member" });
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const meRes = await me(authedGet("/api/me", body.token));
    expect(meRes.status).toBe(200);
    expect((await meRes.json()).user.username).toBe("zebo_dev");
  });

  it("rejects a wrong password with the same message as an unknown user", async () => {
    await signUp();
    const wrong = await logIn("zebo_dev", "wrongpass1");
    const unknown = await logIn("nobody", "secret123");
    expect(wrong.res.status).toBe(401);
    expect(unknown.res.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("returns 401 without a token", async () => {
    const res = await me(authedGet("/api/me"));
    expect(res.status).toBe(401);
  });

  it("logout ends the session", async () => {
    await signUp();
    const { body } = await logIn();
    const out = await logout(jsonRequest("/api/auth/logout", undefined, body.token));
    expect(out.status).toBe(200);

    const after = await me(authedGet("/api/me", body.token));
    expect(after.status).toBe(401);

    // postcondition: the token is recorded as revoked
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM revoked_tokens");
    expect(rows[0].n).toBe(1);
  });

  it("rejects an expired token", async () => {
    await signUp();
    process.env.JWT_EXPIRES_IN = "-1s";
    try {
      const token = await signToken({ id: 1, username: "zebo_dev", role: "member" });
      expect((await me(authedGet("/api/me", token))).status).toBe(401);
    } finally {
      delete process.env.JWT_EXPIRES_IN;
    }
  });
});

describe("middleware", () => {
  it("lets public routes through and blocks protected ones without a token", async () => {
    const open = await middleware(authedGet("/api/health"));
    expect(open.status).toBe(200);
    expect(open.headers.get("x-middleware-next")).toBe("1");

    const blocked = await middleware(authedGet("/api/missions"));
    expect(blocked.status).toBe(401);
  });

  it("lets a valid token through", async () => {
    const token = await signToken({ id: 1, username: "zebo_dev", role: "member" });
    const res = await middleware(authedGet("/api/missions", token));
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("answers CORS preflight requests", async () => {
    const res = await middleware(jsonRequest("/api/missions", undefined, undefined, "OPTIONS"));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-headers")).toContain("Authorization");
  });
});

describe("health check", () => {
  it("reports the database is connected", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", database: "connected" });
  });
});
