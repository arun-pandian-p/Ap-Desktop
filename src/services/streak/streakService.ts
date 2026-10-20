/**
 * Ap Workspace — Canonical Daily Problem-Solving Streak System
 * Handles persistent daily streaks across Python, SQL, PostgreSQL, and Coding Sheets.
 * Strictly calculates streaks from confirmed successful solutions (status: 'Accepted' | 'Passed').
 * Timezone and midnight-boundary resilient using local calendar dates.
 */

import { getDatabase, persistDatabase } from '@/services/db';

export interface DayActivity {
  date: string; // YYYY-MM-DD
  dayName: string; // 'Mon', 'Tue', etc.
  solvedCount: number;
  distinctProblems: number;
  isCompleted: boolean;
}

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  solvedToday: number;
  dailyGoal: number;
  isGoalCompletedToday: boolean;
  totalActiveDays: number;
  totalSolvedUnique: number;
  lastActiveDate: string | null;
  activityStrip: DayActivity[]; // Last 7 calendar days ending today
  heatmap: Record<string, number>; // dateStr -> count
  milestonesAchieved: number[]; // [3, 7, 14, 30, 60, 100, 365]
}

const MILESTONE_TARGETS = [3, 7, 14, 30, 60, 100, 365];

/**
 * Returns YYYY-MM-DD in the user's local timezone.
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converts a YYYY-MM-DD string to integer day number since Unix epoch.
 */
export function dateStringToDayNumber(dateStr: string): number {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dt = new Date(y, m, d, 12, 0, 0); // Noon to prevent DST drift
  return Math.floor(dt.getTime() / 86400000);
}

/**
 * Gets configured daily goal from settings (defaults to 1).
 */
export async function getDailyGoal(): Promise<number> {
  const db = await getDatabase();
  try {
    const res = db.exec(`SELECT value FROM app_settings WHERE key = 'daily_goal'`);
    if (res.length > 0 && res[0].values.length > 0) {
      const val = parseInt(String(res[0].values[0][0]), 10);
      return isNaN(val) || val <= 0 ? 1 : val;
    }
  } catch {}
  return 1;
}

/**
 * Updates configured daily goal.
 */
