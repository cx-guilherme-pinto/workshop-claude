import { calc } from '../../templates/calc.js';

const r2 = (v) => Math.round(v * 100) / 100;

export default calc({
  id: 'dn-03',
  title: 'Juros compostos',
  inputs: [
    { name: 'principal', type: 'number', label: 'Capital inicial (€)', min: 0 },
    { name: 'rate', type: 'number', label: 'Taxa de juro anual (%)', min: 0, max: 100 },
    { name: 'years', type: 'integer', label: 'Anos', min: 1, max: 100 },
    {
      name: 'compounding',
      type: 'choice',
      label: 'Capitalização',
      default: '1',
      options: [
        { value: '1', label: 'Anual' },
        { value: '4', label: 'Trimestral' },
        { value: '12', label: 'Mensal' },
      ],
    },
  ],
  run({ principal, rate, years, compounding }) {
    const n = Number(compounding);
    const final = r2(principal * Math.pow(1 + rate / 100 / n, n * years));
    return { final, interest: r2(final - principal) };
  },
});
