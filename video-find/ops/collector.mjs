/* Deploy-ready first-party FrameFind five-step event collector, NOT deployed by this repo.
 * Cloudflare Workers + user's OWN existing D1 account/binding, no public event read access.
 * No raw video/image/search text, IP, user-agent, emails, query strings or referrer stored.
 */
const ORIGIN='https://yl124915300-dot.github.io';
const STAGES=new Set(['visit','video_submitted','item_selected','product_search','merchant_outbound']);
const CHANNELS=new Set(['video_link','screenshot','local_video','tab_share','unknown']);
const MERCHANTS=new Set(['google','amazon','ebay','walmart','johnlewis','bedsure','other']);
const SOURCES=new Set(['homepage','user_share','youtube_guide','tiktok_guide','screenshot_guide','model_guide','heated_throw_guide','finder','direct','search','directory','social','referral','other']);
const MEDIUMS=new Set(['owned_site','owned_guide','referral','organic','directory','social','direct','other']);
const ENTRIES=new Set(['home','finder','guide']);
const SAFE_KEYS=new Set(['v','day','sid','stage','source','medium','entry','channel','merchant']);
function headers(origin){
 const h={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
 if(origin===ORIGIN){
  h['Access-Control-Allow-Origin']=ORIGIN;
  h['Access-Control-Allow-Methods']='POST,OPTIONS';
  h['Access-Control-Allow-Headers']='Content-Type';
  h['Access-Control-Max-Age']='600';
 }
 return h;
}
function response(body,status=200,origin=null){
 return new Response(JSON.stringify(body),{status,headers:headers(origin)});
}
const valid=(x,set)=>typeof x==='string'&&set.has(x);
function validate(input,now){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 if(Object.keys(input).some(k=>!SAFE_KEYS.has(k)))return null;
 if(input.v!==1 || !valid(input.stage,STAGES) || !valid(input.source,SOURCES) ||
    !valid(input.medium,MEDIUMS)||!valid(input.entry,ENTRIES)||
    !valid(input.channel,new Set([...CHANNELS,'demo']))||
    !valid(input.merchant,MERCHANTS))return null;
 if(input.channel==='demo')return null;
 if(typeof input.sid!=='string'||!(/^[a-f0-9-]{36}$/i.test(input.sid)))return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input.day)||Math.abs(Date.parse(input.day+'T00:00:00Z')-now)>172800000)return null;
 // Prevent impossible leakage by not accepting extra fields or user-supplied URL/text.
 if(input.stage==='merchant_outbound'&&input.merchant==='other')return null;
 return input;
}
async function digest(day,sid,salt){
 const material=new TextEncoder().encode(day+':'+sid+':'+salt);
 const hash=await crypto.subtle.digest('SHA-256',material);
 return Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('');
}
async function fetchEvent(request,env){
 const origin=request.headers.get('Origin')||'';
 const url=new URL(request.url);
 if(request.method==='OPTIONS'){
  if(url.pathname!=='/collect'||origin!==ORIGIN)return response({error:'forbidden'},403,origin);
  return new Response(null,{status:204,headers:headers(origin)});
 }
 if(request.method==='GET'&&url.pathname==='/health'){
  return response({ok:!!env.DB,collector:'FrameFind',live:!!env.DB&&!!env.HMAC_SALT});
 }
 if(request.method==='GET'&&url.pathname==='/stats'){
  if(!env.DB||!env.ADMIN_TOKEN)return response({error:'unconfigured'},503);
  if(request.headers.get('Authorization')!=='Bearer '+env.ADMIN_TOKEN)return response({error:'unauthorized'},401);
  const days=Math.max(1,Math.min(30,Number(url.searchParams.get('days'))||7));
  const start=new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10);
  const rows=await env.DB.prepare(
    'SELECT day,source,medium,stage,COUNT(*) AS sessions FROM framefind_events WHERE day >= ? GROUP BY day,source,medium,stage ORDER BY day,source,stage'
  ).bind(start).all();
  return response({meaning:'distinct anonymous browser sessions per stage, not verified independent humans, sales or payouts',from:start,rows:rows.results||[]});
 }
 if(request.method!=='POST'||url.pathname!=='/collect')return response({error:'not_found'},404);
 if(origin!==ORIGIN)return response({error:'forbidden'},403);
 if(!env.DB||!env.HMAC_SALT)return response({error:'unconfigured'},503,origin);
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return response({error:'invalid_type'},415,origin);
 if(Number(request.headers.get('Content-Length'))>800)return response({error:'too_large'},413,origin);
 const agent=request.headers.get('User-Agent')||'';
 if(/bot|crawler|spider|headless|playwright|lighthouse|pagespeed/i.test(agent))return response({ignored:'automated'},202,origin);
 let text='';
 try{text=await request.text();}catch(e){return response({error:'read_error'},400,origin);}
 if(text.length>800)return response({error:'too_large'},413,origin);
 let data;try{data=JSON.parse(text);}catch(e){return response({error:'invalid_json'},400,origin);}
 const good=validate(data,Date.now());
 if(!good)return response({error:'invalid_event'},400,origin);
 const d=new Date().toISOString().slice(0,10);
 const sidHash=await digest(d,good.sid,env.HMAC_SALT);
 await env.DB.prepare('INSERT OR IGNORE INTO framefind_events(day,sid_hash,stage,source,medium,entry,channel,merchant) VALUES(?,?,?,?,?,?,?,?)')
 .bind(d,sidHash,good.stage,good.source,good.medium,good.entry,good.channel,good.merchant).run();
 return response({accepted:true},202,origin);
}
export default {fetch:fetchEvent};
export const testable={validate,digest,fetchEvent};