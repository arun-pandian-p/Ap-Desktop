import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import seedData from '@/data/seedData.json';
import sqlExercisesData from '@/data/sqlExercises.json';
import postgresExercisesData from '@/data/postgresExercises.json';
import { Track, Question, Task, StudySession, DailyReview, Attempt, LicenseState, IntegrityStatus, SqlExercise, PostgresExercise, SubmissionRecord, HeatmapResult, ProfileStatsResult, HeatmapDay } from '@/types';

const DB_STORAGE_KEY = 'ap_encrypted_sqlite_db_v1';
const DB_HMAC_KEY = 'ap_tamper_evidence_root_key_2026';

let dbInstance: Database | null = null;

// Simple browser-compatible HMAC-SHA256 simulation for row integrity chain
async function computeRowHmac(prevHmac: string, canonicalRow: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(DB_HMAC_KEY);
  const data = enc.encode(`${prevHmac}::${canonicalRow}`);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
      );
      const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, data);
      return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }
  // Lightweight hash fallback
  let hash = 0;
  const str = prevHmac + canonicalRow;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return 'hmac-' + Math.abs(hash).toString(16);
}

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const init = typeof initSqlJs === 'function' ? initSqlJs : (initSqlJs as any)?.default;
  const isNode = typeof window === 'undefined';
  const SQL = await init(isNode ? {} : { locateFile: () => `/sql-wasm.wasm` });

  const savedData = typeof localStorage !== 'undefined' ? localStorage.getItem(DB_STORAGE_KEY) : null;
  if (savedData) {
    try {
      const binaryString = atob(savedData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const restored = new SQL.Database(bytes);
      initializeSchema(restored);
      await seedAdditionalTables(restored);
      dbInstance = restored;
      persistDatabase();
      return restored;
    } catch (e) {
      console.warn('Failed to restore persisted DB, creating fresh instance:', e);
    }
  }

  // Create fresh database
  const freshDb = new SQL.Database();
  initializeSchema(freshDb);
  await seedInitialData(freshDb);
  await seedAdditionalTables(freshDb);
  dbInstance = freshDb;
  persistDatabase();

  return freshDb;
}

export function persistDatabase(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    let binary = '';
    const bytes = new Uint8Array(data);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DB_STORAGE_KEY, btoa(binary));
    }
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

function initializeSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      track_order INTEGER NOT NULL,
      level TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      track_id TEXT,
      pattern_number INTEGER,
      title TEXT NOT NULL,
      topic_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subtopics (
      id TEXT PRIMARY KEY,
      topic_id TEXT,
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
      platform TEXT,
      difficulty TEXT,
      practice_link TEXT,
      video_link TEXT,
      hint_link TEXT,
      xp INTEGER DEFAULT 5,
      content_type TEXT DEFAULT 'problem',
      status TEXT DEFAULT 'todo',
      order_num INTEGER NOT NULL,
      last_attempted TEXT,
      is_bookmarked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      track_id TEXT,
      session_type TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      elapsed_seconds INTEGER DEFAULT 0,
      active_seconds INTEGER DEFAULT 0,
      idle_seconds INTEGER DEFAULT 0,
      status TEXT,
      row_hmac TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      question_id TEXT,
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_reviews (
      id TEXT PRIMARY KEY,
      date_key TEXT UNIQUE NOT NULL,
      accomplishments_json TEXT,
      reflection_learning TEXT,
      blockers_improvements TEXT,
      tomorrow_plan_json TEXT,
      is_draft INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS license_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      lid TEXT,
      details_json TEXT,
      row_hmac TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS integrity_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      score INTEGER NOT NULL,
      details_json TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe migrations for attempts table
  const attemptCols = [
    'ALTER TABLE attempts ADD COLUMN problem_title TEXT;',
    'ALTER TABLE attempts ADD COLUMN difficulty TEXT;',
    'ALTER TABLE attempts ADD COLUMN category TEXT;',
    'ALTER TABLE attempts ADD COLUMN problem_type TEXT DEFAULT "python";'
  ];
  for (const sql of attemptCols) {
    try { db.run(sql); } catch {}
  }
}

async function seedAdditionalTables(db: Database): Promise<void> {
  try {
    const sqlCount = db.exec(`SELECT COUNT(*) FROM sql_exercises`);
    const hasSql = sqlCount.length > 0 && (sqlCount[0].values[0][0] as number) > 0;
    const hasLeetcode175 = db.exec(`SELECT COUNT(*) FROM sql_exercises WHERE id = 'sql-175'`);
    const needSqlSeed = !hasSql || !hasLeetcode175.length || (hasLeetcode175[0].values[0][0] as number) === 0;

    if (needSqlSeed) {
      for (const ex of sqlExercisesData as SqlExercise[]) {
        db.run(
          `INSERT OR REPLACE INTO sql_exercises 
           (id, title, difficulty, category, description, schema_sql, seed_sql, initial_query, solution_sql, expected_output_json, schema_tables_ascii, input_ascii, output_ascii, explanation, pandas_schema, image_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ex.id,
            ex.title,
            ex.difficulty,
            ex.category,
            ex.description,
            ex.schema_sql,
            ex.seed_sql,
            ex.initial_query || '',
            ex.solution_sql,
            ex.expected_output_json || '',
            ex.schema_tables_ascii || '',
            ex.input_ascii || '',
            ex.output_ascii || '',
            ex.explanation || '',
            ex.pandas_schema || '',
            ex.image_url || ''
          ]
        );
      }
    }

    const pgCount = db.exec(`SELECT COUNT(*) FROM postgres_exercises`);
    const hasPg = pgCount.length > 0 && (pgCount[0].values[0][0] as number) > 0;
    if (!hasPg) {
      for (const pg of postgresExercisesData as PostgresExercise[]) {
        db.run(
          `INSERT OR REPLACE INTO postgres_exercises 
           (id, title, difficulty, category, description, setup_sql, query_solution, verification_sql, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pg.id,
            pg.title,
            pg.difficulty,
            pg.category,
            pg.description,
            pg.setup_sql,
            pg.query_solution,
            pg.verification_sql || '',
            pg.notes || ''
          ]
        );
      }
    }

    const attCountRes = db.exec(`SELECT COUNT(*) FROM attempts`);
    const attCount = attCountRes.length > 0 ? (attCountRes[0].values[0][0] as number) : 0;
    if (attCount === 0) {
      await seedBaselineAttempts(db);
    }
  } catch (err) {
    console.warn('Error in seedAdditionalTables:', err);
  }
}

async function seedInitialData(db: Database): Promise<void> {
  const { tracks, topics, subtopics, questions } = seedData;

  // Insert tracks
  for (const t of tracks) {
    db.run(
      `INSERT OR REPLACE INTO tracks (id, slug, title, description, track_order, level) VALUES (?, ?, ?, ?, ?, ?)`,
      [t.id, t.slug, t.title, t.description, t.track_order, t.level]
    );
  }

  // Insert topics
  for (const top of topics) {
    db.run(
      `INSERT OR REPLACE INTO topics (id, track_id, pattern_number, title, topic_order) VALUES (?, ?, ?, ?, ?)`,
      [top.id, top.track_id, top.pattern_number, top.title, top.topic_order]
    );
  }

  // Insert subtopics
  for (const s of subtopics) {
    db.run(
      `INSERT OR REPLACE INTO subtopics (id, topic_id, subtopic_number, title, tutorial_link, video_link, subtopic_order) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.topic_id, s.subtopic_number, s.title, s.tutorial_link, s.video_link, s.subtopic_order]
    );
  }

  // Insert questions (1,337 items)
  for (const q of questions) {
    db.run(
      `INSERT OR REPLACE INTO questions (id, subtopic_id, track_slug, pattern_name, subtopic_name, title, platform, difficulty, practice_link, video_link, hint_link, xp, content_type, status, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        q.id,
        q.subtopic_id,
        q.track_slug,
        q.pattern_name,
        q.subtopic_name,
        q.title,
        q.platform,
        q.difficulty,
        q.practice_link,
        q.video_link,
        q.hint_link,
        q.xp,
        q.content_type,
        q.status,
        q.order_num
      ]
    );
  }

  // Seed sample tasks matching the mockups
  const sampleTasks = [
    { id: 'task-1', title: 'Two Pointers Technique Practice', priority: 'High', status: 'in_progress', due_date: 'Today, 5:00 PM', estimated_minutes: 45 },
    { id: 'task-2', title: 'SQL Joins & Aggregations Review', priority: 'Medium', status: 'todo', due_date: 'Today, 8:00 PM', estimated_minutes: 30 },
    { id: 'task-3', title: 'Binary Search Edge Cases', priority: 'High', status: 'completed', due_date: 'Yesterday', estimated_minutes: 40 },
    { id: 'task-4', title: 'System Design: Rate Limiter', priority: 'Medium', status: 'todo', due_date: 'Tomorrow, 10:00 AM', estimated_minutes: 60 },
    { id: 'task-5', title: 'Dynamic Programming Patterns 1-5', priority: 'High', status: 'todo', due_date: 'Oct 8, 2026', estimated_minutes: 90 },
  ];

  for (const task of sampleTasks) {
    db.run(
      `INSERT OR REPLACE INTO tasks (id, title, priority, status, due_date, estimated_minutes) VALUES (?, ?, ?, ?, ?, ?)`,
      [task.id, task.title, task.priority, task.status, task.due_date, task.estimated_minutes]
    );
  }

  // Seed sample study sessions
  const sampleHmac = await computeRowHmac('genesis', 'session-1');
  db.run(
    `INSERT OR REPLACE INTO study_sessions (id, session_type, started_at, elapsed_seconds, active_seconds, idle_seconds, status, row_hmac) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['session-1', 'focus', new Date(Date.now() - 3600000).toISOString(), 2700, 2400, 300, 'completed', sampleHmac]
  );

  // Set default app settings
  const defaultSettings = [
    ['theme', 'light'],
    ['accent', 'red'],
    ['density', 'comfortable'],
    ['font_size', 'medium'],
    ['idle_threshold_minutes', '2'],
    ['exclude_idle', 'true'],
    ['capture_protection', 'false'],
    ['user_name', 'Arun Pandian'],
    ['user_email', 'arunpandi47777@gmail.com'],
    ['user_handle', 'arun4709s'],
  ];

  for (const [key, value] of defaultSettings) {
    db.run(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [key, value]);
  }
}

// Database Query APIs
export async function fetchTracks(): Promise<Track[]> {
  const db = await getDatabase();
  const res = db.exec(`SELECT * FROM tracks ORDER BY track_order ASC`);
  if (!res.length) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj as Track;
  });
}

export async function fetchQuestions(options?: {
  limit?: number;
  offset?: number;
  search?: string;
  difficulty?: string;
  status?: string;
  trackSlug?: string;
}): Promise<{ questions: Question[]; total: number }> {
  const db = await getDatabase();
  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (options?.difficulty && options.difficulty !== 'All') {
    where += ' AND difficulty = ?';
    params.push(options.difficulty);
  }
  if (options?.status && options.status !== 'All') {
    where += ' AND status = ?';
    params.push(options.status.toLowerCase());
  }
  if (options?.trackSlug) {
    where += ' AND track_slug = ?';
    params.push(options.trackSlug);
  }
  if (options?.search) {
    where += ' AND (title LIKE ? OR pattern_name LIKE ? OR subtopic_name LIKE ?)';
    const s = `%${options.search}%`;
    params.push(s, s, s);
  }

  // Count total
  const countRes = db.exec(`SELECT COUNT(*) FROM questions ${where}`, params);
  const total = countRes.length > 0 ? (countRes[0].values[0][0] as number) : 0;

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  params.push(limit, offset);

  const res = db.exec(`SELECT * FROM questions ${where} ORDER BY order_num ASC LIMIT ? OFFSET ?`, params);
  if (!res.length) return { questions: [], total };

  const cols = res[0].columns;
  const questions = res[0].values.map(row => {
    const obj: any = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj as Question;
  });

  return { questions, total };
}

export async function updateQuestionStatus(id: string, status: string): Promise<void> {
  const db = await getDatabase();
  db.run(`UPDATE questions SET status = ?, last_attempted = datetime('now') WHERE id = ?`, [status, id]);
  persistDatabase();
}

export async function fetchTasks(): Promise<Task[]> {
  const db = await getDatabase();
  const res = db.exec(`SELECT * FROM tasks ORDER BY created_at DESC`);
  if (!res.length) return [];
  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj as Task;
  });
}

export async function addTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
  const db = await getDatabase();
  const id = `task-${Date.now()}`;
  db.run(
    `INSERT INTO tasks (id, title, description, priority, status, due_date, estimated_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, task.title, task.description || '', task.priority, task.status, task.due_date || '', task.estimated_minutes]
  );
  persistDatabase();
  return { ...task, id, created_at: new Date().toISOString() };
}

export async function updateTaskStatus(id: string, status: string): Promise<void> {
  const db = await getDatabase();
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  db.run(`UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?`, [status, completedAt, id]);
  persistDatabase();
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDatabase();
  db.run(`DELETE FROM tasks WHERE id = ?`, [id]);
  persistDatabase();
}

export async function fetchAppSettings(): Promise<Record<string, string>> {
  const db = await getDatabase();
  const res = db.exec(`SELECT key, value FROM app_settings`);
  const settings: Record<string, string> = {};
  if (res.length > 0) {
    res[0].values.forEach(row => {
      settings[row[0] as string] = row[1] as string;
    });
  }
  return settings;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  db.run(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [key, value]);
  persistDatabase();
}

export async function logStudySession(session: Omit<StudySession, 'id' | 'row_hmac'>): Promise<void> {
  const db = await getDatabase();
  const id = `session-${Date.now()}`;
  const canonical = JSON.stringify({ id, ...session });
  const row_hmac = await computeRowHmac('prev-session', canonical);
  db.run(
    `INSERT INTO study_sessions (id, session_type, started_at, ended_at, elapsed_seconds, active_seconds, idle_seconds, status, row_hmac) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, session.session_type, session.started_at, session.ended_at || '', session.elapsed_seconds, session.active_seconds, session.idle_seconds, session.status, row_hmac]
  );
  persistDatabase();
}

export async function fetchStats() {
  const db = await getDatabase();
  
  const qRes = db.exec(`SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'solved' THEN 1 ELSE 0 END) as solved,
    SUM(CASE WHEN status = 'attempted' THEN 1 ELSE 0 END) as attempted
    FROM questions`);
    
  const tRes = db.exec(`SELECT 
    COUNT(*) as total_tasks,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
    FROM tasks`);

  const sRes = db.exec(`SELECT 
    SUM(active_seconds) as total_active_seconds
    FROM study_sessions`);

  const qData = qRes.length > 0 ? qRes[0].values[0] : [1337, 0, 0];
  const tData = tRes.length > 0 ? tRes[0].values[0] : [0, 0];
  const sData = sRes.length > 0 ? sRes[0].values[0] : [0];

  const totalQuestions = (qData[0] as number) || 1337;
  const attemptedQuestions = (qData[2] as number) || 0;
  const totalTasks = (tData[0] as number) || 0;
  const completedTasks = (tData[1] as number) || 0;
  const activeSeconds = (sData[0] as number) || 3600;

  const profileStats = await fetchProfileStats();
  const accuracy = profileStats.totalSubmissions > 0
    ? Math.round((profileStats.totalSolved / profileStats.totalSubmissions) * 100)
    : (attemptedQuestions > 0 ? Math.round((profileStats.totalSolved / attemptedQuestions) * 100) : 78);

  return {
    totalQuestions,
    solvedQuestions: profileStats.totalSolved,
    accuracy,
    activeStudyHours: (activeSeconds / 3600).toFixed(1),
    topicsCompleted: 18,
    totalTopics: 52,
    completedTasks: completedTasks > 0 ? completedTasks : 3,
    totalTasks: totalTasks > 0 ? totalTasks : 5,
    streakDays: profileStats.currentStreak,
  };
}

// -------------------------------------------------------------
// Curriculum & Problem Dataset Management APIs
// -------------------------------------------------------------

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

export async function importQuestionsFromCsv(csvText: string): Promise<{ imported: number; total: number }> {
  const db = await getDatabase();
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return { imported: 0, total: 0 };

  const headerLine = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  let importedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 3) continue;

    const orderNum = parseInt(row[0], 10) || i;
    const title = row[9] || row[1] || `Problem ${orderNum}`;
    const patternName = row[5] || 'General DSA';
    const subtopicName = row[7] || '';
    const platform = row[10] || 'LeetCode';
    const difficulty = row[11] || 'Medium';
    const practiceLink = row[12] || '';
    const videoLink = row[13] || '';
    const hintLink = row[14] || '';

    const id = `prob-${orderNum}`;

    db.run(
      `INSERT OR REPLACE INTO questions 
       (id, title, pattern_name, subtopic_name, platform, difficulty, practice_link, video_link, hint_link, order_num, xp, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5, 'todo')`,
      [id, title, patternName, subtopicName, platform, difficulty, practiceLink, videoLink, hintLink, orderNum]
    );
    importedCount++;
  }

  persistDatabase();

  const countRes = db.exec(`SELECT COUNT(*) FROM questions`);
  const total = countRes.length > 0 ? (countRes[0].values[0][0] as number) : importedCount;

  return { imported: importedCount, total };
}

export async function reloadQuestionsFromSeed(): Promise<{ total: number }> {
  const db = await getDatabase();
  const { questions } = seedData;

  for (const q of questions) {
    db.run(
      `INSERT OR REPLACE INTO questions 
       (id, subtopic_id, track_slug, pattern_name, subtopic_name, title, platform, difficulty, practice_link, video_link, hint_link, xp, status, order_num) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        q.id,
        q.subtopic_id || '',
        q.track_slug || 'core-dsa',
        q.pattern_name,
        q.subtopic_name,
        q.title,
        q.platform,
        q.difficulty,
        q.practice_link,
        q.video_link,
        q.hint_link,
        q.xp || 5,
        q.status || 'todo',
        q.order_num
      ]
    );
  }

  persistDatabase();
  const countRes = db.exec(`SELECT COUNT(*) FROM questions`);
  const total = countRes.length > 0 ? (countRes[0].values[0][0] as number) : questions.length;
  return { total };
}

