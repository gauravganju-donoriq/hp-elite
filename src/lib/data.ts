import type { Staff, Schedule, Session, Availability } from "./types";

function makeStaff(
  id: string,
  firstName: string,
  lastName: string,
  role: Staff["role"] = "assistant-coach"
): Staff {
  return { id, firstName, lastName, role };
}

export const initialStaff: Staff[] = [
  makeStaff("s1", "AJ", "Aman", "volunteer"),
  makeStaff("s2", "Muj", "Amin", "volunteer"),
  makeStaff("s3", "Logan", "Bahumian", "assistant-coach"),
  makeStaff("s4", "Joe", "Bakeer", "assistant-coach"),
  makeStaff("s5", "Laila", "Britford", "assistant-coach"),
  makeStaff("s6", "Eric", "Calvillo-E", "assistant-coach"),
  makeStaff("s7", "Victor", "Calvillo-V", "volunteer"),
  makeStaff("s8", "Dylan", "Conti-D", "volunteer"),
  makeStaff("s9", "Sergio", "Gonzalez", "assistant-coach"),
  makeStaff("s10", "Mahdi", "Hossaini", "assistant-coach"),
  makeStaff("s11", "Gisele", "Huang", "volunteer"),
  makeStaff("s12", "Isaac", "Kim", "assistant-coach"),
  makeStaff("s13", "David", "Linus", "assistant-coach"),
  makeStaff("s14", "Gustavo", "Lopez-P", "head-coach"),
  makeStaff("s15", "Jan", "Maldonado", "assistant-coach"),
  makeStaff("s16", "Zach", "Meskunas", "volunteer"),
  makeStaff("s17", "Madie", "Miller", "volunteer"),
  makeStaff("s18", "Abdul", "Mohsini", "assistant-coach"),
  makeStaff("s19", "Fernando", "Monterrosa", "assistant-coach"),
  makeStaff("s20", "Fasih", "Nooran", "assistant-coach"),
  makeStaff("s21", "Haseeb", "Nooran", "assistant-coach"),
  makeStaff("s22", "Ahroon", "Nusraty", "assistant-coach"),
  makeStaff("s23", "David", "Panamano", "assistant-coach"),
  makeStaff("s24", "Quan", "Phan", "volunteer"),
  makeStaff("s25", "Kevin", "Ramos", "assistant-coach"),
  makeStaff("s26", "Dave", "Salas", "assistant-coach"),
  makeStaff("s27", "Haroon", "Sarwari", "assistant-coach"),
  makeStaff("s28", "Brandon", "Williamson", "volunteer"),
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function makeSession(
  id: string,
  scheduleId: string,
  date: string,
  startTime: string,
  endTime: string,
  location: string,
  requiredStaff: number
): Session {
  const d = new Date(date + "T12:00:00");
  return {
    id,
    scheduleId,
    date,
    dayOfWeek: DAYS[d.getDay()],
    startTime,
    endTime,
    location,
    requiredStaff,
  };
}

interface SessionPattern {
  startTime: string;
  endTime: string;
  location: string;
  requiredStaff: number;
}

const dayPatterns: Record<number, SessionPattern[]> = {
  0: [ // Sunday
    { startTime: "9:00 AM", endTime: "10:00 AM", location: "Field House", requiredStaff: 3 },
    { startTime: "10:00 AM", endTime: "11:00 AM", location: "Field House", requiredStaff: 3 },
    { startTime: "11:00 AM", endTime: "1:00 PM", location: "Field House", requiredStaff: 5 },
  ],
  1: [ // Monday
    { startTime: "4:00 PM", endTime: "5:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "5:00 PM", endTime: "6:25 PM", location: "Field House", requiredStaff: 4 },
    { startTime: "6:30 PM", endTime: "8:00 PM", location: "Field House", requiredStaff: 4 },
  ],
  2: [ // Tuesday
    { startTime: "4:00 PM", endTime: "5:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "5:00 PM", endTime: "6:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "6:00 PM", endTime: "7:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "7:00 PM", endTime: "8:00 PM", location: "Field House", requiredStaff: 3 },
  ],
  3: [ // Wednesday
    { startTime: "4:00 PM", endTime: "5:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "5:00 PM", endTime: "6:25 PM", location: "Field House", requiredStaff: 4 },
    { startTime: "6:30 PM", endTime: "8:00 PM", location: "Field House", requiredStaff: 4 },
  ],
  4: [ // Thursday
    { startTime: "4:00 PM", endTime: "5:00 PM", location: "Field House", requiredStaff: 2 },
    { startTime: "5:00 PM", endTime: "6:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "6:00 PM", endTime: "8:00 PM", location: "Field House", requiredStaff: 3 },
  ],
  5: [ // Friday
    { startTime: "4:00 PM", endTime: "5:00 PM", location: "Field House", requiredStaff: 3 },
    { startTime: "5:00 PM", endTime: "6:25 PM", location: "Field House", requiredStaff: 4 },
  ],
  6: [ // Saturday
    { startTime: "9:00 AM", endTime: "10:00 AM", location: "K Sport", requiredStaff: 2 },
    { startTime: "10:00 AM", endTime: "11:00 AM", location: "K Sport", requiredStaff: 2 },
    { startTime: "11:00 AM", endTime: "12:00 PM", location: "K Sport", requiredStaff: 2 },
  ],
};

function generateWeeklySessions(
  scheduleId: string,
  startDate: string,
  weeks: number,
  idOffset: number
): Session[] {
  const sessions: Session[] = [];
  const start = new Date(startDate + "T12:00:00");
  let counter = idOffset;

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const current = new Date(start);
      current.setDate(current.getDate() + w * 7 + d);
      const dateStr = current.toISOString().split("T")[0];
      const dayOfWeek = current.getDay();
      const patterns = dayPatterns[dayOfWeek] || [];

      for (const pattern of patterns) {
        sessions.push(
          makeSession(
            `sess-${counter++}`,
            scheduleId,
            dateStr,
            pattern.startTime,
            pattern.endTime,
            pattern.location,
            pattern.requiredStaff
          )
        );
      }
    }
  }

  return sessions;
}

const febSessions = generateWeeklySessions("sched-1", "2026-02-02", 5, 1);

export const initialSchedules: Schedule[] = [
  {
    id: "sched-1",
    name: "February 2026 Training Block",
    description: "Weekly coaching sessions at Field House and K Sport for the academy.",
    startDate: "2026-02-02",
    endDate: "2026-03-08",
    sessions: febSessions,
  },
];

function av(staffId: string, sessionId: string, status: Availability["status"]): Availability {
  return { staffId, sessionId, status };
}

function buildAvailability(): Availability[] {
  const entries: Availability[] = [];
  const sessionsByDate = new Map<string, Session[]>();
  for (const s of febSessions) {
    const existing = sessionsByDate.get(s.date) || [];
    existing.push(s);
    sessionsByDate.set(s.date, existing);
  }

  const staffAvailMap: Record<string, Record<string, Availability["status"]>> = {
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

  for (const [staffId, dateMap] of Object.entries(staffAvailMap)) {
    for (const [date, status] of Object.entries(dateMap)) {
      const dateSessions = sessionsByDate.get(date) || [];
      for (const session of dateSessions) {
        entries.push(av(staffId, session.id, status));
      }
    }
  }

  return entries;
}

export const initialAvailability: Availability[] = buildAvailability();
