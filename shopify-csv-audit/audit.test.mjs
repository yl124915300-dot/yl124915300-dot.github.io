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
  const v = audit("Handle,Title,Body (HTML),Variant SKU,Variant Price,Image Src\nbag,Bag,Verified detail,ABC,29,https://example.com/a.jpg\nbag,,,ABD,31,\n");
  assert.equal(v.summary.products,1); assert.equal(v.summary.variantRows,2); assert.equal(v.summary.findings,0);
});
test("image-only rows are not variants", () => {
  const v = audit("Handle,Title,Body (HTML),Variant SKU,Variant Price,Image Src\nbag,Bag,Verified,ABC,29,https://example.com/a.jpg\nbag,,,,,https://example.com/b.jpg\n");
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
console.log("Tests passed:", passed);
