import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStreakState,
  getDailyGoal,
  setDailyGoal,
  getAwardedMilestones,
  toLocalDateString,
  dateStringToDayNumber
} from '../src/services/streak/streakService';
import { getDatabase, recordSubmission } from '../src/services/db';

describe('Canonical Daily Problem-Solving Streak Engine', () => {
  beforeEach(async () => {
    const db = await getDatabase();
    // Clear attempts and streak milestones for clean test runs
    db.run(`DELETE FROM attempts`);
    db.run(`DELETE FROM app_settings WHERE key = 'streak_milestones_awarded'`);
    db.run(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('daily_goal', '1')`);
  });

  it('1. should report 0 streak when no attempts have been made', async () => {
    const state = await getStreakState();
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(0);
    expect(state.solvedToday).toBe(0);
    expect(state.isGoalCompletedToday).toBe(false);
  });

  it('2. should increment current streak to 1 upon first successful solve today', async () => {
    await recordSubmission({
      question_id: 'test-prob-1',
      problem_title: 'Two Sum',
      language: 'python',
      code: 'print("hello")',
      status: 'Accepted',
      created_at: new Date().toISOString()
    });

    const state = await getStreakState();
    expect(state.currentStreak).toBe(1);
    expect(state.longestStreak).toBe(1);
    expect(state.solvedToday).toBe(1);
    expect(state.isGoalCompletedToday).toBe(true);
  });

  it('3. should NOT count failed submissions towards streak or solved count', async () => {
    await recordSubmission({
      question_id: 'test-prob-fail',
      problem_title: 'Hard Problem',
      language: 'python',
      code: 'syntax error',
      status: 'Wrong Answer',
      created_at: new Date().toISOString()
    });

    const state = await getStreakState();
    expect(state.currentStreak).toBe(0);
    expect(state.solvedToday).toBe(0);
    expect(state.isGoalCompletedToday).toBe(false);
  });

  it('4. multiple solves on the same day increment solved count but streak remains 1 day', async () => {
    const now = new Date();
    await recordSubmission({
      question_id: 'test-prob-1',
      problem_title: 'Problem 1',
      language: 'python',
      code: 'code1',
      status: 'Accepted',
      created_at: now.toISOString()
    });
    await recordSubmission({
      question_id: 'test-prob-2',
      problem_title: 'Problem 2',
      language: 'sql',
      code: 'code2',
      status: 'Accepted',
      created_at: now.toISOString()
    });
    await recordSubmission({
      question_id: 'test-prob-3',
      problem_title: 'Problem 3',
      language: 'sql',
      code: 'code3',
      status: 'Accepted',
      created_at: now.toISOString()
    });

    const state = await getStreakState();
    expect(state.solvedToday).toBe(3);
    expect(state.currentStreak).toBe(1);
    expect(state.longestStreak).toBe(1);
  });

  it('5. repeated submissions of the same problem on the same day do not inflate distinct count', async () => {
    const now = new Date();
    await recordSubmission({
      question_id: 'test-prob-same',
      problem_title: 'Same Problem',
      language: 'python',
      code: 'code',
      status: 'Accepted',
      created_at: now.toISOString()
    });
    await recordSubmission({
      question_id: 'test-prob-same',
      problem_title: 'Same Problem',
      language: 'python',
      code: 'code v2',
      status: 'Accepted',
      created_at: new Date(now.getTime() + 5000).toISOString()
    });

    const state = await getStreakState();
    expect(state.solvedToday).toBe(1);
  });

  it('6. consecutive calendar days increment streak correctly', async () => {
    const db = await getDatabase();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(today.getDate() - 2);

    // Insert solves for 2 days ago, yesterday, and today
    db.run(
      `INSERT INTO attempts (id, question_id, language, code, status, created_at, row_hmac) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['att-1', 'prob-1', 'python', 'code', 'Accepted', dayBeforeYesterday.toISOString(), 'hmac']
    );
    db.run(
      `INSERT INTO attempts (id, question_id, language, code, status, created_at, row_hmac) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['att-2', 'prob-2', 'sql', 'code', 'Accepted', yesterday.toISOString(), 'hmac']
    );
    db.run(
      `INSERT INTO attempts (id, question_id, language, code, status, created_at, row_hmac) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['att-3', 'prob-3', 'postgres', 'code', 'Accepted', today.toISOString(), 'hmac']
    );

    const state = await getStreakState();
    expect(state.currentStreak).toBe(3);
    expect(state.longestStreak).toBe(3);
  });

  it('7. missing a calendar day resets current streak to 0 while preserving longest streak', async () => {
    const db = await getDatabase();
    const today = new Date();
    
    // 4 consecutive days in the past (e.g. 10, 9, 8, 7 days ago)
    for (let i = 10; i >= 7; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      db.run(
        `INSERT INTO attempts (id, question_id, language, code, status, created_at, row_hmac) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [`att-past-${i}`, `prob-${i}`, 'python', 'code', 'Accepted', d.toISOString(), 'hmac']
      );
    }

    // Nothing yesterday and nothing today
    const state = await getStreakState();
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(4); // Longest streak of 4 preserved!

    // Now user solves 1 problem today -> starts new streak of 1
    await recordSubmission({
      question_id: 'prob-today',
      problem_title: 'Back to practice',
      language: 'python',
      code: 'code',
      status: 'Accepted',
      created_at: today.toISOString()
    });

    const refreshedState = await getStreakState();
    expect(refreshedState.currentStreak).toBe(1);
    expect(refreshedState.longestStreak).toBe(4); // Still 4!
  });

  it('8. configurable daily goal tracks completion status', async () => {
    await setDailyGoal(3);
    const goal = await getDailyGoal();
    expect(goal).toBe(3);

    // Solve 2 problems today
    await recordSubmission({
      question_id: 'g-prob-1',
      problem_title: 'P1',
      language: 'python',
      code: 'c',
      status: 'Accepted'
    });
    await recordSubmission({
      question_id: 'g-prob-2',
      problem_title: 'P2',
      language: 'python',
      code: 'c',
      status: 'Accepted'
    });

    let state = await getStreakState();
    expect(state.solvedToday).toBe(2);
    expect(state.dailyGoal).toBe(3);
    expect(state.isGoalCompletedToday).toBe(false);

    // Solve 3rd problem -> Goal complete!
    await recordSubmission({
      question_id: 'g-prob-3',
      problem_title: 'P3',
      language: 'python',
      code: 'c',
      status: 'Accepted'
    });

    state = await getStreakState();
    expect(state.solvedToday).toBe(3);
    expect(state.isGoalCompletedToday).toBe(true);
  });

  it('9. 7-day activity strip accurately reflects last 7 days', async () => {
    const state = await getStreakState();
    expect(state.activityStrip.length).toBe(7);
    const todayStr = toLocalDateString();
    expect(state.activityStrip[6].date).toBe(todayStr);
  });
});
