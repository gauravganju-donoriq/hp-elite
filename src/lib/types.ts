export type StaffRole = "head-coach" | "assistant-coach" | "volunteer" | "intern";

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
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
}

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  sessions: Session[];
}
