/**
 * Shared Type Definitions for Ap Desktop Platform
 */

export type ProblemDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface Problem {
  id: string | number;
  title: string;
  slug: string;
  difficulty: ProblemDifficulty;
  category: string;
  description?: string;
  starterCode?: Record<string, string>;
  testCases?: Array<{ input: string; expectedOutput: string }>;
  acceptedCount?: number;
  totalSubmissions?: number;
}

export interface Submission {
  id: string;
  problemId: string | number;
  language: 'python' | 'java' | 'cpp' | 'sql';
  code: string;
  status: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error';
  runtimeMs?: number;
  memoryKb?: number;
  createdAt: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  dailyGoal: number;
  todaySolved: number;
  goalMetToday: boolean;
  activeDaysCount: number;
  history?: Record<string, number>;
}

export interface BackendHealth {
  status: 'UP' | 'DOWN';
  sidecar: string;
  timestamp: string;
  port: number;
  dbConnected: boolean;
  version: string;
}

export interface AutomationServiceStatus {
  service: 'telegram' | 'twilio' | 'google' | 'n8n';
  configured: boolean;
  enabled: boolean;
  target?: string;
}

export interface CodingSheet {
  id: string;
  title: string;
  slug: string;
  description: string;
  questionCount: number;
  isCustom?: boolean;
}
