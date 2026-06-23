import pool from "./db";
import { timeRangesOverlap } from "./time";
import type {
  Staff,
  Schedule,
  Session,
  Availability,
  AvailabilityStatus,
  SessionSlot,
  StaffRole,
  AutoAssignConflict,
  AutoAssignResult,
  AutoAssignStrategy,
  ClassType,
  Report,
  ReportPayload,
  ReportPeriodType,
  ReportScope,
  ReportSummary,
  ScheduleBoard,
  BoardScheduledStaff,
  BoardAvailableStaff,
} from "./types";

// --------------- Staff ---------------

export async function getAllStaff(): Promise<Staff[]> {
  const { rows } = await pool.query(
    `SELECT id, user_id, first_name, last_name, role, years_experience FROM staff ORDER BY last_name, first_name`
  );
  return rows.map(mapStaffRow);
}

export async function getAllStaffWithEmail(): Promise<Staff[]> {
  const { rows } = await pool.query(
    `SELECT s.id, s.user_id, s.first_name, s.last_name, s.role, s.years_experience, u.email
     FROM staff s LEFT JOIN "user" u ON u.id = s.user_id
     ORDER BY s.last_name, s.first_name`
  );
  return rows.map((r) => ({
    ...mapStaffRow(r),
    email: (r.email as string) || undefined,
  }));
}

export async function getStaffById(id: string): Promise<Staff | null> {
  const { rows } = await pool.query(
    `SELECT id, user_id, first_name, last_name, role, years_experience FROM staff WHERE id = $1`,
    [id]
  );
  return rows[0] ? mapStaffRow(rows[0]) : null;
}

export async function getStaffByUserId(userId: string): Promise<Staff | null> {
  const { rows } = await pool.query(
    `SELECT id, user_id, first_name, last_name, role, years_experience FROM staff WHERE user_id = $1`,
    [userId]
  );
  return rows[0] ? mapStaffRow(rows[0]) : null;
}

export async function createStaff(
  staff: Omit<Staff, "userId"> & { userId?: string }
): Promise<Staff> {
  const { rows } = await pool.query(
    `INSERT INTO staff (id, user_id, first_name, last_name, role, years_experience) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [staff.id, staff.userId ?? null, staff.firstName, staff.lastName, staff.role, staff.yearsExperience ?? 0]
  );
  return mapStaffRow(rows[0]);
}

export async function updateStaff(
  id: string,
  updates: Partial<Pick<Staff, "firstName" | "lastName" | "role" | "userId" | "yearsExperience">>
): Promise<Staff | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.firstName !== undefined) {
    setClauses.push(`first_name = $${idx++}`);
    values.push(updates.firstName);
  }
  if (updates.lastName !== undefined) {
    setClauses.push(`last_name = $${idx++}`);
    values.push(updates.lastName);
  }
  if (updates.role !== undefined) {
    setClauses.push(`role = $${idx++}`);
    values.push(updates.role);
  }
  if (updates.userId !== undefined) {
    setClauses.push(`user_id = $${idx++}`);
    values.push(updates.userId);
  }
  if (updates.yearsExperience !== undefined) {
    setClauses.push(`years_experience = $${idx++}`);
    values.push(updates.yearsExperience);
  }

  if (setClauses.length === 0) return getStaffById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE staff SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] ? mapStaffRow(rows[0]) : null;
}

export async function deleteStaff(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM staff WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

// --------------- Auth users ---------------

export async function getUserByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  const { rows } = await pool.query(
    `SELECT id, email FROM "user" WHERE lower(email) = lower($1) LIMIT 1`,
    [email]
  );
  return rows[0] ? { id: rows[0].id as string, email: rows[0].email as string } : null;
}

export async function updateUserEmail(userId: string, email: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE "user" SET email = $1, "updatedAt" = now() WHERE id = $2`,
    [email, userId]
  );
  return (rowCount ?? 0) > 0;
}

// Hard delete an auth user and all rows that reference it. Better Auth's
// removeUser is the preferred path, but this guarantees no orphaned user/
// account/session rows are left behind (which would block reusing the email).
export async function hardDeleteUser(userId: string): Promise<void> {
  await pool.query(`DELETE FROM session WHERE "userId" = $1`, [userId]);
  await pool.query(`DELETE FROM account WHERE "userId" = $1`, [userId]);
  await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
}

function mapStaffRow(row: Record<string, unknown>): Staff {
  return {
    id: row.id as string,
    userId: (row.user_id as string) || undefined,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    role: row.role as StaffRole,
    yearsExperience: (row.years_experience as number) ?? 0,
  };
}

