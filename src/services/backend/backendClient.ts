/**
 * Ap Workspace — Dual-Mode Backend Client (Spring Boot + Offline Fallback)
 * 
 * Automatically routes analytics, streaks, automation, and backup operations to the
 * high-performance Spring Boot sidecar when running, while preserving instant offline
 * fallback to in-memory/sql.js services when the backend is unavailable or restarting.
 */

export interface BackendStatus {
  status: 'stopped' | 'starting' | 'running' | 'offline_fallback' | 'missing_java';
  isRunning: boolean;
  port: number;
  url: string | null;
  wsUrl: string | null;
  isOfflineFallback: boolean;
  hasJava: boolean;
  hasJar: boolean;
}

let cachedStatus: BackendStatus | null = null;
let lastCheckTime = 0;

export async function getBackendStatus(): Promise<BackendStatus> {
  const now = Date.now();
  if (cachedStatus && now - lastCheckTime < 3000) {
    return cachedStatus;
  }

  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.backendGetStatus) {
    try {
      cachedStatus = await window.electronAPI.backendGetStatus();
      lastCheckTime = now;
      return cachedStatus;
    } catch {
      // Fallback below
    }
  }

  cachedStatus = {
    status: 'offline_fallback',
    isRunning: false,
    port: 0,
    url: null,
    wsUrl: null,
    isOfflineFallback: true,
    hasJava: false,
    hasJar: false,
  };
  lastCheckTime = now;
  return cachedStatus;
}

export async function isSpringBackendRunning(): Promise<boolean> {
  const status = await getBackendStatus();
  return status.isRunning && Boolean(status.port);
}

/**
 * Proxy request to Spring Boot backend via secure IPC
 */
export async function springRequest<T = any>(
  path: string,
  options: { method?: string; headers?: Record<string, string>; body?: any } = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.backendRequest) {
    try {
      const res = await window.electronAPI.backendRequest(path, options);
      if (res && res.status >= 200 && res.status < 300) {
        return { success: true, data: res.data as T };
      }
      return { success: false, error: (res?.data && res.data.message) || `HTTP error ${res?.status}` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Request failed' };
    }
  }
  return { success: false, error: 'Electron backend IPC not available' };
}

// -------------------------------------------------------------
// High-Level Domain APIs with Transparent Offline Fallback
// -------------------------------------------------------------

export async function fetchAuthoritativeStreakState(): Promise<any> {
  if (await isSpringBackendRunning()) {
    const res = await springRequest('/api/v1/streak');
    if (res.success && res.data) {
      return res.data;
    }
  }
  // Offline fallback to local TypeScript streakService
  const { getStreakState } = await import('@/services/streak/streakService');
  return await getStreakState();
}

export async function fetchAuthoritativeAnalyticsOverview(): Promise<any> {
  if (await isSpringBackendRunning()) {
    const res = await springRequest('/api/v1/analytics/overview');
    if (res.success && res.data) {
      return res.data;
    }
  }
  // Offline fallback to local analyticsService
  const { fetchAnalyticsSnapshot } = await import('@/services/analytics/analyticsService');
  const snap = await fetchAnalyticsSnapshot('7d');
  return {
    totalQuestions: snap.totalQuestions,
    solvedQuestions: snap.solvedQuestions,
    attemptedQuestions: snap.attemptedQuestions,
    remainingQuestions: snap.remainingQuestions,
    totalSubmissions: snap.totalSubmissions,
    acceptedSubmissions: snap.acceptedSubmissions,
    accuracy: snap.accuracy,
    currentStreak: snap.currentStreak,
    longestStreak: snap.longestStreak,
    totalActiveDays: snap.totalActiveDays,
  };
}

export async function recordAuthoritativeAttempt(attemptData: {
  questionId: string;
  problemTitle: string;
  difficulty: string;
  category: string;
  language: string;
  code: string;
  status: string;
  runtimeMs?: number;
  memoryKb?: number;
}): Promise<any> {
  if (await isSpringBackendRunning()) {
    const res = await springRequest('/api/v1/streak/record', {
      method: 'POST',
      body: attemptData,
    });
    if (res.success && res.data) {
      return res.data;
    }
  }
  return null;
}
