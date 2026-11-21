const fractions = new Set(['down','occupancy','management','platform','maintenance','capex']);
const extraFields = {
  owner: {label:'Owner-use nights',max:365,integer:true,help:'Calendar nights excluded from the 365-night model, from 0 through 365.'},
  points: {label:'Upfront loan points (cash amount)',help:'Enter the total cash cost of points, not a percentage. Edit the quoted rate separately below.'},
  delay: {label:'Launch delay (months)',help:'Adds modeled fixed bills and debt carrying cost to entry cash. This does not estimate lost bookings.'},
  credit: {label:'Seller credit (cash amount)',help:'Subtracts the assumed credit from entry cash. Actual permitted credits and funding arrangements require confirmation.'},
  discount: {label:'Accommodation-rate discount fraction',max:1,help:'0.10 means a 10% reduction to the entered nightly rate.'},
  cleaning: {label:'Annual net cleaning expense',help:'Annual cleaning cost remaining for the owner after any guest cleaning receipts.'},
  renovation: {label:'Renovation budget',help:'Additional cash included in total entry cash.'},
  refunds: {label:'Accommodation-revenue refund fraction',max:1,help:'0.02 means 2% of modeled accommodation revenue is refunded.'},
  fee: {label:'Acquisition or service fee',help:'Additional cash included in total entry cash; enter the actual fee if applicable.'},
  io: {label:'Debt payment structure',boolean:true,help:'Interest-only excludes principal repayment from annual debt service. Principal remains outstanding; maturity repayment is not modeled.'},
  contingency: {label:'Contingency cash allowance',help:'Additional cash reserved in the modeled entry budget.'}
};

export function worksheetFields(pairs, base, variants) {
  const fields = pairs.map(([key,label]) => ({key,label,min:0,...(fractions.has(key)?{max:1}:{})}));
  const known = new Set(fields.map(field => field.key));
  for (const variant of variants) for (const key of Object.keys(variant)) {
    if (variant[key] === base[key] || known.has(key)) continue;
    if (!extraFields[key]) throw new Error('Missing worksheet control definition: '+key);
    fields.push({key,min:0,scenario:true,...extraFields[key]});
    known.add(key);
  }
  return fields;
}

export function renderWorksheetFields(fields, values, escape) {
  const render = field => {
    const label = escape(field.label);
    const input = field.boolean
      ? '<select name="'+field.key+'" required><option value="0"'+(!values[field.key]?' selected':'')+'>Amortizing principal and interest</option><option value="1"'+(values[field.key]?' selected':'')+'>Interest only; principal remains due</option></select>'
      : '<input name="'+field.key+'" type="number" step="'+(field.integer?'1':'any')+'" min="'+field.min+'" '+(field.max!==undefined?'max="'+field.max+'" ':'')+'value="'+values[field.key]+'" required>';
    return '<label>'+label+input+(field.help?'<small style="display:block">'+escape(field.help)+'</small>':'')+'</label>';
  };
  const extra = fields.filter(field => field.scenario);
  return (extra.length?'<div style="grid-column:1 / -1"><h3>Scenario-specific inputs</h3><p>Change the topic inputs here, then review the shared property assumptions below.</p></div>'+extra.map(render).join('')+'<h3 style="grid-column:1 / -1">Shared property assumptions</h3>':'')+fields.filter(field => !field.scenario).map(render).join('');
}

export function readWorksheetValues(base, entries, fields) {
  const values = {...base}, known = new Set(fields.map(field => field.key));
  for (const [key, value] of entries) {
    if (!known.has(key)) continue;
    if (String(value).trim() === '') throw new Error('Complete every required worksheet input.');
    values[key] = Number(value);
  }
  if (values.price<=0 || values.adr<=0 || values.term<=0 || values.management+values.platform+values.maintenance+values.capex>=1) {
    throw new Error('Enter a positive price, nightly rate and loan term, and combined percentage expenses below 100%.');
  }
  for (const field of fields) {
    const value = Number(values[field.key]);
    if (!Number.isFinite(value) || value<field.min || (field.max!==undefined && value>field.max) || (field.integer && !Number.isInteger(value)) || (field.boolean && value!==0 && value!==1)) {
      throw new Error('Check '+field.label+': enter a valid '+(field.boolean?'payment option.':field.integer?'whole number within the displayed limits.':'number within the displayed limits.'));
    }
    values[field.key] = field.boolean ? value===1 : value;
  }
  return values;
}

export function worksheetAnswer(result) {
  if (!['capital','rev','debt','cash'].every(key => Number.isFinite(result[key]))) throw new Error('These assumptions do not produce finite cash results. Review the amounts and loan term.');
  const dollars = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  const cashReturn = result.capital>0 && Number.isFinite(result.coc) ? (result.coc*100).toFixed(1)+'%' : 'not defined for zero or negative entry cash';
  const breakEven = Number.isFinite(result.breakeven) ? (result.breakeven*100).toFixed(1)+'%' : 'not defined with zero available room-night contribution';
  return 'Total entry cash: '+dollars(result.capital)+'. Accommodation revenue: '+dollars(result.rev)+'. Annual debt: '+dollars(result.debt)+'. Annual owner cash flow: '+dollars(result.cash)+'. Cash-on-cash: '+cashReturn+'. Break-even occupancy: '+breakEven+'. Hypothetical results, not a forecast.';
}
