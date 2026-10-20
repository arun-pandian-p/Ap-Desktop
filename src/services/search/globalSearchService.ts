import { Question, Track, Task, ScreenId } from '@/types';
import sqlExercisesData from '@/data/sqlExercises.json';
import { fetchQuestions, fetchTracks, fetchTasks, getDatabase } from '@/services/db';

const CANONICAL_DSA_PRESETS: Array<{
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  pattern_name: string;
  platform: string;
  xp: number;
  description: string;
}> = [
  { id: 'even_or_odd', title: 'Even or Odd Number Check', difficulty: 'Easy', pattern_name: 'Bit Manipulation & Math', platform: 'GeeksforGeeks', xp: 5, description: 'Determine whether an integer n is even or odd' },
  { id: 'last_digit', title: 'Find Last Digit of a Number', difficulty: 'Easy', pattern_name: 'Basic Math', platform: 'GeeksforGeeks', xp: 5, description: 'Extract the units place digit of an integer' },
  { id: 'count_digits', title: 'Count Digits in a Number', difficulty: 'Easy', pattern_name: 'Basic Math', platform: 'GeeksforGeeks', xp: 5, description: 'Count total number of decimal digits' },
  { id: 'reverse_number', title: 'Reverse 32-bit Integer', difficulty: 'Medium', pattern_name: 'Math & Modulo', platform: 'LeetCode', xp: 10, description: 'Reverse digits of a signed 32-bit integer with overflow check' },
  { id: 'power_number', title: 'Power of Numbers (n^r)', difficulty: 'Medium', pattern_name: 'Fast Exponentiation', platform: 'GeeksforGeeks', xp: 10, description: 'Calculate n raised to the power r modulo 10^9 + 7' },
  { id: 'two_sum', title: 'Two Sum', difficulty: 'Easy', pattern_name: 'Arrays & Hashing', platform: 'LeetCode', xp: 5, description: 'Find indices of two numbers that add up to target' },
  { id: 'valid_anagram', title: 'Valid Anagram', difficulty: 'Easy', pattern_name: 'Arrays & Hashing', platform: 'LeetCode', xp: 5, description: 'Determine if string t is an anagram of string s' },
  { id: 'reverse_linked_list', title: 'Reverse Linked List', difficulty: 'Easy', pattern_name: 'Linked List', platform: 'LeetCode', xp: 5, description: 'Reverse singly linked list in-place' },
  { id: 'binary_search', title: 'Binary Search', difficulty: 'Easy', pattern_name: 'Binary Search', platform: 'LeetCode', xp: 5, description: 'Find target integer in sorted array in O(log n) time' },
  { id: 'climbing_stairs', title: 'Climbing Stairs', difficulty: 'Easy', pattern_name: 'Dynamic Programming', platform: 'LeetCode', xp: 5, description: 'Distinct ways to reach the top of n stairs' },
];

export type SearchCategory = 'problems' | 'sheets' | 'database' | 'tasks' | 'actions';

export interface SearchResultItem {
  id: string;
  title: string;
  category: SearchCategory;
  categoryLabel: string;
  subtitle?: string;
  detail?: string;
  badge?: string;
  badgeColor?: 'red' | 'green' | 'amber' | 'blue' | 'purple' | 'gray';
  icon: 'code' | 'book' | 'database' | 'check' | 'terminal' | 'settings' | 'flame' | 'sparkles' | 'user' | 'clock' | 'music' | 'shield';
  score: number;
  targetScreen?: ScreenId;
  actionType: 'navigate' | 'problem' | 'track' | 'modal' | 'custom';
  actionData?: any;
  payload?: any;
}

export interface GroupedSearchResults {
  totalMatches: number;
  items: SearchResultItem[];
  groups: Array<{
    category: SearchCategory;
    label: string;
    items: SearchResultItem[];
  }>;
}

// -----------------------------------------------------------------------------
// Scoring & Ranking Function (Exact > Prefix > Word-Prefix > Substring > Topic)
// -----------------------------------------------------------------------------

