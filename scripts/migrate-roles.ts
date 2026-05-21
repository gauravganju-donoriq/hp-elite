import "dotenv/config";
import { Pool } from "pg";

const ROLE_MAP: Record<string, string> = {
  "head-coach": "lead",
  "assistant-coach": "experience",
  volunteer: "junior",
  intern: "trial",
};

const NEW_ROLES = ["lead", "experience", "junior", "trial"];
const CONSTRAINT_NAME = "staff_role_check";

async function migrateRoles() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Aborting.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  const client = await pool.connect();

  try {
    console.log("Starting role migration...\n");

    const { rows: beforeRows } = await client.query<{ role: string; count: string }>(
      `SELECT role, COUNT(*)::text AS count FROM staff GROUP BY role ORDER BY role`
    );
    console.log("Before migration:");
    if (beforeRows.length === 0) {
      console.log("  (no staff rows)");
    } else {
      for (const row of beforeRows) {
        console.log(`  ${row.role}: ${row.count}`);
      }
    }
    console.log();

    await client.query("BEGIN");

    await client.query(
      `ALTER TABLE staff DROP CONSTRAINT IF EXISTS ${CONSTRAINT_NAME}`
    );

    let totalUpdated = 0;
    for (const [oldRole, newRole] of Object.entries(ROLE_MAP)) {
      const result = await client.query(
        `UPDATE staff SET role = $1 WHERE role = $2`,
        [newRole, oldRole]
      );
      if (result.rowCount && result.rowCount > 0) {
        console.log(`  ${oldRole} -> ${newRole}: updated ${result.rowCount} row(s)`);
        totalUpdated += result.rowCount;
      }
    }
    if (totalUpdated === 0) {
      console.log("  No rows needed remapping (already migrated or empty).");
    }

    const { rows: invalidRows } = await client.query<{ role: string; count: string }>(
      `SELECT role, COUNT(*)::text AS count FROM staff
       WHERE role NOT IN (${NEW_ROLES.map((_, i) => `$${i + 1}`).join(", ")})
       GROUP BY role`,
      NEW_ROLES
    );
    if (invalidRows.length > 0) {
      console.error("\nERROR: Found staff rows with unknown roles:");
      for (const row of invalidRows) {
        console.error(`  ${row.role}: ${row.count}`);
      }
      console.error("Rolling back. Please resolve these rows manually before re-running.");
      await client.query("ROLLBACK");
      process.exit(1);
    }

    const roleLiterals = NEW_ROLES.map((r) => `'${r}'`).join(", ");
    await client.query(
      `ALTER TABLE staff ADD CONSTRAINT ${CONSTRAINT_NAME} CHECK (role IN (${roleLiterals}))`
    );

    await client.query("COMMIT");

    const { rows: afterRows } = await client.query<{ role: string; count: string }>(
      `SELECT role, COUNT(*)::text AS count FROM staff GROUP BY role ORDER BY role`
    );
    console.log("\nAfter migration:");
    if (afterRows.length === 0) {
      console.log("  (no staff rows)");
    } else {
      for (const row of afterRows) {
        console.log(`  ${row.role}: ${row.count}`);
      }
    }

    console.log("\nRole migration completed successfully.");
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
    }
    console.error("\nRole migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateRoles();
