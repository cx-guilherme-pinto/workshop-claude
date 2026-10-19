import { calc } from '../../templates/calc.js';

const r2 = (v) => Math.round(v * 100) / 100;

export default calc({
  id: 'dn-03',
  title: 'Compound interest',
  inputs: [
    { name: 'principal', type: 'number', label: 'Starting amount', min: 0 },
    { name: 'rate', type: 'number', label: 'Annual interest rate (%)', min: 0, max: 100 },
    { name: 'years', type: 'integer', label: 'Years', min: 1, max: 100 },
    {
      name: 'compounding',
      type: 'choice',
      label: 'Compounding',
      default: '1',
      options: [
        { value: '1', label: 'Yearly' },
        { value: '4', label: 'Quarterly' },
        { value: '12', label: 'Monthly' },
      ],
    },
  ],
  run({ principal, rate, years, compounding }) {
    const n = Number(compounding);
    const final = r2(principal * Math.pow(1 + rate / 100 / n, n * years));
    return { final, interest: r2(final - principal) };
  },
});