export async function setDailyGoal(goal: number): Promise<void> {
  const db = await getDatabase();
  const target = Math.max(1, goal);
  db.run(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('daily_goal', ?)`, [String(target)]);
  persistDatabase();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ap_streak_updated'));
  }
}

/**
 * Retrieves the list of already awarded milestone day numbers.
 */
export async function getAwardedMilestones(): Promise<number[]> {
  const db = await getDatabase();
  try {
    const res = db.exec(`SELECT value FROM app_settings WHERE key = 'streak_milestones_awarded'`);
    if (res.length > 0 && res[0].values.length > 0) {
      return JSON.parse(String(res[0].values[0][0])) || [];
    }
  } catch {}
  return [];
}

/**
 * Awards a new streak milestone if not already achieved and triggers notifications.
 */
async function checkAndAwardMilestones(currentStreak: number): Promise<number | null> {
  if (currentStreak < 3) return null;

  const awarded = await getAwardedMilestones();
  let newlyAwarded: number | null = null;

  for (const target of MILESTONE_TARGETS) {
    if (currentStreak >= target && !awarded.includes(target)) {
      awarded.push(target);
      newlyAwarded = target;

      const db = await getDatabase();
      db.run(
        `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('streak_milestones_awarded', ?)`,
        [JSON.stringify(awarded)]
      );
      persistDatabase();

      // Trigger Celebration Notification & In-App Notice
      try {
        const { addAppNotification, dispatchNotification } = await import('@/services/notifications');
        const title = `🔥 ${target}-Day Streak Milestone Reached!`;
        const body = `Incredible dedication! You have consistently solved coding problems for ${target} days in a row!`;
        
        addAppNotification({
          title,
          body,
          type: 'milestone',
          actionScreen: 'dashboard',
        });

        dispatchNotification(title, body, 'streakMilestone').catch(() => {});
      } catch {}
    }
  }

  return newlyAwarded;
}

/**
 * Calculates complete canonical streak state from genuine accepted attempts.
 */
export async function getStreakState(): Promise<StreakState> {
  const db = await getDatabase();
  const dailyGoal = await getDailyGoal();
  const milestonesAchieved = await getAwardedMilestones();

  const now = new Date();
  const todayStr = toLocalDateString(now);
  const todayNum = dateStringToDayNumber(todayStr);
  const yesterdayNum = todayNum - 1;

  try {
    // 1. Fetch only genuine successful solves (Accepted or Passed)
    const res = db.exec(`
      SELECT question_id, created_at 
      FROM attempts 
      WHERE status = 'Accepted' OR status = 'Passed'
      ORDER BY created_at ASC
    `);

    if (!res.length || !res[0].values.length) {
      return createEmptyStreakState(todayStr, dailyGoal, milestonesAchieved);
    }

    const rows = res[0].values;
    const heatmap: Record<string, number> = {};
    const dayDistinctProblems = new Map<string, Set<string>>();
    const uniqueSolvedProblems = new Set<string>();

    for (const r of rows) {
      const qId = String(r[0]);
      const rawDate = String(r[1]);
      const dt = new Date(rawDate);
      if (isNaN(dt.getTime())) continue;

      const dateStr = toLocalDateString(dt);
      heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;
      uniqueSolvedProblems.add(qId);

      if (!dayDistinctProblems.has(dateStr)) {
        dayDistinctProblems.set(dateStr, new Set());
      }
      dayDistinctProblems.get(dateStr)!.add(qId);
    }

    const activeDateStrings = Object.keys(heatmap).sort();
    const totalActiveDays = activeDateStrings.length;
    if (totalActiveDays === 0) {
      return createEmptyStreakState(todayStr, dailyGoal, milestonesAchieved);
    }

    // 2. Compute Longest Streak
    const dayNumbers = activeDateStrings.map(dateStringToDayNumber);
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDay = -1;

    for (const dNum of dayNumbers) {
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

    // 3. Compute Current Streak
    const activeDaySet = new Set(dayNumbers);
    const lastActiveDay = dayNumbers[dayNumbers.length - 1];
    let currentStreak = 0;

    if (lastActiveDay === todayNum || lastActiveDay === yesterdayNum) {
      let check = lastActiveDay;
      while (activeDaySet.has(check)) {
        currentStreak += 1;
        check -= 1;
      }
    } else {
      currentStreak = 0;
    }

    // Check for new milestone achievements
    await checkAndAwardMilestones(currentStreak);

    // 4. Today's Activity
    const todaySolvedSet = dayDistinctProblems.get(todayStr) || new Set();
    const solvedToday = todaySolvedSet.size;
    const isGoalCompletedToday = solvedToday >= dailyGoal;

    // 5. Build 7-Day Activity Strip (ending today)
    const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activityStrip: DayActivity[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dStr = toLocalDateString(d);
      const distinctSet = dayDistinctProblems.get(dStr) || new Set();
      activityStrip.push({
        date: dStr,
        dayName: dayAbbreviations[d.getDay()],
        solvedCount: heatmap[dStr] || 0,
        distinctProblems: distinctSet.size,
        isCompleted: distinctSet.size >= 1,
      });
    }

    return {
      currentStreak,
      longestStreak,
      solvedToday,
      dailyGoal,
      isGoalCompletedToday,
      totalActiveDays,
      totalSolvedUnique: uniqueSolvedProblems.size,
      lastActiveDate: activeDateStrings[activeDateStrings.length - 1] || null,
      activityStrip,
      heatmap,
      milestonesAchieved,
    };
  } catch (err) {
    console.error('Error calculating streak state:', err);
    return createEmptyStreakState(todayStr, dailyGoal, milestonesAchieved);
  }
}

function createEmptyStreakState(todayStr: string, dailyGoal: number, milestonesAchieved: number[]): StreakState {
  const dayAbbreviations = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const activityStrip: DayActivity[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    activityStrip.push({
      date: toLocalDateString(d),
      dayName: dayAbbreviations[d.getDay()],
      solvedCount: 0,
      distinctProblems: 0,
      isCompleted: false,
    });
  }

  return {
    currentStreak: 0,
    longestStreak: 0,
    solvedToday: 0,
    dailyGoal,
    isGoalCompletedToday: false,
    totalActiveDays: 0,
    totalSolvedUnique: 0,
    lastActiveDate: null,
    activityStrip,
    heatmap: {},
    milestonesAchieved,
  };
}
