import { text } from '../../templates/text.js';

// A word: letters (with or without accents) and digits; a hyphen or an apostrophe between two of them joins them.
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;

export default text({
  id: 'tx-01',
  title: 'Contar palavras e tempo de leitura',
  inputs: [
    { name: 'text', type: 'multiline', label: 'Texto' },
    { name: 'words_per_minute', type: 'integer', label: 'Palavras por minuto', default: '200', min: 1, max: 1000 },
  ],
  run({ text: t, words_per_minute: wpm }) {
    const words = (t.match(WORD) || []).length;
    const characters = [...t].filter((c) => !/\s/u.test(c)).length;
    return { words, characters, reading_minutes: Math.ceil(words / wpm) };
  },
});