export async function exportQuestionsToCsv(): Promise<string> {
  const db = await getDatabase();
  const res = db.exec(`SELECT order_num, title, pattern_name, subtopic_name, platform, difficulty, practice_link, status FROM questions ORDER BY order_num ASC`);
  if (!res.length) return '';

  const cols = res[0].columns;
  let csv = cols.join(',') + '\n';

  for (const row of res[0].values) {
    const escaped = row.map(val => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });
    csv += escaped.join(',') + '\n';
  }

  return csv;
}

export async function getCurriculumStats() {
  const db = await getDatabase();
  const res = db.exec(`SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN difficulty = 'Easy' THEN 1 ELSE 0 END) as easy,
    SUM(CASE WHEN difficulty = 'Medium' THEN 1 ELSE 0 END) as medium,
    SUM(CASE WHEN difficulty = 'Hard' THEN 1 ELSE 0 END) as hard,
    COUNT(DISTINCT pattern_name) as patterns
    FROM questions`);
  
  if (!res.length || !res[0].values.length) {
    return { total: 1337, easy: 450, medium: 650, hard: 237, patterns: 50 };
  }

  const row = res[0].values[0];
  return {
    total: (row[0] as number) || 1337,
    easy: (row[1] as number) || 0,
    medium: (row[2] as number) || 0,
    hard: (row[3] as number) || 0,
    patterns: (row[4] as number) || 50,
  };
}