export function calculateMatchScore(
  rawQuery: string,
  title: string,
  keywords: string[] = [],
  description: string = ''
): { matches: boolean; score: number } {
  const query = (rawQuery || '').trim().toLowerCase();
  if (!query) return { matches: false, score: 0 };

  const normTitle = (title || '').toLowerCase();
  const normDesc = (description || '').toLowerCase();
  const normKeywords = keywords.map(k => (k || '').toLowerCase());

  let score = 0;

  // 1. Exact title match -> 1000 pts
  if (normTitle === query) {
    score += 1000;
  }
  // 2. Title starts with query (prefix match) -> 800 pts
  else if (normTitle.startsWith(query)) {
    score += 800;
  }
  // 3. Word in title starts with query -> 650 pts
  else {
    const wordBoundaryIndex = normTitle.indexOf(' ' + query);
    if (wordBoundaryIndex !== -1) {
      score += 650;
    } else {
      const idx = normTitle.indexOf(query);
      if (idx !== -1) {
        // 4. Substring in title -> 450 pts (penalize slightly if later in string)
        score += Math.max(350, 450 - idx * 2);
      }
    }
  }

  // 5. Keywords / Topic / Pattern matches
  for (const kw of normKeywords) {
    if (kw === query) {
      score += 350;
    } else if (kw.startsWith(query)) {
      score += 280;
    } else if (kw.includes(query)) {
      score += 180;
    }
  }

  // 6. Description match
  if (normDesc.includes(query)) {
    score += 100;
  }

  // 7. Multi-word query support (e.g. "two sum hash")
  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const allTokensFound = tokens.every(
      tok => normTitle.includes(tok) || normKeywords.some(k => k.includes(tok)) || normDesc.includes(tok)
    );
    if (allTokensFound) {
      score += 250;
    }
  }

  return {
    matches: score > 0,
    score,
  };
}

// -----------------------------------------------------------------------------
// Pre-indexed System Actions & Workspaces
// -----------------------------------------------------------------------------

