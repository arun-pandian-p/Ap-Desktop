/**
 * Ap Workspace — Real-Time WebSocket & IPC Event Type Definitions
 */

export type RealtimeEventType =
  | 'submission:accepted'
  | 'submission:updated'
  | 'study-session:started'
  | 'study-session:completed'
  | 'task:completed'
  | 'streak:updated'
  | 'analytics:invalidated';

export type RealtimeConnectionState =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'offline'
  | 'error';

export interface SubmissionAcceptedPayload {
  submissionId: string;
  questionId: string;
  problemTitle: string;
  difficulty: string;
  category: string;
  problemType: 'python' | 'sql' | 'postgres';
  language: string;
  runtimeMs?: number;
  memoryKb?: number;
  testCasesPassed?: number;
  totalTestCases?: number;
  timestamp: string;
}

export interface SubmissionUpdatedPayload {
  submissionId: string;
  questionId: string;
  problemTitle: string;
  status: string;
  language: string;
  timestamp: string;
}

export interface StudySessionStartedPayload {
  sessionId: string;
  sessionType: 'focus' | 'short_break' | 'long_break';
  startedAt: string;
  targetMinutes: number;
}

export interface StudySessionCompletedPayload {
  sessionId: string;
  sessionType: 'focus' | 'short_break' | 'long_break';
  startedAt: string;
  endedAt: string;
  elapsedSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
}

export interface TaskCompletedPayload {
  taskId: string;
  title: string;
  completedAt: string;
}

export interface StreakUpdatedPayload {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  solvedToday: number;
  timestamp: string;
}

export interface AnalyticsInvalidatedPayload {
  reason: 'submission' | 'session' | 'task' | 'reconnect_recovery' | 'manual_refresh' | 'date_range_change';
  timestamp: string;
}

export interface RealtimeEventMap {
  'submission:accepted': SubmissionAcceptedPayload;
  'submission:updated': SubmissionUpdatedPayload;
  'study-session:started': StudySessionStartedPayload;
  'study-session:completed': StudySessionCompletedPayload;
  'task:completed': TaskCompletedPayload;
  'streak:updated': StreakUpdatedPayload;
  'analytics:invalidated': AnalyticsInvalidatedPayload;
}

export interface RealtimeMessage<T = unknown> {
  id: string;
  event: RealtimeEventType;
  payload: T;
  timestamp: string;
}

export type RealtimeEventHandler<T = unknown> = (payload: T, message: RealtimeMessage<T>) => void;
