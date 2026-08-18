const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('dialog', async dialog => {
    console.log('DIALOG:', dialog.message());
    assert(dialog.message().includes('Missing GOOGLE_APPLICATION_CREDENTIALS'), "Dialog should warn about missing config");
    await dialog.accept();
  });

  try {
    console.log("1. Testing Sheets Status & Export UI without config...");
    await page.goto('http://127.0.0.1:3000/');
    await page.waitForSelector('table', { timeout: 5000 });
    
    await page.click('button:has-text("Export to Google Sheets")');
    await page.waitForTimeout(1000); // wait for dialog to trigger and be handled

    console.log("2. Verify Status Endpoint returns false when no config");
    const response = await fetch('http://127.0.0.1:3000/api/sheets/status');
    const json = await response.json();
    assert(json.configured === false, "Status endpoint should return configured: false");

    console.log("ALL AUTOMATED UI CHECKS PASSED.");
  } catch (err) {
    console.error("UI Test Failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
