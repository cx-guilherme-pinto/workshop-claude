import { calc } from '../../templates/calc.js';

// Half-up rounding in decimal: shift the decimal point in the text of the number, not with a multiplication
// (1.005 * 100 is 100.49999… in binary floating point).
function roundDecimal(x, places) {
  const [m, e] = String(x).split('e');
  const r = Math.sign(Number(`${m}e${(Number(e) || 0) + places}`)) * Math.round(Math.abs(Number(`${m}e${(Number(e) || 0) + places}`)));
  const [m2, e2] = String(r).split('e');
  return Number(`${m2}e${(Number(e2) || 0) - places}`);
}

export default calc({
  id: 'nm-03',
  title: 'Round to decimal places',
  inputs: [
    { name: 'value', type: 'number', label: 'Number' },
    { name: 'places', type: 'integer', label: 'Decimal places', default: '2', min: 0, max: 10 },
  ],
  run({ value, places }) {
    return roundDecimal(value, places);
  },
});
