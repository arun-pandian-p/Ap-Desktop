import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function auditRuntimeErrors() {
  console.log('====================================================');
  console.log('  Ap Workspace -- Full JavaScript Runtime Error Audit');
  console.log('====================================================');

  const errors = [];
  const consoleErrors = [];
  const requestFailures = [];

  let browser;
  for (const channel of ['msedge', 'chrome']) {
    try {
      browser = await chromium.launch({ channel, headless: true });
      console.log(`[OK] Browser launched using channel: ${channel}`);
      break;
    } catch (e) {
      console.warn(`Channel ${channel} unavailable: ${e.message.split('\n')[0]}`);
    }
  }

  if (!browser) {
    console.error('Fatal: Neither Microsoft Edge nor Google Chrome could be launched.');
    process.exit(1);
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(() => {
    sessionStorage.setItem('ap_unlocked', 'true');
    // Polyfill window.electronAPI if running in headless web context
    if (!window.electronAPI) {
      window.electronAPI = {
        minimize: async () => {},
        maximize: async () => {},
        close: async () => {},
        isMaximized: async () => false,
        setAlwaysOnTop: async () => true,
        isAlwaysOnTop: async () => false,
        appInfo: async () => ({
          name: 'Ap Workspace',
          version: '1.2.0',
          platform: 'win32',
          arch: 'x64',
          appData: 'mock',
          isPackaged: false,
          runtime: 'Electron 44 • React 18',
        }),
        getAppVersion: async () => '1.2.0',
        pythonInfo: async () => ({ installed: true, version: 'Python 3.12.0', executable: 'python', status: 'Ready' }),
        javaInfo: async () => ({ installed: true, version: 'Java 21.0.12', executable: 'java', status: 'Ready', name: 'Java JDK' }),
        cppInfo: async () => ({ installed: true, version: 'GCC 13.2', executable: 'g++', status: 'Ready', name: 'C++ Compiler' }),
        runtimesInfo: async () => ({
          python: { installed: true, version: '3.12.0', status: 'Ready', name: 'Python' },
          java: { installed: true, version: '21.0.12', status: 'Ready', name: 'Java JDK' },
          cpp: { installed: true, version: '13.2', status: 'Ready', name: 'C++ GCC' },
        }),
        runtimeVerify: async () => ({ success: true, message: 'Runtime operational' }),
        executeCode: async () => ({
          status: 'Accepted',
          runtime_ms: 12,
          memory_kb: 4200,
          test_cases_passed: 3,
          total_test_cases: 3,
          test_details: [{ test_case_number: 1, passed: true, input: '[2,7,11,15], 9', actual: '[0,1]', expected: '[0,1]', runtime_ms: 4 }],
        }),
        executePython: async () => ({ status: 'Accepted', runtime_ms: 10, memory_kb: 4000, test_cases_passed: 1, total_test_cases: 1 }),
        executeJava: async () => ({ status: 'Accepted', runtime_ms: 20, memory_kb: 8000, test_cases_passed: 1, total_test_cases: 1 }),
        executeCpp: async () => ({ status: 'Accepted', runtime_ms: 5, memory_kb: 2000, test_cases_passed: 1, total_test_cases: 1 }),
        postgresTest: async () => ({ success: true, message: 'Connected to PostgreSQL' }),
        postgresTables: async () => ({ success: true, tables: [{ name: 'employees', table_name: 'employees', table_schema: 'public', row_count: 5 }] }),
        postgresQuery: async () => ({ success: true, rowCount: 1, executionTimeMs: 15, columns: ['id', 'name'], rows: [{ id: 1, name: 'Alice' }] }),
        listManagedAudio: async () => [],
        getAutomationServices: async () => [
          { id: 'telegram', name: 'Telegram Bot', status: 'not_configured', description: '', details: '', isConfigured: false },
        ],
        checkForUpdates: async () => ({ success: true, isUpdateAvailable: false, currentVersion: '1.2.0', latestVersion: '1.2.0' }),
      };
    }
  });

  const page = await context.newPage();

  // Attach error collectors
  page.on('pageerror', (err) => {
    console.error(`[PAGE_ERROR] ${err.name}: ${err.message}\n${err.stack}`);
    errors.push({ type: 'pageerror', message: err.message, stack: err.stack });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out non-fatal expected 404 or favicon warnings
      if (!text.includes('favicon.ico') && !text.includes('ERR_CONNECTION_REFUSED')) {
        console.warn(`[CONSOLE_ERROR] ${text}`);
        consoleErrors.push({ text, location: msg.location() });
      }
    }
  });

  page.on('requestfailed', (req) => {
    const url = req.url();
    if (!url.includes('favicon') && !url.includes('analytics')) {
      requestFailures.push({ url, failure: req.failure() });
    }
  });

  const targetUrl = 'http://localhost:5173/';
  console.log(`\n[Audit Step 1] Navigating to ${targetUrl}...`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);

  // Check login unlock
  const unlockBtn = page.locator('button:has-text("Sign In"), button:has-text("BACK TO HOME")').first();
  if (await unlockBtn.count() > 0) {
    await unlockBtn.click();
    await page.waitForTimeout(500);
  }

  // Helper for clicking sidebar buttons
  async function testNavigation(screenLabel, selector) {
    console.log(`[Audit Step] Navigating to ${screenLabel}...`);
    try {
      const btn = page.locator(selector).first();
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForTimeout(800);
      } else {
        console.warn(`  Selector not found for: ${screenLabel} (${selector})`);
      }
    } catch (e) {
      errors.push({ type: 'navigation_error', screen: screenLabel, message: e.message });
    }
  }

  // 1. Dashboard
  await testNavigation('Dashboard', 'aside button:has-text("Dashboard")');

  // 2. Learning Tracks
  await testNavigation('Learning Tracks', 'aside button:has-text("Learning Tracks")');

  // 3. Problems View & Dataset Audit Modal
  await testNavigation('Problems', 'aside button:has-text("Problems")');
  console.log('  Testing Problems filter chips & Dataset Audit Modal...');
  const auditBtn = page.locator('button:has-text("Dataset Audit")').first();
  if (await auditBtn.count() > 0) {
    await auditBtn.click();
    await page.waitForTimeout(600);
    // Click close button
    const closeBtn = page.locator('#btn-close-audit-modal').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
  }

  // 4. Practice View (Multi-Language IDE)
  await testNavigation('Practice', 'aside button:has-text("Practice")');
  console.log('  Testing Language Selector & Editor in Practice View...');
  // Click Prev / Next
  const nextProb = page.locator('button[title="Next Question"]').first();
  if (await nextProb.count() > 0 && await nextProb.isEnabled()) {
    await nextProb.click();
    await page.waitForTimeout(400);
  }

  // 5. SQL Practice
  await testNavigation('SQL Practice', 'aside button:has-text("SQL Practice")');

  // 6. PostgreSQL Lab
  await testNavigation('PostgreSQL Lab', 'aside button:has-text("PostgreSQL Lab")');
  const newQueryBtn = page.locator('button:has-text("+ New Query")').first();
  if (await newQueryBtn.count() > 0) {
    await newQueryBtn.click();
    await page.waitForTimeout(300);
  }

  // 7. To-do Planner
  await testNavigation('To-do Planner', 'aside button:has-text("To-do Planner")');

  // 8. Study Sessions
  await testNavigation('Study Sessions', 'aside button:has-text("Study Sessions")');

  // 9. Progress & Analytics
  await testNavigation('Progress & Analytics', 'aside button:has-text("Progress & Analytics")');

  // 10. Daily Review
  await testNavigation('Daily Review', 'aside button:has-text("Daily Review")');

  // 11. Reports & Notifications
  await testNavigation('Reports & Notifications', 'aside button:has-text("Reports & Notifications")');

  // 12. Settings & Backup
  await testNavigation('Settings & Backup', 'aside button:has-text("Settings & Backup")');
  console.log('  Testing Settings tabs (Appearance, Offline Storage, About)...');
  const aboutTab = page.locator('button:has-text("About Ap Workspace")').first();
  if (await aboutTab.count() > 0) {
    await aboutTab.click();
    await page.waitForTimeout(500);
  }

  const checkUpdatesBtn = page.locator('#btn-settings-check-updates').first();
  if (await checkUpdatesBtn.count() > 0) {
    await checkUpdatesBtn.click();
    await page.waitForTimeout(600);
    const closeUpdateBtn = page.locator('#btn-close-update-dialog').first();
    if (await closeUpdateBtn.count() > 0) {
      await closeUpdateBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(500);
  }

  // 13. TitleBar Global Search
  console.log('  Testing TitleBar Global Search autocomplete...');
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  if (await searchInput.count() > 0) {
    await searchInput.click();
    await searchInput.fill('Two Sum');
    await page.waitForTimeout(600);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  // 14. TitleBar Quick Add & Notifications Popover
  console.log('  Testing Quick Add & Notification Popover...');
  const quickAddBtn = page.locator('button:has-text("Quick Add"), button[title="Quick Add"]').first();
  if (await quickAddBtn.count() > 0) {
    await quickAddBtn.click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  const notifBtn = page.locator('button[title="Notifications"]').first();
  if (await notifBtn.count() > 0) {
    await notifBtn.click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  await page.waitForTimeout(1000);
  await browser.close();

  console.log('\n====================================================');
  console.log('  Audit Summary Results:');
  console.log(`  - Page Uncaught Errors: ${errors.length}`);
  console.log(`  - Console Errors:       ${consoleErrors.length}`);
  console.log(`  - Failed Network Reqs:  ${requestFailures.length}`);
  console.log('====================================================');

  if (errors.length > 0) {
    console.error('\nDetailed Page Errors:');
    errors.forEach((e, idx) => {
      console.error(`\n[#${idx + 1}] ${e.type}: ${e.message}`);
      if (e.stack) console.error(e.stack);
    });
  }

  if (consoleErrors.length > 0) {
    console.warn('\nDetailed Console Errors:');
    consoleErrors.forEach((c, idx) => {
      console.warn(`[#${idx + 1}] ${c.text}`);
    });
  }

  return { errors, consoleErrors, requestFailures };
}

auditRuntimeErrors().then(({ errors }) => {
  if (errors.length > 0) {
    process.exit(1);
  } else {
    console.log('\n[PASS] No JavaScript runtime errors found during full navigation and interaction audit!');
    process.exit(0);
  }
}).catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
