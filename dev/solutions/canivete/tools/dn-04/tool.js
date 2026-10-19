import { calc, ToolError } from '../../templates/calc.js';

const r2 = (v) => Math.round(v * 100) / 100;

export default calc({
  id: 'dn-04',
  title: 'Prestação de um empréstimo',
  inputs: [
    { name: 'amount', type: 'number', label: 'Montante do empréstimo (€)', min: 0 },
    { name: 'rate', type: 'number', label: 'Taxa de juro anual (%)', min: 0, max: 100 },
    { name: 'years', type: 'integer', label: 'Prazo (anos)', min: 1, max: 50 },
  ],
  run({ amount, rate, years }) {
    if (amount === 0) throw new ToolError('O montante tem de ser maior que 0.');
    const n = years * 12;
    const i = rate / 100 / 12;
    const monthly = r2(i === 0 ? amount / n : (amount * i) / (1 - Math.pow(1 + i, -n)));
    const total = r2(monthly * n);
    return { monthly, total, interest: r2(total - amount) };
  },
});
