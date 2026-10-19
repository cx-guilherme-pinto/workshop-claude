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
  title: 'Numeração romana ↔ árabe',
  inputs: [
    { name: 'value', type: 'text', label: 'Número' },
    { name: 'direction', type: 'choice', label: 'Sentido', default: 'to_roman', options: [{ value: 'to_roman', label: 'Árabe → romana' }, { value: 'to_arabic', label: 'Romana → árabe' }] },
  ],
  run({ value, direction }) {
    if (direction === 'to_roman') {
      const n = /^\d+$/.test(value) ? Number(value) : NaN;
      if (!(n >= 1 && n <= 3999)) throw new ToolError('Para numeração romana, escreve um número inteiro de 1 a 3999.');
      return toRoman(n);
    }
    const n = fromRoman(value.toUpperCase());
    if (n === null) throw new ToolError(`«${value}» não é um numeral romano válido.`);
    return String(n);
  },
});
