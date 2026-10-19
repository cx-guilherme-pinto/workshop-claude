import { calc } from '../../templates/calc.js';

// days since 1970-01-01 (UTC, so no daylight saving time)
const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;

export default calc({
  id: 'dt-01',
  title: 'Days between two dates',
  inputs: [
    { name: 'start', type: 'date', label: 'Start date' },
    { name: 'end', type: 'date', label: 'End date' },
  ],
  run({ start, end }) {
    return Math.round(day(end) - day(start));
  },
});
