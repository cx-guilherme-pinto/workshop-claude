import { calc } from '../../templates/calc.js';

const cents = (v) => Math.round(v * 100);

export default calc({
  id: 'dn-01',
  title: 'Gorjeta e divisão da conta',
  inputs: [
    { name: 'total', type: 'number', label: 'Total da conta (€)', min: 0 },
    { name: 'tip', type: 'number', label: 'Gorjeta (%)', default: '10', min: 0, max: 100 },
    { name: 'people', type: 'integer', label: 'Pessoas', default: '2', min: 1, max: 100 },
  ],
  run({ total, tip, people }) {
    const tipC = cents((total * tip) / 100);
    const allC = cents(total) + tipC;
    // each share rounds up to the cent, so the shares never add up to less than the total
    const shareC = Math.ceil(allC / people);
    return { tip: tipC / 100, total: allC / 100, per_person: shareC / 100 };
  },
});
