const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));

  try {
    await page.goto('http://localhost:5179', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) { logs.push('goto err: ' + e.message); }

  // Guest login
  try {
    await page.waitForSelector('.auth-guest-btn', { timeout: 15000 });
    await page.click('.auth-guest-btn');
    logs.push('clicked guest');
  } catch (e) { logs.push('guest btn err: ' + e.message); }

  await page.waitForTimeout(4000);
  logs.push('URL after guest: ' + page.url());

  // Try to skip onboarding if present
  for (const sel of ['.onboarding-skip', '.ob-skip', 'button:has-text("Skip")', 'button:has-text("Continue")', 'button:has-text("Enter")']) {
    try {
      const el = await page.$(sel);
      if (el) { await el.click(); logs.push('clicked ' + sel); await page.waitForTimeout(1500); }
    } catch (e) {}
  }

  // Go straight to library explore
  try {
    await page.goto('http://localhost:5179/realm/explore', { waitUntil: 'networkidle', timeout: 30000 });
    logs.push('navigated to explore, URL: ' + page.url());
  } catch (e) { logs.push('explore nav err: ' + e.message); }

  await page.waitForTimeout(6000); // let scene load

  // Check current cinematic state via DOM letterbox bars
  const before = await page.$('.cine-bars.on');
  logs.push('cine-bars.on BEFORE: ' + (!!before));

  // Press key 5
  await page.keyboard.press('5');
  await page.waitForTimeout(2500);
  const after = await page.$('.cine-bars.on');
  logs.push('cine-bars.on AFTER key5: ' + (!!after));

  // Also try clicking the Cinematic button if present
  try {
    const btn = await page.$('.cine-btn');
    logs.push('cine-btn present: ' + (!!btn));
    if (btn) { await btn.click(); await page.waitForTimeout(2000); }
  } catch (e) { logs.push('cine-btn err: ' + e.message); }
  const afterBtn = await page.$('.cine-bars.on');
  logs.push('cine-bars.on AFTER button: ' + (!!afterBtn));

  await browser.close();
  console.log('=== LOGS ===');
  console.log(logs.join('\n'));
})();
