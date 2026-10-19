import { calc } from '../../templates/calc.js';

const DAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export default calc({
  id: 'dt-03',
  title: 'Dia da semana de uma data',
  inputs: [{ name: 'date', type: 'date', label: 'Data' }],
  run({ date }) {
    const d = new Date(0);
    d.setUTCFullYear(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
    return DAYS[d.getUTCDay()];
  },
});
