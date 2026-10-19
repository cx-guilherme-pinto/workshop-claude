import { calc } from '../../templates/calc.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default calc({
  id: 'dt-03',
  title: 'Day of the week of a date',
  inputs: [{ name: 'date', type: 'date', label: 'Date' }],
  run({ date }) {
    const d = new Date(0);
    d.setUTCFullYear(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
    return DAYS[d.getUTCDay()];
  },
});
