// The "calc" template: numbers (and a few other inputs) → a result. tools/CONTRACT.md.
//
//   import { calc } from '../../templates/calc.js';
//   export default calc({ id, title, inputs: [...], run({ a, b }) { return a + b; } });
import { makeTool } from './common.js';

export { ToolError } from './common.js';
export const calc = (spec) => makeTool('calc', spec);
