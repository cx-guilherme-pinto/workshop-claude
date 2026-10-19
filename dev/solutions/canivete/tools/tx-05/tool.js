import { text, ToolError } from '../../templates/text.js';

// A word: letters (with or without accents) and digits; anything else separates words.
const WORD = /[\p{L}\p{M}\p{N}]+/gu;

export default text({
  id: 'tx-05',
  title: 'Contar ocorrências de uma palavra',
  inputs: [
    { name: 'text', type: 'multiline', label: 'Texto' },
    { name: 'word', type: 'text', label: 'Palavra' },
  ],
  run({ text: t, word }) {
    if (!/^[\p{L}\p{M}\p{N}]+$/u.test(word)) throw new ToolError('Escreve só uma palavra, sem espaços nem pontuação.');
    const w = word.toLocaleLowerCase('pt');
    return (t.match(WORD) || []).filter((x) => x.toLocaleLowerCase('pt') === w).length;
  },
});
