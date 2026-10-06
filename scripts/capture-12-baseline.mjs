import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const pages = [
  { id: 'dashboard', label: 'Dashboard', filename: '01_dashboard.png' },
  { id: 'tracks', label: 'Learning Tracks', filename: '02_tracks.png' },
  { id: 'problems', label: 'Problems', filename: '03_problems.png' },
  { id: 'python', label: 'Python Practice', filename: '04_python.png' },
  { id: 'sql', label: 'SQL Practice', filename: '05_sql.png' },
  { id: 'postgres', label: 'PostgreSQL Lab', filename: '06_postgres.png' },
  { id: 'planner', label: 'To-do Planner', filename: '07_planner.png' },
  { id: 'sessions', label: 'Study Sessions', filename: '08_sessions.png' },
  { id: 'analytics', label: 'Progress & Analytics', filename: '09_analytics.png' },
  { id: 'review', label: 'Daily Review', filename: '10_review.png' },
  { id: 'reports', label: 'Reports & Notifications', filename: '11_reports.png' },
  { id: 'settings', label: 'Settings & Backup', filename: '12_settings.png' },
];

async function main() {
  const outDir = path.resolve('tests/visual/baseline');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Capturing 1586x992 baseline screenshots for all 12 pages...');
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1586, height: 992 },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Unlock if login/lock screen is active
  const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("BACK TO HOME")').first();
  if (await signInBtn.count() > 0) {
    await signInBtn.click();
    await page.waitForTimeout(600);
  }

  // Close any toast or modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  for (const p of pages) {
    console.log(`Capturing ${p.label} -> ${p.filename}...`);
    const btn = page.locator(`aside button:has-text("${p.label}")`);
    await btn.click({ force: true });
    await page.waitForTimeout(800);

    // If there's an open modal, close it
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    const targetPath = path.join(outDir, p.filename);
    await page.screenshot({ path: targetPath });
    console.log(`Saved: ${targetPath}`);
  }

  await browser.close();
  console.log('All 12 baseline screenshots captured successfully!');
}

main().catch(console.error);
