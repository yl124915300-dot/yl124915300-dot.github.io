const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', err => errors.push(String(err)));
    await page.goto(process.env.CAT_TALES_TEST_URL || 'http://127.0.0.1:8765/cat-tales/live/', {waitUntil:'domcontentloaded'});
    await page.locator('#cat-live-mood').waitFor({state:'visible'});
    assert.match(await page.title(), /猫猫物语 LIVE/);
    assert.match(await page.locator('.navlive').innerText(), /v2\.(4|5)/);
    assert.equal(await page.locator('#beta-test').evaluate(el => el.open), false, 'field test remains opt-in');
    assert.equal(await page.locator('.cat-tabs').isVisible(), true, 'mobile paw navigation shown');
    assert.equal(await page.locator('#start').isDisabled(), true, 'microphone still requires consent');
    assert.equal(await page.locator('#enable-sound').isDisabled(), true, 'audio model still requires microphone');
    assert.equal(await page.locator('#enable-vision').isDisabled(), true, 'vision remains opt-in');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 2, 'no horizontal mobile overflow: ' + overflow);

    await page.locator('#cat-name').fill('团子');
    assert.match(await page.locator('#cat-buddy-label').innerText(), /团子/);
    await page.locator('#cat-keepsake summary').click();
    await page.locator('#cat-note-make').click();
    assert.match(await page.locator('#cat-note-status').innerText(), /先和猫猫物语聊一句/);
    assert.equal(await page.locator('#cat-note-copy').isDisabled(), true, 'cannot copy before a real dialogue');

    await page.locator('#cat-scene').selectOption('door');
    await page.locator('#cat-feeding').selectOption('recent');
    await page.locator('#message-input').fill('团子刚吃过饭，在门口叫');
    await page.locator('#send').click();
    await page.waitForTimeout(350);
    assert.ok(await page.locator('#messages .bubble.user').count() >= 1, 'actual user text is shown');
    await page.locator('#cat-note-make').click();
    const note = await page.locator('#cat-note-text').inputValue();
    assert.match(note, /团子/);
    assert.match(note, /主人刚才说/);
    assert.match(note, /不是猫语翻译/);
    assert.match(note, /门口/);
    assert.equal(await page.locator('#cat-note-copy').isEnabled(), true);
    await page.locator('#cat-note-text').fill(note + '\n（由主人自行补充）');
    assert.match(await page.locator('#cat-note-text').inputValue(), /由主人自行补充/);
    await page.locator('#reset').click();
    assert.equal(await page.locator('#cat-note-text').inputValue(), '', 'reset removes local keepsake');

    await page.locator('#mic-consent').check();
    assert.equal(await page.locator('#start').isEnabled(), true);
    await page.locator('.cat-tabs a[href="#cat-senses"]').click();
    assert.equal(await page.locator('.cat-tabs a[href="#cat-senses"]').getAttribute('aria-current'), 'location');
    assert.deepEqual(errors, [], 'no browser JavaScript errors');
    await context.close();

    const desktop = await browser.newContext({viewport:{width:1280,height:800}});
    const wide = await desktop.newPage();
    await wide.goto(process.env.CAT_TALES_TEST_URL || 'http://127.0.0.1:8765/cat-tales/live/', {waitUntil:'domcontentloaded'});
    assert.equal(await wide.locator('.cat-tabs').isVisible(), false, 'mobile nav does not obscure desktop');
    assert.equal(await wide.locator('#cat-senses').isVisible(), true, 'research controls remain available');
    const desktopOverflow = await wide.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(desktopOverflow <= 2, 'no horizontal desktop overflow: ' + desktopOverflow);
    await desktop.close();
    console.log('CAT_TALES_PAW_UI_PASS: mobile/desktop layout, cat name, opt-in note, clear, consent, preserved sensing');
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });