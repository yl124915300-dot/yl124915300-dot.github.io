import assert from "node:assert/strict";
import {parseCSV, inspectShopifyCSV, exportFindings} from "./audit.mjs";
function audit(csv) { return inspectShopifyCSV(parseCSV(csv)); }
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("PASS " + name); }
test("quoted commas and embedded newline", () => {
  const v = parseCSV('Handle,Title,Body (HTML)\nabc,"T, One","Line 1\nLine 2"\n');
  assert.equal(v.rows.length,1); assert.equal(v.rows[0].Title,"T, One"); assert.equal(v.rows[0]["Body (HTML)"],"Line 1\nLine 2");
});
test("variant rows with blank title are not flagged", () => {
  const v = audit("Handle,Title,Body (HTML),Option1 Name,Option1 Value,Variant SKU,Variant Price,Image Src\nbag,Bag,Verified detail,Color,Black,ABC,29,https://example.com/a.jpg\nbag,,,,White,ABD,31,\n");
  assert.equal(v.summary.products,1); assert.equal(v.summary.variantRows,2); assert.equal(v.summary.findings,0);
});
test("image-only rows are not variants", () => {
  const v = audit("Handle,Title,Body (HTML),Option1 Name,Option1 Value,Variant SKU,Variant Price,Image Src\nbag,Bag,Verified,Color,Black,ABC,29,https://example.com/a.jpg\nbag,,,,,,,https://example.com/b.jpg\n");
  assert.equal(v.summary.variantRows,1); assert.equal(v.summary.findings,0);
});
test("missing title and description grouped by handle", () => {
  const v = audit("Handle,Title,Body (HTML),Variant Price,Image Src\nblank,,,30,\n");
  assert.ok(v.issues.some(x=>x.field==="Title" && x.severity==="high"));
  assert.ok(v.issues.some(x=>x.field==="Body (HTML)"));
  assert.ok(v.issues.some(x=>x.field==="Image Src"));
});
test("duplicate SKUs across products", () => {
  const v = audit("Handle,Title,Variant SKU,Variant Price\na,A,S1,20\nb,B,S1,15\n");
  assert.ok(v.issues.some(x=>x.field==="Variant SKU"));
});
test("price validation and compare-at check", () => {
  const v = audit("Handle,Title,Variant Price,Variant Compare At Price\np,P,$12,10\nq,Q,20,10\n");
  assert.ok(v.issues.some(x=>x.severity==="high" && x.field==="Variant Price"));
  assert.ok(v.issues.some(x=>x.field==="Variant Compare At Price"));
});
test("malformed CSV fails closed", () => {
  assert.throws(()=>parseCSV('Handle,Title\na,"unclosed'),/unclosed/);
  assert.throws(()=>parseCSV('Handle,Title\na,B,C'),/3 cells/);
});
test("exports safe escaping and Unicode", () => {
  const csv=exportFindings([{severity:"medium",line:2,product:"a,b",field:"Title",observed:'"引号"',advice:"Review"}]);
  assert.ok(csv.startsWith("\uFEFF")); assert.ok(csv.includes('"a,b"')); assert.ok(csv.includes('"""引号"""'));
});
test("2026 current Shopify compare-at price header is recognized", () => {
  const v = audit("URL handle,Title,Option1 name,Option1 value,Price,Compare-at price\np,Product,Title,Default Title,20,12\n");
  assert.equal(v.columns.compare,"Compare-at price");
  assert.ok(v.issues.some(x=>x.field==="Compare-at price"));
});
test("SKU without Option1 name/value flags destructive overwrite risk", () => {
  const v=audit("URL handle,Title,SKU,Price\nshirt,Shirt,AAA,10\n");
  assert.ok(v.issues.some(x=>x.severity==="critical" && x.field.includes("Option1 name")));
  assert.ok(v.issues.some(x=>x.advice.includes("may delete or replace variants")));
});
test("no misleading missing-columns warning for valid option headers", () => {
  const v=audit("URL handle,Title,Option1 name,Option1 value,SKU,Price\nshirt,Shirt,Size,M,AAA,10\n");
  assert.ok(!v.issues.some(x=>x.field.includes("Option1 name") && x.severity==="critical"));
});
test("duplicate variant combinations within handle detected", () => {
  const v=audit("Handle,Title,Option1 Name,Option1 Value,Variant SKU,Variant Price\nshirt,Shirt,Size,M,A,20\nshirt,,,M,B,21\n");
  assert.ok(v.issues.some(x=>x.field==="Option values" && x.severity==="high"));
});
test("different option values are not duplicate variants", () => {
  const v=audit("Handle,Title,Option1 Name,Option1 Value,Variant SKU,Variant Price\nshirt,Shirt,Size,M,A,20\nshirt,,,L,B,21\n");
  assert.ok(!v.issues.some(x=>x.field==="Option values"));
});
test("findings CSV escapes spreadsheet formulas", () => {
  const data = exportFindings([{severity:"medium",line:2,product:"=HYPERLINK(1)",field:"Title",observed:"+cmd",advice:"Review"}]);
  assert.ok(data.includes("'=HYPERLINK(1)"));
  assert.ok(data.includes("'+cmd"));
});
test("current inventory-only header warns about missing option identity", () => {
  const v=audit("URL handle,Title,Inventory quantity\nshirt,Shirt,5\n");
  assert.ok(v.issues.some(x=>x.severity==="critical" && x.field.includes("Option1 name")));
});
test("legacy quantity column warns about missing option identity", () => {
  const v=audit("Handle,Title,Variant Inventory Qty\nshirt,Shirt,5\n");
  assert.ok(v.issues.some(x=>x.severity==="critical" && x.field.includes("Option1 name")));
});
console.log("Tests passed:", passed);
