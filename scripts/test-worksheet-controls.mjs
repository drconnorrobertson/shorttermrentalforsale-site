import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(process.argv[2] || 'dist');
const extraKeys = ['owner','points','delay','credit','discount','cleaning','renovation','refunds','fee','io','contingency'];
const examples = new Map();
let worksheets = 0, scenarioPages = 0;
function changes(text) {
  return Object.fromEntries([...text.matchAll(/([a-z]+) = (.*?)(?=, [a-z]+ = |$)/g)].map(([,key,value]) => [key,value==='true'?'1':value==='false'?'0':value.replaceAll(',','')]));
}
function rows(html) {
  return [...html.matchAll(/<tr><th scope="row">([^<]+)<\/th>(.*?)<\/tr>/g)].map(([,label,cells]) => ({label,values:[...cells.matchAll(/<td>([^<]+)<\/td>/g)].map(match => match[1])}));
}
for (const file of fs.readdirSync(path.join(root,'research'), {recursive:true}).filter(file => file.endsWith('index.html'))) {
  const html = fs.readFileSync(path.join(root,'research',file),'utf8');
  const form = html.match(/<form id="worksheet">([\s\S]*?)<\/form>/)?.[1];
  assert.ok(form, file+' has the actual worksheet form');
  const controls = new Set([...form.matchAll(/<(?:input|select)\b[^>]*\bname="([^"]+)"/g)].map(match => match[1]));
  const variants = rows(html).slice(1);
  let scenario = false;
  for (const row of variants) for (const key of Object.keys(changes(row.label))) {
    assert.ok(controls.has(key), file+' comparison input must be editable: '+key);
    if (extraKeys.includes(key)) {
      scenario = true;
      if (!examples.has(key)) examples.set(key,{html,row,file});
    }
  }
  worksheets++;
  if (scenario) scenarioPages++;
}
assert.equal(examples.size, extraKeys.length, 'All eleven affected scenario families have fixtures');

function calculate(html, values={}) {
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]).find(script=>script.startsWith('const payment='));
  assert.ok(script,'Production worksheet script exists');
  let submit;
  const answer = {textContent:''};
  const document = {getElementById(id) {
    if (id==='answer') return answer;
    if (id==='worksheet') return {addEventListener(event,handler) {assert.equal(event,'submit');submit=handler;}};
    throw new Error('Unexpected DOM access: '+id);
  }};
  class FormData { *[Symbol.iterator]() {yield* Object.entries(values);} }
  vm.runInNewContext(script,{document,FormData,Intl,Number});
  submit.call({}, {preventDefault(){}});
  assert.ok(!/NaN|Infinity/.test(answer.textContent),'No invalid numeric output');
  return answer.textContent;
}

let comparisons = 0;
for (const [key,fixture] of examples) {
  const answer = calculate(fixture.html,changes(fixture.row.label));
  for (const [index,label] of ['Total entry cash','Accommodation revenue','Annual debt','Annual owner cash flow','Cash-on-cash'].entries()) {
    assert.ok(answer.includes(label+': '+fixture.row.values[index]),key+' edited controls reproduce the existing comparison: '+label);
    comparisons++;
  }
}
const owner = examples.get('owner').html;
assert.match(calculate(owner,{owner:'365'}),/Accommodation revenue: \$0\./);
assert.match(calculate(owner,{owner:'365'}),/Break-even occupancy: not defined with zero available room-night contribution/);
assert.match(calculate(owner,{owner:'366'}),/Check Owner-use nights/);
assert.match(calculate(owner,{owner:'1.5'}),/Check Owner-use nights/);
assert.match(calculate(owner,{owner:'-1'}),/Check Owner-use nights/);
assert.match(calculate(owner,{owner:''}),/Complete every required/);
assert.match(calculate(examples.get('discount').html,{discount:'1'}),/Accommodation revenue: \$0\./);
assert.match(calculate(examples.get('refunds').html,{refunds:'1'}),/Accommodation revenue: \$0\./);
assert.match(calculate(examples.get('discount').html,{discount:'1.01'}),/Check Accommodation-rate discount/);
assert.match(calculate(examples.get('io').html,{io:'2'}),/Check Debt payment structure/);
const amortizing = calculate(examples.get('io').html,{io:'0'});
assert.ok(amortizing.includes('Annual debt: '+rows(examples.get('io').html)[0].values[2]),'Turning interest-only off restores the amortizing result');
assert.match(calculate(owner,{price:'not-a-number'}),/Check Purchase price/);
console.log(JSON.stringify({worksheetControlChecks:'passed',worksheets,scenarioPages,scenarioFamilies:examples.size,existingComparisonValueChecks:comparisons,boundaryAndParsingChecks:12,scope:'Actual generated forms and submit handlers; comparison matching checks wiring, not an independent review of every financial formula.'}));