// --------------- Schedules ---------------

export async function getAllSchedules(): Promise<Schedule[]> {
  const { rows: scheduleRows } = await pool.query(
    `SELECT id, name, description, start_date, end_date FROM schedule ORDER BY start_date DESC`
  );

  const schedules: Schedule[] = [];
  for (const row of scheduleRows) {
    const sessions = await getSessionsByScheduleId(row.id as string);
    schedules.push({
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string) || undefined,
      startDate: formatDate(row.start_date),
      endDate: formatDate(row.end_date),
      sessions,
    });
  }
  return schedules;
}

export async function getScheduleById(id: string): Promise<Schedule | null> {
  const { rows } = await pool.query(
    `SELECT id, name, description, start_date, end_date FROM schedule WHERE id = $1`,
    [id]
  );
  if (!rows[0]) return null;

  const sessions = await getSessionsByScheduleId(id);
  return {
    id: rows[0].id as string,
    name: rows[0].name as string,
    description: (rows[0].description as string) || undefined,
    startDate: formatDate(rows[0].start_date),
    endDate: formatDate(rows[0].end_date),
    sessions,
  };
}

export async function createSchedule(schedule: {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}): Promise<Schedule> {
  await pool.query(
    `INSERT INTO schedule (id, name, description, start_date, end_date) VALUES ($1, $2, $3, $4, $5)`,
    [schedule.id, schedule.name, schedule.description ?? null, schedule.startDate, schedule.endDate]
  );
  return { ...schedule, sessions: [] };
}

