import "../scripts/env";
import { afterAll, beforeAll, beforeEach } from "vitest";

// tests never touch the dev database
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is not set");
process.env.DATABASE_URL = url;
process.env.JWT_SECRET ||= "test-secret-that-is-at-least-32-characters-long";

beforeAll(async () => {
  const { migrate } = await import("../scripts/migrate");
  await migrate(url, () => {});
});

beforeEach(async () => {
  const { pool } = await import("@/db");
  await pool.query("TRUNCATE users, missions, tasks, revoked_tokens RESTART IDENTITY CASCADE");
});

afterAll(async () => {
  const { pool } = await import("@/db");
  await pool.end();
});
