# Ap Desktop — User Guide & Feature Tour

Welcome to **Ap Desktop**, an offline-first, performance-engineered interview preparation, coding practice, and career tracking workspace.

---

## 1. Navigating the Workspace

Ap Desktop provides a modular dashboard accessible via the primary sidebar:

- 📋 **Problems:** Browse and filter 1,337+ curated coding challenges by difficulty, category, and acceptance rate.
- 💻 **Code Editor:** Monaco-powered coding workspace with syntax highlighting, autocomplete, multi-language execution, and test runner.
- 🗄️ **SQL Lab:** Interactive SQL playground with both offline SQLite and live PostgreSQL 16 engine connections.
- 🔥 **Daily Streaks & Goals:** Habit tracking engine recording your daily problem-solving milestones, goal completions, and heatmaps.
- 📚 **Learning Tracks:** Structured curricula and custom coding sheets tailored to specific interview targets (e.g., Grind 75, Blind 75, NeetCode 150).
- 📈 **Analytics & Heatmap:** Comprehensive performance breakdown, category mastery charts, and submission histories.
- ⚙️ **Settings & Backups:** Configuration vault for notifications, appearance, toolchain status, and encrypted data backups.

---

## 2. Multi-Language Code Practice

The editor provides native support for multiple languages:

1. **Python 3:** In-memory algorithm execution with test case validation and input/output matching.
2. **Java 21:** Direct compilation with `javac` and execution via your installed JDK.
3. **C++ (C++17/20):** Direct compilation using `g++` or `clang++`.
4. **SQL:** Instant query execution against sample schema tables.

### Running & Submitting Code
- Press `Ctrl + Enter` (or click **Run Code**) to evaluate your solution against visible test cases.
- Click **Submit** to run your code against hidden evaluation test cases, update your streak, and save your submission record.
- Your code drafts are automatically saved to local SQLite as you type.

---

## 3. Daily Streaks & Habit Engine

- **Streak Calculation:** Solves recorded before midnight in your local timezone extend your continuous active streak.
- **Configurable Daily Goals:** Set your daily target (1 to 10 problems/day) from the streak widget.
- **Real-Time Synchronization:** Whenever a problem is accepted, the Spring Boot event broker immediately recalculates your streak and broadcasts an update across the UI.

---

## 4. Backups, Export & Restoration

Protect your practice history and notes:

- **Create Backup:** Navigate to **Settings > Backup & Restore** and click **Export Backup (.apbackup)**. The system bundles your database with a SHA-256 integrity seal.
- **Restore Backup:** Select a previously exported `.apbackup` package. A safety snapshot is automatically created before any tables are updated.

---

## 5. Automation & Notifications

Connect Ap Desktop to your messaging apps to receive daily reminders and streak alerts:

- **Telegram:** Send alerts to a personal chat or group via a Telegram Bot.
- **Twilio SMS / WhatsApp:** Receive SMS reminders before your daily streak expires.
- **Google Sheets:** Automatically sync your accepted problem records to a private Google Sheet.
- **n8n Webhooks:** Trigger automated custom workflows on every accepted submission.
