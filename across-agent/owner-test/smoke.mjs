import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

// All wallet and RPC responses below are fixtures. This test never uses a real wallet or network.
const html=readFileSync("across-agent/owner-test/index.html","utf8");
const dom=new JSDOM(html,{url:"https://yl124915300-dot.github.io/across-agent/owner-test/",runScripts:"outside-only"});
const {window}=dom,{document}=window;
const account="0x2222222222222222222222222222222222222222",feeWallet="0x1111111111111111111111111111111111111111";
const SPOKE="0x7E63A5f1a8F0B4d0934B2f2327DAED3F6bb2ee75",USDC="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",OUT="0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const source="0x"+"aa".repeat(32),dest="0x"+"bb".repeat(32);
const HANDLER="0x0F7Ae28De1c8532170AD4eE566b5801485C13a0E",DEST_SPOKE="0x82B564983aE7274c86695917BBf8C99ECb6F0F8F";
const slot=v=>BigInt(v).toString(16).padStart(64,"0"),encode=values=>"0x"+values.map(slot).join("");
const data="0xad5425c6"+encode([account,HANDLER,USDC,OUT,1000000,996367,84532,0,0,0,0,384]).slice(2)+"a9059cbb"+slot(feeWallet)+slot(2989)+"ef8738d3"+slot(OUT)+slot(account);
const topic="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const calls=[],events={};let chain=421614,ready=false,allowFixtureSend=false,releaseSignature,observedFee="2989",observedOutput="993378",destFailed=false,statusDest=84532,originAmount="1000000",fillDeposit=7;
const log=(hash,token,from,to,amount)=>({transactionHash:hash,address:token,topics:[topic,"0x"+from.slice(2).padStart(64,"0"),"0x"+to.slice(2).padStart(64,"0")],data:"0x"+BigInt(amount).toString(16).padStart(64,"0")});
window.ethereum={on(name,fn){events[name]=fn;},async request({method,params}){
  calls.push({method,params});if(method==="eth_chainId")return "0x"+chain.toString(16);if(method==="eth_accounts"||method==="eth_requestAccounts")return [account];
  if(method==="eth_sendTransaction"){assert.ok(allowFixtureSend,"NO real broadcast allowed");assert.equal(params[0].chainId,"0x66eee");assert.equal(params[0].to,SPOKE);assert.equal(params[0].from,account);assert.equal(params[0].value,"0x0");return await new Promise(resolve=>{releaseSignature=resolve;});}
  throw Error("Unexpected wallet method "+method);
}};
const depositLog=()=>({address:SPOKE,topics:["0x32ed1a409ef04c7b0227189c3a103dc5ac10e775a15b785dcc510201f7c25ad3",encode([84532]),encode([7]),encode([account])],data:encode([USDC,OUT,1000000,996367,0,0,0,HANDLER,0,0])});
const fillLog=()=>({address:DEST_SPOKE,topics:["0x44b559f101f8fbcc8a0ea43fa91a05a729a5ea6e14a7c75aa750374690137208",encode([421614]),encode([fillDeposit]),encode([SPOKE])],data:encode([USDC,OUT,1000000,996367,421614,0,0,0,account,HANDLER,0,HANDLER,0,996367,0])});
const quote=()=>({id:"fixture-only",inputAmount:"1000000",expectedOutputAmount:"993378",quoteExpiryTimestamp:Math.floor(Date.now()/1000)+180,fees:{total:{details:{app:{amount:"2989"}}}},swapTx:{chainId:421614,to:SPOKE,data,simulationSuccess:ready},checks:{allowance:{spender:SPOKE,actual:ready?"1000000":"0",expected:"1000000"},balance:{actual:ready?"1000000":"0",expected:"1000000"}}});
const json=result=>({ok:true,status:200,json:async()=>result});
window.fetch=async(url,options)=>{
 if(String(url).startsWith("https://testnet.across.to/api/swap/approval?")){
  const p=new URL(url).searchParams;assert.equal(p.get("originChainId"),"421614");assert.equal(p.get("destinationChainId"),"84532");assert.equal(p.get("amount"),"1000000");assert.equal(p.get("appFee"),"0.003");assert.equal(p.get("depositor"),account);assert.equal(p.get("appFeeRecipient"),feeWallet);return json(quote());
 }
 if(String(url).startsWith("https://testnet.across.to/api/deposit/status?"))return json({depositTxnRef:source,status:"filled",fillTxnRef:dest,originChainId:421614,destinationChainId:statusDest});
 assert.ok(["https://sepolia-rollup.arbitrum.io/rpc","https://sepolia.base.org"].includes(url),"Unexpected domain");const origin=url.includes("arbitrum"),req=JSON.parse(options.body);let result;
 if(req.method==="eth_chainId")result="0x"+(origin?421614:84532).toString(16);
 else if(req.method==="eth_getTransactionByHash")result={from:account,to:SPOKE,input:data,value:"0x0"};
 else if(req.method==="eth_getTransactionReceipt")result=origin?{transactionHash:source,blockNumber:"0x123",status:"0x1",from:account,to:SPOKE,logs:[log(source,USDC,account,SPOKE,originAmount),depositLog()]}:{transactionHash:dest,blockNumber:"0x456",status:destFailed?"0x0":"0x1",logs:[log(dest,OUT,SPOKE,feeWallet,observedFee),log(dest,OUT,SPOKE,account,observedOutput),fillLog()]};
 else throw Error("Unexpected RPC "+req.method);return json({result});
};
const match=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(match);
window.eval(match[1]+"\nwindow.__test={successfulReceipt,transferSum,validateAmounts,getTransfer:()=>transfer};");
const el=id=>document.getElementById(id),click=id=>el(id).click(),next=()=>new Promise(r=>setTimeout(r,15));
const input=(id,value)=>{el(id).value=value;el(id).dispatchEvent(new window.Event("input",{bubbles:true}));};
assert.ok(el("quote").disabled&&el("approve").disabled&&el("send").disabled);
click("connect");await next();assert.equal(el("account").textContent,account);input("feeAddr",account);assert.ok(el("quote").disabled);
input("feeAddr","0x0000000000000000000000000000000000000010");assert.ok(el("quote").disabled,"Reserved address gate");input("feeAddr",feeWallet);click("quote");await next();
assert.equal(el("fee").textContent,"0.002989 test USDC");assert.equal(el("output").textContent,"0.993378 test USDC");assert.ok(!el("approve").disabled&&el("send").disabled);
el("ack").checked=true;el("ack").dispatchEvent(new window.Event("change"));input("confirm","TESTNET ONLY");assert.ok(el("send").disabled,"Consent cannot bypass balance checks");
chain=1;click("quote");await next();assert.ok(el("quoteStatus").textContent.includes("Switch the wallet to Arbitrum Sepolia"));assert.ok(el("send").disabled);assert.equal(calls.filter(x=>x.method==="eth_sendTransaction").length,0);
chain=421614;ready=true;click("quote");await next();assert.equal(el("send").disabled,false);allowFixtureSend=true;click("send");await next();assert.ok(releaseSignature);assert.ok(el("send").disabled&&el("quote").disabled&&el("approve").disabled);click("send");assert.equal(calls.filter(x=>x.method==="eth_sendTransaction").length,1,"Pending signature cannot request duplicate sends");
releaseSignature(source);await next();const saved=window.__test.getTransfer();assert.ok(Object.isFrozen(saved));assert.equal(saved.feeAmount,"2989");assert.ok(el("send").disabled,"One bridge transfer per session");
input("feeAddr","0x3333333333333333333333333333333333333333");assert.equal(saved.feeWallet,feeWallet,"Quote edits cannot change transfer record");
click("track");await next();assert.equal(el("verifyFee").disabled,false);click("verifyFee");await next();assert.ok(el("feeStatus").textContent.startsWith("VERIFIED LINKED TESTNET RECEIPTS:"));
for(const fee of ["0","1","2990"]){observedFee=fee;click("verifyFee");await next();assert.ok(el("feeStatus").textContent.startsWith("NOT VERIFIED:"),"Wrong fee "+fee+" rejected");}observedFee="2989";
observedOutput="1";click("verifyFee");await next();assert.ok(el("feeStatus").textContent.includes("Recipient amount mismatch"));observedOutput="993378";
destFailed=true;click("verifyFee");await next();assert.ok(el("feeStatus").textContent.startsWith("NOT VERIFIED:"));destFailed=false;
originAmount="999999";click("verifyFee");await next();assert.ok(el("feeStatus").textContent.includes("exactly 1 USDC"));originAmount="1000000";
fillDeposit=8;click("verifyFee");await next();assert.ok(el("feeStatus").textContent.includes("Matching FilledRelay event"),"Different deposit cannot pass");fillDeposit=7;
statusDest=1;click("track");await next();assert.ok(el("verifyFee").disabled);assert.ok(el("trackStatus").textContent.includes("Destination chain mismatch"));
const test=window.__test;
assert.throws(()=>test.successfulReceipt({transactionHash:dest,blockNumber:"0x1",status:"0x0"},dest));
assert.equal(test.transferSum({transactionHash:dest,logs:[log(dest,USDC,SPOKE,feeWallet,"2989")]},OUT,feeWallet),0n,"Wrong token is excluded");
assert.throws(()=>test.validateAmounts({...quote(),fees:{total:{details:{app:{amount:"3000"}}}}}),/0.3%/);
console.log("PASS: existing wallet/chain/funding gates; pending-signature lock; immutable transfer; exact fee/output/source amounts; wrong-token and reverted receipt rejection; stale fill cleared on chain mismatch. Mock-only: no network, real wallet, signature or blockchain broadcast.");
dom.window.close();

