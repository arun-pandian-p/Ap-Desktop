import { chromium } from 'playwright';
import path from 'path';

async function capture() {
  console.log('Capturing verified screenshots...');
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1586, height: 992 },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Unlock if locked
  const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("BACK TO HOME")').first();
  if (await signInBtn.count() > 0) {
    await signInBtn.click();
    await page.waitForTimeout(500);
  }

  // 1. Problems View - Pagination
  console.log('Capturing Problems View Pagination...');
  const probBtn = page.locator('aside button:has-text("Problems")');
  await probBtn.click({ force: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.resolve('research/screenshots/20_Problems_Pagination_Page1.png') });

  // Click Next page in Problems
  const nextBtn = page.locator('button:has-text("Next")').first();
  if (await nextBtn.count() > 0) {
    await nextBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.resolve('research/screenshots/21_Problems_Pagination_Page2.png') });
  }

  // 2. Python Practice - Navigator & Test Cases
  console.log('Capturing Python Practice Navigator...');
  const pyBtn = page.locator('aside button:has-text("Python Practice")');
  await pyBtn.click({ force: true });
  await page.waitForTimeout(700);

  // Click Next Question
  const nextProbBtn = page.locator('button:has-text("Next")').first();
  if (await nextProbBtn.count() > 0) {
    await nextProbBtn.click();
    await page.waitForTimeout(600);
  }

  // Click Test Cases tab
  const testcaseTab = page.locator('button:has-text("Test Cases")');
  if (await testcaseTab.count() > 0) {
    await testcaseTab.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.resolve('research/screenshots/22_Python_Practice_TestCases.png') });

  // 3. PostgreSQL Lab - Redesigned Green Tick Modal
  console.log('Capturing PostgreSQL Lab Green Tick Popup...');
  const pgBtn = page.locator('aside button:has-text("PostgreSQL Lab")');
  await pgBtn.click({ force: true });
  await page.waitForTimeout(600);

  // Click Connection Settings button
  const connBtn = page.locator('button:has-text("Connection")');
  if (await connBtn.count() > 0) {
    await connBtn.click();
    await page.waitForTimeout(400);

    // Click Test Connection to open the green tick popup
    const testConnBtn = page.locator('button:has-text("Test Connection")');
    if (await testConnBtn.count() > 0) {
      await testConnBtn.click();
      await page.waitForTimeout(1200); // wait for test
      await page.screenshot({ path: path.resolve('research/screenshots/23_Postgres_Green_Tick_Modal.png') });
      const dismissBtn = page.locator('button:has-text("Dismiss")');
      if (await dismissBtn.count() > 0) {
        await dismissBtn.click();
        await page.waitForTimeout(300);
      }
    }
  }

  // Close any lingering modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 4. Settings View - Problems & Dataset Import
  console.log('Capturing Settings Problems Import...');
  const setBtn = page.locator('aside button:has-text("Settings & Backup")');
  await setBtn.click({ force: true });
  await page.waitForTimeout(600);

  // Click Problems & Dataset Import tab
  const probSetBtn = page.locator('button:has-text("Problems & Dataset Import")');
  if (await probSetBtn.count() > 0) {
    await probSetBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.resolve('research/screenshots/24_Settings_Problems_Import.png') });
  }

  // Click General Preferences tab
  const genBtn = page.locator('button:has-text("General Preferences")');
  if (await genBtn.count() > 0) {
    await genBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.resolve('research/screenshots/25_Settings_General_Preferences.png') });
  }

  await browser.close();
  console.log('All new verification screenshots captured successfully!');
}

capture().catch(console.error);
