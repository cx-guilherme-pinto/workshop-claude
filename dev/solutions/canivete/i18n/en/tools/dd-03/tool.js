import { generate } from '../../templates/generate.js';

const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%&*-_=+?';
const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export default generate({
  id: 'dd-03',
  title: 'Password generator',
  inputs: [
    { name: 'length', type: 'integer', label: 'Length', default: '16', min: 4, max: 64 },
    { name: 'digits', type: 'choice', label: 'Digits', default: 'yes', options: YES_NO },
    { name: 'symbols', type: 'choice', label: 'Symbols', default: 'yes', options: YES_NO },
  ],
  run({ length, digits, symbols }, { randomInt }) {
    const classes = [LOWER, UPPER, ...(digits === 'yes' ? [DIGITS] : []), ...(symbols === 'yes' ? [SYMBOLS] : [])];
    const all = classes.join('');
    // one character of each chosen class, the rest from all of them, then a shuffle (Fisher-Yates)
    const chars = classes.map((c) => c[randomInt(c.length)]);
    while (chars.length < length) chars.push(all[randomInt(all.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  },
});
