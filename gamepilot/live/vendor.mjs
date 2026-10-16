import {cp,mkdir,writeFile,readdir,readFile} from "node:fs/promises";
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

for(const name of ["tesseract.js","tesseract.js-core","@tesseract.js-data/eng","@tesseract.js-data/chi_sim"]) {
 const source=new URL("node_modules/"+name+"/",import.meta.url);
 const legal=new URL("licenses/"+name.replaceAll("/","_")+"/",dest);await mkdir(legal,{recursive:true});
 for(const file of await readdir(source)) {
  if(/^(license|copying|notice|readme)/i.test(file))await cp(new URL(file,source),new URL(file,legal),{recursive:true});
 }
 const pkg=JSON.parse(await readFile(new URL("package.json",source),"utf8"));
 await writeFile(new URL("package-notice.json",legal),JSON.stringify({name:pkg.name,version:pkg.version,license:pkg.license,repository:pkg.repository},null,2));
}
