// Fixed AI Online endpoints only. One HTTP request; address fallback happens before sending it.
import https from 'node:https';
import {boundedPublicLookup} from './bounded-public-dns.mjs';
const origin='https://ai-online-liquidity.yl124915300.workers.dev';
const config='https://yl124915300-dot.github.io/ai-online-market-trial/client-config.json';
const reads=new Set(['/assets','/health','/logs','/metrics']);
const posts=new Set(['/mcp','/match','/execute','/feedback']);
export async function requestPublic(value,{method='GET',body,headers={},timeoutMs=15000}={}){
 const u=new URL(value),valid=u.href===config&&method==='GET'||u.origin===origin&&(method==='GET'&&reads.has(u.pathname)||method==='POST'&&posts.has(u.pathname));
 if(!valid||u.username||u.password||u.search||u.hash)throw Error('FIXED_TARGET_REQUIRED');
 if(u.href===config&&Object.keys(headers).some(k=>/authorization|cookie/i.test(k)))throw Error('CREDENTIAL_FORWARD_DENIED');
 const signal=AbortSignal.timeout(Math.max(1,Math.min(timeoutMs,15000)));
 const addresses=await boundedPublicLookup(u.hostname,{signal}),p=addresses.find(a=>a.family===4)||addresses[0];
 const bytes=body===undefined?undefined:Buffer.from(body);if(bytes?.length>65536)throw Error('REQUEST_LIMIT');
 return new Promise((resolve,reject)=>{
  const req=https.request(u,{method,signal,autoSelectFamily:true,autoSelectFamilyAttemptTimeout:250,headers:{accept:'application/json, text/event-stream',...headers,...(bytes?{'content-length':bytes.length}:{})},lookup:(_,opts,cb)=>opts.all?cb(null,addresses):cb(null,p.address,p.family)},res=>{
   if(res.statusCode>=300&&res.statusCode<400){res.resume();req.destroy(Error('REDIRECT_DENIED'));return;}
   let n=0,b=[];res.on('data',x=>{n+=x.length;if(n>196608){req.destroy(Error('RESPONSE_LIMIT'));return;}b.push(x)});
   res.on('error',reject);res.on('end',()=>{const raw=Buffer.concat(b).toString('utf8');resolve({status:res.statusCode,ok:res.statusCode>=200&&res.statusCode<300,text:async()=>raw,json:async()=>JSON.parse(raw),headers:new Headers(res.headers)});});
  });req.on('error',reject);req.end(bytes);
 });
}
