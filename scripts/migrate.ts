import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const schemaPath = path.join(__dirname, "../src/lib/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  const alterStatements = [
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS years_experience INTEGER NOT NULL DEFAULT 0`,
  ];

  console.log("Running migration...");
  try {
    await pool.query(sql);
    for (const stmt of alterStatements) {
      await pool.query(stmt);
    }
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
