// AI Online public client: fixed reviewed pure-data assets; no subscription, account or payment.
// Inspect this file before running. Node 24+, no dependency installation.
const configUrl='https://yl124915300-dot.github.io/ai-online-market-trial/client-config.json';
import {requestPublic} from './client-http.mjs';
const config=await (await requestPublic(configUrl,{timeoutMs:10000})).json();
if(!config.baseUrl)throw Error('Hosted sandbox is not deployed; use the browser local demo or source package.');
const base=new URL(config.baseUrl);if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('Credential-free HTTPS endpoint required');
async function post(path,data){const response=await requestPublic(new URL(path,base),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});const r=await response.json();if(!response.ok)throw Error(JSON.stringify(r));return r;}
if(process.argv.includes('--stdio')){
 const {createInterface}=await import('node:readline');let version='2025-11-25';
 for await(const line of createInterface({input:process.stdin,crlfDelay:Infinity})){
  if(!line.trim())continue;let message;
  try{if(Buffer.byteLength(line)>65536)throw Error('Input limit');message=JSON.parse(line);const response=await requestPublic(new URL('/mcp',base),{method:'POST',headers:{'content-type':'application/json',accept:'application/json, text/event-stream','mcp-protocol-version':version},body:line});
   if(response.status===202)continue;const raw=await response.text();let data;try{data=JSON.parse(raw);}catch{const payloads=raw.split(/\r?\n\r?\n/).map(event=>event.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n')).filter(Boolean);const parsed=payloads.map(text=>{try{return JSON.parse(text);}catch{return null;}}).filter(Boolean);data=parsed.find(x=>x.id===message.id)||parsed.at(-1);if(!data)throw Error('HTTP '+response.status+' returned no MCP response');}if(message.method==='initialize'&&data.result?.protocolVersion)version=data.result.protocolVersion;
   process.stdout.write(JSON.stringify(data)+'\n');
  }catch(e){process.stderr.write('Bridge '+String(message?.method||'parse')+': '+e.message+'\n');if(message&&Object.hasOwn(message,'id'))process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,error:{code:-32000,message:'Sandbox connection or request failed'}})+'\n');}
 }
}else{
 const input={rows:[{region:'north',visits:'2',note:'PUBLIC_FIXTURE'},{region:'north',visits:3},{region:'south',visits:1}]};
 const match=await post('/match',{inputFields:['region','visits'],outputFields:['region','total']});
 if(match.selected!=='minimized-summary-v1')throw Error('Published contract no longer matches this fixture');
 const result=await post('/execute',{assetId:match.selected,input,requestId:crypto.randomUUID(),publicOrFabricatedInputConfirmed:true});
 if(!result.ok)throw Error(JSON.stringify(result));
 const feedback=await post('/feedback',{executionId:result.executionId,feedbackToken:result.receipt.feedbackToken,outcome:'useful',reasonCode:'works'});
 const {receipt,...safeResult}=result;console.log(JSON.stringify({match,result:safeResult,feedback,evidenceCategory:'caller self-check; independence must be separately verified'},null,2));
}
