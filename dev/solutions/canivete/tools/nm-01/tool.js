import { calc, ToolError } from '../../templates/calc.js';

const r2 = (v) => Math.round(v * 100) / 100;

export default calc({
  id: 'nm-01',
  title: 'X % de Y e Y é que % de X',
  inputs: [
    { name: 'x', type: 'number', label: 'X' },
    { name: 'y', type: 'number', label: 'Y' },
  ],
  run({ x, y }) {
    if (x === 0) throw new ToolError('X não pode ser 0.');
    return { x_percent_of_y: r2((x * y) / 100), y_percent_of_x: r2((y / x) * 100) };
  },
});
