import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getDatabase, 
  recordSubmission, 
  fetchProfileStats, 
  fetchSubmissionHeatmap, 
  fetchSubmissions, 
  fetchSolvedProblemIds, 
  recalculateStreaks, 
  persistDatabase,
  clearSubmissionsForTesting,
  seedBaselineAttempts,
  resetQuestionsToDefault,
  resetSqlExercisesToDefault,
  resetPostgresExercisesToDefault,
  resetAllUploadedDatasets,
  clearAllSubmissionsAndHistory,
  fetchStats,
  testAndConnectRealtimeDb
} from '../src/services/db';

describe('Profile, Real-time Submissions & Streaks Engine', () => {

  it('1. should record successful submissions and update distinct solved count', async () => {
    // Record an accepted submission for a new problem
    const testProblemId = `test-prob-${Date.now()}`;
    const sub = await recordSubmission({
      question_id: testProblemId,
      problem_title: 'Two Sum Variant Test',
      difficulty: 'Easy',
      category: 'Arrays',
      problem_type: 'python',
      language: 'python',
      code: 'def twoSum(): return [0, 1]',
      status: 'Accepted',
      runtime_ms: 45,
      memory_kb: 16200,
      test_cases_passed: 5,
      total_test_cases: 5,
    });

    expect(sub.id).toBeDefined();
    expect(sub.status).toBe('Accepted');

    // Solved problems set should include this problem
    const solvedSet = await fetchSolvedProblemIds();
    expect(solvedSet.has(testProblemId)).toBe(true);

    // Profile stats should reflect this solved problem
    const profileStats = await fetchProfileStats();
    expect(profileStats.totalSolved).toBeGreaterThanOrEqual(1);
    expect(profileStats.easySolved).toBeGreaterThanOrEqual(1);
    expect(profileStats.totalSubmissions).toBeGreaterThanOrEqual(1);
  });

  it('2. should handle failed submissions without incrementing solved count', async () => {
    const prevStats = await fetchProfileStats();
    const failedProbId = `failed-prob-${Date.now()}`;

    const failedSub = await recordSubmission({
      question_id: failedProbId,
      problem_title: 'Hard Graph Problem',
      difficulty: 'Hard',
      category: 'Graphs',
      problem_type: 'python',
      language: 'python',
      code: 'def solve(): return None',
      status: 'Wrong Answer',
      runtime_ms: 12,
      memory_kb: 14000,
      test_cases_passed: 2,
      total_test_cases: 10,
    });

    expect(failedSub.status).toBe('Wrong Answer');

    // Distinct solved problem IDs should NOT contain failed problem
    const solvedSet = await fetchSolvedProblemIds();
    expect(solvedSet.has(failedProbId)).toBe(false);

    // Profile stats: total solved should remain unchanged, but totalSubmissions should increment
    const newStats = await fetchProfileStats();
    expect(newStats.totalSolved).toBe(prevStats.totalSolved);
    expect(newStats.totalSubmissions).toBe(prevStats.totalSubmissions + 1);
  });

  it('3. should handle duplicate submissions on the same problem correctly', async () => {
    const dupProblemId = `dup-prob-${Date.now()}`;
    const beforeStats = await fetchProfileStats();

    // First accepted submission
    await recordSubmission({
      question_id: dupProblemId,
      problem_title: 'Valid Palindrome Dup Test',
      difficulty: 'Medium',
      category: 'Two Pointers',
      problem_type: 'python',
      language: 'python',
      code: 'def isPal(): return True',
      status: 'Accepted',
    });

    const afterFirstStats = await fetchProfileStats();
    expect(afterFirstStats.totalSolved).toBe(beforeStats.totalSolved + 1);
    expect(afterFirstStats.totalSubmissions).toBe(beforeStats.totalSubmissions + 1);

    // Second accepted submission on the EXACT SAME problem
    await recordSubmission({
      question_id: dupProblemId,
      problem_title: 'Valid Palindrome Dup Test',
      difficulty: 'Medium',
      category: 'Two Pointers',
      problem_type: 'python',
      language: 'python',
      code: 'def isPalOptimized(): return True',
      status: 'Accepted',
    });

    const afterSecondStats = await fetchProfileStats();
    // Unique solved count should NOT increment again
    expect(afterSecondStats.totalSolved).toBe(afterFirstStats.totalSolved);
    // But total submissions count SHOULD increment
    expect(afterSecondStats.totalSubmissions).toBe(afterFirstStats.totalSubmissions + 1);
  });

  it('4. should calculate streaks accurately across date boundaries', async () => {
    const db = await getDatabase();
    
    // Clear attempts for controlled streak testing
    db.run(`DELETE FROM attempts;`);

    const now = new Date();
    const todayStr = now.toISOString();
    
    const d1 = new Date(now);
    d1.setDate(d1.getDate() - 1);
    const yesterdayStr = d1.toISOString();

    const d2 = new Date(now);
    d2.setDate(d2.getDate() - 2);
    const twoDaysAgoStr = d2.toISOString();

    // Add 3 consecutive days of attempts (today, yesterday, 2 days ago)
    await recordSubmission({
      question_id: 'streak-q1',
      language: 'python',
      code: 'pass',
      status: 'Accepted',
      created_at: twoDaysAgoStr,
    });

    await recordSubmission({
      question_id: 'streak-q2',
      language: 'python',
      code: 'pass',
      status: 'Accepted',
      created_at: yesterdayStr,
    });

    await recordSubmission({
      question_id: 'streak-q3',
      language: 'python',
      code: 'pass',
      status: 'Accepted',
      created_at: todayStr,
    });

    const streak3 = await recalculateStreaks();
    expect(streak3.currentStreak).toBe(3);
    expect(streak3.longestStreak).toBe(3);
    expect(streak3.totalActiveDays).toBe(3);
    expect(streak3.totalSubmissions).toBe(3);

    // Now test streak reset when last attempt was 5 days ago (missing days)
    db.run(`DELETE FROM attempts;`);
    const dOld1 = new Date(now);
    dOld1.setDate(dOld1.getDate() - 5);
    const dOld2 = new Date(now);
    dOld2.setDate(dOld2.getDate() - 6);

    await recordSubmission({
      question_id: 'old-q1',
      language: 'python',
      code: 'pass',
      status: 'Accepted',
      created_at: dOld2.toISOString(),
    });

    await recordSubmission({
      question_id: 'old-q2',
      language: 'python',
      code: 'pass',
      status: 'Accepted',
      created_at: dOld1.toISOString(),
    });

    const resetStreak = await recalculateStreaks();
    // Since last active day was 5 days ago, currentStreak MUST reset to 0
    expect(resetStreak.currentStreak).toBe(0);
    // But longestStreak should retain the 2 days from the past
    expect(resetStreak.longestStreak).toBe(2);
    expect(resetStreak.totalActiveDays).toBe(2);
  });

  it('5. should generate 52-week calendar heatmap matching SQLite submissions', async () => {
    const heatmap = await fetchSubmissionHeatmap('current');
    expect(heatmap).toBeDefined();
    expect(heatmap.weeks.length).toBeLessThanOrEqual(52);
    expect(heatmap.weeks.length).toBeGreaterThan(50);
    
    // Each week should contain 7 days
    heatmap.weeks.forEach(week => {
      expect(week.length).toBe(7);
      week.forEach(day => {
        expect(day.level).toBeGreaterThanOrEqual(0);
        expect(day.level).toBeLessThanOrEqual(4);
      });
    });

    // Check year parameter
    const heatmap2026 = await fetchSubmissionHeatmap(2026);
    expect(heatmap2026.year).toBe(2026);
    expect(heatmap2026.weeks.length).toBeGreaterThan(0);
  });

  it('6. should re-seed baseline attempts and preserve 90 solved / 124 submissions benchmark', async () => {
    const db = await getDatabase();
    db.run(`DELETE FROM attempts;`);
    await seedBaselineAttempts(db);

    const stats = await fetchProfileStats();
    expect(stats.totalSolved).toBe(90);
    expect(stats.easySolved).toBe(64);
    expect(stats.mediumSolved).toBe(23);
    expect(stats.hardSolved).toBe(3);
    expect(stats.attemptingCount).toBe(3);
    expect(stats.totalSubmissions).toBe(124);
    expect(stats.totalActiveDays).toBe(20);
    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
  });

  it('7. should persist data across database reload', async () => {
    const db = await getDatabase();
    const initialStats = await fetchProfileStats();

    // Export database binary
    const exportedBytes = db.export();
    expect(exportedBytes.length).toBeGreaterThan(1000);

    // Re-instantiate a fresh SQL database from the exported bytes
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const reloadedDb = new SQL.Database(exportedBytes);

    const checkRes = reloadedDb.exec(`SELECT COUNT(*) FROM attempts`);
    const count = checkRes[0].values[0][0];
    expect(count).toBe(initialStats.totalSubmissions);
  });

  it('8. should reset uploaded datasets to default factory seeds', async () => {
    const db = await getDatabase();

    // Insert dummy uploaded custom questions
    db.run(
      `INSERT INTO questions (id, subtopic_id, track_slug, pattern_name, subtopic_name, title, platform, difficulty, practice_link, video_link, hint_link, xp, status, order_num)
       VALUES ('custom-test-q', '', 'core-dsa', 'Custom Pattern', 'Custom Sub', 'Custom Uploaded Problem', 'Custom', 'Easy', '', '', '', 10, 'todo', 99999)`
    );

    // Insert dummy uploaded SQL exercise
    db.run(
      `INSERT INTO sql_exercises (id, title, difficulty, category, description, schema_sql, seed_sql, initial_query, solution_sql, expected_output_json, input_ascii, output_ascii, explanation, image_url)
       VALUES ('custom-sql-q', 'Custom SQL Upload', 'Easy', 'CUSTOM', 'Desc', 'CREATE TABLE t (x INT);', 'INSERT INTO t VALUES (1);', 'SELECT * FROM t;', 'SELECT * FROM t;', '[]', '', '', '', '')`
    );

    // Reset all uploaded
    const resetRes = await resetAllUploadedDatasets();
    expect(resetRes.python).toBe(1337);
    expect(resetRes.sql).toBe(11);
    expect(resetRes.postgres).toBe(4);

    // Custom items should be gone
    const checkCustomQ = db.exec(`SELECT COUNT(*) FROM questions WHERE id = 'custom-test-q'`);
    expect(checkCustomQ[0].values[0][0]).toBe(0);

    const checkCustomSql = db.exec(`SELECT COUNT(*) FROM sql_exercises WHERE id = 'custom-sql-q'`);
    expect(checkCustomSql[0].values[0][0]).toBe(0);
  });

  it('9. should test and connect realtime DB with verified status and latency', async () => {
    const res = await testAndConnectRealtimeDb();
    expect(res.success).toBe(true);
    expect(res.latencyMs).toBeGreaterThanOrEqual(1);
    expect(res.tablesCount).toBeGreaterThanOrEqual(6);
    expect(res.questionsCount).toBeGreaterThanOrEqual(1337);
    expect(res.message).toContain('Connected to SQLite Wasm Realtime Database');
  });

  it('10. should clear all submissions, active history, streaks, and sessions to 0', async () => {
    const clearRes = await clearAllSubmissionsAndHistory();
    expect(clearRes.cleared).toBe(true);
    expect(clearRes.attemptsCount).toBe(0);

    const profileStats = await fetchProfileStats();
    expect(profileStats.totalSolved).toBe(0);
    expect(profileStats.totalSubmissions).toBe(0);
    expect(profileStats.totalActiveDays).toBe(0);
    expect(profileStats.currentStreak).toBe(0);
    expect(profileStats.longestStreak).toBe(0);

    const overallStats = await fetchStats();
    expect(overallStats.solvedQuestions).toBe(0);
    expect(overallStats.accuracy).toBe(0);
    expect(overallStats.streakDays).toBe(0);

    const heatmap = await fetchSubmissionHeatmap('current');
    expect(heatmap.totalSubmissions).toBe(0);
    expect(heatmap.totalActiveDays).toBe(0);

    const subs = await fetchSubmissions();
    expect(subs.length).toBe(0);

    const solvedIds = await fetchSolvedProblemIds();
    expect(solvedIds.size).toBe(0);
  });
});
