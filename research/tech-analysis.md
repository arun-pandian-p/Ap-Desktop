# GrindGram Technical Architecture & Network Infrastructure Analysis

**Target Domain:** `https://grindgram.in/`  
**Hosting Provider:** Vercel Global Edge Network  
**Audit Date:** October 05, 2026  

---

## 1. Core Technology Stack

```
[Client: Web Browser]
       |
       v (HTTPS / HTTP/2)
[Vercel Edge Network / CDN (BOM1 Mumbai)]
       |
       +---> [Next.js App Router (RSC & Server Actions)]
                   |
                   +---> [Supabase PostgreSQL (Database & Auth)]
                   |
                   +---> [PostHog Analytics (/ingest reverse proxy)]
                   |
                   +---> [Google AdSense (Monetization)]
```

| Layer | Technology / Library | Evidence & Detection Point |
|---|---|---|
| **Frontend Framework** | **Next.js 14 / 15 (App Router)** | `X-Nextjs-Prerender: 1`, `Vary: rsc, next-router-state-tree`, `_next/static/chunks/main-app-*.js` |
| **Rendering Strategy** | **React 18/19 Server Components (RSC) + Hybrid SSR/SSG** | Static prerendered HTML with client-side hydration chunks |
| **Styling & Design** | **Tailwind CSS 3.x** | Utility classes (`max-w-7xl`, `bg-slate-900`, `rounded-xl`, CSS custom properties) |
| **Iconography** | **Lucide React** | `lucide` bundle chunks detected in `4136-be6e4d8b3046a4fc.js` |
| **Animation Library** | **Framer Motion** | Framer motion runtime detected in `2c7c786b-*.js` and `8266-*.js` |
| **Database & ORM** | **PostgreSQL on Supabase** | Supabase client SDK detected in chunks `4378-*.js` and `2078-*.js` |
| **Authentication** | **Supabase Auth (Google OAuth SSO)** | `/auth/callback` endpoint, `signInWithOAuth({ provider: 'google' })` |
| **Telemetry & Analytics** | **PostHog (Self-hosted / Reverse Proxied)** | PostHog web analytics tracking via `/ingest` route |
| **Monetization** | **Google AdSense** | Script `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6650762558560554` |
| **Hosting & Edge CDN** | **Vercel Edge Platform** | `Server: Vercel`, `X-Vercel-Cache: HIT`, `X-Vercel-Id: bom1::...` (Mumbai Edge PoP) |

---

## 2. Network & Public API Endpoints

GrindGram utilizes clean Next.js Route Handlers (`app/api/.../route.ts`):

1. **`GET /api/career-tracks`**  
   * **Status:** `200 OK` (Public)  
   * **Response:** JSON list of all 6 career tracks with metadata (title, slug, enrolled count, duration, rating).
2. **`GET /api/career-tracks/[slug]`**  
   * **Status:** `200 OK` (Public)  
   * **Response:** Deep hierarchical JSON object containing track overview, topics, subtopics, and content arrays (problems, links, quiz payloads).
3. **`GET /api/articles`**  
   * **Status:** `200 OK` (Public)  
   * **Response:** Paginated JSON list of all 7 editorial articles with reading time, category, publish date, and content blocks.
4. **`GET /api/streak`**  
   * **Status:** `401 Unauthorized` (Protected)  
   * **Response:** Requires active Supabase session token in cookies or authorization headers.
5. **`POST /ingest`**  
   * **Status:** PostHog client event tracking buffer endpoint preventing ad-blocker drops.
6. **`GET /auth/callback`**  
   * **Status:** `200 OK` (OAuth redirect clearinghouse exchanging Google auth tokens for Supabase session cookies).

---

## 3. SEO, Robots & Sitemap Audit

* **Robots.txt Analysis:**
  * User-Agents: `*`, `Googlebot`, `Bingbot` explicitly configured.
  * Indexable: `/`, `/career-tracks/`, `/articles/`, `/about/`, `/contact/`, `/privacy-policy/`, `/terms/`, `/api/career-tracks/`, `/api/articles/`.
  * Disallowed: `/api/`, `/admin/`, `/pro/`, `/settings/`, `/debug/`, `/jobs/`, `/interview-prep/`, `/feed/`, `/post/`, `/articles/create/`.
  * *Note on discrepancy:* While `/jobs/`, `/interview-prep/`, and `/feed/` are disallowed in `robots.txt`, they are publicly accessible via browser HTTP navigation.
* **Sitemap.xml:**
  * Declares 13 canonical URLs with daily and weekly change frequencies.
