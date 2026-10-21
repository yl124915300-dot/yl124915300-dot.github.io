const {chromium} = require('playwright');
const assert = require('node:assert/strict');

(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
 try {
  const context = await browser.newContext({viewport:{width:390,height:844}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',e => errors.push(String(e)));
  await page.goto(process.env.CAT_TALES_JOURNAL_URL || 'http://127.0.0.1:8765/cat-tales/app/', {waitUntil:'domcontentloaded'});
  assert.match(await page.title(), /猫猫物语/);
  assert.equal(await page.locator('.paw-journal-tabs').isVisible(), true);
  assert.equal(await page.locator('a[href="../live/?v=2.4"]').first().isVisible(), true);
  assert.equal(await page.locator('#analyze').isDisabled(), true, 'consent still required');
  assert.equal(await page.locator('#result').isVisible(), false, 'do not fabricate a result before input');
  const css = await page.locator('.hero').evaluate(el => getComputedStyle(el).borderRadius);
  assert.ok(parseInt(css, 10) >= 20, 'journal uses feline visual stylesheet');
  await page.locator('#nickname').fill('团子');
  await page.locator('#scene').selectOption('door');
  await page.locator('#vocal').selectOption('seen');
  await page.locator('#consent').check();
  assert.equal(await page.locator('#analyze').isEnabled(), true);
  await page.locator('#analyze').click();
  await page.locator('#result').waitFor({state:'visible'});
  assert.ok(await page.locator('#known-list li').count() > 0, 'real rule-based evidence is rendered');
  assert.match(await page.locator('#privacy').innerText(), /不会.*上传|本地预览|不用于/);
  assert.equal(await page.locator('#history-list .history-entry').count(), 0, 'history remains opt-in');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 2, 'journal does not overflow narrow mobile width: ' + overflow);
  assert.deepEqual(errors, []);
  await context.close();
  console.log('CAT_TALES_JOURNAL_UI_PASS: feline visual bridge, consent, report, no automatic local history');
 } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode=1; });