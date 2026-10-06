import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  const outDir = path.resolve('tests/visual/fixes');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Launching browser to test all 4 fixes...');
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({
    viewport: { width: 1586, height: 992 },
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // Unlock if login screen is active
  const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("BACK TO HOME")').first();
  if (await signInBtn.count() > 0) {
    await signInBtn.click();
    await page.waitForTimeout(600);
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // ==========================================
  // FIX 1: PostgreSQL Lab Query Tabs & + New Query
  // ==========================================
  console.log('Testing Fix 1: PostgreSQL Lab Query Tabs...');
  const pgNavBtn = page.locator('button:has-text("PostgreSQL Lab")').first();
  await pgNavBtn.click();
  await page.waitForTimeout(1000);

  // Check tabs: Query 1, Query 2, and click "+ New Query"
  const newQueryBtn = page.locator('button:has-text("+ New Query")').first();
  if (await newQueryBtn.count() > 0) {
    console.log('Clicking "+ New Query" button...');
    await newQueryBtn.click();
    await page.waitForTimeout(600);
  }

  const pgTabsPath = path.join(outDir, '01_postgres_query_tabs.png');
  await page.screenshot({ path: pgTabsPath });
  console.log(`Saved: ${pgTabsPath}`);

  // Switch to Query 2
  const query2Btn = page.locator('button:has-text("Query 2")').first();
  if (await query2Btn.count() > 0) {
    await query2Btn.click();
    await page.waitForTimeout(400);
  }

  // ==========================================
  // FIX 2: SQL Practice matching LeetCode 175
  // ==========================================
  console.log('Testing Fix 2: SQL Practice LeetCode 175...');
  const sqlNavBtn = page.locator('button:has-text("SQL Practice")').first();
  await sqlNavBtn.click();
  await page.waitForTimeout(1000);

  const sqlPath = path.join(outDir, '02_sql_practice_leetcode175.png');
  await page.screenshot({ path: sqlPath });
  console.log(`Saved: ${sqlPath}`);

  // Open SQL Schema modal
  const sqlSchemaBtn = page.locator('button:has-text("SQL Schema")').first();
  if (await sqlSchemaBtn.count() > 0) {
    await sqlSchemaBtn.click();
    await page.waitForTimeout(500);
    const sqlSchemaModalPath = path.join(outDir, '02b_sql_schema_modal.png');
    await page.screenshot({ path: sqlSchemaModalPath });
    console.log(`Saved: ${sqlSchemaModalPath}`);
    // Close modal
    const closeBtn = page.locator('button:has-text("Close")').first();
    if (await closeBtn.count() > 0) await closeBtn.click();
    await page.waitForTimeout(400);
  }

  // Run Query
  const runBtn = page.locator('button:has-text("Run Query")').first();
  if (await runBtn.count() > 0) {
    await runBtn.click();
    await page.waitForTimeout(800);
    const runResultPath = path.join(outDir, '02c_sql_execution_result.png');
    await page.screenshot({ path: runResultPath });
    console.log(`Saved: ${runResultPath}`);
  }

  // ==========================================
  // FIX 3: Settings - Full Dark Theme Adaptation
  // ==========================================
  console.log('Testing Fix 3: Full Dark Theme Adaptation...');
  const settingsNavBtn = page.locator('button:has-text("Settings & Backup")').first();
  await settingsNavBtn.click();
  await page.waitForTimeout(800);

  // Click Appearance & Themes
  const appearanceTabBtn = page.locator('button:has-text("Appearance & Themes")').first();
  if (await appearanceTabBtn.count() > 0) {
    await appearanceTabBtn.click();
    await page.waitForTimeout(400);
  }

  // Click Full Dark Theme
  const darkThemeBtn = page.locator('button:has-text("Full Dark Theme")').first();
  if (await darkThemeBtn.count() > 0) {
    console.log('Selecting Full Dark Theme...');
    await darkThemeBtn.click();
    await page.waitForTimeout(800);
  }

  const darkThemePath = path.join(outDir, '03_full_dark_theme.png');
  await page.screenshot({ path: darkThemePath });
  console.log(`Saved: ${darkThemePath}`);

  // ==========================================
  // FIX 4: Settings - Problems Dataset Management by Category
  // ==========================================
  console.log('Testing Fix 4: Category Dataset Import...');
  const datasetTabBtn = page.locator('button:has-text("Problems & Dataset Import")').first();
  if (await datasetTabBtn.count() > 0) {
    await datasetTabBtn.click();
    await page.waitForTimeout(600);
  }

  // Category 1: Python Practice
  const pyCatPath = path.join(outDir, '04_settings_python_category.png');
  await page.screenshot({ path: pyCatPath });
  console.log(`Saved: ${pyCatPath}`);

  // Category 2: SQL Practice
  const sqlCatBtn = page.locator('button:has-text("SQL Practice")').first();
  if (await sqlCatBtn.count() > 0) {
    await sqlCatBtn.click();
    await page.waitForTimeout(500);
    const sqlCatPath = path.join(outDir, '05_settings_sql_category.png');
    await page.screenshot({ path: sqlCatPath });
    console.log(`Saved: ${sqlCatPath}`);
  }

  // Category 3: PostgreSQL Lab
  const pgCatBtn = page.locator('button:has-text("PostgreSQL Lab")').first();
  if (await pgCatBtn.count() > 0) {
    await pgCatBtn.click();
    await page.waitForTimeout(500);
    const pgCatPath = path.join(outDir, '06_settings_postgres_category.png');
    await page.screenshot({ path: pgCatPath });
    console.log(`Saved: ${pgCatPath}`);
  }

  await browser.close();
  console.log('All verification captures completed successfully!');
}

main().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
