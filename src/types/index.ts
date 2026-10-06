// Domain & Entity Types for Ap Desktop Application

export type ScreenId =
  | 'dashboard'
  | 'tracks'
  | 'problems'
  | 'python'
  | 'sql'
  | 'postgres'
  | 'planner'
  | 'sessions'
  | 'analytics'
  | 'review'
  | 'reports'
  | 'settings'
  | 'profile'
  | 'login';

export type AccentColor =
  | 'red'
  | 'pink'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'gray';

export type ThemeMode = 'light' | 'dark' | 'system';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export type ProblemStatus = 'todo' | 'attempted' | 'solved' | 'bookmarked';

export type PriorityLevel = 'Low' | 'Medium' | 'High';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';

export interface Track {
  id: string;
  slug: string;
  title: string;
  description: string;
  track_order: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  total_problems?: number;
  solved_problems?: number;
  estimated_hours?: string;
  icon?: string;
}

export interface Topic {
  id: string;
  track_id: string;
  pattern_number?: number;
  title: string;
  topic_order: number;
}

export interface Subtopic {
  id: string;
  topic_id: string;
  subtopic_number?: number;
  title: string;
  tutorial_link?: string;
  video_link?: string;
  subtopic_order: number;
}

export interface Question {
  id: string;
  subtopic_id?: string;
  track_slug?: string;
  pattern_name?: string;
  subtopic_name?: string;
  title: string;
  platform: string;
  difficulty: DifficultyLevel;
  practice_link?: string;
  video_link?: string;
  hint_link?: string;
  xp: number;
  content_type: string;
  status: ProblemStatus;
  order_num: number;
  last_attempted?: string;
  is_bookmarked?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  due_date?: string;
  track_id?: string;
  track_name?: string;
  estimated_minutes: number;
  completed_at?: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  task_id?: string;
  task_title?: string;
  track_id?: string;
  track_name?: string;
  session_type: 'focus' | 'short_break' | 'long_break';
  started_at: string;
  ended_at?: string;
  elapsed_seconds: number;
  active_seconds: number;
  idle_seconds: number;
  status: 'completed' | 'interrupted' | 'abandoned';
}

export interface DailyReview {
  id: string;
  date_key: string;
  accomplishments: Array<{ id: string; title: string; category: string; time: string }>;
  reflection_learning: string;
  blockers_improvements: string;
  tomorrow_plan: Array<{ id: string; title: string; category: string; priority: PriorityLevel }>;
  is_draft: boolean;
  updated_at: string;
}

export interface Attempt {
  id: string;
  question_id: string;
  question_title?: string;
  problem_title?: string;
  difficulty?: string;
  category?: string;
  problem_type?: 'python' | 'sql' | 'postgres';
  language: string;
  code: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
  runtime_ms: number;
  memory_kb: number;
  test_cases_passed: number;
  total_test_cases: number;
  created_at: string;
}

export interface SubmissionRecord {
  id: string;
  question_id: string;
  problem_title: string;
  difficulty: string;
  category?: string;
  problem_type?: 'python' | 'sql' | 'postgres';
  language: string;
  code: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
  runtime_ms?: number;
  memory_kb?: number;
  test_cases_passed?: number;
  total_test_cases?: number;
  created_at: string;
}

export interface HeatmapDay {
  date: string;
  count: number;
  acceptedCount: number;
  level: number;
}

export interface HeatmapResult {
  weeks: HeatmapDay[][];
  totalSubmissions: number;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  year: number | 'current';
}

export interface ProfileStatsResult {
  totalSolved: number;
  totalQuestions: number;
  easySolved: number;
  easyTotal: number;
  mediumSolved: number;
  mediumTotal: number;
  hardSolved: number;
  hardTotal: number;
  attemptingCount: number;
  totalSubmissions: number;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
}

export interface SqlExercise {
  id: string;
  title: string;
  difficulty: DifficultyLevel;
  category: string;
  description: string;
  schema_sql: string;
  seed_sql: string;
  initial_query?: string;
  solution_sql: string;
  expected_output_json: string;
  schema_tables_ascii?: string;
  input_ascii?: string;
  output_ascii?: string;
  explanation?: string;
  pandas_schema?: string;
  image_url?: string;
}

export interface PostgresExercise {
  id: string;
  title: string;
  difficulty: DifficultyLevel;
  category: string;
  description: string;
  setup_sql: string;
  query_solution: string;
  verification_sql?: string;
  notes?: string;
}

export interface LicenseState {
  status: 'Valid' | 'ExpiredGrace' | 'Invalid' | 'Revoked' | 'WrongMachine' | 'Tampered' | 'Unlicensed';
  edition: 'pro' | 'standard' | 'free';
  holder: string;
  expires_at: string;
  features: string[];
  machine_id: string;
}

export interface IntegrityStatus {
  state: 'Healthy' | 'Degraded' | 'IntegrityFailed' | 'Compromised';
  score: number;
  signature_ok: boolean;
  manifest_ok: boolean;
  db_chain_ok: boolean;
  interpreter_ok: boolean;
  last_check: string;
}

export interface UserProfile {
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  rank?: number;
  bio: string;
  location: string;
  institution: string;
  website: string;
  github: string;
  linkedin: string;
  twitter: string;
  skills: string[];
  contestRating: number;
  globalRanking: string;
  attendedContests: number;
  solved: {
    total: number;
    easy: number;
    easyTotal: number;
    medium: number;
    mediumTotal: number;
    hard: number;
    hardTotal: number;
  };
}
