import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('Capturing verified problem descriptions...');
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
    await page.waitForTimeout(500);
  }

  // Navigate to Python Practice
  const pyBtn = page.locator('aside button:has-text("Python Practice")');
  await pyBtn.click({ force: true });
  await page.waitForTimeout(700);

  // Capture Problem #1 (or current problem)
  await page.screenshot({ path: path.resolve('research/screenshots/26_Problem1_Description.png') });

  // Click Next to Problem #2 ("Find last digit in a number")
  const nextBtn = page.locator('button:has-text("Next")').first();
  await nextBtn.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.resolve('research/screenshots/27_Problem2_LastDigit_Detailed.png') });

  // Click Solutions tab
  const solTab = page.locator('button:has-text("Solutions")');
  if (await solTab.count() > 0) {
    await solTab.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.resolve('research/screenshots/28_Problem2_SolutionsTab.png') });
  }

  // Click back to Description tab
  const descTab = page.locator('button:has-text("Description")');
  await descTab.click();
  await page.waitForTimeout(400);

  // Click Next to Problem #3 ("Count digits in a number")
  await nextBtn.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.resolve('research/screenshots/29_Problem3_CountDigits_Detailed.png') });

  await browser.close();
  console.log('Problem description verification screenshots captured successfully!');
}

main().catch(console.error);
