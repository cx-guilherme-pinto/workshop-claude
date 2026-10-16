import { resposta } from '../../templates/resposta.js';
import { sha256Hex } from '../../lib/hash.js';

// Quantas das 10 primeiras posições têm o mesmo carácter nos dois hashes.
function coincidencias(a, b) {
  let total = 0;
  for (let i = 0; i < 10; i++) {
    if (a[i] === b[i]) total++;
  }
  return total;
}

const CONTAGEM = String(coincidencias(sha256Hex('Atlas'), sha256Hex('atlas')));

export default resposta({
  id: 'cr-06',
  title: 'Uma letra muda tudo',
  category: 'criptografia',
  difficulty: 2,
  concept: 'Mudar um só carácter na entrada muda o hash todo.',
  prompt: 'Estes dois textos só diferem numa maiúscula. Quantos dos 10 primeiros caracteres dos dois hashes são iguais, na mesma posição?',
  explanation: 'Num bom hash, cada carácter muda com a mesma probabilidade, por isso as coincidências são acaso. É isto que impede adivinhar a entrada a partir de hashes parecidos.',
  scenario: {
    kind: 'texto',
    label: 'SHA-256',
    lines: [
      'Atlas → 9dee1c0ed39ef4e2686f974b5d574531fa5091be91e7ea72875e763278293ad4',
      'atlas → 7c82602500857aa6ed0cf38c4c3e4ec645bdcaa82c00b9155eb08be100c778a9',
    ],
  },
  placeholder: 'Um número',
  check: (normalizada) => normalizada === CONTAGEM,
});
