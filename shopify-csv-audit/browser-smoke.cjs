const assert = require("node:assert/strict");
const fs = require("node:fs");
const {chromium} = require("playwright");
(async () => {
  const browser = await chromium.launch({headless: true});
  try {
    for (const mobile of [false, true]) {
      const page = await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:850},acceptDownloads:true});
      const errors=[],outbound=[];
      page.on("pageerror", e=>errors.push(e.message));
      page.on("request", req=>{
        if (!req.url().startsWith("http://127.0.0.1:8765/")) outbound.push(req.url());
      });
      const response=await page.goto("http://127.0.0.1:8765/shopify-csv-audit/",{waitUntil:"networkidle"});
      assert.equal(response.status(),200);
      await page.click("#demo");
      await page.waitForSelector('#results:not([hidden])');
      const count=Number(await page.locator("#findings").textContent());
      assert.ok(count>=3,"Sample catalog should show concrete issues");
      assert.ok((await page.locator("#issue-list").innerText()).includes("Option1 name"),"Variant risk rule not shown");
      let href=await page.locator("#results-enquiry").getAttribute("href");
      assert.ok(href.startsWith("mailto:yl124915300@gmail.com?subject="));
      assert.ok(href.includes("Catalog%20Check%20-%20merchant%20pilot%20enquiry"));
      assert.ok(href.includes("products%20or%20IDs"));
      // Client-side input; no upload or merchant-admin request.
      const content = "URL handle,Title,Option1 name,Option1 value,SKU,Price,Compare-at price,Product image URL\nshirt,Shirt,Size,M,A,20,30,https://example.com/a.png\nshirt,,,L,B,25,35,\n";
      await page.locator("#input").setInputFiles({name:"test.csv",mimeType:"text/csv",buffer:Buffer.from(content)});
      assert.equal(await page.locator("#findings").innerText(),"0","Valid variant rows should not be flagged");
      assert.ok((await page.locator("#issue-list").innerText()).includes("No flagged issues"));
      const bad = "URL handle,Title,SKU,Price,Compare-at price\nshirt,Shirt,A,20,10\n";
      await page.locator("#input").setInputFiles({name:"broken.csv",mimeType:"text/csv",buffer:Buffer.from(bad)});
      const items=await page.locator("#issue-list").innerText();
      assert.ok(items.includes("Option1 name"));
      assert.ok(items.includes("Compare-at price"));
      const downloadPromise=page.waitForEvent("download");
      await page.click("#download");
      const download=await downloadPromise;
      const path=await download.path();
      assert.ok(fs.readFileSync(path,"utf8").includes("Option1 name"));
      // Native OpenAI product-feed mode must parse locally and flag specific errors.
      await page.locator("#format").selectOption("openai");
      await page.click("#demo");
      assert.equal(await page.locator("#findings").innerText(),"0","OpenAI sample must be valid");
      const openAIHeaders="item_id,title,description,url,brand,seller_name,image_url,availability,price,target_countries,store_country";
      const openAIBad='test-mug,Test Mug,Plain mug,https://example.com/mug,Maker,Shop,https://example.com/a.jpg,in stock,$18,"[""US""]",US';
      await page.locator("#input").setInputFiles({name:"openai-errors.csv",mimeType:"text/csv",buffer:Buffer.from([openAIHeaders,openAIBad].join(String.fromCharCode(10))+String.fromCharCode(10))});
      await page.waitForFunction(()=>Number(document.querySelector("#findings")?.textContent || 0)>=2,{timeout:10000});
      assert.ok(Number(await page.locator("#findings").innerText())>=2);
      assert.ok((await page.locator("#issue-list").innerText()).includes("availability"));
      assert.ok((await page.locator("#issue-list").innerText()).includes("price"));
      assert.ok((await page.locator("#results-enquiry").getAttribute("href")).includes("US%2449"));
      const tooWide=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
      assert.equal(tooWide,false,"Page should not overflow viewport width");
      assert.deepEqual(errors,[],"No runtime JS errors");
      assert.deepEqual(outbound,[],"No network requests outside local static files");
      await page.goto("http://127.0.0.1:8765/shopify-csv-audit/variant-deletion-risk/");
      assert.ok((await page.locator("h1").innerText()).includes("delete your variants"));
      await page.goto("http://127.0.0.1:8765/shopify-csv-audit/import-errors/");
      assert.ok((await page.locator("h1").innerText()).includes("CSV import errors"));
      await page.close();
      console.log("BROWSER_PASS", mobile ? "mobile 390" : "desktop 1280", "local scan, CTA, CSV download, guide pages, privacy");
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