const STATIC_ACTIONS: SearchResultItem[] = [
  {
    id: 'act-practice-ide',
    title: 'Open Practice IDE',
    category: 'actions',
    categoryLabel: 'Actions',
    subtitle: 'Multi-language coding workspace (Python, Java, C++)',
    detail: 'Monaco Editor with real compiler execution and test-case grading',
    badge: 'IDE',
    badgeColor: 'red',
    icon: 'terminal',
    score: 0,
    targetScreen: 'practice',
    actionType: 'navigate',
  },
  {
    id: 'act-browse-problems',
    title: 'Browse Coding Problems',
    category: 'actions',
    categoryLabel: 'Actions',
    subtitle: 'Filter 1,337 DSA problems across 50 patterns',
    detail: 'LeetCode, GFG, Codeforces sheets with difficulty & completion filters',
    badge: '1,337 Problems',
    badgeColor: 'blue',
    icon: 'code',
    score: 0,
    targetScreen: 'problems',
    actionType: 'navigate',
  },
  {
    id: 'act-learning-tracks',
    title: 'Learning Tracks & Sheets',
    category: 'sheets',
    categoryLabel: 'Sheets & Tracks',
    subtitle: 'Curious Freaks Sheet, Core DSA, SDE Calendar, Aptitude',
    detail: 'Track completion percentage, streaks, and sheet problem sets',
    badge: 'Sheets',
    badgeColor: 'purple',
    icon: 'book',
    score: 0,
    targetScreen: 'tracks',
    actionType: 'navigate',
  },
  {
    id: 'act-curious-freaks',
    title: 'Curious Freaks Coding Sheet',
    category: 'sheets',
    categoryLabel: 'Sheets & Tracks',
    subtitle: 'Curated 413-problem DSA placement preparation sheet',
    detail: 'Core curriculum covering arrays, trees, graphs, and dynamic programming',
    badge: 'Featured',
    badgeColor: 'red',
    icon: 'book',
    score: 0,
    targetScreen: 'problems',
    actionType: 'track',
    actionData: { slug: 'curious-freaks', title: 'Curious Freaks Coding Sheet' },
  },
  {
    id: 'act-sql-practice',
    title: 'SQL Practice Lab',
    category: 'database',
    categoryLabel: 'Database & SQL',
    subtitle: 'Isolated SQLite database with live SQL queries',
    detail: 'Exercises on JOINs, GROUP BY, subqueries, and window functions',
    badge: 'SQL Engine',
    badgeColor: 'blue',
    icon: 'database',
    score: 0,
    targetScreen: 'sql',
    actionType: 'navigate',
  },
  {
    id: 'act-postgres-lab',
    title: 'PostgreSQL Lab',
    category: 'database',
    categoryLabel: 'Database & SQL',
    subtitle: 'Genuine PostgreSQL 16 local server integration',
    detail: 'Explore tables, run queries, and test native TCP database connection',
    badge: 'Postgres 16',
    badgeColor: 'blue',
    icon: 'database',
    score: 0,
    targetScreen: 'postgres',
    actionType: 'navigate',
  },
  {
    id: 'act-study-planner',
    title: 'Study Planner & Tasks',
    category: 'actions',
    categoryLabel: 'Actions',
    subtitle: 'Manage daily coding objectives and milestones',
    detail: 'Track task priorities, due dates, and completion status',
    badge: 'Planner',
    badgeColor: 'amber',
    icon: 'check',
    score: 0,
    targetScreen: 'planner',
    actionType: 'navigate',
  },
  {
    id: 'act-focus-timer',
    title: 'Focus Sessions & Timer',
    category: 'actions',
    categoryLabel: 'Actions',
    subtitle: '25m Focus / 5m Break Pomodoro cycles',
    detail: 'Survives view navigation with Web Audio chime and session logs',
    badge: 'Focus',
    badgeColor: 'amber',
    icon: 'clock',
    score: 0,
    targetScreen: 'sessions',
    actionType: 'navigate',
  },
  {
    id: 'act-manage-runtimes',
    title: 'Manage Runtimes (Python, Java, C++, PostgreSQL)',
    category: 'actions',
    categoryLabel: 'Actions',
    subtitle: 'Configure compilers, verify toolchains, and test execution',
    detail: 'Settings → Manage Runtimes',
    badge: 'Toolchains',
    badgeColor: 'green',
    icon: 'settings',
    score: 0,
    targetScreen: 'settings',
    actionType: 'navigate',
  },
  {
    id: 'act-music-library',
    title: 'Study Music Library',
    category: 'actions',
    categoryLabel: 'Actions',
    subtitle: 'Lo-fi, Ambient, Piano, Nature Sounds & Custom audio imports',
    detail: 'Settings → Music Library',
    badge: 'Audio',
    badgeColor: 'purple',
    icon: 'music',
    score: 0,
    targetScreen: 'settings',
    actionType: 'navigate',
  },
  {
    id: 'act-developer-profile',
    title: 'Developer Profile & Heatmap',
    category: 'actions',
    categoryLabel: 'Actions',
    subtitle: 'View LeetCode statistics, streaks, and 52-week activity heatmap',
    detail: 'Comprehensive developer portfolio and practice records',
    badge: 'Profile',
    badgeColor: 'red',
    icon: 'user',
    score: 0,
    targetScreen: 'profile',
    actionType: 'navigate',
  },
  {
    id: 'act-quick-add',
    title: 'Quick Add Task',
    category: 'actions',
    categoryLabel: 'Actions',
    subtitle: 'Quickly create a new coding objective',
    detail: 'Opens the quick add modal from any screen',
    badge: 'Modal',
    badgeColor: 'gray',
    icon: 'sparkles',
    score: 0,
    actionType: 'modal',
    actionData: 'createTask',
  },
  {
    id: 'act-command-palette',
    title: 'Open Command Palette (Ctrl+Shift+P)',
    category: 'actions',
    categoryLabel: 'Actions',
    subtitle: 'Launch keyboard command launcher',
    detail: 'Full command menu for rapid keyboard access',
    badge: 'Palette',
    badgeColor: 'gray',
    icon: 'sparkles',
    score: 0,
    actionType: 'modal',
    actionData: 'commandPalette',
  },
];

// -----------------------------------------------------------------------------
// In-Memory Cached Index & Stale Request Tracking
// -----------------------------------------------------------------------------

let latestRequestId = 0;
let cachedQuestions: Question[] = [];
let cachedTracks: Track[] = [];
let cachedTasks: Task[] = [];
let cacheLoadedTime = 0;

export async function warmSearchCache(): Promise<void> {
  try {
    const [qRes, tRes, taskRes] = await Promise.all([
      fetchQuestions({ limit: 300 }).catch(() => ({ questions: [] })),
      fetchTracks().catch(() => []),
      fetchTasks().catch(() => []),
    ]);
    cachedQuestions = qRes.questions;
    cachedTracks = tRes;
    cachedTasks = taskRes;
    cacheLoadedTime = Date.now();
  } catch {
    // Graceful fallback to presets
  }
}

// -----------------------------------------------------------------------------
// Core Global Search Function
// -----------------------------------------------------------------------------

