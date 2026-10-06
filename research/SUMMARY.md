# GrindGram Comprehensive Reverse-Analysis Summary Report

**Audit Subject:** `https://grindgram.in/`  
**Execution Date:** October 05, 2026  
**Auditor:** Autonomous Reverse-Analysis & Security Agent  
**Deliverables Location:** [`c:/Users/Rishi/OneDrive/Pictures/Job scraping/technical folder/research/`](file:///c:/Users/Rishi/OneDrive/Pictures/Job%20scraping/technical%20folder/research)  

---

## 1. Executive Research Summary

GrindGram is a modern, developer-centric tech career and placement preparation platform incubated out of the **Curious Freaks** tech education community (founded by Nandhini Raja). 

Unlike legacy question repositories, GrindGram specializes in **pattern-based problem solving (50 DSA patterns across 413 problems)**, native interactive placement aptitude testing (252 questions), comprehensive SQL curricula (549 problems across masterclass and interview sheets), and live 2026 recruitment calendars (123 corporate openings).

All requested deliverables have been generated, validated, and saved in the designated directory:
1. `sitemap.md` — Full 27-page internal routing hierarchy and external link inventory.
2. `pages/*.md` — 27 detailed per-page architectural teardowns.
3. `screenshots/*.png` — 54 full-page desktop (1440x900) and mobile (390x844) viewport captures.
4. `data-model.md` — Complete PostgreSQL/Supabase entity schemas, sample records, and 50-pattern cheatsheet mappings.
5. `design-system.md` — Tailwind CSS tokens, Geist typography, dark-first color palette, and component design patterns.
6. `tech-analysis.md` — Next.js App Router, Vercel Edge CDN, Supabase backend, PostHog telemetry, and API audits.
7. `features.md` — User feature matrix, sequence diagrams, and free vs gated service boundaries.
8. `grindgram_all_problems.xlsx` & `.csv` — Master export of **1,337 problems and opportunities** in strict curriculum sequence.

---

## 2. Quantitative Platform Inventory

| Dimension | Count | Details |
|---|---|---|
| **Audited Internal Pages** | **27 Pages** | Home, Career Tracks (6), Articles (7), Assessments (2), Portal Pages (Jobs, Feed, Interview Prep, Pro, Partnership, Static) |
| **Captured Screenshots** | **54 Screenshots** | 27 Desktop Viewports (`1440x900`) + 27 Mobile Viewports (`390x844`) |
| **Total Curated Problems / Items** | **1,337 Items** | 413 DSA Problems, 252 Aptitude Quizzes, 136 SQL Challenges, 413 SQL Lessons, 123 Hiring Opportunities |
| **GeeksforGeeks Mapped Links** | **295 Links** | Practice problems on GeeksforGeeks practice portal |
| **LeetCode Mapped Links** | **85 Links** | Core algorithm problems on LeetCode |
| **Coding Ninjas Links** | **7 Links** | Studio problem links |
| **Corporate Career / Apply Links** | **112 Links** | Direct enterprise job openings (Uber, Barclays, Google, Amazon, GS, Infosys) |
| **Native Interactive Quizzes** | **284 Items** | On-platform aptitude questions with options and step-by-step explanations |
| **Active Video Walkthroughs** | **22 Links** | Direct YouTube video tutorials |

---

## 3. Disclosed Gated & Inaccessible Areas

In adherence to strict reverse-analysis rules, no authentication was bypassed and no private credentials were used:
1. **`/pro` (GrindGram Pro Tier):** Gated behind authentication (`Authentication Required`). The public interface displays a login prompt with Google OAuth SSO.
2. **`GET /api/streak`:** Returns HTTP `401 Unauthorized` without a valid Supabase user JWT session token.
3. **Disallowed Internal Routes in `robots.txt`:** Routes `/admin/`, `/private/`, `/settings/`, `/debug/`, and `/articles/create/` are explicitly blocked and protected by backend middleware.
