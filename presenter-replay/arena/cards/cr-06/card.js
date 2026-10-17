import { answer } from '../../templates/answer.js';
import { sha256Hex } from '../../lib/hash.js';

const MAIUSCULA = sha256Hex('Atlas');
const MINUSCULA = sha256Hex('atlas');
const IGUAIS = [...MAIUSCULA.slice(0, 10)].filter((ch, i) => ch === MINUSCULA[i]).length;

export default answer({
  id: 'cr-06',
  title: 'Uma letra muda tudo',
  category: 'cryptography',
  difficulty: 2,
  concept: 'Efeito avalanche: mudar um só carácter na entrada muda o hash todo.',
  prompt: 'Estes dois textos só diferem numa maiúscula. Quantos dos 10 primeiros caracteres dos dois hashes são iguais, na mesma posição?',
  scenario: {
    kind: 'text',
    label: 'SHA-256',
    lines: [
      'Atlas → 9dee1c0ed39ef4e2686f974b5d574531fa5091be91e7ea72875e763278293ad4',
      'atlas → 7c82602500857aa6ed0cf38c4c3e4ec645bdcaa82c00b9155eb08be100c778a9',
    ],
  },
  placeholder: 'Um número',
  check: (n) => n === String(IGUAIS),
  explanation: 'Num bom hash, cada carácter muda com a mesma probabilidade, por isso as coincidências são acaso. É isto que impede adivinhar a entrada a partir de hashes parecidos.',
});