// Connection regressions: mocked providers only; no wallet, network, or signatures.
function connectionFixture(request){
 const d=new JSDOM(html,{url:"https://yl124915300-dot.github.io/across-agent/owner-test/",runScripts:"outside-only"});
 const eventHandlers={},seen=[];
 d.window.ethereum={on(name,fn){eventHandlers[name]=fn;},request(args){seen.push(args);return request(args);}};
 d.window.eval(match[1]);
 const get=id=>d.window.document.getElementById(id);
 return {d,get,seen,eventHandlers,click:id=>get(id).click()};
}
let releaseConnection;
const pending=connectionFixture(({method})=>method==="eth_requestAccounts"?new Promise(resolve=>{releaseConnection=resolve;}):Promise.resolve("0x66eee"));
pending.click("connect");pending.click("connect");pending.click("diagnose");pending.click("switch");
assert.equal(pending.seen.filter(x=>x.method==="eth_requestAccounts").length,1,"Repeated clicks cannot start duplicate connection requests");
assert.ok(pending.get("connect").disabled&&pending.get("diagnose").disabled&&pending.get("switch").disabled);
releaseConnection([account]);await next();assert.equal(pending.get("connect").disabled,false);assert.match(pending.get("networkStatus").textContent,/421614/);pending.d.window.close();
for(const code of [4001,-32002,4900,4901]){
 const f=connectionFixture(async()=>{throw {code,message:"fixture rejection"};});f.click("connect");await next();
 assert.ok(f.get("account").textContent.includes(String(code)),"Error code preserved: "+code);assert.equal(f.get("connect").disabled,false);assert.ok(f.get("quote").disabled&&f.get("send").disabled);f.d.window.close();
}
let rejectReconnect=false;
const reconnect=connectionFixture(async({method})=>{if(method==="eth_chainId")return "0x66eee";if(rejectReconnect)throw {code:4001};return [account];});
reconnect.click("connect");await next();assert.equal(reconnect.get("account").textContent,account);
rejectReconnect=true;reconnect.click("connect");await next();assert.ok(reconnect.get("quote").disabled&&reconnect.get("switch").disabled,"Failed reconnect clears old account");reconnect.d.window.close();
const diagnostic=connectionFixture(async({method})=>{assert.ok(["eth_chainId","eth_accounts"].includes(method),"Diagnostic is read-only");return method==="eth_chainId"?"0x1":[];});
diagnostic.click("diagnose");await next();assert.match(diagnostic.get("networkStatus").textContent,/Current chain: 1/);assert.match(diagnostic.get("walletStatus").textContent,/没有可用账户/);assert.equal(diagnostic.seen.length,2);diagnostic.d.window.close();
const switched=[];
const network=connectionFixture(async({method,params})=>{if(method==="eth_requestAccounts")return [account];if(method==="eth_chainId")return "0x66eee";switched.push({method,params});if(method==="wallet_switchEthereumChain")throw {code:4902};return null;});
network.click("connect");await next();network.click("switch");await next();assert.equal(switched[0].params[0].chainId,"0x66eee");assert.equal(switched[1].method,"wallet_addEthereumChain");assert.equal(switched[1].params[0].chainId,"0x66eee");assert.equal(network.get("switch").disabled,false);
network.eventHandlers.disconnect();assert.ok(network.get("switch").disabled&&network.get("quote").disabled);network.d.window.close();
console.log("PASS: single pending connection; 4001/-32002/4900/4901 guidance; failed reconnect clears account; read-only diagnostic; correct-chain add fallback; disconnect invalidation. Mock-only.");
