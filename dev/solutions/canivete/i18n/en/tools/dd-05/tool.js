import { generate, ToolError } from '../../templates/generate.js';

export default generate({
  id: 'dd-05',
  title: 'Draw names',
  inputs: [
    { name: 'names', type: 'list', label: 'Names' },
    { name: 'count', type: 'integer', label: 'How many to draw', default: '1', min: 1, max: 100 },
  ],
  run({ names, count }, { randomInt }) {
    // repeated names (ignoring upper/lower case) count once, with the first spelling
    const seen = new Set();
    const pool = names.filter((n) => {
      const k = n.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (count > pool.length) throw new ToolError('You asked for more names than there are different names in the list.');
    // a partial Fisher-Yates: position k gets one of the names not drawn yet
    for (let k = 0; k < count; k++) {
      const j = k + randomInt(pool.length - k);
      [pool[k], pool[j]] = [pool[j], pool[k]];
    }
    return pool.slice(0, count);
  },
});
