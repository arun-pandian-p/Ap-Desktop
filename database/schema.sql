-- Ap Workspace Canonical Database Schema
-- Compatible with SQLite (sql.js / JDBC) and PostgreSQL

CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  track_order INTEGER NOT NULL,
  level TEXT,
  category TEXT,
  tags TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  track_id TEXT REFERENCES tracks(id),
  pattern_number INTEGER,
  title TEXT NOT NULL,
  topic_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subtopics (
  id TEXT PRIMARY KEY,
  topic_id TEXT REFERENCES topics(id),
  subtopic_number INTEGER,
  title TEXT NOT NULL,
  tutorial_link TEXT,
  video_link TEXT,
  subtopic_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  subtopic_id TEXT,
  track_slug TEXT,
  pattern_name TEXT,
  subtopic_name TEXT,
  title TEXT NOT NULL,
  platform TEXT DEFAULT 'LeetCode',
  difficulty TEXT DEFAULT 'Medium',
  practice_link TEXT,
  video_link TEXT,
  hint_link TEXT,
  xp INTEGER DEFAULT 5,
  content_type TEXT DEFAULT 'problem',
  status TEXT DEFAULT 'todo',
  order_num INTEGER NOT NULL,
  last_attempted TIMESTAMP,
  is_bookmarked INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_status TEXT DEFAULT 'unverified',
  source_url TEXT,
  source_attribution TEXT,
  source_license TEXT,
  original_statement TEXT,
  ap_authored_statement TEXT,
  public_examples_json TEXT,
  private_tests_json TEXT,
  reference_implementation TEXT,
  verification_diagnostics TEXT,
  verified_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'todo',
  due_date TEXT,
  track_id TEXT,
  estimated_minutes INTEGER DEFAULT 25,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  track_id TEXT,
  session_type TEXT,
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  elapsed_seconds INTEGER DEFAULT 0,
  active_seconds INTEGER DEFAULT 0,
  idle_seconds INTEGER DEFAULT 0,
  status TEXT,
  row_hmac TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  question_id TEXT REFERENCES questions(id),
  problem_title TEXT,
  difficulty TEXT,
  category TEXT,
  problem_type TEXT DEFAULT 'python',
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL,
  runtime_ms INTEGER,
  memory_kb INTEGER,
  test_cases_passed INTEGER,
  total_test_cases INTEGER,
  row_hmac TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_reviews (
  id TEXT PRIMARY KEY,
  date_key TEXT UNIQUE NOT NULL,
  accomplishments_json TEXT,
  reflection_learning TEXT,
  blockers_improvements TEXT,
  tomorrow_plan_json TEXT,
  is_draft INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS code_drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  problem_id TEXT NOT NULL,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sql_exercises (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  schema_sql TEXT NOT NULL,
  seed_sql TEXT NOT NULL,
  initial_query TEXT,
  solution_sql TEXT NOT NULL,
  expected_output_json TEXT,
  schema_tables_ascii TEXT,
  input_ascii TEXT,
  output_ascii TEXT,
  explanation TEXT,
  pandas_schema TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS postgres_exercises (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  setup_sql TEXT NOT NULL,
  query_solution TEXT NOT NULL,
  verification_sql TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
