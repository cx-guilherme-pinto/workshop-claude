import { calc, ToolError } from '../../templates/calc.js';

const r2 = (v) => Math.round(v * 100) / 100;

export default calc({
  id: 'dd-02',
  title: 'Consumo de combustível (l/100 km)',
  inputs: [
    { name: 'distance', type: 'number', label: 'Distância (km)', min: 0 },
    { name: 'fuel', type: 'number', label: 'Combustível gasto (l)', min: 0 },
    { name: 'price', type: 'number', label: 'Preço por litro (€)', min: 0 },
  ],
  run({ distance, fuel, price }) {
    if (distance === 0) throw new ToolError('A distância tem de ser maior que 0.');
    if (fuel === 0) throw new ToolError('O combustível gasto tem de ser maior que 0.');
    return { l_per_100km: r2((fuel / distance) * 100), km_per_l: r2(distance / fuel), cost: r2(fuel * price) };
  },
});
