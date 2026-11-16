import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { getPoolConfig } from "./pg-ssl";

// The DigitalOcean database allows only ~22 client connections in total,
// shared across every concurrent Vercel instance, so each instance must keep
// its own pool small and drop idle connections quickly.
const pool = new Pool({
  ...getPoolConfig(),
  max: 3,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 10_000,
});

attachDatabasePool(pool);

export default pool;
