export type StaffRole = "lead" | "experience" | "junior" | "trial";

export interface Staff {
  id: string;
  userId?: string;
  email?: string;
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
  classType?: string;
}

export interface ClassType {
  id: string;
  label: string;
  colorKey: string;
  sortOrder: number;
}

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  sessions: Session[];
}

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

export type AutoAssignStrategy = "cheap" | "balanced" | "expensive";

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
