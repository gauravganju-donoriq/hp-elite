import "dotenv/config";
import { Pool } from "pg";
import { poolConfigFor } from "../src/lib/pg-ssl";

/**
 * Compares row counts for every public table between the source database
 * (Azure, SOURCE_DATABASE_URL) and the target database (DigitalOcean,
 * DATABASE_URL). Exits non-zero if any table is missing on the target or if
 * any row count differs.
 */

async function tableCounts(pool: Pool): Promise<Map<string, number>> {
  const { rows: tables } = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );

  const counts = new Map<string, number>();
  for (const { table_name } of tables) {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "${table_name}"`
    );
    counts.set(table_name, Number(rows[0].count));
  }
  return counts;
}

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.DATABASE_URL;

  if (!sourceUrl) {
    console.error("SOURCE_DATABASE_URL is not set (should point to Azure). Aborting.");
    process.exit(1);
  }
  if (!targetUrl) {
    console.error("DATABASE_URL is not set (should point to DigitalOcean). Aborting.");
    process.exit(1);
  }

  const source = new Pool(poolConfigFor(sourceUrl));
  const target = new Pool(poolConfigFor(targetUrl));

  try {
    console.log("Comparing row counts: Azure (source) vs DigitalOcean (target)\n");

    const [srcCounts, tgtCounts] = await Promise.all([
      tableCounts(source),
      tableCounts(target),
    ]);

    const allTables = Array.from(
      new Set([...srcCounts.keys(), ...tgtCounts.keys()])
    ).sort();

    const nameWidth = Math.max(10, ...allTables.map((t) => t.length));
    console.log(
      `${"table".padEnd(nameWidth)}  ${"azure".padStart(10)}  ${"do".padStart(10)}  status`
    );
    console.log("-".repeat(nameWidth + 34));

    let mismatches = 0;
    for (const table of allTables) {
      const src = srcCounts.get(table);
      const tgt = tgtCounts.get(table);
      const srcStr = src === undefined ? "-" : String(src);
      const tgtStr = tgt === undefined ? "-" : String(tgt);
      const ok = src !== undefined && tgt !== undefined && src === tgt;
      if (!ok) mismatches++;
      console.log(
        `${table.padEnd(nameWidth)}  ${srcStr.padStart(10)}  ${tgtStr.padStart(10)}  ${ok ? "OK" : "MISMATCH"}`
      );
    }

    console.log();
    if (mismatches > 0) {
      console.error(`FAILED: ${mismatches} table(s) do not match.`);
      process.exit(1);
    }
    console.log(`SUCCESS: all ${allTables.length} tables match.`);
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  } finally {
    await source.end();
    await target.end();
  }
}

main();
