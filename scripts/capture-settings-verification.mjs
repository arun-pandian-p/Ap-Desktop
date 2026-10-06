import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  await context.addInitScript(() => {
    sessionStorage.setItem('ap_unlocked', 'true');
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Navigate to settings
  console.log('Navigating to Settings...');
  const settingsBtn = page.locator('aside button, button[title*="Settings"]').filter({ hasText: /Settings/i }).first();
  if (await settingsBtn.count() > 0) {
    await settingsBtn.click();
  } else {
    await page.locator('button[title="Settings"]').first().click();
  }
  await page.waitForTimeout(1000);

  // 1. Capture Problems Settings tab
  console.log('Switching to Problems & Dataset Import tab...');
  const problemsTab = page.locator('button').filter({ hasText: /Problems & Dataset Import/i }).first();
  if (await problemsTab.count() > 0) {
    await problemsTab.click();
    await page.waitForTimeout(1000);
  }

  const problemsSettingsPath = 'C:/Users/Rishi/.gemini/antigravity-ide/brain/4e175957-a38c-4db3-b97e-de37cd5cf75c/settings_problems_reset.png';
  await page.screenshot({ path: problemsSettingsPath, fullPage: true });
  console.log('Saved:', problemsSettingsPath);

  // 2. Click "Connect Realtime DB" in header and capture popup
  console.log('Clicking Connect Realtime DB button in header...');
  const connectBtn = page.locator('button:has-text("Connect Realtime DB")').first();
  if (await connectBtn.count() > 0) {
    await connectBtn.click();
    await page.waitForTimeout(500);
    const popupPath = 'C:/Users/Rishi/.gemini/antigravity-ide/brain/4e175957-a38c-4db3-b97e-de37cd5cf75c/settings_db_connected_popup.png';
    await page.screenshot({ path: popupPath });
    console.log('Saved popup:', popupPath);
  }

  await page.waitForTimeout(2000);

  // 3. Switch to Storage tab and capture
  console.log('Switching to Offline Storage & DB tab...');
  const storageTab = page.locator('button').filter({ hasText: /Offline Storage & DB/i }).first();
  if (await storageTab.count() > 0) {
    await storageTab.click();
    await page.waitForTimeout(1000);
  }

  const storagePath = 'C:/Users/Rishi/.gemini/antigravity-ide/brain/4e175957-a38c-4db3-b97e-de37cd5cf75c/settings_storage_reset.png';
  await page.screenshot({ path: storagePath, fullPage: true });
  console.log('Saved storage:', storagePath);

  await browser.close();
}

main().catch(err => {
  console.error('Error running capture:', err);
  process.exit(1);
});
