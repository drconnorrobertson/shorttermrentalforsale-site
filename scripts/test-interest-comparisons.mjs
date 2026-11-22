import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || 'dist';
const pages = fs.readdirSync(path.join(root, 'research')).map(name =>
  path.join(root, 'research', name, 'interest-only', 'index.html')
).filter(file => fs.existsSync(file));
assert.equal(pages.length, 63);
const amount = value => Number(value.replace(/[^0-9.\-]/g, ''));

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const base = JSON.parse(html.match(/const base=(\{.*?\});const fields=/)[1]);
  const table = html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1];
  const rows = [...table.matchAll(/<tr>(.*?)<\/tr>/g)].map(match =>
    [...match[1].matchAll(/<(?:th|td)\b[^>]*>(.*?)<\/(?:th|td)>/g)].map(cell => cell[1])
  );
  assert.equal(rows.length, 3, file);
  assert.equal(new Set(rows.map(row => row.join('|'))).size, 3, file + ': repeated comparison');
  const [amortizing, interest, higherRate] = rows;
  const loan = base.price * (1 - base.down);
  for (const [row, rate] of [[interest, base.rate], [higherRate, base.rate + .01]]) {
    assert(Math.abs(amount(row[3]) - loan * rate) <= .51, file + ': interest-only payment');
    assert.equal(row[1], amortizing[1], file + ': unchanged entry cash');
    assert.equal(row[2], amortizing[2], file + ': unchanged revenue');
  }
  assert(Math.abs(amount(higherRate[3]) - amount(interest[3]) - loan * .01) <= 1,
    file + ': one percentage point sensitivity');
  assert(Math.abs(amount(interest[4]) - amount(higherRate[4]) - (amount(higherRate[3]) - amount(interest[3]))) <= 2,
    file + ': cash-flow difference must reconcile to debt');
  assert(html.includes('Interest-only payments do not reduce principal.'), file + ': principal explanation');
}
console.log(JSON.stringify({interestOnlyPages: pages.length, distinctCasesPerPage: 3,
  interestPayments: 'passed', rateSensitivity: 'passed', cashFlowBridge: 'passed'}));