export async function vacuumDatabase(): Promise<void> {
  const db = await getDatabase();
  db.run('VACUUM;');
  persistDatabase();
}

// ==========================================
// SQL Exercises DB APIs
// ==========================================
export async function fetchSqlExercises(): Promise<SqlExercise[]> {
  const db = await getDatabase();
  try {
    const res = db.exec(`SELECT * FROM sql_exercises ORDER BY CASE WHEN id = 'sql-175' THEN 0 ELSE 1 END, id ASC`);
    if (!res.length || !res[0].values.length) {
      return sqlExercisesData as SqlExercise[];
    }
    const cols = res[0].columns;
    return res[0].values.map(row => {
      const obj: any = {};
      cols.forEach((col, i) => { obj[col] = row[i]; });
      return obj as SqlExercise;
    });
  } catch (err) {
    return sqlExercisesData as SqlExercise[];
  }
}

export async function importSqlExercisesFromCsv(csvText: string): Promise<{ imported: number; total: number }> {
  const db = await getDatabase();
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return { imported: 0, total: 0 };

  let importedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 5) continue;

    const id = row[0] || `sql-${Date.now()}-${i}`;
    const title = row[1] || 'SQL Challenge';
    const difficulty = (row[2] || 'Medium') as any;
    const category = row[3] || 'General SQL';
    const description = row[4] || '';
    const schema_sql = row[5] || '';
    const seed_sql = row[6] || '';
    const initial_query = row[7] || '';
    const solution_sql = row[8] || '';
    const expected_output_json = row[9] || '[]';
    const input_ascii = row[10] || '';
    const output_ascii = row[11] || '';
    const explanation = row[12] || '';
    const image_url = row[13] || '';

    db.run(
      `INSERT OR REPLACE INTO sql_exercises 
       (id, title, difficulty, category, description, schema_sql, seed_sql, initial_query, solution_sql, expected_output_json, input_ascii, output_ascii, explanation, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, difficulty, category, description, schema_sql, seed_sql, initial_query, solution_sql, expected_output_json, input_ascii, output_ascii, explanation, image_url]
    );
    importedCount++;
  }

  persistDatabase();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ap_sql_exercises_updated'));
  }

  const countRes = db.exec(`SELECT COUNT(*) FROM sql_exercises`);
  const total = countRes.length > 0 ? (countRes[0].values[0][0] as number) : importedCount;
  return { imported: importedCount, total };
}

export async function exportSqlExercisesToCsv(): Promise<string> {
  const exercises = await fetchSqlExercises();
  if (!exercises.length) return '';
  const headers = ['id', 'title', 'difficulty', 'category', 'description', 'schema_sql', 'seed_sql', 'initial_query', 'solution_sql', 'expected_output_json', 'input_ascii', 'output_ascii', 'explanation', 'image_url'];
  let csv = headers.join(',') + '\n';
  for (const ex of exercises) {
    const row = [
      ex.id,
      ex.title,
      ex.difficulty,
      ex.category,
      ex.description,
      ex.schema_sql,
      ex.seed_sql,
      ex.initial_query || '',
      ex.solution_sql,
      ex.expected_output_json || '',
      ex.input_ascii || '',
      ex.output_ascii || '',
      ex.explanation || '',
      ex.image_url || ''
    ].map(v => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });
    csv += row.join(',') + '\n';
  }
  return csv;
}

export async function getSqlCurriculumStats() {
  const db = await getDatabase();
  try {
    const res = db.exec(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN difficulty = 'Easy' THEN 1 ELSE 0 END) as easy,
      SUM(CASE WHEN difficulty = 'Medium' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN difficulty = 'Hard' THEN 1 ELSE 0 END) as hard,
      COUNT(DISTINCT category) as categories
      FROM sql_exercises`);

    if (!res.length || !res[0].values.length) {
      return { total: sqlExercisesData.length, easy: 5, medium: 3, hard: 2, categories: 4 };
    }
    const row = res[0].values[0];
    return {
      total: (row[0] as number) || sqlExercisesData.length,
      easy: (row[1] as number) || 0,
      medium: (row[2] as number) || 0,
      hard: (row[3] as number) || 0,
      categories: (row[4] as number) || 1,
    };
  } catch {
    return { total: sqlExercisesData.length, easy: 5, medium: 3, hard: 2, categories: 4 };
  }
}

// ==========================================
// PostgreSQL Lab DB APIs
// ==========================================
export async function fetchPostgresExercises(): Promise<PostgresExercise[]> {
  const db = await getDatabase();
  try {
    const res = db.exec(`SELECT * FROM postgres_exercises ORDER BY id ASC`);
    if (!res.length || !res[0].values.length) {
      return postgresExercisesData as PostgresExercise[];
    }
    const cols = res[0].columns;
    return res[0].values.map(row => {
      const obj: any = {};
      cols.forEach((col, i) => { obj[col] = row[i]; });
      return obj as PostgresExercise;
    });
  } catch (err) {
    return postgresExercisesData as PostgresExercise[];
  }
}

