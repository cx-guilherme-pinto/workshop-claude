import { calc, ToolError } from '../../templates/calc.js';

const pad = (n, w = 2) => String(n).padStart(w, '0');

export default calc({
  id: 'dt-04',
  title: 'Somar dias a uma data',
  inputs: [
    { name: 'date', type: 'date', label: 'Data' },
    { name: 'days', type: 'integer', label: 'Dias', min: -100000, max: 100000 },
  ],
  run({ date, days }) {
    const d = new Date(0);
    d.setUTCFullYear(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10) + days);
    const y = d.getUTCFullYear();
    if (y < 1 || y > 9999) throw new ToolError('O resultado sai do calendário (de 0001-01-01 a 9999-12-31).');
    return `${pad(y, 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  },
});
