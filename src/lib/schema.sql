-- HP Elite Staff Scheduler - Application Schema
-- Better Auth tables are auto-created by the framework.

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('head-coach', 'assistant-coach', 'volunteer', 'intern')),
  years_experience INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);

CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
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
  class_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_training_session_schedule_id ON training_session(schedule_id);
CREATE INDEX IF NOT EXISTS idx_training_session_date ON training_session(date);

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
  assigned_staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_session_slot_session ON session_slot(session_id);
