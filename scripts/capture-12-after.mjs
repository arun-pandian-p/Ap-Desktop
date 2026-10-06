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
  const outDir = path.resolve('tests/visual/after');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Capturing 1586x992 modernized screenshots for all 12 pages...');
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
    console.log(`Navigating to ${p.label}...`);
    const btn = page.locator(`aside button:has-text("${p.label}")`);
    await btn.click({ force: true });
    await page.waitForTimeout(800);

    // If there's an open modal, close it
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const targetPath = path.join(outDir, p.filename);
    await page.screenshot({ path: targetPath });
    console.log(`Saved: ${targetPath}`);

    // If this is Python Practice, also capture with Language Selector open
    if (p.id === 'python') {
      console.log('Opening Language Selector dropdown via data-testid...');
      const langBtn = page.locator('[data-testid="language-selector-button"]').first();
      await langBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      if (await langBtn.count() > 0) {
        await langBtn.click();
        await page.waitForTimeout(600);
        const dropdownPath = path.join(outDir, '04_python_lang_dropdown.png');
        await page.screenshot({ path: dropdownPath });
        console.log(`Saved: ${dropdownPath}`);
        // Close dropdown
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }

    // If this is PostgreSQL Lab, also capture connection modal
    if (p.id === 'postgres') {
      console.log('Testing connection to trigger green modal...');
      const connectBtn = page.locator('button:has-text("Connect Server"), button:has-text("Connect")').first();
      if (await connectBtn.count() > 0) {
        await connectBtn.click();
        await page.waitForTimeout(1000);
        const modalPath = path.join(outDir, '06_postgres_modal.png');
        await page.screenshot({ path: modalPath });
        console.log(`Saved: ${modalPath}`);
        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
    }
  }

  // Responsive narrow window screenshots (1100x700)
  console.log('Capturing responsive narrow window (1100x700) screenshots...');
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.waitForTimeout(500);

  const narrowTargets = [
    { label: 'Python Practice', filename: 'narrow_04_python.png' },
    { label: 'SQL Practice', filename: 'narrow_05_sql.png' },
    { label: 'PostgreSQL Lab', filename: 'narrow_06_postgres.png' },
  ];

  for (const n of narrowTargets) {
    const btn = page.locator(`aside button:has-text("${n.label}")`);
    await btn.click({ force: true });
    await page.waitForTimeout(800);
    const narrowPath = path.join(outDir, n.filename);
    await page.screenshot({ path: narrowPath });
    console.log(`Saved narrow: ${narrowPath}`);
  }

  await browser.close();
  console.log('All modernization screenshots captured successfully!');
}

main().catch(console.error);
