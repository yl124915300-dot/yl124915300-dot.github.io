import {Resolver} from 'node:dns/promises';
import {BlockList} from 'node:net';
const denied=new BlockList();
for(const [a,p] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])denied.addSubnet(a,p,'ipv4');
for(const [a,p] of [['::',128],['::1',128],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32]])denied.addSubnet(a,p,'ipv6');
export async function boundedPublicLookup(host,{signal=AbortSignal.timeout(12000),lookupFn}={}){
 if(signal.aborted)throw Error('TOTAL_DEADLINE');let onAbort,resolver;
 const resolve=lookupFn||(()=>{resolver=new Resolver({timeout:4000,tries:1});return Promise.allSettled([resolver.resolve4(host),resolver.resolve6(host)]).then(out=>{const addresses=out.flatMap((r,i)=>r.status==='fulfilled'?r.value.map(address=>({address,family:i===0?4:6})):[]);if(!addresses.length)throw Error('DNS_FAILED');return addresses;});});
 const abort=new Promise((_,reject)=>{onAbort=()=>{resolver?.cancel();reject(Error('TOTAL_DEADLINE'));};signal.addEventListener('abort',onAbort,{once:true});});
 try{const addresses=await Promise.race([resolve(host,{all:true}),abort]);
  if(!addresses.length||addresses.some(a=>![4,6].includes(a.family)||a.address.toLowerCase().startsWith('::ffff:')||denied.check(a.address,a.family===4?'ipv4':'ipv6')))throw Error('PRIVATE_DNS_DENIED');
  return addresses;
 }finally{signal.removeEventListener('abort',onAbort);resolver?.cancel();}
}
