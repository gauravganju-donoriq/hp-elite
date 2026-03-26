import { betterAuth } from "better-auth";
import { admin as adminPlugin } from "better-auth/plugins";
import pool from "./db";

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [adminPlugin()],
});
