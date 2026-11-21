import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const output=path.resolve(process.argv[2]||'dist');
const research=path.join(output,'research');
const first=fs.readdirSync(research,{recursive:true}).find(f=>f.endsWith('index.html'));
assert.ok(first,'Generated worksheet fixture exists');
const html=fs.readFileSync(path.join(research,first),'utf8');
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.startsWith('const payment='));
assert.ok(script,'Production worksheet handler exists');
function calculate(overrides={}){
 let submit; const answer={textContent:''};
 const document={getElementById(id){if(id==='answer')return answer;if(id==='worksheet')return {addEventListener(event,fn){assert.equal(event,'submit');submit=fn;}};throw Error('Unexpected element '+id);}};
 class FormData { *[Symbol.iterator](){yield* Object.entries(overrides);} }
 vm.runInNewContext(script,{document,FormData,Intl,Number});
 submit.call({}, {preventDefault(){}});
 return answer.textContent;
}
const baseline=calculate();assert.ok(baseline.includes('Annual owner cash flow:'));assert.ok(!/Infinity|NaN|not defined/.test(baseline));
const zero=calculate({down:0,closing:0,furnishing:0,launch:0,reserves:0});assert.ok(zero.includes('Total entry cash: $0.'));assert.ok(zero.includes('Cash-on-cash: not defined for zero or negative entry cash'));assert.ok(!/Infinity|NaN/.test(zero));
const cash=calculate({down:1,rate:0});assert.ok(cash.includes('Annual debt: $0.'));assert.ok(!/Infinity|NaN|not defined/.test(cash));
const invalid=calculate({price:0});assert.ok(invalid.startsWith('Enter a positive price'));
console.log(JSON.stringify({worksheetReturnChecks:'passed',cases:['baseline','zero-entry-cash','cash-purchase','invalid-price']}));
