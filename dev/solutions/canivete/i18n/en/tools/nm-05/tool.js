import { convert, ToolError } from '../../templates/convert.js';

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

function toRoman(n) {
  let s = '';
  for (const [v, r] of ROMAN) {
    while (n >= v) {
      s += r;
      n -= v;
    }
  }
  return s;
}

// The value of a numeral in the standard form (the one toRoman writes), or null.
function fromRoman(s) {
  if (!/^[IVXLCDM]+$/.test(s)) return null;
  let n = 0;
  let i = 0;
  for (const [v, r] of ROMAN) {
    while (s.startsWith(r, i)) {
      n += v;
      i += r.length;
    }
  }
  return i === s.length && n <= 3999 && toRoman(n) === s ? n : null;
}

export default convert({
  id: 'nm-05',
  title: 'Roman ↔ Arabic numerals',
  inputs: [
    { name: 'value', type: 'text', label: 'Number' },
    { name: 'direction', type: 'choice', label: 'Direction', default: 'to_roman', options: [{ value: 'to_roman', label: 'Arabic → Roman' }, { value: 'to_arabic', label: 'Roman → Arabic' }] },
  ],
  run({ value, direction }) {
    if (direction === 'to_roman') {
      const n = /^\d+$/.test(value) ? Number(value) : NaN;
      if (!(n >= 1 && n <= 3999)) throw new ToolError('For Roman numerals, type a whole number from 1 to 3999.');
      return toRoman(n);
    }
    const n = fromRoman(value.toUpperCase());
    if (n === null) throw new ToolError(`"${value}" is not a valid Roman numeral.`);
    return String(n);
  },
});
