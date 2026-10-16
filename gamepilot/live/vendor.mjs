import {cp,mkdir,writeFile} from "node:fs/promises";
const dest=new URL("./vendor/",import.meta.url);
await mkdir(dest,{recursive:true});
for(const [from,to] of [
 ["node_modules/tesseract.js/dist","tesseract"],
 ["node_modules/tesseract.js-core","core"],
 ["node_modules/@tesseract.js-data/eng/4.0.0_best_int","lang"],
 ["node_modules/@tesseract.js-data/chi_sim/4.0.0_best_int","lang"]]) {
 await cp(new URL(from,import.meta.url),new URL(to,dest),{recursive:true});
}
await writeFile(new URL("VERSIONS.json",dest),JSON.stringify({tesseract:"7.0.0",core:"7.0.0",eng:"1.0.0",chi_sim:"1.0.0"}));
