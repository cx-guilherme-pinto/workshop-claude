import { calc, ToolError } from '../../templates/calc.js';

const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export default calc({
  id: 'dt-02',
  title: 'Idade numa data',
  inputs: [
    { name: 'birth', type: 'date', label: 'Data de nascimento' },
    { name: 'on', type: 'date', label: 'Na data' },
  ],
  run({ birth, on }) {
    if (on < birth) throw new ToolError('A data tem de ser igual ou posterior à data de nascimento.');
    const [y1, m1, d1] = birth.split('-').map(Number);
    const [y2, m2, d2] = on.split('-').map(Number);
    // born on 29 February: in a year that is not a leap year the birthday is 28 February
    const bd = m1 === 2 && d1 === 29 && !leap(y2) ? 28 : d1;
    return y2 - y1 - (m2 < m1 || (m2 === m1 && d2 < bd) ? 1 : 0);
  },
});
