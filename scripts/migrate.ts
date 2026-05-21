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
    `ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check`,
    `UPDATE staff SET role = 'lead' WHERE role = 'head-coach'`,
    `UPDATE staff SET role = 'experience' WHERE role = 'assistant-coach'`,
    `UPDATE staff SET role = 'junior' WHERE role = 'volunteer'`,
    `UPDATE staff SET role = 'trial' WHERE role = 'intern'`,
    `ALTER TABLE staff ADD CONSTRAINT staff_role_check CHECK (role IN ('lead', 'experience', 'junior', 'trial'))`,
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
