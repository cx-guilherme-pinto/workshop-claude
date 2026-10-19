import { calc, ToolError } from '../../templates/calc.js';
import { parseNumber } from '../../templates/common.js';

const r2 = (v) => Math.round(v * 100) / 100;

export default calc({
  id: 'nm-04',
  title: 'Média e mediana de uma lista',
  inputs: [{ name: 'numbers', type: 'multiline', label: 'Números' }],
  run({ numbers }) {
    // the comma is the decimal mark, so the numbers are separated by ";", spaces or lines
    const items = numbers.split(/[;\s]+/).filter(Boolean);
    const xs = items.map((s) => {
      const n = parseNumber(s);
      if (!Number.isFinite(n)) throw new ToolError(`«${s}» não é um número.`);
      return n;
    });
    const sorted = [...xs].sort((p, q) => p - q);
    const k = sorted.length;
    const median = k % 2 ? sorted[(k - 1) / 2] : (sorted[k / 2 - 1] + sorted[k / 2]) / 2;
    return { count: k, mean: r2(xs.reduce((s, x) => s + x, 0) / k), median: r2(median) };
  },
});