export async function updateSchedule(
  id: string,
  updates: Partial<Pick<Schedule, "name" | "description" | "startDate" | "endDate">>
): Promise<boolean> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    setClauses.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    setClauses.push(`description = $${idx++}`);
    values.push(updates.description);
  }
  if (updates.startDate !== undefined) {
    setClauses.push(`start_date = $${idx++}`);
    values.push(updates.startDate);
  }
  if (updates.endDate !== undefined) {
    setClauses.push(`end_date = $${idx++}`);
    values.push(updates.endDate);
  }

  if (setClauses.length === 0) return true;

  values.push(id);
  const { rowCount } = await pool.query(
    `UPDATE schedule SET ${setClauses.join(", ")} WHERE id = $${idx}`,
    values
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM schedule WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

// --------------- Sessions ---------------

export async function getSessionsByScheduleId(scheduleId: string): Promise<Session[]> {
  const { rows } = await pool.query(
    `SELECT id, schedule_id, date, day_of_week, start_time, end_time, location, required_staff, class_type
     FROM training_session WHERE schedule_id = $1 ORDER BY date, start_time`,
    [scheduleId]
  );
  return rows.map(mapSessionRow);
}

export async function getSessionById(id: string): Promise<Session | null> {
  const { rows } = await pool.query(
    `SELECT id, schedule_id, date, day_of_week, start_time, end_time, location, required_staff, class_type
     FROM training_session WHERE id = $1`,
    [id]
  );
  return rows[0] ? mapSessionRow(rows[0]) : null;
}

export async function createSessions(sessions: Session[]): Promise<void> {
  if (sessions.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const s of sessions) {
      await client.query(
        `INSERT INTO training_session (id, schedule_id, date, day_of_week, start_time, end_time, location, required_staff, class_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [s.id, s.scheduleId, s.date, s.dayOfWeek, s.startTime, s.endTime, s.location, s.requiredStaff, s.classType ?? null]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateSession(
  id: string,
  updates: Partial<Omit<Session, "id" | "scheduleId">>
): Promise<boolean> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.date !== undefined) { setClauses.push(`date = $${idx++}`); values.push(updates.date); }
  if (updates.dayOfWeek !== undefined) { setClauses.push(`day_of_week = $${idx++}`); values.push(updates.dayOfWeek); }
  if (updates.startTime !== undefined) { setClauses.push(`start_time = $${idx++}`); values.push(updates.startTime); }
  if (updates.endTime !== undefined) { setClauses.push(`end_time = $${idx++}`); values.push(updates.endTime); }
  if (updates.location !== undefined) { setClauses.push(`location = $${idx++}`); values.push(updates.location); }
  if (updates.requiredStaff !== undefined) { setClauses.push(`required_staff = $${idx++}`); values.push(updates.requiredStaff); }
  if (updates.classType !== undefined) { setClauses.push(`class_type = $${idx++}`); values.push(updates.classType); }

  if (setClauses.length === 0) return true;

  values.push(id);
  const { rowCount } = await pool.query(
    `UPDATE training_session SET ${setClauses.join(", ")} WHERE id = $${idx}`,
    values
  );
  return (rowCount ?? 0) > 0;
}

export async function deleteSession(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM training_session WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

function mapSessionRow(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    scheduleId: row.schedule_id as string,
    date: formatDate(row.date),
    dayOfWeek: row.day_of_week as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    location: row.location as string,
    requiredStaff: row.required_staff as number,
    classType: (row.class_type as Session["classType"]) || undefined,
  };
}

// --------------- Availability ---------------

export async function getAvailabilityByStaff(staffId: string): Promise<Availability[]> {
  const { rows } = await pool.query(
    `SELECT staff_id, session_id, status, custom_start_time, custom_end_time, notes
     FROM availability WHERE staff_id = $1`,
    [staffId]
  );
  return rows.map(mapAvailRow);
}

export async function getAvailabilityBySession(sessionId: string): Promise<Availability[]> {
  const { rows } = await pool.query(
    `SELECT staff_id, session_id, status, custom_start_time, custom_end_time, notes
     FROM availability WHERE session_id = $1`,
    [sessionId]
  );
  return rows.map(mapAvailRow);
}

export async function getAllAvailability(): Promise<Availability[]> {
  const { rows } = await pool.query(
    `SELECT staff_id, session_id, status, custom_start_time, custom_end_time, notes FROM availability`
  );
  return rows.map(mapAvailRow);
}

export async function upsertAvailability(avail: {
  staffId: string;
  sessionId: string;
  status: AvailabilityStatus;
  customStartTime?: string;
  customEndTime?: string;
  notes?: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO availability (staff_id, session_id, status, custom_start_time, custom_end_time, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (staff_id, session_id)
     DO UPDATE SET status = $3, custom_start_time = $4, custom_end_time = $5, notes = $6`,
    [avail.staffId, avail.sessionId, avail.status, avail.customStartTime ?? null, avail.customEndTime ?? null, avail.notes ?? null]
  );
}

export async function bulkUpsertAvailability(
  entries: Array<{
    staffId: string;
    sessionId: string;
    status: AvailabilityStatus;
    customStartTime?: string;
    customEndTime?: string;
  }>
): Promise<void> {
  if (entries.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const a of entries) {
      await client.query(
        `INSERT INTO availability (staff_id, session_id, status, custom_start_time, custom_end_time)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (staff_id, session_id)
         DO UPDATE SET status = $3, custom_start_time = $4, custom_end_time = $5`,
        [a.staffId, a.sessionId, a.status, a.customStartTime ?? null, a.customEndTime ?? null]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteAvailability(staffId: string, sessionId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM availability WHERE staff_id = $1 AND session_id = $2`,
    [staffId, sessionId]
  );
  return (rowCount ?? 0) > 0;
}

export async function getSessionStaffCounts(
  sessionId: string
): Promise<{ confirmed: number; maybe: number; total: number }> {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'available') AS confirmed,
       COUNT(*) FILTER (WHERE status = 'maybe') AS maybe
     FROM availability WHERE session_id = $1`,
    [sessionId]
  );
  const confirmed = parseInt(rows[0].confirmed as string, 10) || 0;
  const maybe = parseInt(rows[0].maybe as string, 10) || 0;
  return { confirmed, maybe, total: confirmed + maybe };
}

function mapAvailRow(row: Record<string, unknown>): Availability {
  return {
    staffId: row.staff_id as string,
    sessionId: row.session_id as string,
    status: row.status as AvailabilityStatus,
    customStartTime: (row.custom_start_time as string) || undefined,
    customEndTime: (row.custom_end_time as string) || undefined,
    notes: (row.notes as string) || undefined,
  };
}

// --------------- Session Slots ---------------

export async function getSlotsForSession(sessionId: string): Promise<SessionSlot[]> {
  const { rows } = await pool.query(
    `SELECT id, session_id, slot_index, assigned_staff_id,
            assigned_start_time, assigned_end_time
     FROM session_slot WHERE session_id = $1 ORDER BY slot_index`,
    [sessionId]
  );
  return rows.map(mapSlotRow);
}

export async function getAllSlots(): Promise<SessionSlot[]> {
  const { rows } = await pool.query(
    `SELECT id, session_id, slot_index, assigned_staff_id,
            assigned_start_time, assigned_end_time
     FROM session_slot ORDER BY session_id, slot_index`
  );
  return rows.map(mapSlotRow);
}

// Composes a read-only schedule "board": every session with its scheduled
// staff (slot assignments + adjusted worked windows) and its available-but-not-
// scheduled staff. Names only, safe to expose to non-admin staff.
export async function getScheduleBoard(
  scheduleId: string
): Promise<ScheduleBoard | null> {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) return null;

  const [allStaff, classTypes] = await Promise.all([
    getAllStaff(),
    getAllClassTypes(),
  ]);
  const staffById = new Map(allStaff.map((s) => [s.id, s]));
  const displayName = (id: string) => {
    const m = staffById.get(id);
    return m ? `${m.firstName} ${m.lastName}`.trim() : "Unknown";
  };

  const sessionIds = schedule.sessions.map((s) => s.id);

  const scheduledBySession = new Map<string, BoardScheduledStaff[]>();
  const scheduledStaffBySession = new Map<string, Set<string>>();
  const availableBySession = new Map<string, BoardAvailableStaff[]>();

  if (sessionIds.length > 0) {
    const sessionById = new Map(schedule.sessions.map((s) => [s.id, s]));

    const { rows: slotRows } = await pool.query(
      `SELECT session_id, assigned_staff_id, assigned_start_time, assigned_end_time
       FROM session_slot
       WHERE session_id = ANY($1::text[]) AND assigned_staff_id IS NOT NULL`,
      [sessionIds]
    );
    for (const r of slotRows) {
      const sid = r.session_id as string;
      const staffId = r.assigned_staff_id as string;
      const member = staffById.get(staffId);
      if (!member) continue;
      const session = sessionById.get(sid);
      const adjStart = (r.assigned_start_time as string) || undefined;
      const adjEnd = (r.assigned_end_time as string) || undefined;
      const list = scheduledBySession.get(sid) ?? [];
      list.push({
        staffId,
        name: displayName(staffId),
        role: member.role,
        startTime: adjStart || session?.startTime || "",
        endTime: adjEnd || session?.endTime || "",
        adjusted: Boolean(adjStart || adjEnd),
      });
      scheduledBySession.set(sid, list);
      const set = scheduledStaffBySession.get(sid) ?? new Set<string>();
      set.add(staffId);
      scheduledStaffBySession.set(sid, set);
    }

    const { rows: availRows } = await pool.query(
      `SELECT staff_id, session_id, status, custom_start_time, custom_end_time
       FROM availability
       WHERE session_id = ANY($1::text[]) AND status IN ('available', 'maybe')`,
      [sessionIds]
    );
    for (const r of availRows) {
      const sid = r.session_id as string;
      const staffId = r.staff_id as string;
      const member = staffById.get(staffId);
      if (!member) continue;
      if (scheduledStaffBySession.get(sid)?.has(staffId)) continue;
      const list = availableBySession.get(sid) ?? [];
      list.push({
        staffId,
        name: displayName(staffId),
        role: member.role,
        status: r.status as "available" | "maybe",
        customStartTime: (r.custom_start_time as string) || undefined,
        customEndTime: (r.custom_end_time as string) || undefined,
      });
      availableBySession.set(sid, list);
    }
  }

  const byRole = (a: { role: StaffRole }, b: { role: StaffRole }) =>
    ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];

  return {
    schedule: {
      id: schedule.id,
      name: schedule.name,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
    },
    classTypes,
    sessions: schedule.sessions.map((s) => ({
      id: s.id,
      date: s.date,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      requiredStaff: s.requiredStaff,
      classType: s.classType,
      scheduled: (scheduledBySession.get(s.id) ?? []).sort(
        (a, b) => byRole(a, b) || a.name.localeCompare(b.name)
      ),
      available: (availableBySession.get(s.id) ?? []).sort(
        (a, b) =>
          (a.status === b.status ? 0 : a.status === "available" ? -1 : 1) ||
          byRole(a, b) ||
          a.name.localeCompare(b.name)
      ),
    })),
  };
}

export async function setSlotCount(
  sessionId: string,
  count: number
): Promise<SessionSlot[]> {
  if (count < 0) count = 0;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM session_slot WHERE session_id = $1 AND slot_index >= $2`,
      [sessionId, count]
    );
    const { rows: existingRows } = await client.query(
      `SELECT slot_index FROM session_slot WHERE session_id = $1`,
      [sessionId]
    );
    const haveIdx = new Set<number>(existingRows.map((r) => r.slot_index as number));
    for (let i = 0; i < count; i++) {
      if (haveIdx.has(i)) continue;
      await client.query(
        `INSERT INTO session_slot (id, session_id, slot_index)
         VALUES ($1, $2, $3)`,
        [`slot-${sessionId}-${i}`, sessionId, i]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  return getSlotsForSession(sessionId);
}

// Backwards-compatible name; behaviour is now a full reconcile (grow or shrink).
export async function initializeSlotsForSession(
  sessionId: string,
  count: number
): Promise<SessionSlot[]> {
  return setSlotCount(sessionId, count);
}

// Returns true if the staff member is already assigned to a different session
// on the same date whose time window overlaps the given session. Used to guard
// manual assignment against double-booking (auto-assign already prevents this).
export async function isStaffDoubleBooked(
  sessionId: string,
  staffId: string
): Promise<boolean> {
  const session = await getSessionById(sessionId);
  if (!session) return false;

  // Pull this staff member's existing assignments on the same day, along with
  // each one's effective worked window (per-assignment override when present,
  // otherwise the session window).
  const { rows } = await pool.query(
    `SELECT ts.start_time AS session_start, ts.end_time AS session_end,
            ss.assigned_start_time, ss.assigned_end_time
     FROM session_slot ss
     JOIN training_session ts ON ts.id = ss.session_id
     WHERE ts.date = $1 AND ts.id <> $2 AND ss.assigned_staff_id = $3`,
    [session.date, sessionId, staffId]
  );

  for (const r of rows) {
    const start = (r.assigned_start_time as string) || (r.session_start as string);
    const end = (r.assigned_end_time as string) || (r.session_end as string);
    if (timeRangesOverlap(session.startTime, session.endTime, start, end)) {
      return true;
    }
  }
  return false;
}

export async function assignStaffToSlot(slotId: string, staffId: string): Promise<boolean> {
  // A fresh assignment always covers the full session window; clear any
  // adjusted times left over from a previous occupant of this slot.
  const { rowCount } = await pool.query(
    `UPDATE session_slot
     SET assigned_staff_id = $1, assigned_start_time = NULL, assigned_end_time = NULL
     WHERE id = $2`,
    [staffId, slotId]
  );
  return (rowCount ?? 0) > 0;
}

export async function unassignSlot(slotId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE session_slot
     SET assigned_staff_id = NULL, assigned_start_time = NULL, assigned_end_time = NULL
     WHERE id = $1`,
    [slotId]
  );
  return (rowCount ?? 0) > 0;
}

// Adjusts the worked window for an already-assigned slot. Passing null/undefined
// for both times resets the slot back to the full session window.
export async function updateSlotTimes(
  slotId: string,
  startTime: string | null,
  endTime: string | null
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE session_slot
     SET assigned_start_time = $1, assigned_end_time = $2
     WHERE id = $3 AND assigned_staff_id IS NOT NULL`,
    [startTime, endTime, slotId]
  );
  return (rowCount ?? 0) > 0;
}

const ROLE_PRIORITY: Record<StaffRole, number> = {
  lead: 0,
  experience: 1,
  junior: 2,
  trial: 3,
};

type StrategyBucket = {
  roles: StaffRole[];
  max?: number;
  preferSeniorFirst: boolean;
};

const STRATEGY_PLAN: Record<AutoAssignStrategy, StrategyBucket[]> = {
  cheap: [
    { roles: ["trial"], preferSeniorFirst: false },
    { roles: ["junior"], preferSeniorFirst: false },
    { roles: ["experience"], preferSeniorFirst: false },
    { roles: ["lead"], preferSeniorFirst: false },
  ],
  balanced: [
    { roles: ["lead"], max: 1, preferSeniorFirst: true },
    { roles: ["experience"], max: 1, preferSeniorFirst: true },
    { roles: ["junior"], preferSeniorFirst: true },
    { roles: ["trial"], preferSeniorFirst: true },
    { roles: ["experience"], preferSeniorFirst: true },
    { roles: ["lead"], preferSeniorFirst: true },
  ],
  expensive: [
    { roles: ["lead"], max: 1, preferSeniorFirst: true },
    { roles: ["experience"], max: 2, preferSeniorFirst: true },
    { roles: ["trial"], preferSeniorFirst: false },
    { roles: ["junior"], preferSeniorFirst: true },
    { roles: ["experience"], preferSeniorFirst: true },
    { roles: ["lead"], preferSeniorFirst: true },
  ],
};

function buildOrderedCandidates(
  availableStaff: Staff[],
  strategy: AutoAssignStrategy,
  existingRoleCounts: Record<StaffRole, number>,
  assignmentCounts: Map<string, number>
): Staff[] {
  const buckets = STRATEGY_PLAN[strategy];
  const remainingByRole: Record<StaffRole, number> = {
    lead: existingRoleCounts.lead,
    experience: existingRoleCounts.experience,
    junior: existingRoleCounts.junior,
    trial: existingRoleCounts.trial,
  };
  const used = new Set<string>();
  const ordered: Staff[] = [];

  for (const bucket of buckets) {
    const pool = availableStaff
      .filter((m) => !used.has(m.id) && bucket.roles.includes(m.role))
      .sort((a, b) => {
        const expDiff = bucket.preferSeniorFirst
          ? (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0)
          : (a.yearsExperience ?? 0) - (b.yearsExperience ?? 0);
        if (expDiff !== 0) return expDiff;
        const roleDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
        if (roleDiff !== 0) return roleDiff;
        return (
          (assignmentCounts.get(a.id) || 0) -
          (assignmentCounts.get(b.id) || 0)
        );
      });

    let remainingBudget = bucket.max ?? Infinity;
    if (bucket.max !== undefined) {
      for (const role of bucket.roles) {
        const consume = Math.min(remainingByRole[role], remainingBudget);
        remainingBudget -= consume;
        remainingByRole[role] -= consume;
        if (remainingBudget <= 0) break;
      }
    }

    for (const member of pool) {
      if (remainingBudget <= 0) break;
      ordered.push(member);
      used.add(member.id);
      remainingBudget--;
    }
  }

  return ordered;
}

export async function autoAssignSession(
  sessionId: string,
  strategy: AutoAssignStrategy = "balanced"
): Promise<AutoAssignResult> {
  let totalAssigned = 0;
  let totalEmpty = 0;
  const conflicts: AutoAssignConflict[] = [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the session row first; anything reading or modifying it via
    // this same code path will wait.
    const { rows: sessionRows } = await client.query(
      `SELECT id, schedule_id, date, day_of_week, start_time, end_time, location,
              required_staff, class_type
       FROM training_session WHERE id = $1 FOR UPDATE`,
      [sessionId]
    );
    if (sessionRows.length === 0) {
      await client.query("COMMIT");
      return { assigned: 0, empty: 0, conflicts: [] };
    }
    const session = mapSessionRow(sessionRows[0]);

    // Lock this session's slots so a concurrent manual assign can't race us.
    const { rows: slotRows } = await client.query(
      `SELECT id, session_id, slot_index, assigned_staff_id
       FROM session_slot WHERE session_id = $1
       ORDER BY slot_index FOR UPDATE`,
      [session.id]
    );
    const sessionSlots: SessionSlot[] = slotRows.map(mapSlotRow);

    // Reconcile slot count: grow only - shrinking here would be surprising.
    if (sessionSlots.length < session.requiredStaff) {
      for (let i = sessionSlots.length; i < session.requiredStaff; i++) {
        const newSlot: SessionSlot = {
          id: `slot-${session.id}-${i}`,
          sessionId: session.id,
          slotIndex: i,
        };
        await client.query(
          `INSERT INTO session_slot (id, session_id, slot_index)
           VALUES ($1, $2, $3)
           ON CONFLICT (session_id, slot_index) DO NOTHING`,
          [newSlot.id, newSlot.sessionId, newSlot.slotIndex]
        );
        sessionSlots.push(newSlot);
      }
    }

    // Pull all the supporting data we need inside the transaction.
    const { rows: staffRows } = await client.query(
      `SELECT id, user_id, first_name, last_name, role, years_experience FROM staff`
    );
    const allStaff: Staff[] = staffRows.map(mapStaffRow);

    const { rows: availRows } = await client.query(
      `SELECT staff_id, session_id, status, custom_start_time, custom_end_time, notes
       FROM availability WHERE session_id = $1`,
      [session.id]
    );
    const sessionAvailability: Availability[] = availRows.map(mapAvailRow);

    // Sessions on the same date that could time-overlap with this one.
    const { rows: overlapSessionRows } = await client.query(
      `SELECT id, start_time, end_time
       FROM training_session
       WHERE date = $1 AND id <> $2`,
      [session.date, session.id]
    );
    const overlappingSessionIds = new Set<string>();
    for (const r of overlapSessionRows) {
      if (
        timeRangesOverlap(
          session.startTime,
          session.endTime,
          r.start_time as string,
          r.end_time as string
        )
      ) {
        overlappingSessionIds.add(r.id as string);
      }
    }

    // Staff who are already assigned to any overlapping session are ineligible.
    const bannedStaffIds = new Set<string>();
    if (overlappingSessionIds.size > 0) {
      const { rows: conflictRows } = await client.query(
        `SELECT DISTINCT assigned_staff_id
         FROM session_slot
         WHERE session_id = ANY($1::text[]) AND assigned_staff_id IS NOT NULL`,
        [Array.from(overlappingSessionIds)]
      );
      for (const r of conflictRows) {
        if (r.assigned_staff_id) bannedStaffIds.add(r.assigned_staff_id as string);
      }
    }

    // Global assignment counts for fairness sorting.
    const { rows: allSlotRows } = await client.query(
      `SELECT assigned_staff_id FROM session_slot WHERE assigned_staff_id IS NOT NULL`
    );
    const assignmentCounts = new Map<string, number>();
    for (const r of allSlotRows) {
      const sid = r.assigned_staff_id as string;
      assignmentCounts.set(sid, (assignmentCounts.get(sid) || 0) + 1);
    }

    const alreadyAssigned = new Set<string>();
    for (const slot of sessionSlots) {
      if (slot.assignedStaffId) alreadyAssigned.add(slot.assignedStaffId);
    }

    const availableCount = sessionAvailability.filter(
      (a) => a.status === "available"
    ).length;
    const maybeCount = sessionAvailability.filter(
      (a) => a.status === "maybe"
    ).length;

    let overlapBlockedCount = 0;
    const availableStaff = allStaff.filter((member) => {
      if (alreadyAssigned.has(member.id)) return false;
      const avail = sessionAvailability.find((a) => a.staffId === member.id);
      if (avail?.status !== "available") return false;
      if (bannedStaffIds.has(member.id)) {
        overlapBlockedCount++;
        return false;
      }
      return true;
    });

    const existingRoleCounts: Record<StaffRole, number> = {
      lead: 0,
      experience: 0,
      junior: 0,
      trial: 0,
    };
    for (const slot of sessionSlots) {
      if (!slot.assignedStaffId) continue;
      const member = allStaff.find((m) => m.id === slot.assignedStaffId);
      if (member) existingRoleCounts[member.role]++;
    }

    const orderedCandidates = buildOrderedCandidates(
      availableStaff,
      strategy,
      existingRoleCounts,
      assignmentCounts
    );

    let staffIdx = 0;
    let sessionUnfilled = 0;
    for (const slot of sessionSlots) {
      if (slot.assignedStaffId) continue;
      if (staffIdx < orderedCandidates.length) {
        await client.query(
          `UPDATE session_slot SET assigned_staff_id = $1 WHERE id = $2`,
          [orderedCandidates[staffIdx].id, slot.id]
        );
        assignmentCounts.set(
          orderedCandidates[staffIdx].id,
          (assignmentCounts.get(orderedCandidates[staffIdx].id) || 0) + 1
        );
        totalAssigned++;
        staffIdx++;
      } else {
        totalEmpty++;
        sessionUnfilled++;
      }
    }

    if (sessionUnfilled > 0) {
      const assignedCount = session.requiredStaff - sessionUnfilled;
      let reason: string;
      if (availableCount === 0 && maybeCount === 0) {
        reason = `No staff have responded with availability for this session. Ask staff to update their availability.`;
      } else if (overlapBlockedCount > 0 && availableCount - overlapBlockedCount < session.requiredStaff) {
        const others = availableCount - overlapBlockedCount;
        reason = `${overlapBlockedCount} otherwise-available staff are already assigned to a time-overlapping session. Only ${others} of ${session.requiredStaff} eligible. Reassign someone from the overlapping session or ask more staff to confirm.`;
      } else if (availableCount < session.requiredStaff && maybeCount > 0) {
        reason = `Only ${availableCount} of ${session.requiredStaff} staff marked available (${maybeCount} marked maybe). Manually assign staff who marked 'maybe', or ask more staff to confirm availability.`;
      } else {
        reason = `Only ${availableCount} staff marked available for ${session.requiredStaff} required slots. Ask more staff to update their availability.`;
      }

      conflicts.push({
        sessionId: session.id,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        location: session.location,
        classType: session.classType,
        requiredStaff: session.requiredStaff,
        assignedCount,
        unfilledCount: sessionUnfilled,
        availableCount,
        maybeCount,
        reason,
      });
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return { assigned: totalAssigned, empty: totalEmpty, conflicts };
}

function mapSlotRow(row: Record<string, unknown>): SessionSlot {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    slotIndex: row.slot_index as number,
    assignedStaffId: (row.assigned_staff_id as string) || undefined,
    assignedStartTime: (row.assigned_start_time as string) || undefined,
    assignedEndTime: (row.assigned_end_time as string) || undefined,
  };
}

// --------------- Reports ---------------

export async function getAllReports(): Promise<ReportSummary[]> {
  const { rows } = await pool.query(
    `SELECT id, name, schedule_id, schedule_name, period_type, scope,
            period_start, period_end, generated_at
     FROM report ORDER BY generated_at DESC`
  );
  return rows.map(mapReportSummaryRow);
}

export async function getReportById(id: string): Promise<Report | null> {
  const { rows } = await pool.query(
    `SELECT id, name, schedule_id, schedule_name, period_type, scope,
            period_start, period_end, generated_at, payload
     FROM report WHERE id = $1`,
    [id]
  );
  return rows[0] ? mapReportRow(rows[0]) : null;
}

export async function createReport(report: {
  id: string;
  name: string;
  scheduleId: string;
  scheduleName: string;
  periodType: ReportPeriodType;
  scope: ReportScope;
  periodStart: string;
  periodEnd: string;
  payload: ReportPayload;
}): Promise<Report> {
  const { rows } = await pool.query(
    `INSERT INTO report
       (id, name, schedule_id, schedule_name, period_type, scope,
        period_start, period_end, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, schedule_id, schedule_name, period_type, scope,
               period_start, period_end, generated_at, payload`,
    [
      report.id,
      report.name,
      report.scheduleId,
      report.scheduleName,
      report.periodType,
      report.scope,
      report.periodStart,
      report.periodEnd,
      JSON.stringify(report.payload),
    ]
  );
  return mapReportRow(rows[0]);
}

export async function deleteReport(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM report WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

function mapReportSummaryRow(row: Record<string, unknown>): ReportSummary {
  return {
    id: row.id as string,
    name: row.name as string,
    scheduleId: row.schedule_id as string,
    scheduleName: row.schedule_name as string,
    periodType: row.period_type as ReportPeriodType,
    scope: row.scope as ReportScope,
    periodStart: formatDate(row.period_start),
    periodEnd: formatDate(row.period_end),
    generatedAt:
      row.generated_at instanceof Date
        ? row.generated_at.toISOString()
        : String(row.generated_at),
  };
}

function mapReportRow(row: Record<string, unknown>): Report {
  const payloadVal = row.payload;
  const payload: ReportPayload =
    typeof payloadVal === "string"
      ? (JSON.parse(payloadVal) as ReportPayload)
      : (payloadVal as ReportPayload);
  return {
    ...mapReportSummaryRow(row),
    payload,
  };
}

// --------------- Helpers ---------------

function formatDate(val: unknown): string {
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  return String(val).split("T")[0];
}

// --------------- Class Types ---------------

function mapClassTypeRow(row: Record<string, unknown>): ClassType {
  return {
    id: row.id as string,
    label: row.label as string,
    colorKey: row.color_key as string,
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

export async function getAllClassTypes(): Promise<ClassType[]> {
  const { rows } = await pool.query(
    `SELECT id, label, color_key, sort_order FROM class_type ORDER BY sort_order, label`
  );
  return rows.map(mapClassTypeRow);
}

export async function createClassType(input: ClassType): Promise<ClassType> {
  const { rows } = await pool.query(
    `INSERT INTO class_type (id, label, color_key, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING id, label, color_key, sort_order`,
    [input.id, input.label, input.colorKey, input.sortOrder ?? 0]
  );
  return mapClassTypeRow(rows[0]);
}

export async function updateClassType(
  id: string,
  updates: Partial<Pick<ClassType, "label" | "colorKey" | "sortOrder">>
): Promise<ClassType | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.label !== undefined) {
    setClauses.push(`label = $${idx++}`);
    values.push(updates.label);
  }
  if (updates.colorKey !== undefined) {
    setClauses.push(`color_key = $${idx++}`);
    values.push(updates.colorKey);
  }
  if (updates.sortOrder !== undefined) {
    setClauses.push(`sort_order = $${idx++}`);
    values.push(updates.sortOrder);
  }

  if (setClauses.length === 0) {
    const existing = await pool.query(
      `SELECT id, label, color_key, sort_order FROM class_type WHERE id = $1`,
      [id]
    );
    return existing.rows[0] ? mapClassTypeRow(existing.rows[0]) : null;
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE class_type SET ${setClauses.join(", ")} WHERE id = $${idx}
     RETURNING id, label, color_key, sort_order`,
    values
  );
  return rows[0] ? mapClassTypeRow(rows[0]) : null;
}

export async function deleteClassType(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM class_type WHERE id = $1`,
    [id]
  );
  return (rowCount ?? 0) > 0;
}
