/* FrameFind pre-breakout comparison: sourced dated snapshot, not live inventory or affiliate content.
 * Dynamic controls deliberately avoid inventing prices or exact-SKU equivalence.
 */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const feed='/video-find/prebreakout/heated-throw-us-2026-10.json';
const allowedHosts=new Set(['www.walmart.com','walmart.com','bedsurehome.com','www.bedsurehome.com']);
let data=null;
let shown=[];
let filtered=false;
function elem(tag,text,cls){
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(text!==undefined)e.textContent=String(text);
 return e;
}
function sourceUrl(raw){
 try{const u=new URL(raw);return u.protocol==='https:'&&allowedHosts.has(u.hostname)?u.href:null;}
 catch(e){return null;}
}
function options(){
 return {budget:Number($('budget-max').value)||50,preheat:$('needs-preheat').checked,
  long:$('needs-long').checked,official:$('official-only').checked};
}
function matching(s,filter){
 return s.observedPriceUSD<=filter.budget &&
  (!filter.preheat||s.preheat)&&(!filter.long||s.autoOffHours>=4) &&
  (!filter.official||s.source==='Bedsure official storefront');
}
function render({userInitiated=false}={}){
 if(!data)return;
 filtered=filtered||userInitiated;
 const opt=options();
 shown=data.sellers.filter(s=>matching(s,opt)&&sourceUrl(s.url)).sort((a,b)=>a.observedPriceUSD-b.observedPriceUSD);
 const target=$('pilot-results');target.replaceChildren();
 $('compare-status').textContent=shown.length+' of '+data.sellers.length+
  ' documented offers match your filters · prices observed '+data.asOf+
  ' · retailer checkout may differ';
 if(userInitiated&&shown.length){
   window.FrameFindFunnel?.emit('product_search',{channel:'unknown',valid:true});
 }
 if(!shown.length){
  const card=elem('article',undefined,'pilot-card');
  card.append(elem('h3','No listed model matches all those choices.'));
  card.append(elem('p','Try a larger budget or remove a filter. Do not assume an unavailable feature is present in another color/size.','small'));
  target.append(card);return;
 }
 for(const s of shown){
  const card=elem('article',undefined,'pilot-card');
  const label=elem('div',s.brand.toUpperCase(),'brand');card.append(label);
  card.append(elem('h3',s.title));
  const price=elem('div','$'+Number(s.observedPriceUSD).toFixed(2),'price');
  price.append(elem('span','  · shown Oct 26, not live','small'));
  card.append(price);
  card.append(elem('div',s.size+' · '+s.material,'detail'));
  card.append(elem('div',s.heatLevels+' heat levels · '+s.autoOffHours+'h default auto-off','detail'));
  card.append(elem('div',s.preheat?'Separate preheat feature listed':'Preheat not confirmed','detail'));
  card.append(elem('div','Certification listed: '+s.claimCertification,'detail'));
  card.append(elem('p',s.sellerDescription,'small'));
  card.append(elem('p',s.notes,'small'));
  const url=sourceUrl(s.url);
  const link=elem('a','Open '+s.source+' product page →','outbound');
  link.href=url;link.target='_blank';link.rel='noopener noreferrer nofollow';
  link.dataset.merchant=s.source==='Bedsure official storefront'?'bedsure':'walmart';
  link.addEventListener('click',()=>{
   // The merchant opening is the consumer's direct, explicit action.
   window.FrameFindFunnel?.emit('item_selected',{channel:'unknown',userChosen:true});
   window.FrameFindFunnel?.emit('product_search',{channel:'unknown',valid:true});
   window.FrameFindFunnel?.emit('merchant_outbound',{channel:'unknown',merchant:link.dataset.merchant==='walmart'?'walmart':'bedsure'});
  });
  card.append(link);target.append(card);
 }
}
async function load(){
 try{
  const response=await fetch(feed,{cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const object=await response.json();
  if(object.schema!=='framefind-prebreakout-v1'||!Array.isArray(object.sellers)||object.sellers.length<2)
   throw Error('Catalog unavailable or unexpected version');
  data=object;render();
 }catch(e){
  $('compare-status').textContent='Source catalog could not load. Do not assume any quote or availability. Please use the general finder instead.';
  const a=elem('a','Open the free FrameFind product finder');
  a.href='/video-find/';$('pilot-results').replaceChildren(a);
 }
}
$('compare-submit').addEventListener('click',()=>render({userInitiated:true}));
for(const id of ['budget-max','needs-preheat','needs-long','official-only'])
 $(id).addEventListener('change',()=>render({userInitiated:true}));
$('video-handoff').addEventListener('submit',event=>{
 event.preventDefault();
 try{
  const str=$('source-video').value.trim();
  const route=new URL('/video-find/',location.origin);
  route.searchParams.set('q','heated throw blanket 50x60');
  route.searchParams.set('utm_source','heated_throw_guide');
  route.searchParams.set('utm_medium','owned_guide');
  route.searchParams.set('utm_campaign','prebreakout_winter');
  if(str){
   const origin=new URL(str);
   if(origin.protocol!=='https:'||origin.username||origin.password||origin.href.length>2048)
    throw Error('Use a public HTTPS video URL without credentials.');
   // User-supplied URL stays in fragment and is scrubbed after the finder reads it.
   route.hash='shared='+encodeURIComponent(origin.href);
   window.FrameFindFunnel?.emit('video_submitted',{channel:'video_link'});
  }
  location.assign(route.href);
 }catch(e){$('stage-status').textContent=String(e.message||'Invalid video URL');}
});
const params=new URLSearchParams(location.search);
if(['35','50','75','150'].includes(params.get('budget')))$('budget-max').value=params.get('budget');
for(const [param,id] of [['preheat','needs-preheat'],['long','needs-long'],['official','official-only']])
 if(params.get(param)==='1')$(id).checked=true;
window.FrameFindHotQA=Object.freeze({
 getState:()=>({loaded:!!data,shown:shown.map(s=>s.id),filtered,budget:options().budget}),
 sourceUrl
});
load();
})();