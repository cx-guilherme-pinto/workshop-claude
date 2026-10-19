import { calc, ToolError } from '../../templates/calc.js';

const r2 = (v) => Math.round(v * 100) / 100;

export default calc({
  id: 'dn-04',
  title: 'Loan monthly payment',
  inputs: [
    { name: 'amount', type: 'number', label: 'Loan amount', min: 0 },
    { name: 'rate', type: 'number', label: 'Annual interest rate (%)', min: 0, max: 100 },
    { name: 'years', type: 'integer', label: 'Term (years)', min: 1, max: 50 },
  ],
  run({ amount, rate, years }) {
    if (amount === 0) throw new ToolError('The loan amount must be more than 0.');
    const n = years * 12;
    const i = rate / 100 / 12;
    const monthly = r2(i === 0 ? amount / n : (amount * i) / (1 - Math.pow(1 + i, -n)));
    const total = r2(monthly * n);
    return { monthly, total, interest: r2(total - amount) };
  },
});
