-- HP Elite Staff Scheduler - Application Schema
-- Better Auth tables are auto-created by the framework.

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lead', 'experience', 'junior', 'trial')),
  years_experience INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS staff_user_id_unique ON staff(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_type (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auto_assign_profile (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan JSONB NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_session (
  id TEXT PRIMARY KEY,
  schedule_id TEXT NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT NOT NULL,
  required_staff INTEGER NOT NULL DEFAULT 1,
  class_type TEXT REFERENCES class_type(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_training_session_schedule_id ON training_session(schedule_id);
CREATE INDEX IF NOT EXISTS idx_training_session_date ON training_session(date);
CREATE INDEX IF NOT EXISTS idx_training_session_date_time ON training_session(date, start_time, end_time);

CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id TEXT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES training_session(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('available', 'unavailable', 'maybe', 'pending')),
  custom_start_time TEXT,
  custom_end_time TEXT,
  notes TEXT,
  UNIQUE (staff_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_availability_staff ON availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_availability_session ON availability(session_id);

CREATE TABLE IF NOT EXISTS session_slot (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES training_session(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,
  assigned_staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  -- Optional per-assignment worked window. NULL means the full session window.
  -- Used for partial shifts (e.g. assigned to a 9a-3p class but only works 9a-12p)
  -- so payroll/hours reports reflect actual time worked.
  assigned_start_time TEXT,
  assigned_end_time TEXT
);

CREATE INDEX IF NOT EXISTS idx_session_slot_session ON session_slot(session_id);
CREATE UNIQUE INDEX IF NOT EXISTS session_slot_session_index_unique ON session_slot(session_id, slot_index);
CREATE UNIQUE INDEX IF NOT EXISTS session_slot_session_staff_unique ON session_slot(session_id, assigned_staff_id) WHERE assigned_staff_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS report (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  schedule_id TEXT NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
  schedule_name TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  scope TEXT NOT NULL CHECK (scope IN ('breakdown', 'single')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_schedule ON report(schedule_id);
CREATE INDEX IF NOT EXISTS idx_report_generated_at ON report(generated_at DESC);