export async function searchGlobal(
  query: string,
  options?: {
    maxResults?: number;
    includeAsyncDb?: boolean;
    onSelectProblem?: (problem: Question) => void;
    onSelectTrack?: (track: Track) => void;
  }
): Promise<GroupedSearchResults> {
  const currentReqId = ++latestRequestId;
  const trimmed = (query || '').trim();
  const maxResults = options?.maxResults || 10;

  if (!trimmed) {
    // If query is empty, provide top recommended quick action suggestions
    const topActions = STATIC_ACTIONS.filter(a => a.category === 'actions').slice(0, 5).map(a => ({ ...a, score: 100 }));
    return {
      totalMatches: topActions.length,
      items: topActions,
      groups: [
        {
          category: 'actions',
          label: 'Quick Workspaces & Actions',
          items: topActions,
        },
      ],
    };
  }

  const resultsMap = new Map<string, SearchResultItem>();

  const addItem = (item: SearchResultItem) => {
    const existing = resultsMap.get(item.id);
    if (!existing || item.score > existing.score) {
      resultsMap.set(item.id, item);
    }
  };

  // 1. Search Static Actions & Workspaces
  for (const act of STATIC_ACTIONS) {
    const { matches, score } = calculateMatchScore(
      trimmed,
      act.title,
      [act.categoryLabel, act.badge || '', act.targetScreen || ''],
      act.subtitle + ' ' + act.detail
    );
    if (matches) {
      addItem({ ...act, score });
    }
  }

  // 2. Search Problem Presets (Immediate In-Memory)
  for (const preset of CANONICAL_DSA_PRESETS) {
    const { matches, score } = calculateMatchScore(
      trimmed,
      preset.title,
      [preset.pattern_name, preset.difficulty, preset.platform, 'problem', 'dsa', 'leetcode'],
      preset.description
    );
    if (matches) {
      const qObj: Question = {
        id: preset.id,
        title: preset.title,
        difficulty: preset.difficulty,
        pattern_name: preset.pattern_name,
        xp: preset.xp,
        status: 'todo',
        order_num: 1,
        content_type: 'problem',
        platform: preset.platform,
        practice_link: 'https://leetcode.com',
      };
      addItem({
        id: `prob-${preset.id}`,
        title: preset.title,
        category: 'problems',
        categoryLabel: 'Problems',
        subtitle: `${preset.difficulty} • ${preset.pattern_name}`,
        detail: `Platform: ${preset.platform} • ${preset.xp} XP`,
        badge: preset.difficulty,
        badgeColor: preset.difficulty === 'Easy' ? 'green' : preset.difficulty === 'Medium' ? 'amber' : 'red',
        icon: 'code',
        score,
        targetScreen: 'practice',
        actionType: 'problem',
        actionData: qObj,
        payload: qObj,
      });
    }
  }

  // 3. Search SQL Exercises (Immediate In-Memory)
  for (const sqlEx of sqlExercisesData) {
    const { matches, score } = calculateMatchScore(
      trimmed,
      sqlEx.title,
      [sqlEx.category, sqlEx.difficulty, 'sql', 'database', 'sqlite', 'table', 'query'],
      sqlEx.description
    );
    if (matches) {
      addItem({
        id: `sql-${sqlEx.id}`,
        title: sqlEx.title,
        category: 'database',
        categoryLabel: 'Database & SQL',
        subtitle: `${sqlEx.difficulty} • ${sqlEx.category}`,
        detail: sqlEx.description.slice(0, 80) + '...',
        badge: 'SQL Practice',
        badgeColor: 'blue',
        icon: 'database',
        score,
        targetScreen: 'sql',
        actionType: 'navigate',
        actionData: { exerciseId: sqlEx.id },
      });
    }
  }

  // 4. Search Cached / Dynamic Tracks & Sheets
  if (cachedTracks.length === 0) {
    try {
      cachedTracks = await fetchTracks();
    } catch {}
  }
  for (const tr of cachedTracks) {
    const { matches, score } = calculateMatchScore(
      trimmed,
      tr.title,
      ['sheet', 'track', tr.level || '', tr.category || '', tr.slug],
      tr.description || ''
    );
    if (matches) {
      addItem({
        id: `track-${tr.id || tr.slug}`,
        title: tr.title,
        category: 'sheets',
        categoryLabel: 'Sheets & Tracks',
        subtitle: `${tr.total_problems || 0} Problems • ${tr.level || 'All levels'}`,
        detail: tr.description || `Curated coding sheet: ${tr.title}`,
        badge: `${tr.total_problems || 0} Problems`,
        badgeColor: 'purple',
        icon: 'book',
        score,
        targetScreen: 'problems',
        actionType: 'track',
        actionData: tr,
        payload: tr,
      });
    }
  }

  // 5. Search Cached Tasks
  if (cachedTasks.length === 0) {
    try {
      cachedTasks = await fetchTasks();
    } catch {}
  }
  for (const t of cachedTasks) {
    const { matches, score } = calculateMatchScore(
      trimmed,
      t.title,
      ['task', t.status, t.priority],
      t.description || ''
    );
    if (matches) {
      addItem({
        id: `task-${t.id}`,
        title: t.title,
        category: 'tasks',
        categoryLabel: 'Tasks',
        subtitle: `Priority: ${t.priority} • Status: ${t.status}`,
        detail: t.description || 'Coding task from study planner',
        badge: t.priority,
        badgeColor: t.priority === 'High' ? 'red' : t.priority === 'Medium' ? 'amber' : 'green',
        icon: 'check',
        score,
        targetScreen: 'planner',
        actionType: 'navigate',
        actionData: t,
        payload: t,
      });
    }
  }

  // 6. Safe Parameterized SQLite Search for Questions (if requested)
  if (options?.includeAsyncDb !== false) {
    try {
      const db = await getDatabase();
      const s = `%${trimmed}%`;
      // Parameterized query: prevents SQL injection completely
      const sqlRes = db.exec(
        `SELECT id, title, difficulty, pattern_name, platform, xp, status, order_num, track_slug
         FROM questions
         WHERE title LIKE ? OR pattern_name LIKE ? OR subtopic_name LIKE ?
         LIMIT 20`,
        [s, s, s]
      );

      // Check if stale before processing
      if (currentReqId !== latestRequestId) {
        return { totalMatches: 0, items: [], groups: [] };
      }

      if (sqlRes.length > 0) {
        const cols = sqlRes[0].columns;
        for (const row of sqlRes[0].values) {
          const qObj: any = {};
          cols.forEach((c, idx) => { qObj[c] = row[idx]; });
          const { matches, score } = calculateMatchScore(
            trimmed,
            qObj.title,
            [qObj.pattern_name, qObj.difficulty, qObj.platform, qObj.track_slug, 'problem', 'dsa'],
            ''
          );
          if (matches) {
            addItem({
              id: `prob-${qObj.id}`,
              title: qObj.title,
              category: 'problems',
              categoryLabel: 'Problems',
              subtitle: `${qObj.difficulty || 'Medium'} • ${qObj.pattern_name || 'DSA'}`,
              detail: `Platform: ${qObj.platform || 'LeetCode'} • ${qObj.xp || 5} XP`,
              badge: qObj.difficulty || 'Medium',
              badgeColor: qObj.difficulty === 'Easy' ? 'green' : qObj.difficulty === 'Hard' ? 'red' : 'amber',
              icon: 'code',
              score,
              targetScreen: 'practice',
              actionType: 'problem',
              actionData: qObj as Question,
              payload: qObj,
            });
          }
        }
      }
    } catch {
      // Safe fallback
    }
  }

  // Check again for stale query cancellation
  if (currentReqId !== latestRequestId) {
    return { totalMatches: 0, items: [], groups: [] };
  }

  // Sort by score descending (highest rank first)
  const sortedItems = Array.from(resultsMap.values()).sort((a, b) => b.score - a.score);
  const totalMatches = sortedItems.length;

  // Take top N (e.g. 8–10 items)
  const topItems = sortedItems.slice(0, maxResults);

  // Group by category while preserving rank order within groups
  const categoryOrder: SearchCategory[] = ['problems', 'sheets', 'database', 'tasks', 'actions'];
  const categoryLabels: Record<SearchCategory, string> = {
    problems: 'Problems',
    sheets: 'Coding Sheets & Tracks',
    database: 'Database & SQL Lab',
    tasks: 'Planner & Tasks',
    actions: 'Quick Workspaces & Actions',
  };

  const groups: Array<{ category: SearchCategory; label: string; items: SearchResultItem[] }> = [];

  for (const cat of categoryOrder) {
    const catItems = topItems.filter(item => item.category === cat);
    if (catItems.length > 0) {
      groups.push({
        category: cat,
        label: categoryLabels[cat],
        items: catItems,
      });
    }
  }

  return {
    totalMatches,
    items: topItems,
    groups,
  };
}
