-- Migration 002: Streak Engine and Analytics Tables

CREATE TABLE IF NOT EXISTS streaks (
    user_id TEXT PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date TEXT,
    daily_goal INTEGER DEFAULT 3,
    today_solved INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_activity (
    user_id TEXT NOT NULL,
    activity_date TEXT NOT NULL,
    solved_count INTEGER DEFAULT 0,
    attempt_count INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS service_credentials (
    service TEXT PRIMARY KEY,
    encrypted_payload TEXT NOT NULL,
    iv TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS safety_snapshots (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    checksum TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
