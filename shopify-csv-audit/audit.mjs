// Pure client-side Shopify CSV inspection. No upload or external requests.
const names = {
  handle: ["URL handle", "Handle"],
  title: ["Title"],
  description: ["Description", "Body (HTML)"],
  image: ["Product image URL", "Image Src"],
  sku: ["SKU", "Variant SKU"],
  price: ["Price", "Variant Price"],
  compare: ["Compare At Price", "Variant Compare At Price"],
  option1Name: ["Option1 name", "Option1 Name"],
  option1Value: ["Option1 value", "Option1 Value"]
};

export function parseCSV(input) {
  if (typeof input !== "string") throw new Error("Provide CSV text.");
  const text = input.replace(/^\uFEFF/, "");
  let fields = [], field = "", records = [], quoted = false, afterQuote = false, atStart = true;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; afterQuote = true; }
      else { field += ch; }
      continue;
    }
    if (ch === '"' && atStart) { quoted = true; atStart = false; continue; }
    if (ch === '"') throw new Error("Unexpected quote near character " + (i + 1) + ".");
    if (afterQuote && ch !== ',' && ch !== '\n' && ch !== '\r' && ch !== ' ' && ch !== '\t')
      throw new Error("Unexpected character after quoted cell near character " + (i + 1) + ".");
    if ((ch === ' ' || ch === '\t') && afterQuote) continue;
    if (ch === ',' || ch === '\n' || ch === '\r') {
      fields.push(field);
      field = ""; atStart = true; afterQuote = false;
      if (ch !== ',') {
        if (ch === '\r' && next === '\n') i++;
        if (fields.some(x => x.trim() !== "")) records.push(fields);
        fields = [];
      }
    } else { field += ch; atStart = false; }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted cell.");
  if (fields.length || field) {
    fields.push(field);
    if (fields.some(x => x.trim() !== "")) records.push(fields);
  }
  if (!records.length) throw new Error("CSV is empty.");
  const headers = records.shift().map(x => x.trim());
  if (!headers.length || !headers.some(Boolean)) throw new Error("CSV has no headers.");
  if (new Set(headers.map(h => h.toLowerCase())).size !== headers.length)
    throw new Error("CSV contains duplicated column names.");
  return {headers, rows: records.map((values, index) => {
    if (values.length !== headers.length)
      throw new Error("Data record " + (index + 2) + " has " + values.length + " cells; expected " + headers.length + ".");
    return Object.fromEntries(headers.map((h, j) => [h, values[j]]));
  })};
}

function present(headers, options) {
  return options.find(x => headers.includes(x)) || null;
}
function clip(text, n = 110) { return String(text ?? "").trim().slice(0, n); }
function nval(text) {
  const t = String(text ?? "").trim();
  return t !== "" && /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(t) ? Number(t) : null;
}

export function inspectShopifyCSV(parsed) {
  const {headers, rows} = parsed;
  const cols = Object.fromEntries(Object.entries(names).map(([k, aliases]) => [k, present(headers, aliases)]));
  const issues = [];
  const add = (severity, line, handle, field, observed, advice) => issues.push({
    severity, line, product: handle || "(unknown)", field, observed: clip(observed), advice
  });
  if (!cols.title) add("critical", 1, "", "Title", "(column missing)", "Shopify product CSV requires a Title column for new products and updates.");
  if (!cols.handle) add("critical", 1, "", "URL handle / Handle", "(column missing)", "A handle is required when updating products and when using variants. Export the official Shopify CSV.");
  if (rows.length > 5000) throw new Error("Maximum 5,000 CSV records per local scan.");
  const products = new Map(), skus = new Map();
  let variantRows = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], line = i + 2;
    const handle = cols.handle ? clip(row[cols.handle], 240) : "";
    const title = cols.title ? clip(row[cols.title], 400) : "";
    const priceRaw = cols.price ? clip(row[cols.price], 80) : "";
    const sku = cols.sku ? clip(row[cols.sku], 180) : "";
    const image = cols.image ? clip(row[cols.image], 500) : "";
    if (cols.handle && !handle)
      add("critical", line, "", cols.handle, "(blank)", "A record without a product handle may not associate with the intended product or variant.");
    if (handle) {
      if (!products.has(handle)) products.set(handle, {first:line, title:"", description:"", hasImage:false, rows:0});
      const p = products.get(handle);
      p.rows++;
      if (title) p.title = title;
      if (cols.description && clip(row[cols.description])) p.description = clip(row[cols.description]);
      if (image) p.hasImage = true;
    }
    const hasVariant = Boolean(sku || priceRaw || (cols.option1Value && clip(row[cols.option1Value])));
    if (hasVariant) variantRows++;
    if (hasVariant && cols.price && priceRaw && nval(priceRaw) === null)
      add("high", line, handle, cols.price, priceRaw, "Check Shopify's numeric price format. Do not import currency symbols or negative values.");
    const compareRaw = cols.compare ? clip(row[cols.compare], 80) : "";
    if (compareRaw && nval(compareRaw) === null)
      add("medium", line, handle, cols.compare, compareRaw, "Compare-at price should be a non-negative number or empty.");
    if (priceRaw && compareRaw && nval(priceRaw) !== null && nval(compareRaw) !== null && nval(compareRaw) < nval(priceRaw))
      add("medium", line, handle, cols.compare, compareRaw, "Compare-at price is below selling price; confirm whether this is intended.");
    if (sku) {
      const prev = skus.get(sku);
      if (prev && prev.handle !== handle)
        add("medium", line, handle, cols.sku, sku, "This SKU also appears on record " + prev.line + " for a different handle. Confirm SKU uniqueness for fulfillment.");
      else if (!prev) skus.set(sku, {handle, line});
    }
    if (image && !/^https?:\/\/\S+/i.test(image))
      add("medium", line, handle, cols.image, image, "Check that the image URL is a usable absolute HTTP(S) address.");
  }
  for (const [handle, p] of products) {
    if (!p.title) add("high", p.first, handle, cols.title || "Title", "(blank across handle)", "Product title was not found on any associated record.");
    if (cols.description && !p.description)
      add("medium", p.first, handle, cols.description, "(blank across handle)", "Draft a verified description using actual product facts; blank variant rows alone are normal.");
    if (cols.image && !p.hasImage)
      add("medium", p.first, handle, cols.image, "(blank across handle)", "Review whether this product needs a usable main image.");
  }
  issues.sort((a,b) => ({critical:0, high:1, medium:2, low:3}[a.severity] - {critical:0, high:1, medium:2, low:3}[b.severity]) || a.line - b.line);
  return {
    summary: {records:rows.length, products:products.size, variantRows, findings:issues.length,
      critical:issues.filter(x=>x.severity==="critical").length, high:issues.filter(x=>x.severity==="high").length,
      medium:issues.filter(x=>x.severity==="medium").length},
    columns:cols, issues
  };
}
function cell(text) { const s = String(text ?? ""); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s; }
export function exportFindings(issues) {
  const cols = ["severity","line","product","field","observed","advice"];
  return "\uFEFF" + [cols.join(","), ...issues.map(i => cols.map(c=>cell(i[c])).join(","))].join("\r\n") + "\r\n";
}
