import { UserProfile } from '@/types';
import { getDatabase } from '@/services/db';

const STORAGE_KEY = 'ap_user_profile';

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Arun pandian',
  username: 'shadowbytewarrior',
  email: 'arunpandi47777@gmail.com',
  avatarUrl: '',
  bio: 'Data Analyst & Software Engineer',
  location: 'India',
  institution: 'National Institute of Technology Surathkal',
  website: 'https://arunpandian.online',
  github: 'arun-pandian-p',
  linkedin: 'arunpandianp-dataanalyst',
  twitter: 'arunpandian',
  skills: ['c++', 'python', 'sql', 'rust', 'go', 'mern', 'flutter'],
  contestRating: 1923,
  globalRanking: '19,203 / 496,921',
  attendedContests: 33,
  solved: {
    total: 90,
    easy: 64,
    easyTotal: 969,
    medium: 23,
    mediumTotal: 2124,
    hard: 3,
    hardTotal: 980,
  },
};

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure rank is stripped
      delete parsed.rank;
      return { ...DEFAULT_USER_PROFILE, ...parsed };
    }
  } catch (err) {
    console.error('Failed to parse user profile from localStorage:', err);
  }
  return DEFAULT_USER_PROFILE;
}

export async function getDynamicUserProfile(): Promise<UserProfile> {
  const base = getUserProfile();
  try {
    const { fetchProfileStats } = await import('@/services/db');
    const stats = await fetchProfileStats();
    return {
      ...base,
      solved: {
        total: stats.totalSolved,
        easy: stats.easySolved,
        easyTotal: stats.easyTotal,
        medium: stats.mediumSolved,
        mediumTotal: stats.mediumTotal,
        hard: stats.hardSolved,
        hardTotal: stats.hardTotal,
      },
    };
  } catch {
    return base;
  }
}

export async function saveUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const current = getUserProfile();
  const next: UserProfile = {
    ...current,
    ...updates,
    solved: {
      ...current.solved,
      ...(updates.solved || {}),
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    // Also persist essential keys to SQLite app_settings if database is ready
    const db = await getDatabase().catch(() => null);
    if (db) {
      if (next.name) db.run(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('user_name', ?)`, [next.name]);
      if (next.username) db.run(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('user_handle', ?)`, [next.username]);
      if (next.email) db.run(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('user_email', ?)`, [next.email]);
    }
  } catch (err) {
    console.error('Failed to save user profile:', err);
  }

  // Dispatch global custom event for realtime cross-component reactivity
  window.dispatchEvent(new CustomEvent('ap_profile_updated', { detail: next }));
  return next;
}
