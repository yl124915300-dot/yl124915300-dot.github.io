// Local-only, read-only OpenAI Stable product feed preflight.
const REQUIRED=["item_id","title","description","url","brand","seller_name","image_url","availability","price","target_countries","store_country"];
const STOCK=new Set(["in_stock","out_of_stock","pre_order","backorder","unknown"]);
const rank={critical:0,high:1,medium:2};
const trim=x=>String(x??"").trim();
function checkURL(x){try{const u=new URL(trim(x));return ["https:","http:"].includes(u.protocol)&&u.hostname&&!u.username&&!u.password&&!/\s/.test(trim(x));}catch{return false;}}
function checkPrice(x){const m=trim(x).match(/^(\d+(?:\.\d+)?) ([A-Z]{3})$/);if(!m||!(Number(m[1])>0)||!Number.isFinite(Number(m[1])))return false;try{const d=new Intl.NumberFormat("en",{style:"currency",currency:m[2]}).resolvedOptions().maximumFractionDigits;return (m[1].split(".")[1]||"").length<=d;}catch{return false;}}
function checkCountries(x){try{const a=JSON.parse(trim(x));return Array.isArray(a)&&a.length>0&&a.every(v=>typeof v==="string"&&/^[A-Z]{2}$/.test(v));}catch{return false;}}
export function inspectOpenAIProductFeed(parsed){
 const {headers,rows}=parsed;
 if(!Array.isArray(headers)||!Array.isArray(rows))throw Error("Parsed CSV required");
 if(rows.length>5000)throw Error("Maximum 5000 records");
 const issues=[];
 const add=(severity,line,product,field,observed,advice)=>issues.push({severity,line,product:String(product||"(unknown)").slice(0,110),field,observed:String(observed??"").slice(0,110),advice});
 for(const field of REQUIRED)if(!headers.includes(field))add("critical",1,"",field,"(column missing)","Required in OpenAI Stable product feed. Confirm source data.");
 const seen=new Map(),variants=new Map(),groupKeys=new Map();let variantRows=0;
 rows.forEach((row,i)=>{
  const line=i+2,id=trim(row.item_id);
  for(const field of REQUIRED)if(headers.includes(field)&&!trim(row[field]))add("critical",line,id,field,"(empty)","Confirm value with merchant; never invent.");
  if(id){if(seen.has(id))add("high",line,id,"item_id",id,"Duplicate item_id at record "+seen.get(id));else seen.set(id,line);}
  if(trim(row.title).length>150)add("medium",line,id,"title","(over 150 chars)","Review title length against guidance.");
  if(trim(row.description).length>5000)add("medium",line,id,"description","(over 5000 chars)","Review description length.");
  for(const field of ["url","image_url"])if(trim(row[field])&&!checkURL(row[field]))add("high",line,id,field,row[field],"Absolute public HTTP(S) URL required; live reachability not tested.");
  if(trim(row.availability)&&!STOCK.has(trim(row.availability)))add("high",line,id,"availability",row.availability,"Use in_stock, out_of_stock, pre_order, backorder, unknown.");
  if(trim(row.price)&&!checkPrice(row.price))add("high",line,id,"price",row.price,"Use positive amount and currency, e.g. 19.99 USD; do not guess.");
  if(trim(row.target_countries)&&!checkCountries(row.target_countries))add("high",line,id,"target_countries",row.target_countries,'Use JSON country list, e.g. ["US"].');
  if(trim(row.store_country)&&!/^[A-Z]{2}$/.test(trim(row.store_country)))add("high",line,id,"store_country",row.store_country,"Use ISO alpha-2 code.");
  if(trim(row.listing_has_variations)==="true"){
   variantRows++;const group=trim(row.group_id);
   if(!group||group===id)add("high",line,id,"group_id",group,"Variant group ID must be nonempty and differ from item ID.");
   let opt;try{opt=JSON.parse(row.variant_dict);}catch{}
   if(!opt||typeof opt!=="object"||Array.isArray(opt)||!Object.keys(opt).length||!Object.entries(opt).every(([k,v])=>trim(k)&&typeof v==="string"&&trim(v)))add("high",line,id,"variant_dict",row.variant_dict,"Valid JSON option object required.");
   else if(group){const keys=Object.keys(opt).sort().join("|"),sig=group+"|"+JSON.stringify(Object.entries(opt).sort());if(groupKeys.has(group)&&groupKeys.get(group)!==keys)add("medium",line,id,"variant_dict",row.variant_dict,"Inconsistent option names within group.");else groupKeys.set(group,keys);if(variants.has(sig))add("high",line,id,"variant_dict",row.variant_dict,"Duplicate combination at record "+variants.get(sig));else variants.set(sig,line);}
  }else if(trim(row.listing_has_variations)&&!["true","false"].includes(trim(row.listing_has_variations)))add("medium",line,id,"listing_has_variations",row.listing_has_variations,"Use true or false.");
 });
 issues.sort((a,b)=>rank[a.severity]-rank[b.severity]||a.line-b.line);
 return {summary:{records:rows.length,products:seen.size,variantRows,findings:issues.length,critical:issues.filter(x=>x.severity==="critical").length,high:issues.filter(x=>x.severity==="high").length,medium:issues.filter(x=>x.severity==="medium").length},issues,disclaimer:"Static preflight only. No import, recommendation, eligibility, website or checkout guarantee."};
}
