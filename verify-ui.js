const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  try {
    // 1. 3-Filter Intersection (Dashboard)
    console.log("1. Testing 3-filter intersection...");
    await page.goto('http://127.0.0.1:3000/');
    await page.waitForSelector('table', { timeout: 5000 });
    
    // Apply min_score, region=yes, tech keyword
    await page.fill('input[name="min_score"]', '10');
    await page.selectOption('select[name="india_friendly"]', 'yes');
    await page.fill('input[name="tech"]', 'node');
    await page.waitForTimeout(1500); // Wait for debounce and network
    
    // Check if table rows exist and their content matches criteria
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`Found ${rowCount} rows with 3 filters applied.`);
    if (rowCount > 0) {
      for (let i = 0; i < rowCount; i++) {
        const text = await rows.nth(i).innerText();
        const scoreMatch = text.match(/\n(\d+)\n/); // basic extraction of score badge
        if (scoreMatch) {
            const score = parseInt(scoreMatch[1]);
            assert(score >= 10, `Score ${score} is less than 10`);
        }
        assert(text.toLowerCase().includes('yes'), "Row should contain 'yes' for region");
        assert(text.toLowerCase().includes('node'), "Row should contain 'node' tech stack");
      }
      console.log("-> 3-filter intersection assertions passed.");
    } else {
      console.log("-> 0 rows found for 3 filters, skipping explicit assertion but filter didn't crash.");
    }

    // 2. Profile Editor UI - Validation Error (Zod integration)
    console.log("2. Testing Profile Editor Validation Error UI...");
    await page.goto('http://127.0.0.1:3000/profile');
    await page.waitForSelector('form', { timeout: 5000 });
    
    // Clear the JSearch query to trigger required error
    const firstQueryInput = page.locator('input[placeholder="Query (e.g. node.js backend)"]').first();
    await firstQueryInput.fill('');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('.error-text', { timeout: 2000 });
    const errorText = await page.locator('.error-text').first().innerText();
    assert(errorText.includes('Query is required'), "Should show field-level Zod error for missing query");
    console.log("-> Field-level validation error rendered correctly:", errorText);

    // 3. Profile Editor UI - Sibling Fields Integrity & Persistence
    console.log("3. Testing Profile Sibling Integrity & Persistence...");
    // Reload to clear validation error state
    await page.reload();
    await page.waitForSelector('form', { timeout: 5000 });
    await page.waitForTimeout(1000); // Wait for form to populate

    // Note initial values of siblings
    const initialMinScore = await page.inputValue('input[name="scoring.min_score_to_store"]');
    const initialBio = await page.inputValue('input[name="outreach.bio_short"]');
    
    // Edit across 4 sections
    // Section 1: search (add a JSearch query or just change positive kw)
    // using chip input (find the input adjacent to the label):
    const titleContainer = page.locator('div.form-group:has-text("Positive Title Keywords")');
    await titleContainer.locator('input[type="text"]').fill('playwright-test');
    await titleContainer.locator('input[type="text"]').press('Enter');
    
    // Section 2: scoring (edit weight)
    await page.fill('input[name="scoring.weights.title"]', '40');
    // Section 3: location (add a negative region)
    const locContainer = page.locator('div.form-group:has-text("Region Negative Keywords")');
    await locContainer.locator('input[type="text"]').fill('mars');
    await locContainer.locator('input[type="text"]').press('Enter');
    // Section 4: outreach
    await page.fill('input[name="outreach.candidate_name"]', 'Test Name');
    
    // Save
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000); // wait for save API and refetch
    
    // Reload page
    await page.reload();
    await page.waitForSelector('form', { timeout: 5000 });
    await page.waitForTimeout(1000); // Wait for form initialValues to populate

    // Assert edits persisted
    const savedName = await page.inputValue('input[name="outreach.candidate_name"]');
    const savedWeight = await page.inputValue('input[name="scoring.weights.title"]');
    assert.strictEqual(savedName, 'Test Name', "Candidate name edit did not persist");
    assert.strictEqual(savedWeight, '40', "Weight edit did not persist");
    
    // Assert sibling integrity (untouched fields should be exactly the same as before)
    const reloadedMinScore = await page.inputValue('input[name="scoring.min_score_to_store"]');
    const reloadedBio = await page.inputValue('input[name="outreach.bio_short"]');
    assert.strictEqual(reloadedMinScore, initialMinScore, "Sibling field (min_score_to_store) was mutated!");
    assert.strictEqual(reloadedBio, initialBio, "Sibling field (bio_short) was mutated!");
    console.log("-> Profile edits persisted and sibling fields maintained integrity.");

    // 4. Duplicate Profile UI
    console.log("4. Testing Duplicate Profile UI...");
    const initialProfiles = await page.locator('.card button.btn').count();
    await page.click('button:has-text("Duplicate")');
    await page.waitForTimeout(1000); // wait for mutation and invalidation
    let newProfiles = await page.locator('.card button.btn').count();
    assert(newProfiles === initialProfiles + 1, "Should have 1 more profile in sidebar after duplication");
    console.log("-> Duplication works from UI.");

    // 5. Import Preset UI
    console.log("5. Testing Import Preset UI...");
    await page.selectOption('select#preset-select', { index: 1 }); // select first preset
    await page.click('button:has-text("Import")');
    await page.waitForTimeout(1000);
    newProfiles = await page.locator('.card button.btn').count();
    assert(newProfiles === initialProfiles + 2, "Should have 2 more profiles in sidebar after import");
    console.log("-> Import Preset works from UI.");
    
    console.log("ALL AUTOMATED UI CHECKS PASSED.");
  } catch (err) {
    console.error("UI Test Failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
