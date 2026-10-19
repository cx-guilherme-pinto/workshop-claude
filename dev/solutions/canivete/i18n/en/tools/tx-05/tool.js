import { text, ToolError } from '../../templates/text.js';

// A word: letters (with or without accents) and digits; anything else separates words.
const WORD = /[\p{L}\p{M}\p{N}]+/gu;

export default text({
  id: 'tx-05',
  title: 'Count the occurrences of a word',
  inputs: [
    { name: 'text', type: 'multiline', label: 'Text' },
    { name: 'word', type: 'text', label: 'Word' },
  ],
  run({ text: t, word }) {
    if (!/^[\p{L}\p{M}\p{N}]+$/u.test(word)) throw new ToolError('Type a single word, with no spaces or punctuation.');
    const w = word.toLocaleLowerCase('en');
    return (t.match(WORD) || []).filter((x) => x.toLocaleLowerCase('en') === w).length;
  },
});
