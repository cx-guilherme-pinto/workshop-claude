import { calc, ToolError } from '../../templates/calc.js';

const r2 = (v) => Math.round(v * 100) / 100;

export default calc({
  id: 'dn-05',
  title: 'Descontos em cascata',
  inputs: [
    { name: 'price', type: 'number', label: 'Preço inicial (€)', min: 0 },
    { name: 'discounts', type: 'list', label: 'Descontos (%)' },
  ],
  run({ price, discounts }) {
    let left = 1;
    for (const d of discounts) {
      if (!/^\d+(\.\d+)?$/.test(d) || Number(d) > 100) throw new ToolError('Cada desconto tem de ser um número de 0 a 100.');
      left *= 1 - Number(d) / 100;
    }
    const final = r2(price * left);
    return { final, saved: r2(price - final), total_percent: r2((1 - left) * 100) };
  },
});
