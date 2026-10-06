import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  const outDir = path.resolve('tests/visual/profile_flow');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Launching browser to test profile workflow...');
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

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // STEP 1: Click Profile Card in Sidebar
  console.log('Clicking user profile card in bottom sidebar...');
  const profileCardBtn = page.locator('button[title*="View Profile"], button[title*="view profile"]').first();
  await profileCardBtn.click({ force: true });
  await page.waitForTimeout(800);

  const profileViewPath = path.join(outDir, '01_profile_view.png');
  await page.screenshot({ path: profileViewPath });
  console.log(`Saved: ${profileViewPath}`);

  // STEP 2: Open Edit Profile & Photo Modal
  console.log('Opening Edit Profile & Photo Modal...');
  const editBtn = page.locator('button:has-text("Edit Profile & Photo"), button:has-text("Edit Profile Settings")').first();
  await editBtn.click();
  await page.waitForTimeout(600);

  const editModalPath = path.join(outDir, '02_profile_edit_modal.png');
  await page.screenshot({ path: editModalPath });
  console.log(`Saved: ${editModalPath}`);

  // STEP 3: Change Photo (via file input injection)
  console.log('Simulating photo upload...');
  // Create a sample base64 png or use buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const tempImgPath = path.resolve(outDir, 'sample_avatar.png');
  fs.writeFileSync(tempImgPath, samplePngBuffer);

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(tempImgPath);
  await page.waitForTimeout(400);

  // Update bio field
  const bioInput = page.locator('input[placeholder="Insanely mad about coding"]');
  if (await bioInput.count() > 0) {
    await bioInput.fill('Insanely mad about coding • Full Stack DSA Architect');
  }

  // STEP 4: Submit form & capture green tick update popup
  console.log('Submitting profile update...');
  const saveBtn = page.locator('button:has-text("Save & Update Profile")');
  await saveBtn.click();
  await page.waitForTimeout(350);

  const successPopupPath = path.join(outDir, '03_profile_update_success_popup.png');
  await page.screenshot({ path: successPopupPath });
  console.log(`Saved: ${successPopupPath}`);

  // Wait for modal to auto-close
  await page.waitForTimeout(1600);

  const updatedProfilePath = path.join(outDir, '04_profile_view_updated.png');
  await page.screenshot({ path: updatedProfilePath });
  console.log(`Saved: ${updatedProfilePath}`);

  // STEP 5: Go to Settings -> General Preferences
  console.log('Navigating to Settings -> General Preferences...');
  const settingsBtn = page.locator('aside button:has-text("Settings & Backup")');
  await settingsBtn.click();
  await page.waitForTimeout(600);

  const genPrefBtn = page.locator('button:has-text("General Preferences")');
  await genPrefBtn.click();
  await page.waitForTimeout(600);

  const settingsProfilePath = path.join(outDir, '05_settings_profile_card.png');
  await page.screenshot({ path: settingsProfilePath });
  console.log(`Saved: ${settingsProfilePath}`);

  await browser.close();
  console.log('Profile workflow test and screenshots completed successfully!');
}

main().catch(console.error);
