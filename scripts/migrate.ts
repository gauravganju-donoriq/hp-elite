import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { getPoolConfig } from "../src/lib/pg-ssl";

async function migrate() {
  const pool = new Pool(getPoolConfig());

  const schemaPath = path.join(__dirname, "../src/lib/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  const classTypeSeeds: Array<{
    id: string;
    label: string;
    colorKey: string;
    sortOrder: number;
  }> = [
    { id: "hp-speed", label: "HP Speed", colorKey: "blue", sortOrder: 10 },
    { id: "hp-speed-2", label: "HP Speed 2", colorKey: "blue", sortOrder: 20 },
    { id: "hp-flight", label: "HP Flight", colorKey: "sky", sortOrder: 30 },
    { id: "footskills", label: "Footskills", colorKey: "purple", sortOrder: 40 },
    { id: "first-touch-tempo", label: "First Touch & Tempo", colorKey: "violet", sortOrder: 50 },
    { id: "complete-player", label: "Complete Player", colorKey: "emerald", sortOrder: 60 },
    { id: "1v1-transition", label: "1v1 Transition", colorKey: "orange", sortOrder: 70 },
    { id: "shooting-finishing", label: "Shooting & Finishing", colorKey: "red", sortOrder: 80 },
    { id: "ball-masters", label: "Ball Masters", colorKey: "amber", sortOrder: 90 },
    { id: "streetball", label: "Streetball", colorKey: "lime", sortOrder: 100 },
    { id: "tournament-prep", label: "Tournament Prep", colorKey: "rose", sortOrder: 110 },
    { id: "u5u6-minis", label: "U5/U6 Minis", colorKey: "pink", sortOrder: 120 },
    { id: "u7u8-futures-footskills", label: "U7/U8 Futures Footskills", colorKey: "fuchsia", sortOrder: 130 },
    { id: "u7u8-futures-ball-striking", label: "U7/U8 Futures Ball Striking", colorKey: "fuchsia", sortOrder: 140 },
    { id: "u7u8-futures-complete-player", label: "U7/U8 Futures Complete Player", colorKey: "fuchsia", sortOrder: 150 },
    { id: "general", label: "General", colorKey: "gray", sortOrder: 160 },
  ];

  // Built-in auto-assign profiles. These mirror the original hardcoded
  // STRATEGY_PLAN so the picker has sensible defaults; admins can edit, add,
  // or remove them from Settings.
  const autoAssignProfileSeeds: Array<{
    id: string;
    name: string;
    plan: Array<{ roles: string[]; max?: number; preferSeniorFirst: boolean }>;
    sortOrder: number;
  }> = [
    {
      id: "cheap",
      name: "Cheap",
      sortOrder: 10,
      plan: [
        { roles: ["trial"], preferSeniorFirst: false },
        { roles: ["junior"], preferSeniorFirst: false },
        { roles: ["experience"], preferSeniorFirst: false },
        { roles: ["lead"], preferSeniorFirst: false },
      ],
    },
    {
      id: "balanced",
      name: "Balanced",
      sortOrder: 20,
      plan: [
        { roles: ["lead"], max: 1, preferSeniorFirst: true },
        { roles: ["experience"], max: 1, preferSeniorFirst: true },
        { roles: ["junior"], preferSeniorFirst: true },
        { roles: ["trial"], preferSeniorFirst: true },
        { roles: ["experience"], preferSeniorFirst: true },
        { roles: ["lead"], preferSeniorFirst: true },
      ],
    },
    {
      id: "expensive",
      name: "Expensive",
      sortOrder: 30,
      plan: [
        { roles: ["lead"], max: 1, preferSeniorFirst: true },
        { roles: ["experience"], max: 2, preferSeniorFirst: true },
        { roles: ["trial"], preferSeniorFirst: false },
        { roles: ["junior"], preferSeniorFirst: true },
        { roles: ["experience"], preferSeniorFirst: true },
        { roles: ["lead"], preferSeniorFirst: true },
      ],
    },
    {
      id: "most-experienced",
      name: "Most Experienced",
      sortOrder: 40,
      plan: [
        {
          roles: ["lead", "experience", "junior", "trial"],
          preferSeniorFirst: true,
        },
      ],
    },
  ];

  const alterStatements = [
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS years_experience INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_role_check`,
    `UPDATE staff SET role = 'lead' WHERE role = 'head-coach'`,
    `UPDATE staff SET role = 'experience' WHERE role = 'assistant-coach'`,
    `UPDATE staff SET role = 'junior' WHERE role = 'volunteer'`,
    `UPDATE staff SET role = 'trial' WHERE role = 'intern'`,
    `ALTER TABLE staff ADD CONSTRAINT staff_role_check CHECK (role IN ('lead', 'experience', 'junior', 'trial'))`,
    `ALTER TABLE training_session DROP CONSTRAINT IF EXISTS training_session_class_type_fkey`,
    // Per-assignment worked window for partial shifts / payroll tracking.
    `ALTER TABLE session_slot ADD COLUMN IF NOT EXISTS assigned_start_time TEXT`,
    `ALTER TABLE session_slot ADD COLUMN IF NOT EXISTS assigned_end_time TEXT`,
    // Report kind: 'hours' (weekly/monthly breakdown) or 'payroll' (per-day).
    `ALTER TABLE report ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'hours'`,
    `ALTER TABLE report DROP CONSTRAINT IF EXISTS report_kind_check`,
    `ALTER TABLE report ADD CONSTRAINT report_kind_check CHECK (kind IN ('hours', 'payroll'))`,
  ];

  const postSeedStatements = [
    `UPDATE training_session SET class_type = NULL WHERE class_type IS NOT NULL AND class_type NOT IN (SELECT id FROM class_type)`,
    `ALTER TABLE training_session ADD CONSTRAINT training_session_class_type_fkey FOREIGN KEY (class_type) REFERENCES class_type(id) ON DELETE SET NULL`,
  ];

  // Cleanup duplicates so the partial-unique indexes can be created safely.
  // For staff.user_id: when multiple rows share a user_id, keep the earliest
  // (by created_at) and null out the rest. Log the dropped links so an admin
  // can re-link manually if needed.
  const dedupeStatements = [
    `WITH dupes AS (
       SELECT id, user_id,
              ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, id) AS rn
       FROM staff
       WHERE user_id IS NOT NULL
     )
     UPDATE staff SET user_id = NULL
     WHERE id IN (SELECT id FROM dupes WHERE rn > 1)`,

    // For session_slot, dedupe by (session_id, slot_index) keeping lowest id,
    // and clear assigned_staff_id where the same staff is assigned twice in a session.
    `DELETE FROM session_slot s USING session_slot s2
     WHERE s.session_id = s2.session_id
       AND s.slot_index = s2.slot_index
       AND s.id > s2.id`,
    `UPDATE session_slot SET assigned_staff_id = NULL
     WHERE id IN (
       SELECT id FROM (
         SELECT id, ROW_NUMBER() OVER (
                      PARTITION BY session_id, assigned_staff_id
                      ORDER BY slot_index, id
                    ) AS rn
         FROM session_slot
         WHERE assigned_staff_id IS NOT NULL
       ) t WHERE rn > 1
     )`,
  ];

  console.log("Running migration...");
  try {
    await pool.query(sql);
    for (const stmt of alterStatements) {
      await pool.query(stmt);
    }
    for (const seed of classTypeSeeds) {
      await pool.query(
        `INSERT INTO class_type (id, label, color_key, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [seed.id, seed.label, seed.colorKey, seed.sortOrder]
      );
    }
    for (const seed of autoAssignProfileSeeds) {
      await pool.query(
        `INSERT INTO auto_assign_profile (id, name, plan, sort_order, is_builtin)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (id) DO NOTHING`,
        [seed.id, seed.name, JSON.stringify(seed.plan), seed.sortOrder]
      );
    }
    for (const stmt of postSeedStatements) {
      await pool.query(stmt);
    }
    for (const stmt of dedupeStatements) {
      await pool.query(stmt);
    }
    // Re-run schema.sql at the end so the newly added CREATE UNIQUE INDEX
    // statements take effect after the dedupe pass above.
    await pool.query(sql);
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
