import "dotenv/config";
import { auth } from "../src/lib/auth";
import pool from "../src/lib/db";

const NEW_PASSWORD = "HPEBSUMMER2026!&*";
const EXCLUDE_EMAIL = "solmourtaza@gmail.com";

async function run() {
  // Hash using Better Auth's own hasher so the credentials remain valid for login.
  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(NEW_PASSWORD);

  const { rows: users } = await pool.query<{ id: string; email: string }>(
    `SELECT id, email FROM "user" WHERE lower(email) <> lower($1) ORDER BY email`,
    [EXCLUDE_EMAIL]
  );

  let updated = 0;
  let skipped = 0;
  for (const u of users) {
    const res = await pool.query(
      `UPDATE account SET password = $1, "updatedAt" = now()
       WHERE "userId" = $2 AND "providerId" = 'credential'`,
      [hashed, u.id]
    );
    if ((res.rowCount ?? 0) > 0) {
      updated++;
      console.log(`reset: ${u.email}`);
    } else {
      skipped++;
      console.log(`skipped (no credential account): ${u.email}`);
    }
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped}. Excluded ${EXCLUDE_EMAIL}.`);
  await pool.end();
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
