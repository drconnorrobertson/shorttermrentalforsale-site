import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || 'dist';
const pages = fs.readdirSync(path.join(root, 'research')).map(name =>
  path.join(root, 'research', name, 'cash-purchase', 'index.html')
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
  const [financed, cash, cashWithReserve] = rows;
  assert.equal(amount(cash[3]), 0, file + ': cash debt');
  assert.equal(amount(cashWithReserve[3]), 0, file + ': reserve case debt');
  assert.equal(cash[2], cashWithReserve[2], file + ': reserve must not create revenue');
  assert.equal(cash[4], cashWithReserve[4], file + ': reserve must not create operating cash');
  assert(Math.abs(amount(cashWithReserve[1]) - amount(cash[1]) - base.reserves) <= 1,
    file + ': retained cash must reconcile to additional entry cash');
  assert(Math.abs(amount(cash[4]) - amount(financed[4]) - amount(financed[3])) <= 2,
    file + ': removing debt must reconcile to the cash-flow difference');
  for (const row of [cash, cashWithReserve]) {
    const expectedPercent = amount(row[4]) / amount(row[1]) * 100;
    assert(Math.abs(amount(row[5]) - expectedPercent) <= 0.051,
      file + ': return must use that case’s cash denominator');
  }
}
console.log(JSON.stringify({cashPurchasePages: pages.length, distinctCasesPerPage: 3,
  reserveFundingBridge: 'passed', zeroDebt: 'passed', returnDenominators: 'passed'}));
