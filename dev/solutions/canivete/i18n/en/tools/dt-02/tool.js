import { calc, ToolError } from '../../templates/calc.js';

const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export default calc({
  id: 'dt-02',
  title: 'Age on a date',
  inputs: [
    { name: 'birth', type: 'date', label: 'Date of birth' },
    { name: 'on', type: 'date', label: 'On date' },
  ],
  run({ birth, on }) {
    if (on < birth) throw new ToolError('The date must be on or after the date of birth.');
    const [y1, m1, d1] = birth.split('-').map(Number);
    const [y2, m2, d2] = on.split('-').map(Number);
    // born on 29 February: in a year that is not a leap year the birthday is 28 February
    const bd = m1 === 2 && d1 === 29 && !leap(y2) ? 28 : d1;
    return y2 - y1 - (m2 < m1 || (m2 === m1 && d2 < bd) ? 1 : 0);
  },
});
