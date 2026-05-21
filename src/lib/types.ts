export type StaffRole = "lead" | "experience" | "junior" | "trial";

export interface Staff {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  yearsExperience: number;
}

export type AvailabilityStatus = "available" | "unavailable" | "maybe" | "pending";

export interface Availability {
  staffId: string;
  sessionId: string;
  status: AvailabilityStatus;
  customStartTime?: string;
  customEndTime?: string;
  notes?: string;
}

export interface Session {
  id: string;
  scheduleId: string;
  date: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  requiredStaff: number;
  classType?: SlotType;
}

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  sessions: Session[];
}

export type SlotType =
  | "hp-speed"
  | "hp-speed-2"
  | "hp-flight"
  | "footskills"
  | "first-touch-tempo"
  | "complete-player"
  | "1v1-transition"
  | "shooting-finishing"
  | "ball-masters"
  | "streetball"
  | "tournament-prep"
  | "u5u6-minis"
  | "u7u8-futures-footskills"
  | "u7u8-futures-ball-striking"
  | "u7u8-futures-complete-player"
  | "general";

export interface SessionSlot {
  id: string;
  sessionId: string;
  slotIndex: number;
  assignedStaffId?: string;
}

export interface AutoAssignConflict {
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  classType?: string;
  requiredStaff: number;
  assignedCount: number;
  unfilledCount: number;
  availableCount: number;
  maybeCount: number;
  reason: string;
}

export interface AutoAssignResult {
  assigned: number;
  empty: number;
  conflicts: AutoAssignConflict[];
}

export type ReportPeriodType = "weekly" | "monthly";
export type ReportScope = "breakdown" | "single";

export interface ReportBucket {
  label: string;
  start: string;
  end: string;
}

export interface ReportRow {
  staffId: string;
  staffName: string;
  role: StaffRole;
  buckets: number[];
  total: number;
}

export interface ReportPayload {
  buckets: ReportBucket[];
  rows: ReportRow[];
  totalHours: number;
}

export interface Report {
  id: string;
  name: string;
  scheduleId: string;
  scheduleName: string;
  periodType: ReportPeriodType;
  scope: ReportScope;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  payload: ReportPayload;
}

export type ReportSummary = Omit<Report, "payload">;
