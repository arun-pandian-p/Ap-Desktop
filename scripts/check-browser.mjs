import { chromium } from 'playwright';

let browser, used;
for (const channel of ['msedge', 'chrome']) {
  try { 
    browser = await chromium.launch({ channel }); 
    used = channel; 
    break; 
  } catch (e) { 
    console.log(`channel ${channel} failed: ${e.message.split('\n')[0]}`); 
  }
}

if (!browser) { 
  console.error('BROWSER_FAIL: no usable system Edge/Chrome'); 
  process.exit(1); 
}

const page = await browser.newPage({ viewport: { width: 1586, height: 992 } });
await page.goto('https://example.com');
await page.screenshot({ path: 'browser-check.png' });
console.log(`BROWSER_OK channel=${used} title="${await page.title()}"`);
await browser.close();
