import "dotenv/config";
import { Pool } from "pg";
import { getPoolConfig } from "../src/lib/pg-ssl";

const pool = new Pool(getPoolConfig());

type StaffRole = "lead" | "experience" | "junior" | "trial";

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
}

interface Session {
  id: string;
  scheduleId: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  requiredStaff: number;
}

type AvailabilityStatus = "available" | "unavailable" | "maybe" | "pending";

function makeStaff(id: string, firstName: string, lastName: string, role: StaffRole): Staff {
  return { id, firstName, lastName, role };
}

const staffList: Staff[] = [
  makeStaff("s1", "AJ", "Aman", "junior"),
  makeStaff("s2", "Muj", "Amin", "junior"),
  makeStaff("s3", "Logan", "Bahumian", "experience"),
  makeStaff("s4", "Joe", "Bakeer", "experience"),
  makeStaff("s5", "Laila", "Britford", "experience"),
  makeStaff("s6", "Eric", "Calvillo-E", "experience"),
  makeStaff("s7", "Victor", "Calvillo-V", "junior"),
  makeStaff("s8", "Dylan", "Conti-D", "junior"),
  makeStaff("s9", "Sergio", "Gonzalez", "experience"),
  makeStaff("s10", "Mahdi", "Hossaini", "experience"),
  makeStaff("s11", "Gisele", "Huang", "junior"),
  makeStaff("s12", "Isaac", "Kim", "experience"),
  makeStaff("s13", "David", "Linus", "experience"),
  makeStaff("s14", "Gustavo", "Lopez-P", "lead"),
  makeStaff("s15", "Jan", "Maldonado", "experience"),
  makeStaff("s16", "Zach", "Meskunas", "junior"),
  makeStaff("s17", "Madie", "Miller", "junior"),
  makeStaff("s18", "Abdul", "Mohsini", "experience"),
  makeStaff("s19", "Fernando", "Monterrosa", "experience"),
  makeStaff("s20", "Fasih", "Nooran", "experience"),
  makeStaff("s21", "Haseeb", "Nooran", "experience"),
  makeStaff("s22", "Ahroon", "Nusraty", "experience"),
  makeStaff("s23", "David", "Panamano", "experience"),
  makeStaff("s24", "Quan", "Phan", "junior"),
  makeStaff("s25", "Kevin", "Ramos", "experience"),
  makeStaff("s26", "Dave", "Salas", "experience"),
  makeStaff("s27", "Haroon", "Sarwari", "experience"),
  makeStaff("s28", "Brandon", "Williamson", "junior"),
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface SessionPattern {
  startTime: string;
  endTime: string;
  location: string;
  requiredStaff: number;
}

const dayPatterns: Record<number, SessionPattern[]> = {
  0: [
    { startTime: "9:00 AM", endTime: "10:00 AM", location: "Field House", requiredStaff: 3 },
    { startTime: "10:00 AM", endTime: "11:00 AM", location: "Field House", requiredStaff: 3 },
    { startTime: "11:00 AM", endTime: "1:00 PM", location: "Field House", requiredStaff: 5 },
  ],
  1: [
    { startTime: "4:00 PM", endTime: "5:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "5:00 PM", endTime: "6:25 PM", location: "Field House", requiredStaff: 4 },
    { startTime: "6:30 PM", endTime: "8:00 PM", location: "Field House", requiredStaff: 4 },
  ],
  2: [
    { startTime: "4:00 PM", endTime: "5:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "5:00 PM", endTime: "6:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "6:00 PM", endTime: "7:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "7:00 PM", endTime: "8:00 PM", location: "Field House", requiredStaff: 3 },
  ],
  3: [
    { startTime: "4:00 PM", endTime: "5:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "5:00 PM", endTime: "6:25 PM", location: "Field House", requiredStaff: 4 },
    { startTime: "6:30 PM", endTime: "8:00 PM", location: "Field House", requiredStaff: 4 },
  ],
  4: [
    { startTime: "4:00 PM", endTime: "5:00 PM", location: "Field House", requiredStaff: 2 },
    { startTime: "5:00 PM", endTime: "6:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "6:00 PM", endTime: "8:00 PM", location: "Field House", requiredStaff: 3 },
  ],
  5: [
    { startTime: "4:00 PM", endTime: "5:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "5:00 PM", endTime: "6:25 PM", location: "Field House", requiredStaff: 4 },
  ],
  6: [
    { startTime: "9:00 AM", endTime: "10:00 AM", location: "K Sport", requiredStaff: 2 },
    { startTime: "10:00 AM", endTime: "11:00 AM", location: "K Sport", requiredStaff: 2 },
    { startTime: "11:00 AM", endTime: "12:00 PM", location: "K Sport", requiredStaff: 2 },
  ],
};

function generateSessions(scheduleId: string, startDate: string, weeks: number): Session[] {
  const sessions: Session[] = [];
  const start = new Date(startDate + "T12:00:00");
  let counter = 1;

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const current = new Date(start);
      current.setDate(current.getDate() + w * 7 + d);
      const dateStr = current.toISOString().split("T")[0];
      const dayOfWeek = current.getDay();
      const patterns = dayPatterns[dayOfWeek] || [];

      for (const pattern of patterns) {
        sessions.push({
          id: `sess-${counter++}`,
          scheduleId,
          date: dateStr,
          dayOfWeek: DAYS[dayOfWeek],
          startTime: pattern.startTime,
          endTime: pattern.endTime,
          location: pattern.location,
          requiredStaff: pattern.requiredStaff,
        });
      }
    }
  }
  return sessions;
}

const staffAvailMap: Record<string, Record<string, AvailabilityStatus>> = {
  s18: { "2026-02-02": "available", "2026-02-03": "unavailable", "2026-02-04": "available", "2026-02-05": "available", "2026-02-06": "available", "2026-02-08": "available", "2026-02-09": "unavailable", "2026-02-10": "unavailable", "2026-02-11": "available", "2026-02-12": "unavailable", "2026-02-13": "unavailable", "2026-02-15": "available", "2026-02-16": "unavailable", "2026-02-17": "available", "2026-02-18": "unavailable", "2026-02-19": "unavailable", "2026-02-22": "available", "2026-02-23": "unavailable", "2026-02-24": "available", "2026-02-25": "unavailable", "2026-02-26": "unavailable", "2026-03-01": "available", "2026-03-02": "unavailable", "2026-03-03": "available", "2026-03-04": "unavailable", "2026-03-05": "unavailable" },
  s12: { "2026-02-02": "available", "2026-02-03": "unavailable", "2026-02-04": "available", "2026-02-05": "available", "2026-02-06": "available", "2026-02-07": "available", "2026-02-08": "available" },
  s4: { "2026-02-02": "available", "2026-02-03": "unavailable", "2026-02-04": "available", "2026-02-05": "available", "2026-02-06": "available" },
  s10: { "2026-02-02": "unavailable", "2026-02-03": "unavailable", "2026-02-04": "available", "2026-02-05": "unavailable", "2026-02-06": "available" },
  s13: { "2026-02-02": "unavailable", "2026-02-03": "unavailable", "2026-02-04": "unavailable", "2026-02-05": "unavailable", "2026-02-06": "unavailable", "2026-02-07": "unavailable" },
  s26: { "2026-02-02": "unavailable", "2026-02-03": "unavailable", "2026-02-04": "unavailable", "2026-02-05": "unavailable", "2026-02-06": "available" },
  s19: { "2026-02-02": "unavailable", "2026-02-04": "available", "2026-02-07": "available", "2026-02-08": "available" },
  s15: { "2026-02-02": "available", "2026-02-07": "available", "2026-02-04": "unavailable", "2026-02-05": "unavailable", "2026-02-06": "available" },
  s22: { "2026-02-02": "available", "2026-02-03": "available", "2026-02-04": "available", "2026-02-05": "available", "2026-02-06": "available", "2026-02-07": "available", "2026-02-08": "available" },
  s23: { "2026-02-02": "unavailable", "2026-02-07": "available" },
  s27: { "2026-02-02": "available", "2026-02-03": "available", "2026-02-04": "available", "2026-02-05": "available", "2026-02-06": "available", "2026-02-07": "available", "2026-02-08": "available" },
  s6: { "2026-02-02": "available", "2026-02-03": "available", "2026-02-04": "available", "2026-02-06": "available", "2026-02-09": "available", "2026-02-10": "available", "2026-02-11": "available", "2026-02-12": "available", "2026-02-13": "available", "2026-02-16": "available", "2026-02-17": "available", "2026-02-18": "available", "2026-02-19": "available", "2026-02-20": "available", "2026-02-23": "available", "2026-02-24": "unavailable", "2026-02-25": "available", "2026-02-26": "available" },
  s21: { "2026-02-02": "available", "2026-02-03": "available", "2026-02-04": "available", "2026-02-06": "available", "2026-02-07": "available", "2026-02-08": "available", "2026-02-09": "available", "2026-02-10": "unavailable", "2026-02-11": "available", "2026-02-12": "unavailable", "2026-02-13": "available", "2026-02-14": "available" },
  s9: { "2026-02-02": "unavailable", "2026-02-03": "available", "2026-02-04": "unavailable", "2026-02-06": "available", "2026-02-08": "available" },
  s25: { "2026-02-02": "unavailable", "2026-02-03": "available", "2026-02-04": "available", "2026-02-05": "unavailable", "2026-02-06": "available" },
  s20: { "2026-02-02": "available", "2026-02-04": "available", "2026-02-07": "available", "2026-02-08": "available", "2026-02-09": "available", "2026-02-10": "available", "2026-02-11": "available", "2026-02-12": "unavailable", "2026-02-13": "unavailable", "2026-02-16": "available", "2026-02-17": "available", "2026-02-18": "available", "2026-02-19": "available", "2026-02-20": "available" },
  s14: { "2026-02-02": "available", "2026-02-09": "unavailable", "2026-02-10": "available", "2026-02-11": "available", "2026-02-12": "unavailable", "2026-02-13": "available", "2026-02-14": "unavailable", "2026-02-15": "unavailable", "2026-02-16": "unavailable", "2026-02-17": "available", "2026-02-18": "available", "2026-02-19": "unavailable", "2026-02-20": "available", "2026-02-23": "unavailable", "2026-02-24": "available", "2026-02-25": "available", "2026-02-26": "unavailable", "2026-02-27": "available", "2026-03-03": "available", "2026-03-04": "available", "2026-03-05": "unavailable", "2026-03-06": "available" },
  s3: { "2026-02-02": "unavailable", "2026-02-03": "available" },
  s17: { "2026-02-02": "unavailable", "2026-02-03": "unavailable" },
  s5: { "2026-02-07": "available", "2026-02-08": "available", "2026-02-09": "available", "2026-02-10": "available", "2026-02-11": "available", "2026-02-12": "available", "2026-02-13": "available", "2026-02-14": "available", "2026-02-15": "available", "2026-02-16": "available" },
  s7: { "2026-02-08": "available" },
  s11: { "2026-02-08": "available" },
  s16: { "2026-02-08": "available" },
  s28: { "2026-02-08": "available" },
};

async function seed() {
  console.log("Seeding database...");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert staff
    for (const s of staffList) {
      await client.query(
        `INSERT INTO staff (id, first_name, last_name, role) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.firstName, s.lastName, s.role]
      );
    }
    console.log(`Inserted ${staffList.length} staff members.`);

    // Insert schedule
    await client.query(
      `INSERT INTO schedule (id, name, description, start_date, end_date) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [
        "sched-1",
        "February 2026 Training Block",
        "Weekly coaching sessions at Field House and K Sport for the academy.",
        "2026-02-02",
        "2026-03-08",
      ]
    );
    console.log("Inserted schedule.");

    // Generate and insert sessions
    const sessions = generateSessions("sched-1", "2026-02-02", 5);
    for (const sess of sessions) {
      await client.query(
        `INSERT INTO training_session (id, schedule_id, date, day_of_week, start_time, end_time, location, required_staff)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
        [sess.id, sess.scheduleId, sess.date, sess.dayOfWeek, sess.startTime, sess.endTime, sess.location, sess.requiredStaff]
      );
    }
    console.log(`Inserted ${sessions.length} sessions.`);

    // Build availability
    const sessionsByDate = new Map<string, Session[]>();
    for (const s of sessions) {
      const existing = sessionsByDate.get(s.date) || [];
      existing.push(s);
      sessionsByDate.set(s.date, existing);
    }

    let availCount = 0;
    for (const [staffId, dateMap] of Object.entries(staffAvailMap)) {
      for (const [date, status] of Object.entries(dateMap)) {
        const dateSessions = sessionsByDate.get(date) || [];
        for (const session of dateSessions) {
          await client.query(
            `INSERT INTO availability (staff_id, session_id, status)
             VALUES ($1, $2, $3) ON CONFLICT (staff_id, session_id) DO NOTHING`,
            [staffId, session.id, status]
          );
          availCount++;
        }
      }
    }
    console.log(`Inserted ${availCount} availability records.`);

    await client.query("COMMIT");
    console.log("Seed completed successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
