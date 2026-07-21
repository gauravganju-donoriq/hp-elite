import { betterAuth } from "better-auth";
import { admin as adminPlugin } from "better-auth/plugins";
import pool from "./db";

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      // Serve getSession from a short-lived signed cookie instead of
      // querying Postgres on every request. Role/revocation changes
      // propagate within maxAge.
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  plugins: [adminPlugin()],
});
