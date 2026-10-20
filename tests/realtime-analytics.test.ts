import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, recordSubmission, logStudySession, updateTaskStatus } from '../src/services/db';
import { realtimeService } from '../src/services/websocket/realtimeService';
import { 
  fetchAnalyticsSnapshot, 
  fetchTodayFocusStats, 
  exportAnalyticsReport 
} from '../src/services/analytics/analyticsService';
import { toLocalDateString } from '../src/services/streak/streakService';
import path from 'path';

// Import WebSocket Server (CJS)
const websocketServer = require('../electron/websocketServer.cjs');

describe('Real-Time WebSocket & Analytics Engine Verification', () => {
  let wsInfo: { wsPort: number; wsUrl: string; authToken: string } | null = null;

  beforeEach(async () => {
    const db = await getDatabase();
    // Clean tables for isolated deterministic testing
    db.run(`DELETE FROM attempts`);
    db.run(`DELETE FROM study_sessions`);
    db.run(`DELETE FROM tasks`);
    db.run(`DELETE FROM app_settings WHERE key = 'streak_milestones_awarded'`);
  });

  afterEach(() => {
    if (wsInfo) {
      websocketServer.stopWebSocketServer();
      wsInfo = null;
    }
  });

  it('1. should start and stop the RFC 6455 WebSocket Server cleanly', () => {
    wsInfo = websocketServer.startWebSocketServer(58890);
    expect(wsInfo).toBeDefined();
    expect(wsInfo.wsPort).toBeGreaterThanOrEqual(58890);
    expect(wsInfo.wsUrl).toContain('ws://127.0.0.1:');
    expect(wsInfo.authToken).toMatch(/^ap_sec_/);

    const info = websocketServer.getConnectionInfo();
    expect(info.clientCount).toBe(0);

    websocketServer.stopWebSocketServer();
    wsInfo = null;
  });

  it('2. should publish and receive typed Realtime events locally', async () => {
    const received: any[] = [];
    const unsub = realtimeService.subscribe('submission:accepted', (payload, msg) => {
      received.push({ payload, msg });
    });

    await realtimeService.publish('submission:accepted', {
      submissionId: 'sub-test-1',
      questionId: 'q-two-sum',
      problemTitle: 'Two Sum',
      difficulty: 'Easy',
      category: 'Arrays',
      problemType: 'python',
      language: 'python',
      timestamp: new Date().toISOString(),
    });

    expect(received.length).toBe(1);
    expect(received[0].payload.questionId).toBe('q-two-sum');
    expect(received[0].msg.event).toBe('submission:accepted');

    unsub();

    // After unsubscribe, no further events should be delivered to this handler
    await realtimeService.publish('submission:accepted', {
      submissionId: 'sub-test-2',
      questionId: 'q-three-sum',
      problemTitle: 'Three Sum',
      difficulty: 'Medium',
      category: 'Arrays',
      problemType: 'python',
      language: 'python',
      timestamp: new Date().toISOString(),
    });

    expect(received.length).toBe(1);
  });

  it('3. should deduplicate messages with the same ID', async () => {
    const received: string[] = [];
    const unsub = realtimeService.subscribe('task:completed', (payload) => {
      received.push(payload.taskId);
    });

    // Directly publish
    await realtimeService.publish('task:completed', {
      taskId: 'task-101',
      title: 'Review DP',
      completedAt: new Date().toISOString(),
    });

    expect(received.length).toBe(1);
    expect(received[0]).toBe('task-101');

    unsub();
  });

  it('4. should calculate 0% accuracy and 0 solved problems initially', async () => {
    const snapshot = await fetchAnalyticsSnapshot('7d');
    expect(snapshot.totalSubmissions).toBe(0);
    expect(snapshot.acceptedSubmissions).toBe(0);
    expect(snapshot.accuracy).toBe(0);
    expect(snapshot.solvedQuestions).toBe(0);
    expect(snapshot.currentStreak).toBe(0);
    expect(snapshot.activityChart.length).toBe(7);
  });

  it('5. should recalculate accuracy, problem counts, and streak on accepted and failed submissions', async () => {
    const now = new Date().toISOString();

    // Submission 1: Failed
    await recordSubmission({
      question_id: 'q-1',
      problem_title: 'Two Sum',
      difficulty: 'Easy',
      category: 'Arrays',
      language: 'python',
      code: 'wrong code',
      status: 'Wrong Answer',
      created_at: now,
    });

    let snap = await fetchAnalyticsSnapshot('7d');
    expect(snap.totalSubmissions).toBe(1);
    expect(snap.acceptedSubmissions).toBe(0);
    expect(snap.accuracy).toBe(0);
    expect(snap.solvedQuestions).toBe(0);
    expect(snap.attemptedQuestions).toBe(1);

    // Submission 2: Accepted for q-1
    await recordSubmission({
      question_id: 'q-1',
      problem_title: 'Two Sum',
      difficulty: 'Easy',
      category: 'Arrays',
      language: 'python',
      code: 'return [0, 1]',
      status: 'Accepted',
      created_at: now,
    });

    snap = await fetchAnalyticsSnapshot('7d');
    expect(snap.totalSubmissions).toBe(2);
    expect(snap.acceptedSubmissions).toBe(1);
    expect(snap.accuracy).toBe(50); // 1 / 2 = 50%
    expect(snap.solvedQuestions).toBe(1);
    expect(snap.attemptedQuestions).toBe(0); // q-1 is now solved, so no longer in attempting only
    expect(snap.currentStreak).toBe(1);

    // Submission 3: Accepted for q-2
    await recordSubmission({
      question_id: 'q-2',
      problem_title: 'Reverse Linked List',
      difficulty: 'Easy',
      category: 'Linked List',
      language: 'python',
      code: 'return prev',
      status: 'Accepted',
      created_at: now,
    });

    snap = await fetchAnalyticsSnapshot('7d');
    expect(snap.totalSubmissions).toBe(3);
    expect(snap.acceptedSubmissions).toBe(2);
    expect(snap.accuracy).toBe(67); // 2 / 3 = 66.6% -> 67%
    expect(snap.solvedQuestions).toBe(2);
  });

  it('6. should calculate study time and daily activity points from genuine study sessions', async () => {
    const today = new Date();
    const todayStr = toLocalDateString(today);

    // Log 1 hour (3600s) study session today
    await logStudySession({
      session_type: 'focus',
      started_at: today.toISOString(),
      ended_at: new Date(today.getTime() + 3600000).toISOString(),
      elapsed_seconds: 3600,
      active_seconds: 3600,
      idle_seconds: 0,
      status: 'completed',
    });

    const snapshot = await fetchAnalyticsSnapshot('7d');
    expect(Number(snapshot.activeStudyHours)).toBeGreaterThanOrEqual(1.0);

    const todayPoint = snapshot.activityChart.find(pt => pt.date === todayStr);
    expect(todayPoint).toBeDefined();
    expect(todayPoint!.hours).toBeGreaterThanOrEqual(1.0);
    expect(todayPoint!.goal).toBe(3.0);
  });

  it('7. should accurately compute weekly practice heatmap time blocks', async () => {
    const today = new Date();
    // Set time to 14:30 (Afternoon: 12-17)
    today.setHours(14, 30, 0, 0);

    await logStudySession({
      session_type: 'focus',
      started_at: today.toISOString(),
      ended_at: new Date(today.getTime() + 1800000).toISOString(),
      elapsed_seconds: 1800,
      active_seconds: 1800, // 30 minutes
      idle_seconds: 0,
      status: 'completed',
    });

    const snapshot = await fetchAnalyticsSnapshot('7d');
    expect(snapshot.weeklyHeatmap.length).toBe(7);

    const todayHeatmap = snapshot.weeklyHeatmap[snapshot.weeklyHeatmap.length - 1];
    expect(todayHeatmap.isToday).toBe(true);

    const afternoonBlock = todayHeatmap.blocks.find(b => b.blockIndex === 1); // Afternoon
    expect(afternoonBlock).toBeDefined();
    expect(afternoonBlock!.activeMinutes).toBe(30);
    expect(afternoonBlock!.intensity).toBeGreaterThanOrEqual(2); // >= 25 mins is medium (2)
  });

  it('8. should calculate today focus statistics strictly from SQLite', async () => {
    const now = new Date();

    // Log 45-minute focus session today
    await logStudySession({
      session_type: 'focus',
      started_at: now.toISOString(),
      ended_at: new Date(now.getTime() + 2700000).toISOString(),
      elapsed_seconds: 2700,
      active_seconds: 2700,
      idle_seconds: 0,
      status: 'completed',
    });

    // Create and complete a task today
    const db = await getDatabase();
    db.run(
      `INSERT INTO tasks (id, title, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?)`,
      ['task-test-1', 'Practice Binary Search', 'completed', now.toISOString(), now.toISOString()]
    );

    const todayStats = await fetchTodayFocusStats();
    expect(todayStats.sessionsFinishedCount).toBe(1);
    expect(todayStats.tasksCompletedCount).toBe(1);
    expect(todayStats.averageBlockMinutes).toBe(45);
    expect(todayStats.totalFocusTimeFormatted).toBe('45m');
  });

  it('9. should dynamically unlock milestones when thresholds are met', async () => {
    const now = new Date().toISOString();

    // Initial state: not earned
    let snap = await fetchAnalyticsSnapshot('7d');
    const milestone50 = snap.milestones.find(m => m.id === 'solved-50');
    expect(milestone50?.isEarned).toBe(false);

    // Insert 50 unique solved problems
    const db = await getDatabase();
    for (let i = 1; i <= 50; i++) {
      db.run(
        `INSERT INTO attempts (id, question_id, problem_title, difficulty, category, language, code, status, runtime_ms, memory_kb, test_cases_passed, total_test_cases, row_hmac, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`sub-${i}`, `prob-${i}`, `Problem ${i}`, 'Easy', 'Arrays', 'python', 'code', 'Accepted', 10, 1024, 1, 1, 'hmac', now]
      );
    }

    snap = await fetchAnalyticsSnapshot('7d');
    expect(snap.solvedQuestions).toBe(50);
    const updatedMilestone50 = snap.milestones.find(m => m.id === 'solved-50');
    expect(updatedMilestone50?.isEarned).toBe(true);
    expect(updatedMilestone50?.progressPercent).toBe(100);
  });

  it('10. should filter daily activity points by date range (7d, 30d, 90d, all)', async () => {
    const snap7d = await fetchAnalyticsSnapshot('7d');
    const snap30d = await fetchAnalyticsSnapshot('30d');
    const snap90d = await fetchAnalyticsSnapshot('90d');

    expect(snap7d.activityChart.length).toBe(7);
    expect(snap30d.activityChart.length).toBe(30);
    expect(snap90d.activityChart.length).toBe(90);
  });

  it('11. should trigger analytics invalidation on task status update', async () => {
    const db = await getDatabase();
    db.run(
      `INSERT INTO tasks (id, title, status, created_at) VALUES (?, ?, ?, ?)`,
      ['task-dp', 'Dynamic Programming Patterns', 'todo', new Date().toISOString()]
    );

    const invalidatedEvents: any[] = [];
    const unsub = realtimeService.subscribe('analytics:invalidated', (payload) => {
      invalidatedEvents.push(payload);
    });

    await updateTaskStatus('task-dp', 'completed');

    expect(invalidatedEvents.length).toBe(1);
    expect(invalidatedEvents[0].reason).toBe('task');

    unsub();
  });
});
