import "dotenv/config";
import { randomBytes } from "crypto";
import { Pool } from "pg";
import { getPoolConfig } from "../src/lib/pg-ssl";
import { auth } from "../src/lib/auth";

// Usage:
//   npx tsx scripts/create-admin.ts <email> [password]
//   ADMIN_EMAIL=foo@bar.com ADMIN_PASSWORD=... npx tsx scripts/create-admin.ts
//
// If a user with the given email already exists, they are promoted to admin.
// Otherwise a new admin account is created (using the provided password, or a
// randomly generated one that is printed so it can be shared).

const EMAIL = process.argv[2] || process.env.ADMIN_EMAIL || "quanitop@gmail.com";
const PASSWORD_ARG = process.argv[3] || process.env.ADMIN_PASSWORD;

async function main() {
  const pool = new Pool(getPoolConfig());

  try {
    const existing = await pool.query(
      `SELECT id, email, role FROM "user" WHERE lower(email) = lower($1) LIMIT 1`,
      [EMAIL]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      const user = existing.rows[0];
      await pool.query(
        `UPDATE "user" SET role = 'admin', "updatedAt" = now() WHERE id = $1`,
        [user.id]
      );
      console.log(
        `Promoted existing user ${user.id} (${user.email}) to admin.`
      );
      return;
    }

    const password = PASSWORD_ARG || randomBytes(9).toString("base64url");
    const created = await auth.api.createUser({
      body: {
        email: EMAIL,
        password,
        name: EMAIL.split("@")[0],
        role: "admin",
      },
    });

    if (!created) {
      throw new Error("Failed to create admin account");
    }

    console.log(`Created new admin account ${created.user.id} (${EMAIL}).`);
    if (!PASSWORD_ARG) {
      console.log(`Temporary password: ${password}`);
      console.log("Share this password securely and reset it after first login.");
    }
  } finally {
    await pool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err);
    process.exit(1);
  });
