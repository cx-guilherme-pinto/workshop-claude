import { calc, ToolError } from '../../templates/calc.js';

const r2 = (v) => Math.round(v * 100) / 100;

export default calc({
  id: 'dd-02',
  title: 'Fuel consumption (l/100 km)',
  inputs: [
    { name: 'distance', type: 'number', label: 'Distance (km)', min: 0 },
    { name: 'fuel', type: 'number', label: 'Fuel used (l)', min: 0 },
    { name: 'price', type: 'number', label: 'Price per litre', min: 0 },
  ],
  run({ distance, fuel, price }) {
    if (distance === 0) throw new ToolError('The distance must be more than 0.');
    if (fuel === 0) throw new ToolError('The fuel used must be more than 0.');
    return { l_per_100km: r2((fuel / distance) * 100), km_per_l: r2(distance / fuel), cost: r2(fuel * price) };
  },
});
