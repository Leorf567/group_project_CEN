// Demo accounts for sprint 1. Safe to run more than once.
// Usage: npm run db:seed   (uses DATABASE_URL and SEED_PASSWORD)
import "./env";
import bcrypt from "bcryptjs";
import { Client } from "pg";

const accounts = [
  { username: "admin_reda", role: "admin" },
  { username: "admin_leo", role: "admin" },
  { username: "nick", role: "member" },
] as const;

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("set SEED_PASSWORD (8+ characters) in .env.local");
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const hash = await bcrypt.hash(password, 10);
    for (const a of accounts) {
      const res = await client.query(
        `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [a.username, hash, a.role],
      );
      console.log(res.rowCount ? `added ${a.username} (${a.role})` : `${a.username} already exists`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
