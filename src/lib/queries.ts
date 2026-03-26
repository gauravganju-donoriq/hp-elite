import pool from "./db";
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
} from "./types";

// --------------- Staff ---------------

export async function getAllStaff(): Promise<Staff[]> {
  const { rows } = await pool.query(
    `SELECT id, user_id, first_name, last_name, role, years_experience FROM staff ORDER BY last_name, first_name`
  );
  return rows.map(mapStaffRow);
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
    `SELECT id, session_id, slot_index, assigned_staff_id
     FROM session_slot WHERE session_id = $1 ORDER BY slot_index`,
    [sessionId]
  );
  return rows.map(mapSlotRow);
}

export async function getAllSlots(): Promise<SessionSlot[]> {
  const { rows } = await pool.query(
    `SELECT id, session_id, slot_index, assigned_staff_id FROM session_slot ORDER BY session_id, slot_index`
  );
  return rows.map(mapSlotRow);
}

export async function initializeSlotsForSession(
  sessionId: string,
  count: number
): Promise<SessionSlot[]> {
  const existing = await getSlotsForSession(sessionId);

  if (existing.length >= count) {
    return existing.slice(0, count);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = existing.length; i < count; i++) {
      await client.query(
        `INSERT INTO session_slot (id, session_id, slot_index) VALUES ($1, $2, $3)`,
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

export async function assignStaffToSlot(slotId: string, staffId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE session_slot SET assigned_staff_id = $1 WHERE id = $2`,
    [staffId, slotId]
  );
  return (rowCount ?? 0) > 0;
}

export async function unassignSlot(slotId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE session_slot SET assigned_staff_id = NULL WHERE id = $1`,
    [slotId]
  );
  return (rowCount ?? 0) > 0;
}

const ROLE_PRIORITY: Record<StaffRole, number> = {
  "head-coach": 0,
  "assistant-coach": 1,
  volunteer: 2,
  intern: 3,
};

export async function autoAssignAll(
  scheduleId: string
): Promise<AutoAssignResult> {
  const schedule = await getScheduleById(scheduleId);
  if (!schedule) return { assigned: 0, empty: 0, conflicts: [] };

  const allStaff = await getAllStaff();
  const allAvailability = await getAllAvailability();
  const allSlots = await getAllSlots();

  const assignmentCounts = new Map<string, number>();
  for (const slot of allSlots) {
    if (slot.assignedStaffId) {
      assignmentCounts.set(slot.assignedStaffId, (assignmentCounts.get(slot.assignedStaffId) || 0) + 1);
    }
  }

  let totalAssigned = 0;
  let totalEmpty = 0;
  const conflicts: AutoAssignConflict[] = [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const session of schedule.sessions) {
      const sessionSlots = allSlots.filter((s) => s.sessionId === session.id);

      if (sessionSlots.length < session.requiredStaff) {
        for (let i = sessionSlots.length; i < session.requiredStaff; i++) {
          const newSlot: SessionSlot = {
            id: `slot-${session.id}-${i}`,
            sessionId: session.id,
            slotIndex: i,
          };
          await client.query(
            `INSERT INTO session_slot (id, session_id, slot_index) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
            [newSlot.id, newSlot.sessionId, newSlot.slotIndex]
          );
          sessionSlots.push(newSlot);
        }
      }

      const alreadyAssigned = new Set<string>();
      for (const slot of sessionSlots) {
        if (slot.assignedStaffId) alreadyAssigned.add(slot.assignedStaffId);
      }

      const sessionAvailability = allAvailability.filter(
        (a) => a.sessionId === session.id
      );
      const availableCount = sessionAvailability.filter(
        (a) => a.status === "available"
      ).length;
      const maybeCount = sessionAvailability.filter(
        (a) => a.status === "maybe"
      ).length;

      const availableStaff = allStaff
        .filter((member) => {
          if (alreadyAssigned.has(member.id)) return false;
          const avail = sessionAvailability.find(
            (a) => a.staffId === member.id
          );
          return avail?.status === "available";
        })
        .sort((a, b) => {
          const expDiff = (b.yearsExperience ?? 0) - (a.yearsExperience ?? 0);
          if (expDiff !== 0) return expDiff;
          const roleDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
          if (roleDiff !== 0) return roleDiff;
          return (assignmentCounts.get(a.id) || 0) - (assignmentCounts.get(b.id) || 0);
        });

      let staffIdx = 0;
      let sessionUnfilled = 0;
      for (const slot of sessionSlots) {
        if (slot.assignedStaffId) continue;
        if (staffIdx < availableStaff.length) {
          await client.query(
            `UPDATE session_slot SET assigned_staff_id = $1 WHERE id = $2`,
            [availableStaff[staffIdx].id, slot.id]
          );
          assignmentCounts.set(
            availableStaff[staffIdx].id,
            (assignmentCounts.get(availableStaff[staffIdx].id) || 0) + 1
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
  };
}

// --------------- Helpers ---------------

function formatDate(val: unknown): string {
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  return String(val).split("T")[0];
}
