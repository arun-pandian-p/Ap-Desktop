import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const outDir = path.resolve('research/screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function capture() {
  console.log('Launching Edge for visual screen captures at 1586x992...');
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1586, height: 992 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 1. Capture Login View if shown, or lock to show it
  // Check if Login View is active
  const loginHeading = page.locator('h1:has-text("Welcome Back!")');
  if (await loginHeading.count() === 0) {
    // Click lock button in title bar
    const lockBtn = page.locator('header button[title*="Lock Workspace"]');
    if (await lockBtn.count() > 0) {
      await lockBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Capture Login Screen
  await page.screenshot({ path: path.join(outDir, '00_Red_Mountain_Login.png') });
  console.log('✓ Captured 00_Red_Mountain_Login.png');

  // Unlock workspace
  const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("BACK TO HOME")').first();
  if (await signInBtn.count() > 0) {
    await signInBtn.click();
    await page.waitForTimeout(600);
  }

  const screens = [
    { name: '01_Dashboard.png', text: 'Dashboard' },
    { name: '02_Learning_Tracks.png', text: 'Learning Tracks' },
    { name: '03_Coding_Problems.png', text: 'Problems' },
    { name: '04_Python_Practice_Dark.png', text: 'Python Practice' },
    { name: '05_SQL_Practice.png', text: 'SQL Practice' },
    { name: '06_PostgreSQL_Lab.png', text: 'PostgreSQL Lab' },
    { name: '07_Todo_Planner.png', text: 'To-do Planner' },
    { name: '08_Study_Sessions.png', text: 'Study Sessions' },
    { name: '09_Progress_Analytics.png', text: 'Progress & Analytics' },
    { name: '10_Daily_Review.png', text: 'Daily Review' },
    { name: '11_Reports_Notifications.png', text: 'Reports & Notifications' },
    { name: '12_Settings_Appearance.png', text: 'Settings & Backup' },
  ];

  for (const s of screens) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const btn = page.locator(`aside button:has-text("${s.text}")`);
    await btn.click({ force: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, s.name) });
    console.log(`✓ Captured ${s.name}`);
  }

  // 13. Security Center inside Settings
  const secBtn = page.locator('button:has-text("Privacy & Security Center")');
  if (await secBtn.count() > 0) {
    await secBtn.click({ force: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '13_Security_Center.png') });
    console.log('✓ Captured 13_Security_Center.png');
  }

  // 14. About Ap inside Settings (shows Glossy Red Monogram Icon)
  const aboutBtn = page.locator('button:has-text("About Ap")');
  if (await aboutBtn.count() > 0) {
    await aboutBtn.click({ force: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, '15_About_Ap.png') });
    console.log('✓ Captured 15_About_Ap.png');
  }

  // 15. Command Palette (Ctrl+K)
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '14_Command_Palette.png') });
  console.log('✓ Captured 14_Command_Palette.png');

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

capture().catch((e) => {
  console.error('Capture failed:', e);
  process.exit(1);
});
