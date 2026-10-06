import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  // Pre-set sessionStorage to unlocked
  await context.addInitScript(() => {
    sessionStorage.setItem('ap_unlocked', 'true');
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // If login screen still visible, click sign in
  const signInBtn = page.locator('button:has-text("Sign In"), button:has-text("BACK TO HOME")').first();
  if (await signInBtn.count() > 0) {
    await signInBtn.click();
    await page.waitForTimeout(600);
  }

  // Click on user profile in TitleBar or Sidebar
  console.log('Navigating to profile...');
  const avatarBtn = page.locator('button[title*="Developer Profile"], button[title*="View Profile"]').first();
  if (await avatarBtn.count() > 0) {
    await avatarBtn.click();
  } else {
    const userBtn = page.locator('button').filter({ hasText: /Arun/i }).first();
    if (await userBtn.count() > 0) {
      await userBtn.click();
    }
  }

  await page.waitForTimeout(1500);

  const screenshotPath = 'C:/Users/Rishi/.gemini/antigravity-ide/brain/4e175957-a38c-4db3-b97e-de37cd5cf75c/profile_verification.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Profile screenshot successfully saved to:', screenshotPath);

  await browser.close();
}

main().catch(err => {
  console.error('Error running capture script:', err);
  process.exit(1);
});
