// Public test client. It invokes no paid model, remote candidate, private file, or financial action.
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
const endpoint=process.argv[2];if(!endpoint)throw Error('Pass the current published HTTPS /mcp URL');const u=new URL(endpoint);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Credential-free HTTPS required');
const c=new Client({name:'AI Online trial client; Owner independence not inferred',version:'0.2.0'},{versionNegotiation:{mode:'auto'}});
await c.connect(new StreamableHTTPClientTransport(u));
const call=async(name,args)=>{const r=await c.callTool({name,arguments:args});const d=r.structuredContent||JSON.parse(r.content[0].text);if(r.isError)throw Error(JSON.stringify(d));return d;};
const agents=await call('market_executable_agents',{});const matches=await call('market_match',{needs:['gate_rows','project_rows']});const assets=await call('market_assets',{});const found=assets.assets.find(a=>a.id==='notice-readiness-v2');if(!found)throw Error('No reviewed notice-readiness-v2 asset currently available');const asset=await call('market_get_asset',{id:found.id});
const result=await call('market_execute_asset',{assetId:asset.id,input:{now:'2026-10-13T00:00:00Z',rows:[{id:'fabricated-client-example',source:'https://example.org/fabricated',version:1,approved:1,expiry:'2026-10-20T00:00:00Z',sourceAvailable:false,translationReviewed:true}]},publicOrFabricatedInputConfirmed:true});
console.log(JSON.stringify({at:new Date().toISOString(),agentContracts:agents.agents.length,topMatch:matches.matches[0],assetId:asset.id,execution:result,evidenceCategory:'client-controlled self-check; not independently verified Owner use'},null,2));await c.close();
