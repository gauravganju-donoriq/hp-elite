import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=")
    ? { rejectUnauthorized: false }
    : undefined,
});

const EMAIL = "solmourtaza@gmail.com";

async function setAdmin() {
  const res = await pool.query(
    `UPDATE "user" SET role = 'admin' WHERE email = $1 RETURNING id, email, role`,
    [EMAIL]
  );

  if (res.rowCount === 0) {
    console.error(`No user found with email ${EMAIL}`);
    process.exit(1);
  }

  const user = res.rows[0];
  console.log(`Admin role set for user ${user.id} (${user.email}), role: ${user.role}`);
  await pool.end();
}

setAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
