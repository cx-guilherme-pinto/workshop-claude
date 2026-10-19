import { text } from '../../templates/text.js';

const SMALL = new Set(['a', 'à', 'o', 'os', 'as', 'e', 'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos', 'um', 'uma', 'por', 'para', 'com']);

export default text({
  id: 'tx-02',
  title: 'Maiúsculas de título',
  inputs: [{ name: 'text', type: 'text', label: 'Título' }],
  run({ text: t }) {
    return t
      .split(/\s+/)
      .filter(Boolean)
      .map((w, i) => {
        const low = w.toLocaleLowerCase('pt');
        return i > 0 && SMALL.has(low) ? low : low.charAt(0).toLocaleUpperCase('pt') + low.slice(1);
      })
      .join(' ');
  },
});