export async function importPostgresExercisesFromCsv(csvText: string): Promise<{ imported: number; total: number }> {
  const db = await getDatabase();
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return { imported: 0, total: 0 };

  let importedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 4) continue;

    const id = row[0] || `pg-${Date.now()}-${i}`;
    const title = row[1] || 'PostgreSQL Lab Exercise';
    const difficulty = (row[2] || 'Medium') as any;
    const category = row[3] || 'System Catalogs';
    const description = row[4] || '';
    const setup_sql = row[5] || '';
    const query_solution = row[6] || '';
    const verification_sql = row[7] || '';
    const notes = row[8] || '';

    db.run(
      `INSERT OR REPLACE INTO postgres_exercises 
       (id, title, difficulty, category, description, setup_sql, query_solution, verification_sql, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, difficulty, category, description, setup_sql, query_solution, verification_sql, notes]
    );
    importedCount++;
  }

  persistDatabase();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ap_postgres_exercises_updated'));
  }

  const countRes = db.exec(`SELECT COUNT(*) FROM postgres_exercises`);
  const total = countRes.length > 0 ? (countRes[0].values[0][0] as number) : importedCount;
  return { imported: importedCount, total };
}

export async function exportPostgresExercisesToCsv(): Promise<string> {
  const exercises = await fetchPostgresExercises();
  if (!exercises.length) return '';
  const headers = ['id', 'title', 'difficulty', 'category', 'description', 'setup_sql', 'query_solution', 'verification_sql', 'notes'];
  let csv = headers.join(',') + '\n';
  for (const ex of exercises) {
    const row = [
      ex.id,
      ex.title,
      ex.difficulty,
      ex.category,
      ex.description,
      ex.setup_sql,
      ex.query_solution,
      ex.verification_sql || '',
      ex.notes || ''
    ].map(v => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });
    csv += row.join(',') + '\n';
  }
  return csv;
}

export async function getPostgresCurriculumStats() {
  const db = await getDatabase();
  try {
    const res = db.exec(`SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN difficulty = 'Easy' THEN 1 ELSE 0 END) as easy,
      SUM(CASE WHEN difficulty = 'Medium' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN difficulty = 'Hard' THEN 1 ELSE 0 END) as hard,
      COUNT(DISTINCT category) as categories
      FROM postgres_exercises`);

    if (!res.length || !res[0].values.length) {
      return { total: postgresExercisesData.length, easy: 1, medium: 2, hard: 1, categories: 3 };
    }
    const row = res[0].values[0];
    return {
      total: (row[0] as number) || postgresExercisesData.length,
      easy: (row[1] as number) || 0,
      medium: (row[2] as number) || 0,
      hard: (row[3] as number) || 0,
      categories: (row[4] as number) || 1,
    };
  } catch {
    return { total: postgresExercisesData.length, easy: 1, medium: 2, hard: 1, categories: 3 };
  }
}

// Sample CSV Generators for each Category
export function generateSampleCsv(category: 'python' | 'sql' | 'postgres'): string {
  if (category === 'python') {
    return `order_num,title,pattern_name,subtopic_name,platform,difficulty,practice_link,video_link,hint_link\n1,"Two Sum","Two Pointers - Technique","Array Basics","LeetCode","Easy","https://leetcode.com/problems/two-sum/","",""\n2,"Valid Parentheses","Stack","Parentheses","LeetCode","Easy","https://leetcode.com/problems/valid-parentheses/","",""`;
  }
  if (category === 'sql') {
    return `id,title,difficulty,category,description,schema_sql,seed_sql,initial_query,solution_sql,expected_output_json,input_ascii,output_ascii,explanation,image_url\n"sql-175","175. Combine Two Tables","Easy","JOINs","Write a solution to report the first name, last name, city, and state of each person in the Person table.","CREATE TABLE Person (personId INT PRIMARY KEY, lastName VARCHAR(50), firstName VARCHAR(50)); CREATE TABLE Address (addressId INT PRIMARY KEY, personId INT, city VARCHAR(50), state VARCHAR(50));","INSERT INTO Person VALUES (1, 'Wang', 'Allen'), (2, 'Alice', 'Bob'); INSERT INTO Address VALUES (1, 2, 'New York City', 'New York');","SELECT firstName, lastName, city, state FROM Person LEFT JOIN Address ON Person.personId = Address.personId;","SELECT firstName, lastName, city, state FROM Person LEFT JOIN Address ON Person.personId = Address.personId;","[{\\"firstName\\":\\"Allen\\",\\"lastName\\":\\"Wang\\",\\"city\\":null,\\"state\\":null}]","Input:\\nPerson table:\\n+----------+----------+-----------+\\n| personId | lastName | firstName |\\n+----------+----------+-----------+\\n| 1        | Wang     | Allen     |","Output:\\n+-----------+----------+---------------+----------+\\n| firstName | lastName | city          | state    |\\n+-----------+----------+---------------+----------+\\n| Allen     | Wang     | Null          | Null     |","If address not found, return null.",""`;
  }
  return `id,title,difficulty,category,description,setup_sql,query_solution,verification_sql,notes\n"pg-1","PostgreSQL 16 Diagnostic & Catalog Inspection","Easy","System Catalogs","Inspect PostgreSQL server metadata from pg_stat_database.","SELECT version(), current_database(), current_user;","SELECT datname, numbackends, xact_commit FROM pg_stat_database WHERE datname = current_database();","SELECT count(*) FROM pg_stat_database;","Genuine server query"`;
}

// ==========================================
// Submissions, Streaks & Heatmap Database Engine
// ==========================================

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateStringToDayNum(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d, 12, 0, 0) / 86400000);
}

export async function seedBaselineAttempts(db: Database): Promise<void> {
  try {
    let allQ: Array<{ id: string; title: string; difficulty: string; pattern: string }> = [];
    const qRes = db.exec(`SELECT id, title, difficulty, pattern_name FROM questions ORDER BY order_num ASC`);
    if (qRes.length && qRes[0].values.length) {
      for (const row of qRes[0].values) {
        allQ.push({
          id: String(row[0]),
          title: String(row[1]),
          difficulty: String(row[2] || 'Easy'),
          pattern: String(row[3] || 'Algorithms'),
        });
      }
    } else if (seedData && (seedData as any).questions) {
      allQ = (seedData as any).questions.map((q: any) => ({
        id: q.id,
        title: q.title,
        difficulty: q.difficulty || 'Easy',
        pattern: q.pattern_name || 'Algorithms',
      }));
    }

    const easyQ = allQ.filter(q => q.difficulty === 'Easy');
    const medQ = allQ.filter(q => q.difficulty === 'Medium');
    const hardQ = allQ.filter(q => q.difficulty === 'Hard');

    const solvedSet: Array<{ id: string; title: string; difficulty: string; category: string; type: 'python' | 'sql' }> = [];
    
    // LeetCode 175
    solvedSet.push({
      id: 'sql-175',
      title: '175. Combine Two Tables',
      difficulty: 'Easy',
      category: 'JOINs',
      type: 'sql',
    });

    for (let i = 0; i < Math.min(63, easyQ.length); i++) {
      solvedSet.push({
        id: easyQ[i].id,
        title: easyQ[i].title,
        difficulty: 'Easy',
        category: easyQ[i].pattern,
        type: 'python',
      });
    }

    for (let i = 0; i < Math.min(23, medQ.length); i++) {
      solvedSet.push({
        id: medQ[i].id,
        title: medQ[i].title,
        difficulty: 'Medium',
        category: medQ[i].pattern,
        type: 'python',
      });
    }

    for (let i = 0; i < Math.min(3, hardQ.length); i++) {
      solvedSet.push({
        id: hardQ[i].id,
        title: hardQ[i].title,
        difficulty: 'Hard',
        category: hardQ[i].pattern,
        type: 'python',
      });
    }

    const attemptingQ = [
      easyQ[64] || { id: 'att-1', title: 'Subtree of Another Tree', difficulty: 'Easy', pattern: 'Trees' },
      medQ[24] || { id: 'att-2', title: 'Course Schedule', difficulty: 'Medium', pattern: 'Graphs' },
      hardQ[4] || { id: 'att-3', title: 'Trapping Rain Water', difficulty: 'Hard', pattern: 'Two Pointers' },
    ];

    const activeDayOffsets = [
      0, -1, -2,
      -7, -8,
      -15,
      -23, -24, -25,
      -39,
      -58,
      -82,
      -109, -110,
      -140,
      -175,
      -215,
      -255,
      -300,
      -345,
    ];

    const attemptsToInsert: any[] = [];
    const now = Date.now();

    const getIsoForDayOffset = (offset: number, hour: number = 14, min: number = 30) => {
      const d = new Date(now + offset * 86400000);
      d.setHours(hour, min, Math.floor(Math.random() * 59), 0);
      return d.toISOString();
    };

    let pIdx = 0;
    for (let dayIdx = 0; dayIdx < activeDayOffsets.length; dayIdx++) {
      const offset = activeDayOffsets[dayIdx];
      const countForDay = dayIdx < 10 ? 5 : 4;
      for (let c = 0; c < countForDay && pIdx < solvedSet.length; c++) {
        const item = solvedSet[pIdx++];
        attemptsToInsert.push({
          id: `seed-sub-${attemptsToInsert.length + 1}`,
          question_id: item.id,
          problem_title: item.title,
          difficulty: item.difficulty,
          category: item.category,
          problem_type: item.type,
          language: item.type === 'sql' ? 'sql' : 'python',
          code: item.type === 'sql' ? 'SELECT * FROM Person;' : 'def solution():\n    pass',
          status: 'Accepted',
          runtime_ms: 10 + Math.floor(Math.random() * 40),
          memory_kb: 14000 + Math.floor(Math.random() * 2000),
          test_cases_passed: 10,
          total_test_cases: 10,
          created_at: getIsoForDayOffset(offset, 10 + (c % 10), (c * 7) % 60),
        });
      }
    }

    while (pIdx < solvedSet.length) {
      const item = solvedSet[pIdx++];
      attemptsToInsert.push({
        id: `seed-sub-${attemptsToInsert.length + 1}`,
        question_id: item.id,
        problem_title: item.title,
        difficulty: item.difficulty,
        category: item.category,
        problem_type: item.type,
        language: item.type === 'sql' ? 'sql' : 'python',
        code: item.type === 'sql' ? 'SELECT * FROM Person;' : 'def solution():\n    pass',
        status: 'Accepted',
        runtime_ms: 15,
        memory_kb: 14200,
        test_cases_passed: 10,
        total_test_cases: 10,
        created_at: getIsoForDayOffset(activeDayOffsets[0], 11, 20),
      });
    }

    for (let i = 0; i < attemptingQ.length; i++) {
      const att = attemptingQ[i];
      attemptsToInsert.push({
        id: `seed-sub-${attemptsToInsert.length + 1}`,
        question_id: att.id,
        problem_title: att.title,
        difficulty: att.difficulty,
        category: att.pattern,
        problem_type: 'python',
        language: 'python',
        code: 'def solution():\n    return False',
        status: 'Wrong Answer',
        runtime_ms: 22,
        memory_kb: 15300,
        test_cases_passed: 5,
        total_test_cases: 10,
        created_at: getIsoForDayOffset(activeDayOffsets[0], 12, 10 + i * 5),
      });
    }

    let extraCounter = 0;
    while (attemptsToInsert.length < 124) {
      const targetDay = activeDayOffsets[extraCounter % activeDayOffsets.length];
      const sampleItem = solvedSet[extraCounter % solvedSet.length];
      attemptsToInsert.push({
        id: `seed-sub-${attemptsToInsert.length + 1}`,
        question_id: sampleItem.id,
        problem_title: sampleItem.title,
        difficulty: sampleItem.difficulty,
        category: sampleItem.category,
        problem_type: sampleItem.type,
        language: sampleItem.type === 'sql' ? 'sql' : 'python',
        code: sampleItem.type === 'sql' ? 'SELECT * FROM Person;' : 'def solution():\n    pass',
        status: extraCounter % 2 === 0 ? 'Wrong Answer' : 'Accepted',
        runtime_ms: 25,
        memory_kb: 14800,
        test_cases_passed: 8,
        total_test_cases: 10,
        created_at: getIsoForDayOffset(targetDay, 15, (extraCounter * 11) % 60),
      });
      extraCounter++;
    }

    for (const sub of attemptsToInsert) {
      db.run(
        `INSERT INTO attempts (id, question_id, language, code, status, runtime_ms, memory_kb, test_cases_passed, total_test_cases, row_hmac, created_at, problem_title, difficulty, category, problem_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sub.id,
          sub.question_id,
          sub.language,
          sub.code,
          sub.status,
          sub.runtime_ms,
          sub.memory_kb,
          sub.test_cases_passed,
          sub.total_test_cases,
          'hmac-' + sub.id,
          sub.created_at,
          sub.problem_title,
          sub.difficulty,
          sub.category,
          sub.problem_type
        ]
      );
    }

    for (const item of solvedSet) {
      if (item.type === 'python') {
        db.run(`UPDATE questions SET status = 'solved' WHERE id = ? OR title = ?`, [item.id, item.title]);
      }
    }
    for (const item of attemptingQ) {
      db.run(`UPDATE questions SET status = 'attempted' WHERE (id = ? OR title = ?) AND status != 'solved'`, [item.id, item.title]);
    }
  } catch (err) {
    console.warn('Failed to seed baseline attempts:', err);
  }
}

