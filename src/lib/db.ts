import { Pool } from "pg";
import { getPoolConfig } from "./pg-ssl";

const pool = new Pool(getPoolConfig());

export default pool;
