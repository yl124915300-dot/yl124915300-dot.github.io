/* FrameFind five-step privacy-minimized funnel instrumentation.
 * visit > video_submitted > item_selected > product_search > merchant_outbound.
 * No original video URL, search phrase, frame, IP, or PII is emitted.
 * Server delivery is disabled until an owned collector is actually deployed.
 */
(()=>{
'use strict';
const KEY='framefind:funnel:20261026:v1';
const STAGES=['visit','video_submitted','item_selected','product_search','merchant_outbound'];
const SOURCE_VALUES=new Set(['homepage','user_share','youtube_guide','tiktok_guide','screenshot_guide','model_guide','heated_throw_guide','finder','direct','search','directory','social','referral','other']);
const MEDIUM_VALUES=new Set(['owned_site','owned_guide','referral','organic','directory','social','direct','other']);
const CHANNEL_VALUES=new Set(['video_link','screenshot','local_video','tab_share','demo','unknown']);
const MERCHANT_VALUES=new Set(['google','amazon','ebay','walmart','johnlewis','bedsure','other']);
const PRODUCTION_HOST='yl124915300-dot.github.io';
const allowedEndpoint=/^https:\/\/[a-z0-9.-]+\.workers\.dev\/collect$/i;
const hostname=location.hostname.toLowerCase();
const production=hostname===PRODUCTION_HOST;
const optOut=!!navigator.globalPrivacyControl||navigator.doNotTrack==='1'||window.doNotTrack==='1';
const isQA=!!navigator.webdriver||!production||new URLSearchParams(location.search).has('qa')||location.hash.includes('#qa');
const noTransport=isQA||optOut;
let state=null;let endpoint='';
function day(){return new Date().toISOString().slice(0,10);}
function uuid(){return (crypto.randomUUID?crypto.randomUUID():'qa-'+Math.random().toString(16).slice(2)+'-'+Date.now()).slice(0,70);}
function read(){
 let prev=null;try{prev=JSON.parse(sessionStorage.getItem(KEY)||'null');}catch(e){}
 if(!prev||prev.day!==day()||!prev.sid||typeof prev.steps!=='object')
   return {day:day(),sid:uuid(),source:null,medium:null,steps:{},events:[],isQA};
 return prev;
}
function save(){if(optOut)return;try{sessionStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
function clampEnum(value,set,other='other'){
 const normalized=String(value||'').toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,36);
 return set.has(normalized)?normalized:other;
}
function entry(){
 if(location.pathname==='/')return 'home';
 if(location.pathname==='/video-find/'||location.pathname==='/video-find/index.html')return 'finder';
 return 'guide';
}
function attribution(){
 const p=new URLSearchParams(location.search);
 let source=clampEnum(p.get('utm_source'),SOURCE_VALUES,'');
 let medium=clampEnum(p.get('utm_medium'),MEDIUM_VALUES,'');
 if(!source){
  try{const url=new URL(document.referrer);
   const host=url.hostname.replace(/^www\./,'');
   if(/(^|\.)google\./.test(host)||host==='bing.com'||host==='duckduckgo.com'){source='search';medium='organic';}
   else if(host==='reddit.com'||host==='youtube.com'||host==='tiktok.com'||host==='instagram.com'){source='social';medium='social';}
   else if(host==='aitoolsdir.com'||host==='waildworld.com'||host==='ai41.org'||host==='aitrendtool.com'){source='directory';medium='directory';}
   else if(host===PRODUCTION_HOST){source='homepage';medium='owned_site';}
  }catch(e){}
 }
 return {source:source||'direct',medium:medium||'direct'};
}
function configure(){
 // Must be explicitly deployed to an OWNED Cloudflare Worker beforehand.
 const meta=document.querySelector('meta[name="framefind-event-endpoint"]');
 const value=String(meta?.content||'').trim();
 endpoint=allowedEndpoint.test(value)?value:'';
}
function safeSend(data){
 if(noTransport||!endpoint)return;
 const body=JSON.stringify(data);
 if(body.length>700)return;
 try{
  void fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',keepalive:true,
    headers:{'Content-Type':'application/json'},body}).catch(()=>{});
 }catch(e){}
}
function renderStatus(){
 const steps=(state&&state.steps)||{};
 for(const stage of STAGES){
  const slot=document.querySelector('[data-funnel-stage="'+stage+'"]');
  if(slot)slot.textContent=steps[stage]?'✓':'—';
 }
 const indicator=document.getElementById('funnel-transport-status');
 if(indicator)indicator.textContent=endpoint&&!noTransport?
  'Anonymous event reporting is configured; no original media or search text is transmitted.':
  'Only this browser tab can see these stages; owner-wide analytics is not active.';
}
function emit(stage,options={}){
 if(!STAGES.includes(stage))return false;
 if(!state)state=read();
 if(state.day!==day())state=read();
 const channel=clampEnum(options.channel,CHANNEL_VALUES,'unknown');
 if(channel==='demo')return false;
 if(state.steps[stage])return false;
 if(stage==='merchant_outbound'&&!state.steps.product_search)return false;
 if(stage==='product_search'&&!options.valid)return false;
 if(stage==='item_selected'&&!options.userChosen)return false;
 const attr=attribution();
 if(!state.source){state.source=attr.source;state.medium=attr.medium;}
 const info={v:1,day:state.day,sid:state.sid,stage,
   source:state.source,medium:state.medium,
   entry:entry(),channel,
   merchant:clampEnum(options.merchant,MERCHANT_VALUES,'other')};
 state.steps[stage]=true;
 state.events.push({stage,channel,merchant:info.merchant,at:new Date().toISOString()});
 if(state.events.length>7)state.events=state.events.slice(-7);
 save();
 renderStatus();
 safeSend(info);
 return true;
}
function inspect(){
 if(!state)state=read();
 return Object.freeze({day:state.day,source:state.source||attribution().source,medium:state.medium||attribution().medium,
   qa:isQA,optOut,serverConfigured:!!endpoint,steps:{...state.steps},events:state.events.slice().map(x=>({...x}))});
}
state=read();configure();emit('visit');renderStatus();
window.FrameFindFunnel=Object.freeze({emit,inspect,stages:STAGES.slice()});
})();