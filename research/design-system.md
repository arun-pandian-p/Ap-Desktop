# GrindGram Design System & UI Specification

**Audited Website:** `https://grindgram.in/`  
**CSS Engine:** Tailwind CSS 3.x with CSS Custom Variables  
**Visual Style:** Modern Dark-First Developer Aesthetics (Glassmorphism, High-Contrast Typography, Neon Accents)  

---

## 1. Color Palette Tokens

GrindGram employs a curated dark theme tailored for prolonged coding sessions, using deep slate backgrounds accented with vibrant indicator colors:

| Token Name | Hex Code | HSL / RGB | Semantic Usage |
|---|---|---|---|
| **Background (Primary)** | `#090D16` / `#0A0F1D` | `rgb(10, 15, 29)` | Global page body background |
| **Card / Surface (Elevated)** | `#111827` / `#1E293B` | `rgb(30, 41, 59)` | Cards, dialog modals, sidebar container |
| **Border (Subtle)** | `#1E293B` | `rgb(30, 41, 59)` | Card boundaries, table dividers |
| **Border (Active / Hover)** | `#3B82F6` / `#6366F1` | `rgb(99, 102, 241)` | Focus rings, card hover states |
| **Text (Primary)** | `#F8FAFC` | `rgb(248, 250, 252)` | Main headings, H1-H3, primary button text |
| **Text (Secondary / Muted)**| `#94A3B8` | `rgb(148, 163, 184)` | Meta descriptions, subtext, reading time |
| **Accent / Brand Purple** | `#6366F1` | `rgb(99, 102, 241)` | Primary action buttons, active tabs, brand logo accent |
| **Success / Easy Tag** | `#10B981` / `#16A34A` | `rgb(22, 163, 74)` | 'Easy' difficulty badge, correct quiz answer, 100% progress |
| **Warning / Medium Tag** | `#F59E0B` / `#D97706` | `rgb(217, 119, 6)` | 'Medium' difficulty badge, streak flame, warning notes |
| **Danger / Hard Tag** | `#EF4444` / `#DC2626` | `rgb(220, 38, 38)` | 'Hard' difficulty badge, incorrect answer, deadline alert |
| **Information / Link Blue** | `#3B82F6` / `#2563EB` | `rgb(37, 99, 235)` | Hyperlinks, LeetCode / GFG redirection tags |

---

## 2. Typography

GrindGram loads Vercel's high-performance **Geist** font family via Next.js Font Optimization:

* **Primary Sans-Serif Font:** `Geist`, `var(--font-geist-sans)`, `ui-sans-serif, system-ui, sans-serif`
  * Heading 1 (Hero): `32px` to `48px` (2.5rem – 3rem), SemiBold / Bold (`font-weight: 700`), Letter-spacing `-0.025em`.
  * Heading 2 (Sections): `24px` to `30px` (1.5rem – 1.875rem), SemiBold (`font-weight: 600`).
  * Heading 3 (Cards): `18px` to `20px` (1.125rem – 1.25rem), Medium (`font-weight: 500`).
  * Body Text: `14px` to `16px` (0.875rem – 1rem), Regular (`font-weight: 400`), Line-height `1.6`.
* **Monospace Font:** `Geist Mono`, `var(--font-geist-mono)`, `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`
  * Used for: SQL queries, code snippets, keyboard shortcuts, XP counters.

---

## 3. Spacing, Borders & Shadows

* **Layout Container Max-Width:** `max-w-7xl` (`1280px`) with centered `mx-auto` and horizontal padding `px-4 sm:px-6 lg:px-8`.
* **Border Radii:**
  * Small Badges / Buttons: `rounded-md` (`6px`)
  * Content Cards / Tables: `rounded-xl` (`12px`)
  * Hero Containers / Modals: `rounded-2xl` (`16px`)
  * Pills / Status Tags: `rounded-full` (`9999px`)
* **Shadows & Glow Effects:**
  * Card Elevation: `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)`
  * Focus Glow: `0 0 15px rgba(99, 102, 241, 0.35)`
  * Streak Fire Glow: `0 0 12px rgba(245, 158, 11, 0.4)`

---

## 4. Component Styles & Patterns

### 1. Button Variants
* **Primary CTA:** Solid indigo background (`bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition-all`).
* **Secondary / Outline:** Transparent with slate border (`border border-slate-700 hover:border-slate-500 text-slate-200 px-4 py-2 rounded-lg`).
* **Ghost / Icon Buttons:** No background with hover slate (`hover:bg-slate-800 text-slate-400 hover:text-white p-2 rounded-lg`).

### 2. Cards & Accordions
* **Track & Article Cards:** Dark slate background (`bg-slate-900/60 backdrop-blur-md border border-slate-800 hover:border-indigo-500/50 transition-all rounded-xl p-5`).
* **Collapsible Pattern Accordions:** Expandable trigger bar showing pattern title, problem counter badge, and chevron icon rotating 180° upon expansion.

### 3. Gamification Badges
* **Daily Streak Pill:** Orange fire icon + bold days count (`bg-amber-950/40 border border-amber-800/60 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold`).
* **XP Counter:** Purple gem icon + points badge (`bg-indigo-950/40 text-indigo-300 px-2.5 py-0.5 rounded-full text-xs`).

---

## 5. Visual Asset & Mascot Inventory

* **Brand Logo:** Styled lettermark combining a geometric `"G"` with modern typography `"GrindGram"`.
* **Mascot Persona:** Playful tech hustler / cartoon developer character rendered in modern vector flat art style with vibrant hoodies and glowing laptop screens.
* **Icon Set:** Clean, line-based SVGs powered by **Lucide React** (`lucide-react`):
  * `Flame` (Streak)
  * `Trophy` (Leaderboard)
  * `BookOpen` (Articles)
  * `Code2` (Coding Sheet)
  * `Database` (SQL)
  * `Calendar` (Hiring Dates)
  * `ExternalLink` (LeetCode/GFG outbound redirection)
  * `CheckCircle2` (Completion toggle)
