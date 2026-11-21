import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assess } from './engine.mjs';
const base={scope:'eu_departure',disruption:'delay',cause:'airline_technical',arrivalDelay:4,distance:'short'};
test('new application period requires review rather than applying old rules',()=>{
 assert.equal(assess({...base,flightDate:'2027-10-23'}).category,'REVIEW_REQUIRED');
 assert.equal(assess({...base,flightDate:'2026-11-20'}).indicativeAmountEUR,250);
});
test('negative final arrival delay is missing evidence rather than zero delay',()=>{
 const r=assess({...base,arrivalDelay:-4});assert.equal(r.category,'REVIEW_REQUIRED');assert.equal(r.indicativeAmountEUR,null);
});
test('Swiss or mixed jurisdiction is explicitly routed to review',()=>assert.equal(assess({...base,scope:'swiss_review'}).category,'REVIEW_REQUIRED'));
test('denied boarding never invents a full award when rerouting reductions are unverified',()=>{
 const r=assess({...base,disruption:'denied',checkedIn:'yes',involuntary:'yes'});assert.equal(r.indicativeAmountEUR,null);
});
test('invalid cancellation reroute times cannot manufacture an exception',()=>{
 const r=assess({...base,disruption:'cancellation',cancellationNoticeDays:2,rerouteOffered:'yes',rerouteEarlyDeparture:'invalid',rerouteArrivalLate:'invalid'});assert.equal(r.category,'REVIEW_REQUIRED');
});
test('historical real cancellation with missing notice and cause stays unconfirmed',()=>{
 const r=assess({scope:'eu_departure',flightNumber:'FR6802',flightDate:'2026-10-20',disruption:'cancellation',cause:'unknown'});assert.equal(r.category,'REVIEW_REQUIRED');assert.equal(r.indicativeAmountEUR,null);assert.equal(r.refundPossible,true);
});
test('public radar separates nine free government programs from one historical flight',()=>{
 const records=JSON.parse(readFileSync(new URL('./events.json',import.meta.url)));assert.equal(records.length,10);assert.equal(records.filter(x=>x.category==='FTC_FREE_ONLY'&&x.fee_usd===0).length,9);assert.equal(records[0].assessment,'REVIEW_REQUIRED');
});
test('proposed service has no functional checkout or confidential input',()=>{
 const s=readFileSync(new URL('./service.html',import.meta.url),'utf8');assert.match(s,/<button[^>]*disabled/);assert.match(s,/Not yet for sale/);assert.doesNotMatch(s,/<form|type="file"|paypal\.com\/.*checkout|buy\.stripe\.com/);assert.match(s,/5 December 2026/);
});
