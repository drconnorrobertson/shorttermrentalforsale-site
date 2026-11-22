import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {saleProceeds} from './exit-proceeds.mjs';
const checks=[
 [{salePrice:250000,sellingFraction:.06,payoff:175000,otherCosts:2000},{totalCosts:17000,proceeds:58000,cashNeeded:0}],
 [{salePrice:200000,sellingFraction:.06,payoff:195000,otherCosts:1000},{totalCosts:13000,proceeds:-8000,cashNeeded:8000}],
 [{salePrice:300000,sellingFraction:.09,payoff:0,otherCosts:3000},{totalCosts:30000,proceeds:270000,cashNeeded:0}],
 [{salePrice:100000,sellingFraction:0,payoff:100000,otherCosts:0},{totalCosts:0,proceeds:0,cashNeeded:0}]
];
for(const [input,expected] of checks){const result=saleProceeds(input);for(const [k,v]of Object.entries(expected))assert.equal(result[k],v);}
const valid=checks[0][0];
for(const bad of [{salePrice:''},{salePrice:0},{salePrice:-1},{sellingFraction:1.01},{sellingFraction:-.01},{payoff:NaN},{otherCosts:Infinity},{otherCosts:-1},{payoff:undefined},{salePrice:1e308,sellingFraction:1,otherCosts:1e308}])assert.throws(()=>saleProceeds({...valid,...bad}));
const root=process.argv[2]||'dist';let pages=0;
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
for(const dir of fs.readdirSync(path.join(root,'research'))){
 const file=path.join(root,'research',dir,'exit-cost','index.html');if(!fs.existsSync(file))continue;pages++;
 const s=fs.readFileSync(file,'utf8');
 const attrs=s.match(/<form id="exit-proceeds-form" data-sale-price="([^"]+)" data-payoff="([^"]+)"/);assert(attrs,file);
 const price=Number(attrs[1]),payoff=Number(attrs[2]);
 const rows=[...s.matchAll(/<tr data-selling-fraction="([^"]+)">([\s\S]*?)<\/tr>/g)];assert.equal(rows.length,3,file);
 for(let i=0;i<3;i++){
  const rate=[.03,.06,.09][i];assert.equal(Number(rows[i][1]),rate);
  const cells=[...rows[i][2].matchAll(/<td>(.*?)<\/td>/g)].map(x=>x[1]);
  assert.deepEqual(cells,[money(price),money(price*rate),money(payoff),money(price-price*rate-payoff)]);
 }
 assert.equal((s.match(/id="exit-proceeds-form"/g)||[]).length,1);assert.equal((s.match(/id="worksheet"/g)||[]).length,1);
 for(const text of ['Financing comparison before sale: three cases','not profit, tax savings or total investment return','not property values, broker quotes','role="region" aria-label="Hypothetical sale proceeds comparison" tabindex="0"'])assert(s.includes(text),text);
 assert(s.includes('"dateModified":"2026-11-22"'));
}
assert.equal(pages,24,'Expected all 24 current exit-cost owners');
console.log('Exit proceeds passed: 4 independent numerical fixtures, 10 invalid boundaries, 24 pages/72 static sale cases and separate operating forms.');
