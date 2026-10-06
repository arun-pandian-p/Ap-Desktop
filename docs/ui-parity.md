# Ap Desktop Application — UI Visual Parity Report

**Standard Canvas:** 1586 × 992 px  
**Captured By:** Local Microsoft Edge Headless Automation (`scripts/capture-screens.mjs`)  
**Output Directory:** `research/screenshots/`  
**Reference Directory:** `design/reference/`

---

## 1. Visual Verification Matrix

| Screen | Target Mockup File | Rendered Output | Status | Verified Adaptations & Defect Fixes |
|---|---|---|---|---|
| **Dashboard** | `Red-Accented Coding Productivity Dashboard.png` | `01_Dashboard.png` | **PASSED** | Common light sidebar header used (Section 16.5); streak, hours, KPI tiles, weekly chart, today's plan, Pomodoro card render accurately. |
| **Learning Tracks** | `Modern Learning Tracks Dashboard.png` | `02_Learning_Tracks.png` | **PASSED** | 4-column card grid; ⋯ menu repositioned without overlapping title (Section 16.13 defect resolved). |
| **Coding Problems** | `Coding Problems Practice Dashboard.png` | `03_Coding_Problems.png` | **PASSED** | 1,337 problems loaded with filter chips (Difficulty, Status), bulk checkboxes, and right rail. |
| **Python Practice** | `Red-Accented Coding Productivity Dashboard.png` (bottom) | `04_Python_Practice_Dark.png` | **PASSED** | Full-dark (`#0B1220`) workspace, Monaco editor, 3-zone layout, local stats displayed instead of global stats (Section 16.12). |
| **SQL Practice** | `SQL_Practice_Dashboard_Workspace.png` | `05_SQL_Practice.png` | **PASSED** | Light shell, dark challenge explorer with red-tinted active row, SQLite practice engine indicator, schema preview. |
| **PostgreSQL Lab** | `Dark PostgreSQL SQL Lab Dashboard.png` | `06_PostgreSQL_Lab.png` | **PASSED** | Truthful engine label: "PostgreSQL 16 (Local Bridge)"; database explorer tree, editor, output grid. |
| **To-do Planner** | `Modern To-Do Planner Dashboard.png` | `07_Todo_Planner.png` | **PASSED** | Single clean title (ghost title artifact removed per Section 16.13); quick add row, priority badges. |
| **Study Sessions** | `Modern Study Sessions Dashboard.png` | `08_Study_Sessions.png` | **PASSED** | Stay Focused 25:00 timer card, mode buttons, privacy checklist verified literally true (timestamps only, no keystroke tracking). |
| **Progress & Analytics** | `Progress & Analytics Dashboard.png` | `09_Progress_Analytics.png` | **PASSED** | 5 KPI tiles, study activity line chart, problem accuracy donut, weekly heatmap, achievements list. |
| **Daily Review** | `Daily Review Dashboard Interface.png` | `10_Daily_Review.png` | **PASSED** | Lettered sections A (Accomplishments), B (Reflections with character counters), C (Blockers), D (Plan for tomorrow). |
| **Reports & Notifications**| `Reports and Notifications Dashboard.png`| `11_Reports_Notifications.png` | **PASSED** | Weekly report table, connected services (Telegram Bot, Twilio, Google Sheets, N8N) loaded from `secret.json`. |
| **Settings & Backup** | `Ap Settings & Backup Dashboard.png` | `12_Settings_Appearance.png` | **PASSED** | Theme selector, 8 switchable accent color swatches, density, font sizes. |
| **Security Center** | Section 14 Specification | `13_Security_Center.png` | **PASSED** | Hosted inside Privacy & Security (no extra sidebar item); live license, integrity score (98/100), sandbox test button. |
| **Command Palette** | `Ap Popup & Modal Design System.png` | `14_Command_Palette.png` | **PASSED** | `Ctrl+K` trigger, keyboard navigation, pink-tinted selected row, quick action execution. |
