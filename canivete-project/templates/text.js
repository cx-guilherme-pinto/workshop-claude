// The "text" template: a text (and options) → a text or a few numbers about it. tools/CONTRACT.md.
//
//   import { text } from '../../templates/text.js';
//   export default text({ id, title, inputs: [{ name: 'text', type: 'multiline', … }], run({ text }) { … } });
import { makeTool } from './common.js';

export { ToolError } from './common.js';
export const text = (spec) => makeTool('text', spec);