export async function recalculateStreaks(): Promise<{
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  totalSubmissions: number;
}> {
  const db = await getDatabase();
  try {
    const res = db.exec(`SELECT created_at FROM attempts ORDER BY created_at ASC`);
    if (!res.length || !res[0].values.length) {
      return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0, totalSubmissions: 0 };
    }

    const rows = res[0].values;
    const totalSubmissions = rows.length;
    const dateCountMap = new Map<string, number>();

    for (const r of rows) {
      const raw = String(r[0]);
      const dt = new Date(raw);
      if (!isNaN(dt.getTime())) {
        const key = toLocalDateStr(dt);
        dateCountMap.set(key, (dateCountMap.get(key) || 0) + 1);
      }
    }

    const uniqueDates = Array.from(dateCountMap.keys()).sort();
    const totalActiveDays = uniqueDates.length;
    if (totalActiveDays === 0) {
      return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0, totalSubmissions };
    }

    const dayNums = uniqueDates.map(dateStringToDayNum);

    let longestStreak = 0;
    let tempStreak = 0;
    let prevDay = -1;

    for (const dNum of dayNums) {
      if (prevDay === -1) {
        tempStreak = 1;
      } else if (dNum === prevDay + 1) {
        tempStreak += 1;
      } else if (dNum > prevDay + 1) {
        tempStreak = 1;
      }
      prevDay = dNum;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    const todayNum = dateStringToDayNum(toLocalDateStr(new Date()));
    const yesterdayNum = todayNum - 1;
    const daySet = new Set(dayNums);
    const lastActiveDay = dayNums[dayNums.length - 1];

    let currentStreak = 0;
    if (lastActiveDay === todayNum || lastActiveDay === yesterdayNum) {
      let check = lastActiveDay;
      while (daySet.has(check)) {
        currentStreak += 1;
        check -= 1;
      }
    } else {
      currentStreak = 0;
    }

    return {
      currentStreak,
      longestStreak,
      totalActiveDays,
      totalSubmissions,
    };
  } catch (err) {
    console.error('Error recalculating streaks:', err);
    return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0, totalSubmissions: 0 };
  }
}

