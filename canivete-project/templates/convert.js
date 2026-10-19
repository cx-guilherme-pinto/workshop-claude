// The "convert" template: a value and the direction of the conversion → the converted value (both ways).
// The inputs must include a choice named "direction" (the shell shows it as a swap button). tools/CONTRACT.md.
//
//   import { convert } from '../../templates/convert.js';
//   export default convert({ id, title, inputs: [{ name: 'value', … }, { name: 'direction', type: 'choice', options: […] }], run({ value, direction }) { … } });
import { makeTool } from './common.js';

export { ToolError } from './common.js';
export function convert(spec) {
  const d = (spec?.inputs || []).find((x) => x.name === 'direction');
  if (!d || d.type !== 'choice' || !(d.options || []).length) throw new Error(`${spec?.id}: a convert tool needs a choice input named "direction"`);
  return makeTool('convert', spec);
}
