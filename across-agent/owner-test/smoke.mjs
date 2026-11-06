import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const html = readFileSync("across-agent/owner-test/index.html","utf8");
const dom = new JSDOM(html, { url: "https://yl124915300-dot.github.io/across-agent/owner-test/", runScripts: "outside-only" });
const { window } = dom;
const document = window.document;
const account = "0x2222222222222222222222222222222222222222";
const feeWallet = "0x1111111111111111111111111111111111111111";
const calls = [];
let chain = 421614;
window.ethereum = {
  on() {},
  async request({ method, params }) {
    calls.push(method);
    if (method === "eth_chainId") return "0x" + chain.toString(16);
    if (method === "eth_requestAccounts" || method === "eth_accounts") return [account];
    if (method === "eth_sendTransaction") throw new Error("SMOKE TEST: NO BROADCAST ALLOWED");
    if (method === "wallet_switchEthereumChain") {chain = parseInt(params[0].chainId,16); return null;}
    throw new Error("Unexpected provider method: " + method);
  }
};
window.fetch = async (url) => {
  assert.ok(String(url).startsWith("https://testnet.across.to/api/swap/approval?"),"Unexpected remote domain");
  const p=new URL(String(url)).searchParams;
  assert.equal(p.get("originChainId"),"421614");
  assert.equal(p.get("destinationChainId"),"84532");
  assert.equal(p.get("amount"),"1000000");
  assert.equal(p.get("appFee"),"0.003");
  assert.equal(p.get("depositor"),account);
  assert.equal(p.get("appFeeRecipient"),feeWallet);
  return {
    ok:true,
    status:200,
    json:async()=>({
      id:"smoke-fake-quote",
      inputAmount:"1000000",
      expectedOutputAmount:"993000",
      quoteExpiryTimestamp:Math.floor(Date.now()/1000)+180,
      fees:{total:{details:{app:{amount:"2988"}}}},
      swapTx:{
        to:"0x7E63A5f1a8F0B4d0934B2f2327DAED3F6bb2ee75",
        chainId:421614,
        data:"0x12345678"+feeWallet.slice(2)+"aa".repeat(50),
        simulationSuccess:false
      },
      checks:{
        allowance:{spender:"0x7E63A5f1a8F0B4d0934B2f2327DAED3F6bb2ee75",actual:"0",expected:"1000000"},
        balance:{actual:"0",expected:"1000000"}
      }
    })
  };
};
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,"Missing application script");
window.eval(match[1]);
const el=id=>document.getElementById(id);
const click=id=>el(id).click();
const next=()=>new Promise(resolve=>setTimeout(resolve,20));
assert.ok(el("quote").disabled, "Quote must start disabled without account");
assert.ok(el("send").disabled,"Send must start disabled");
assert.ok(el("approve").disabled,"Approve must start disabled");
click("connect"); await next();
assert.equal(el("account").textContent,account);
assert.ok(el("quote").disabled,"Quote must require a separate fee wallet");
el("feeAddr").value=account;
el("feeAddr").dispatchEvent(new window.Event("input",{bubbles:true}));
assert.ok(el("quote").disabled,"Same sender/fee wallet must be disallowed");
el("feeAddr").value=feeWallet;
el("feeAddr").dispatchEvent(new window.Event("input",{bubbles:true}));
assert.equal(el("quote").disabled,false,"Distinct valid fee wallet enables read-only quote");
click("quote"); await next(); await next();
assert.equal(el("fee").textContent,"0.002988 test USDC","Fee must come from real quote-shaped response");
assert.equal(el("output").textContent,"0.993000 test USDC");
assert.ok(el("send").disabled,"Insufficient funds must prevent sending");
assert.ok(!el("approve").disabled,"Insufficient allowance permits exact approval");
el("ack").checked=true;
el("ack").dispatchEvent(new window.Event("change",{bubbles:true}));
el("confirm").value="TESTNET ONLY";
el("confirm").dispatchEvent(new window.Event("input",{bubbles:true}));
assert.ok(el("send").disabled,"Consent never bypasses balance/allowance/simulation checks");
assert.ok(!calls.includes("eth_sendTransaction"),"No transaction may broadcast during smoke");
chain=1;
click("quote"); await next(); await next();
assert.ok(el("quoteStatus").textContent.includes("Switch the wallet to Arbitrum Sepolia"),"Wrong-chain quote must be blocked");
assert.ok(el("send").disabled,"Wrong-chain quote cannot enable send");
assert.ok(!calls.includes("eth_sendTransaction"),"Never broadcast in non-custodial safety smoke");
console.log("PASS: disconnected gate, fee-wallet gate, real quote-shaped data rendering, exact approval gate, no-balance broadcast block, wrong-chain block. No blockchain transaction sent.");