export async function fetchProfileStats(): Promise<ProfileStatsResult> {
  const db = await getDatabase();
  try {
    const solvedRes = db.exec(`SELECT COUNT(DISTINCT question_id) FROM attempts WHERE status = 'Accepted'`);
    const totalSolved = solvedRes.length && solvedRes[0].values.length ? (solvedRes[0].values[0][0] as number) : 0;

    const diffRes = db.exec(`
      SELECT difficulty, COUNT(DISTINCT question_id) 
      FROM attempts 
      WHERE status = 'Accepted' 
      GROUP BY difficulty
    `);
    let easySolved = 0;
    let mediumSolved = 0;
    let hardSolved = 0;
    if (diffRes.length && diffRes[0].values.length) {
      for (const row of diffRes[0].values) {
        const diff = String(row[0] || '').toLowerCase();
        const cnt = Number(row[1]) || 0;
        if (diff === 'easy') easySolved += cnt;
        else if (diff === 'medium') mediumSolved += cnt;
        else if (diff === 'hard') hardSolved += cnt;
      }
    }

    const attRes = db.exec(`
      SELECT COUNT(DISTINCT question_id) 
      FROM attempts 
      WHERE question_id NOT IN (
        SELECT DISTINCT question_id FROM attempts WHERE status = 'Accepted'
      )
    `);
    const attemptingCount = attRes.length && attRes[0].values.length ? (attRes[0].values[0][0] as number) : 0;

    let easyTotal = 969;
    let mediumTotal = 2124;
    let hardTotal = 980;

    const qTotalRes = db.exec(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN difficulty = 'Easy' THEN 1 ELSE 0 END) as easy_cnt,
        SUM(CASE WHEN difficulty = 'Medium' THEN 1 ELSE 0 END) as med_cnt,
        SUM(CASE WHEN difficulty = 'Hard' THEN 1 ELSE 0 END) as hard_cnt
      FROM questions
    `);
    if (qTotalRes.length && qTotalRes[0].values.length) {
      const row = qTotalRes[0].values[0];
      const e = Number(row[1]) || 0;
      const m = Number(row[2]) || 0;
      const h = Number(row[3]) || 0;
      if (e > 0) easyTotal = Math.max(969, e);
      if (m > 0) mediumTotal = Math.max(2124, m);
      if (h > 0) hardTotal = Math.max(980, h);
    }
    const totalQuestions = easyTotal + mediumTotal + hardTotal;

    const streakInfo = await recalculateStreaks();

    return {
      totalSolved,
      totalQuestions,
      easySolved,
      easyTotal,
      mediumSolved,
      mediumTotal,
      hardSolved,
      hardTotal,
      attemptingCount,
      totalSubmissions: streakInfo.totalSubmissions,
      totalActiveDays: streakInfo.totalActiveDays,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
    };
  } catch (err) {
    console.error('Error in fetchProfileStats:', err);
    return {
      totalSolved: 0,
      totalQuestions: 4073,
      easySolved: 0,
      easyTotal: 969,
      mediumSolved: 0,
      mediumTotal: 2124,
      hardSolved: 0,
      hardTotal: 980,
      attemptingCount: 0,
      totalSubmissions: 0,
      totalActiveDays: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }
}

export async function fetchSubmissionHeatmap(year: number | 'current' = 'current'): Promise<HeatmapResult> {
  const db = await getDatabase();
  const streakInfo = await recalculateStreaks();

  const res = db.exec(`SELECT created_at, status FROM attempts ORDER BY created_at ASC`);
  const dateMap = new Map<string, { total: number; accepted: number }>();

  if (res.length && res[0].values.length) {
    for (const r of res[0].values) {
      const raw = String(r[0]);
      const st = String(r[1]);
      const dt = new Date(raw);
      if (!isNaN(dt.getTime())) {
        const key = toLocalDateStr(dt);
        const cur = dateMap.get(key) || { total: 0, accepted: 0 };
        cur.total += 1;
        if (st === 'Accepted') cur.accepted += 1;
        dateMap.set(key, cur);
      }
    }
  }

  let startDate: Date;
  let endDate: Date;

  if (year === 'current') {
    const today = new Date();
    const dayOfWeek = today.getDay();
    endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - dayOfWeek), 23, 59, 59);
    startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (52 * 7) + 1);
    startDate.setHours(0, 0, 0, 0);
  } else {
    startDate = new Date(year, 0, 1, 0, 0, 0);
    endDate = new Date(year, 11, 31, 23, 59, 59);
  }

  const weeks: HeatmapDay[][] = [];
  let curWeek: HeatmapDay[] = [];
  const curDate = new Date(startDate);

  while (curDate <= endDate) {
    const key = toLocalDateStr(curDate);
    const data = dateMap.get(key);
    const count = data ? data.total : 0;
    const acceptedCount = data ? data.accepted : 0;

    let level = 0;
    if (count >= 10) level = 4;
    else if (count >= 6) level = 3;
    else if (count >= 3) level = 2;
    else if (count >= 1) level = 1;

    curWeek.push({
      date: key,
      count,
      acceptedCount,
      level,
    });

    if (curWeek.length === 7) {
      weeks.push(curWeek);
      curWeek = [];
    }

    curDate.setDate(curDate.getDate() + 1);
  }

  if (curWeek.length > 0) {
    while (curWeek.length < 7) {
      curWeek.push({ date: '', count: 0, acceptedCount: 0, level: 0 });
    }
    weeks.push(curWeek);
  }

  return {
    weeks: weeks.slice(-52),
    totalSubmissions: streakInfo.totalSubmissions,
    totalActiveDays: streakInfo.totalActiveDays,
    currentStreak: streakInfo.currentStreak,
    longestStreak: streakInfo.longestStreak,
    year,
  };
}

export async function recordSubmission(sub: {
  id?: string;
  question_id: string;
  problem_title?: string;
  difficulty?: string;
  category?: string;
  problem_type?: 'python' | 'sql' | 'postgres';
  language: string;
  code: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
  runtime_ms?: number;
  memory_kb?: number;
  test_cases_passed?: number;
  total_test_cases?: number;
  created_at?: string;
}): Promise<SubmissionRecord> {
  const db = await getDatabase();
  const subId = sub.id || `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = sub.created_at || new Date().toISOString();
  const problemTitle = sub.problem_title || sub.question_id;
  const difficulty = sub.difficulty || 'Easy';
  const category = sub.category || 'General';
  const problemType = sub.problem_type || 'python';
  const rowHmac = await computeRowHmac('attempt', subId);

  db.run(
    `INSERT INTO attempts (id, question_id, language, code, status, runtime_ms, memory_kb, test_cases_passed, total_test_cases, row_hmac, created_at, problem_title, difficulty, category, problem_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      subId,
      sub.question_id,
      sub.language,
      sub.code,
      sub.status,
      sub.runtime_ms ?? 0,
      sub.memory_kb ?? 0,
      sub.test_cases_passed ?? 0,
      sub.total_test_cases ?? 0,
      rowHmac,
      timestamp,
      problemTitle,
      difficulty,
      category,
      problemType
    ]
  );

  if (sub.status === 'Accepted') {
    db.run(
      `UPDATE questions SET status = 'solved', last_attempted = ? WHERE id = ? OR title = ?`,
      [timestamp, sub.question_id, problemTitle]
    );
  } else {
    db.run(
      `UPDATE questions SET status = 'attempted', last_attempted = ? WHERE (id = ? OR title = ?) AND status != 'solved'`,
      [timestamp, sub.question_id, problemTitle]
    );
  }

  persistDatabase();

  const record: SubmissionRecord = {
    id: subId,
    question_id: sub.question_id,
    problem_title: problemTitle,
    difficulty,
    category,
    problem_type: problemType,
    language: sub.language,
    code: sub.code,
    status: sub.status,
    runtime_ms: sub.runtime_ms ?? 0,
    memory_kb: sub.memory_kb ?? 0,
    test_cases_passed: sub.test_cases_passed ?? 0,
    total_test_cases: sub.total_test_cases ?? 0,
    created_at: timestamp,
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ap_submissions_updated', { detail: record }));
    window.dispatchEvent(new CustomEvent('ap_questions_updated'));
    window.dispatchEvent(new CustomEvent('ap_profile_updated'));
  }

  return record;
}

export async function fetchSubmissions(options?: {
  limit?: number;
  questionId?: string;
  status?: string;
}): Promise<SubmissionRecord[]> {
  const db = await getDatabase();
  let sql = `SELECT id, question_id, problem_title, difficulty, category, problem_type, language, code, status, runtime_ms, memory_kb, test_cases_passed, total_test_cases, created_at FROM attempts WHERE 1=1`;
  const params: any[] = [];

  if (options?.questionId) {
    sql += ` AND question_id = ?`;
    params.push(options.questionId);
  }
  if (options?.status) {
    sql += ` AND status = ?`;
    params.push(options.status);
  }

  sql += ` ORDER BY created_at DESC`;
  if (options?.limit) {
    sql += ` LIMIT ?`;
    params.push(options.limit);
  }

  const res = db.exec(sql, params);
  if (!res.length || !res[0].values.length) return [];

  const cols = res[0].columns;
  return res[0].values.map(row => {
    const obj: any = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj as SubmissionRecord;
  });
}

export async function fetchSolvedProblemIds(): Promise<Set<string>> {
  const db = await getDatabase();
  try {
    const res = db.exec(`SELECT DISTINCT question_id FROM attempts WHERE status = 'Accepted'`);
    if (!res.length || !res[0].values.length) return new Set();
    return new Set(res[0].values.map(r => String(r[0])));
  } catch {
    return new Set();
  }
}

export async function clearSubmissionsForTesting(): Promise<void> {
  const db = await getDatabase();
  db.run(`DELETE FROM attempts;`);
  db.run(`UPDATE questions SET status = 'todo';`);
  persistDatabase();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ap_submissions_updated'));
    window.dispatchEvent(new CustomEvent('ap_profile_updated'));
    window.dispatchEvent(new CustomEvent('ap_questions_updated'));
  }
}

