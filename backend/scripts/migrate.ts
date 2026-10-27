// Runs every db/migrations/*.sql file that hasn't been run yet, in order.
// Usage: npm run db:migrate   (uses DATABASE_URL)
import "./env";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const MIGRATIONS_DIR = path.join(__dirname, "..", "db", "migrations");

export async function migrate(connectionString: string, log = console.log) {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name   TEXT PRIMARY KEY,
        run_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const done = new Set(
      (await client.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name),
    );
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      // one transaction per file so a broken migration doesn't leave half a schema
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        log(`ran ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`${file} failed: ${(err as Error).message}`);
      }
    }
    if (files.every((f) => done.has(f))) log("database is up to date");
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set (copy .env.example to .env.local)");
    process.exit(1);
  }
  migrate(url).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
