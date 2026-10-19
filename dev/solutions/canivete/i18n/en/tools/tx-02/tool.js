import { text } from '../../templates/text.js';

const SMALL = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'of', 'in', 'on', 'at', 'to', 'by']);

export default text({
  id: 'tx-02',
  title: 'Title case',
  inputs: [{ name: 'text', type: 'text', label: 'Title' }],
  run({ text: t }) {
    return t
      .split(/\s+/)
      .filter(Boolean)
      .map((w, i) => {
        const low = w.toLocaleLowerCase('en');
        return i > 0 && SMALL.has(low) ? low : low.charAt(0).toLocaleUpperCase('en') + low.slice(1);
      })
      .join(' ');
  },
});
