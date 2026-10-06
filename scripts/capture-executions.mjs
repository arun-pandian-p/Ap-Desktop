import { chromium } from 'playwright';
import path from 'path';

async function run() {
  console.log('Launching browser to capture live execution states...');
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
    await page.waitForTimeout(600);
  }

  // 1. Python Practice: Click Run Code
  console.log('Navigating to Python Practice...');
  const pyBtn = page.locator('aside button:has-text("Python Practice")');
  await pyBtn.click({ force: true });
  await page.waitForTimeout(600);

  const runCodeBtn = page.locator('button:has-text("Run Code")');
  await runCodeBtn.click();
  await page.waitForTimeout(1500); // Wait for python worker execution
  await page.screenshot({ path: path.resolve('research/screenshots/04_Python_Practice_Executed.png') });
  console.log('✓ Captured 04_Python_Practice_Executed.png');

  // 2. SQL Practice: Click Run Query
  console.log('Navigating to SQL Practice...');
  const sqlBtn = page.locator('aside button:has-text("SQL Practice")');
  await sqlBtn.click({ force: true });
  await page.waitForTimeout(600);

  const runQueryBtn = page.locator('button:has-text("Run Query")');
  await runQueryBtn.click();
  await page.waitForTimeout(800); // Wait for SQLite query execution
  await page.screenshot({ path: path.resolve('research/screenshots/05_SQL_Practice_Executed.png') });
  console.log('✓ Captured 05_SQL_Practice_Executed.png');

  // 3. PostgreSQL Lab: Click Execute SQL
  console.log('Navigating to PostgreSQL Lab...');
  const pgBtn = page.locator('aside button:has-text("PostgreSQL Lab")');
  await pgBtn.click({ force: true });
  await page.waitForTimeout(1000); // Auto-connects

  const execPgBtn = page.locator('button:has-text("Execute SQL")');
  await execPgBtn.click();
  await page.waitForTimeout(1000); // Wait for genuine TCP query execution
  await page.screenshot({ path: path.resolve('research/screenshots/06_PostgreSQL_Lab_Executed.png') });
  console.log('✓ Captured 06_PostgreSQL_Lab_Executed.png');

  await browser.close();
  console.log('Execution screen captures complete!');
}

run().catch(console.error);
