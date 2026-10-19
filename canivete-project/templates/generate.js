// The "generate" template: options → something generated at random (an id, a password, a draw). The randomness
// comes from the random() the template passes to run, never from Math.random: with the same seed the result is
// the same, so the tests are deterministic. The shell passes a new seed on each click. tools/CONTRACT.md.
//
//   import { generate } from '../../templates/generate.js';
//   export default generate({ id, title, inputs: [...], run(values, { random }) { … random() … } });
import { makeTool } from './common.js';

export { ToolError } from './common.js';

// mulberry32: a small, fast seeded generator, numbers in [0, 1).
export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generate(spec) {
  return makeTool('generate', spec, {
    context: (options) => {
      const random = seeded(Number.isFinite(options?.seed) ? options.seed : Date.now());
      // an integer in [0, n)
      return { random, randomInt: (n) => Math.floor(random() * n) };
    },
  });
}
