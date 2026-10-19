import { calc, ToolError } from '../../templates/calc.js';

export default calc({
  id: 'nm-02',
  title: 'Rule of three',
  inputs: [
    { name: 'a', type: 'number', label: 'A' },
    { name: 'b', type: 'number', label: 'B' },
    { name: 'c', type: 'number', label: 'C' },
  ],
  run({ a, b, c }) {
    if (a === 0) throw new ToolError('A cannot be 0.');
    return Math.round(((b * c) / a) * 100) / 100;
  },
});
